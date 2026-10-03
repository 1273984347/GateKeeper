// gates.test.mjs — 引擎单元/负样本测试（node:test，零依赖）
// 与 verify.mjs 分工：verify = 样例批集成红线（环50/计数/五裁决聚合）；本文件 = 引擎单元行为 + 负样本 + 性能防线。
// 运行：node --test gates.test.mjs   （CI 已接入；改 gates.mjs 后除 sync-gates 外也应全绿）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyze, makeConfig, DEFAULT_CONFIG, flattenFindings } from './gates.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
// 全绿元信息（G6 不干扰其它门禁断言）；第二参为 meta 全量替换（用于 G6 三态）
const meta = { session: 's', created: '2026-01-01', source: 'db' };
const doc = (text, m) => ({ id: 't', name: 't', type: '营销物料', author: 'x', meta: m === undefined ? { ...meta } : m, text });
const gateOf = (a, id) => a.gates.find((g) => g.id === id);

// ---------- G1 引用可溯源 ----------
test('G1 裸引用 [9] 判断链 P1', () => {
  const g = gateOf(analyze(doc('结论见 [9]。')), 'G1');
  assert.equal(g.findings.filter((x) => x.level === 'P1').length, 1);
});
test('G1 负样本：markdown 链接 [文本](URL) 不误报', () => {
  const g = gateOf(analyze(doc('详见 [CHANGELOG](CHANGELOG.md) 与 [file-index](index.md)。')), 'G1');
  assert.equal(g.findings.filter((x) => x.level === 'P1').length, 0);
});
test('G1 注册表内引用 [1] 放行；allowTokens 放行占位 [n]', () => {
  assert.equal(gateOf(analyze(doc('数据来源 [1]。')), 'G1').findings.filter((x) => x.level === 'P1').length, 0);
  const cfg = makeConfig({ allowTokens: ['n'] });
  assert.equal(gateOf(analyze(doc('示例 [n] 占位。'), cfg), 'G1').findings.filter((x) => x.level === 'P1').length, 0);
});
test('G1 sourceHint=false 关闭来源提示(P3)，断链 P1 保留', () => {
  const cfg = makeConfig({ channel: { sourceHint: false } });
  const text = '准确率 92% 环比上升。\n另有断链 [9]。'; // 拆两行：同含 [token] 的行会被 G1 抑制 P3，拆行后断言才真实钉住渠道开关
  const on = gateOf(analyze(doc(text)), 'G1');
  assert.equal(on.findings.filter((x) => x.level === 'P3').length >= 1, true, '前置自证：开关默认开时应有 P3');
  const g = gateOf(analyze(doc(text), cfg), 'G1');
  assert.equal(g.findings.filter((x) => x.level === 'P3').length, 0);
  assert.equal(g.findings.filter((x) => x.level === 'P1').length, 1);
});

// ---------- G2 版本与数据一致性 ----------
test('G2 负样本：0.07ms / M8.5 不判为版本（v 前缀约定）', () => {
  assert.equal(gateOf(analyze(doc('耗时 0.07ms，里程碑 M8.5 完成。')), 'G2').findings.length, 0);
});
test('G2 未登记版本漂移：单版本 P2 / 多版本 P1', () => {
  const one = gateOf(analyze(doc('基于 v2.3 数据口径。')), 'G2');
  assert.equal(one.findings[0].level, 'P2');
  const two = gateOf(analyze(doc('v2.3 口径与 v2.9 混用。')), 'G2');
  assert.equal(two.findings[0].level, 'P1');
});
test('G2 版本注册表放行历史版本（project-config）', () => {
  const cfg = makeConfig({ registry: { currentVersion: '2.9.0', versions: ['2.9.0', '2.3.0'] } });
  assert.equal(gateOf(analyze(doc('自 v2.3.0 升级到 v2.9.0。'), cfg), 'G2').findings.length, 0);
});
test('G2 同指标多值 P0；指标名含正则元字符不炸不失效（审计加固回归）', () => {
  const a = analyze(doc('转化率 38%，后续口径转化率 52%。'));
  assert.equal(gateOf(a, 'G2').findings.filter((x) => x.level === 'P0').length, 1);
  // 'C++'：未转义会抛 SyntaxError；'转化率(CVR)'：未转义捕获组被抢、双值检不出（静默失效）
  const cfg = makeConfig({ registry: { metrics: ['C++', '转化率(CVR)'] } });
  const a2 = analyze(doc('C++ 性能提升；转化率(CVR) 38%，后段转化率(CVR) 52%。'), cfg);
  const g2 = gateOf(a2, 'G2');
  assert.ok(g2.findings.some((x) => x.level === 'P0' && x.snip.includes('转化率(CVR)')), '转义后 (CVR) 指标应正常检出双值矛盾');
});

