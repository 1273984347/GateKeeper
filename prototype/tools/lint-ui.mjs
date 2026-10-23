// lint-ui.mjs — M19 A 系列声明级判据门禁（纯文本解析，无需浏览器，可进 CI）
// 用法：node tools/lint-ui.mjs [--json]
// 退出码：0 = 全过；1 = 有红（退出码直取，禁管道包裹）
//
// 口径声明（避免「同一现象两个口径」）：
//   · A2/A3 扫**全部**声明（不限选择器）；
//   · A4 只扫 **:hover 规则块内**的 translateY（不含 @keyframes 入场动画的位移）；
//   · A5 计 **:focus-visible 声明块数**（一条规则含 8 个选择器仍算 1 个声明块）；
//   · A3 白名单：装饰性微元素（荧光笔 mark、2px Tabs 指示条）允许 2px 圆角；
//   · A1（间距刻度）由 tools/lint-layout.mjs 的 AL7 承担，本脚本不重复判定。
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');

export const TH = {
  A2_fontSizes: [12, 13, 14, 16, 20, 28, 40],
  A3_radii: [4, 6, 8, 999],
  A3_radiusExemptSelectors: ['mark', '.vtab.active::after'],   // 装饰性微元素
  A3_radiusExemptValue: 2,
  A4_hoverTranslateY: [-1, -2],
  A5_focusVisibleBlocks: 2,
  A6_minLumDiff: 0.08,        // P1 vs P2 相对亮度差
  A6_minHueDiff: 12,          // 品牌 vs 危险 色相差（度）
  A6_minContrast: 4.5,        // 四级实心块压白字
  A7_minContrast: 4.5,        // --muted 对白底
  A12_maxBytes: 120 * 1024,
  A13_maxSerifRefs: 0,
  A13_maxFontFace: 0,
  A8_numberSelectors: [
    '.ring .num b', '.cnt b', '.metric .mv', '.projcard .pstat b',
    '.gpill .v', '.trendcol .tval', '.difftable .delta',
  ],
};

