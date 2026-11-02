// human-baseline-check.mjs — 人工盲测冷跑的「开跑前自检」（只验工具链，不产生人工数据）
// 用法：node tools/human-baseline-check.mjs
// 退出码：0 = 工具链就绪（可交给真人冷跑）；1 = 有缺陷（真跑会出问题）
//
// 诚实口径（重要）：
//   本脚本**不代填任何人工判断**。它只验证「采集器能不能跑、真值结构对不对、样本集干不干净」，
//   动态自检用空答案跑一遍仅用于验证脚本无 bug，**不构成人工实测数据**；
//   人工召回率/漏检/误报/耗时必须由真人独立跑出并回填（见交接文档「四」与人工实测对照表）。
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveChromium, skipMsg } from './browser.mjs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(PROTO, 'human-baseline.html');

export function parseItems(src, name) {
  const i = src.indexOf(`const ${name} = [`);
  if (i < 0) return null;
  const seg = src.slice(i, src.indexOf('];', i));
  const out = [];
  for (const m of seg.matchAll(/\{t:'([^']+)',\s*truth:'([vc])',\s*type:'([^']*)'\}/g)) out.push({ t: m[1], truth: m[2], type: m[3] });
  return out;
}

export function judgeStatic({ itemsA, itemsB }) {
  const f = [];
  const facts = {};
  if (!itemsB || itemsB.length !== 20) f.push(`B 集条目数 ${itemsB?.length ?? 0} ≠ 20`);
  const v = itemsB.filter((x) => x.truth === 'v').length;
  const c = itemsB.filter((x) => x.truth === 'c').length;
  facts.violations = v; facts.clean = c;
  if (v !== 15) f.push(`B 集违规条数 ${v} ≠ 15`);
  if (c !== 5) f.push(`B 集合规条数 ${c} ≠ 5`);
  const dupB = itemsB.length - new Set(itemsB.map((x) => x.t)).size;
  if (dupB) f.push(`B 集有 ${dupB} 条重复文案`);
  const noType = itemsB.filter((x) => x.truth === 'v' && !x.type.trim()).length;
  if (noType) f.push(`B 集 ${noType} 条违规未标注类型/法律依据`);
  // 冷跑独立性：B 集文案不得与 A 集（A = bench.mjs 同源样本、作者已有先验）重合
  const setA = new Set((itemsA || []).map((x) => x.t));
  const overlap = itemsB.filter((x) => setA.has(x.t));
  facts.overlapWithA = overlap.length;
  if (overlap.length) f.push(`B 集与 A 集文案重合 ${overlap.length} 条 → 冷跑独立性被破坏（作者有先验）`);
  // 违禁类型覆盖：提取法律依据编号，断言覆盖 ≥6 类
  const basis = new Set();
  for (const x of itemsB) for (const m of (x.type.match(/第[0-9、]+条(?:第[0-9]+项)?/g) || [])) basis.add(m.replace(/第\d+项$/, ''));
  facts.basisKinds = basis.size;
  if (basis.size < 6) f.push(`B 集法律依据覆盖 ${basis.size} 类 < 6 类（违禁类型覆盖不足）`);
  return { ok: f.length === 0, fails: f, facts };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const src = readFileSync(HTML, 'utf8');
  const itemsA = parseItems(src, 'ITEMS_A');
  const itemsB = parseItems(src, 'ITEMS_B');
  const st = judgeStatic({ itemsA, itemsB });
  console.log('===== 人工盲测冷跑 · 开跑前自检 =====');
  console.log(`静态：B 集 ${st.facts.violations} 违规 + ${st.facts.clean} 合规 · 与 A 集文案重合 ${st.facts.overlapWithA} 条 · 法律依据覆盖 ${st.facts.basisKinds} 类`);
  for (const x of st.fails) console.log(`  ✗ ${x}`);

  // 动态：采集器可跑性（空答案，仅验脚本无 bug）。依赖缺失 → 显式 SKIP（静态结论如实保留，不假报动态已测）
  let dyn = { ok: true, fails: [], skipped: false };
  const { chromium } = resolveChromium();
  if (!chromium) {
    dyn.skipped = true;
    console.log(skipMsg('动态自检（采集器可跑性）') + '——静态自检结论仍有效，动态未测 ≠ 已测');
  }
  try {
    if (chromium) {
    const browser = await chromium.launch({ channel: 'chrome', args: ['--hide-scrollbars'] }).catch(async () => chromium.launch());
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    // 采集器在有条目未作答时会 confirm() 询问「未答按没问题计，继续？」——自检须接受该确认（真人会点继续）
    page.on('dialog', (d) => d.accept());
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 100)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 100)); });
    await page.goto('file:///' + HTML.replace(/\\/g, '/'));
    await page.waitForTimeout(700);
    await page.click('#start'); await page.waitForTimeout(400);
    const n = await page.evaluate(() => document.querySelectorAll('#items > *').length);
    if (n !== 20) dyn.fails.push(`采集器渲染 ${n} 条 ≠ 20 条`);
    await page.click('#submit'); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({
      resultShown: !document.getElementById('result').classList.contains('hidden'),
      copy: document.getElementById('copyBlock').textContent.replace(/\s+/g, ' ').trim(),
      hero: document.getElementById('resHero').textContent.replace(/\s+/g, ' ').trim().slice(0, 60),
    }));
    if (!r.resultShown) dyn.fails.push('提交后结果面板未出现');
    if (!/耗时/.test(r.copy) || !/召回|漏检/.test(r.copy)) dyn.fails.push('回填文本缺关键字段（耗时/召回或漏检）');
    if (errs.length) dyn.fails.push(`页面错误 ${errs.length} 条：${errs[0]}`);
    console.log(`动态：渲染 ${n} 条 · 结果面板 ${r.resultShown ? '已出分' : '未出现'} · 回填文本「${r.hero}…」`);
    await browser.close();
    }
  } catch (e) {
    dyn = { ok: false, fails: [`动态自检异常：${String(e.message || e).slice(0, 120)}`] };
  }
  if (dyn.fails.length) dyn.ok = false;   // 动态任一失败即整体不通过（此前漏置导致「有红仍报就绪」）
  for (const x of dyn.fails) console.log(`  ✗ ${x}`);

  const ok = st.ok && dyn.ok;
  if (dyn.skipped) console.log('⏭️ 动态自检未执行（依赖缺失）——本结论仅覆盖静态部分，动态未测 ≠ 已测');
  console.log(ok
    ? '✅ 工具链就绪：可交真人冷跑（本次为工具自检，空答案，不构成人工实测数据）'
    : '❌ 工具链有缺陷：真跑前需先修');
  console.log('   口径提醒：人工冷跑用 ?set=B（B 集 20 条），而 bench.mjs 的召回/误报测的是 A 集 —— 两者非同一批样本，结论勿直接逐条对齐。');
  process.exit(ok ? 0 : 1);
}
