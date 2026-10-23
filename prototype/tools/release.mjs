#!/usr/bin/env node
/**
 * release.mjs — 里程碑收官脚本（A-02，复盘 S-03 任务卡）：SOP-2 第 1-2 步、第 4 步版本行、第 5 步门禁一键 + --verify 复核
 * 边界（用户拍板）：不自动 commit/push——机械步骤脚本做，判断性内容（CHANGELOG 四件套正文）人写，提交人审。
 *
 * 用法：
 *   node tools/release.mjs <vX.Y.Z> [--dry-run]   # 登记 registry→重注入→README/交接版本行→十三门→打印手工步骤清单
 *   node tools/release.mjs --verify [vX.Y.Z]      # 复核四处版本一致（registry/README/交接/CHANGELOG 顶段）+ 十三门
 *
 * 覆盖的漏做史（3 次）：M15 registry 改后漏重注入（被 --check 实拦）；M14/M15/M16 台账不同步（review 抓出）。
 * 台账（SOP-2 第 6 步）与复审（第 7 步）在推送后由 Agent 执行，脚本只提示。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = dirname(PROTO);
const ROOT_BASENAME = 'GateKeeper';

// ---------- 可导出纯函数 ----------

/** 版本归一：接受 vX.Y.Z / X.Y.Z，返回 {docs:'vX.Y.Z', reg:'X.Y.Z'}；非法 → null */
export function parseVersion(input) {
  const m = String(input ?? '').trim().match(/^v?(\d+\.\d+\.\d+)$/);
  return m ? { docs: `v${m[1]}`, reg: m[1] } : null;
}

/** registry 锚定替换：currentVersion 与 versions 首位同步升级；锚点缺失或目标已是 current → null（fail-closed） */
export function updateRegistry(text, newReg) {
  if (text.includes(`"currentVersion": "${newReg}"`)) return null;
  const anchor = `"currentVersion": "`,
    a = text.indexOf(anchor);
  if (a === -1) return null;
  const curStart = a + anchor.length,
    curEnd = text.indexOf('"', curStart);
  if (curEnd === -1) return null;
  const cur = text.slice(curStart, curEnd);
  const arrAnchor = `"versions": [\n      "${cur}",`;
  if (!text.includes(arrAnchor)) return null;
  return text
    .replace(`"currentVersion": "${cur}"`, `"currentVersion": "${newReg}"`)
    .replace(arrAnchor, `"versions": [\n      "${newReg}",\n      "${cur}",`);
}

/** 文档版本行锚定替换：kind='README'（> **当前版本**：vX）或 '交接'（- **版本**：vX）；不匹配 → null */
export function updateDocVersionLine(text, kind, newDocs) {
  const pats = {
    README: { re: /(> \*\*当前版本\*\*：)v\d+\.\d+\.\d+/, repl: `$1${newDocs}` },
    交接: { re: /(- \*\*版本\*\*：)v\d+\.\d+\.\d+/, repl: `$1${newDocs}` },
  };
  const p = pats[kind];
  if (!p || !p.re.test(text)) return null;
  return text.replace(p.re, p.repl);
}

