// browser.mjs — Playwright 解析与启动的单一实现（v0.21.5 抽取：五处复制粘贴收敛，SKIP/fail-closed 口径统一）
// resolveChromium()：未安装 Playwright 时返回 { chromium: null }（不抛错）——由调用方决定 SKIP（可选工具）
// 还是 fail-closed（门禁类）。launch(chromium)：自带浏览器优先，revision 不匹配时回落 ms-playwright 缓存中已装 chromium。
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function resolveChromium() {
  try { return { chromium: createRequire(import.meta.url)('playwright').chromium }; }
  catch {
    try { return { chromium: createRequire(import.meta.url)(join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright', 'index.js')).chromium }; }
    catch { return { chromium: null }; }
  }
}

export function skipMsg(tool) {
  return `⏭️ SKIP ${tool}：未安装 Playwright（可选依赖，不阻断）。安装后启用：npm i -g playwright && npx playwright install chromium`;
}

export async function launch(chromium) {
  try { return await chromium.launch(); }
  catch (e) {
    const cache = join(process.env.LOCALAPPDATA || process.env.APPDATA || '', 'ms-playwright');
    const dir = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0] : null;
    const exe = dir ? join(cache, dir, 'chrome-win64', 'chrome.exe') : '';
    if (!exe || !existsSync(exe)) throw e;
    return chromium.launch({ executablePath: exe });
  }
}
