// shot.mjs — UI 换肤截图留档（M19 呈现层批）
// 用法：node tools/shot.mjs [前缀=v2] [主题=both]
// 产出：screenshots/<前缀>-<视图>-<宽度>[-dark].png（整页）
// 依赖 playwright（本机全局安装）；自带浏览器 revision 不匹配时回落 ms-playwright 缓存中已装 chromium。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(PROTO, 'gatekeeper.html');
const SHOTS = join(PROTO, 'screenshots');
const prefix = process.argv[2] || 'v2';
const themeArg = process.argv[3] || 'both';
if (!existsSync(TARGET)) { console.error(`✗ 找不到被测文件：${TARGET}`); process.exit(2); }
const URL = 'file:///' + TARGET.replace(/\\/g, '/');

let chromium;
try {
  chromium = createRequire(import.meta.url)('playwright').chromium;
} catch {
  const guess = join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright');
  try { chromium = createRequire(import.meta.url)(join(guess, 'index.js')).chromium; }
  catch { console.error('✗ 未找到 playwright。设置 NODE_PATH 指向全局 node_modules 后重试。'); process.exit(2); }
}

async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const cache = join(process.env.LOCALAPPDATA || process.env.APPDATA || '', 'ms-playwright');
    const dir = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0] : null;
    const exe = dir ? join(cache, dir, 'chrome-win64', 'chrome.exe') : '';
    if (!exe || !existsSync(exe)) throw e;
    console.log(`  (提示：自带浏览器不可用，回落已装 chromium ${dir})`);
    return chromium.launch({ executablePath: exe });
  }
}

if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

// [视图, 宽度, 是否暗色]
const PLAN = [
  ['overview', 1280, false], ['overview', 1024, false], ['overview', 640, false],
  ['overview', 1280, true], ['inspect', 1280, false], ['inspect', 1280, true],
  ['inspect', 640, false], ['config', 1280, false],
];

const browser = await launch();
const errors = [];
let made = 0;
for (const [view, width, dark] of PLAN) {
  if (themeArg === 'light' && dark) continue;
  if (themeArg === 'dark' && !dark) continue;
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', (e) => errors.push(`${view}@${width}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${view}@${width}: ${m.text()}`); });
  await page.goto(URL);
  await page.waitForTimeout(900);
  if (view !== 'overview') {
    await page.click(`.vtab[data-view="${view}"]`);
    await page.waitForTimeout(500);
  }
  if (dark) {
    await page.click('#btnTheme');
    await page.waitForTimeout(500);
  }
  const name = `${prefix}-${view}-${width}${dark ? '-dark' : ''}.png`;
  const out = join(SHOTS, name);
  await page.screenshot({ path: out, fullPage: true });
  // 溢出与几何采样（换肤批次的机器判据）
  const geo = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    ring: document.getElementById('ringNum')?.textContent,
  }));
  console.log(`✓ ${name}  overflow=${geo.overflow ? 'YES' : 'no'} bodyBg=${geo.bodyBg} ring=${geo.ring}`);
  made++;
  await page.close();
}
await browser.close();
console.log(`\n===== 截图 ${made} 张 → ${SHOTS} =====`);
if (errors.length) {
  console.log(`✗ 页面错误 ${errors.length} 条：`);
  errors.slice(0, 5).forEach((e) => console.log('  ' + e.slice(0, 160)));
  process.exit(1);
}
console.log('✓ 0 页面错误');
