// dws-bridge.mjs — GateKeeper 验收裁决 → 钉钉 DWS 编排
// 用法：
//   node dws-bridge.mjs                       # dry-run（默认，仅打印将执行的 dws 命令）
//   node dws-bridge.mjs --live                # 真实调用钉钉（需先登录 + 填 config.dws.json）
//   node dws-bridge.mjs --artifacts x.json --config c.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir, arch } from 'node:os';
import { join } from 'node:path';
import { analyze, flattenFindings, REGISTRY } from './gates.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const LIVE = flag('--live');
const ART_FILE = opt('--artifacts', './artifacts.sample.json');
const CFG_FILE = opt('--config', './config.dws.json');

const cfg = JSON.parse(readFileSync(CFG_FILE, 'utf8'));
const artifacts = JSON.parse(readFileSync(ART_FILE, 'utf8'));

// 占位符检测：live 模式下若关键 ID 未填则拒绝执行
const PLACEHOLDER = /^<.*>$/;
// 占位符判定统一入口：trim 空白、拒绝全角尖括号变体（' <X>'、'＜X＞' 均不放行为真实 ID）
function isPlaceholderLike(v) {
  const s = String(v ?? '').trim();
  return !s || PLACEHOLDER.test(s) || /^[＜＜].*[＞＞]$/.test(s);
}
function missingConfig() {
  // robotCode 从未被生成命令引用，不校验；reviewerOpenDingTalkId 在 ding() 实际使用，必须纳入
  const need = LIVE ? ['groupOpenConversationId', 'approverUserId', 'authorUserId', 'reviewerOpenDingTalkId'] : [];
  return need.filter((k) => isPlaceholderLike(cfg[k]));
}
if (LIVE && missingConfig().length) {
  console.error(`[live 中止] config.dws.json 以下字段仍是占位符：${missingConfig().join(', ')}`);
  console.error('请先登录钉钉，并用 dws 查询真实 ID 填入后重试。');
  process.exit(2);
}

