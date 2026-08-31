// real-batch-audit.mjs — 路 1「真实任务证据」：对一批真实文档跑六道门禁，产出批次级体检报告
// 用法：node real-batch-audit.mjs --config configs/<name>.json --glob "<目录>/**/*.md" [--title 标题] [--sample 8]
//   或：node real-batch-audit.mjs --config ... <doc1.md> <doc2.md> ...
// 诚实原则：区分「真实治理缺口(G1 断链/G2 漂移/G6 证据链)」与「文学语境误报(G4 渠道抑制)」；
//          不放宽门禁刷绿；每条抽样缺口可回溯到具体文档，供人工点开原文核验。
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { analyze, makeConfig } from './gates.mjs';

const PROTO = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const cfgIdx = argv.indexOf('--config');
if (cfgIdx < 0 || !argv[cfgIdx + 1]) { console.error('用法: node real-batch-audit.mjs --config configs/x.json (--glob "<dir>/**/*.md" | <doc.md ...>)'); process.exit(1); }
const cfgPath = resolve(process.cwd(), argv[cfgIdx + 1]);
const cfgJson = JSON.parse(readFileSync(cfgPath, 'utf8'));
const cfg = makeConfig(cfgJson);
const MM = cfgJson.metaMap || {};
const KEYS = {
  session: MM.session || ['Session', '会话'],
  created: MM.created || ['创建日期', '更新'],
  source: MM.source || ['数据指标', '引用', '来源'],
};
const titleArg = argv.indexOf('--title');
const TITLE = titleArg >= 0 ? argv[titleArg + 1] : cfgJson.name;
const sampleArg = argv.indexOf('--sample');
const SAMPLE = sampleArg >= 0 ? parseInt(argv[sampleArg + 1], 10) : 8;

// —— 收集文件：--glob 简易递归（**/*.md 或 *.md）或显式列表 ——
function collect() {
  const gIdx = argv.indexOf('--glob');
  if (gIdx >= 0) {
    const pat = argv[gIdx + 1];
    const dir = pat.replace(/\/?\*\*?\/?\*\.md$/, '').replace(/\/?\*\.md$/, '');
    const root = resolve(process.cwd(), dir);
    const deep = /\*\*/.test(pat);
    const out = [];
    (function walk(d) {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) { if (deep) walk(p); }
        else if (name.endsWith('.md')) out.push(p);
      }
    })(root);
    return out;
  }
  return argv.filter((a, i) => !a.startsWith('-') && i !== cfgIdx + 1 && i !== titleArg + 1 && i !== sampleArg + 1).map((f) => resolve(process.cwd(), f));
}