/** CHANGELOG 顶部版本段标题提取（首个 ### vX.Y.Z）；无 → null */
export function extractChangelogTop(text) {
  const m = text.match(/^### (v\d+\.\d+\.\d+)/m);
  return m ? m[1] : null;
}

/** 四处一致性：全部同值 → {ok:true,mismatches:[]}；否则逐项点名（registry 无 v 前缀，统一按 docs 口径比） */
export function checkConsistency({ registry, readme, handover, changelog }) {
  const target = readme ?? handover ?? (changelog ? changelog : null);
  const norm = (v) => (v == null ? null : `v${String(v).replace(/^v/, '')}`);
  const mismatches = [];
  for (const [k, v] of Object.entries({ registry, readme, handover, changelog })) {
    if (norm(v) !== norm(target)) mismatches.push(`${k}=${v ?? '缺失'}`);
  }
  return { ok: mismatches.length === 0, mismatches };
}

// ---------- 主流程 ----------

function runGates(label) {
  console.log(`\n==> ${label}：十三门全量门禁（退出码直取，禁管道）`);
  const r = spawnSync('node', ['tools/gate.mjs'], { cwd: PROTO, stdio: 'inherit' });
  return r.status;
}

function main() {
  const argv = process.argv.slice(2);
  const verifyMode = argv.includes('--verify');
  const dryRun = argv.includes('--dry-run');
  const verRaw = argv.find((a) => !a.startsWith('--'));
  const ver = verifyMode && !verRaw ? { docs: null, reg: null } : parseVersion(verRaw);

  if (verifyMode && !ver) {
    console.log('\n==> --verify：复核四处版本一致性');
  } else if (!ver) {
    console.error(`✗ 版本号非法或缺失：${verRaw ?? '(无)'}（用法：node tools/release.mjs vX.Y.Z [--dry-run] | --verify [vX.Y.Z]）`);
    process.exit(1);
  }

  const regPath = join(PROTO, 'configs', 'gatekeeper-self.json');
  const readmePath = join(ROOT, 'README.md');
  const handoverPath = join(ROOT, '交接文档.md');
  const changelogPath = join(ROOT, 'CHANGELOG.md');

  // ---- --verify 模式 ----
  if (verifyMode) {
    const c = checkConsistency({
      registry: JSON.parse(readFileSync(regPath, 'utf8')).registry.currentVersion,
      readme: (readFileSync(readmePath, 'utf8').match(/\*\*当前版本\*\*：(v[\d.]+)/) || [])[1] ?? null,
      handover: (readFileSync(handoverPath, 'utf8').match(/\*\*版本\*\*：(v[\d.]+)/) || [])[1] ?? null,
      changelog: extractChangelogTop(readFileSync(changelogPath, 'utf8')),
    });
    if (!c.ok) {
      console.error(`✗ 四处版本不一致：${c.mismatches.join(' / ')}`);
      process.exit(1);
    }
    const expect = ver ? ver.docs : null;
    if (expect) {
      const top = extractChangelogTop(readFileSync(changelogPath, 'utf8'));
      if (top !== expect) {
        console.error(`✗ 指定版本 ${expect} ≠ CHANGELOG 顶部 ${top}`);
        process.exit(1);
      }
    }
    console.log(`✓ 四处版本一致${ver?.docs ? ` = ${ver.docs}` : ""}；继续跑十三门`);
    const s = runGates('复核门禁');
    console.log(s === 0 ? `\n✅ --verify 通过（${ver?.docs ?? ''}）` : `\n❌ --verify 门禁红`);
    process.exit(s === 0 ? 0 : 1);
  }

  // ---- 收官模式 ----
  const regSrc = readFileSync(regPath, 'utf8');
  const regOut = updateRegistry(regSrc, ver.reg);
  if (!regOut) {
    console.error(`✗ registry 更新失败：${regSrc.includes(`"currentVersion": "${ver.reg}"`) ? `目标 ${ver.docs} 已是 current（防重复收官）` : '锚点缺失（fail-closed）'}`);
    process.exit(1);
  }
  const readmeOut = updateDocVersionLine(readFileSync(readmePath, 'utf8'), 'README', ver.docs);
  const handoverOut = updateDocVersionLine(readFileSync(handoverPath, 'utf8'), '交接', ver.docs);
  if (!readmeOut || !handoverOut) {
    console.error(`✗ 版本行句式不匹配（fail-closed）：README=${readmeOut ? 'ok' : 'null'} 交接=${handoverOut ? 'ok' : 'null'}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n===== release --dry-run ${ver.docs}（不写盘）=====`);
    console.log(`[1] registry: currentVersion=${ver.reg} + versions 首位`);
    console.log(`[2] node sync-configs.mjs 重注入`);
    console.log(`[3] README 抬头 → ${ver.docs}；交接文档「一」→ ${ver.docs}`);
    console.log(`[4] 十三门全量门禁`);
    console.log(`[5] 打印手工步骤清单（CHANGELOG 四件套/commit/台账/复审提示）`);
    console.log('（dry-run 结束，未写任何文件）');
    process.exit(0);
  }

  // [1] registry
  writeFileSync(regPath, regOut);
  console.log(`✓ [1] registry → ${ver.reg}`);
  // [2] 重注入
  const sync = spawnSync('node', ['sync-configs.mjs'], { cwd: PROTO, stdio: 'inherit' });
  if (sync.status !== 0) { console.error('✗ [2] sync-configs 失败（回滚提示：git checkout prototype/configs/gatekeeper-self.json prototype/gatekeeper.html）'); process.exit(1); }
  console.log(`✓ [2] sync-configs 重注入完成`);
  // [3] 版本行
  writeFileSync(readmePath, readmeOut);
  writeFileSync(handoverPath, handoverOut);
  console.log(`✓ [3] README/交接文档版本行 → ${ver.docs}`);

  // [4] 门禁（CHANGELOG 尚未写，doc-sync 版本句此刻必红——这是预期信号，提示先填再复跑）
  const gateStatus = runGates('[4] 十三门全量门禁');
  if (gateStatus !== 0) {
    console.log(`\nℹ 门禁红属预期（CHANGELOG 版本段尚未写，doc-sync 版本句漂移）。填完 CHANGELOG 后重跑：node tools/release.mjs --verify ${ver.docs}`);
  }

  // [5] 手工步骤清单
  const date = new Date().toISOString().slice(0, 10);
  console.log(`\n===== [5] 手工步骤（脚本不越界：判断性内容人写，提交人审）=====`);
  console.log(`① CHANGELOG 顶部（--- 之后）新增版本段，标题行：`);
  console.log(`   ### ${ver.docs}（${date}）：<一句话标题>`);
  console.log(`   四件套：来源 / 执行 / 文件 / 验证 / 状态（历史段只增不删）。`);
  console.log(`② 填完复跑复核：node tools/release.mjs --verify ${ver.docs}`);
  console.log(`③ 提交（人审后）：git add -A && git commit（message 首行含 ${ver.docs}）→ git push 看 CI`);
  console.log(`④ 台账同步（SOP-2 第 6 步，推送后）：docs/档案/批次编号对齐表.md 本行改 ✅ 已落地 + 收官 hash，单独小 commit`);
  console.log(`⑤ 复审（SOP-2 第 7 步，推送后）：双复审先后运行——rescan-audit（安全向）+ gk-review-wave（台账向）`);
  console.log(`\ncommit message 草稿：feat(gatekeeper): ${ver.docs} <标题>`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
