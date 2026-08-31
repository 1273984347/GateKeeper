# 更新日志 · 验收官（GateKeeper）

> 正向时间线，**唯一写细节的文件**。每条含「来源 / 执行 / 文件 / 验证 / 状态」四件套。
> 交接文档、README、STRUCTURE 只更新版本号与引用式表述，细节一律指向本文件。
> 约定：版本 `vX.Y.Z` + 里程碑 `M#`；本文件超过约 50KB 时把过期里程碑归档至 `CHANGELOG-ARCHIVE.md`。

## [Unreleased]
- 待办见 [交接文档.md](交接文档.md)「四、待办事项」。

---

### v0.12.0（2026-08-31）：M11 web 端可扩展改造 —— 从单页报表到三层治理控制台

> **来源**：用户反馈"web 端感觉很扁平、没什么可拓展的感觉"。取证确认症结非视觉（M8 已把配色/深度/暗色/字体做厚），而是三处结构性"扁"——① 导航只有一屏（一根到底长滚动，看着像静态报表不像产品）；② 信息只一层深（点文档=换右侧六卡，无下钻/趋势/历史/对比）；③ CLI 早已有的 project-config / metaMap / `--compare` 换配置差异能力，web 端一个没暴露，仍硬编码 5 篇 A–E 样例 + 写死 DEFAULT_CONFIG。经用户"都做"批准，按 P0（导航+下钻）+P1（配置外置+diff）+P2（demo 模式+CI）全量落地。
> - **执行（P0 视图导航层）**：`gatekeeper.html` 引入 `.viewnav` 五视图切换（总览/明细/编排/配置对照/趋势）+ `.crumbs` 五级面包屑（批次›项目›文档›门禁›命中）+ hash 路由（`#/inspect` 等可分享可回退）。CSS 全 additive，旧类名（band/ring/gpill/cols/rail/item/cards/gate/finding/dws/node/lane/step）与响应式/暗色令牌一律保留。
> - **执行（P0 信息架构下钻）**：门禁卡去掉 `slice(0,6)` 截断，改**全量 findings** + 按 P0–P3 级别筛选 chips；命中项可点击**联动定位并高亮原文对应片段**（展开原文 `<pre>` 滚动到命中处）。总览页新增跨项目健康对比卡 + 关键指标网格。
> - **执行（P1 配置/数据外置）**：新建 `configs/batches.sample.json`（3 项目 9 篇，含电商/西游记口径）+ `sync-configs.mjs`（仿 `sync-gates.mjs`，把 `configs/*.json` 与批次数据注入 HTML 的 `GK-CONFIGS-SRC`/`GK-DATA-SRC` 标记块，`--check` 作第二道漂移门禁）；前端 `DOCS`/`DEFAULT_CONFIG` 硬编码全部下沉到注入块——**加演示项目=改 json 跑 sync，不改 HTML**。引擎块与 `gates.mjs` 零改动（`sync-gates --check` 仍绿）。
> - **执行（P1 换配置 diff 视图）**：新增「配置对照」视图，把 CLI `project-check --compare` 可视化——同一批产出物在「样例默认 vs 项目口径」下的命中差异表 + Δ + 被抑制门禁标注（西游记文学语境 G4 命中 2→0 直观呈现），并显式声明"配置是如实描述口径、非刷绿"。
> - **执行（P2 分发两端）**：① `?demo=1` 离线演示模式——`body.demo` 态下编排视图展示 `output/live-evidence.md` 的**真实钉钉回执**（E 链 4 节点 taskId/nodeId/openDingId + 端到端计时），断网可从头演到尾；② `.github/workflows/gatekeeper.yml`——把 `sync-gates/sync-configs --check` + `verify.mjs` + `check-docs.mjs` + `project-check` 封进 CI，"web 一个端"扩到"web + CI 两端"。新建 `verify.mjs` 固化回归红线（环 50/6P0/9P1/8P2/1 可发布/A 阻断0分/E 100/G4 抑制/六 ID 稳定）供本地与 CI 共用。
> - **文件**：prototype/gatekeeper.html（前端层重构：CSS 扩展 + body 五视图 + 渲染/路由 JS，引擎块与字体行未动）、prototype/sync-configs.mjs（新建）、prototype/verify.mjs（新建）、prototype/configs/batches.sample.json（新建）、prototype/configs/gatekeeper-self.json（currentVersion→0.12.0 + 登记版本）、.github/workflows/gatekeeper.yml（新建）、prototype/social/ui-{1280,1024,640}.png（三档截图重生成）、Web端可扩展改造方案.md（本改造规格，新建）、README.md + 交接文档.md + STRUCTURE.md + ROADMAP.md（版本 v0.12.0 + 结构/进度/回写）。
> - **验证**：`sync-gates --check` + `sync-configs --check` 双绿；`verify.mjs` 9 项红线全过（样例批逐字不变）；Playwright（Chromium）实测——控制台 **0 报错**、五视图切换均可见、明细下钻+P0 筛选+命中跳转生效、西游记 diff 2 行、`?demo=1` 编排展示"真实回执"徽章、640px 无横向溢出；三档截图留档。一次性迁移脚本（apply-frontend/_frontend.part/_verify_*）已回收站清理。
> - **状态**：已落地。遗留（如实）：趋势视图当前以 3 项目实时健康分作柱状对比，真正的"批次时间线趋势"须接真实多批次数据（ROADMAP §7 决策闸门：无真实数据不投空图）；桌面壳（Tauri）/钉钉 H5 微应用留长期，未进本次；CI workflow 在共享大仓内不触发，须作品抽出为独立 repo 方生效。

