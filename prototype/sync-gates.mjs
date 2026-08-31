// sync-gates.mjs — 把 gates.mjs 注入 gatekeeper.html 的引擎区，保证「单一事实源」
// 用法：
//   node sync-gates.mjs            # 从 gates.mjs 重新生成 HTML 引擎块（首次会自动完成一次性重构）
//   node sync-gates.mjs --check    # 只校验：HTML 引擎块是否与 gates.mjs 一致，漂移则 exit 1（门禁）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const GATES = join(dir, 'gates.mjs');
const HTML = join(dir, 'gatekeeper.html');
const CHECK = process.argv.includes('--check');

const START = '/* ==== GATES-SRC-START ==== 由 sync-gates.mjs 从 gates.mjs 生成，勿手改（改规则请改 gates.mjs 后跑 node sync-gates.mjs）==== */';
const END = '/* ==== GATES-SRC-END ==== */';

// 由 gates.mjs 生成注入块：去掉 export 前缀（浏览器经典脚本用全局），首行注释保留无害
function buildBlock() {
  const src = readFileSync(GATES, 'utf8').replace(/^export /gm, '');
  return `${START}\n${src.trim()}\n${END}`;
}

let html = readFileSync(HTML, 'utf8');
const block = buildBlock();
const hasMarkers = html.includes(START);

if (hasMarkers) {
  const re = new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`);
  const cur = html.match(re)[0];
  if (CHECK) {
    if (cur !== block) { console.error('✗ 漂移：gatekeeper.html 引擎块与 gates.mjs 不一致。跑 `node sync-gates.mjs` 修复。'); process.exit(1); }
    console.log('✓ 一致：gatekeeper.html 引擎块 == gates.mjs'); process.exit(0);
  }
  html = html.replace(re, block);
  writeFileSync(HTML, html, 'utf8');
  console.log('✓ 已从 gates.mjs 重新注入 HTML 引擎块');
} else {
  // 一次性重构：把手写引擎区替换为「标记块 + 保留的 DOCS + esc」
  if (CHECK) { console.error('✗ 尚未注入标记，先跑 `node sync-gates.mjs`'); process.exit(1); }
  const legacyStart = html.indexOf('/* ============ 配置与知识库');
  const legacyEnd = html.indexOf('/* ============ 高亮原文命中的违禁词');
  if (legacyStart < 0 || legacyEnd < 0) { console.error('✗ 找不到旧引擎区边界，终止'); process.exit(2); }
  const legacy = html.slice(legacyStart, legacyEnd);
  const docs = legacy.match(/const DOCS = \[[\s\S]*?\n\];/)[0];
  const escFn = "function esc(s){return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}";
  const replacement = `${block}\n\n/* ===== 样例产出物（脱敏模拟数据，HTML 演示专用）===== */\n${docs}\n\n/* ===== 前端展示层：DOM 转义 ===== */\n${escFn}\n\n`;
  html = html.slice(0, legacyStart) + replacement + html.slice(legacyEnd);
  writeFileSync(HTML, html, 'utf8');
  console.log('✓ 一次性重构完成：引擎区已改为标记块（源=gates.mjs），DOCS/esc 保留');
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
