// render-core.test.mjs — 渲染纯函数单测（M13 可测化；与 gates.test.mjs 同栈：node:test 零依赖）
// 运行：node --test render-core.test.mjs（gate.mjs/CI 均未自动纳入 render-core 变更的重注入，
//       改 render-core.mjs 后除 sync-render 外也应全绿）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, highlight, scoreColor } from './render-core.mjs';
import { BANNED, makeConfig } from './gates.mjs';

const meta = { session: 's', created: 'c', source: 'db' };
const doc = (text) => ({ id: 't', name: 't', type: '营销物料', author: 'x', meta: { ...meta }, text });

// ---------- esc ----------
test('esc 转义五类危险字符（含引号，属性上下文安全）', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">&\''),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
});
test('esc 幂等输入不二次破坏（普通中文原样）', () => {
  assert.equal(esc('智能客服 · 全网第一'), '智能客服 · 全网第一');
});
test('esc 引号转义使 data-snip 属性不可逃逸（重扫 XSS 修复回归）', () => {
  const snip = '标题" onmouseover="alert(1)';
  const attr = `<div data-snip="${esc(snip)}">`;
  assert.ok(!attr.includes('" onmouseover="'), '属性未被引号逃逸');
});

// ---------- highlight ----------
test('highlight 默认词表命中包 <mark>，长词优先（全网第一 先于 第一）', () => {
  const html = highlight('采用全网第一技术。', makeConfig({}));
  assert.ok(html.includes('<mark>全网第一</mark>'), html);
  assert.ok(!html.includes('<mark>第一</mark>'), '短词不得在长词命中内部二次包裹');
});
test('highlight 单遍替换防 <mark> 标记被后续词改写（词表含标记字符场景）', () => {
  const cfg = makeConfig({ banned: [{ cat: 't', level: 'P3', basis: 'b', words: ['mark', 'ar'], fix: 'f' }] });
  const html = highlight('text with mark and ar inside', cfg);
  assert.ok(html.includes('<mark>mark</mark>'), html);
  assert.ok(!html.includes('<<mark>m</mark>ark'), '不得改写已生成标记');
});
test('highlight 无命中返回纯 esc 文本；自定义 cfg 词表生效（cfg.banned 优先于默认）', () => {
  assert.equal(highlight('干净文本。', makeConfig({})), '干净文本。');
  const cfg = makeConfig({ banned: [{ cat: '自定义', level: 'P2', basis: 'b', words: ['紫电'], fix: 'f' }] });
  assert.equal(highlight('青光闪，紫电疾。', cfg), '青光闪，<mark>紫电</mark>疾。');
});
test('highlight 词表含正则元字符不炸且按字面命中', () => {
  const cfg = makeConfig({ banned: [{ cat: '元', level: 'P3', basis: 'b', words: ['C++ (新版)'], fix: 'f' }] });
  const html = highlight('升级到 C++ (新版) 运行时。', cfg);
  assert.ok(html.includes('<mark>C++ (新版)</mark>'), html);
});
test('highlight 与引擎 G4 词表同源：BANNED 任一默认词可命中', () => {
  const w = BANNED[0].words[0];
  assert.ok(highlight(`含${w}的文案。`, makeConfig({})).includes('<mark>'), '默认词表应命中：' + w);
});

// ---------- scoreColor ----------
test('scoreColor 阈值三段：≥85 绿 / ≥55 橙 / <55 红（与裁决阈值一致）', () => {
  assert.equal(scoreColor(100), 'var(--pass)');
  assert.equal(scoreColor(85), 'var(--pass)');
  assert.equal(scoreColor(84), 'var(--warn)');
  assert.equal(scoreColor(55), 'var(--warn)');
  assert.equal(scoreColor(54), 'var(--p0)');
  assert.equal(scoreColor(0), 'var(--p0)');
});
