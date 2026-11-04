# 目录结构 · GateKeeper
> 创建日期：2026-08-31
> 来源：AI 产出治理项目自审（自我深度审查）
> Session：会话 ID 见 git 提交记录

> 当前版本见 [CHANGELOG.md](CHANGELOG.md) 顶部（唯一权威，本文件不复制版本号）。本文件描述结构；文件计数用引用式表述（`ls`/`find` 实测为准），不硬编码易漂移数字。

## 顶层结构

```
GateKeeper/
├── README.md            项目门面
├── LICENSE              Apache-2.0（2026 GateKeeper contributors）
├── DESIGN.md            设计方案（设计层：目标/架构/门禁契约/视觉/数据模型/取舍）
├── ROADMAP.md           后续发展与迭代路线图（路线层，里程碑编号权威）
├── CHANGELOG.md         正向时间线 · 唯一写细节 · 四件套
├── STRUCTURE.md         本文件
├── 配置切换Demo.md       三配置三结论可推广性 demo + 介绍话术
├── .github/workflows/   gatekeeper.yml —— CI 门禁（漂移双检 + verify + check-docs + project-check）
├── assets/brand/        品牌资产（lockup 明暗双版 SVG，README 头图；设计探索稿与参数化生成器本地维护不入库）
├── docs/方法论/          方法论文档库（8 篇：E1铁律/单一事实源与注入漂移/doc-sync口径体检设计/管道会吞退出码/正则锚定语境/改动面审计/诚实口径与假设区间标注/可选配置形参保零回归）
└── prototype/           可运行原型与编排
```

> **不入库说明（v0.21.4 公开整备批）**：维护者本地的 AI 协作文档（CLAUDE.md/AGENTS.md/交接文档/启动Prompt/`.agents/`/`.zcode/`）、过程与规格档案（`docs/档案/`、工作复盘报告、UI升级方案、Web端可扩展改造方案）与运行产物（`prototype/output/`、`prototype/screenshots/`）均已在 `.gitignore` 声明，**本地保留、不入库不入公开面**；`lint-workspace` 第四查（防回流探针）确保上述路径永不回到跟踪面。

## prototype/ 子目录

