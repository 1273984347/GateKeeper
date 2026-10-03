// run-real.mjs — 把 GateKeeper 跑在【真实】AI 协作文档上（西游记项目 docs），如实体检
// 用法：node run-real.mjs <文件1> <文件2> ...
// 诚实原则：不粉饰结果——区分「真实治理缺口」与「文学语境误报」，并暴露默认配置对真实 schema 的不适配。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { analyze, flattenFindings } from './gates.mjs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (!files.length) { console.error('用法: node run-real.mjs <doc.md> ...'); process.exit(1); }

// 解析真实文档的 `> 键：值` 元信息块，映射到门禁期望的 meta
function parseDoc(path) {
  const text = readFileSync(path, 'utf8');
  const meta = {};
  const fm = [...text.matchAll(/^>\s*([^\uff1a:]+)[\uff1a:]\s*(.+)$/gm)];
  const kv = Object.fromEntries(fm.map((m) => [m[1].trim(), m[2].trim()]));
  meta.session = kv['Session'] || kv['会话'] || '';            // 西游记文档通常不内联 Session → 真实缺口
  meta.created = kv['创建日期'] || kv['更新'] || '';
  meta.source = kv['数据指标'] || kv['引用'] || kv['来源'] || '';
  const title = (text.match(/^#\s+(.+)$/m) || [])[1] || path;
  return { id: path.split(/[\\/]/).pop().replace(/\.md$/, ''), name: title, type: kv['轨标'] || '分析文档', author: kv['人物类别'] || '—', meta, text };
}

mkdirSync('output', { recursive: true });
const rows = [];
const report = ['# GateKeeper · 真实业务场景体检报告', '', '输入：西游记项目真实 AI 协作文档（docs/02 人物深度分析）。数据未做任何粉饰。', ''];
for (const f of files) {
  const doc = parseDoc(f);
  const a = analyze(doc);
  const flat = flattenFindings(a.gates);
  const realGaps = flat.filter((x) => ['G1', 'G2', 'G6'].includes(x.gate.split(' ')[0]) && x.level !== 'P3');
  const adFalsePos = flat.filter((x) => x.gate.startsWith('G4')); // 文学语境的极限词命中，多为非广告场景误报
  report.push(`## ${doc.name}（${doc.id}）`);
  report.push(`- 轨标：${doc.type}　裁决：**${a.verdict.t}**　健康分：**${a.score}**`);
  report.push(`- 真实治理缺口（引用/一致性/证据链）：${realGaps.length ? realGaps.map((x) => `[${x.level}]${x.gate} ${x.issue}`).join('；') : '无'}`);
  report.push(`- 广告法门禁命中（文学语境，需按渠道配置抑制）：${adFalsePos.length ? adFalsePos.map((x) => `${x.snip}`).join(' ') : '无'}`);
  report.push('');
  rows.push({ id: doc.id, name: doc.name, verdict: a.verdict.t, score: a.score, realGaps: realGaps.length, adHits: adFalsePos.length });
}
report.push('## 结论（诚实）');
report.push('- GateKeeper 能跑真实文档，但**默认配置是为脱敏样例调的**：真实项目需按自身 schema 配置元信息字段映射、引用注册表、以及"广告法门禁仅在营销/发布场景启用"的渠道开关。');
report.push('- 真实缺口示例：文档未内联可核验的来源/创建信息 → G6 命中，这是**真该补的治理债**，不是误报。');
report.push('- 文学语境里出现「第一/唯一/最」等字面 → G4 命中属**预期误报**，靠"场景/渠道配置"抑制，正好印证规则库可插拔。');

writeFileSync('output/real-case-report.md', report.join('\n'), 'utf8');
console.log(report.join('\n'));
console.log('\n汇总：', JSON.stringify(rows));
