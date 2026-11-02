// smoke.mjs — SK-03 前端冒烟标准化：七项清单（复盘报告 §5 SC-03；v0.21.0 起 ④ 拆为 ④/④b）
// 用法：node tools/smoke.mjs [gatekeeper.html 路径]
// 七项：①加载 0 error ②暗色 bodyBg ③640 无横向溢出 ④阻断态按钮禁用并标明原因 ④b放行态按钮可用且弹 toast ⑤快捷键切视图 ⑥粘贴全链路
// 依赖 playwright（本机全局安装）；未命中时按提示设置 NODE_PATH。
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { resolveChromium, launch as launchBrowser, skipMsg } from './browser.mjs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(PROTO, 'gatekeeper.html');
if (!existsSync(TARGET)) { console.error(`✗ 找不到被测文件：${TARGET}`); process.exit(2); }
const URL = 'file:///' + TARGET.replace(/\\/g, '/');

const { chromium } = resolveChromium();
if (!chromium) {
  // 依赖缺失 ≠ 冒烟通过：SKIP 需显式声明（维护者环境未测 ≠ 通过，勿据此宣称冒烟绿）
  console.log(skipMsg('前端冒烟') + '（维护者环境未测 ≠ 通过，勿据此宣称冒烟绿）');
  process.exit(0);
}

const checks = [];
const record = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`); };

const browser = await launchBrowser(chromium);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

try {
  // ① 加载 0 error
  await page.goto(URL); await page.waitForTimeout(1200);
  record('① 加载 0 error', errors.length === 0, errors.length ? errors[0].slice(0, 80) : '');

  // ⑥ 粘贴全链路（在亮色/默认口径下先做，避免主题切换干扰）
  await page.keyboard.press('/'); await page.waitForTimeout(200);
  await page.keyboard.type('本产品全网第一，客服微信 13800001234');
  await page.keyboard.press('Control+Enter'); await page.waitForTimeout(700);
  const docHead = await page.evaluate(() => document.getElementById('docHead').textContent);
  record('⑥ 粘贴全链路（/ → Ctrl+Enter → 自定义文档）', docHead.includes('自定义粘贴内容'), docHead.replace(/\s+/g, ' ').slice(0, 40));

  // ⑤ 快捷键切视图
  await page.keyboard.press('4'); await page.waitForTimeout(400);
  const activeView = await page.evaluate(() => document.querySelector('.view.active').id);
  record('⑤ 快捷键 4 → 配置对照视图', activeView === 'view-config', activeView);

  // ④ 阻断文档：提交按钮应禁用并标明原因（M20 批 4 C2 上下文联动；原「点击后弹阻断 toast」的交互已前置为按钮态）
  await page.click('.vtab[data-view="inspect"]'); await page.waitForTimeout(400);
  await page.click('#list .item:first-child'); await page.waitForTimeout(500);
  const appr = await page.evaluate(() => {
    const b = document.getElementById('btnApprove');
    return { disabled: b.disabled, label: b.textContent.trim() };
  });
  record('④ 阻断文档 → 提交按钮禁用并标明原因', appr.disabled && appr.label.includes('不可发布'), `disabled=${appr.disabled} label=${appr.label}`);

  // ④b 可发布文档：提交按钮可用且点击弹出 toast（M20 批 4 后动作只在放行态可触发）
  await page.click('#list .item:last-child'); await page.waitForTimeout(500);
  const apprOk = await page.evaluate(() => {
    const b = document.getElementById('btnApprove');
    return { disabled: b.disabled, label: b.textContent.trim() };
  });
  await page.click('#btnApprove'); await page.waitForTimeout(400);
  const toastCnt = await page.locator('.toast').count();
  record('④b 可发布文档提交 → toast', !apprOk.disabled && toastCnt >= 1, `disabled=${apprOk.disabled} toast×${toastCnt}`);

  // ② 暗色 bodyBg（M19 换肤后暗色底 = #1b1b1b，旧值 #131519 已废）
  await page.click('#btnTheme'); await page.waitForTimeout(500);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  record('② 暗色 bodyBg = rgb(27, 27, 27)', bg === 'rgb(27, 27, 27)', bg);

  // ③ 640 无横向溢出
  await page.setViewportSize({ width: 640, height: 900 }); await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  record('③ 640px 无横向溢出', !overflow, overflow ? 'scrollWidth 超出' : '');
} catch (e) {
  record('执行异常', false, String(e).slice(0, 120));
}

await browser.close();
const fail = checks.filter((c) => !c.ok).length;
console.log(`\n===== 冒烟 ${fail === 0 ? '✅ 七项全 PASS' : `❌ ${fail} 项 FAIL`} / ${checks.length} =====`);
process.exit(fail === 0 ? 0 : 1);
