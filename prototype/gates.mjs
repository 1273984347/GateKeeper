// gates.mjs — GateKeeper 六道门禁引擎（单一事实源，浏览器与 DWS 编排后端共用）
// 纯逻辑，无 DOM、无 import。规则可通过 project-config 覆盖；默认配置 = 脱敏样例基线（不改任何既有裁决）。
// 修改规则只改这里，改后跑 `node sync-gates.mjs` 重新注入 HTML，`--check` 作漂移门禁。

// —— 样例权威注册表（脱敏演示基线）——
export const REGISTRY = {
  currentVersion: '2.4.0',
  refs: ['1', '2', '3', 'cost-2024'],
  metrics: ['准确率', '转化率', '留存率', '满意度', '命中率']
};

// —— 样例违禁词库（《广告法》八类，辅助审核，不替代法务）——
export const BANNED = [
  { cat: '绝对化用语', level: 'P0', basis: '《广告法》第9条第3项', words: ['最佳', '第一', '最好', '顶级', '极致', '首选', '唯一', '最先进', '全网第一', '最高'], fix: '改为「优选 / 领先 / 出色 / 优质」' },
  { cat: '虚假承诺', level: 'P0', basis: '《广告法》第4、28条', words: ['100%有效', '百分之百', '永不', '零风险', '无效退款', '稳赚', '躺赚', '包过', '包就业'], fix: '改为「满意度高 / 深受好评」或删除承诺' },
  { cat: '极限量词', level: 'P0', basis: '《广告法》第9条第3项', words: ['国家级', '世界级', '最高级', '全网最低', '史上最强', '宇宙级'], fix: '改为「高品质 / 广受认可」' },
  { cat: '权威性误导', level: 'P0', basis: '《广告法》第9条第2项', words: ['国家机关推荐', '特供', '专供', '官方指定'], fix: '删除，无合规替代' },
  { cat: '数据无据', level: 'P1', basis: '《广告法》第11条', words: ['销量第一', '遥遥领先', '行业领先', '排名第一'], fix: '补充数据来源或删除' },
  { cat: '贬损竞品', level: 'P1', basis: '《广告法》第13条', words: ['碾压同行', '完爆', '对方做不到'], fix: '删除，改为正面表述' },
  { cat: '功效暗示', level: 'P1', basis: '《广告法》第17条', words: ['药妆', '医学护肤', '包治百病', '根治'], fix: '按所属行业规定替换' },
  { cat: '时限压迫', level: 'P2', basis: '《广告法》第28条', words: ['仅此一次', '错过不再', '错过再无', '最后机会'], fix: '改为「限时优惠 / 本期特惠」' }
];

// —— 默认配置 = 样例基线（现有所有调用点不带 cfg 即走此路径，裁决逐字不变）——
export const DEFAULT_CONFIG = {
  name: 'sample-default',
  registry: REGISTRY,
  banned: BANNED,
  channel: { adLaw: true, sourceHint: true },   // G4 广告法渠道 + G1「数据未挂来源」提示渠道（治理/文案类文档可关）
  allowTokens: []                  // G1 视为合法占位的引用 token（如正文示例 [n]/[x]）
};

// —— 配置形状校验：project-config 来自外部 JSON（手写/他人提供），畸形输入宁可降级放行默认也不崩引擎或静默失效 ——
function safeStrArray(v, label) {
  if (v === undefined || v === null) return null;              // 未提供 → 调用方走默认
  if (!Array.isArray(v)) { console.warn(`[makeConfig] ${label} 应为数组，已忽略该覆盖项：`, v); return null; }
  return v.map((x) => String(x)).filter((x) => x.trim() !== ''); // 元素强转字符串 + 丢弃空串（空指标名会使 G2 匹配全文任意数字、误判 P0）
}
const LEVEL_SET = new Set(['P0', 'P1', 'P2', 'P3']);

