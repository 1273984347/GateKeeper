// lint-layout.mjs — M20 布局结果判据门禁（AL1–AL11；DOM 实测型，非 CSS 文本解析）
// 用法：node tools/lint-layout.mjs [--json]
// 退出码：0 = 全过；1 = 有红（退出码直取，禁管道包裹）
//
// 与既有门禁的分工：
//   · M19 A1（间距刻度）尚未工具化 → 本门承担 AL7（声明级解析，口径同 A1）；
//   · M19 A11 由 tools/class-audit.mjs 承担；
//   · AL12（功能零回归）由 smoke.mjs + verify.mjs 承担，本门不重复。
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveChromium, launch as launchBrowser, skipMsg } from './browser.mjs';

// —— 阈值（取自 prototype/output/geo-baseline-m20-batch5.md 实测基线）——
export const TH = {
  AL1_chromePct: 60,                 // 390 首屏 chrome 占比 %
  AL2_band: { 1280: 140, 1024: 260, 640: 320 },
  AL3_verdictToP0: 120,              // 裁决 → 就近证据条首条 P0（px）
  AL4_cleanBarH: 120,                // 「已通过」摘要条高（px）
  AL5_railHole: 20,                  // rail 盒高 − 内容实高（px）
  AL6_conclusionScores: 1,           // 同屏结论性分数（环/裁决）个数
  AL7_scale: [4, 8, 12, 16, 24, 32, 48],
  AL7_padException: 2,               // 2px 纵向内边距白名单（徽章类）
  AL7_padExceptionSel: ['tag', 'sev', 'live-badge', 'supp', 'kbd'],
  AL8_orphan: 0,                     // 孤儿末卡数
  AL9_overflow: 0,                   // 横向溢出 px
  AL10_hitReachable: true,           // 定位后命中项须在视口内
  AL11_blockedDisabled: true,        // 阻断态主按钮须禁用并标明原因
};

export function judge(m) {
  const f = [];
  if (!(m.al1.chromePct <= TH.AL1_chromePct)) f.push(`AL1 390 首屏 chrome 占比 ${m.al1.chromePct}% > ${TH.AL1_chromePct}%`);
  for (const [w, lim] of Object.entries(TH.AL2_band)) {
    if (m.al2.band[w] > lim) f.push(`AL2 band 高 ${w}档 ${m.al2.band[w]}px > ${lim}px`);
  }
  if (!(m.al3.verdictToP0 <= TH.AL3_verdictToP0)) f.push(`AL3 裁决→首条 P0 ${m.al3.verdictToP0}px > ${TH.AL3_verdictToP0}px`);
  if (!(m.al4.cleanBarH <= TH.AL4_cleanBarH)) f.push(`AL4 已通过摘要条高 ${m.al4.cleanBarH}px > ${TH.AL4_cleanBarH}px`);
  if (m.al4.standaloneCleanCards > 0) f.push(`AL4 仍有 ${m.al4.standaloneCleanCards} 张独立 0 命中空卡`);
  if (!(m.al5.railHole <= TH.AL5_railHole)) f.push(`AL5 rail 空洞 ${m.al5.railHole}px > ${TH.AL5_railHole}px`);
  if (!(m.al6.conclusionScores <= TH.AL6_conclusionScores)) f.push(`AL6 同屏结论性分数 ${m.al6.conclusionScores} 个 > ${TH.AL6_conclusionScores} 个`);
  if (m.al7.violations.length) f.push(`AL7 间距越刻度 ${m.al7.violations.length} 处：${m.al7.violations.slice(0, 3).join('；')}`);
  if (!(m.al8.orphan <= TH.AL8_orphan)) f.push(`AL8 孤儿末卡 ${m.al8.orphan} 处 > ${TH.AL8_orphan}`);
  if (!(m.al9.maxOverflow <= TH.AL9_overflow)) f.push(`AL9 横向溢出 ${m.al9.maxOverflow}px > ${TH.AL9_overflow}px`);
  if (!m.al10.hitReachable) f.push('AL10 定位后命中项不在视口内');
  if (!m.al11.blockedDisabled) f.push('AL11 阻断态主按钮未禁用/未标明原因');
  if (!m.al11.passEnabled) f.push('AL11 放行态主按钮不可点');
  return { ok: f.length === 0, fails: f };
}