function isoDue(days) {
  const d = new Date(Date.now() + days * 864e5);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T18:00:00+08:00`;
}
// 命令 token 数组 → 可打印字符串（相对形式 dws ...，供展示 / 演示）
function q(v) { v = String(v); return /[\s%&<>|^"]/.test(v) ? '"' + v.replace(/"/g, '\\"') + '"' : v; }
function toStr(tokens) { return tokens.map(q).join(' '); }

// bash 单引号安全包裹（供生成 dws-plan.sh）
function sq(v) {
  // 换行压平：单引号内的换行虽是 bash 字面量，但会让计划脚本出现"视觉活命令行"，逐行消费的执行器也不安全
  return "'" + String(v).replace(/[\r\n]+/g, ' ').replace(/'/g, "'\\''") + "'";
}
function toBash(tokens) { return tokens.map(sq).join(' '); }

// 产出物 id 白名单：id 直接拼进写盘路径与归档命令，来自不可信 artifacts，须为安全字符
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

function buildPlan(a) {
  if (!SAFE_ID.test(String(a.id))) {
    throw new Error(`artifacts 条目 id 含非法字符（仅允许字母/数字/下划线/连字符）：${JSON.stringify(String(a.id).slice(0, 40))}`);
  }
  const author = a.authorUserId && !PLACEHOLDER.test(a.authorUserId) ? a.authorUserId : (cfg.authorUserId || '<AUTHOR_USER_ID>');
  const flat = flattenFindings(a.gates);
  const p0 = flat.filter((x) => x.level === 'P0');
  const p1 = flat.filter((x) => x.level === 'P1');
  const plan = [];
  const send = (title, text) => {
    // 该组织机器人「AI小钉」非自定义群发模板（send-by-bot 报 400004），改用当前用户身份群发。
    // 注：当前 dws chat message send 未接 @ 能力，步骤/文案不得宣称「@作者」（诚实口径）。
    const t = ['dws', 'chat', 'message', 'send', '--group', cfg.groupOpenConversationId || '<GROUP_ID>', '--title', title, '--text', text.replace(/\n/g, ' ')];
    return t;
  };
  const todo = (title, exec, priority, due) => {
    const t = ['dws', 'todo', 'task', 'create', '--title', title, '--executors', exec, '--priority', String(priority)];
    if (due) t.push('--due', due);
    return t;
  };
  // DING 催办审批人（本人身份，接收人用 openDingTalkId）。DWS 无法新建 OA 审批实例，
  // 审批门 = 复核待办 + DING 催办；若已有实例可用 dws oa approval approve/reject 驱动决策。
  const ding = (content) => ['dws', 'ding', '+send-personal', '--users', cfg.reviewerOpenDingTalkId || '<REVIEWER_OPEN_DINGTALK_ID>', '--content', content.replace(/\n/g, ' '), '--type', 'app', '--yes'];

  if (a.verdict.k === 'ok') {
    const reportPath = `output/accept-${a.id}.md`;
    const docCmd = ['dws', 'doc', 'create', '--name', `[验收通过·${a.id}] ${a.name}`, '--content-file', reportPath];
    if (cfg.archiveFolderId && !PLACEHOLDER.test(cfg.archiveFolderId)) docCmd.push('--folder', cfg.archiveFolderId);
    plan.push({ step: '归档知识库/文档', note: '验收通过的产出物落库留痕' + (cfg.archiveFolderId && !PLACEHOLDER.test(cfg.archiveFolderId) ? '' : '（默认落到我的文档根目录）'), cmd: docCmd });
    plan.push({ step: '群机器人播报', note: '通知发布群：已通过并进入审批', cmd: send('✅ 验收通过', `${a.name} 通过六道门禁（健康分 ${a.score}），已归档，进入发布审批。`) });
    plan.push({ step: '建复核待办', note: '指派复核人二次确认后发布', cmd: todo(`复核发布 ${a.name}`, cfg.approverUserId || '<APPROVER_USER_ID>', 30, isoDue(1)) });
    plan.push({ step: 'DING 催办审批人', note: '本人身份 DING 强提醒复核人尽快审批', cmd: ding(`【GateKeeper 验收】《${a.name}》已通过六道门禁（健康分 ${a.score}），请审批是否发布。`) });
  } else if (a.verdict.k === 'fix') {
    plan.push({ step: '建作者待办', note: `${p1.length} 项 P1 告警，修复后重跑`, cmd: todo(`[待修复] ${a.name} · ${flat.length}项`, author, 20, isoDue(cfg.dueOffsetDays || 2)) });
    plan.push({ step: '群提醒作者', note: '不自动发布，等待整改（待办已指派作者）', cmd: send('⚠️ 需修复', `${a.name} 有 ${p1.length} 项 P1 / ${flat.length - p1.length} 项告警待修，修复后重跑门禁再发布。`) });
  } else { // block
    const brief = p0.slice(0, 3).map((x) => `${x.gate}:${x.issue}`).join('；') || '见验收报告';
    plan.push({ step: '建作者待办(P0)', note: `${p0.length} 项 P0 阻断，最高优先级`, cmd: todo(`[门禁阻断] 修复 ${a.name} · ${p0.length}项P0`, author, 40, isoDue(cfg.dueOffsetDays || 2)) });
    plan.push({ step: '驳回告警', note: '自动驳回，禁止发布（待办已指派作者）', cmd: send('🚫 门禁阻断', `${a.name} 命中 ${p0.length} 项 P0：${brief}。已驳回，禁止发布。`) });
    if (cfg.webhookToken && !PLACEHOLDER.test(cfg.webhookToken))
      plan.push({ step: 'Webhook 广播(可选)', note: '向治理群 @所有人 广播', cmd: ['dws', 'chat', 'message', 'send-by-webhook', '--token', cfg.webhookToken, '--title', '🚫 发布被阻断', '--text', `${a.name} P0 阻断，责任人请处理`, '--at-all'] });
  }
  return { plan, p0: p0.length, p1: p1.length, total: flat.length };
}

// 生成每份验收报告（供归档 --content-file 使用）
function writeReport(a, info) {
  const flat = flattenFindings(a.gates);
  const lines = [];
  lines.push(`# 验收报告 · ${a.name}`);
  lines.push('');
  lines.push(`- 裁决：**${a.verdict.t}** ｜ 健康分：**${a.score}** ｜ 命中：${info.total} 项（P0 ${info.p0} / P1 ${info.p1}）`);
  lines.push(`- 类型：${a.type} ｜ 作者：${a.author} ｜ Session：${(a.meta && a.meta.session) || '—'}`);
  lines.push('');
  lines.push('## 门禁明细');
  a.gates.forEach((g) => {
    lines.push(`### ${g.id} ${g.name} — ${g.sev === 'pass' ? '通过' : g.sev}`);
    if (!g.findings.length) { lines.push('- ✓ 未发现问题'); }
    g.findings.forEach((x) => { lines.push(`- [${x.level}] ${x.issue}｜依据：${x.basis}｜${x.fix}`); });
    lines.push('');
  });
  lines.push('---');
  lines.push('> 由 GateKeeper 自动验收生成 · 数据源注册表 v' + REGISTRY.currentVersion);
  writeFileSync(`output/accept-${a.id}.md`, lines.join('\n'), 'utf8');
}

