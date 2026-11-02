// check-docs.mjs — 提交前一键门禁：用 gatekeeper-self 配置体检全部核心文档，任一非「可发布」即退出码 1
// 用法：node check-docs.mjs [--compare]     （默认 --strict；体检逻辑复用 project-check.mjs，单一事实源）
// 为什么单独存在：把「哪些文档算核心」这份清单固化成权威，避免每次手敲长命令、也防止新增文档漏检（防"11/11 全绿"变成过期声明）。
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(PROTO);

// 权威核心文档清单（新增/删除核心文档时改这里；与 STRUCTURE.md、CHANGELOG 口径对齐）
// v0.21.4 公开整备批：公开面=本仓跟踪面，内部协作文档（交接文档/CLAUDE/AGENTS/启动Prompt）已移出跟踪面
// （本地保留、gitignore 维护），故退出 CORE_DOCS——check-docs 权威口径只覆盖公开面文档。
const CORE_DOCS = [
  'README.md', 'DESIGN.md', 'ROADMAP.md',
  'STRUCTURE.md', '配置切换Demo.md',
];
const CONFIG = join('configs', 'gatekeeper-self.json');

const args = ['project-check.mjs', '--config', CONFIG, ...CORE_DOCS.map((d) => join(ROOT, d)), '--strict'];
if (process.argv.includes('--compare')) args.push('--compare');

try {
  execFileSync('node', args, { cwd: PROTO, stdio: 'inherit' });
  console.log('\n✅ check-docs：全部核心文档在 self-config 下均「可发布」，可提交。');
} catch (e) {
  console.error('\n❌ check-docs：有核心文档未达「可发布」，提交前须修复或更新对应 project-config（勿放宽硬门禁强刷）。');
  process.exit(e.status ?? 1);
}
