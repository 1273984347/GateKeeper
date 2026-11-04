#!/usr/bin/env node
/**
 * lint-workspace.mjs — 工作区体检（M17 前批，方案 A）：文件清单漂移防线；只读，绝不修改任何文件
 *
 * 四项检查：
 *   1. 未跟踪垃圾：git status --porcelain 的 `??` 条目命中垃圾模式（nul/pyc/pyo/__pycache__/log/tmp/bak/.DS_Store/Thumbs.db/desktop.ini）→ FAIL；
 *      非垃圾 untracked（正常 WIP 新文件）→ INFO 不阻断。
 *   2. STRUCTURE 树声明 → 存在（单向）：STRUCTURE.md 围栏树中声明的每个文件/目录必须真实存在；文件被移动/删除而未更新 STRUCTURE → FAIL。
 *   3. .gitignore 覆盖探针：垃圾模式代表路径必须被 ignore 规则覆盖（git check-ignore），缺覆盖 → FAIL。
 *   4. 防回流探针（v0.21.4 公开整备批）：运行产物/截图/内部协作文档属于本地面，禁止回到 git 跟踪面（git add -f 也拦）——命中即 FAIL。
 *
 * 用法：node tools/lint-workspace.mjs            # 等价 --check；有 FAIL exit 1
 *       node tools/lint-workspace.mjs --check
 *       node tools/lint-workspace.mjs --json
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, dirname as pd } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = dirname(PROTO);

// 垃圾模式（v1 冻结清单；扩展需同步 test-lint-workspace）
const JUNK = [
  { re: /(^|\/)nul$/i, pattern: 'nul' },
  { re: /(^|\/)__pycache__\//, pattern: '__pycache__/' },
  { re: /\.pyc$/i, pattern: '*.pyc' },
  { re: /\.pyo$/i, pattern: '*.pyo' },
  { re: /\.log$/i, pattern: '*.log' },
  { re: /\.tmp$/i, pattern: '*.tmp' },
  { re: /\.bak$/i, pattern: '*.bak' },
  { re: /(^|\/)\.DS_Store$/i, pattern: '.DS_Store' },
  { re: /(^|\/)Thumbs\.db$/i, pattern: 'Thumbs.db' },
  { re: /(^|\/)desktop\.ini$/i, pattern: 'desktop.ini' },
];

// .gitignore 覆盖探针（代表路径；git check-ignore 对不存在路径同样按规则判定）
export const GITIGNORE_PROBES = [
  'nul', 'debug.log', 'x.tmp', 'x.bak', 'x.pyc', 'x.pyo',
  '__pycache__/x.pyc', '.DS_Store', 'Thumbs.db', 'desktop.ini',
  'x.local.md',
];

// 防回流清单（v0.21.4 公开整备批冻结）：本地面路径禁回跟踪面。扩展需同步 test-lint-workspace。
export const TRACKED_FORBIDDEN = [
  'prototype/output/', 'prototype/screenshots/',
  'CLAUDE.md', 'AGENTS.md', '交接文档.md', '新Agent启动Prompt.md',
  '.agents/', '.zcode/', 'docs/档案/', 'prototype/人工冷跑开跑清单.md',
  'UI升级方案.md', 'Web端可扩展改造方案.md',
  'docs/工作复盘与优化分析报告-*.md',
  'experiments/',
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '\0' : '\\' + c)); }

/** 规则 → 匹配器：目录规则前缀；含 * 规则段内通配（[^/]*）；其余全等 */
function ruleMatcher(rule) {
  if (rule.endsWith('/')) return (p) => p.startsWith(rule);
  if (rule.includes('*')) {
    const re = new RegExp('^' + escapeRe(rule).split('\0').join('[^/]*') + '$');
    return (p) => re.test(p);
  }
  return (p) => p === rule;
}

/** 跟踪路径中命中防回流清单的条目，返回 [{path, rule}] */
export function findTrackedForbidden(paths, forbidden = TRACKED_FORBIDDEN) {
  const matchers = forbidden.map((rule) => ({ rule, m: ruleMatcher(rule) }));
  const out = [];
  for (const p of paths) {
    const norm = p.replace(/\\/g, '/');
    const hit = matchers.find(({ m }) => m(norm));
    if (hit) out.push({ path: p, rule: hit.rule });
  }
  return out;
}

/** 解析 STRUCTURE.md 围栏树：返回 {declared:[路径], missing:[路径]}（exists 可注入便于测试）
 * 语义：围栏内裸根标签行（如 `prototype/`）是本围栏的根目录，全部条目拼在其下；
 *       根标签若与仓库根同名（如 `GateKeeper/`）则代表仓库根本身，前缀记空。 */
