// test-lint-layout.mjs — lint-layout 判据的单元测试（先红后绿：负样本必须先实证）
// 用法：node --test tools/test-lint-layout.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, scanSpacing, TH } from './lint-layout.mjs';

const OK = {
  al1: { chromePct: 23.3 },
  al2: { band: { 1280: 130, 1024: 248, 640: 232 } },
  al3: { verdictToP0: 118 },
  al4: { cleanBarH: 46, standaloneCleanCards: 0 },
  al5: { railHole: 0 },
  al6: { conclusionScores: 1 },
  al7: { violations: [] },
  al8: { orphan: 0 },
  al9: { maxOverflow: 0 },
  al10: { hitReachable: true },
  al11: { blockedDisabled: true, passEnabled: true },
};
const clone = (o) => JSON.parse(JSON.stringify(o));

test('基线测量值全过（正样本）', () => {
  const r = judge(clone(OK));
  assert.equal(r.ok, true, JSON.stringify(r.fails));
});

test('AL1：390 首屏 chrome 占比超 60% 即红', () => {
  const m = clone(OK); m.al1.chromePct = 107;
  const r = judge(m);
  assert.equal(r.ok, false);
  assert.match(r.fails.join('|'), /AL1/);
});

test('AL2：band 高超阈值即红（逐档）', () => {
  for (const [w, v] of [[1280, 141], [1024, 261], [640, 321]]) {
    const m = clone(OK); m.al2.band[w] = v;
    const r = judge(m);
    assert.equal(r.ok, false, `${w} 档 ${v} 应红`);
    assert.match(r.fails.join('|'), /AL2/);
  }
});

test('AL3：裁决→首条 P0 超 120px 即红', () => {
  const m = clone(OK); m.al3.verdictToP0 = 498;
  assert.equal(judge(m).ok, false);
  assert.match(judge(m).fails.join('|'), /AL3/);
});

test('AL4：出现独立 0 命中空卡即红', () => {
  const m = clone(OK); m.al4.standaloneCleanCards = 1;
  assert.equal(judge(m).ok, false);
  assert.match(judge(m).fails.join('|'), /AL4/);
});

test('AL5：rail 空洞超 20px 即红', () => {
  const m = clone(OK); m.al5.railHole = 1191;
  assert.equal(judge(m).ok, false);
  assert.match(judge(m).fails.join('|'), /AL5/);
});

test('AL6：同屏两个结论性分数即红', () => {
  const m = clone(OK); m.al6.conclusionScores = 2;
  assert.equal(judge(m).ok, false);
  assert.match(judge(m).fails.join('|'), /AL6/);
});

test('AL9：出现横向溢出即红', () => {
  const m = clone(OK); m.al9.maxOverflow = 23;
  assert.equal(judge(m).ok, false);
  assert.match(judge(m).fails.join('|'), /AL9/);
});

test('AL10：定位后命中项不可达即红', () => {
  const m = clone(OK); m.al10.hitReachable = false;
  assert.equal(judge(m).ok, false);
  assert.match(judge(m).fails.join('|'), /AL10/);
});

test('AL11：阻断态未禁用 或 放行态不可点 均即红', () => {
  const a = clone(OK); a.al11.blockedDisabled = false;
  assert.equal(judge(a).ok, false);
  const b = clone(OK); b.al11.passEnabled = false;
  assert.equal(judge(b).ok, false);
  assert.match(judge(b).fails.join('|'), /AL11/);
});

test('AL7 解析：刻度内合规、越刻度抓出、2px 徽章白名单放行', () => {
  const good = '.a{padding:8px 16px;margin-top:4px;gap:12px}\n.b{font-size:13px}';
  assert.deepEqual(scanSpacing(good), []);
  const bad = '.a{padding:9px 8px}';
  assert.equal(scanSpacing(bad).length, 1);
  assert.match(scanSpacing(bad)[0], /padding: 9px/);
  const badge = '.tag{padding:2px 8px}';
  assert.deepEqual(scanSpacing(badge), []);
  const badgeBad = '.tag{padding:1px 8px}';
  assert.equal(scanSpacing(badgeBad).length, 1);
  const scroll = '.x{scroll-margin-top:140px}';
  assert.deepEqual(scanSpacing(scroll), []);
});

test('阈值常量与基线一致（防止拍脑袋改阈值）', () => {
  assert.equal(TH.AL1_chromePct, 60);
  assert.equal(TH.AL3_verdictToP0, 120);
  assert.equal(TH.AL5_railHole, 20);
  assert.deepEqual(TH.AL2_band, { 1280: 140, 1024: 260, 640: 320 });
});
