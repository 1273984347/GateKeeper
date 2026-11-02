# doc-sync 口径体检设计

## 来源事故

"门禁流水线条数"文档口径长期漂移：gate.mjs 实为 7-8 门，STRUCTURE/README 等多处仍写"五门禁"（M15-T1 首跑全数捕获）；gate.mjs 标签"verify（13 项）"实为 12 项（M15-T2 抓出）。源仓项目《治理升级方案》P1-P3 同款缺口论证。

## 规则

1. 方向：代码是源、文档是派生物——真值全部机器读取（registry 版本 / gate.mjs 门数 / node --test 单测数 / CORE_DOCS 清单从 check-docs.mjs 源码解析、fail-closed）。
2. 只扫"当前态句式白名单"（宁窄勿误）：README/交接/CHANGELOG 各一类版本句 + 门数句 + 单测句；历史段整体豁免。
3. 历史叙述不改写：确需保留的过期表述用行级豁免标记 `<!--doc-sync:exempt 原因-->`（机器可读、人工可审计）。
4. 每条规则配负样本自证：违例必红、恢复必绿（版本/门数/单测三类均已实证）。

## 验证方法

`node tools/doc-sync.mjs --check` 0 FAIL；`node tools/test-docsync.mjs` 36 例；负样本三连（见 output/doc-sync-first-run.md）。

## 出处

M15-T1/T2（commit 86beaa8/f6328de）；源仓《治理升级方案》P1；上游同款工具 doc-sync.mjs。
