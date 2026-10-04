#!/usr/bin/env node
/**
 * doc-sync.mjs — 文档口径体检器（M15-T1）：机器读代码真值，反向对拍文档当前态声明；只读，绝不修改任何文件
 *
 * 单一事实源方向：代码是源，文档是派生物。
 *   版本源   = configs/gatekeeper-self.json 的 registry.currentVersion
 *   门数源   = tools/gate.mjs 源码中 gates 数组元素个数（...(FULL 追加项不计入)
 *   单测数源 = node --test gates.test.mjs render-core.test.mjs 的 tap 输出 "# tests N"
 *   受检文档 = 运行时从 check-docs.mjs 源码解析 CORE_DOCS 数组（代码是源，不设第二份清单；解析失败即 FAIL，fail-closed）
 *
 * 句式白名单 v1（宁窄勿误，止损线=零误报）：
 *   版本当前态句仅三类：README「> **当前版本**：vX」/ 交接文档「- **版本**：vX」/ CHANGELOG 最新版本段标题「### vX」
 *   陈旧门数词：五门禁/五道门禁/五门全绿 在受检文档出现即 FAIL（现流水线 7-8 门、引擎 6 门，5 恒为过期值）
 *   门数句：受检文档（CHANGELOG 豁免）中「N 门全绿」须等于门数源
 *   单测句：「测试 N 例」须等于单测数源
 *
 * 用法：node tools/doc-sync.mjs            # 等价 --check；有不一致 exit 1
 *       node tools/doc-sync.mjs --check
 *       node tools/doc-sync.mjs --json     # 机器可读输出
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const PROTO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = dirname(PROTO);

// ---------- 可导出纯函数（test-docsync.mjs 消费） ----------

/** 从 check-docs.mjs 源码解析 CORE_DOCS 数组；解析失败返回 null（调用方 fail-closed） */
export function parseCoreDocsSource(src) {
  const m = src.match(/const CORE_DOCS = \[([\s\S]*?)\];/);
  if (!m) return null;
  const items = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return items.length > 0 ? items : null;
}