// ---------- G3 格式 ----------
test('G3 标题跳级与半角标点 P3', () => {
  const g = gateOf(analyze(doc('# 一级\n### 直接跳三级\n中文,混用半角。')), 'G3');
  assert.equal(g.findings.filter((x) => x.level === 'P3').length >= 2, true);
});

// ---------- G4 广告法 ----------
test('G4 极限词 P0 命中带法条与修复；渠道关闭全绿（负样本）', () => {
  const on = gateOf(analyze(doc('本产品全网第一。')), 'G4');
  assert.equal(on.findings.filter((x) => x.level === 'P0').length >= 1, true);
  assert.ok(on.findings[0].basis && on.findings[0].fix, 'finding 必须带依据与修复');
  const offCfg = makeConfig({ channel: { adLaw: false } });
  assert.equal(gateOf(analyze(doc('本产品全网第一。'), offCfg), 'G4').findings.length, 0);
});
test('G4 八类词库结构完整（cat/level/basis/words/fix）', () => {
  for (const r of DEFAULT_CONFIG.banned) {
    assert.ok(r.cat && r.level && r.basis && r.words.length && r.fix, r.cat + ' 结构不全');
  }
});

// ---------- G5 敏感信息 ----------
test('G5 身份证 P0 / 手机号 P1 / 邮箱 P2 / 内部成本 P2', () => {
  const g = gateOf(analyze(doc('身份证 110101199003071234，手机 13812345678，邮箱 zhang@example.com，内部成本约 800 元。')), 'G5');
  const lv = (l) => g.findings.filter((x) => x.level === l).length;
  assert.ok(lv('P0') >= 1 && lv('P1') >= 1 && lv('P2') >= 2);
});
test('G5 邮箱正则限界：118KB 无@ASCII 串不得 O(n²) 卡死（性能防线，审计回归）', () => {
  const big = 'QUJDREVGM0hJS0xNTk9QUVJTVFVW'.repeat(4200); // ≈118KB，数字游程最长 1
  const t0 = process.hrtime.bigint();
  analyze(doc(big));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 2000, `长串扫描 ${ms.toFixed(0)}ms 超 2s 阈值——邮箱正则限界可能被改回`);
});
test('G1 百分比正则限界：200KB 纯数字游程不得 O(n²)（性能防线，重扫 F01 回归）', () => {
  const big = '9'.repeat(200000); // 长数字游程：命中 G1 百分比正则的回溯形态（无 % 结尾）
  const t0 = process.hrtime.bigint();
  analyze(doc(big));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 2000, `数字游程扫描 ${ms.toFixed(0)}ms 超 2s 阈值——G1 百分比正则限界可能被改回`);
});
test('G1 合法百分比仍检出（限界不误伤行为）', () => {
  const a = analyze(doc('准确率 92.5%，成本下降 30%。'));
  assert.equal(gateOf(a, 'G1').findings.filter((x) => x.level === 'P3').length >= 1, true);
});

// ---------- G6 证据链 ----------
test('G6 缺≥2 项 P1 / 缺 1 项 P2 / 全齐 pass（负样本三态）', () => {
  assert.equal(gateOf(analyze(doc('正文', {})), 'G6').findings[0].level, 'P1');
  assert.equal(gateOf(analyze(doc('正文', { session: 's', created: '', source: '' })), 'G6').findings[0].level, 'P1');
  assert.equal(gateOf(analyze(doc('正文', { session: 's', created: '2026-01-01', source: '' })), 'G6').findings[0].level, 'P2');
  assert.equal(gateOf(analyze(doc('正文')), 'G6').findings.length, 0);
});