---

### v0.11.0（2026-08-31）：M10 project-config —— 换配置体检不同项目 + 自身文档全量转绿

> **来源**：M8.5 自我 DRL 暴露"引擎默认配置面向脱敏样例、套真实项目会大量误判"；用户批准把"换配置"从运行时手改 REGISTRY 升级为**声明式可加载 project-config**，并把蓝图/交接推到可发布、把可推广性做成可跑 demo。
> - **执行（引擎·零回归）**：`gates.mjs` 改为 `analyze/runGates(doc, cfg=DEFAULT_CONFIG)` 可选配置形参，所有既有调用点不带 cfg 即走样例基线；新增 `makeConfig` 深合并；G2 增「版本注册表」`registry.versions`（治理文档合理引用历史版本不再误判漂移，缺省仅认 currentVersion 保样例行为）；G1「数据未挂来源」提示与 G4 广告法统一归入 `channel` 开关（`sourceHint` / `adLaw`，默认 true）；断链引用 P1、敏感信息 P0/P1 任何配置不豁免。
> - **执行（配置系统）**：新建 `project-check.mjs`——加载 `configs/*.json`，按项目 `metaMap` 解析字段映射跑门禁，`--compare` 对照样例默认配置。建三套 config：`gatekeeper-self`（自身口径，`_why` 逐条说明关哪维·为何）、`ecommerce-marketing`（营销对照·G4/指标点亮）、`xiyouji`（跨项目 schema）。
> - **执行（内容修·非放宽）**：交接文档 "v0.8" → "v0.8.0"（补齐三段式版本，符合 v 前缀规范）；配置切换Demo.md 复跑命令去掉 `[--compare]` 方括号（避免被 G1 误作断链）。
> - **执行（交付物）**：新建 `配置切换Demo.md`（三配置三结论叙事 + 60 秒评委话术 + 复现/扩展指南）与 `答辩交付清单.md`（按评分维度 + 四级状态分级 + 现场验法归档全部交付物）；生成 3 份 `output/project-check-*.md`。**（同日增补·复盘行动项②）**新建 `prototype/check-docs.mjs`——固化 11 份核心文档清单 + self-config + `--strict` 的提交前一键门禁（体检逻辑复用 project-check.mjs 保持单一事实源）；project-check 加 `--strict`（任一非可发布 exit 1）。正样本 11/11 退出 0、负样本（故意漂移文档）退出 1 双向验证。README 快速开始 / 交接索引 / 交付清单自检已接线。
> - **文件**：prototype/gates.mjs（config 形参 + 版本注册表 + sourceHint 渠道）、prototype/gatekeeper.html（sync 重注入）、prototype/project-check.mjs（新建）、prototype/configs/gatekeeper-self.json + ecommerce-marketing.json + xiyouji.json（新建）、prototype/output/project-check-GateKeeper_自身治理文档.md + project-check-电商营销物料(对外发布).md + project-check-详解西游记(内容生产项目).md（新建）、配置切换Demo.md（新建）、交接文档.md（v0.8→v0.8.0 + 复利经验 + 文件索引 + 进度/待办）、README.md + STRUCTURE.md + 答辩速查卡.md（版本 v0.11.0）、prototype/selfcheck.mjs（加退役注记）。
> - **验证**：`sync-gates --check` 通过；样例五裁决**逐字不变**（A 0 / B 49 / C 17 / D 84 / E 100）、`bench` 召回 100% 零误报；负样本 PASS（sourceHint=false 关建议 P3·断链 P1 保留；版本注册表放行历史·当前版本漂移仍报）；self-config 下 **10/10 可发布**（蓝图 95 留一处"内部成本"自指 P2，如实不刷）；ecommerce 对照 **0/2 阻断**（G4 真激活·非永久抑制）；xiyouji **0/3 需修复**（如实报 Session 缺失）。
> - **状态**：已落地。遗留（如实）：蓝图"内部成本"为描述门禁能力时的自指 P2 良性误报，M11 可加词边界；版本/字段/指标口径变动须同步更新对应 config（防配置漂移，同 9.5 一致性规则）。

