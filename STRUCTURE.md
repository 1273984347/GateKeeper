# 目录结构 · 验收官（GateKeeper）
> 创建日期：2026-08-31
> 来源：验收官项目自审（自我深度审查）
> Session：本次会话 ID 见提交表单留档

> 当前版本 v0.12.0（权威见 CHANGELOG）。本文件描述结构；文件计数用引用式表述（`ls`/`find` 实测为准），不硬编码易漂移数字。

## 顶层结构

```
GateKeeper-参赛作品/
├── README.md            项目门面（双读者：评审 / 接手 Agent）
├── 01-参赛蓝图.md        初赛提交正文（作品文档，非治理文档）
├── DESIGN.md            设计方案（设计层：目标/架构/门禁契约/视觉/数据模型/取舍）
├── UI升级方案.md         界面美化升级规格（量化验收/设计令牌/自检结论）
├── Web端可扩展改造方案.md  web 端三层治理控制台改造规格（四痛点/分期/风险/待拍板）
├── ROADMAP.md           后续发展与迭代路线图（路线层，里程碑编号权威）
├── CHANGELOG.md         正向时间线 · 唯一写细节 · 四件套
├── 交接文档.md           接手主入口（进度/下一步/方法论/雷区）
├── STRUCTURE.md         本文件
├── 社媒分享文案.md        1000 积分社媒任务材料
├── 录屏脚本与提交清单.md    Demo 录屏脚本 + 报名/提交核对清单
├── .github/workflows/   gatekeeper.yml —— CI 门禁（漂移双检 + verify + check-docs + project-check）
└── prototype/           可运行原型与编排
```

## prototype/ 子目录

```
prototype/
├── gates.mjs            六道门禁引擎（单一事实源，纯逻辑；被后端 import、被 sync 注入 HTML）
├── sync-gates.mjs       把 gates.mjs 注入 HTML 引擎块 + `--check` 漂移门禁
├── sync-configs.mjs     把 configs/*.json + 批次数据注入 HTML 配置/数据块 + `--check` 第二道漂移门禁
├── verify.mjs           回归红线 + 换配置差异统一验收（本地 / CI 共用）
├── gatekeeper.html      可视化治理控制台单文件应用（引擎块 + 配置/数据块由 sync 注入，标记区勿手改）
├── dws-bridge.mjs       裁决 → dws 命令编排（dry-run / --live 生成 dws-plan.sh）
├── project-check.mjs    换 project-config 体检真实文档（--compare 对照默认配置）
├── check-docs.mjs       提交前门禁：11 份核心文档 self-config 体检，任一非可发布 exit 1
├── bench.mjs            省时实测基准（召回/误报/耗时）
├── run-real.mjs         真实业务场景 runner（读真实文档 → 门禁 → 报告）
├── configs/             声明式 project-config（版本注册表/引用/指标/渠道开关/字段映射）
│   ├── gatekeeper-self.json / ecommerce-marketing.json / xiyouji.json  三套对照配置
│   └── batches.sample.json  多项目批次数据（3 项目 9 篇，注入 HTML 供前端消费）
├── artifacts.sample.json 输入样例：5 份脱敏产出物 A–E
├── config.dws.json      真实 DWS 目标 ID（群/复核人/作者/审批人 openDingTalkId）
├── README-DWS.md        DWS 接入指南与执行模型
├── 人工实测对照表.md      同事实测人工耗时对照表
├── output/              运行产物（可由脚本重生成）
│   ├── accept-A..E.md   每份验收报告（doc create 归档正文）
│   ├── gate-report.json 批次裁决汇总
│   ├── dws-plan.sh      生成的 dws 执行计划
│   ├── live-evidence.md 真实 DWS 落地回执（含端到端计时锚点）· demo 模式结果态数据源
│   ├── real-case-report.md 真实文档体检报告
│   └── bench-report.md  实测数据报告
└── social/              社媒配图（Playwright 真实截图，非 AI 生成）
    ├── ui-1280/1024/640.png  控制台三档响应式截图
    ├── 01-dashboard.png 批次健康环
    ├── 02-gates-A.png   六道门禁明细（G4 亮红）
    ├── 02a-verdict.png  单份裁决条
    └── 03-dws-E.png     DWS 编排链路
```

## 命名规范

- 治理文档用固定名（README/CHANGELOG/交接文档/STRUCTURE），与西游记项目一致，便于跨项目接手。
- 脚本 `.mjs`（ESM）；产物统一落 `output/`；配图落 `social/`。
- 样例产出物 id 用单字母 A–E，与蓝图/报告一一对应。
- 里程碑 `M#`（区别于西游记 `W#`）；版本 `vX.Y.Z`。

## 单一事实源约定

| 事实 | 唯一权威位置 | 其他文档 |
|---|---|---|
| 版本号 | CHANGELOG 顶部 | README 抬头、交接文档「一」引用式同步 |
| 门禁规则 | `gates.mjs` | HTML 引擎块由 `sync-gates.mjs` 生成（勿手改）；`--check` 防漂移 |
| 配置/批次数据 | `configs/*.json` | HTML 配置/数据块由 `sync-configs.mjs` 生成（勿手改）；`--check` 防漂移；前端不硬编码项目 |
| 计数（样例数/门禁数/图数） | 脚本实测 / `find` | 一律引用式表述，禁硬编码 |
| 实测数字 | `output/bench-report.md` | 蓝图第五节引用 |
| DWS 回执 | `output/live-evidence.md` | 蓝图第四节引用 |

## 归档约定

- `CHANGELOG.md` / `交接文档.md` 超过约 50KB 时，把过期里程碑归档到同名 `-archive.md`，主文件只留现役。
- 历史细节只进 CHANGELOG；交接文档「三、方法论沉淀」只留可复利经验，不留流水账。

## 版本变更

见 [CHANGELOG.md](CHANGELOG.md)。
