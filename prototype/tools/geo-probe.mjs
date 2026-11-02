// geo-probe.mjs — 几何基线探针（M19/M20 换肤与重排后的共用复测工具）
// 用法：node tools/geo-probe.mjs
// 输出：三档视口下的顶栏/导航条/汇总带高度、rail 空洞、门禁卡等高差（JSON）
// 用途：换肤改几何后，M20 的 AL2（band 高）/ AL4（0 命中卡高）/ AL5（rail 空洞）
//       阈值须在本工具提供的**当前基线**上重测，不得沿用旧令牌下的实测值。
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveChromium, launch as launchBrowser, skipMsg } from './browser.mjs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(PROTO, 'gatekeeper.html');
const URL = 'file:///' + TARGET.replace(/\\/g, '/');

const { chromium } = resolveChromium();
if (!chromium) { console.log(skipMsg('几何基线探针')); process.exit(0); }

const browser = await launchBrowser(chromium);
const out = {};
for (const w of [1280, 1024, 640]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(URL);
  await page.waitForTimeout(900);
  const ov = await page.evaluate(() => {
    const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null; };
    const top = h('header.top'), nav = h('.viewnav'), band = h('.band');
    return { topbar: top, viewnav: nav, band, chrome3: (top || 0) + (nav || 0) + (band || 0) };
  });
  await page.click('.vtab[data-view="inspect"]');
  await page.waitForTimeout(600);
  const ins = await page.evaluate(() => {
    const rail = document.querySelector('.rail');
    const railH = rail ? Math.round(rail.getBoundingClientRect().height) : null;
    const listH = document.querySelector('#list') ? Math.round(document.querySelector('#list').getBoundingClientRect().height) : null;
    const footH = document.querySelector('.rail-foot') ? Math.round(document.querySelector('.rail-foot').getBoundingClientRect().height) : null;
    // 口径对齐 lint-layout AL5（v0.21.0 修正版）：rail 盒高 −（列表 + 脚注 + 标题 + 标题下边距 + 上下内边距 + 上下边框）
    // 旧公式（railH − listH − footH）与门禁 AL5 分叉，换肤复测会得出与门禁不一致的基线——v0.21.5 对齐
    const h3 = document.querySelector('.rail h3');
    const rs = rail ? getComputedStyle(rail) : null;
    const railHole = railH != null && listH != null && rs
      ? railH - listH - (footH || 0) - (h3 ? Math.round(h3.getBoundingClientRect().height) : 0)
        - (h3 ? parseFloat(getComputedStyle(h3).marginBottom) || 0 : 0)
        - (parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom))
        - (parseFloat(rs.borderTopWidth) + parseFloat(rs.borderBottomWidth))
      : null;
    const gates = [...document.querySelectorAll('.cards .gate')].map((g) => Math.round(g.getBoundingClientRect().height));
    return {
      railH, listH, footH,
      railHole,
      gates, maxGate: gates.length ? Math.max(...gates) : null, minGate: gates.length ? Math.min(...gates) : null,
      spread: gates.length ? Math.max(...gates) - Math.min(...gates) : null,
    };
  });
  out[w] = { overview: ov, inspect: ins };
  await page.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