---

### v0.10.0（2026-08-31）：M8.5 答辩就绪 —— 自我 DRL 验收 + 答辩彩排套件

> **来源**：对标上一作品 Vannevar 的推进法做差距分析，识别 GateKeeper 两项真差距——① 装了 deep-review-loop 却从未对自己跑一次 DRL 收敛；② 缺答辩侧彩排套件（Vannevar 有 rehearsal-qa / index-card，GateKeeper 只有录屏脚本）。用户批准落成 M8.5（不占 M9 初赛交付真人项）。
> - **执行（Self-DRL R1）**：`run-real.mjs` 对 7 份核心文档跑六道门禁 → **7/7 判阻断**，`G6 证据链`全线命中（无 Session/创建日期/来源）；`G2` 把 `0.07ms / 16.2ms` 等测量值误判为版本；`G1` 命中正文示例 `[n]/[x]`；`G4` 命中蓝图引用的违规原词。基线留档 `output/self-check-report.md`。
> - **执行（R2-fix）**：给 7 份文档补「证据链元信息块」（`> 创建日期 / > 来源 / > Session` 三行）→ **G6 命中 7 → 0**（专查证据链的工具先补上自己的证据链）。
> - **执行（R3 修 bug）**：自审发现 `gates.mjs` G2 版本正则 `v?\d+\.\d+` 过度匹配 → 收紧为「版本号须带 v 前缀」`\bv\d+(?:\.\d+)+`；`sync-gates.mjs` 重注入 HTML 引擎块。
> - **执行（配置态收敛器）**：新建 `selfcheck.mjs`——套 GateKeeper 自身 project-config（权威版本 + 登记示例 token + 内部文档关闭 G4 渠道开关），产出三段式收敛报告，顺带演示"同一引擎、换配置体检不同项目"。
> - **执行（彩排套件）**：新建 `答辩问答预演.md`（五"生死题" + 现场翻车点防御 + 反问金句，主打"验收官审自己"杀招）与 `答辩速查卡.md`（一页硬数据 + 五问一句话 + 三条诚实红线）。 **（同日增补）**按用户指令参照 Vannevar `rehearsal-demo.md`，把 `录屏脚本与提交清单.md` 第一节从单张 6 镜表升级为三幕六镜·逐镜操作/口播/用时 + 每幕金句收口 + 风险三级备用方案 + 赛前 5 分钟环境清单；self-config 复检仍「可发布 / 100」。
> - **文件**：prototype/gates.mjs（G2 正则收紧）、prototype/gatekeeper.html（sync 重注入）、prototype/selfcheck.mjs（新建）、prototype/output/self-check-report.md（R1 基线）、prototype/output/selfcheck-report.md（三段收敛报告）、01-参赛蓝图.md + README.md + DESIGN.md + ROADMAP.md + 交接文档.md + STRUCTURE.md + 录屏脚本与提交清单.md（各 +证据链 meta）、答辩问答预演.md（新建）、答辩速查卡.md（新建）、README.md + STRUCTURE.md + 交接文档.md + selfcheck.mjs（版本 v0.10.0）。
> - **验证**：`sync-gates --check` 通过；负样本 PASS（`0.07ms`/`M8.5` 不再判为版本，`v2.3`/`v2.4.0` 仍抓）；样例五裁决**逐字不变**（A 0 / B 49 / C 17 / D 84 / E 100）；`bench` 召回 100% / 零误报不变；selfcheck 终态 **5/7 可发布**、2 份如实留"需修复"（不刷绿）。
> - **状态**：已落地。遗留（如实标注）：蓝图/交接正文数字密集未转绿、G1 示例 token、G4 渠道开关 → 归 M10（完善 project-config：权威版本口径 + 版本正则边界 + 渠道配置）。

