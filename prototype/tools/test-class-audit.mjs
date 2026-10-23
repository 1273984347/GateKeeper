// test-class-audit.mjs — A11 判据（class/id 集合对拍）的正负样本测试
// 纪律（gk-newgate）：每条判据都要有一条「构造越界值 → 必红」用例，先实证再落地。
// 测法：用临时目录里的 HTML 副本喂给 class-audit 的纯函数与 CLI，**不改仓库文件**。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, BASE_CLASS, BASE_ID, DYNAMIC_CLASS } from './class-audit.mjs';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(PROTO, 'tools', 'class-audit.mjs');

/** 构造一份「基线齐备」的最小 HTML：静态 class 全在 + id 全在 + 动态类来源字面量全在 */
function baselineHtml() {
  const cls = [...BASE_CLASS, ...DYNAMIC_CLASS].map((c) => `<span class="${c}"></span>`).join('');
  const ids = BASE_ID.map((i) => `<div id="${i}"></div>`).join('');
  return `<!doctype html><html><body>${cls}${ids}</body></html>`;
}
function tmpHtml(content) {
  const dir = mkdtempSync(join(tmpdir(), 'gk-class-audit-'));
  const p = join(dir, 'page.html');
  writeFileSync(p, content, 'utf8');
  return p;
}
function runCli(file) {
  const r = spawnSync(process.execPath, [TOOL, file], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// ① 正样本：基线齐备 → 全绿
test('正样本：基线 class/id 齐备 → 三项判据全过、退出码 0', () => {
  const p = tmpHtml(baselineHtml());
  const r = runCli(p);
  assert.equal(r.code, 0, '基线齐备应退出 0；实际输出：' + r.stdout.slice(0, 200));
  assert.ok(r.stdout.includes('✓ 基线静态 class 全在'), '应输出基线 class 全在');
  assert.ok(r.stdout.includes('✓ 基线 id 全在'), '应输出基线 id 全在');
});

// ② 负样本：删一个基线静态 class → 必红（只增不删是本判据的核心）
test('负样本：删除一个基线静态 class → 判红并点名该类', () => {
  const victim = 'gpill';
  const html = baselineHtml().replace(`<span class="${victim}"></span>`, '');
  const r = runCli(tmpHtml(html));
  assert.equal(r.code, 1, '删基线 class 必须 exit 1');
  assert.ok(r.stdout.includes(`基线静态 class 缺失`) && r.stdout.includes(victim), '应点名缺失类：' + r.stdout.slice(0, 200));
});

// ③ 负样本：删一个基线 #id → 必红
test('负样本：删除一个基线 #id → 判红并点名该 id', () => {
  const victim = 'ringNum';
  const html = baselineHtml().replace(`<div id="${victim}"></div>`, '');
  const r = runCli(tmpHtml(html));
  assert.equal(r.code, 1, '删基线 id 必须 exit 1');
  assert.ok(r.stdout.includes('基线 id 缺失') && r.stdout.includes(victim), '应点名缺失 id：' + r.stdout.slice(0, 200));
});

// ④ 负样本：动态类的来源字面量从源码消失 → 必红（动态类静态不可解析，改按来源核对）
test('负样本：动态类来源字面量消失 → 判红（运行时该分支已不存在）', () => {
  const victim = 'v-block';
  const html = baselineHtml().replace(`<span class="${victim}"></span>`, ''); // 来源字面量同时消失
  const r = runCli(tmpHtml(html));
  assert.equal(r.code, 1, '动态类来源消失必须 exit 1');
  assert.ok(r.stdout.includes('基线动态 class 来源字面量消失'), '应报动态类来源消失：' + r.stdout.slice(0, 200));
});

// ⑤ 纯函数层：增量项只报不判红（只增不删 ≠ 不许增）
test('纯函数：新增 class/id 属增量，只登记不判红', () => {
  const html = baselineHtml() + '<span class="brand-new-cls"></span><div id="brandNewId"></div>';
  const r = audit(html);
  assert.equal(r.missC.length, 0, '增量不应判红');
  assert.equal(r.missI.length, 0, '增量 id 不应判红');
  assert.ok(r.addC.includes('brand-new-cls'), '增量 class 应被登记');
  assert.ok(r.addI.includes('brandNewId'), '增量 id 应被登记');
});