// ---------- 裁决/评分/工具函数 ----------
test('五裁决基线：A0阻断 / B49阻断 / C17阻断 / D84需修复 / E100可发布（与 verify 互为冗余防线）', () => {
  const D = JSON.parse(readFileSync(join(dir, 'configs/batches.sample.json'), 'utf8'));
  const docs = D.projects.find((p) => p.id === 'sample').docs.map((d) => analyze(d));
  const by = Object.fromEntries(docs.map((d) => [d.id, d]));
  assert.equal(by.A.score + '/' + by.A.verdict.t, '0/阻断发布');
  assert.equal(by.B.score, 49); assert.equal(by.C.score, 17);
  assert.equal(by.D.score + '/' + by.D.verdict.t, '84/需修复后发布');
  assert.equal(by.E.score + '/' + by.E.verdict.t, '100/可发布');
});
test('makeConfig 畸形外部配置不崩不静默失效（重扫 F03 回归）', () => {
  // banned 非数组 → 回退默认词表（原实现放行字符串，g4 forEach TypeError）
  assert.equal(makeConfig({ banned: 'abc' }).banned, DEFAULT_CONFIG.banned);
  // 规则缺 words / 非对象 → 过滤；越界 level 归 P2（原实现命中静默失效）
  const custom = makeConfig({ banned: [{ cat: '坏', level: 'P9', basis: 'b', words: ['测试词'], fix: 'f' }, null, { cat: '缺words' }] });
  assert.equal(custom.banned.length, 1);
  assert.equal(custom.banned[0].level, 'P2');
  const hit = analyze(doc('这里出现测试词。'), custom);
  assert.ok(gateOf(hit, 'G4').findings.length >= 1, 'P9 归 P2 后命中必须仍生效');
  // metrics 含非字符串/空串 → 强转与过滤（空指标名原实现匹配全文任意数字、误判 P0）
  const mcfg = makeConfig({ registry: { metrics: [123, ''] } });
  assert.deepEqual(mcfg.registry.metrics, ['123']);
  assert.equal(gateOf(analyze(doc('a 3 b 5 c 7'), mcfg), 'G2').findings.length, 0, '空指标名不得产生 P0 误判');
  // refs/allowTokens 非数组 → 忽略覆盖走默认（safeStrArray 仅接受数组）
  assert.deepEqual(makeConfig({ allowTokens: 'n' }).allowTokens, []);
  assert.deepEqual(makeConfig({ registry: { refs: 'x' } }).registry.refs, []);
});
test('makeConfig：registry 深合并、banned 可整体替换/回退、allowTokens 并集去重', () => {
  const c1 = makeConfig({ registry: { currentVersion: '9.9.9' } });
  assert.equal(c1.registry.currentVersion, '9.9.9');
  assert.deepEqual(c1.registry.refs, DEFAULT_CONFIG.registry.refs, '未覆盖字段应继承默认');
  const customBanned = [{ cat: '测试', level: 'P2', basis: 'b', words: ['测试词'], fix: 'f' }];
  // 归一化后返回新对象（level 防越界校验），断言改结构相等
  assert.deepEqual(makeConfig({ banned: customBanned }).banned, customBanned);
  assert.equal(makeConfig({ banned: [] }).banned, DEFAULT_CONFIG.banned, '空词表回退默认');
  assert.deepEqual(makeConfig({ allowTokens: ['n', 'x'] }).allowTokens, ['n', 'x']);
  assert.deepEqual(makeConfig({ allowTokens: ['n', 'n', 'x'] }).allowTokens, ['n', 'x'], '重复 token 应去重');
  assert.deepEqual(makeConfig({ allowTokens: ['n'] }).allowTokens, ['n']);
});
test('flattenFindings 按级别排序且携带门禁名', () => {
  const a = analyze(doc('身份证 110101199003071234，另有断链 [9]。'));
  const flat = flattenFindings(a.gates);
  const ranks = { P0: 0, P1: 1, P2: 2, P3: 3 };
  for (let i = 1; i < flat.length; i++) assert.ok(ranks[flat[i - 1].level] <= ranks[flat[i].level]);
  assert.ok(flat[0].gate.startsWith('G'));
});
