// geo-probe.mjs — 几何基线探针（M19/M20 换肤与重排后的共用复测工具）
// 用法：node tools/geo-probe.mjs
// 输出：三档视口下的顶栏/导航条/汇总带高度、rail 空洞、门禁卡等高差（JSON）
// 用途：换肤改几何后，M20 的 AL2（band 高）/ AL4（0 命中卡高）/ AL5（rail 空洞）
//       阈值须在本工具提供的**当前基线**上重测，不得沿用旧令牌下的实测值。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(PROTO, 'gatekeeper.html');
const URL = 'file:///' + TARGET.replace(/\\/g, '/');

let chromium;
try {
  chromium = createRequire(import.meta.url)('playwright').chromium;
} catch {
  const guess = join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright');
  chromium = createRequire(import.meta.url)(join(guess, 'index.js')).chromium;
}
async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const cache = join(process.env.LOCALAPPDATA || process.env.APPDATA || '', 'ms-playwright');
    const dir = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0] : null;
    const exe = dir ? join(cache, dir, 'chrome-win64', 'chrome.exe') : '';
    if (!exe || !existsSync(exe)) throw e;
    return chromium.launch({ executablePath: exe });
  }
}

const browser = await launch();
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
    const gates = [...document.querySelectorAll('.cards .gate')].map((g) => Math.round(g.getBoundingClientRect().height));
    return {
      railH, listH, footH,
      railHole: railH != null && listH != null ? railH - listH - (footH || 0) : null,
      gates, maxGate: gates.length ? Math.max(...gates) : null, minGate: gates.length ? Math.min(...gates) : null,
      spread: gates.length ? Math.max(...gates) - Math.min(...gates) : null,
    };
  });
  out[w] = { overview: ov, inspect: ins };
  await page.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
