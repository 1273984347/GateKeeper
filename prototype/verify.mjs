// verify.mjs — 统一验收脚本（本地 + CI 共用）：漂移双门禁 + 功能回归红线 + 换配置差异
// 用法：node verify.mjs          全绿 exit 0；任一红线破 exit 1
// CI 里配合：node sync-gates.mjs --check && node sync-configs.mjs --check && node verify.mjs && node check-docs.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyze, makeConfig } from './gates.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(readFileSync(join(dir, 'configs/batches.sample.json'), 'utf8'));
const cfgOf = (ref) => (ref ? makeConfig(JSON.parse(readFileSync(join(dir, 'configs', ref + '.json'), 'utf8'))) : undefined);
const fails = [];
const ok = (label, cond, detail) => { console.log(`${cond ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`); if (!cond) fails.push(label); };

// 1) 样例批回归红线：环 50 / 6P0 / 9P1 / 8P2(含P3) / 1 可发布 / A 阻断0分4×P0 / E 可发布100
const sample = D.projects.find((p) => p.id === 'sample');
const docs = sample.docs.map((d) => analyze(d, cfgOf(sample.configRef)));
const t = { P0: 0, P1: 0, P2: 0, P3: 0 };
docs.forEach((d) => d.gates.forEach((g) => g.findings.forEach((x) => { if (t[x.level] !== undefined) t[x.level]++; })));
const avg = Math.round(docs.reduce((s, d) => s + d.score, 0) / docs.length);
const okc = docs.filter((d) => d.verdict.k === 'ok').length;
const A = docs.find((d) => d.id === 'A'), E = docs.find((d) => d.id === 'E');
const B = docs.find((d) => d.id === 'B'), C = docs.find((d) => d.id === 'C'), Dd = docs.find((d) => d.id === 'D');
ok('样例批 平均健康分 = 50', avg === 50, `实测 ${avg}`);
ok('样例批 P0 计数 = 6', t.P0 === 6, `实测 ${t.P0}`);
ok('样例批 P1 计数 = 9', t.P1 === 9, `实测 ${t.P1}`);
ok('样例批 P2+P3 计数 = 8', t.P2 + t.P3 === 8, `实测 ${t.P2 + t.P3}`);
ok('样例批 可发布 = 1', okc === 1, `实测 ${okc}`);
ok('A = 阻断发布 / 0 分 / 4×P0', A.verdict.t === '阻断发布' && A.score === 0 && A.gates.flatMap((g) => g.findings).filter((x) => x.level === 'P0').length === 4);
ok('B = 阻断发布 / 49 分', B.verdict.t === '阻断发布' && B.score === 49, `实测 ${B.verdict.t} ${B.score}`);
ok('C = 阻断发布 / 17 分', C.verdict.t === '阻断发布' && C.score === 17, `实测 ${C.verdict.t} ${C.score}`);
ok('D = 需修复后发布 / 84 分', Dd.verdict.t === '需修复后发布' && Dd.score === 84, `实测 ${Dd.verdict.t} ${Dd.score}`);
ok('E = 可发布 / 100 分', E.verdict.t === '可发布' && E.score === 100);

// 2) 换配置差异真实生效：西游记文学语境下 G4 广告法命中被抑制（默认>0 → 项目口径=0）
const x = D.projects.find((p) => p.id === 'xiyouji');
const base = analyze(x.docs[0]);
const withCfg = analyze(x.docs[0], cfgOf(x.configRef));
const g4b = base.gates.find((g) => g.id === 'G4').findings.length;
const g4c = withCfg.gates.find((g) => g.id === 'G4').findings.length;
ok('换配置抑制 G4（默认>0 → 项目=0）', g4b > 0 && g4c === 0, `${g4b} → ${g4c}`);

// 3) 引擎契约不变：六道门禁 ID 稳定
const ids = docs[0].gates.map((g) => g.id).join(',');
ok('六道门禁 ID = G1..G6', ids === 'G1,G2,G3,G4,G5,G6', ids);

console.log(fails.length ? `\n✗ 验收失败 ${fails.length} 项：${fails.join(' / ')}` : '\n✅ 全部红线通过');
process.exit(fails.length ? 1 : 0);