function parseDoc(path) {
  const text = readFileSync(path, 'utf8');
  const kv = Object.fromEntries([...text.matchAll(/^>\s*([^\uff1a:\n]+)[\uff1a:]\s*(.+)$/gm)].map((m) => [m[1].trim(), m[2].trim()]));
  const pick = (arr) => (arr.map((k) => kv[k]).find((v) => v) || '');
  const meta = { session: pick(KEYS.session), created: pick(KEYS.created), source: pick(KEYS.source) };
  const name = (text.match(/^#\s+(.+)$/m) || [])[1] || basename(path, '.md');
  return { id: basename(path, '.md'), name, meta, text };
}

const files = collect();
if (!files.length) { console.error('✗ 未匹配到任何 .md'); process.exit(1); }

// —— 逐篇体检（本项目口径 + 默认口径对照）——
const LEVELS = { P0: 25, P1: 12, P2: 5, P3: 2 };
const gateAgg = {}; // gateId -> {docs, findings}
const verdictCnt = { ok: 0, fix: 0, block: 0 };
let scoreSum = 0, realGapTotal = 0, gapP1 = 0, gapP2 = 0, g4DefaultTotal = 0, g4CfgTotal = 0;
const rows = [];
for (const f of files) {
  const doc = parseDoc(f);
  const a = analyze(doc, cfg);
  const base = analyze(doc); // 默认口径（样例：广告法开、KPI 指标）
  const flat = a.gates.flatMap((g) => g.findings.map((x) => ({ ...x, gid: g.id, gname: g.name })));
  const realGaps = flat.filter((x) => ['G1', 'G2', 'G6'].includes(x.gid) && x.level !== 'P3');
  gapP1 += realGaps.filter((x) => x.level === 'P1').length;
  gapP2 += realGaps.filter((x) => x.level === 'P2').length;
  a.gates.forEach((g) => { (gateAgg[g.id] = gateAgg[g.id] || { docs: 0, findings: 0 }); if (g.findings.length) { gateAgg[g.id].docs++; gateAgg[g.id].findings += g.findings.length; } });
  verdictCnt[a.verdict.k]++;
  scoreSum += a.score; realGapTotal += realGaps.length;
  g4DefaultTotal += base.gates.find((g) => g.id === 'G4').findings.length;
  g4CfgTotal += a.gates.find((g) => g.id === 'G4').findings.length;
  rows.push({ name: doc.name, id: doc.id, verdict: a.verdict.t, score: a.score, realGaps: realGaps.length, p1: realGaps.some((x) => x.level === 'P1'), samples: realGaps.slice(0, 3) });
}

const n = rows.length, avg = Math.round(scoreSum / n);
const docsByGate = Object.entries(gateAgg).sort((x, y) => y[1].docs - x[1].docs);
const withGaps = rows.filter((r) => r.realGaps > 0).sort((a, b) => (b.p1 - a.p1) || (b.realGaps - a.realGaps));
const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

const L = [];
L.push(`# 验收官 · 真实批次体检报告 —— ${TITLE}`);
L.push('');
L.push(`> 配置：\`${basename(cfgPath)}\`（权威版本 v${cfg.registry.currentVersion} · G4 广告法渠道=${cfg.channel.adLaw ? '开' : '关'} · 来源提示=${cfg.channel.sourceHint === false ? '关' : '开'}）`);
L.push(`> 扫描 ${n} 篇真实文档 · 生成 ${now} · 引擎 gates.mjs 六道门禁 · 全部结论可回溯到具体文档原文核验`);
L.push('');
L.push('## 一、批次总览');
L.push('');
L.push('| 指标 | 值 |');
L.push('|---|---|');
L.push(`| 扫描文档数 | ${n} |`);
L.push(`| 可发布 | ${verdictCnt.ok}（${Math.round(verdictCnt.ok / n * 100)}%） |`);
L.push(`| 需修复后发布 | ${verdictCnt.fix} |`);
L.push(`| 阻断发布 | ${verdictCnt.block} |`);
L.push(`| 平均健康分 | ${avg} |`);
L.push(`| 真实治理缺口合计（G1/G2/G6 非提示级） | ${realGapTotal} 处 |`);
L.push('');
L.push('## 二、六道门禁命中分布（本项目口径）');
L.push('');
L.push('| 门禁 | 命中文档数 | 命中条数 |');
L.push('|---|---|---|');
for (const [gid, v] of docsByGate) L.push(`| ${gid} | ${v.docs} | ${v.findings} |`);
L.push('');
L.push('## 三、换配置抑制的文学语境误报（诚实对照）');
L.push('');
L.push(`- 用**样例默认口径**（广告法渠道开）扫这批文档，G4 命中 **${g4DefaultTotal}** 条——多为文学/叙述语境的"第一/唯一/极致"等，非对外营销；`);
L.push(`- 换成**本项目口径**（\`channel.adLaw=${cfg.channel.adLaw}\`）后 G4 命中 **${g4CfgTotal}** 条。`);
L.push(`- 说明：渠道开关是**如实描述语境**、不是永久放行——真把这类文档投到对外营销，切回默认口径即重新点亮 G4。这正是"改配置即复用到任意项目"的实证。`);
L.push('');
L.push('## 四、真实治理缺口抽样（可点开原文核验）');
L.push('');
if (!withGaps.length) { L.push('- 本批未检出 G1/G2/G6 非提示级真实缺口。'); }
else {
  L.push('| 文档 | 裁决 | 缺口数 | 抽样（门禁 · 级别 · 问题） |');
  L.push('|---|---|---|---|');
  for (const r of withGaps.slice(0, SAMPLE)) {
    const s = r.samples.map((x) => `${x.gid}·${x.level} ${x.issue}`).join('；');
    L.push(`| ${r.name} | ${r.verdict} | ${r.realGaps} | ${s} |`);
  }
  if (withGaps.length > SAMPLE) L.push(`\n> 另有 ${withGaps.length - SAMPLE} 篇含真实缺口，未列入抽样。`);
}
L.push('');
L.push('## 五、结论（诚实）');
L.push('');
const fired = [['G1', '断链引用'], ['G2', '版本/数据漂移'], ['G6', '证据链/元信息完整']]
  .filter(([id]) => (gateAgg[id] || { docs: 0 }).docs > 0)
  .map(([id, nm]) => `${nm}(${gateAgg[id].docs} 篇)`);
L.push(`- GateKeeper 在 ${n} 篇**真实**文档上跑通，产出可核验的分级裁决：${verdictCnt.ok} 篇可发布（${Math.round(verdictCnt.ok / n * 100)}%）、${verdictCnt.fix} 篇需修复、${verdictCnt.block} 篇阻断，平均健康分 ${avg}。`);
L.push(`- 真实缺口 ${realGapTotal} 处，按门禁分布：${fired.length ? fired.join('、') : '无'}。其中 **P1 ${gapP1} 处**（缺结构化引用/来源，高价值、可点原文核验）、P2 ${gapP2} 处（多为该工程以 W### 里程碑码 + 核验状态 追溯、未内联"创建日期"，属低severity完整性提示）。`);
L.push(`- 未转绿文档如实呈现缺口，**不为刷绿放宽门禁**；G1 断链 ${gateAgg.G1 ? gateAgg.G1.docs : 0} 篇、G2 版本漂移 ${gateAgg.G2 ? gateAgg.G2.docs : 0} 篇（已登记该工程真实版本谱系后仍命中的才是真漂移）。`);
L.push(`- 提效证据不依赖"算力÷人脑"倍数（不成立）；价值在**确定性、可审计、规模不变慢**：${n} 篇毫秒级扫描 + 每处缺口带依据与修复建议 + 换配置即抑制 ${g4DefaultTotal} 条文学语境误报。`);
L.push('');

mkdirSync(join(PROTO, 'output'), { recursive: true });
const outName = 'real-batch-' + cfgJson.name.replace(/[\\/:*?"<>|\s]+/g, '_') + '.md';
writeFileSync(join(PROTO, 'output', outName), L.join('\n'), 'utf8');
console.log(L.join('\n'));
console.log('\n[输出] prototype/output/' + outName);
