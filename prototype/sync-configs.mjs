// sync-configs.mjs — 把 project-config + 批次数据注入 gatekeeper.html，保证前端「数据/配置外置」且离线单文件可跑
// 用法：
//   node sync-configs.mjs          # 从 configs/ 重新生成 HTML 的两个注入块（CONFIGS + DATA）
//   node sync-configs.mjs --check  # 只校验：HTML 注入块是否与 configs/ 一致，漂移则 exit 1（提交前门禁）
// 设计：与 sync-gates.mjs 同构。规则源=gates.mjs（引擎块），数据源=configs/*.json（本脚本注入块），前端渲染层消费二者。
//       前端不硬编码项目/批次：加一个演示项目 = 在 configs/batches.sample.json 增条目 + 本脚本重注入，不改 HTML。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(dir, 'configs');
const HTML = join(dir, 'gatekeeper.html');
const BATCH_FILE = 'batches.sample.json';
const CHECK = process.argv.includes('--check');

const C_START = '/* ==== GK-CONFIGS-SRC-START ==== 由 sync-configs.mjs 从 configs/*.json 生成，勿手改（改配置请改 json 后跑 node sync-configs.mjs）==== */';
const C_END = '/* ==== GK-CONFIGS-SRC-END ==== */';
const D_START = '/* ==== GK-DATA-SRC-START ==== 由 sync-configs.mjs 从 configs/batches.sample.json 生成，勿手改 ==== */';
const D_END = '/* ==== GK-DATA-SRC-END ==== */';

function buildConfigsBlock() {
  const configs = {};
  for (const f of readdirSync(CONFIG_DIR)) {
    if (!f.endsWith('.json') || f === BATCH_FILE) continue;
    const id = basename(f, '.json');
    configs[id] = JSON.parse(readFileSync(join(CONFIG_DIR, f), 'utf8'));
  }
  return `${C_START}\nconst GK_CONFIGS = ${JSON.stringify(configs)};\n${C_END}`;
}

function buildDataBlock() {
  const data = JSON.parse(readFileSync(join(CONFIG_DIR, BATCH_FILE), 'utf8'));
  return `${D_START}\nconst GK_DATA = ${JSON.stringify(data)};\n${D_END}`;
}

function replaceBlock(html, start, end, block, label) {
  if (!html.includes(start)) {
    if (CHECK) { console.error(`✗ 漂移：gatekeeper.html 缺少 ${label} 标记。先跑 \`node sync-configs.mjs\`。`); process.exit(1); }
    return { html, changed: 'insert-fail' };
  }
  const re = new RegExp(`${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}`);
  const m = html.match(re);
  if (!m) { if (CHECK) { console.error(`✗ ${label} 标记闭合缺失`); process.exit(1); } return { html, changed: 'broken' }; }
  if (CHECK) {
    if (m[0] !== block) { console.error(`✗ 漂移：${label} 与 configs/ 不一致。跑 \`node sync-configs.mjs\` 修复。`); process.exit(1); }
    return { html, checked: true };
  }
  // 替换串必须走函数形式：配置 _why/数据可能含 $& 等字符，字符串形式的 replace 会当特殊模式展开
  return { html: html.replace(re, () => block), changed: true };
}

let html = readFileSync(HTML, 'utf8');
let r1 = replaceBlock(html, C_START, C_END, buildConfigsBlock(), 'CONFIGS 注入块');
let r2 = replaceBlock(r1.html, D_START, D_END, buildDataBlock(), 'DATA 注入块');

if (CHECK) {
  if (r1.checked && r2.checked) { console.log('✓ 一致：gatekeeper.html 配置/数据注入块 == configs/'); process.exit(0); }
  process.exit(1);
}

if (r1.changed !== true || r2.changed !== true) {
  console.error('✗ 注入失败（标记缺失或闭合破损），已放弃写盘。请检查 gatekeeper.html 的 GK-CONFIGS-SRC / GK-DATA-SRC 标记区。');
  process.exit(1);
}
writeFileSync(HTML, r2.html, 'utf8');
const nProj = JSON.parse(readFileSync(join(CONFIG_DIR, BATCH_FILE), 'utf8')).projects.length;
const nCfg = Object.keys(readConfigs()).length;
console.log(`✓ 已注入：配置 ${nCfg} 套 · 项目 ${nProj} 个 → gatekeeper.html`);

function readConfigs() {
  const configs = {};
  for (const f of readdirSync(CONFIG_DIR)) {
    if (!f.endsWith('.json') || f === BATCH_FILE) continue;
    configs[basename(f, '.json')] = true;
  }
  return configs;
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