---

### v0.9.1（2026-08-31）：M8.2 衬线字体子集内嵌（跨机像素一致）

> **来源**：用户指令"把字体嵌入做了"（UI升级方案 §9 第 3 项由"实测无需"升级为"执行嵌入"）。
> - **执行（子集）**：从 `gatekeeper.html` 穷举实际用字（677 字符）→ `py -3 -m fontTools.subset` 处理本机 `NotoSerifSC-VF.ttf`（可变字体）→ `output/notoserifsc-subset.woff2` 265KB / 1095 字形 / **fvar wght 轴保留**（单文件覆盖 200–900 全字重）。
> - **执行（注入）**：base64 内嵌 `@font-face`，独立族名 `GKSerif` 置于 `--serif` 栈首（跨机优先命中嵌入字体，未命中仍降级 SimSun/Songti）；脚本化注入避免手贴大文件出错。HTML 65KB→394KB，本地 file:// 零网络依赖。
> - **执行（取舍）**：Inter/JetBrains Mono **不嵌**——实测本机未装但回退链（Segoe UI/微软雅黑/Consolas）均为各 OS 必备字体，嵌入无可见收益、徒增体积；论证记录于 UI升级方案 §9。
> - **文件**：prototype/gatekeeper.html（@font-face + --serif 栈）、prototype/output/used_chars.txt、prototype/output/notoserifsc-subset.woff2、gatekeeper.html.pre-font.bak（回滚备份）、UI升级方案.md（§9 更新）。
> - **验证**：`sync-gates --check` 通过（引擎块未动）；Playwright——`document.fonts` 报 `GKSerif:loaded`、canvas 宽度 87.9 vs 系统 serif 86.1（证明确用嵌入字体）、0 控制台报错、功能回归通过（环50/A阻断0分/E可发布100分）、暗色下字体生效；截图 `social/ui-light-font.png`、`social/ui-dark-font.png`。
> - **状态**：已落地。§9 三项可选优化全部闭环。

### v0.9.0（2026-08-29）：M8.1 设计系统补全（内联迁移 + 暗色模式 + 字体实测）

> **来源**：用户指令处理 UI升级方案 §9 三项可选优化。
> - **执行（内联迁移）**：新增 `.section-label(.right)/.paste-box/.paste-hint/.paste-ta/.paste-actions/.rail-foot/.mono/.tag.sq` 类，body 静态区 9 处内联 style 全部替换；残留 `[style]` 仅为 JS 动态注入色与 pasteBox 显隐（合法）。
> - **执行（暗色模式）**：`:root[data-theme='dark']` 令牌覆盖 + 13 条硬编码渐变暗色覆盖 + `color-scheme` 双态；默认跟随系统（matchMedia 初始化 + change 监听），顶栏「◐ 主题」按钮手动切换（无 localStorage，会话内切换，规避 artifact 存储限制）。
> - **执行（字体实测）**：canvas 宽度对比法验证解析链——Noto Serif SC 本机已装（标题生效）；Inter/JetBrains Mono 未装，回退 Segoe UI/微软雅黑/Consolas 均本机可用；未装 Noto 的机器落到 SimSun/Songti SC 仍保持衬线。结论：不嵌入子集（保持单文件轻量），跨机像素一致的字集嵌入配方已写入 UI升级方案 §9。
> - **文件**：prototype/gatekeeper.html（style + body + 主题 JS，均在引擎块外）、UI升级方案.md（§9 处置记录）。
> - **验证**：`sync-gates --check` 通过（引擎块未动）；Playwright——0 控制台报错、暗色 bodyBg=rgb(19,21,25)、暗色下功能回归通过（A 阻断 0 分/4P0、粘贴检测正常）、明↔暗切换正常；截图留档 `social/ui-light.png`、`social/ui-dark.png`。
> - **状态**：已落地。§9 三项：1、2 完成，3 实测确认无需改动。

