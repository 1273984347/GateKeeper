// render-core.mjs — 渲染层纯函数（M13 可测化：单一事实源第三链，浏览器与 node 单测共用）
// 修改规则同 gates.mjs：只改这里 → `node sync-render.mjs` 重新注入 HTML → `--check` 作漂移门禁。
// 注意：highlight 依赖 gates.mjs 的 BANNED（缺省词表回退）；注入 HTML 时 sync-render 会剥离 import/export，
//       浏览器侧 BANNED 由先注入的引擎块（GATES-SRC）提供全局。

import { BANNED } from './gates.mjs';

// HTML 转义：含引号——esc 同时用于属性上下文（data-snip 等）
export function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// —— 高亮原文命中（按当前口径的违禁词库）——
export function highlight(text, cfg){
  const words=new Set();
  (cfg.banned||BANNED).forEach(r=>r.words.forEach(w=>{ if(text.includes(w)) words.add(w); }));
  if(!words.size) return esc(text);
  // 单遍替换：先转义全文，再按词表（长词优先）一次正则包 <mark>；避免逐词 split/join 改写先前插入的标记
  const re=new RegExp([...words].sort((a,b)=>b.length-a.length).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  return esc(text).replace(re,(m)=>'<mark>'+m+'</mark>');
}

// 健康分配色阈值（与裁决阈值一致：≥85 可发布绿 / ≥55 告警橙 / 其余阻断红）
export const scoreColor=(s)=> s>=85?'var(--pass)':s>=55?'var(--warn)':'var(--p0)';
