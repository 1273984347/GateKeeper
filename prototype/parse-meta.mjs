// parse-meta.mjs — `> 键：值` 元信息块解析的单一实现（v0.21.5 收敛）
// 历史：parseDoc 曾在 selfcheck/run-real/real-batch-audit/project-check 各持一份，
//       契约每次演进（如"防跨行吞键名"修复）都要四处同步——收敛成本已实际发生。
// 现消费方：project-check.mjs / real-batch-audit.mjs。修改解析契约只改这里。

/** 提取 `> 键：值` 行为 kv 对象（[^\uff1a:\n] 防跨行吞键名） */
export function parseKv(text) {
  return Object.fromEntries(
    [...text.matchAll(/^>\s*([^\uff1a:\n]+)[\uff1a:]\s*(.+)$/gm)].map((m) => [m[1].trim(), m[2].trim()])
  );
}

/** 按 metaMap 键组从 kv 挑出 meta 三元组（session/created/source），缺省空串 */
export function pickMeta(kv, KEYS) {
  const pick = (arr) => (arr.map((k) => kv[k]).find((v) => v) || '');
  return { session: pick(KEYS.session), created: pick(KEYS.created), source: pick(KEYS.source) };
}

/** 首个 h1 标题，无则回退 fallback */
export function parseTitle(text, fallback) {
  return (text.match(/^#\s+(.+)$/m) || [])[1] || fallback;
}