// 项目配置覆盖默认（浅合并；registry / channel 深合并，banned 可整体替换或留空回退）
export function makeConfig(overrides = {}) {
  const b = DEFAULT_CONFIG;
  const metrics = safeStrArray(overrides.registry && overrides.registry.metrics, 'registry.metrics');
  const refs = safeStrArray(overrides.registry && overrides.registry.refs, 'registry.refs');
  // banned：整体替换或回退；逐规则校验 cat/level/words，越界 level 归 P2（防止命中在 sev/评分/裁决中静默失效）
  let banned = b.banned;
  if (overrides.banned !== undefined && overrides.banned !== null) {
    if (!Array.isArray(overrides.banned)) { console.warn('[makeConfig] banned 应为数组，已回退默认词表'); }
    else {
      banned = overrides.banned
        .filter((r) => r && typeof r === 'object' && Array.isArray(r.words) && r.words.length)
        .map((r) => ({
          cat: String(r.cat || '未分类'), level: LEVEL_SET.has(r.level) ? r.level : 'P2',
          basis: String(r.basis || ''), words: r.words.map((w) => String(w)), fix: String(r.fix || ''),
        }));
      if (!banned.length) { console.warn('[makeConfig] banned 过滤后为空，已回退默认词表'); banned = b.banned; }
    }
  }
  // registry 覆盖键存在时必须以净化值落定（无效 → []）：裸展开会让 'refs: x' 这类原始值漏进引擎；
  // 外层容器本身畸形（registry 为字符串等）时降级为 {}，与"不崩引擎"注释一致
  const regOverrides = (overrides.registry && typeof overrides.registry === 'object' && !Array.isArray(overrides.registry)) ? overrides.registry : {};
  const cleanReg = { ...b.registry, ...regOverrides };
  if ('metrics' in regOverrides) cleanReg.metrics = metrics !== null ? metrics : [];
  if ('refs' in regOverrides) cleanReg.refs = refs !== null ? refs : [];
  return {
    name: overrides.name || b.name,
    registry: cleanReg,
    banned,
    channel: { ...b.channel, ...(overrides.channel || {}) },
    allowTokens: [...new Set([...(b.allowTokens || []), ...(safeStrArray(overrides.allowTokens, 'allowTokens') || [])])]
  };
}

const LEVEL_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, pass: 9 };

function pack(id, name, icon, findings) {
  let sev = 'pass';
  findings.forEach((x) => { if (LEVEL_RANK[x.level] < LEVEL_RANK[sev]) sev = x.level; });
  return { id, name, icon, findings, sev };
}

