#!/usr/bin/env node
/**
 * test-release.mjs — release.mjs 纯函数自测（A-02 负样本自证，测试先行）：≥12 例，任一失败 exit 1
 * 用法：node tools/test-release.mjs
 */
import { strict as assert } from 'node:assert';
import { parseVersion, updateRegistry, updateDocVersionLine, checkConsistency, extractChangelogTop } from './release.mjs';

let pass = 0, failCount = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log(`✓ ${name}`); }
  catch (e) { failCount++; console.log(`✗ ${name}\n   ${e.message.split('\n')[0]}`); }
};

// ---- parseVersion：正 3 / 反 4 ----
t('v 前缀归一：v0.20.0 → docs=v0.20.0 / reg=0.20.0', () => {
  const r = parseVersion('v0.20.0');
  assert.deepEqual(r, { docs: 'v0.20.0', reg: '0.20.0' });
});
t('无前缀归一：0.20.0 同上', () => {
  assert.deepEqual(parseVersion('0.20.0'), { docs: 'v0.20.0', reg: '0.20.0' });
});
t('多位数段：v0.100.2 合法', () => {
  assert.deepEqual(parseVersion('v0.100.2'), { docs: 'v0.100.2', reg: '0.100.2' });
});
t('反例：v0.20（两段）→ null', () => { assert.equal(parseVersion('v0.20'), null); });
t('反例：v0.20.0.1（四段）→ null', () => { assert.equal(parseVersion('v0.20.0.1'), null); });
t('反例：字母 → null', () => { assert.equal(parseVersion('abc'), null); });
t('反例：空串 → null', () => { assert.equal(parseVersion(''), null); });

// ---- updateRegistry：正 2 / 反 2 ----
const REG = (cur, prev) => `{\n  "registry": {\n    "currentVersion": "${cur}",\n    "versions": [\n      "${cur}",\n      "${prev}"\n    ]\n  }\n}`;
t('registry 替换：current 与 versions 首位同步升级', () => {
  const out = updateRegistry(REG('0.19.1', '0.19.0'), '0.19.2');
  assert.ok(out.includes('"currentVersion": "0.19.2"'));
  assert.ok(out.includes('"versions": [\n      "0.19.2",\n      "0.19.1"'));
});
t('registry 替换：结果精确全等（新增条目+其余逐字不变）', () => {
  const src = REG('0.19.1', '0.19.0');
  const out = updateRegistry(src, '0.19.2');
  const expected = '{\n  "registry": {\n    "currentVersion": "0.19.2",\n    "versions": [\n      "0.19.2",\n      "0.19.1",\n      "0.19.0"\n    ]\n  }\n}';
  assert.equal(out, expected);
});
t('反例：锚点缺失（无 versions 数组）→ null（fail-closed）', () => {
  assert.equal(updateRegistry('{"registry":{"currentVersion":"0.19.1"}}', '0.19.2'), null);
});
t('反例：目标版本已是 current → null（防重复收官）', () => {
  assert.equal(updateRegistry(REG('0.19.2', '0.19.1'), '0.19.2'), null);
});

// ---- updateDocVersionLine：正 2 / 反 1 ----
t('README 版本行替换', () => {
  const out = updateDocVersionLine('> **当前版本**：v0.19.1\n', 'README', 'v0.19.2');
  assert.equal(out, '> **当前版本**：v0.19.2\n');
});
t('交接文档版本行替换', () => {
  const out = updateDocVersionLine('- **版本**：v0.19.1（里程碑…）\n', '交接', 'v0.19.2');
  assert.ok(out.startsWith('- **版本**：v0.19.2（'));
});
t('反例：句式不匹配 → null（fail-closed，防静默漏改）', () => {
  assert.equal(updateDocVersionLine('版本 v0.19.1', 'README', 'v0.19.2'), null);
});

// ---- extractChangelogTop + checkConsistency：正 2 / 反 2 ----
const CL = '---\n\n### v0.19.2（2026-10-05）：标题\n\n### v0.19.1：旧\n';
t('CHANGELOG 顶部版本段提取', () => {
  assert.equal(extractChangelogTop(CL), 'v0.19.2');
});
t('反例：无版本段标题 → null', () => { assert.equal(extractChangelogTop('## [Unreleased]\n- x'), null); });
t('一致性：四处全等 → {ok:true}', () => {
  const r = checkConsistency({ registry: '0.19.2', readme: 'v0.19.2', handover: 'v0.19.2', changelog: 'v0.19.2' });
  assert.deepEqual(r, { ok: true, mismatches: [] });
});
t('一致性：任一不等 → ok:false 且逐项点名', () => {
  const r = checkConsistency({ registry: '0.19.1', readme: 'v0.19.2', handover: 'v0.19.2', changelog: 'v0.19.1' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.mismatches, ['registry=0.19.1', 'changelog=v0.19.1']);
});

console.log(`\n===== test-release：${pass} 过 / ${failCount} 败 =====`);
process.exit(failCount === 0 ? 0 : 1);
