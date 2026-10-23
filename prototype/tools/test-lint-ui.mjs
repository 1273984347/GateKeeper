// test-lint-ui.mjs — lint-ui（A 系列声明级判据）纯函数自测
// 用法：node --test tools/test-lint-ui.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, measure, parseTokens, scanFontSizes, scanRadii, scanHoverTranslate, countFocusVisibleBlocks, contrast, hueDiff, relLuminance, hexToRgb, TH } from './lint-ui.mjs';

const CSS_OK = `
:root{--bg:#f3f3f3;--card:#ffffff;--muted:#616161;--brand:#0f6cbd;--brand-solid:#0f6cbd;
--danger:#c50f1f;--warn:#a8620e;--caution:#65500a;--pass:#0e700e;
--p0:var(--danger);--p1:#a8620e;--p2:var(--caution);--warn:var(--p1)}
.a{font-size:14px;border-radius:8px;padding:8px}
.b{font-size:28px;border-radius:999px}
.c:hover{transform:translateY(-1px)}
.d:focus-visible{outline:2px solid var(--brand)}
.ring .num b{font-family:var(--mono);font-size:40px}
.cnt b{font-family:var(--mono);font-size:20px}
.metric .mv{font-family:var(--mono);font-size:28px}
.projcard .pstat b{font-family:var(--mono);font-size:20px}
.gpill .v{font-family:var(--mono);font-size:20px}
.trendcol .tval{font-family:var(--mono);font-size:14px}
.difftable .delta{font-family:var(--mono);font-size:14px}
`;

test('基线 CSS 全过（正样本）', () => {
  const v = judge(measure(CSS_OK, 100000));
  assert.equal(v.ok, true, JSON.stringify(v.fails));
});

test('A2：字号越阶梯即红', () => {
  const css = CSS_OK + '\n.x{font-size:15px}';
  const v = judge(measure(css, 100000));
  assert.equal(v.ok, false);
  assert.match(v.fails.join('|'), /A2/);
});

test('A3：圆角越档即红；装饰白名单放行 2px', () => {
  const bad = CSS_OK + '\n.z{border-radius:10px}';
  assert.match(judge(measure(bad, 100000)).fails.join('|'), /A3/);
  const exempt = CSS_OK + '\n.mark{border-radius:2px}';
  assert.doesNotMatch(judge(measure(exempt, 100000)).fails.join('|'), /A3/);
});

test('A4：hover 位移越档即红；@keyframes 入场位移不算', () => {
  const bad = CSS_OK + '\n.e:hover{transform:translateY(-5px)}';
  assert.match(judge(measure(bad, 100000)).fails.join('|'), /A4/);
  const kf = CSS_OK + '\n@keyframes fadeUp{from{transform:translateY(10px)}to{transform:none}}';
  assert.doesNotMatch(judge(measure(kf, 100000)).fails.join('|'), /A4/);
});

test('A5：focus-visible 声明块 >2 即红（一条规则含多选择器算 1 块）', () => {
  const many = CSS_OK + '\n.e:focus-visible{outline:none}.f:focus-visible{outline:none}.g:focus-visible{outline:none}';
  assert.match(judge(measure(many, 100000)).fails.join('|'), /A5/);
  const multi = CSS_OK + '\n.e:focus-visible,.f:focus-visible,.g:focus-visible{outline:none}';
  assert.doesNotMatch(judge(measure(multi, 100000)).fails.join('|'), /A5/);
});

test('A6：P1/P2 亮度差不足 / 品牌与危险撞色 即红', () => {
  const dim = CSS_OK.replace('--caution:#65500a', '--caution:#a8620e');
  assert.match(judge(measure(dim, 100000)).fails.join('|'), /A6/);
  const clash = CSS_OK.replace('--brand-solid:#0f6cbd', '--brand-solid:#c50f1f');
  assert.match(judge(measure(clash, 100000)).fails.join('|'), /A6/);
});

test('A7：--muted 对白底不达 4.5:1 即红', () => {
  const dim = CSS_OK.replace('--muted:#616161', '--muted:#b4b4b4');
  assert.match(judge(measure(dim, 100000)).fails.join('|'), /A7/);
});

test('A8：关键数字未用等宽即红', () => {
  const bad = CSS_OK.replace('.cnt b{font-family:var(--mono);font-size:20px}', '.cnt b{font-family:var(--sans);font-size:20px}');
  assert.match(judge(measure(bad, 100000)).fails.join('|'), /A8/);
});

test('A12：体积超 120KB 即红', () => {
  assert.match(judge(measure(CSS_OK, 200 * 1024)).fails.join('|'), /A12/);
});

test('A13：衬线残留 / @font-face 即红', () => {
  const serif = CSS_OK + '\n.h{font-family:var(--serif)}';
  assert.match(judge(measure(serif, 100000)).fails.join('|'), /A13/);
  const ff = CSS_OK + '\n@font-face{font-family:x}';
  assert.match(judge(measure(ff, 100000)).fails.join('|'), /A13/);
});

test('令牌解析：首次定义优先 + 别名链解析', () => {
  const t = parseTokens(CSS_OK);
  assert.equal(t['--warn'], '#a8620e');     // 正式定义优先于后置兼容别名
  assert.equal(t['--p0'], '#c50f1f');        // --p0:var(--danger) 解链
  assert.equal(t['--p2'], '#65500a');        // --p2:var(--caution) 解链
});

test('颜色计算：对比度与色相差方向', () => {
  assert.ok(contrast('#000000', '#ffffff') > 20);
  assert.ok(contrast('#ffffff', '#ffffff') < 1.01);
  assert.ok(Math.abs(relLuminance(hexToRgb('#ffffff')) - relLuminance(hexToRgb('#000000'))) > 0.9);
  assert.ok(hueDiff('#0f6cbd', '#c50f1f') > 12);
  assert.equal(hueDiff('#0f6cbd', '#0f6cbd'), 0);
});

test('阈值常量与基线一致（防止拍脑袋改阈值）', () => {
  assert.deepEqual(TH.A2_fontSizes, [12, 13, 14, 16, 20, 28, 40]);
  assert.deepEqual(TH.A3_radii, [4, 6, 8, 999]);
  assert.equal(TH.A5_focusVisibleBlocks, 2);
  assert.equal(TH.A6_minContrast, 4.5);
  assert.equal(TH.A12_maxBytes, 120 * 1024);
});