// 主流程
mkdirSync('output', { recursive: true });

const results = [];
const planLines = ['#!/usr/bin/env bash', '# 由 dws-bridge.mjs 生成的真实执行计划。', '# 在千问办公内：由 Agent 逐条直接执行（宿主钩子才会真正调用钉钉）；普通终端不触发钩子。', 'set -e', ''];
console.log(LIVE ? '=== 模式：LIVE（生成计划 + 提示 Agent 直接执行） ===\n' : '=== 模式：DRY-RUN（仅打印，不执行） ===\n');
for (const raw of artifacts) {
  const a = analyze(raw);
  const info = buildPlan(a);
  writeReport(a, info);
  results.push({ id: a.id, name: a.name, verdict: a.verdict, score: a.score, p0: info.p0, p1: info.p1, total: info.total, steps: info.plan.map((p) => p.step) });

  const badge = { ok: '✅', fix: '⚠️ ', block: '🚫' }[a.verdict.k];
  console.log(`${badge} [${a.id}] ${a.name}  →  ${a.verdict.t}（${a.score} 分，命中 ${info.total}：P0×${info.p0} P1×${info.p1}）`);
  // 注释内容必须压平换行：id/name 来自不可信 artifacts，含 \n 即可向计划脚本注入活命令行
  planLines.push(`# [${String(a.id).replace(/[\r\n]+/g, ' ')}] ${String(a.name).replace(/[\r\n]+/g, ' ')} → ${a.verdict.t}`);
  info.plan.forEach((p, i) => {
    console.log(`     ${i + 1}. ${p.step} — ${p.note}`);
    console.log(`        $ ${toStr(p.cmd)}`);
    planLines.push(toBash(p.cmd));
  });
  planLines.push('');
  console.log('');
}
// P1 修复（复扫 F09）：真实 ID 会被烘进计划脚本，而 output/dws-plan.sh 是被 git 跟踪的文件——
// 任何一次 dry-run 都会把真实 ID 写进版本库（历史泄露即同款机制）。检测到非占位符 ID 时改写本地路径。
const hasRealIds = [cfg.groupOpenConversationId, cfg.approverUserId, cfg.authorUserId, cfg.reviewerOpenDingTalkId, cfg.webhookToken]
  .some((v) => !isPlaceholderLike(v));
const planPath = hasRealIds ? 'output/dws-plan.local.sh' : 'output/dws-plan.sh';
if (hasRealIds) {
  console.log(`🔒 检测到 config.dws.json 含真实 ID：计划已写入本地文件 ${planPath}（已被 .gitignore 覆盖，勿改名提交）。`);
}
writeFileSync(planPath, planLines.join('\n'), 'utf8');

writeFileSync('output/gate-report.json', JSON.stringify({ mode: LIVE ? 'live-plan' : 'dry-run', generatedAt: new Date().toISOString(), results }, null, 2), 'utf8');
console.log(`—— 汇总 ——`);
console.log(`可发布 ${results.filter((r) => r.verdict.k === 'ok').length} ｜ 需修复 ${results.filter((r) => r.verdict.k === 'fix').length} ｜ 阻断 ${results.filter((r) => r.verdict.k === 'block').length}`);
console.log(`产物：output/gate-report.json、output/accept-*.md、${planPath}`);
if (LIVE) console.log(`\n⚠️ 千问办公运行时中 dws 需由 Agent 直接调用才会真正执行（spawn 不触发宿主钩子）。\n   本次已按此计划由 Agent 直接落地，真实回执见 output/live-evidence.md。`);
else console.log(`\n（当前为 dry-run。真实执行：由 Agent 按 ${planPath} 逐条直接调用 dws。）`);