// ——— AL7：声明级间距刻度解析（口径同 M19 A1）———
export function scanSpacing(css, th = TH) {
  const allow = new Set([0, 2, -1, -2]);
  const out = [];
  const re = /(?:^|[;{\s])(padding|margin|gap)(-[a-z]+)?\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(css))) {
    const prop = m[1] + (m[2] || '');
    if (prop.startsWith('scroll-margin')) continue;
    const val = m[3];
    if (/auto|inherit/.test(val)) continue;
    for (const px of val.matchAll(/(-?\d+)px/g)) {
      const v = Number(px[1]);
      if (th.AL7_scale.includes(v) || allow.has(v)) continue;
      const sel = m[0].replace(/^[^a-z-]*/, '').split(/\s*:\s*/)[0];
      const isPadException = v === th.AL7_padException && th.AL7_padExceptionSel.some((s) => sel.includes(`.${s}`));
      if (isPadException) continue;
      out.push(`${prop}: ${v}px`);
    }
  }
  return out;
}

// ——— 测量（浏览器）———
const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
// 依赖解析单一实现（tools/browser.mjs）：未安装 → SKIP exit 0（新用户环境不红门，v0.21.4）；
// 依赖在但浏览器起不来仍 fail-closed exit 1（v0.21.3 口径不变：判据未跑 ≠ 判据通过）。
const { chromium } = resolveChromium();
async function launch() { return launchBrowser(chromium); }

const URL = 'file:///' + join(PROTO, 'gatekeeper.html').replace(/\\/g, '/');
const VPS = [1280, 1024, 640, 480, 390];

// 仅当直接执行本文件时跑测量（被测试 import 时只提供纯函数，避免副作用）
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();

async function main() {
if (!chromium) { console.log(skipMsg('布局门禁')); process.exit(0); }
let browser;
try { browser = await launch(); }
catch (e) {
  console.error('✗ 布局判据无法执行：未找到可用浏览器（fail-closed，与本仓其余门禁一致——判据未跑 ≠ 判据通过）');
  console.error('  详情：' + String(e.message || e).slice(0, 160));
    process.exit(1);
}
// 单页复用 + 渲染稳定等待（v0.21.5 提速：原 3 次整页加载 + 硬编码 sleep ≈9s → 双 rAF 等待一次加载 ≈2s；测量口径逐项不变）
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
const settle = async (ms) => {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(ms);
};
await page.goto(URL);
await settle(300);

const measure = {};
for (const w of VPS) {
  await page.setViewportSize({ width: w, height: 900 });
  await settle(150);
  const ov = await page.evaluate(() => {
    const H = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : 0; };
    const chrome = H('header.top') + H('.band') + H('.viewnav') + H('.crumbs');
    // 孤儿末卡：auto-fit grid 末行只有 1 个且明显窄于列宽
    let orphan = 0;
    for (const sel of ['.metrics-grid', '.projgrid']) {
      const g = document.querySelector(sel); if (!g) continue;
      const kids = [...g.children].map((k) => k.getBoundingClientRect());
      if (!kids.length) continue;
      const rows = new Map();
      kids.forEach((b) => { const key = Math.round(b.top); if (!rows.has(key)) rows.set(key, []); rows.get(key).push(b); });
      const last = [...rows.values()].pop();
      if (last.length === 1 && kids[0].width > 0) {
        const maxW = Math.max(...kids.map((b) => b.width));
        if (last[0].width < maxW * 0.8) orphan++;
      }
    }
    return {
      chrome, band: H('.band'),
      chromePct: +(chrome / window.innerHeight * 100).toFixed(1),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      orphan,
      ringVisible: (() => { const r = document.querySelector('.ring'); return r ? r.getBoundingClientRect().width > 0 : false; })(),
    };
  });
  measure[w] = { overview: ov };
}

// 明细视图（1280 档测动线判据；同页继续，不再新开 page）
await page.setViewportSize({ width: 1280, height: 900 });
await settle(150);
await page.evaluate(() => document.querySelector('.vtab[data-view="inspect"]').click());
await settle(200);
await page.evaluate(() => document.querySelector('#list .item').click());
await settle(250);

