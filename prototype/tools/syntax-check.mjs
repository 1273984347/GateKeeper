// syntax-check.mjs — 全部 .mjs 语法检查（node --check）
// 缘起：real-batch-audit.mjs 曾因正则内真实换行字节整文件无法解析，而五道门禁/CI 均不加载它，绿灯掩盖损坏（重扫 F03）。
// 本检查不加载执行，仅解析，专防此类"未被任何门禁 import 的脚本"静默损坏。
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
for (const f of readdirSync(PROTO)) if (f.endsWith('.mjs')) files.push(join(PROTO, f));
for (const f of readdirSync(join(PROTO, 'tools'))) if (f.endsWith('.mjs')) files.push(join(PROTO, 'tools', f));
for (const f of readdirSync(join(PROTO, 'configs'))) if (f.endsWith('.mjs')) files.push(join(PROTO, 'configs', f));

let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    bad++;
    console.error(`✗ ${f}\n  ${(r.stderr || '').trim().split('\n').slice(0, 4).join('\n  ')}`);
  }
}
console.log(bad === 0 ? `✓ 语法检查通过（${files.length} 个 .mjs）` : `✗ ${bad}/${files.length} 个文件语法损坏`);
process.exit(bad === 0 ? 0 : 1);
