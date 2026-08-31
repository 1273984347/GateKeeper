# DESIGN.md · 验收官 设计方案
> 创建日期：2026-08-31
> 来源：验收官项目自审（自我深度审查）
> Session：本次会话 ID 见提交表单留档

> 作品：验收官（代号 GateKeeper）｜队名：一夫当关｜当前版本见 CHANGELOG
> 本文件是**设计层**（为什么这么设计、设计契约与取舍）；工程治理见 README/交接文档/STRUCTURE，演进规划见 ROADMAP.md。

## 1. 设计目标与原则

| 原则 | 含义 | 落到哪 |
|---|---|---|
| 让 AI 产出可信 | 目标不是"再生成一次"，而是给 AI 产物做**确定性验收** | 门禁引擎用规则+正则+语义兜底，不依赖模型自觉 |
| 确定性优先于智能 | 能规则判定的绝不用模型猜，保证可复算、可审计 | 六道门禁全确定性；finding 带依据与修复 |
| 单一事实源 | 规则只有一处定义，前后端共用 | `gates.mjs`；HTML 引擎块由 `sync-gates.mjs` 注入 |
| 可插拔 | 换行业/换项目改配置不改代码 | 违禁词库、注册表、元信息映射、渠道开关皆配置 |
| 单人可运维 | 一个全职选手也能跑通全流程 | 纯离线单文件原型 + Agent 直调 DWS，零部署依赖 |
| 诚实可核验 | 不夸大、不假收敛 | 提效用端到端口径；真实案例如实暴露误报与缺口 |

## 2. 信息架构 · 三层设计

```
gates.mjs  ── 唯一规则源（纯逻辑，无 DOM/无 IO）
   ├─ gatekeeper.html   呈现层：健康环/门禁卡/粘贴检测/编排可视化
   └─ dws-bridge.mjs    编排层：裁决 → dws 命令计划（Agent 直接执行）
        └─ run-real.mjs 真实场景适配层：外部文档 schema → 门禁 meta 映射
```

**为什么这么切**：呈现与编排都消费同一份 `gates.mjs`，杜绝"前端说通过、后端说阻断"的分裂；`sync-gates.mjs --check` 作漂移门禁，把"单一事实源"从约定升级为可拦截。

## 3. 门禁体系设计

每道门禁 = 一个纯函数 `g(doc) → {id,name,icon,findings[],sev}`，`sev` 取 findings 最高级。

| 门禁 | 设计意图 | 输入契约 | 裁决 |
|---|---|---|---|
| G1 引用可溯源 | 抓"编造来源/断链"——AI 最常见的幻觉 | `[n]` 标记 vs 注册表 refs | 断链 P1；数据无来源 P3 |
| G2 版本与数据一致性 | 抓"跨文档漂移/同指标矛盾" | 版本 token、指标数值 | 多值矛盾 P0；漂移 P1/P2 |
| G3 格式与排版 | 结构/标点规范 | 标题层级、半角标点 | P3 提示 |
| G4 广告法合规 | 8 类违禁词逐句扫描 | BANNED 词库 | 极限词 P0/P1/P2 |
| G5 敏感信息脱敏 | 抓 PII/商业秘密 | 手机号/身份证/邮箱/成本正则 | 身份证 P0；手机号 P1 |
| G6 证据链完整性 | 可核验性（创作过程可查证） | meta.session/created/source | 缺≥2 项 P1，缺 1 项 P2 |

**裁决模型**：`score = 100 − Σ(P0×25,P1×12,P2×5,P3×2)`；`verdict`：任一 P0 或 <55 → 阻断；有 P1 或 <85 → 需修复；否则可发布。分级既给红绿灯，又保留"为什么"（每条 finding 带依据 + 修复）。

## 4. 编排设计（DWS）

三链路条件分支（详见 prototype/README-DWS.md）：可发布→归档文档+群播报+复核待办+DING 催办；需修复→作者待办+群提醒；阻断→P0 待办+驳回告警。

**关键设计取舍**：钉钉 `dws oa` 不能新建审批实例，故"审批门"用**复核待办 + DING 催办**承载（能力边界内的正确实现），而非假装能凭空建审批。机器人「AI小钉」非自定义模板 → 群发改用户身份 `chat message send`。

## 5. 视觉设计系统（故宫数字馆藏 × Linear 信息密度）

**色板 tokens**（`gatekeeper.html :root`）：
- 纸 `--paper #f4f1ea`（宣纸底）· 卡 `--card #fffdf9` · 墨 `--ink #1b1f24` · 线 `--line #e2ddd2`
- 朱砂 `--cinnabar #b23a2e`（主强调/阻断）· 赭 `--ochre #b8860b`（告警）· 青玉 `--jade #2f6b52`（通过）
- 分级色：P0 朱砂 / P1 橙 / P2 赭 / pass 青玉

**字体层级**：标题用衬线（Georgia / Songti SC / SimSun，馆藏气质）；正文用无衬线（system / 微软雅黑，Linear 密度）；数据用等宽（mono）。

**布局与密度**：顶部 sticky 工具栏 → 批次健康环 + 门禁命中条 + 问题分级计数 → 左产出物列表 / 右门禁卡双列 → 底部 DWS 编排链。信息密度优先，留白克制。

**风格约束**：flat 设计，无渐变/重阴影；装饰性伪元素不入 DOM 计数；离线可跑（系统字体、无 CDN、无 localStorage，数据全在 JS 常量）。

## 6. 数据模型

```
Doc   { id, name, type, author, authorUserId, meta{session,created,source}, text }
Finding{ level(P0..P3), snip, issue, basis, fix }
Gate   { id, name, icon, findings[], sev }
Registry{ currentVersion, refs[], metrics[] }   // 可插拔：换项目改这里
BANNED [ {cat, level, basis, words[], fix} ]     // 8 类，可扩展
```

## 7. 关键设计决策与诚实记录

- **默认配置面向脱敏样例**：真实项目（如西游记 docs 的 `轨标/核验状态` schema）需经 `run-real.mjs` 做元信息映射 + 渠道开关（广告法门禁仅营销/发布场景启用），否则会把文学语境"第一/唯一"误判为违规。这是**已知设计边界**，不是 bug。
- **提效口径诚实法**：端到端 = 扫描（实测 ms）+ DWS 编排（实测 ~0.5s/动作）；人工基线标为假设区间；**禁用"纯算力 ÷ 人脑时间"的倍数**（曾算出 44 万倍属误导）。
- **反模式清单**：禁硬编码漂移数字（用引用式）；禁假收敛（改后必 Grep/`--check` 核验）；禁把已公开作品当新作提交。

## 8. 相关文件

`gates.mjs`（规则）· `gatekeeper.html`（呈现）· `dws-bridge.mjs`（编排）· `run-real.mjs`（真实适配）· `sync-gates.mjs`（单一事实源门禁）· `bench.mjs`（实测）· `ROADMAP.md`（演进）
