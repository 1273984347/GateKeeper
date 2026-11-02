#!/usr/bin/env node
/**
 * test-docsync.mjs — doc-sync 纯函数自测（M15-T1 负样本自证）：正反例各 ≥3，任一失败 exit 1
 * 用法：node tools/test-docsync.mjs
 */
import { strict as assert } from 'node:assert';
import {
  parseCoreDocsSource, parseGateCount, parseTapTests,
  findStaleGateTerms, findGateCountClaims, findTestCountClaims, extractCurrentVersion,
} from './doc-sync.mjs';

let pass = 0, failCount = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log(`✓ ${name}`); }
  catch (e) { failCount++; console.log(`✗ ${name}\n   ${e.message.split('\n')[0]}`); }
};

// ---- parseCoreDocsSource：正 3 / 反 2 ----
t('CORE_DOCS 解析：正常清单', () => {
  assert.deepEqual(parseCoreDocsSource("const CORE_DOCS = [\n  'README.md', 'DESIGN.md',\n  'CLAUDE.md',\n];"), ['README.md', 'DESIGN.md', 'CLAUDE.md']);
});
t('CORE_DOCS 解析：单元素', () => {
  assert.deepEqual(parseCoreDocsSource("const CORE_DOCS = ['README.md'];"), ['README.md']);
});
t('CORE_DOCS 解析：含注释行', () => {
  assert.deepEqual(parseCoreDocsSource("const CORE_DOCS = [ // 权威清单\n  'README.md', // 门面\n  'ROADMAP.md',\n];"), ['README.md', 'ROADMAP.md']);
});
t('CORE_DOCS 解析：数组缺失 → null（fail-closed）', () => {
  assert.equal(parseCoreDocsSource('const FOO = 1;'), null);
});
t('CORE_DOCS 解析：空数组 → null（fail-closed）', () => {
  assert.equal(parseCoreDocsSource('const CORE_DOCS = [];'), null);
});

// ---- parseGateCount：正 3 / 反 2 ----
const gateTpl = (n) => `const gates = [\n${Array.from({ length: n }, (_, i) => `  { name: '门${i}', cmd: ['node', 'x.mjs'] },`).join('\n')}\n  ...(FULL ? [\n    { name: 'bench', cmd: [] },\n  ] : []),\n];`;
t('门数解析：7 门（FULL 追加不计入）', () => { assert.equal(parseGateCount(gateTpl(7)), 7); });
t('门数解析：1 门', () => { assert.equal(parseGateCount(gateTpl(1)), 1); });
t('门数解析：无 FULL 尾巴（到数组收尾）', () => {
  assert.equal(parseGateCount("const gates = [\n  { name: 'a', cmd: [] },\n  { name: 'b', cmd: [] },\n];"), 2);
});
t('门数解析：数组缺失 → null', () => { assert.equal(parseGateCount('const x = 1;'), null); });
t('门数解析：空数组 → null', () => { assert.equal(parseGateCount('const gates = [];\n...(FULL'), null); });

// ---- parseTapTests：正 3 / 反 2 ----
t('tap 解析：# tests 29', () => { assert.equal(parseTapTests('# tests 29\n# pass 29\n# fail 0'), 29); });
t('tap 解析：多行输出中命中', () => { assert.equal(parseTapTests('ok 1 - a\n# tests 13\n# pass 13'), 13); });
t('spec 解析：ℹ tests 9', () => { assert.equal(parseTapTests('ℹ tests 9\nℹ pass 9'), 9); });
t('tap 解析：无 tests 行 → null', () => { assert.equal(parseTapTests('ok 1 - a'), null); });
t('tap 解析：空输出 → null', () => { assert.equal(parseTapTests(''), null); });

