#!/usr/bin/env node
/**
 * test-lint-links.mjs — lint-links 纯函数自测（M16-T1 负样本自证）：≥12 例正反例，任一失败 exit 1
 * 用法：node tools/test-lint-links.mjs
 */
import { strict as assert } from 'node:assert';
import { extractMdLinks, extractHtmlLinks, resolveTarget } from './lint-links.mjs';

let pass = 0, failCount = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log(`✓ ${name}`); }
  catch (e) { failCount++; console.log(`✗ ${name}\n   ${e.message.split('\n')[0]}`); }
};
// 假根按平台取绝对路径：'D:/repo' 在 POSIX 不是绝对路径，resolve 会落到 cwd 下致 escape 误判（CI 红，2026-11-03 修正）
const ROOT = process.platform === 'win32' ? 'D:/repo' : '/repo';
const existsYes = () => true, existsNo = () => false;

// ---- extractMdLinks：正 3 ----
t('md 链接提取（含行号）', () => {
  assert.deepEqual(extractMdLinks('x\n见 [交接](交接文档.md)'), [{ line: 2, target: '交接文档.md' }]);
});
t('md 图片 ![alt](p) 同样提取', () => {
  assert.deepEqual(extractMdLinks('![截图](prototype/screenshots/ui-1280.png)')[0].target, 'prototype/screenshots/ui-1280.png');
});
t('md 一行多链接全部提取', () => {
  assert.equal(extractMdLinks('[a](a.md) 与 [b](b.md)').length, 2);
});

// ---- extractHtmlLinks：正 2 / 反 1 ----
t('html href+src 提取', () => {
  const r = extractHtmlLinks('<a href="x.html">t</a><img src="p.png">');
  assert.deepEqual(r, [{ line: 1, target: 'x.html' }, { line: 1, target: 'p.png' }]);
});
t('html 单引号/无引号属性不报（v1 只认双引号）', () => {
  assert.equal(extractHtmlLinks("<a href='x.html'>").length, 0);
});
t('豁免标记行整行跳过', () => {
  assert.equal(extractMdLinks('[a](broken.md) <!--lint-links:exempt 历史原因-->').length, 0);
});

// ---- resolveTarget：skip 3 ----
t('http 外链 skip', () => { assert.equal(resolveTarget('https://github.com/x', ROOT + '/README.md', ROOT, existsYes).kind, 'skip'); });
t('mailto skip', () => { assert.equal(resolveTarget('mailto:a@b.c', ROOT + '/r.md', ROOT, existsYes).kind, 'skip'); });
t('纯锚点与仅片段 skip', () => {
  assert.equal(resolveTarget('#sec', ROOT + '/r.md', ROOT, existsYes).kind, 'skip');
  assert.equal(resolveTarget('README.md#top', ROOT + '/r.md', ROOT, existsYes).kind, 'ok');
});

// ---- resolveTarget：escape 2 ----
t('../ 越出仓库根 → escape（从 docs/ 需两层）', () => {
  assert.equal(resolveTarget('../../外部.md', ROOT + '/docs/r.md', ROOT, existsYes).kind, 'escape');
});
t('仓库根本身不判越仓', () => {
  assert.equal(resolveTarget('..', ROOT + '/docs/r.md', ROOT, existsYes).kind, 'ok');
});

// ---- resolveTarget：missing/ok/解码 4 ----
t('目标不存在 → missing', () => {
  assert.equal(resolveTarget('./不存在.md', ROOT + '/r.md', ROOT, existsNo).kind, 'missing');
});
t('目标存在 → ok', () => {
  assert.equal(resolveTarget('./README.md', ROOT + '/r.md', ROOT, existsYes).kind, 'ok');
});
t('目录目标存在 → ok', () => {
  assert.equal(resolveTarget('./docs', ROOT + '/r.md', ROOT, existsYes).kind, 'ok');
});
t('%20 解码后判定（dir%20name，分隔符无关）', () => {
  assert.equal(resolveTarget('dir%20name/f.md', ROOT + '/r.md', ROOT, (p) => p.replace(/\\/g, '/') === ROOT + '/dir name/f.md').kind, 'ok');
});

// ---- resolveTarget：跟踪面校验（v0.21.4 公开整备批）----
t('isTracked 缺省不启用（旧口径兼容）', () => {
  assert.equal(resolveTarget('./README.md', ROOT + '/r.md', ROOT, existsYes).kind, 'ok');
});
t('目标在跟踪面 → ok', () => {
  assert.equal(resolveTarget('./README.md', ROOT + '/r.md', ROOT, existsYes, () => true).kind, 'ok');
});
t('目标存在但不在跟踪面 → untracked（公开克隆断链盲区）', () => {
  const r = resolveTarget('./交接文档.md', ROOT + '/r.md', ROOT, existsYes, (p) => !String(p).includes('交接文档'));
  assert.equal(r.kind, 'untracked');
});

console.log(`\n===== test-lint-links：${pass} 过 / ${failCount} 败 =====`);
process.exit(failCount === 0 ? 0 : 1);