### v0.8.0（2026-08-29）：M8 界面全面美化升级（现代高级感设计系统）

> **来源**：用户指令对 `gatekeeper.html` 全面美化——配色/排版/深度/交互/组件一致性/响应式六项，要求简洁精致现代专业。
> - **执行**：整体替换 `<style>` 设计系统（仅 CSS 层）：暖纸底+双 radial 渐变、玻璃拟态顶栏（blur14+saturate1.4）、衬线渐变品牌字、三级阴影/圆角令牌、四色渐变计数块、健康环 drop-shadow+0.9s 过渡、卡片 hover 上浮+错峰 fadeUp 入场、999px 胶囊徽章、荧光笔 mark、统一 cubic-bezier 缓动、`:focus-visible`/`prefers-reduced-motion`、断点 1024/640。保留全部既有 class 名与 JS、引擎块不动。
> - **文件**：prototype/gatekeeper.html（仅 style）、UI升级方案.md（新建，含量化验收与自检）、prototype/social/ui-1280/1024/640.png（验证截图）。
> - **验证**：`sync-gates --check` 通过；Playwright 实测——控制台 0 报错、玻璃/渐变/动效生效、1280 双列/1024 与 640 单列且无横向溢出、功能回归正确（环50、计数6P0/9P1/8P2/1可发布、A阻断0分4P0、E可发布100分）。
> - **状态**：已落地。已知可选优化（内联 style 残留/暗色模式/内嵌字体）记录于 UI升级方案.md §9，非阻塞。

### v0.7.0（2026-08-29）：M7 补齐设计层与路线层

> **来源**：用户指出缺口——只见提交正文(蓝图)与治理文档，缺一份完整**设计方案**与**后续发展/迭代路线图**；根因是上轮只搬了西游记的治理层，未建其 DESIGN/方案路线层。
> - **执行**：新建 `DESIGN.md`（设计目标原则 / 三层信息架构 / 六道门禁设计契约 / DWS 编排取舍 / 视觉设计系统 tokens / 数据模型 / 诚实设计决策与反模式）与 `ROADMAP.md`（现状基线 / 里程碑节奏 / 短期 M7–M11 赛事路线 / 中期产品化 / 长期愿景 / M 指标演进 / 决策闸门 / 风险依赖）。
> - **文件**：DESIGN.md、ROADMAP.md（新建）。
> - **验证**：内容与既有代码/文档对齐（色板取自 gatekeeper.html 真实 tokens；里程碑与 CHANGELOG M1–M6 一致；决策闸门沿用西游记 judge_gate 思路）；三处版本号同步 v0.7.0。
> - **状态**：已落地。设计/路线层补齐，评审可直接翻这两份看"怎么设计的 + 往哪演进"。

### v0.6.0（2026-08-29）：M6 真实业务场景端到端 + 两份报告归档钉钉

> **来源**：用户「都做」——① 归档录屏脚本；② 开真实业务场景端到端案例（用户未另给素材，取本人真实 AI 协作项目"西游记"docs 作输入，仅作被检对象、非提交该作品）。
> - **执行（归档）**：`dws doc create` 将《录屏脚本与提交清单》归档为钉钉文档（nodeId pGBa2Lm8…）。
> - **执行（真实 runner）**：新建 `prototype/run-real.mjs`——解析真实文档 `> 键：值` 元信息块映射到门禁 meta，跑 `gates.mjs`，输出 `output/real-case-report.md`。对 3 份真实人物分析文档体检：G6 如实暴露"未内联 Session/创建日期"的真实治理债；G4 命中"第一/唯一/最高"等文学语境误报。
> - **执行（端到端）**：真实体检报告再 `dws doc create` 归档钉钉（nodeId LeBq413J…），完成"真实产出物→门禁→报告→钉钉"全链路。
> - **文件**：prototype/run-real.mjs（新建）、prototype/output/real-case-report.md、两份钉钉文档。
> - **验证**：runner 真实读取 xiyouji/docs 文件、结果未粉饰；诚实结论——默认配置面向脱敏样例，真实项目需按自身 schema 配置元信息映射 + 渠道开关（广告法门禁仅营销/发布场景启用），印证规则库可插拔。
> - **状态**：已落地。若需更具代表性的真实案例，待用户提供目标业务场景/素材，按其 schema 配一份 config 再跑。