/** 从 gate.mjs 源码解析非 FULL 门数：const gates = [ 到 ...(FULL（无则到数组收尾 ];）之间的 { name: 条目数 */
export function parseGateCount(src) {
  const start = src.indexOf('const gates = [');
  if (start === -1) return null;
  const fullIdx = src.indexOf('...(FULL', start);
  const arrEnd = src.indexOf('];', start);
  if (arrEnd === -1) return null;
  const end = fullIdx !== -1 && fullIdx < arrEnd ? fullIdx : arrEnd;
  const n = (src.slice(start, end).match(/\{\s*name:/g) || []).length;
  return n > 0 ? n : null;
}

/** 从 node --test 输出解析总测试数（tap「# tests N」或 spec「ℹ tests N」） */
export function parseTapTests(out) {
  const m = out.match(/^#\s*tests\s+(\d+)/m) || out.match(/ℕ?\s*tests\s+(\d+)/) || out.match(/tests\s+(\d+)$/m);
  return m ? Number(m[1]) : null;
}

/** 逐行扫陈旧门数词（行含 doc-sync:exempt 豁免标记则跳过——历史叙述不改写原则），返回 [{line, term}] */
export function findStaleGateTerms(text) {
  const out = [];
  text.split('\n').forEach((l, i) => {
    if (l.includes('doc-sync:exempt')) return;
    const m = l.match(/五门禁|五道门禁|五门全绿/);
    if (m) out.push({ line: i + 1, term: m[0] });
  });
  return out;
}

/** 逐行扫「N 门全绿」，返回 [{line, n}] */
export function findGateCountClaims(text) {
  const out = [];
  text.split('\n').forEach((l, i) => {
    const m = l.match(/(\d+)\s*门全绿/);
    if (m) out.push({ line: i + 1, n: Number(m[1]) });
  });
  return out;
}

/** 逐行扫「测试 N 例」，返回 [{line, n}] */
export function findTestCountClaims(text) {
  const out = [];
  text.split('\n').forEach((l, i) => {
    const m = l.match(/测试\s*(\d+)\s*例/);
    if (m) out.push({ line: i + 1, n: Number(m[1]) });
  });
  return out;
}

/** 版本当前态句提取（三类白名单），返回 v 字符串或 null */
export function extractCurrentVersion(text, kind) {
  const pats = {
    readme: />\s*\*\*当前版本\*\*：v(\d+\.\d+\.\d+)/,
    handover: /^-\s*\*\*版本\*\*：v(\d+\.\d+\.\d+)/m,
    changelog: /^### v(\d+\.\d+\.\d+)/m,
  };
  const m = text.match(pats[kind]);
  return m ? `v${m[1]}` : null;
}

// ---------- 主流程（仅直接执行时运行；被 test-docsync import 时只取纯函数） ----------

function main() {
const failures = [];
const fail = (file, line, rule, claim, truth) => failures.push({ file, line, rule, claim, truth });
const sources = {};

// 1) 版本源
const regPath = join(PROTO, 'configs', 'gatekeeper-self.json');
if (!existsSync(regPath)) { fail('configs/gatekeeper-self.json', 0, '缺源', 'registry 文件不存在', ''); }
else {
  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  sources.version = reg?.registry?.currentVersion ? `v${reg.registry.currentVersion}` : null;
  if (!sources.version) fail('configs/gatekeeper-self.json', 0, '缺源', 'registry.currentVersion 缺失', '');
}

// 2) 门数源
const gateSrc = readFileSync(join(PROTO, 'tools', 'gate.mjs'), 'utf8');
sources.gateCount = parseGateCount(gateSrc);
if (!sources.gateCount) fail('tools/gate.mjs', 0, '缺源', 'gates 数组解析失败', '');

// 3) 单测数源
const t = spawnSync('node', ['--test', 'gates.test.mjs', 'render-core.test.mjs'], { cwd: PROTO, encoding: 'utf8' });
sources.testCount = parseTapTests((t.stdout || '') + (t.stderr || ''));
if (!sources.testCount) fail('node --test', 0, '缺源', '单测总数解析失败（tap/spec 均未命中）', '');

// 4) 受检文档清单（fail-closed）
const cdSrc = readFileSync(join(PROTO, 'check-docs.mjs'), 'utf8');
const coreDocs = parseCoreDocsSource(cdSrc);
if (!coreDocs) { fail('check-docs.mjs', 0, '缺源', 'CORE_DOCS 解析失败（fail-closed）', ''); }
else {
  sources.docs = coreDocs;
  for (const rel of coreDocs) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) { fail(rel, 0, '缺文件', 'CORE_DOCS 声明的文档不存在', ''); continue; }
    const text = readFileSync(abs, 'utf8');
    const lines = () => text;

    // 版本当前态（仅三类句式各归其文件；CHANGELOG 取最新段标题）
    if (rel === 'README.md' || rel === '交接文档.md' || rel === 'CHANGELOG.md') {
      const kind = rel === 'README.md' ? 'readme' : rel === '交接文档.md' ? 'handover' : 'changelog';
      const claim = extractCurrentVersion(text, kind);
      if (claim === null) fail(rel, 0, '版本声明缺失', `${kind} 当前态句式未命中`, sources.version || '?');
      else if (sources.version && claim !== sources.version) {
        const lineNo = text.split('\n').findIndex((l) => l.includes(claim)) + 1;
        fail(rel, lineNo, '版本漂移', claim, sources.version);
      }
    }

    // CHANGELOG 历史段主导，门数/单测/陈旧词规则整体豁免；其余文档三规则全扫
    if (rel === 'CHANGELOG.md') continue;

    for (const hit of findStaleGateTerms(text)) fail(rel, hit.line, '陈旧门数词', hit.term, `现流水线 ${sources.gateCount ?? '?'} 门（引擎 6 门），5 恒为过期值`);
    if (sources.gateCount) for (const hit of findGateCountClaims(text)) {
      if (hit.n !== sources.gateCount) fail(rel, hit.line, '门数漂移', `${hit.n} 门全绿`, `${sources.gateCount} 门全绿`);
    }
    if (sources.testCount) for (const hit of findTestCountClaims(text)) {
      if (hit.n !== sources.testCount) fail(rel, hit.line, '单测数漂移', `测试 ${hit.n} 例`, `测试 ${sources.testCount} 例`);
    }
  }
}

// ---------- 输出 ----------
const jsonOut = { ok: failures.length === 0, sources, failures };
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(jsonOut, null, 2));
} else {
  console.log(`\n===== doc-sync 文档口径体检 =====`);
  console.log(`真值源：版本=${sources.version ?? '?'} · 门数=${sources.gateCount ?? '?'} · 单测=${sources.testCount ?? '?'} · 受检文档=${(sources.docs || []).length} 份`);
  if (failures.length === 0) console.log('✅ 0 FAIL · 文档当前态声明与代码实况一致');
  else {
    for (const f of failures) console.log(`✗ ${f.file}:${f.line} [${f.rule}] 声明「${f.claim}」→ 真值「${f.truth}」`);
    console.log(`❌ ${failures.length} FAIL`);
  }
}
process.exit(failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