// ——— 解析 ———
export function parseTokens(css) {
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] || '';
  const raw = {};
  for (const m of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/g)) {
    if (!(m[1] in raw)) raw[m[1]] = m[2].trim();   // 首次定义优先：正式定义在前，v1 兼容别名在后
  }
  // 别名链解析（--warn:var(--p1) → #a8620e），带环保护
  const resolve = (name, seen = new Set()) => {
    if (seen.has(name)) return null;
    seen.add(name);
    const v = raw[name];
    if (!v) return null;
    const al = v.match(/^var\((--[a-z0-9-]+)\)$/);
    if (al) return resolve(al[1], seen);
    return v;
  };
  const out = {};
  for (const k of Object.keys(raw)) out[k] = resolve(k) || raw[k];
  return out;
}
export function scanFontSizes(css) {
  return [...new Set([...css.matchAll(/font-size:\s*(-?\d+)px/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
}
export function scanRadii(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*border-radius:[^}]*)\}/g)) {
    const sel = m[1].trim().split('\n').pop().trim();
    for (const r of m[2].matchAll(/border-radius:\s*([^;}]+)/g)) {
      for (const v of r[1].matchAll(/(-?\d+)px/g)) out.push({ sel, value: Number(v[1]) });
    }
  }
  return out;
}
export function scanHoverTranslate(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)) {
    for (const y of m[2].matchAll(/translateY\((-?\d+)px\)/g)) out.push({ sel: m[1].trim().slice(-60), value: Number(y[1]) });
  }
  return out;
}
export function countFocusVisibleBlocks(css) {
  // 一个声明块 = 一次出现「:focus-visible{」到对应「}」
  return (css.match(/:focus-visible[^{}]*\{/g) || []).length;
}
export function countSerifRefs(css) { return (css.match(/var\(--serif\)/g) || []).length; }
export function countFontFace(css) { return (css.match(/@font-face/g) || []).length; }
export function numberFontFamilies(css) {
  const out = {};
  for (const sel of TH.A8_numberSelectors) {
    // 取该选择器最后一段（如 `.ring .num b` → `b`）所在规则块的 font-family
    const key = sel.split(' ').pop();
    const re = new RegExp('([^{}]*' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\s*\\{([^}]*)\\}', 'g');
    let found = null;
    for (const m of css.matchAll(re)) if (m[1].includes(sel) || sel.includes(m[1].trim())) { found = m[2]; break; }
    out[sel] = found ? (/font-family:\s*var\(--mono\)/.test(found) ? 'mono' : 'other') : 'inherit';
  }
  return out;
}

// ——— 颜色计算（WCAG）———
export function hexToRgb(hex) {
  const h = hex.trim().replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
export function relLuminance(rgb) {
  const f = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
export function contrast(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1)), l2 = relLuminance(hexToRgb(hex2));
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
export function hue(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return h;
}
export function hueDiff(a, b) { const d = Math.abs(hue(a) - hue(b)) % 360; return d > 180 ? 360 - d : d; }

// ——— 判定 ———
export function judge(m) {
  const f = [];
  const badSizes = m.a2.fontSizes.filter((s) => !TH.A2_fontSizes.includes(s));
  if (badSizes.length) f.push(`A2 字号越阶梯：${badSizes.join('、')}px（许 ${TH.A2_fontSizes.join('/')}）`);
  const badRadii = m.a3.radii.filter((r) => !(TH.A3_radii.includes(r.value) || (r.value === TH.A3_radiusExemptValue && TH.A3_radiusExemptSelectors.some((s) => r.sel.includes(s)))));
  if (badRadii.length) f.push(`A3 圆角越档：${badRadii.map((r) => `${r.sel}=${r.value}px`).join('、')}（许 ${TH.A3_radii.join('/')} + 装饰白名单 ${TH.A3_radiusExemptSelectors.join('/')} 的 ${TH.A3_radiusExemptValue}px）`);
  const badHover = m.a4.hoverTranslate.filter((h) => !TH.A4_hoverTranslateY.includes(h.value));
  if (badHover.length) f.push(`A4 hover 位移越档：${badHover.map((h) => `${h.sel}=${h.value}px`).join('、')}`);
  if (m.a5.focusVisibleBlocks > TH.A5_focusVisibleBlocks) f.push(`A5 :focus-visible 声明块 ${m.a5.focusVisibleBlocks} 处 > ${TH.A5_focusVisibleBlocks} 处`);
  if (m.a6.lumDiff < TH.A6_minLumDiff) f.push(`A6 P1/P2 亮度差 ${m.a6.lumDiff.toFixed(3)} < ${TH.A6_minLumDiff}`);
  if (m.a6.hueDiff < TH.A6_minHueDiff) f.push(`A6 品牌/危险色相差 ${m.a6.hueDiff.toFixed(1)}° < ${TH.A6_minHueDiff}°`);
  for (const [k, v] of Object.entries(m.a6.blockContrast)) if (v < TH.A6_minContrast) f.push(`A6 ${k} 实心块压白字对比度 ${v.toFixed(2)} < ${TH.A6_minContrast}`);
  if (m.a7.mutedContrast < TH.A7_minContrast) f.push(`A7 --muted 对白底对比度 ${m.a7.mutedContrast.toFixed(2)} < ${TH.A7_minContrast}`);
  const badNum = Object.entries(m.a8.numberFontFamily).filter(([, v]) => v !== 'mono');
  if (badNum.length) f.push(`A8 关键数字未用等宽：${badNum.map(([k, v]) => `${k}(${v})`).join('、')}`);
  if (m.a12.bytes > TH.A12_maxBytes) f.push(`A12 体积 ${m.a12.bytes} B > ${TH.A12_maxBytes} B`);
  if (m.a13.serifRefs > TH.A13_maxSerifRefs) f.push(`A13 衬线引用 ${m.a13.serifRefs} 处 > ${TH.A13_maxSerifRefs}`);
  if (m.a13.fontFace > TH.A13_maxFontFace) f.push(`A13 @font-face ${m.a13.fontFace} 块 > ${TH.A13_maxFontFace}`);
  return { ok: f.length === 0, fails: f };
}

// ——— 测量（纯文本）————
export function measure(css, bytes) {
  const t = parseTokens(css);
  const val = (n, d) => (t[n] ? t[n].trim() : d);
  const warn = val('--warn', '#a8620e'), caution = val('--caution', '#65500a');
  const brand = val('--brand-solid', val('--brand', '#0f6cbd')), danger = val('--danger', '#c50f1f');
  const muted = val('--muted', '#616161'), card = val('--card', '#ffffff');
  const blocks = { danger: contrast(danger, '#ffffff'), warn: contrast(warn, '#ffffff'), caution: contrast(caution, '#ffffff'), pass: contrast(val('--pass', '#0e700e'), '#ffffff') };
  return {
    a2: { fontSizes: scanFontSizes(css) },
    a3: { radii: scanRadii(css) },
    a4: { hoverTranslate: scanHoverTranslate(css) },
    a5: { focusVisibleBlocks: countFocusVisibleBlocks(css) },
    a6: { lumDiff: Math.abs(relLuminance(hexToRgb(warn)) - relLuminance(hexToRgb(caution))), hueDiff: hueDiff(brand, danger), blockContrast: blocks },
    a7: { mutedContrast: contrast(muted, card) },
    a8: { numberFontFamily: numberFontFamilies(css) },
    a12: { bytes },
    a13: { serifRefs: countSerifRefs(css), fontFace: countFontFace(css) },
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const htmlPath = join(PROTO, 'gatekeeper.html');
  const html = readFileSync(htmlPath, 'utf8');
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const m = measure(css, Buffer.byteLength(html));
  const verdict = judge(m);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ m, verdict }, null, 1));
  else {
    console.log('===== M19 A 系列声明级判据 lint-ui =====');
    console.log(`A2 字号集合 ${m.a2.fontSizes.join('/')}px`);
    console.log(`A3 圆角 ${m.a3.radii.length} 处 · 越档 ${m.a3.radii.filter((r) => !TH.A3_radii.includes(r.value) && !(r.value === TH.A3_radiusExemptValue && TH.A3_radiusExemptSelectors.some((s) => r.sel.includes(s)))).length} 处 · 白名单豁免 ${m.a3.radii.filter((r) => !TH.A3_radii.includes(r.value)).length} 处`);
    console.log(`A4 hover 位移 ${[...new Set(m.a4.hoverTranslate.map((h) => h.value))].join('/')}px`);
    console.log(`A5 :focus-visible 声明块 ${m.a5.focusVisibleBlocks} 处（≤${TH.A5_focusVisibleBlocks}）`);
    console.log(`A6 P1/P2 亮度差 ${m.a6.lumDiff.toFixed(3)}（≥${TH.A6_minLumDiff}）· 品牌/危险色相差 ${m.a6.hueDiff.toFixed(1)}°（≥${TH.A6_minHueDiff}）`);
    console.log(`A6 四级实心块压白字 ${Object.entries(m.a6.blockContrast).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' / ')}`);
    console.log(`A7 --muted 对白底 ${m.a7.mutedContrast.toFixed(2)}:1（≥${TH.A7_minContrast}）`);
    console.log(`A8 关键数字等宽 ${Object.values(m.a8.numberFontFamily).filter((v) => v === 'mono').length}/${TH.A8_numberSelectors.length}`);
    console.log(`A12 体积 ${m.a12.bytes} B（≤${TH.A12_maxBytes}）`);
    console.log(`A13 衬线引用 ${m.a13.serifRefs} · @font-face ${m.a13.fontFace}`);
    console.log(`（A1 间距刻度由 tools/lint-layout.mjs 的 AL7 承担，本脚本不重复判定）`);
    console.log(verdict.ok ? '✅ A 系列判据全过' : `❌ ${verdict.fails.length} 项 FAIL`);
    for (const x of verdict.fails) console.log(`  ✗ ${x}`);
  }
  process.exit(verdict.ok ? 0 : 1);
}
