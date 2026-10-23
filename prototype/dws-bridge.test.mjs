// dws-bridge.test.mjs — 编排桥接层回归测试（v0.21.2 修复批）
// 覆盖三条真实缺陷（均由安全向 rescan-audit 复审实证）：
//   ① P1：hasRealIds 引用 for 块作用域外的 const a → dry-run 必抛 ReferenceError
//         （自 v0.20.1/2026-10-07 引入，编排工具实际从未成功运行过）
//   ② P2：文档标题 a.name 被当作「真实 ID」判定 → 被跟踪的 output/dws-plan.sh 永不更新（产物永久陈旧）
//   ③ P2：q() 转义顺序缺陷（未先转义反斜杠）→ 展示行复制进 bash 时 $(...) 仍是有效命令替换
//
// 测法：黑盒子进程 + 临时目录（产物写进临时目录，**不污染仓库**）；退出码直取。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTO = join(dirname(fileURLToPath(import.meta.url)));
const DWS = join(PROTO, 'dws-bridge.mjs');
const CFG_SRC = JSON.parse(readFileSync(join(PROTO, 'config.dws.json'), 'utf8'));
const ART_SRC = JSON.parse(readFileSync(join(PROTO, 'artifacts.sample.json'), 'utf8'));

/** 在临时目录跑一次 dry-run，产物落临时目录（cwd 相对路径：dws-bridge 的读写均相对 cwd） */
function runDryRun({ config = CFG_SRC, artifacts = ART_SRC } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'gk-dws-'));
  writeFileSync(join(dir, 'config.dws.json'), JSON.stringify(config));
  writeFileSync(join(dir, 'artifacts.json'), JSON.stringify(artifacts));
  const r = spawnSync(process.execPath, [DWS, '--config', './config.dws.json', '--artifacts', './artifacts.json'], {
    cwd: dir, encoding: 'utf8',
  });
  const out = join(dir, 'output');
  return {
    dir, code: r.status, stdout: r.stdout || '', stderr: r.stderr || '',
    planSh: existsSync(join(out, 'dws-plan.sh')),
    planLocal: existsSync(join(out, 'dws-plan.local.sh')),
    planText: existsSync(join(out, 'dws-plan.sh')) ? readFileSync(join(out, 'dws-plan.sh'), 'utf8') : '',
  };
}

// ① P1 回归：dry-run 必须成功退出，不得抛 ReferenceError
test('dry-run 不抛 ReferenceError（回归 P1：块作用域外的 a 引用）', () => {
  const r = runDryRun();
  assert.equal(r.code, 0, `dry-run 应成功退出，实际 ${r.code}；stderr：${r.stderr.slice(0, 300)}`);
  assert.ok(!/ReferenceError/.test(r.stderr), '不得抛 ReferenceError：' + r.stderr.slice(0, 200));
});

// ② 回归：占位符配置 + 普通文档名 → 走被跟踪路径（被跟踪产物必须能正常更新）
test('占位符配置下写被跟踪的 dws-plan.sh（回归 P2：文档名被误判为真实 ID 致产物永不更新）', () => {
  const r = runDryRun();
  assert.equal(r.planSh, true, '占位符配置应写 output/dws-plan.sh（被跟踪产物必须能更新）');
  assert.equal(r.planLocal, false, '占位符配置不应写 local 变体');
  assert.ok(r.planText.includes('#!/usr/bin/env bash'), '计划脚本应以 shebang 开头');
});

// ② 回归的反面：配置含真实 ID → 必须走本地路径（真实 ID 不得烘进被跟踪文件）
test('配置含真实 ID 时改写本地路径 dws-plan.local.sh（安全属性：真实 ID 不入版本库）', () => {
  const r = runDryRun({ config: { ...CFG_SRC, approverUserId: 'REAL_USER_ID_9f3a2b' } });
  assert.equal(r.planLocal, true, '含真实 ID 时应写 output/dws-plan.local.sh');
  assert.equal(r.planSh, false, '含真实 ID 时不得写被跟踪的 dws-plan.sh');
});

// ③ 回归：q() 转义顺序——展示行中的 $(...) 必须已转义，复制进 bash 不会触发命令替换
test('q() 转义顺序：展示行里的 $(...) 已转义（回归 P2：反斜杠未先转义致命令替换生效）', () => {
  const arts = JSON.parse(JSON.stringify(ART_SRC));
  arts[0].name = 'doc$(echo PWNED)';
  const r = runDryRun({ artifacts: arts });
  assert.equal(r.code, 0, 'dry-run 应成功退出');
  const showLines = r.stdout.split(/\r?\n/).filter((l) => l.trim().startsWith('$ '));
  assert.ok(showLines.length > 0, '应至少有一条展示行');
  for (const l of showLines) {
    assert.ok(!/(^|[^\\])\$\(/.test(l), '展示行存在未转义的 $( 命令替换：' + l.slice(0, 160));
  }
  // 断言确实做过转义（避免「因为没进展示行」而假通过）
  assert.ok(showLines.some((l) => l.includes('\\$(')), '展示行应含已转义的 \\$( 形态，实际：' + showLines[0].slice(0, 160));
});
