// contrast-probe.mjs — 换肤可访问性探针：实测页面内所有可见文本与背景的对比度
// 用法：node tools/contrast-probe.mjs [light|dark]
// 产出：标准输出（不足项逐条点名）+ 落 output/contrast-<theme>.md
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(PROTO, 'gatekeeper.html');
const THEME = process.argv[2] || 'dark';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL);
await page.waitForTimeout(900);
if (THEME === 'dark') { await page.click('#btnTheme'); await page.waitForTimeout(500); }

const report = await page.evaluate(() => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      // 渐变底：background-color 为 transparent，须从 backgroundImage 取首个色标做近似底色
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none' && /gradient/i.test(bi)) {
        const m = bi.match(/rgba?\([^)]+\)/);
        if (m) {
          const p = parse(m[0]);
          const alpha = (m[0].match(/[\d.]+/g) || [])[3];
          if (p.length === 3 && (alpha === undefined || Number(alpha) > 0.85)) return { rgb: p, approx: true };
        }
      }
      const bg = cs.backgroundColor;
      const p = parse(bg);
      const alpha = (bg.match(/[\d.]+/g) || [])[3];
      if (p.length === 3 && (alpha === undefined || Number(alpha) > 0.85)) return { rgb: p, approx: false };
      n = n.parentElement;
    }
    return { rgb: [255, 255, 255], approx: false };
  };
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('script,style,svg')) return;
    const txt = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!txt) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) return;
    // 渐变文字（background-clip:text + text-fill-color:transparent）：实际渲染取渐变色，
    // getComputedStyle 的 color 不代表可见色，无法用本探针判定 → 排除并由人工目检
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') return;
    const fg = parse(cs.color), bgi = bgOf(el), bg = bgi.rgb;
    const l1 = lum(fg), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      out.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), txt: txt.slice(0, 28), size, fg: cs.color, bg: `rgb(${bg.join(',')})${bgi.approx ? ' 渐变近似' : ''}`, ratio: Math.round(ratio * 100) / 100, need });
    }
  });
  return out;
});
await browser.close();

const lines = report.map((r) => `- \`${r.sel}\` 「${r.txt}」 ${r.size}px ${r.fg} on ${r.bg} → **${r.ratio}:1**（需 ≥${r.need}）`);
const md = `# 对比度探针 · ${THEME} 主题\n\n> 工具：prototype/tools/contrast-probe.mjs｜页面：prototype/gatekeeper.html\n> 判据：WCAG AA——常规文字 ≥4.5:1，大字（≥24px 或 ≥18.66px 粗体）≥3:1\n\n**不足项 ${report.length} 条**\n\n${lines.length ? lines.join('\n') : '（无，全部达标）'}\n`;
const outDir = join(PROTO, 'output');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `contrast-${THEME}.md`), md, 'utf8');
console.log(md);
process.exit(report.length ? 1 : 0);
