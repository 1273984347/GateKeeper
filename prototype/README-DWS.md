# DWS 接入指南 · GateKeeper 发布编排

> 本目录把「AI 产出验收流水线」从浏览器可视化，接到真实钉钉办公面（DWS）。
> 三层共享同一套门禁规则，改一处、前后端一致。

## 架构

```
gates.mjs  ── 六道门禁引擎（单一事实源，纯逻辑）
   ├── gatekeeper.html   前端可视化：健康环 / 门禁卡 / 粘贴检测 / 审批流演示
   └── dws-bridge.mjs    后端编排：裁决 → 真实 dws 命令（审批/待办/群机器人/知识库/日志）
            │
            ├── artifacts.sample.json   输入：一批 AI 产出物（脱敏模拟数据）
            ├── config.dws.json         目标 ID：机器人 / 群 / 复核人 / 作者 / 归档目录 / 日志模版
            └── output/                 产物：gate-report.json + accept-*.md（每份验收报告）
```

裁决分三条链路自动编排：

| 裁决 | 触发条件 | DWS 动作 |
|---|---|---|
| ✅ 可发布 | 无 P0/P1 且健康分 ≥85 | 归档知识库(`doc create`) → 群机器人播报(`chat send-by-bot`) → 建复核待办(`todo create`) |
| ⚠️ 需修复 | 有 P1 或健康分 <85 | 建作者待办(带截止) → 群提醒 @作者；不自动发布 |
| 🚫 阻断 | 命中任一 P0 或健康分 <55 | 建作者 P0 待办(最高优) → 驳回告警 @作者 →（可选）Webhook 广播 |

## 第一步：登录钉钉

当前连接器未登录。请在 **千问办公 → 设置 → 连接器** 里完成钉钉登录（扫码/授权）。登录后 `dws profile list --format json` 能返回你的 `corpId:userId` 即成功。

## 第二步：填 config.dws.json（登录后查询真实 ID）

> 命令语法以登录后 `dws <cmd> --help` 为准；下列为查询入口。

| 字段 | 怎么拿 |
|---|---|
| `approverUserId` / `authorUserId` | 找人：`dws aisearch person --keyword "张三" --format json` 或 `dws contact` 用户查询，取 `userId` |
| `groupOpenConversationId` | 搜群：`dws chat group search --keyword "发布群" --format json`，取 `openConversationId` |
| `robotCode` | 机器人：`dws chat` 机器人搜索；机器人须已在目标群内（否则先 `dws chat group members add-bot`） |
| `archiveFolderId` | 归档目录：`dws doc` 浏览 / `dws wiki` 取文档目录节点 ID |
| `reportTemplateId` | 日志模版（可选）：`dws report template list --format json` |
| `webhookToken` | 可选：群自定义机器人 Webhook token，用于阻断时 @所有人 广播 |

## 第三步：运行

```bash
cd prototype

# 演练：打印将执行的真实命令序列，并生成 output/dws-plan.sh（现场演示用这个）
node dws-bridge.mjs

# 生成执行计划（--live 不再由脚本 spawn 执行，见下）
node dws-bridge.mjs --live
```

> **执行模型（关键）**：在千问办公里，`dws` 的宿主端执行由 Bash 工具的 PostToolUse 钩子触发——**只有 Agent 直接调用 `dws` 才会真正落到钉钉**；被 Node 子进程 spawn 时钩子不激活，只返回 `pending-post-tool-use` 占位符。所以正确闭环是：`dws-bridge` 生成计划 → **Agent 按 `output/dws-plan.sh` 逐条直接调用 dws**。这就是"通过 Agent 调用 DWS"的标准执行模型。

**已真实跑通**（回执见 `output/live-evidence.md`）：样例批次判定 可发布 1 / 需修复 1 / 阻断 3，经 Agent 直接调用，在 GateKeeper 组织真实创建了 **5 条待办**、发送 **5 条群消息**、归档 **1 篇钉钉文档**。每份产出物生成 `output/accept-*.md` 验收报告，可直接作为 `doc create --content-file` 的归档正文。

## 现场演示分镜（这段 DWS 编排，约 60 秒）

1. （8s）打开 `gatekeeper.html`，点「运行全量验收」→ 顶部健康环 + P0/P1/P2 计数刷新。
2. （8s）点样例 A「智能客服文案」→ G4 广告法合规亮红，原文「全网第一 / 100%有效」被高亮，附法条与改写建议。
3. （8s）点「粘贴文本检测」，贴一段带手机号+极限词的文本 → 实时跑门禁 → 证明是真实校验不是假数据。
4. （6s）切到 E「可发布」→ 底部 DWS 编排高亮「通过发布」链路；切回 A → 高亮切到「驳回整改」链路。
5. （10s）终端 `node dws-bridge.mjs` → 逐条打印 `dws todo / chat / doc` 命令，生成 `dws-plan.sh`。
6. （12s）切到千问办公对话：Agent 按 `dws-plan.sh` 直接调用 → 现场展示钉钉里真的多出待办、群里收到播报、文档已归档（打开 `live-evidence.md` 的回执链接佐证）。

## 已知限制与工程发现（诚实标注）

- **Agent 直接调用才生效**：`dws` 不能由脚本 spawn 执行（钩子不触发）；编排层负责生成计划，执行交给 Agent。
- **机器人群发受模板限制**：群内「AI小钉」`robotCode=intelligent` 非自定义群发模板，`send-by-bot` 报 400004；本作品改用当前用户身份 `chat message send`。若要机器人身份播报，需先在钉钉开放平台建自定义机器人并 `add-bot` 入群。
- **dws 相对路径坑**：`--content-file` 须用绝对路径（`D:/1/.../output/accept-E.md`），否则报找不到文件。
- **PII 保守多报**：身份证号内嵌手机号段会重复告警（样例 C），属"宁可多报"策略；正式版可加去重/区间屏蔽。