export function parseStructureTree(text, exists = existsSync, rootBasename = 'GateKeeper') {
  const declared = [];
  const lines = text.split('\n');
  let inFence = false;
  let rootLabel = null;
  const stack = [];
  for (const line of lines) {
    if (line.trim().startsWith('```')) { inFence = !inFence; stack.length = 0; rootLabel = null; continue; }
    if (!inFence) continue;
    const idx = line.search(/[├└]── /);
    if (idx === -1) {
      const t = line.trim();
      if (t && !t.includes(' ') && !t.startsWith('（') && !t.startsWith('…') && t.endsWith('/')) {
        rootLabel = t.replace(/\/+$/, '') === rootBasename ? null : t.replace(/\/+$/, '');
        stack.length = 0;
      }
      continue;
    }
    const depth = Math.floor(idx / 4);
    if (line.includes('lint-workspace:exempt')) continue;
    let name = (line.slice(idx + 4).match(/\S+/) || [])[0] || '';
    if (!name || name.startsWith('（') || name.startsWith('…')) continue;
    const isDir = name.endsWith('/');
    if (isDir) name = name.replace(/\/+$/, '');
    const prefix = [rootLabel, ...stack.slice(0, depth).filter(Boolean)].filter(Boolean).join('/');
    if (isDir) { stack[depth] = name; stack.length = depth + 1; declared.push(prefix ? prefix + '/' + name : name); }
    else { declared.push(prefix ? prefix + '/' + name : name); }
  }
  const missing = [];
  for (const rel of declared) {
    const abs = resolve(ROOT, rel);
    if (!exists(abs)) missing.push(rel);
  }
  return { declared, missing };
}

/** 未跟踪路径中的垃圾识别，返回 [{path, pattern}] */
export function findJunk(paths) {
  const out = [];
  for (const p of paths) {
    for (const { re, pattern } of JUNK) {
      if (re.test(p)) { out.push({ path: p, pattern }); break; }
    }
  }
  return out;
}

function main() {
  const failures = [];
  const infos = [];
  const fail = (check, detail) => failures.push({ check, detail });
  const sources = {};

  // 1) 未跟踪垃圾
  const st = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (st.status !== 0) { fail('git status', '执行失败（fail-closed）'); }
  else {
    const untracked = st.stdout.split('\n').filter((l) => l.startsWith('?? ')).map((l) => l.slice(3).replace(/\/$/, ''));
    sources.untracked = untracked.length;
    for (const j of findJunk(untracked)) fail('未跟踪垃圾', `${j.path}（命中模式 ${j.pattern}）`);
    for (const u of untracked) if (!findJunk([u]).length) infos.push(`untracked（WIP 不阻断）: ${u}`);
  }

  // 2) STRUCTURE 树声明 → 存在
  const structText = readFileSync(join(ROOT, 'STRUCTURE.md'), 'utf8');
  const r = parseStructureTree(structText, existsSync, 'GateKeeper');
  sources.declaredPaths = r.declared.length;
  for (const miss of r.missing) fail('STRUCTURE 声明缺失', `${miss}（树中声明但仓库不存在——移动/删除后未同步 STRUCTURE）`);

  // 3) .gitignore 覆盖探针（--non-matching 逐路径判定；此前并行的 -q 调用结果从未消费，v0.21.5 清理）
  const gi2 = spawnSync('git', ['check-ignore', '--verbose', '--non-matching', ...GITIGNORE_PROBES], { cwd: ROOT, encoding: 'utf8' });
  sources.ignoredProbes = 0;
  if (gi2.status !== 0 && !gi2.stdout) { fail('.gitignore 探针', 'git check-ignore 执行失败（fail-closed）'); }
  else {
    const outLines = (gi2.stdout || '').split('\n').filter(Boolean);
    for (const line of outLines) {
      // 格式：`::	路径`（未忽略）或 `来源:行号:模式	路径`（已忽略）
      const parts = line.split('\t');
      if (parts.length === 2 && parts[0] === '::') fail('.gitignore 覆盖缺口', `${parts[1]} 未被任何 ignore 规则覆盖`);
      else if (parts.length === 2) sources.ignoredProbes++;
    }
  }

  // 4) 防回流探针（v0.21.4）：本地面路径禁回跟踪面。必须用 -z：默认 quotepath 会把非 ASCII 路径
  //    转成八进制转义，中文规则（交接文档/档案/复盘报告）全部匹配落空（v0.21.5 实测抓出修复）
  const ls = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  if (ls.status !== 0) { fail('git ls-files', '执行失败（fail-closed）'); }
  else {
    const tracked = ls.stdout.split('\0').filter(Boolean);
    sources.trackedFiles = tracked.length;
    for (const hit of findTrackedForbidden(tracked)) {
      fail('防回流探针', `${hit.path} 属本地面（规则 ${hit.rule}），禁止回跟踪面——git rm --cached 处置`);
    }
  }

  const jsonOut = { ok: failures.length === 0, sources, infos, failures };
  if (process.argv.includes('--json')) console.log(JSON.stringify(jsonOut, null, 2));
  else {
    console.log(`\n===== lint-workspace 工作区体检 =====`);
    console.log(`真值源：untracked=${sources.untracked ?? '?'} · STRUCTURE 声明=${sources.declaredPaths ?? '?'} · ignore 探针通过=${sources.ignoredProbes ?? '?'}/${GITIGNORE_PROBES.length} · 跟踪文件=${sources.trackedFiles ?? '?'}`);
    for (const i of infos) console.log(`ℹ ${i}`);
    if (failures.length === 0) console.log('✅ 0 FAIL · 文件清单无漂移');
    else {
      for (const f of failures) console.log(`✗ [${f.check}] ${f.detail}`);
      console.log(`❌ ${failures.length} FAIL`);
    }
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
