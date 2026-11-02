#!/usr/bin/env node
/**
 * lint-links.mjs — 全仓链接体检（M16-T1）：站内链接本地存在性校验，越仓即红；只读，绝不修改任何文件
 *
 * 源自西游记仓 scripts/lint_links.py 模式（站内存在性 / 外链跳过 / exit 0-1）。
 * 扫描范围：git 跟踪 + 未跟踪（非忽略）的 *.md 与 prototype/*.html——未跟踪盲区修复（M17 复审 P-21：新文件入库前不受检）；排除 CHANGELOG-ARCHIVE.md 与 prototype/output/**。
 * 链接分类：http(s)/mailto/tel/纯锚点 → 跳过；其余按所在文件目录解析 → 目标必须存在、不出仓库根、且在 git 跟踪面（v0.21.4：本地存在但未入库的目标在公开克隆必断链，故同判断链）。
 * 豁免：行内含 `lint-links:exempt` 标记的行整行跳过（历史/特殊场景，标记须带原因）。
 *
 * 用法：node tools/lint-links.mjs            # 等价 --check；有断链 exit 1
 *       node tools/lint-links.mjs --check
 *       node tools/lint-links.mjs --json
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, dirname as pd } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = dirname(PROTO);

// ---------- 可导出纯函数（test-lint-links.mjs 消费） ----------

/** 提取 Markdown 链接（含图片 ![alt](p)），返回 [{line, target}] */
export function extractMdLinks(text) {
  const out = [];
  text.split('\n').forEach((l, i) => {
    if (l.includes('lint-links:exempt')) return;
    for (const m of l.matchAll(/\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) out.push({ line: i + 1, target: m[1] });
  });
  return out;
}

/** 提取 HTML href/src，返回 [{line, target}] */
export function extractHtmlLinks(text) {
  const out = [];
  text.split('\n').forEach((l, i) => {
    if (l.includes('lint-links:exempt')) return;
    for (const m of l.matchAll(/(?:href|src)="([^"]*)"/g)) out.push({ line: i + 1, target: m[1] });
  });
  return out;
}

/** 目标分类解析：skip（外链/纯锚点）/ escape（越仓）/ missing（不存在）/ untracked（存在但不在跟踪面）/ ok。
 *  exists / isTracked 可注入便于测试；isTracked 为 null 时不做跟踪面校验（旧口径兼容）。 */
export function resolveTarget(target, fileAbs, root, exists = existsSync, isTracked = null) {
  if (/^(https?:|mailto:|tel:)/i.test(target) || target.startsWith('#')) return { kind: 'skip' };
  let pathPart = target.split('#')[0].trim();
  if (!pathPart) return { kind: 'skip' };
  try { pathPart = decodeURIComponent(pathPart); } catch { /* 保持原样 */ }
  const resolved = resolve(pd(fileAbs), pathPart);
  const rootNorm = resolve(root);
  if (resolved !== rootNorm && !resolved.startsWith(rootNorm + '\\') && !resolved.startsWith(rootNorm + '/')) {
    return { kind: 'escape', resolved };
  }
  if (!exists(resolved)) return { kind: 'missing', resolved };
  if (isTracked && !isTracked(resolved)) return { kind: 'untracked', resolved };
  return { kind: 'ok', resolved };
}

// ---------- 主流程（仅直接执行时运行） ----------

function main() {
  const failures = [];
  const fail = (file, line, target, reason) => failures.push({ file, line, target, reason });

  // 跟踪文件清单（git ls-files：只扫被跟踪文件，fail-closed）
  const ls = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' });
  if (ls.status !== 0 || !ls.stdout) {
    console.error('✗ git ls-files 失败（fail-closed）：', ls.stderr || '无输出');
    process.exit(1);
  }
  const files = ls.stdout.split('\0').filter((f) =>
    (/\.md$/.test(f) || /^prototype\/[^/]+\.html$/.test(f))
    && f !== 'CHANGELOG-ARCHIVE.md'
    && !f.startsWith('prototype/output/')
  );

  // 跟踪面集合（v0.21.4：目标必须在 git 跟踪面——本地存在但未入库的目标在公开克隆必断链）
  const lt = spawnSync('git', ['ls-files', '-z', '--cached'], { cwd: ROOT, encoding: 'utf8' });
  if (lt.status !== 0 || !lt.stdout) {
    console.error('✗ git ls-files --cached 失败（fail-closed）：', lt.stderr || '无输出');
    process.exit(1);
  }
  const trackedAbs = new Set(lt.stdout.split('\0').filter(Boolean).map((f) => join(ROOT, f)));
  const isTracked = (abs) => trackedAbs.has(abs);

  let linkTotal = 0, checked = 0;

  for (const rel of files) {
    const abs = join(ROOT, rel);
    const text = readFileSync(abs, 'utf8');
    const links = /\.html$/.test(rel) ? extractHtmlLinks(text) : extractMdLinks(text);
    linkTotal += links.length;
    for (const { line, target } of links) {
      const r = resolveTarget(target, abs, ROOT, existsSync, isTracked);
      if (r.kind === 'skip' || r.kind === 'ok') { if (r.kind === 'ok') checked++; continue; }
      if (r.kind === 'escape') fail(rel, line, target, '越仓：解析路径逃出仓库根');
      else if (r.kind === 'untracked') fail(rel, line, target, '断链：目标不在跟踪面（本地存在但未入库，公开克隆不可达——git add 后转绿或改链）');
      else fail(rel, line, target, '断链：目标不存在');
    }
  }

  const jsonOut = { ok: failures.length === 0, scannedFiles: files.length, linkTotal, internalChecked: checked, failures };
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(jsonOut, null, 2));
  } else {
    console.log(`\n===== lint-links 全仓链接体检 =====`);
    console.log(`扫描 ${files.length} 个文件 · 链接 ${linkTotal} 条（站内实检 ${checked} 条，外链/锚点跳过）`);
    if (failures.length === 0) console.log('✅ 0 FAIL · 站内链接全部可达，无越仓');
    else {
      for (const f of failures) console.log(`✗ ${f.file}:${f.line} → ${f.target}（${f.reason}）`);
      console.log(`❌ ${failures.length} FAIL`);
    }
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