```
prototype/
├── gates.mjs            六道门禁引擎（单一事实源，纯逻辑；被后端 import、被 sync 注入 HTML）
├── gates.test.mjs       引擎单元/负样本测试（node:test 零依赖；含 O(n²) 正则性能防线，CI 接入）
├── sync-gates.mjs       把 gates.mjs 注入 HTML 引擎块 + `--check` 漂移门禁
├── sync-configs.mjs     把 configs/*.json + 批次数据注入 HTML 配置/数据块 + `--check` 第二道漂移门禁
├── render-core.mjs      渲染纯函数（esc/highlight/scoreColor；单一事实源第三链）
├── parse-meta.mjs       `> 键：值` 元信息块解析单一实现（project-check/real-batch-audit 共用；v0.21.5 收敛）
├── sync-render.mjs      把 render-core.mjs 注入 HTML 渲染块 + `--check` 第三道漂移门禁
├── render-core.test.mjs 渲染纯函数单测（9 例；与 gates.test.mjs 同栈）
├── verify.mjs           回归红线 + 换配置差异统一验收（本地 / CI 共用）
├── real-batch-audit.mjs 真实批次体检（对一批真实文档跑门禁→批次级报告·M9 实效证据）
├── human-baseline.html  人工基线采集器（自计时+自动判分；?set=B 作者盲测新样本集）
├── audit-configs/       真实批次体检用的生产级 config（如 xiyouji.json·映射真实 schema）
├── gatekeeper.html      可视化治理控制台单文件应用（引擎块 + 配置/数据块由 sync 注入，标记区勿手改）
├── dws-bridge.mjs       裁决 → dws 命令编排（dry-run / --live 生成 dws-plan.sh）
├── project-check.mjs    换 project-config 体检真实文档（--compare 对照默认配置）
├── check-docs.mjs       提交前门禁：全部核心文档 self-config 体检，任一非可发布 exit 1
├── tools/               开发工具（复盘报告 SK-01/03 沉淀）
│   ├── gate.mjs         门禁一键门卫：全量门禁串行+汇总+失败定位（--full 追加 bench/dry-run；项数以源内 gates 数组为准）
│   ├── smoke.mjs        前端冒烟标准化：七项清单（0 error/粘贴全链路/快捷键/④阻断态禁用/④b放行态toast/暗色/640）
│   ├── RELEASE-CHECKLIST.md  发布闭环检查表（10 项，周期事故反向成表；第 10 项=视觉验收）
│   ├── VISUAL-ACCEPTANCE.md  视觉验收闭环（五步/验收 Prompt 模板/像素采样；M14-T1，UI 变更必走）
│   ├── doc-sync.mjs      文档口径体检：代码真值反拍文档当前态声明（M15-T1，门序列第八门；--json 供 CI）
│   ├── test-docsync.mjs  doc-sync 纯函数自测 36 例（正反例含豁免标记）
│   ├── lint-links.mjs    全仓链接体检：站内存在性+越仓即红（M16-T1，门序列第九门；行级豁免标记）
│   ├── test-lint-links.mjs lint-links 纯函数自测 15 例
│   ├── lint-workspace.mjs 工作区体检：垃圾文件/STRUCTURE 树声明/gitignore 覆盖（门序列第十门）
│   ├── test-lint-workspace.mjs lint-workspace 纯函数自测 13 例
│   ├── class-audit.mjs  class/#id 集合对拍（基线 ⊆ 实测，只增不删；M19 A11，门序列第十一门）
│   ├── lint-ui.mjs      A 系列声明级判据（A2–A8/A12/A13：字号/圆角/hover 位移/焦点态/语义色/等宽/体积/衬线残留；纯文本解析，可进 CI，门序列第十二门）
│   ├── test-lint-ui.mjs lint-ui 纯函数自测 13 例（正样本 + 逐条负样本）
│   ├── lint-layout.mjs  布局结果判据（AL1–AL11，DOM 实测型而非 CSS 文本解析；M20，门序列第十三门；--json）
│   ├── test-lint-layout.mjs lint-layout 纯函数自测 12 例（正样本 + 逐条负样本）
│   ├── geo-probe.mjs    几何基线探针（三档视口盒子实测；换肤/重排后复测 AL2/AL4/AL5）
│   ├── contrast-probe.mjs 对比度体检（亮/暗两态实算，低于 WCAG AA 即红）
│   ├── shot.mjs         UI 截图留档（<前缀> <主题>；整页 + 横向溢出采样）
│   ├── human-baseline-check.mjs 人工盲测冷跑「开跑前自检」（样本集结构/冷跑独立性/采集器可跑性；只验工具链，不代填人工数据）
│   ├── release.mjs       收官执行器：registry→重注入→版本行→十三门→手工步骤清单（A-02；--dry-run/--verify；不自动 commit）
│   └── test-release.mjs  release 纯函数自测 18 例
├── bench.mjs            省时实测基准（召回/误报/耗时）
├── configs/             声明式 project-config（版本注册表/引用/指标/渠道开关/字段映射）
│   ├── gatekeeper-self.json / ecommerce-marketing.json / xiyouji.json  三套对照配置
│   └── batches.sample.json  多项目批次数据（3 项目 9 篇，注入 HTML 供前端消费）
├── artifacts.sample.json 输入样例：5 份脱敏产出物 A–E
├── config.dws.json      DWS 目标 ID 占位符（群/复核人/作者/审批人；真实值本地填入勿提交）
├── README-DWS.md        DWS 接入指南与执行模型
├── 人工实测对照表.md      人工审核耗时对照实测表（human-baseline 采集器的纸质兜底与判分口径）
├── screenshots/         UI 测试截图（本地生成，已 gitignore 不入库；`tools/shot.mjs` 重生成） <!--lint-workspace:exempt 本地生成目录，公开克隆不存在-->
└── output/              运行产物（本地生成，已 gitignore 不入库；accept-*/gate-report/dws-plan/bench-report/real-batch-*/project-check-* 等，均可由对应脚本重生成） <!--lint-workspace:exempt 本地生成目录，公开克隆不存在-->
```

## 命名规范

- 治理文档用固定名（README/CHANGELOG/STRUCTURE），便于跨项目接手。
- 脚本 `.mjs`（ESM）；产物统一落 `output/`；截图落 `screenshots/`。
- 样例产出物 id 用单字母 A–E，与报告一一对应。
- 里程碑 `M#`（区别于西游记 `W#`）；版本 `vX.Y.Z`。

## 单一事实源约定

| 事实 | 唯一权威位置 | 其他文档 |
|---|---|---|
| 版本号 | CHANGELOG 顶部 | README 抬头引用式同步 |
| 门禁规则 | `gates.mjs` | HTML 引擎块由 `sync-gates.mjs` 生成（勿手改）；`--check` 防漂移 |
| 配置/批次数据 | `configs/*.json` | HTML 配置/数据块由 `sync-configs.mjs` 生成（勿手改）；`--check` 防漂移；前端不硬编码项目 |
| 计数（样例数/门禁数/图数） | 脚本实测 / `find` | 一律引用式表述，禁硬编码 |
| 实测数字 | `bench.mjs` 实时输出（output/ 本地生成不入库） | README 核心指标引用 |

## 归档约定

- `CHANGELOG.md` 超过约 50KB 时，把过期里程碑归档到同名 `-archive.md`，主文件只留现役。
- 历史细节只进 CHANGELOG；方法论沉淀只留可复利经验，不留流水账。

## 版本变更

见 [CHANGELOG.md](CHANGELOG.md)。
