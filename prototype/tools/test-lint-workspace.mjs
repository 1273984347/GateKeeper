#!/usr/bin/env node
/**
 * test-lint-workspace.mjs — lint-workspace 纯函数自测（M17-T 前批 负样本自证）：正反例覆盖树解析/垃圾识别，任一失败 exit 1
 * 用法：node tools/test-lint-workspace.mjs
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parseStructureTree, findJunk, GITIGNORE_PROBES, TRACKED_FORBIDDEN, findTrackedForbidden } from './lint-workspace.mjs';

let pass = 0, failCount = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log(`✓ ${name}`); }
  catch (e) { failCount++; console.log(`✗ ${name}\n   ${e.message.split('\n')[0]}`); }
};

// ---- parseStructureTree：树解析（裸根标签 + 栈式深度 + 围栏复位） ----
t('两级树：裸根标签同名仓库根→前缀记空', () => {
  const tree = '```\nGateKeeper/\n├── README.md            项目门面\n└── prototype/           可运行原型\n```\n';
  const r = parseStructureTree(tree, () => true, 'GateKeeper');
  assert.deepEqual(r.declared.sort(), ['README.md', 'prototype']);
});
t('三级树：裸根 prototype/ 入路径前缀', () => {
  const tree = '```\nprototype/\n├── gates.mjs            引擎\n├── tools/               开发工具\n│   ├── gate.mjs         门卫\n│   └── RELEASE-CHECKLIST.md  检查表\n```\n';
  const r = parseStructureTree(tree, () => true, 'GateKeeper');
  assert.ok(r.declared.includes('prototype/gates.mjs'), JSON.stringify(r.declared));
  assert.ok(r.declared.includes('prototype/tools/gate.mjs'));
  assert.ok(r.declared.includes('prototype/tools/RELEASE-CHECKLIST.md'));
});
t('目录条目入 declared（存在性按目录判）', () => {
  const r = parseStructureTree('```\n├── docs/                过程治理文档\n```\n', (p) => p.replace(/\\/g, '/').endsWith('/docs'));
  assert.deepEqual(r.declared, ['docs']);
  assert.equal(r.missing.length, 0);
});
t('括号注记行（└── （根目录散文件…））跳过', () => {
  const r = parseStructureTree('```\n└── （根目录散文件：临时脚本用后即清）\n```\n', () => true);
  assert.equal(r.declared.length, 0);
});
t('围栏复位：前后两个代码块互不串栈', () => {
  const tree = '```\n├── a.md\n```\n正文段落\n```\n├── prototype/\n│   └── b.md\n```\n';
  const r = parseStructureTree(tree, () => true);
  assert.ok(!r.declared.includes('a.md/b.md'), JSON.stringify(r.declared));
  assert.ok(r.declared.includes('a.md') && r.declared.includes('prototype/b.md'));
});
t('missing：声明的文件不存在 → missing 列表', () => {
  const tree = '```\n├── exists.md\n├── gone.md\n```\n';
  const r = parseStructureTree(tree, (p) => p.replace(/\\/g, '/').endsWith('/exists.md'));
  assert.deepEqual(r.missing, ['gone.md']);
});
t('豁免标记行跳过（区间记法等非字面路径）', () => {
  const tree = '```\nprototype/\n├── real.md\n└── accept-A..E.md   区间记法 <!--lint-workspace:exempt 区间记法非字面路径-->\n```\n';
  const r = parseStructureTree(tree, (p) => p.replace(/\\/g, '/').endsWith('/real.md'));
  assert.deepEqual(r.missing, []);
});

// ---- findJunk：垃圾模式 正 8 / 反 2 ----
t('nul（任意目录）识别', () => { assert.deepEqual(findJunk(['nul', 'sub/nul']).map((x) => x.pattern), ['nul', 'nul']); });
t('pyc/pyo/__pycache__ 识别', () => {
  assert.equal(findJunk(['a.pyc', 'b.pyo', '__pycache__/c.pyc']).length, 3);
});
t('log/bak/临时系统文件识别', () => {
  assert.equal(findJunk(['debug.log', 'x.bak', '.DS_Store', 'Thumbs.db', 'desktop.ini', 'y.tmp']).length, 6);
});
t('反例：正常新文件不报', () => {
  assert.equal(findJunk(['prototype/tools/new-tool.mjs', 'docs/新文档.md']).length, 0);
});
t('反例：文件名含 log 子串但非 .log 后缀不报（如 catalog.md）', () => {
  assert.equal(findJunk(['catalog.md']).length, 0);
});

// ---- GITIGNORE_PROBES：清单冻结 ----
t('探针清单 ≥8 类且含 nul/pyc/log', () => {
  assert.ok(GITIGNORE_PROBES.includes('nul') && GITIGNORE_PROBES.some((p) => p.endsWith('.pyc')) && GITIGNORE_PROBES.some((p) => p.endsWith('.log')));
  assert.ok(GITIGNORE_PROBES.length >= 8);
});

// ---- findTrackedForbidden：防回流探针（v0.21.4） ----
t('防回流：output/screenshots 目录规则按前缀命中', () => {
  const hits = findTrackedForbidden(['prototype/output/gate-report.json', 'prototype/screenshots/ui-1280.png']);
  assert.deepEqual(hits.map((h) => h.rule), ['prototype/output/', 'prototype/screenshots/']);
});
t('防回流：内部协作文档文件规则全等命中（含中文名）', () => {
  const hits = findTrackedForbidden(['交接文档.md', 'CLAUDE.md', 'AGENTS.md', '新Agent启动Prompt.md', 'prototype/人工冷跑开跑清单.md', 'UI升级方案.md', 'Web端可扩展改造方案.md']);
  assert.equal(hits.length, 7);
});
t('防回流：.agents/.zcode/docs/档案 目录前缀命中', () => {
  assert.equal(findTrackedForbidden(['.agents/skills/gk-release/SKILL.md', '.zcode/workflows/x.dwf.ts', 'docs/档案/批次编号对齐表.md']).length, 3);
});
t('防回流反例：公开面文件不命中', () => {
  assert.equal(findTrackedForbidden(['README.md', 'prototype/gates.mjs', 'docs/方法论/E1铁律.md', 'STRUCTURE.md']).length, 0);
});
t('防回流反例：同名前缀但不相等不命中（如 CLAUDE.md.bak）', () => {
  assert.equal(findTrackedForbidden(['CLAUDE.md.bak', 'docs/档案备份/x.md'.replace('档案备份', 'arch')]).length, 0);
});
t('防回流：glob 规则段内通配命中（复盘报告 -*.md）', () => {
  const hits = findTrackedForbidden(['docs/工作复盘与优化分析报告-2026-10.md', 'docs/工作复盘与优化分析报告-2026-11-01.md']);
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => h.rule === 'docs/工作复盘与优化分析报告-*.md'));
});
t('防回流 glob 反例：跨段 * 不越界（子目录/改后缀不命中）', () => {
  assert.equal(findTrackedForbidden(['docs/工作复盘与优化分析报告-2026-10.md.bak']).length, 0);
  assert.equal(findTrackedForbidden(['docs/方法论/工作复盘与优化分析报告-x.md']).length, 0);
});
t('防回流清单 ≥8 条且含 output/screenshots/CLAUDE.md', () => {
  assert.ok(TRACKED_FORBIDDEN.includes('prototype/output/') && TRACKED_FORBIDDEN.includes('prototype/screenshots/') && TRACKED_FORBIDDEN.includes('CLAUDE.md'));
  assert.ok(TRACKED_FORBIDDEN.length >= 8);
});

// ---- .gitignore 同步守卫：内部面两节的每条 pattern 都必须被防回流清单覆盖（漂移即红，v0.21.5） ----
t('.gitignore 内部面两节 ↔ TRACKED_FORBIDDEN 无漂移', () => {
  const gi = readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
  const sections = [];
  let cur = null;
  for (const l of gi.split('\n')) {
    if (l.includes('# ---- ') && (l.includes('运行产物与测试截图') || l.includes('内部协作文档'))) { cur = []; sections.push(cur); continue; }
    if (cur !== null) {
      if (l.startsWith('# ---- ') || (l.trim() === '' && cur.length)) { cur = null; continue; }
      const pat = l.trim();
      if (pat && !pat.startsWith('#')) cur.push(pat);
    }
  }
  assert.ok(sections.length === 2, `.gitignore 应有「运行产物与测试截图」「内部协作文档」两节，实见 ${sections.length} 节`);
  const patterns = sections.flat();
  assert.ok(patterns.length >= 10, `两节 pattern 数应 ≥10，实见 ${patterns.length}`);
  const misses = [];
  for (const pat of patterns) {
    const rep = pat.replace(/^\//, '').replace(/\*[^/]*$/g, 'X.md').replace(/\/$/, '/x');
    if (!findTrackedForbidden([rep]).length) misses.push(`${pat}（代表路径 ${rep}）`);
  }
  assert.deepEqual(misses, [], `.gitignore 内部面 pattern 未被 TRACKED_FORBIDDEN 覆盖：${misses.join('；')}`);
});

console.log(`\n===== test-lint-workspace：${pass} 过 / ${failCount} 败 =====`);
process.exit(failCount === 0 ? 0 : 1);