// ---- findStaleGateTerms：正 3 / 反 3 ----
t('陈旧词：五门禁 命中', () => {
  assert.deepEqual(findStaleGateTerms('改后必跑五门禁').map((x) => x.term), ['五门禁']);
});
t('陈旧词：五道门禁 命中', () => {
  assert.deepEqual(findStaleGateTerms('| 1 | 五道门禁全绿 |').map((x) => x.term), ['五道门禁']);
});
t('陈旧词：行号正确（第 3 行）', () => {
  assert.deepEqual(findStaleGateTerms('a\nb\n已入五门禁）')[0].line, 3);
});
t('反例：六道门禁（引擎口径）不报', () => { assert.equal(findStaleGateTerms('六道门禁（G1 引用溯源）').length, 0); });
t('反例：七门禁/八门禁 不报', () => { assert.equal(findStaleGateTerms('七门禁全绿\n八门禁串行').length, 0); });
t('反例：门禁串行/全量门禁 不报', () => { assert.equal(findStaleGateTerms('全量门禁一键门卫\n已入门禁串行').length, 0); });
t('反例：doc-sync:exempt 豁免行不报（历史叙述不改写）', () => {
  assert.equal(findStaleGateTerms('正常行\n历史行提及五门禁<!--doc-sync:exempt 历史时点事实-->').length, 0);
});

// ---- findGateCountClaims：正 2 / 反 2 ----
t('门数句：8 门全绿 → 8', () => { assert.deepEqual(findGateCountClaims('✅ 八门之中 8 门全绿'), [{ line: 1, n: 8 }]); });
t('门数句：7 门全绿 → 7', () => { assert.deepEqual(findGateCountClaims('七门禁全绿 7 门全绿'), [{ line: 1, n: 7 }]); });
t('反例：六道门禁（引擎）不报', () => { assert.equal(findGateCountClaims('六道门禁明细').length, 0); });
t('反例：无门数句', () => { assert.equal(findGateCountClaims('全绿通过').length, 0); });
t('反例：doc-sync:exempt 豁免行不报（v0.21.5 与陈旧词口径对齐）', () => {
  assert.deepEqual(
    findGateCountClaims('8 门全绿\n历史叙述：7 门全绿<!--doc-sync:exempt 历史时点事实-->'),
    [{ line: 1, n: 8 }]
  );
});

// ---- findTestCountClaims：正 2 / 反 2 ----
t('单测句：测试 29 例', () => { assert.deepEqual(findTestCountClaims('单测共测试 29 例'), [{ line: 1, n: 29 }]); });
t('单测句：测试 13 例（第 2 行）', () => { assert.deepEqual(findTestCountClaims('x\n回归测试 13 例')[0], { line: 2, n: 13 }); });
t('反例：单测（9 例 无「测试」前缀不报', () => { assert.equal(findTestCountClaims('渲染纯函数单测（9 例；同栈）').length, 0); });
t('反例：node:test 17 例 历史叙述不报', () => { assert.equal(findTestCountClaims('node:test 17 例单元/负样本').length, 0); });
t('反例：doc-sync:exempt 豁免行不报（v0.21.5 与陈旧词口径对齐）', () => {
  assert.deepEqual(
    findTestCountClaims('测试 18 例\n历史叙述：测试 15 例<!--doc-sync:exempt 历史时点事实-->'),
    [{ line: 1, n: 18 }]
  );
});

// ---- extractCurrentVersion：正 3 / 反 3 ----
t('README 当前版本句', () => { assert.equal(extractCurrentVersion('> **当前版本**：v0.17.2', 'readme'), 'v0.17.2'); });
t('交接文档 版本句', () => { assert.equal(extractCurrentVersion('## 一\n- **版本**：v0.17.2（里程碑…）', 'handover'), 'v0.17.2'); });
t('CHANGELOG 最新段标题（取首个）', () => {
  assert.equal(extractCurrentVersion('### v0.17.2（2026-10-04）：A\n\n### v0.17.1：B', 'changelog'), 'v0.17.2');
});
t('反例：README 句式缺失 → null', () => { assert.equal(extractCurrentVersion('版本：v0.17.2', 'readme'), null); });
t('反例：历史版本行不认（交接文档句式锚定行首）', () => {
  assert.equal(extractCurrentVersion('正文提及 v0.15.6 旧版本。', 'handover'), null);
});
t('反例：CHANGELOG 首段非版本标题', () => { assert.equal(extractCurrentVersion('## [Unreleased]\n- x', 'changelog'), null); });

console.log(`\n===== test-docsync：${pass} 过 / ${failCount} 败 =====`);
process.exit(failCount === 0 ? 0 : 1);
