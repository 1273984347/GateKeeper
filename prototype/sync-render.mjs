// sync-render.mjs — 把 render-core.mjs 注入 gatekeeper.html 的渲染纯函数区（M13 可测化：单一事实源第三链）
// 用法：
//   node sync-render.mjs            # 从 render-core.mjs 重新生成 HTML 注入块
//   node sync-render.mjs --check    # 只校验：注入块是否与 render-core.mjs 一致，漂移则 exit 1（门禁）
// 设计：与 sync-gates/sync-configs 同构——函数式 replace（防 $& 展开）、</ 逃逸（防 </script> 闭合）、缺标记 fail-closed。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const SRC = join(dir, 'render-core.mjs');
const HTML = join(dir, 'gatekeeper.html');
const CHECK = process.argv.includes('--check');

const START = '/* ==== RENDER-SRC-START ==== 由 sync-render.mjs 从 render-core.mjs 生成，勿手改（改函数请改 render-core.mjs 后跑 node sync-render.mjs）==== */';
const END = '/* ==== RENDER-SRC-END ==== */';

function buildBlock() {
  // 注入 <script> 上下文：剥离 import/export（浏览器侧依赖引擎块的 BANNED 全局），</ 转义防标签闭合
  const src = readFileSync(SRC, 'utf8')
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export /gm, '')
    .replace(/<\//g, '<\\/');
  return `${START}\n${src.trim()}\n${END}`;
}

let html = readFileSync(HTML, 'utf8');
const block = buildBlock();

if (html.includes(START)) {
  const re = new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`);
  const cur = html.match(re);
  if (!cur) { console.error('✗ gatekeeper.html 渲染块标记闭合缺失，终止'); process.exit(2); }
  if (CHECK) {
    if (cur[0] !== block) { console.error('✗ 漂移：gatekeeper.html 渲染块与 render-core.mjs 不一致。跑 `node sync-render.mjs` 修复。'); process.exit(1); }
    console.log('✓ 一致：gatekeeper.html 渲染块 == render-core.mjs'); process.exit(0);
  }
  // 替换串必须走函数形式：block 内容可能含 $& 等特殊模式字符（同 sync-gates 教训）
  html = html.replace(re, () => block);
  writeFileSync(HTML, html, 'utf8');
  console.log('✓ 已从 render-core.mjs 重新注入 HTML 渲染块');
} else {
  const msg = '✗ gatekeeper.html 缺少 RENDER-SRC 标记块（可能被误删），渲染纯函数漂移门禁无法校验。';
  if (CHECK) { console.error(msg + ' 先恢复标记或跑 `node sync-render.mjs` 重新注入。'); process.exit(1); }
  console.error(msg + '（当前为注入模式，未发现标记，已终止）');
  process.exit(2);
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