// G1 引用可溯源
function g1(doc, cfg) {
  const f = []; const content = doc.text;
  const REG = cfg.registry, AT = cfg.allowTokens || [];
  // 引用 token 扫描：抓裸 `[n]`/`[key]` 型引用；用负向预查 `(?!\()` 排除 `[文本](URL)` markdown 链接
  // （链接文本如 [CHANGELOG](...) 不是断链引用，否则误报——样例裸 [1] 仍照抓，五裁决不变）。
  const tokens = content.match(/\[([a-zA-Z0-9\-]+)\](?!\()/g) || [];
  tokens.forEach((tk) => {
    const key = tk.slice(1, -1);
    if (!REG.refs.includes(key) && !AT.includes(key))
      f.push({ level: 'P1', snip: tk, issue: `引用 [${key}] 在数据源注册表中查无此文（断链 / 编造来源）`, basis: '引用可溯源', fix: '修正来源编号或补录源数据，或删除该引用' });
  });
  content.split(/\n/).forEach((line) => {
    if (cfg.channel.sourceHint === false) return;
    if (/\d{1,9}(?:\.\d{1,9})?%/.test(line) && !/\[[a-zA-Z0-9\-]+\]/.test(line)) // 数字游程限界：防长数字串起始位置全量回溯 O(n²)（对合法百分比零行为变化）
      f.push({ level: 'P3', snip: line.trim().slice(0, 34), issue: '含数据但本行未挂来源', basis: '数据可溯源（建议）', fix: '为关键数字补充来源编号 [n]' });
  });
  return pack('G1', '引用可溯源', '🔗', f);
}

// G2 版本与数据一致性
function g2(doc, cfg) {
  const f = []; const c = doc.text;
  const REG = cfg.registry;
  // 约定：版本号须带 v 前缀（v2.4.0 / v0.9.1）；据此收紧匹配，避免把 0.07ms、16.2、M8.5 这类测量值/里程碑号误判为版本。
  const vers = [...new Set((c.match(/\bv\d+(?:\.\d+)+/gi) || []).map((v) => v.slice(1)))];
  // 版本允许集：项目可登记权威版本 + 已知历史版本（治理文档合理引用旧版本不算漂移）；缺省仅认 currentVersion（样例基线）。
  const allowVers = (REG.versions && REG.versions.length) ? REG.versions : [REG.currentVersion];
  vers.forEach((v) => {
    if (!allowVers.includes(v))
      f.push({ level: vers.length > 1 ? 'P1' : 'P2', snip: `版本 ${v}`, issue: `出现版本 v${v}，不在版本注册表 [${allowVers.join(', ')}] 内`, basis: '版本漂移检测', fix: '统一为当前权威版本口径，或将该历史版本登记入版本注册表' });
  });
  REG.metrics.forEach((m) => {
    // 指标名来自 project-config（外部输入），先转义正则元字符再拼接：防 'C++' 抛 SyntaxError、'转化率(CVR)' 捕获组被抢导致一致性检测静默失效
    const mEsc = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nums = [...c.matchAll(new RegExp(mEsc + '[^0-9]{0,6}(\\d+(?:\\.\\d+)?%?)', 'g'))].map((x) => x[1]);
    if (new Set(nums).size > 1)
      f.push({ level: 'P0', snip: `${m} = ${[...new Set(nums)].join(' / ')}`, issue: `同一指标 ${m} 出现多个不同取值`, basis: '数据一致性', fix: '核对真实数值，消除前后矛盾' });
  });
  return pack('G2', '版本与数据一致性', '⚖', f);
}

// G3 格式与排版规范
function g3(doc) {
  const f = []; const lines = doc.text.split('\n');
  let prev = 0;
  lines.forEach((ln) => {
    const m = ln.match(/^(#{1,6})\s/);
    if (m) { const lv = m[1].length; if (prev && lv - prev > 1) f.push({ level: 'P3', snip: ln.trim().slice(0, 28), issue: `标题层级从 h${prev} 跳到 h${lv}`, basis: '结构规范', fix: '补齐中间层级，保持递进' }); prev = lv; }
  });
  const eng = (doc.text.match(/[一-鿿][,;:!?](?=[一-鿿\s"）)])|[,;:!?](?=[一-鿿])/g) || []);
  if (eng.length) f.push({ level: 'P3', snip: eng.slice(0, 6).join(' '), issue: `中文语境混用半角标点，共 ${eng.length} 处`, basis: '中文排版规范', fix: '替换为全角标点 ，；：！？' });
  return pack('G3', '格式与排版规范', '✎', f);
}

// G4 广告法合规（渠道开关：内部 / 文学语境文档可关；对外营销物料发布须开）
function g4(doc, cfg) {
  if (!cfg.channel.adLaw) return pack('G4', '广告法合规', '⚠︎', []);
  const f = []; const seen = new Set();
  cfg.banned.forEach((rule) => {
    rule.words.forEach((w) => {
      if (doc.text.includes(w) && !seen.has(rule.cat + w)) {
        seen.add(rule.cat + w);
        const idx = doc.text.indexOf(w);
        const snip = doc.text.slice(Math.max(0, idx - 6), idx + w.length + 4).replace(/\n/g, ' ');
        f.push({ level: rule.level, snip: `…${snip}…`, issue: `${w} — ${rule.cat}`, basis: rule.basis, fix: rule.fix });
      }
    });
  });
  return pack('G4', '广告法合规', '⚠︎', f);
}

// G5 敏感信息与脱敏
function g5(doc) {
  const f = []; const c = doc.text;
  (c.match(/\b\d{17}[\dXx]\b/g) || []).forEach((x) => f.push({ level: 'P0', snip: x.slice(0, 6) + '****', issue: '疑似身份证号明文出现', basis: '个人信息保护', fix: `脱敏为 ${x.slice(0, 6)}********${x.slice(14)}` }));
  [...new Set(c.match(/1[3-9]\d{9}/g) || [])].forEach((p) => f.push({ level: 'P1', snip: p.slice(0, 3) + '****' + p.slice(7), issue: '疑似手机号未脱敏', basis: '个人信息保护', fix: `脱敏为 ${p.slice(0, 3)}****${p.slice(7)}` }));
  // 本地段限界 {1,64}：防长 ASCII 无 @ 串（base64/代码）O(n²) 回溯拖死粘贴大文本；合法邮箱本地段 ≤64 不受影响
  // snip 引擎侧打码（对齐同函数身份证/手机号口径）：回执会逐字引用 snip，明文邮箱不得写入产物
  [...new Set(c.match(/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])].forEach((m) => {
    const masked = m.length <= 8 ? m.slice(0, 1) + '***' : m.replace(/^(.{1,2}).*(@.*)$/, '$1***$2');
    f.push({ level: 'P2', snip: masked, issue: '邮箱明文，建议脱敏', basis: '个人信息保护', fix: '替换为 z***@example.com' });
  });
  (c.match(/(内部成本|成本价|底价)[^。\n]{0,20}/g) || []).forEach((x) => f.push({ level: 'P2', snip: x.slice(0, 20), issue: '疑似内部成本 / 商业秘密', basis: '数据安全', fix: '删除或替换为对外口径' }));
  return pack('G5', '敏感信息与脱敏', '🛡', f);
}

// G6 证据链完整性
function g6(doc) {
  const f = []; const m = doc.meta || {};
  const miss = [];
  if (!m.session) miss.push('Session ID');
  if (!m.created) miss.push('创建日期');
  if (!m.source || m.source === '—') miss.push('数据来源');
  if (miss.length) f.push({ level: miss.length >= 2 ? 'P1' : 'P2', snip: '缺失: ' + miss.join(' / '), issue: '过程元信息不完整：' + miss.join('、'), basis: '可核验 / 可追溯', fix: '补齐元信息块，保证创作过程可查证' });
  return pack('G6', '证据链完整性', '🧾', f);
}

export function runGates(doc, cfg = DEFAULT_CONFIG) {
  return [g1(doc, cfg), g2(doc, cfg), g3(doc), g4(doc, cfg), g5(doc), g6(doc)];
}

export function scoreDoc(gates) {
  let s = 100;
  gates.forEach((g) => g.findings.forEach((x) => { s -= { P0: 25, P1: 12, P2: 5, P3: 2 }[x.level] || 0; }));
  return Math.max(0, Math.min(100, s));
}

export function verdictOf(gates, score) {
  const hasP0 = gates.some((g) => g.findings.some((x) => x.level === 'P0'));
  const hasP1 = gates.some((g) => g.findings.some((x) => x.level === 'P1'));
  if (hasP0 || score < 55) return { k: 'block', t: '阻断发布', c: 'v-block', tag: 't-block' };
  if (hasP1 || score < 85) return { k: 'fix', t: '需修复后发布', c: 'v-fix', tag: 't-fix' };
  return { k: 'ok', t: '可发布', c: 'v-ok', tag: 't-ok' };
}

export function analyze(doc, cfg = DEFAULT_CONFIG) {
  const gates = runGates(doc, cfg);
  const score = scoreDoc(gates);
  return { ...doc, gates, score, verdict: verdictOf(gates, score) };
}

export function flattenFindings(gates) {
  const out = [];
  gates.forEach((g) => g.findings.forEach((x) => out.push({ gate: g.id + ' ' + g.name, ...x })));
  return out.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
}
