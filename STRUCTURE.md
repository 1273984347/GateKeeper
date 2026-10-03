# 目录结构 · GateKeeper
> 创建日期：2026-08-31
> 来源：AI 产出治理项目自审（自我深度审查）
> Session：会话 ID 见 git 提交记录

> 当前版本见 [CHANGELOG.md](CHANGELOG.md) 顶部（唯一权威，本文件不复制版本号）。本文件描述结构；文件计数用引用式表述（`ls`/`find` 实测为准），不硬编码易漂移数字。

## 顶层结构

```
GateKeeper/
├── README.md            项目门面（双读者：使用者 / 接手 Agent）
├── DESIGN.md            设计方案（设计层：目标/架构/门禁契约/视觉/数据模型/取舍）
├── UI升级方案.md         界面美化升级规格（量化验收/设计令牌/自检结论）
├── Web端可扩展改造方案.md  web 端三层治理控制台改造规格（四痛点/分期/风险/待拍板）
├── ROADMAP.md           后续发展与迭代路线图（路线层，里程碑编号权威）
├── CHANGELOG.md         正向时间线 · 唯一写细节 · 四件套
├── 交接文档.md           接手主入口（进度/下一步/方法论/雷区）
├── STRUCTURE.md         本文件
├── 配置切换Demo.md       三配置三结论可推广性 demo + 介绍话术
├── .github/workflows/   gatekeeper.yml —— CI 门禁（漂移双检 + verify + check-docs + project-check）
├── docs/                过程治理文档（时点分析快照，如工作复盘与优化分析报告）
└── prototype/           可运行原型与编排
```

## prototype/ 子目录

```
prototype/
├── gates.mjs            六道门禁引擎（单一事实源，纯逻辑；被后端 import、被 sync 注入 HTML）
├── gates.test.mjs       引擎单元/负样本测试（node:test 零依赖；含 O(n²) 正则性能防线，CI 接入）
├── sync-gates.mjs       把 gates.mjs 注入 HTML 引擎块 + `--check` 漂移门禁
├── sync-configs.mjs     把 configs/*.json + 批次数据注入 HTML 配置/数据块 + `--check` 第二道漂移门禁
├── verify.mjs           回归红线 + 换配置差异统一验收（本地 / CI 共用）
├── real-batch-audit.mjs 真实批次体检（对一批真实文档跑门禁→批次级报告·M9 实效证据）
├── human-baseline.html  人工基线采集器（自计时+自动判分；?set=B 作者盲测新样本集）
├── audit-configs/       真实批次体检用的生产级 config（如 xiyouji.json·映射真实 schema）
├── gatekeeper.html      可视化治理控制台单文件应用（引擎块 + 配置/数据块由 sync 注入，标记区勿手改）
├── dws-bridge.mjs       裁决 → dws 命令编排（dry-run / --live 生成 dws-plan.sh）
├── project-check.mjs    换 project-config 体检真实文档（--compare 对照默认配置）
├── check-docs.mjs       提交前门禁：全部核心文档 self-config 体检，任一非可发布 exit 1
├── tools/               开发工具（复盘报告 SK-01/03 沉淀）
│   ├── gate.mjs         门禁一键门卫：五门禁串行+汇总+失败定位（--full 追加 bench/dry-run）
│   ├── smoke.mjs        前端冒烟标准化：六项清单（0 error/暗色/640/toast/快捷键/粘贴）
│   └── RELEASE-CHECKLIST.md  发布闭环检查表（9 项，周期事故反向成表）
├── bench.mjs            省时实测基准（召回/误报/耗时）
├── run-real.mjs         真实业务场景 runner（读真实文档 → 门禁 → 报告）
├── configs/             声明式 project-config（版本注册表/引用/指标/渠道开关/字段映射）
│   ├── gatekeeper-self.json / ecommerce-marketing.json / xiyouji.json  三套对照配置
│   └── batches.sample.json  多项目批次数据（3 项目 9 篇，注入 HTML 供前端消费）
├── artifacts.sample.json 输入样例：5 份脱敏产出物 A–E
├── config.dws.json      真实 DWS 目标 ID（群/复核人/作者/审批人 openDingTalkId）
├── README-DWS.md        DWS 接入指南与执行模型
├── 人工实测对照表.md      人工审核耗时对照实测表（human-baseline 采集器的纸质兜底与判分口径）
├── screenshots/         UI 截图（Playwright 真实截图，非 AI 生成；README 配图出处，共 11 张）
│   ├── ui-1280/1024/640.png  控制台三档响应式全页
│   ├── ui-light / ui-dark.png  明暗主题（demo 模式）
│   ├── 01-dashboard.png 批次健康环 · 02-gates-A.png 六道门禁明细（G4 亮红）· 02a-verdict.png 单份裁决条 · 03-dws-E.png DWS 编排链
│   └── ui-*-font.png    衬线字体嵌入验证截图（M8.2 存档）
└── output/              运行产物（可由脚本重生成）
    ├── accept-A..E.md   每份验收报告（doc create 归档正文）
    ├── gate-report.json 批次裁决汇总
    ├── dws-plan.sh      生成的 dws 执行计划
    ├── live-evidence.md 真实 DWS 落地回执（含端到端计时锚点）· demo 模式结果态数据源
    ├── real-case-report.md 真实文档体检报告
    ├── bench-report.md  实测数据报告
    └── …等 20+ 项运行产物（project-check-* / real-batch-* / selfcheck 报告 / accept-* 验收报告 / dws-plan.sh / 整改待办 / 字体子集 woff2+used_chars）；woff2/used_chars 为 fontTools 一次性产物，非仓内脚本可重生成
```

## 命名规范

- 治理文档用固定名（README/CHANGELOG/交接文档/STRUCTURE），与西游记项目一致，便于跨项目接手。
- 脚本 `.mjs`（ESM）；产物统一落 `output/`；截图落 `screenshots/`。
- 样例产出物 id 用单字母 A–E，与报告一一对应。
- 里程碑 `M#`（区别于西游记 `W#`）；版本 `vX.Y.Z`。

## 单一事实源约定

| 事实 | 唯一权威位置 | 其他文档 |
|---|---|---|
| 版本号 | CHANGELOG 顶部 | README 抬头、交接文档「一」引用式同步 |
| 门禁规则 | `gates.mjs` | HTML 引擎块由 `sync-gates.mjs` 生成（勿手改）；`--check` 防漂移 |
| 配置/批次数据 | `configs/*.json` | HTML 配置/数据块由 `sync-configs.mjs` 生成（勿手改）；`--check` 防漂移；前端不硬编码项目 |
| 计数（样例数/门禁数/图数） | 脚本实测 / `find` | 一律引用式表述，禁硬编码 |
| 实测数字 | `output/bench-report.md` | README 核心指标引用 |
| DWS 回执 | `output/live-evidence.md` | README / 交接文档引用 |

## 归档约定

- `CHANGELOG.md` / `交接文档.md` 超过约 50KB 时，把过期里程碑归档到同名 `-archive.md`，主文件只留现役。
- 历史细节只进 CHANGELOG；交接文档「三、方法论沉淀」只留可复利经验，不留流水账。

## 版本变更

见 [CHANGELOG.md](CHANGELOG.md)。