### v0.5.0（2026-08-28）：M5 端到端计时实测 + 录屏脚本与提交清单

> **来源**：用户指令「两条都做」——① 端到端总时长实测坐实"<10 秒"；② 录屏脚本 + 提交清单。
> - **执行（端到端实测）**：`dws` 不能与 `date` 混排（宿主钩子要求命令体即 dws），改用两次 `doc create` 的 `createTime` 作锚点夹住中间 4 个真实动作（群消息+待办+DING+归档），实测墙钟 ≈ 2s / 4 动作 ≈ **0.5 秒/动作**；单产出物发布链 ≈ 2s，5 份样例全链路 ≈ 7s（含扫描 <10s）。回写蓝图第五节 + `live-evidence.md` 新增"端到端计时实测"段（含锚点 nodeId）。
> - **执行（录屏+清单）**：新建 `录屏脚本与提交清单.md`——6 镜 100 秒逐句口播（含"提示词展示 + 跳转真实钉钉结果"）、初赛提交材料清单、报名/账号字段核对、过程证明留档、提交前自检（材料打不开=出局）、关键时间线。
> - **文件**：01-参赛蓝图.md（第五节实测数字）、prototype/output/live-evidence.md（计时段）、录屏脚本与提交清单.md（新建）。
> - **验证**：计时锚点 createTime 差值取自真实 dws 响应；蓝图/证据数字一致；诚实标注 createTime 秒级精度、人工基线仍为假设区间。
> - **状态**：已落地。剩余需真人：同事实测对照表回填、实际录屏、平台发布、官方报名。

### v0.4.0（2026-08-28）：M4 门禁逻辑单一事实源收敛（排雷）

> **来源**：建 STRUCTURE/交接文档时发现真实隐患——`gatekeeper.html` 内联了一份门禁引擎副本，与 `gates.mjs` 两套并存，将来改规则前后端会漂移（违反单一事实源）。用户指令「开始吧」→ 收敛。
> - **执行（生成器）**：新建 `prototype/sync-gates.mjs`——把 `gates.mjs` 去 `export` 后注入 HTML 的 `GATES-SRC-START/END` 标记区；首次运行自动完成一次性重构（抽出 DOCS/esc、用标记替换手写引擎），之后每次从 `gates.mjs` 再生成；`--check` 为漂移门禁（不一致 exit 1）。
> - **执行（渲染层）**：`gates.mjs` 的 `verdictOf` 补 `c/tag` 字段（后端忽略、供 HTML 用）；HTML 引擎块改为纯逻辑（无 `<b>`），DOM 格式化交给渲染层，finding 字段统一 `esc()`（顺带修掉粘贴功能的 XSS/破版隐患）。
> - **文件**：prototype/sync-gates.mjs（新建）、prototype/gates.mjs（verdictOf 加字段）、prototype/gatekeeper.html（引擎块注入 + 渲染 esc）。
> - **验证**：`node sync-gates.mjs --check` 通过（引擎块 == gates.mjs）；Playwright 真机加载无 JS 报错，行为与重构前完全一致（健康环 50、计数 6P0/9P1/8P2/1可发布、A 阻断 0 分、E 可发布 100 分、粘贴检测正常）；粘贴含 `<img onerror>` 文本经 esc 无注入。
> - **状态**：已落地。改规则的正确姿势：只改 `gates.mjs` → `node sync-gates.mjs` → `--check`。

### v0.3.0（2026-08-28）：M3 省时实测 + 人工对照 + 社媒材料 + 命名定稿

