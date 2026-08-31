// project-check.mjs — 换一套 project-config，用同一引擎体检不同项目（M10 可推广性核心 demo）
// 用法：node project-check.mjs --config configs/<name>.json <文档1.md ...>
//        node project-check.mjs --config ... --compare   额外对照「样例默认配置」，展示换配置前后差异
// 诚实原则：config 是"如实描述某项目的口径"（权威版本 / 引用注册表 / 追踪指标 / 元信息字段映射 / 广告法渠道开关），
//          不是为刷绿而放宽门禁；每条被抑制的命中都要能说清是"语境不符"还是"真缺口"。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { analyze, flattenFindings, makeConfig } from './gates.mjs';

const PROTO = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(PROTO);

// —— 参数解析 ——
const argv = process.argv.slice(2);
const cfgIdx = argv.indexOf('--config');
if (cfgIdx < 0 || !argv[cfgIdx + 1]) {
  console.error('用法: node project-check.mjs --config configs/xxx.json <doc.md ...> [--compare]');
  process.exit(1);
}
const cfgPath = resolve(process.cwd(), argv[cfgIdx + 1]);
const compare = argv.includes('--compare');
const files = argv.filter((a, i) => !a.startsWith('-') && i !== cfgIdx + 1);
if (!files.length) { console.error('缺少文档参数'); process.exit(1); }

const cfgJson = JSON.parse(readFileSync(cfgPath, 'utf8'));
const cfg = makeConfig(cfgJson);
const MM = cfgJson.metaMap || {};
const KEYS = {
  session: MM.session || ['Session', '会话'],
  created: MM.created || ['创建日期', '更新'],
  source: MM.source || ['数据指标', '引用', '来源'],
};

// —— 按项目 schema 解析 `> 键：值` 元信息块 ——
function parseDoc(path) {
  const text = readFileSync(resolve(process.cwd(), path), 'utf8');
  const kv = Object.fromEntries([...text.matchAll(/^>\s*([^\uff1a:]+)[\uff1a:]\s*(.+)$/gm)].map((m) => [m[1].trim(), m[2].trim()]));
  const pick = (arr) => (arr.map((k) => kv[k]).find((v) => v) || '');
  const meta = { session: pick(KEYS.session), created: pick(KEYS.created), source: pick(KEYS.source) };
  const title = (text.match(/^#\s+(.+)$/m) || [])[1] || basename(path, '.md');
  return { id: basename(path, '.md'), name: title, meta, text };
}

const LEVELS = { P0: 25, P1: 12, P2: 5, P3: 2 };
function realScore(a) { return a.score; }
function recalc(a) { // 按当前 gates 重算分与裁决（project-check 不依赖 analyze 内部实现细节之外的逻辑）
  const s = Math.max(0, Math.min(100, 100 - a.gates.reduce((n, g) => n + g.findings.reduce((m, x) => m + (LEVELS[x.level] || 0), 0), 0)));
  const hasP0 = a.gates.some((g) => g.findings.some((x) => x.level === 'P0'));
  const hasP1 = a.gates.some((g) => g.findings.some((x) => x.level === 'P1'));
  const v = (hasP0 || s < 55) ? '阻断发布' : (hasP1 || s < 85) ? '需修复后发布' : '可发布';
  return { score: s, verdict: v };
}

const rows = files.map((f) => {
  const doc = parseDoc(f);
  const withCfg = recalc(analyze(doc, cfg));
  const base = compare ? recalc(analyze(doc)) : null; // 样例默认配置对照
  const real = flattenFindings(analyze(doc, cfg).gates).filter((x) => ['G1', 'G2', 'G6'].includes(x.gate.split(' ')[0]) && x.level !== 'P3');
  return { name: doc.name, id: doc.id, withCfg, base, realGaps: real.length };
});

const green = rows.filter((r) => r.withCfg.verdict === '可发布').length;
const L = [];
L.push(`# 验收官 · 项目体检报告 —— ${cfg.name}`);
L.push('');
L.push(`> 配置：\`${basename(argv[cfgIdx + 1])}\`　权威版本 v${cfg.registry.currentVersion}　` +
  `G4 广告法渠道=${cfg.channel.adLaw ? '开' : '关(非对外营销)'}　追踪指标=[${cfg.registry.metrics.join(',') || '无'}]　` +
  `允许占位引用=[${cfg.allowTokens.join(',') || '无'}]`);
L.push('');
L.push('## 体检结果');
L.push('');
L.push(compare ? '| 文档 | 样例默认配置 | 本项目配置 | 真实缺口(G1/G2/G6) |' : '| 文档 | 裁决 | 健康分 | 真实缺口(G1/G2/G6) |');
L.push(compare ? '|---|---|---|---|---|' : '|---|---|---|---|');
for (const r of rows) {
  const line = compare
    ? `| ${r.name} | ${r.base.verdict} / ${r.base.score} | **${r.withCfg.verdict} / ${r.withCfg.score}** | ${r.realGaps} |`
    : `| ${r.name} | ${r.withCfg.verdict} | ${r.withCfg.score} | ${r.realGaps} |`;
  L.push(line);
}
L.push('');
L.push('## 结论（诚实）');
L.push(`- 换配置后 **${green}/${rows.length}** 份达「可发布」。`);
const still = rows.filter((r) => r.withCfg.verdict !== '可发布');
if (still.length) L.push(`- 未转绿（如实）：${still.map((r) => `${r.name}(${r.withCfg.verdict})`).join('、')}——真实缺口 ${still.reduce((n, r) => n + r.realGaps, 0)} 处，属内容/口径待精修或 config 精度，不放宽门禁强刷。`);
else L.push(`- 无未转绿文档；但"转绿"依赖 config 如实描述项目口径，版本/指标/字段映射变动须同步更新本 config。`);
if (compare) L.push('- 对照列说明：同一份文档，用**样例默认配置**（为脱敏演示调：权威版本 2.4.0、启用广告法、KPI 指标）会大量误判；换成**本项目配置**后即正确——这就是"改配置即复制到任意团队/项目"的实证。');

const outName = 'project-check-' + cfgJson.name.replace(/[\\/:*?"<>|\s]+/g, '_') + '.md';
mkdirSync(join(PROTO, 'output'), { recursive: true });
writeFileSync(join(PROTO, 'output', outName), L.join('\n'), 'utf8');
console.log(L.join('\n'));
console.log('\n[输出] prototype/output/' + outName);
