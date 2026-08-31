# 验收官 · GateKeeper
> 创建日期：2026-08-31
> 来源：验收官项目自审（自我深度审查）
> Session：本次会话 ID 见提交表单留档

> **队名**：一夫当关　｜　**作品名**：验收官（代号 GateKeeper）
> **一句话**：让 AI 批量产出的文档，规模再大也管得住、查得清、放得行。
> **当前版本**：v0.11.0　｜　**赛事**：千问办公 AI 生产力竞赛（初赛截止 2026-09-20）
> 版本与计数的**唯一权威**见 [CHANGELOG.md](CHANGELOG.md) 顶部 + [交接文档.md](交接文档.md)「一、当前进度」；本文件不内嵌会漂移的数字，用引用式表述。

## 这是什么

把企业里"AI 生成内容/文档之后的质量验收"从人肉抽查，变成一套可配置的**六道门禁**自动化流水线，并接进钉钉真实办公面（DWS）：验收通过自动归档文档、群播报、建审批待办、DING 催办；命中 P0 严重问题则条件分支驳回并 @ 责任人。

## 架构（三层，单一事实源）

```
gates.mjs        六道门禁引擎（纯逻辑，前后端共用的唯一规则源）
 ├─ gatekeeper.html   可视化：引擎块由 sync-gates.mjs 从 gates.mjs 注入（勿手改），DOM 格式化在渲染层
 ├─ sync-gates.mjs    单一事实源生成器 + `--check` 漂移门禁
 └─ dws-bridge.mjs    编排：裁决 → dws 命令计划（--live 由 Agent 直接调用才落地）
      ├─ artifacts.sample.json   输入：一批 AI 产出物（脱敏模拟）
      ├─ config.dws.json         目标 ID：群 / 复核人 / 作者 / 审批人 openDingTalkId
      └─ output/                 产物：accept-*.md 验收报告 · gate-report.json · dws-plan.sh · live-evidence.md · bench-report.md
```

## 快速开始

```bash
cd prototype
node sync-gates.mjs        # 改完 gates.mjs 后跑：把引擎逻辑重新注入 HTML（--check 可作提交前门禁）
node dws-bridge.mjs        # dry-run：打印将执行的真实 dws 命令 + 生成 output/dws-plan.sh
node bench.mjs             # 省时实测：召回/误报/耗时 → output/bench-report.md
# 打开 gatekeeper.html 看可视化；--live 真实落地须由千问办公 Agent 直接调用 dws（见 README-DWS.md）
```

## 文档索引

| 文档 | 作用 |
|---|---|
| [01-参赛蓝图.md](01-参赛蓝图.md) | 初赛提交正文（Demo简介/痛点/方案/实践/实测/自检/排期/红线） |
| [DESIGN.md](DESIGN.md) | 设计方案：目标原则 / 三层架构 / 门禁契约 / 视觉系统 / 数据模型 / 取舍 |
| [UI升级方案.md](UI升级方案.md) | 界面美化升级规格：量化验收标准 / 设计令牌 / 自检结论 |
| [ROADMAP.md](ROADMAP.md) | 后续发展与迭代路线图：短中长期 / 指标演进 / 决策闸门 |
| [CHANGELOG.md](CHANGELOG.md) | 正向时间线，每条含「来源/执行/文件/验证/状态」四件套 |
| [交接文档.md](交接文档.md) | 接手主入口：进度 / 下一步 / 方法论 / 雷区 |
| [STRUCTURE.md](STRUCTURE.md) | 目录结构与命名/单一事实源/归档约定 |
| [prototype/README-DWS.md](prototype/README-DWS.md) | DWS 接入指南与执行模型 |
| [社媒分享文案.md](社媒分享文案.md) | 1000 积分社媒任务材料 |
| [prototype/人工实测对照表.md](prototype/人工实测对照表.md) | 同事实测人工耗时的对照表 |
| [录屏脚本与提交清单.md](录屏脚本与提交清单.md) | Demo 录屏逐镜脚本 + 报名/提交核对清单 |

## 核心指标（引用式，权威值见 CHANGELOG / bench-report）

六道门禁（G1 引用溯源 · G2 版本一致 · G3 格式 · G4 广告法 · G5 敏感信息 · G6 证据链）；对 20 条埋 15 处违规的样例批次，流水线**召回 100%、零误报、扫描毫秒级**；已在真实钉钉组织跑通待办/群消息/文档归档/DING 四类 DWS 动作。详见 `prototype/output/bench-report.md`、`prototype/output/live-evidence.md`。

## 授权与免责

样例与演示数据均为脱敏模拟，不含真实个人信息或商业秘密。广告合规门禁为辅助审核，不替代法务正式审批。
