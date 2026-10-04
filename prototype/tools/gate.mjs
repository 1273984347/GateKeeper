// gate.mjs — SK-01 门禁一键门卫：串行跑全链门禁，任一红即 exit 1（复盘报告 §7 A-01）
// 用法：node tools/gate.mjs [--full]    （--full 追加 bench 与 dws-bridge dry-run）
// 全量门禁 = 漂移三检（sync-gates/sync-configs/sync-render --check）+ verify 回归红线 + 引擎单测
//          + 语法检查 + check-docs 文档体检 + doc-sync 文档口径体检（项数以源内 gates 数组为准）
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const FULL = process.argv.includes('--full');

const gates = [
  { name: '漂移门禁 · 引擎块 == gates.mjs', cmd: ['node', 'sync-gates.mjs', '--check'] },
  { name: '漂移门禁 · 注入块 == configs/', cmd: ['node', 'sync-configs.mjs', '--check'] },
  { name: '漂移门禁 · 渲染块 == render-core.mjs', cmd: ['node', 'sync-render.mjs', '--check'] },
  { name: '回归红线 verify（13 项）', cmd: ['node', 'verify.mjs'] },
  { name: '引擎单测 node --test（引擎+渲染）', cmd: ['node', '--test', 'gates.test.mjs', 'render-core.test.mjs'] },
  { name: '语法检查 node --check 全部 .mjs', cmd: ['node', 'tools/syntax-check.mjs'] },
  { name: '核心文档体检 check-docs', cmd: ['node', 'check-docs.mjs'] },
  { name: '文档口径体检 doc-sync', cmd: ['node', 'tools/doc-sync.mjs'] },
  ...(FULL ? [
    { name: '省时实测 bench', cmd: ['node', 'bench.mjs'] },
    { name: 'DWS 编排 dry-run', cmd: ['node', 'dws-bridge.mjs'] },
  ] : []),
];

const results = [];
let failed = 0;
for (const g of gates) {
  const t0 = process.hrtime.bigint();
  const r = spawnSync(g.cmd[0], g.cmd.slice(1), { cwd: PROTO, encoding: 'utf8', shell: process.platform === 'win32' });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const ok = r.status === 0;
  if (!ok) failed++;
  results.push({ name: g.name, ok, ms, stderr: (r.stderr || '').trim(), stdoutTail: (r.stdout || '').trim().split('\n').slice(-3).join('\n') });
}

const width = Math.max(...results.map((r) => r.name.length));
console.log('\n===== GateKeeper 门禁总览 =====');
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)}  ${r.ms.toFixed(0).padStart(5)} ms`);
  if (!r.ok) {
    console.log('  └─ 失败输出（尾 20 行）:');
    for (const l of (r.stderr || r.stdoutTail).split('\n').slice(-20)) console.log('     ' + l);
  }
}
const total = results.reduce((s, r) => s + r.ms, 0);
console.log(`===== ${failed === 0 ? '✅ 全绿' : `❌ ${failed} 项失败`} · 合计 ${(total / 1000).toFixed(1)}s =====`);
process.exit(failed === 0 ? 0 : 1);