> **来源**：用户指令「跑一次人工 vs 流水线省时实测」「做同事实测对照表」「社媒分享文案」「定队名/作品名」。
> - **执行（实测基准）**：新建 `prototype/bench.mjs`——20 条含 15 处植入《广告法》违规的文案，`process.hrtime` 实测流水线扫描（20/200/2000 规模）+ 召回/误报；人工基线用 30–120s/条**假设区间**换算，端到端口径（扫描+DWS 编排）而非"纯算力比人脑"。
> - **执行（对照表）**：新建 `prototype/人工实测对照表.md`，20 条与 bench 完全一致，含任务说明/逐条记录/计时/答案判分页（遮答案），回填可坐实第五节。
> - **执行（社媒）**：新建 `社媒分享文案.md`（小红书图文≥150字+带话题+数据佐证、微博短版、抖音35s脚本、发布步骤、合规自查）；Playwright 抓 `prototype/social/` 4 张真实产品图作配图。
> - **执行（命名）**：队名定「一夫当关」、作品名定「验收官」，回写蓝图抬头与 `gatekeeper.html` 标题/页脚。
> - **文件**：prototype/bench.mjs、prototype/人工实测对照表.md、社媒分享文案.md、prototype/social/*.png、01-参赛蓝图.md、gatekeeper.html。
> - **验证**：`node bench.mjs` 实跑——召回 100%、零误报、扫描 1.4ms/20；主动删除"快 44 万倍"误导性倍数，改可信口径；截图经 Read 核验清晰。
> - **状态**：已落地。

### v0.2.0（2026-08-28）：M2 三层架构重构 + 真实钉钉 DWS 端到端跑通

> **来源**：用户指令「接真实钉钉 DWS」「接 OA 审批单让链路更完整」。
> - **执行（单一事实源）**：抽出 `prototype/gates.mjs`（六道门禁纯逻辑，前端与后端共用）；`dws-bridge.mjs` 按裁决生成 dws 命令计划，群发节点由 `send-by-bot` 改为用户身份 `chat message send`（内置助理非自定义模板报 400004）；`--live` 改为生成 `output/dws-plan.sh` 并说明"须 Agent 直接调用"。
> - **执行（真实落地）**：Agent 直接调用 dws，在 GateKeeper 组织建 5 条待办、发 5 条群消息、归档 1 篇钉钉文档、发 1 条 DING 催办审批人；`todo list` 回读确认。
> - **执行（OA 边界）**：`dws oa` 无"发起新审批实例"命令，审批门改由「复核待办 + DING 催办」承载；`oa approval list-forms` 验证连接可用。
> - **文件**：prototype/gates.mjs、dws-bridge.mjs、config.dws.json、artifacts.sample.json、output/live-evidence.md、output/dws-plan.sh、README-DWS.md、01-参赛蓝图.md。
> - **验证**：dry-run 三链路命令正确；live 回执含真实 taskId / openTaskId / 文档 nodeId / DING openDingId（见 live-evidence.md）；Node 抽测门禁引擎 + Playwright 真机加载无报错。
> - **状态**：已落地。

### v0.1.0（2026-08-28）：M1 参赛蓝图 + 可视化原型 + 六道门禁引擎

> **来源**：用户问"做什么作品能拿冠军"→ 选定"复用西游记门禁治理经验做 AI 产出治理"方向，指令「写蓝图 + 搭原型」。
> - **执行（蓝图）**：新建 `01-参赛蓝图.md`，按初赛表单四段式 + 五维度自检 + 排期 + 红线；读赛事细则确认权重（实用性30+实效性20=50%）。
> - **执行（原型）**：新建 `prototype/gatekeeper.html` 单文件应用——六道门禁真实正则校验、健康环、P0–P3 分级、粘贴实时检测、DWS 编排可视化；故宫宣纸底×Linear 高密度审美。
> - **执行（样例）**：5 份脱敏样例产出物 A–E，覆盖极限词/版本漂移/断链引用/PII/格式/元信息缺失。
> - **文件**：01-参赛蓝图.md、prototype/gatekeeper.html。
> - **验证**：抽出纯逻辑 Node 单测——五份样例裁决分布正确（阻断3/需修复1/通过1）；Playwright 加载无 JS 报错、交互与条件分支渲染正确。
> - **状态**：已落地。
