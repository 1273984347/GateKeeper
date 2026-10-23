// class-audit.mjs — M19 A11 判据核对：class / #id 集合对拍（只读，退出码直取）
// 用法：node tools/class-audit.mjs [文件路径]   （默认 prototype/gatekeeper.html）
// 判据：
//   ① 基线静态 class（118 项）必须全部存在——只增不删，缺一即红；
//   ② 基线动态 class（18 项，运行时由变量拼出）按「字面量来源是否仍在源码中」核对；
//   ③ 基线 #id（42 项）必须全部存在；
//   ④ 输出相对基线的增量清单（供台账/方案附录登记）。
// 口径：可测化的判定逻辑抽成纯函数 audit()，CLI 用 isMain 守卫（单测 import 时不执行副作用）。
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

// —— A.1 基线静态 class（118 项）——
export const BASE_CLASS = ('active arrow band basis branch brand btn c-p0 c-p1 c-p2 c-pass cards cinn clean cnt cols counters crumbs cur delta demo-badge demo-banner difftable doc doc-body doc-head dws erec evidence fchip filterrow finding fix flabel flow footer gate gates-strip gb gh ghost gn gpill ic issue item jump-hint kbd lane live-badge main meta metric metrics-grid mk mono mv name nd no node note nt num ok paste-actions paste-box paste-hint paste-ta pbar pcfg pmeta pn pnote proj-switch projcard projgrid pstat rail rail-foot real right ring rk rv section-label sep sev sim snip spacer sq step steps sub supp t t-block t-ok tag tbar td tlab top top-in trend trendcol tt tval v verdict view view-sub view-title viewnav vtab who wrap').split(/\s+/);
// —— A.1 基线动态 class（18 项）：静态不可解析，按「来源字面量仍在源码」核对 ——
export const DYNAMIC_CLASS = 'v-block v-fix v-ok t-fix down up eq on on-reject P0 P1 P2 P3 lv-p0 lv-p1 lv-p2 lv-p3 t-warn'.split(/\s+/);
// —— A.3 基线 #id（42 项）——
export const BASE_ID = 'ringNum ringArc ringCap gatesStrip counters list railTitle railFoot docHead docBody docBodyWrap filterRow cards flow laneOk laneNo evidenceMount cfgMount cfgSub trendMount ovMetrics ovSub histMetrics projGrid projSel crumbs viewnav pasteBox pasteTa pasteCount btnPaste btnPasteClear btnTheme btnDemo btnRun btnApprove view-overview view-inspect view-pipeline view-config view-history stripLabel'.split(/\s+/);

/** 解析 HTML 的 class 与 #id 集合；含 ${} 的动态类取其字面量部分（见 addFrom 注释） */
export function parseSets(html) {
  const found = new Set();
  const addFrom = (v) => v.split(/\s+/).forEach((c) => {
    if (!c) return;
    if (!/['{}]/.test(c)) { found.add(c); return; }
    const lit = c.split('${')[0].replace(/[^A-Za-z0-9-].*$/, '').trim();
    if (lit && !lit.endsWith('-') && !/^[.$]/.test(lit)) found.add(lit);
    // 复合类候选：每段须以字母开头（排除 length-1 这类 JS 表达式片段）
    for (const m of c.matchAll(/[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)+/gi)) found.add(m[0]);
  });
  for (const m of html.matchAll(/class="([^"]+)"/g)) addFrom(m[1]);
  for (const m of html.matchAll(/class='([^']+)'/g)) addFrom(m[1]);
  const ids = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
  return { found, ids };
}

/** 纯函数判定：返回缺失项与增量清单 */
export function audit(html) {
  const { found, ids } = parseSets(html);
  const missC = BASE_CLASS.filter((c) => !found.has(c));
  const missD = DYNAMIC_CLASS.filter((c) => !html.includes(c)); // 来源字面量仍在源码中？
  const missI = BASE_ID.filter((i) => !ids.has(i));
  const addC = [...found].filter((c) => !BASE_CLASS.includes(c) && !DYNAMIC_CLASS.includes(c)).sort();
  const addI = [...ids].filter((i) => !BASE_ID.includes(i)).sort();
  return { missC, missD, missI, addC, addI, classCount: found.size, idCount: ids.size };
}

function main() {
  const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
  const target = process.argv[2] || join(PROTO, 'gatekeeper.html');
  const html = readFileSync(target, 'utf8');
  const r = audit(html);
  console.log(`class 实测 ${r.classCount} 项（基线静态 ${BASE_CLASS.length} + 动态 ${DYNAMIC_CLASS.length}）· id 实测 ${r.idCount} 项（基线 ${BASE_ID.length}）`);
  if (r.missC.length) console.log(`✗ 基线静态 class 缺失 ${r.missC.length}：${r.missC.join(' ')}`);
  else console.log('✓ 基线静态 class 全在（只增不删成立）');
  if (r.missD.length) console.log(`✗ 基线动态 class 来源字面量消失 ${r.missD.length}：${r.missD.join(' ')}`);
  else console.log('✓ 基线动态 class 来源字面量全在');
  if (r.missI.length) console.log(`✗ 基线 id 缺失 ${r.missI.length}：${r.missI.join(' ')}`);
  else console.log('✓ 基线 id 全在');
  console.log(`增量 class（${r.addC.length}）：${r.addC.join(' ')}`);
  console.log(`增量 id（${r.addI.length}）：${r.addI.join(' ')}`);
  process.exit(r.missC.length || r.missD.length || r.missI.length ? 1 : 0);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
