# GateKeeper
[![GateKeeper CI 状态](https://github.com/1273984347/GateKeeper/actions/workflows/gatekeeper.yml/badge.svg)](https://github.com/1273984347/GateKeeper/actions/workflows/gatekeeper.yml)
> 创建日期：2026-08-31
> 来源：AI 产出治理项目自审（自我深度审查）
> Session：会话 ID 见 git 提交记录

> **一句话**：让 AI 批量产出的文档，规模再大也管得住、查得清、放得行。
> **当前版本**：v0.16.0
> 版本与计数的**唯一权威**见 [CHANGELOG.md](CHANGELOG.md) 顶部 + [交接文档.md](交接文档.md)「一、当前进度」；本文件不内嵌会漂移的数字，用引用式表述。

![GateKeeper 治理控制台](prototype/screenshots/ui-1280.png)

## 这是什么

把企业里"AI 生成内容/文档之后的质量验收"从人肉抽查，变成一套可配置的**六道门禁**自动化流水线，并接进钉钉真实办公面（DWS）：验收通过自动归档文档、群播报、建审批待办、DING 催办；命中 P0 严重问题则条件分支驳回并 @ 责任人。换团队/换行业/换文档类型，改一份 project-config 即可，不改代码。

## 架构（三层，单一事实源）

```mermaid
flowchart TB
    subgraph src["📐 规则层 · 单一事实源（唯一可改处）"]
        GATES["⚙️ gates.mjs ｜ 六道门禁引擎（纯逻辑）"]
        CFG["⚙️ configs/*.json ｜ project-config 项目口径"]
    end

    subgraph sync["🔁 生成与漂移门禁"]
        SYNC["🔄 sync-gates / sync-configs<br/>注入 HTML + --check 防漂移"]
    end

    subgraph web["🖥️ 呈现层"]
        HTML["📊 gatekeeper.html 治理控制台<br/>五视图 · 五级下钻 · 换配置 diff · ?demo=1"]
    end

    subgraph cli["🧪 验收层（本地 / CI 同一套）"]
        TOOLS["✅ verify 回归红线 · gates.test 单测<br/>bench 实测 · check-docs 文档门禁<br/>real-batch-audit 真实批次体检"]
    end

    subgraph dws["📮 编排层 · 钉钉 DWS"]
        BRIDGE["🚀 dws-bridge.mjs<br/>裁决 → dws 命令计划"]
        DWS["📋 待办 · 📣 群播报 · 📄 文档归档 · 🔔 DING 催办"]
    end

    GATES --> SYNC
    CFG --> SYNC
    SYNC --> HTML
    GATES --> TOOLS
    GATES --> BRIDGE
    CFG --> BRIDGE
    TOOLS -- "验收通过 / 驳回" --> BRIDGE
    BRIDGE --> DWS
```

文件级明细：

```
gates.mjs        六道门禁引擎（纯逻辑，前后端共用的唯一规则源）
 ├─ gatekeeper.html   可视化治理控制台：引擎块由 sync-gates 注入、配置/批次数据块由 sync-configs 注入（均勿手改），五视图/下钻/diff 在渲染层
 ├─ sync-gates.mjs    单一事实源生成器（规则）+ `--check` 漂移门禁
 ├─ sync-configs.mjs  单一事实源生成器（配置/数据）：把 configs/*.json 注入 HTML + `--check` 第二道漂移门禁
 ├─ verify.mjs        回归红线 + 换配置差异统一验收（本地 / CI 共用）
 └─ dws-bridge.mjs    编排：裁决 → dws 命令计划（--live 由 Agent 直接调用才落地）
      ├─ configs/*.json          声明式 project-config（版本注册表/引用/指标/渠道开关/字段映射）+ batches.sample.json 批次数据
      ├─ config.dws.json         目标 ID：群 / 复核人 / 作者 / 审批人 openDingTalkId
      └─ output/                 产物：accept-*.md 验收报告 · gate-report.json · dws-plan.sh · live-evidence.md · bench-report.md
```

## 快速开始

```bash
cd prototype
node sync-gates.mjs        # 改完 gates.mjs 后跑：把引擎逻辑重新注入 HTML（--check 可作提交前门禁）
node sync-configs.mjs      # 改完 configs/*.json 后跑：把配置/批次数据注入 HTML（--check 作第二道漂移门禁）
node sync-render.mjs       # 改完 render-core.mjs 后跑：把渲染纯函数注入 HTML（--check 作第三道漂移门禁）
node verify.mjs            # 回归红线 + 换配置差异：环50/6P0/9P1/8P2/1可发布 + G4 抑制，全绿 exit 0
node --test gates.test.mjs # 引擎单元/负样本测试（20 例：门禁行为/配置合并/畸形配置/正则防线/五裁决冗余）
node dws-bridge.mjs        # dry-run：打印将执行的真实 dws 命令 + 生成 output/dws-plan.sh
node bench.mjs             # 省时实测：召回/误报/耗时 → output/bench-report.md
node real-batch-audit.mjs --config audit-configs/xiyouji.json --glob "<真实文档目录>/**/*.md"  # 真实批次体检（--config 与 --glob/文件列表必填）→ output/real-batch-*.md
node check-docs.mjs        # 提交前门禁：全部核心文档 self-config 体检，任一非「可发布」exit 1
node tools/gate.mjs        # ↑五门禁一键串行+汇总（--full 追加 bench/dry-run）；node tools/smoke.mjs 跑前端冒烟六项
# 打开 gatekeeper.html 看治理控制台（总览/明细/编排/配置对照/趋势 五视图 + 五级下钻）；加 ?demo=1 进离线演示模式
# --live 真实落地须由千问办公 Agent 直接调用 dws（见 README-DWS.md）
```

## 文档索引

| 文档 | 作用 |
|---|---|
| [DESIGN.md](DESIGN.md) | 设计方案：目标原则 / 三层架构 / 门禁契约 / 视觉系统 / 数据模型 / 取舍 |
| [UI升级方案.md](UI升级方案.md) | 界面美化升级规格：量化验收标准 / 设计令牌 / 自检结论 |
| [Web端可扩展改造方案.md](Web端可扩展改造方案.md) | web 端从单页报表→三层治理控制台改造规格：四痛点映射 / 分期 / 风险（v0.12.0 已全量实施） |
| [ROADMAP.md](ROADMAP.md) | 后续发展与迭代路线图：短中长期 / 指标演进 / 决策闸门 |
| [CHANGELOG.md](CHANGELOG.md) | 正向时间线，每条含「来源/执行/文件/验证/状态」四件套 |
| [交接文档.md](交接文档.md) | 接手主入口：进度 / 下一步 / 方法论 / 雷区 |
| [STRUCTURE.md](STRUCTURE.md) | 目录结构与命名/单一事实源/归档约定 |
| [配置切换Demo.md](配置切换Demo.md) | 同一引擎换三套配置体检三类项目——"改配置不改代码"的可执行实证 |
| [prototype/README-DWS.md](prototype/README-DWS.md) | DWS 接入指南与执行模型 |
| [prototype/人工实测对照表.md](prototype/人工实测对照表.md) | 人工审核耗时对照实测表（含 human-baseline 采集器使用说明） |
| [docs/工作复盘与优化分析报告-2026-10.md](docs/工作复盘与优化分析报告-2026-10.md) | 2026-10 工作周期复盘：经验/技能/问题/流程优化与行动计划（时点快照） |

## 核心指标（引用式，权威值见 CHANGELOG / bench-report）

六道门禁（G1 引用溯源 · G2 版本一致 · G3 格式 · G4 广告法 · G5 敏感信息 · G6 证据链）；对 20 条埋 15 处违规的样例批次，流水线**召回 100%、零误报、扫描毫秒级**；对 216 篇真实文档批次体检 173 可发布(80%)、218 真实缺口、506 文学误报经配置抑制；已在真实钉钉组织跑通待办/群消息/文档归档/DING 四类 DWS 动作。详见 `prototype/output/bench-report.md`、`prototype/output/live-evidence.md`。

## 授权与免责

样例与演示数据均为脱敏模拟，不含真实个人信息或商业秘密。广告合规门禁为辅助审核，不替代法务正式审批。