const ins = await page.evaluate(() => {
  const y = (el) => el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
  const h = (el) => el ? Math.round(el.getBoundingClientRect().height) : null;
  const verdict = document.querySelector('.doc-head .verdict');
  const te = document.querySelector('#topEvidence .te-item');
  const cleanBar = document.querySelector('.gates-clean');
  const rail = document.querySelector('.rail');
  const list = document.getElementById('list');
  const foot = document.querySelector('.rail-foot');
  const h3 = document.querySelector('.rail h3');
  const rs = rail ? getComputedStyle(rail) : null;
  // 口径：rail 盒高 −（列表 + 脚注 + 标题 + 标题下边距 + 上下内边距 + 上下边框）= 真实空洞
  const chrome = rail ? Math.round(rail.getBoundingClientRect().height) - h(list) - h(foot) - h(h3)
    - (h3 ? parseFloat(getComputedStyle(h3).marginBottom) || 0 : 0)
    - (parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom))
    - (parseFloat(rs.borderTopWidth) + parseFloat(rs.borderBottomWidth)) : null;
  // 同屏结论性分数：可见的环 + 裁决徽章
  const ringVis = (() => { const r = document.querySelector('.ring'); return r && r.getBoundingClientRect().width > 0 ? 1 : 0; })();
  const verdictVis = verdict && verdict.getBoundingClientRect().width > 0 ? 1 : 0;
  return {
    verdictToP0: verdict && te ? y(te) - y(verdict) : 9999,
    cleanBarH: h(cleanBar) ?? 0,
    standaloneCleanCards: document.querySelectorAll('#cards .gate .clean').length,
    railHole: chrome === null ? 9999 : chrome,
    conclusionScores: ringVis + verdictVis,
    approve: { disabled: document.getElementById('btnApprove').disabled, label: document.getElementById('btnApprove').textContent.trim() },
  };
});
// 放行态按钮（最后一篇产出物可发布）与 AL10 就近证据条（同页按序复测，替代原 page2/page3 两次整页加载）
await page.setViewportSize({ width: 1280, height: 900 });
await settle(150);
// AL10：点就近证据条 → 命中项须在视口内（沿用首篇选中态）
await page.evaluate(() => document.querySelector('#topEvidence .te-item')?.click());
await settle(400);
const hitReachable = await page.evaluate(() => {
  const s = document.querySelector('#cards .finding.sel');
  if (!s) return false;
  const b = s.getBoundingClientRect();
  return b.top >= 0 && b.bottom <= window.innerHeight;
});
// 放行态：切到最后一篇（可发布文档）后主按钮可点
await page.evaluate(() => { const items = document.querySelectorAll('#list .item'); items[items.length - 1].click(); });
await settle(200);
const passBtn = await page.evaluate(() => ({ disabled: document.getElementById('btnApprove').disabled }));
await browser.close();

// AL7：CSS 声明级解析
const html = readFileSync(join(PROTO, 'gatekeeper.html'), 'utf8');
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));

const m = {
  al1: { chromePct: measure[390].overview.chromePct },
  al2: { band: { 1280: measure[1280].overview.band, 1024: measure[1024].overview.band, 640: measure[640].overview.band } },
  al3: { verdictToP0: ins.verdictToP0 },
  al4: { cleanBarH: ins.cleanBarH, standaloneCleanCards: ins.standaloneCleanCards },
  al5: { railHole: ins.railHole },
  al6: { conclusionScores: ins.conclusionScores },
  al7: { violations: scanSpacing(css) },
  al8: { orphan: Object.values(measure).reduce((s, v) => s + v.overview.orphan, 0) },
  al9: { maxOverflow: Math.max(...Object.values(measure).map((v) => v.overview.overflow)) },
  al10: { hitReachable },
  al11: { blockedDisabled: ins.approve.disabled && ins.approve.label.includes('不可发布'), passEnabled: !passBtn.disabled },
};

const verdict = judge(m);
if (process.argv.includes('--json')) console.log(JSON.stringify({ m, verdict }, null, 1));
else {
  console.log('===== M20 布局判据 lint-layout =====');
  console.log(`AL1 390 首屏 chrome 占比 ${m.al1.chromePct}%（≤${TH.AL1_chromePct}）`);
  console.log(`AL2 band 高 1280=${m.al2.band[1280]} / 1024=${m.al2.band[1024]} / 640=${m.al2.band[640]}`);
  console.log(`AL3 裁决→首条 P0 ${m.al3.verdictToP0}px（≤${TH.AL3_verdictToP0}）`);
  console.log(`AL4 已通过摘要条 ${m.al4.cleanBarH}px · 独立空卡 ${m.al4.standaloneCleanCards} 张`);
  console.log(`AL5 rail 空洞 ${m.al5.railHole}px（≤${TH.AL5_railHole}）`);
  console.log(`AL6 同屏结论性分数 ${m.al6.conclusionScores} 个`);
  console.log(`AL7 间距越刻度 ${m.al7.violations.length} 处`);
  console.log(`AL8 孤儿末卡 ${m.al8.orphan} 处`);
  console.log(`AL9 最大横向溢出 ${m.al9.maxOverflow}px`);
  console.log(`AL10 定位后命中项可达 ${m.al10.hitReachable}`);
  console.log(`AL11 阻断态禁用 ${m.al11.blockedDisabled} · 放行态可点 ${m.al11.passEnabled}`);
  if (errors.length) console.log(`✗ 页面错误 ${errors.length} 条：${errors[0]}`);
  console.log(verdict.ok ? '✅ 布局判据全过' : `❌ ${verdict.fails.length} 项 FAIL`);
  for (const x of verdict.fails) console.log(`  ✗ ${x}`);
}
process.exit(verdict.ok && errors.length === 0 ? 0 : 1);
}
