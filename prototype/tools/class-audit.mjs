// class-audit.mjs — M19 A11 判据核对：class / #id 集合对拍（只读，退出码直取）
// 用法：node tools/class-audit.mjs
// 判据：
//   ① 基线静态 class（118 项）必须全部存在——只增不删，缺一即红；
//   ② 基线动态 class（18 项，运行时由变量拼出）按「字面量来源是否仍在源码中」核对；
//   ③ 基线 #id（42 项）必须全部存在；
//   ④ 输出相对基线的增量清单（供台账/方案附录登记）。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(PROTO, 'gatekeeper.html'), 'utf8');

// —— A.1 基线静态 class（118 项）——
const BASE_CLASS = ('active arrow band basis branch brand btn c-p0 c-p1 c-p2 c-pass cards cinn clean cnt cols counters crumbs cur delta demo-badge demo-banner difftable doc doc-body doc-head dws erec evidence fchip filterrow finding fix flabel flow footer gate gates-strip gb gh ghost gn gpill ic issue item jump-hint kbd lane live-badge main meta metric metrics-grid mk mono mv name nd no node note nt num ok paste-actions paste-box paste-hint paste-ta pbar pcfg pmeta pn pnote proj-switch projcard projgrid pstat rail rail-foot real right ring rk rv section-label sep sev sim snip spacer sq step steps sub supp t t-block t-ok tag tbar td tlab top top-in trend trendcol tt tval v verdict view view-sub view-title viewnav vtab who wrap').split(/\s+/);
// —— A.1 基线动态 class（18 项）：静态不可解析，按「来源字面量仍在源码」核对 ——
// —— A.3 基线 #id（42 项）——
const DYNAMIC_CLASS = 'v-block v-fix v-ok t-fix down up eq on on-reject P0 P1 P2 P3 lv-p0 lv-p1 lv-p2 lv-p3 t-warn'.split(/\s+/);
const BASE_ID = 'ringNum ringArc ringCap gatesStrip counters list railTitle railFoot docHead docBody docBodyWrap filterRow cards flow laneOk laneNo evidenceMount cfgMount cfgSub trendMount ovMetrics ovSub histMetrics projGrid projSel crumbs viewnav pasteBox pasteTa pasteCount btnPaste btnPasteClear btnTheme btnDemo btnRun btnApprove view-overview view-inspect view-pipeline view-config view-history stripLabel'.split(/\s+/);

const found = new Set();
const addFrom = (v) => v.split(/\s+/).forEach((c) => {
  if (!c) return;
  if (!/['{}]/.test(c)) { found.add(c); return; }              // 纯字面量 class
  const lit = c.split('${')[0].replace(/[^A-Za-z0-9-].*$/, '').trim(); // ${ 之前的前缀（截到首个异常字符）
  if (lit && !lit.endsWith('-') && !/^[.$]/.test(lit)) found.add(lit);
  // 复合类候选：每段须以字母开头（排除 length-1 这类 JS 表达式片段）
  for (const m of c.matchAll(/[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)+/gi)) found.add(m[0]);
});
for (const m of html.matchAll(/class="([^"]+)"/g)) addFrom(m[1]);
for (const m of html.matchAll(/class='([^']+)'/g)) addFrom(m[1]);

const ids = new Set();
for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);

const missC = BASE_CLASS.filter((c) => !found.has(c));
const missD = DYNAMIC_CLASS.filter((c) => !html.includes(c)); // 来源字面量仍在源码中？
const missI = BASE_ID.filter((i) => !ids.has(i));
const addC = [...found].filter((c) => !BASE_CLASS.includes(c) && !DYNAMIC_CLASS.includes(c)).sort();
const addI = [...ids].filter((i) => !BASE_ID.includes(i)).sort();

console.log(`class 实测 ${found.size} 项（基线静态 ${BASE_CLASS.length} + 动态 ${DYNAMIC_CLASS.length}）· id 实测 ${ids.size} 项（基线 ${BASE_ID.length}）`);
if (missC.length) console.log(`✗ 基线静态 class 缺失 ${missC.length}：${missC.join(' ')}`);
else console.log('✓ 基线静态 class 全在（只增不删成立）');
if (missD.length) console.log(`✗ 基线动态 class 来源字面量消失 ${missD.length}：${missD.join(' ')}`);
else console.log('✓ 基线动态 class 来源字面量全在');
if (missI.length) console.log(`✗ 基线 id 缺失 ${missI.length}：${missI.join(' ')}`);
else console.log('✓ 基线 id 全在');
console.log(`增量 class（${addC.length}）：${addC.join(' ')}`);
console.log(`增量 id（${addI.length}）：${addI.join(' ')}`);
process.exit(missC.length || missD.length || missI.length ? 1 : 0);
