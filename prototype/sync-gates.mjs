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
  const cur = html.match(re);
  if (!cur) { console.error('✗ gatekeeper.html 引擎块标记闭合缺失，终止'); process.exit(2); }
  const cur0 = cur[0];
  if (CHECK) {
    if (cur0 !== block) { console.error('✗ 漂移：gatekeeper.html 引擎块与 gates.mjs 不一致。跑 `node sync-gates.mjs` 修复。'); process.exit(1); }
    console.log('✓ 一致：gatekeeper.html 引擎块 == gates.mjs'); process.exit(0);
  }
  // 替换串必须走函数形式：block 内容可能含 $&（如 escapeRe 的替换字面量），字符串形式的 replace 会把它当特殊模式展开
  html = html.replace(re, () => block);
  writeFileSync(HTML, html, 'utf8');
  console.log('✓ 已从 gates.mjs 重新注入 HTML 引擎块');
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
