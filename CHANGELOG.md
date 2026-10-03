# 更新日志 · GateKeeper

> 正向时间线，**唯一写细节的文件**。每条含「来源 / 执行 / 文件 / 验证 / 状态」四件套。
> 交接文档、README、STRUCTURE 只更新版本号与引用式表述，细节一律指向本文件。
> 约定：版本 `vX.Y.Z` + 里程碑 `M#`；本文件超过约 50KB 时把过期里程碑归档至 `CHANGELOG-ARCHIVE.md`。

## [Unreleased]
- 待办见 [交接文档.md](交接文档.md)「四、待办事项」。

---

### v0.15.1（2026-10-03）：安全重扫描修复 —— G1 正则 O(n²) / dws 计划注入 / 真实 ID 回流拦截 / 引擎配置校验

> **来源**：claude-security 等价工作流整仓重扫描（7 路研究员 + 三镜头面板 2/3 计票，21 候选确认 20/去重 16 条：3 P1 / 7 P2 / 6 info）。用户指令修掉全部 P1+P2。v0.14.1 七项修复经优先核验全部落地有效。验证方式为本会话组装的动态工作流等价实现（插件官方流水线在本环境不可注册），报告已如实标注。
> - **执行（P1×3）**：① `gates.mjs` G1 百分比正则加数字游程限界 `\d{1,9}(?:\.\d{1,9})?%`——原 `\d+(\.\d+)?%` 对长数字串起始位置全量回溯，实测 400KB 数字串卡死引擎 64 秒（v0.14.1 只堵了同类邮箱正则，此条漏网；合法百分比零行为变化）；`gates.test.mjs` 性能防线补 200KB 纯数字游程 payload（原 base64 payload 数字游程最长 1 字符锁不住此形态）。② `dws-bridge.mjs` 计划注释行压平换行 + `sq()` 换行压平——artifacts 的 id/name 含换行即可向被逐条执行的 `dws-plan.sh` 注入活命令行（面板 PoC 实证）。③ 真实 ID 回流拦截：检测到 config.dws.json 含非占位符 ID 时，计划自动改写 `output/dws-plan.local.sh`（.gitignore 已覆盖）并在产物清单中如实提示——原实现任何一次 dry-run 都会把真实 ID 烘进被 git 跟踪的 `output/dws-plan.sh`（历史泄露即同款机制）。
> - **执行（P2×7）**：`makeConfig` 形状校验（banned 非数组回退默认/规则逐条校验/越界 level 归 P2/空指标名过滤/registry 覆盖键净化——畸形外部配置不再 TypeError 崩溃或让任意文档误判 P0 或命中静默失效）；`sync-configs`/`sync-gates` 注入块 `<`/`>`/U+2028/2029 转义（堵 `</script>` 逃逸的存储型 XSS 面，当前数据无 `<` 故零行为变化）；`sync-gates --check` 标记缺失改 fail-closed（原静默 exit 0，CI 门禁形同虚设；对齐 sync-configs 口径）；`real-batch-audit --todos` 文档标题 sq() 转义（第三方文档标题可注入待执行命令）；dws-bridge 占位符守卫补 reviewerOpenDingTalkId + trim/全角变体 + 删 robotCode 死校验；accept-id 白名单 `[A-Za-z0-9_-]+`（堵路径穿越，对齐姊妹脚本消毒口径）；toast() 内部统一 esc（渲染层最后一个未转义 HTML 汇点，速查文案经 allowHtml 显式豁免）。
> - **执行（顺手清理）**：删 dws-bridge 的 runCmd 死代码（含 shell:true 危险回退分支，防复活即注入面）；CI pull_request paths 补 workflow 自身（info 项择要）。
> - **文件**：prototype/gates.mjs、gates.test.mjs（20 例）、sync-configs.mjs、sync-gates.mjs、dws-bridge.mjs、real-batch-audit.mjs、gatekeeper.html、README.md、交接文档.md、prototype/configs/gatekeeper-self.json、本文件。
> - **验证**：`node --test gates.test.mjs` **20/20**（新增数字游程性能防线 / 畸形配置 / 合法百分比不误伤三组回归）；dws-bridge 冒烟实证——真实 ID 配置 → 计划写 .local.sh 且被跟踪文件零真实 ID、`../evil` id 被拒、换行 name 注入行压平且 `bash -n` 语法通过；`sync-gates/sync-configs --check` 双绿；`verify` 红线全过；`bench` 召回 100% 误报 0；`check-docs` 全部核心文档可发布；Playwright 冒烟 0 error（toast/快捷键/粘贴/暗色/640 全过）。
> - **状态**：已落地。遗留（如实）：6 条 info 中剩余 5 条（bench/run-real 相对路径、q() 展示转义、动态 id 插值、CI action pin SHA）择机处理；邮箱 snip 明文回显（面板未达 2/3 票）经人工复核成立、下轮随引擎侧脱敏口径一并修。

---

### v0.15.0（2026-10-03）：引擎测试基建 —— node:test 单元/负样本套件接入本地与 CI

> **来源**：v0.14.1 四路审计把 XSS 属性注入、G5 邮箱正则 O(n²)、G2 指标正则注入等真问题钉在引擎上——但当时只有 verify.mjs 集成红线兜底，缺单元层防线。按用户圈选的 test-driven-development 方向补齐：给 `gates.mjs` 建一套零依赖单测，把本轮修复逐条变成防回归断言。
> - **执行（测试套件）**：新建 `prototype/gates.test.mjs`（node:test，17 例）——① 每道门禁的正/负样本（G1 markdown 链接不误报、allowTokens 放行、sourceHint 渠道；G2 v 前缀约定/版本注册表/多值 P0；G4 渠道开关与词库结构；G5 四类敏感信息；G6 缺项三态）；② **审计加固回归断言**：`C++`/`转化率(CVR)` 指标名转义后不炸不失效、118KB 无@ASCII 串 <2s 性能防线（实测 18ms，修复前秒级冻结）、G1 引号转义依赖的属性安全由渲染层 esc 单测位（HTML 内）另查；③ 五裁决基线 A0/B49/C17/D84/E100 冗余防线（与 verify 互备）；④ makeConfig 深合并/词表替换/allowTokens 并集；flattenFindings 排序契约。
> - **执行（接线）**：CI workflow 在 verify 后新增 `node --test gates.test.mjs` 步骤；README 快速开始、STRUCTURE 树、交接文档索引同步。
> - **文件**：prototype/gates.test.mjs（新建）、.github/workflows/gatekeeper.yml、README.md、STRUCTURE.md、交接文档.md、prototype/configs/gatekeeper-self.json（0.15.0 + 登记）、本文件。
> - **验证**：`node --test gates.test.mjs` **17/17 全绿**；`sync-gates --check` + `sync-configs --check` 双绿；`verify.mjs` 13 项红线全过；`check-docs` 全部核心文档可发布。
> - **状态**：已落地。遗留（如实）：渲染层（gatekeeper.html 内 esc/highlight/路由）仍靠 Playwright 冒烟脚本人工触发，未进自动断言（单文件 HTML 无模块导出，抽取测试需先做结构拆分，留长期）。

---

### v0.14.1（2026-10-03）：四路并行审计修复 —— XSS 属性注入 / G5 正则 O(n²) / 引擎与解析加固 / 隐私脱敏 / 文档漂移

> **来源**：用户圈选审计类 skill 清单（review-agent/critique/slop-scan/spec-compliance-check/null-safety-audit/css-audit/frontend-performance/privacy-scan/security-best-practices 等），执行"先审计后修复"：4 个并行只读审计（代码质量 / 前端健壮性与性能 / 安全隐私 / 文档-实现一致性）→ 汇总 P0 0 项、P1 8 项、P2 20+ 项 → 本条集中处置。全部修复保持样例五裁决与 bench 召回零回归。
> - **执行（安全·P1）**：① 渲染层 `esc()` 补引号转义（`"→&quot;`、`'→&#39;`）——此前 `data-snip="${esc(...)}"` 属性上下文可被粘贴文本中的引号逃逸（DOM-XSS，攻击链经审计确认完整：粘贴文本 → G4 snip 原文切片 → 双引号属性），一处修复同时消掉"含引号片段定位失效"的伴生 bug；两 HTML 同步加固。② toast 调用点对文档名 `esc()`。
> - **执行（健壮·P1）**：③ G5 邮箱正则本地段加 `{1,64}` 限界——原 `[A-Za-z0-9._%+-]+@` 在长 ASCII 无 `@` 串（base64/代码粘贴）上 O(n²) 回溯，100KB 输入即主线程秒级冻结；合法邮箱不受影响。④ G2 指标名先转义正则元字符再拼 RegExp——防 project-config 指标含 `C++`（SyntaxError 全页白屏）或 `转化率(CVR)`（捕获组被抢、一致性检测静默失效）。⑤ 健康环 stroke 改 `style.stroke`（presentation attribute 里的 `var()` 在 FF/Safari 有兼容退化风险）。⑥ `sync-configs` 注入标记缺失/破损时由"静默写盘报成功"改为 exit 1；`sync-gates` 的 replace 改函数形式（本条修复过程中实际踩坑：gates.mjs 新增的 `'\\$&'` 字面量被字符串版 replace 当 `$&` 特殊模式展开，引擎块被嵌套污染 34KB——已整体重建并把两个 sync 脚本的替换串都改为函数形式杜绝复发）；删 sync-gates 永不触达的一次性迁移死分支 + match 判空。
> - **执行（诚实·P1）**：⑦ `human-baseline` 的"流水线同批 召回 100%"原为与样本集无关的写死文案，实测引擎对盲测集 B 仅 12/15（3 个新措辞不在 BANNED 词表）——改为按 `BLIND` 分支如实标注"B 集为词表外盲测样本，不作同批对照"，复制块同步。⑧ `bench` 表增**误报实测列**、结论改按实测值条件生成（原"零假阳性/召回 100%"为写死字符串，词表漂移时报告自相矛盾）。⑨ `selfcheck` R1 叙事列改读实测 `def_verdict/def_score`（原写死"阻断（G6 证据链 P1 命中）"，实测 6 份中 ROADMAP 默认裁决是"需修复"）、"7 份"改动态。⑩ `run-real`/`selfcheck` 元信息正则补 `\n` 排除（7e24eb5 同款 bugfix 漏改的两处，跨行吞键名致 G6 假缺失）。
> - **执行（隐私·P1）**：⑪ `config.dws.json` 真实钉钉组织/账号 ID（群 cid / userId / openDingTalkId）占位符化——`dws-bridge` 的 PLACEHOLDER 检测天然支持，live 模式有明确拒绝提示；`live-evidence.md`/`dws-plan.sh`/西游记 `dws-plan.sh`/`整改待办`/`gatekeeper.html` EVIDENCE/交接文档中的**真实人名与 ID 中段打码**（回执锚点 taskId/nodeId 保留可核验）；新增 `.gitignore`（真实配置本地件/`*.bak` 等）；删除含旧品牌残留的 `gatekeeper.html.pre-font.bak`。如实声明：git 历史中仍有旧 ID，属作者本人演示组织账号、已公开存在，**历史重写不在本轮执行**（如需可后续 filter-repo + 作废旧群/账号）。
> - **执行（文档一致性·P1/P2）**：⑫ `STRUCTURE.md` 版本行改引用式（v0.14.0 曾漏更它，一劳永逸）；`DESIGN.md` §5 视觉令牌改引用式（原整段为 M8 之前旧值、方向相反）；`Web端可扩展改造方案.md` 抬头"提案待确认"→"已实施（v0.12.0）"；README 补 `real-batch-audit` 必填参数示例、CHANGELOG 截图计数 8→9、CI 加 `permissions: contents: read` + 演示步骤名与实际一致 + 真实 ID 勿提交提醒。
> - **执行（清理·P2 择要）**：`project-check` 删死函数 realScore + 引擎评分表第三份拷贝 recalc + 同文档重复 analyze（行为逐字等价，check-docs 复算 6/6 不变）；`dws-bridge` 删 send() 死参、步骤措辞去"@"（dws chat send 未接 @ 能力，文案不得虚标）、dueOffsetDays 兜底、报告版本号引 REGISTRY、import 归位；`verify.mjs` 补 B49/C17/D84 逐字断言（兑现"五裁决=回归红线"口径，现 13 项）；`bench`/`run-real` 等 output 相对路径问题记录未动（低危）；hover 粘滞/入场动画重放/手机号正则边界等评估后**有意保留**（见下"遗留"）。
> - **文件**：prototype/gates.mjs（G2 转义 + G5 限界）、verify.mjs（+3 断言）、sync-gates.mjs / sync-configs.mjs（函数式 replace + 快速失败 + 死分支）、project-check.mjs / bench.mjs / run-real.mjs / selfcheck.mjs / dws-bridge.mjs（去死码 + 诚实化 + 加固）、gatekeeper.html（esc/环/守卫/生命周期/highlight/主题/样式）、human-baseline.html（诚实口径 + 加固）、config.dws.json + output 回执与计划（脱敏）、.gitignore（新建）、pre-font.bak（删除）、README.md / DESIGN.md / STRUCTURE.md / 交接文档.md / Web端可扩展改造方案.md / README-DWS.md / .github/workflows/gatekeeper.yml / 本文件。
> - **验证**：`verify.mjs` 13 项红线全过（含新增 B/C/D 逐字断言，样例裁决零改动）；`bench` 召回 100% / 误报 0（20/200/2000 三规模实测，误报列如实为 0）；`sync-gates --check` + `sync-configs --check` 双绿；`check-docs` 全部核心文档可发布；`dws-bridge` dry-run 正常出计划（占位符形态）；全仓 grep 真实 ID/人名零残留；Playwright 冒烟见本轮收尾记录（0 error + 粘贴/toast/主题冒烟）。
> - **状态**：已落地。遗留（如实评估后保留）：触屏 hover 粘滞未包 `@media(hover:hover)`（纯装饰性，桌面优先）；每次 render 门禁卡入场动画重放（视为"动作反馈"设计的一部分）；G5 手机号正则无边界（引擎红线内、现状裁决不变，仅记录）；git 历史含本人演示组织旧 ID（未重写历史）；`?set=Bxx` 已收紧、human-baseline 暗色模式维持明色专用。

---

### v0.14.0（2026-10-03）：M8.3 控制台打磨 —— toast / 键盘导航 / 键盘可达 / 粘贴链路真回归修复

> **来源**：用户指令「继续打磨所有的 HTML 文件内容，可以去 GitHub 上面借鉴学习」。两个 HTML（`gatekeeper.html` 治理控制台 + `human-baseline.html` 人工基线采集器）在既有设计系统（故宫纸色×Linear 密度）内精修；toast 模式借鉴 sonner/Base Web（role=status + hover 暂停自动关闭），键盘导航借鉴 Linear 单键直达 + `?` 速查。
> - **执行（gatekeeper.html · 全 additive，引擎/配置注入块零改动）**：① 3 处原生 `alert()` → 右下角 toast 组件（语义色左边条、`role="status"` 不抢焦点、4.5s 自动消失、hover 暂停、点击即关、至多 3 条堆叠）；② 键盘快捷键——`1–5` 切五视图、`/` 开粘贴检测并聚焦、`T` 明暗主题、`Esc` 收起粘贴框、`?` 呼出快捷键速查，输入态自动让位，vtab/顶栏按钮补 `title` 提示；③ 键盘可达——可点 div（命中项/产出物列表/项目卡/面包屑）补 `tabindex=0+role=button+Enter/Space`，统一 `:focus-visible` 朱砂描边；④ 粘贴检测——字数实时计数 + `Ctrl/Cmd+Enter` 快速体检；⑤ 细节——原文折叠摘要加旋转箭头、命中跳转提示改「点击定位原文」、锚点 `scroll-margin-top:140px` 让位 sticky 顶栏、总览面包屑改显批次名（消除与视图标题文字重复）、趋势视图口径文案改「跨项目健康分对比（时间线待真实批次，无真实数据不投空图）」。
> - **执行（bugfix·真回归）**：Playwright 实测抓出——粘贴检测提交后展示的是文档 A 而非自定义内容。根因：M11 状态化改造后 `btnPaste` 先设 `state.custom` 再调 `goView('inspect')`，而 `goView` 复位 `state.custom=null`，粘贴结果被吞（v0.12.0 起存在，历次验证只覆盖了粘贴开箱与报错分支，未覆盖提交后渲染）。修复：粘贴链路直设 `state/view` 绕过 `goView` 的复位语义。
> - **执行（human-baseline.html）**：设计令牌对齐（圆角三级/阴影两级/统一缓动/`:focus-visible`/`::selection`）；进度卡改 **sticky 悬浮**（计时器 + 已作答进度条始终可见，长页作答不丢秒表）；选项改胶囊、选中态按语义着色（有问题=朱砂/没问题=青玉）；结果页新增大数字结论行（召回率 46px 衬线 + 漏检/误报/耗时）；条目错峰入场动画（`prefers-reduced-motion` 全关）。数据数组与判分逻辑零改动。
> - **执行（截图）**：`screenshots/` 全套重生成（ui-1280/1024/640、ui-light、ui-dark、01-dashboard、02-gates-A、02a-verdict、03-dws-E）；长页截图改「视口高=页高」规避 sticky 拼接痕迹。
> - **文件**：prototype/gatekeeper.html（打磨层 CSS/JS + 粘贴 bugfix + 文案，引擎/配置块未动）、prototype/human-baseline.html（呈现层重写，逻辑零改动）、prototype/screenshots/*.png（9 张重生成）、UI升级方案.md（§10 打磨记录 + 量化验收）、README.md + 交接文档.md + ROADMAP.md（版本 v0.14.0 + 记录）、prototype/configs/gatekeeper-self.json（currentVersion→0.14.0 + 登记）、本文件。
> - **验证**：Playwright（Chromium 1.60）实测——控制台/页面 **0 error**；命中项点击定位原文（details 展开 + sel 高亮）；阻断文档提交 → toast 出现；`4` 键切配置视图、`?` 呼出速查；`/` 开粘贴框 → 字数 24 → Ctrl+Enter → docHead=「自定义粘贴内容」· 阻断发布 26 分 · G4 命中 2 + G5 手机号脱敏；640px 无横向溢出；暗色 bodyBg=rgb(19,21,25)；采集器作答 3 条 → 进度 15% + 选中态着色 + 提交出分正常。`sync-gates --check` + `sync-configs --check` 双绿；`verify.mjs` 红线全过（样例裁决逐字不变）；`check-docs` 全部核心文档可发布。
> - **状态**：已落地。遗留（如实）：趋势视图时间线仍待真实多批次数据（决策闸门不投空图）；human-baseline 暗色模式未做（工具页，明色专用，如需可复用控制台令牌方案）。



### v0.13.0（2026-10-03）：通用化转向 —— 移除参赛期材料，统一更名 GateKeeper

> **来源**：用户指令「不参赛了，改成通用的」。项目从"参赛作品"转向**通用工具**：AI 批量产出的文档质量门禁 + 钉钉办公面（DWS）编排，换团队/换行业改配置即复用。参赛期专属材料（蓝图/答辩套件/社媒/录屏/报名）随之失去维护意义，经确认删除；项目名统一为 **GateKeeper**。
> - **执行（删除参赛期材料）**：移除 `01-参赛蓝图.md`、`答辩交付清单.md`、`答辩速查卡.md`、`答辩问答预演.md`、`社媒分享文案.md`、`录屏脚本与提交清单.md`、`作品描述-验收官-GateKeeper.md`、`作品描述配图/`（git 历史可回溯）。历史条目按中性表述改写，不再列出已移除文件。
> - **执行（统一更名）**：项目名定稿 **GateKeeper**——README/DESIGN/STRUCTURE/ROADMAP/交接文档标题与抬头、`gatekeeper.html` 标题/品牌区/页脚、`gates.mjs`/`run-real.mjs`/`project-check.mjs`/`real-batch-audit.mjs` 注释与报告标题、`batches.sample.json` batchName、`gatekeeper-self.json` _why、human-baseline 页脚同步更名。
> - **执行（定位重写）**：README 改为通用工具门面（补控制台截图、加 `real-batch-audit.mjs` 快速开始行）；ROADMAP 去赛事周期框架——短期=通用化打磨（M7–M12 现状表）、中期=产品化（配置包市场 / MCP 接入飞书·企微·Confluence 多办公面 / 协作权限 / 规则声明式可插拔）、长期=AI 产出治理标准层；交接文档「零/一/二/四/五/六」去参赛化，下一步按 M10 深化 → M11 编排补全 → M12 推广材料 → 中期产品化排序。
> - **执行（门禁清单与配置）**：`check-docs.mjs` 核心文档清单 11→6 份（README/DESIGN/ROADMAP/交接文档/STRUCTURE/配置切换Demo）；`selfcheck.mjs` 缺省清单同步；CI 步骤文案更新。`gatekeeper-self.json` currentVersion→0.13.0 并登记版本谱系；`配置切换Demo.md` 介绍话术与复跑命令改指向现存文档（电商口径演示样本改用 `人工实测对照表.md`，其 20 条营销文案即 G4 真实点亮素材）。
> - **执行（目录与措辞）**：`prototype/social/` → `prototype/screenshots/`（社媒配图→UI 截图，README 引用）；`人工实测对照表.md` 回填指向改 bench-report/README；README-DWS「赛制所述」→「标准执行模型」、「录屏分镜」→「现场演示分镜」；CI 注释通用化。
> - **文件**：README.md、DESIGN.md、ROADMAP.md、STRUCTURE.md、交接文档.md、配置切换Demo.md（重写/通用化）；删除上列 7 文件 + 作品描述配图/；prototype/gates.mjs、run-real.mjs、project-check.mjs、real-batch-audit.mjs、check-docs.mjs、selfcheck.mjs、human-baseline.html、gatekeeper.html、configs/gatekeeper-self.json、configs/batches.sample.json、README-DWS.md、人工实测对照表.md、.github/workflows/gatekeeper.yml（更名/清单/措辞）；prototype/social → prototype/screenshots（更名）；本文件（新增本条 + 历史清洗）。
> - **验证**：`sync-gates --check` + `sync-configs --check` 双绿；`verify.mjs` 回归红线全过（引擎与样例裁决零改动）；`bench` 召回 100% 零误报；`check-docs` 6/6 可发布；全仓 grep 参赛/队名/旧品牌字样零残留（"千问办公"作为 DWS 宿主平台名按技术事实保留）。
> - **状态**：已落地。遗留（如实）：历史条目按中性表述改写、以当时技术事实为准；早期条目中"蓝图第五节"等跨引已改指 README 核心指标。

---

### v0.12.1（2026-08-31）：M9 真实任务证据 + project-check 元信息解析 bugfix

> **来源**：M9「真人实测」遇单人项目约束——无第三方测试者、作者测老样本有先验（必 100% 召回）不可信。确立诚实补强双路径：① 路 1 真实任务证据（不依赖人工秒表）；② 采集器 `?set=B` 作者盲测新样本集（去先验）。本条落地路 1 + 盲测集，并修掉一个影响真实文档解析的老 bug。
> - **执行（真实任务证据·路 1）**：新建 `prototype/real-batch-audit.mjs`——对一批真实文档跑六道门禁、产出批次级体检报告（总览/门禁分布/换配置抑制误报对照/真实缺口抽样/动态结论）。配一份**生产级** `prototype/audit-configs/xiyouji.json`（按西游记 docs 真实 schema：`核验状态`→可追溯字段、`创建于/创建日期`、`引用/来源`；登记其历史版本谱系 v2.0.49→v2.3.11；文学语境关广告法）。跑 **216 篇**真实人物分析文档 → **173 可发布(80%) / 43 需修复 / 0 阻断 / 均分 93 / 218 真实缺口**（43 篇 P1 缺结构化引用/来源 + 173 篇 P2 缺创建日期 + 24 篇 G3 格式）；同批默认口径 506 条文学误报经配置归零。自身核心治理文档 100% 可发布、0 缺口。
> - **执行（盲测集·路 2）**：`human-baseline.html` 加 `?set=B` 全新 20 条样本（措辞全不同、答案键作者未见、8 类全覆盖、15 违规 5 合规）+ 冷跑提示横幅 + 结果标注样本来源；Playwright 双模式验证 0 报错。
> - **执行（bugfix·真）**：`real-batch-audit.mjs`/`project-check.mjs` 的 `> 键：值` 解析正则 `[^\uff1a:]+` 会**跨行吞**——当文档首个 `>` 行无冒号（如西游记 `> **W246 A3…**`）时，一路吃到下一行冒号，把 `核验状态` 等字段解析成空、G6 误报全缺。收紧为 `[^\uff1a:\n]+`。另修 `real-batch-audit` 文件收集误删 `--sample` 后首个文件的 off-by-one。
> - **执行（G1 假阳性·真）**：真实批次首跑冒出 1 处 "G1 断链引用"，核实是 `README.md` 里 `[CHANGELOG](../../CHANGELOG.md)`、`[file-index](…)` 这类**合法 markdown 链接**被 G1 引用正则误判（中文链接文本不受影响）。引擎 `gates.mjs` g1 引用扫描加负向预查 `(?!\()` 排除 `[文本](URL)`，裸引用 `[1]` 仍照抓；重跑西游记批次 G1 归 0，`verify` 五裁决 + `bench` 召回 100% 零回归。**不拿假阳性冒充战果**。
> - **执行（证据回填）**：真实任务证据回写项目主文档与答辩侧速查材料（参赛期文件，已随 v0.13.0 移除；现行收录位置为 README 核心指标）。
> - **文件**：prototype/gates.mjs（g1 markdown 链接排除）、prototype/real-batch-audit.mjs（新建）、prototype/audit-configs/xiyouji.json（新建）、prototype/project-check.mjs（解析正则修复）、prototype/human-baseline.html（?set=B 盲测集）、prototype/configs/gatekeeper-self.json（currentVersion→0.12.1 + 登记）、prototype/gatekeeper.html（sync 重注入）、prototype/output/real-batch-详解西游记·内容生产（生产口径）.md + real-batch-GateKeeper_自身治理文档.md（新建）、README.md + STRUCTURE.md + 交接文档.md + ROADMAP.md（版本 v0.12.1 + 证据回填）。
> - **验证**：`sync-gates --check` + `sync-configs --check` 双绿；`verify.mjs` 9 项红线全过（引擎与样例裁决零改动）、`bench` 召回 100%（G1 修复后复测）；`check-docs` 全部核心文档可发布；真实批次数字为 `real-batch-audit.mjs` 实测、可回溯原文；盲测采集器 Playwright 双模式 0 报错。
> - **状态**：路 1 已落地（真实证据入档）；路 2 采集器已就绪、待作者/第三方冷跑取数。遗留（如实）：西游记 43 篇"缺结构化引用/创建时间"属该工程真实完整性缺口（非门禁误判），可作为 GateKeeper 给西游记项目的**反向治理建议**，但不在本作品内代改。

---

### v0.12.0（2026-08-31）：M11 web 端可扩展改造 —— 从单页报表到三层治理控制台

> **来源**：用户反馈"web 端感觉很扁平、没什么可拓展的感觉"。取证确认症结非视觉（M8 已把配色/深度/暗色/字体做厚），而是三处结构性"扁"——① 导航只有一屏（一根到底长滚动，看着像静态报表不像产品）；② 信息只一层深（点文档=换右侧六卡，无下钻/趋势/历史/对比）；③ CLI 早已有的 project-config / metaMap / `--compare` 换配置差异能力，web 端一个没暴露，仍硬编码 5 篇 A–E 样例 + 写死 DEFAULT_CONFIG。经用户"都做"批准，按 P0（导航+下钻）+P1（配置外置+diff）+P2（demo 模式+CI）全量落地。
> - **执行（P0 视图导航层）**：`gatekeeper.html` 引入 `.viewnav` 五视图切换（总览/明细/编排/配置对照/趋势）+ `.crumbs` 五级面包屑（批次›项目›文档›门禁›命中）+ hash 路由（`#/inspect` 等可分享可回退）。CSS 全 additive，旧类名（band/ring/gpill/cols/rail/item/cards/gate/finding/dws/node/lane/step）与响应式/暗色令牌一律保留。
> - **执行（P0 信息架构下钻）**：门禁卡去掉 `slice(0,6)` 截断，改**全量 findings** + 按 P0–P3 级别筛选 chips；命中项可点击**联动定位并高亮原文对应片段**（展开原文 `<pre>` 滚动到命中处）。总览页新增跨项目健康对比卡 + 关键指标网格。
> - **执行（P1 配置/数据外置）**：新建 `configs/batches.sample.json`（3 项目 9 篇，含电商/西游记口径）+ `sync-configs.mjs`（仿 `sync-gates.mjs`，把 `configs/*.json` 与批次数据注入 HTML 的 `GK-CONFIGS-SRC`/`GK-DATA-SRC` 标记块，`--check` 作第二道漂移门禁）；前端 `DOCS`/`DEFAULT_CONFIG` 硬编码全部下沉到注入块——**加演示项目=改 json 跑 sync，不改 HTML**。引擎块与 `gates.mjs` 零改动（`sync-gates --check` 仍绿）。
> - **执行（P1 换配置 diff 视图）**：新增「配置对照」视图，把 CLI `project-check --compare` 可视化——同一批产出物在「样例默认 vs 项目口径」下的命中差异表 + Δ + 被抑制门禁标注（西游记文学语境 G4 命中 2→0 直观呈现），并显式声明"配置是如实描述口径、非刷绿"。
> - **执行（P2 分发两端）**：① `?demo=1` 离线演示模式——`body.demo` 态下编排视图展示 `output/live-evidence.md` 的**真实钉钉回执**（E 链 4 节点 taskId/nodeId/openDingId + 端到端计时），断网可从头演到尾；② `.github/workflows/gatekeeper.yml`——把 `sync-gates/sync-configs --check` + `verify.mjs` + `check-docs.mjs` + `project-check` 封进 CI，"web 一个端"扩到"web + CI 两端"。新建 `verify.mjs` 固化回归红线（环 50/6P0/9P1/8P2/1 可发布/A 阻断0分/E 100/G4 抑制/六 ID 稳定）供本地与 CI 共用。
> - **文件**：prototype/gatekeeper.html（前端层重构：CSS 扩展 + body 五视图 + 渲染/路由 JS，引擎块与字体行未动）、prototype/sync-configs.mjs（新建）、prototype/verify.mjs（新建）、prototype/configs/batches.sample.json（新建）、prototype/configs/gatekeeper-self.json（currentVersion→0.12.0 + 登记版本）、.github/workflows/gatekeeper.yml（新建）、prototype/screenshots/ui-{1280,1024,640}.png（三档截图重生成）、Web端可扩展改造方案.md（本改造规格，新建）、README.md + 交接文档.md + STRUCTURE.md + ROADMAP.md（版本 v0.12.0 + 结构/进度/回写）。
> - **验证**：`sync-gates --check` + `sync-configs --check` 双绿；`verify.mjs` 9 项红线全过（样例批逐字不变）；Playwright（Chromium）实测——控制台 **0 报错**、五视图切换均可见、明细下钻+P0 筛选+命中跳转生效、西游记 diff 2 行、`?demo=1` 编排展示"真实回执"徽章、640px 无横向溢出；三档截图留档。一次性迁移脚本（apply-frontend/_frontend.part/_verify_*）已回收站清理。
> - **状态**：已落地。遗留（如实）：趋势视图当前以 3 项目实时健康分作柱状对比，真正的"批次时间线趋势"须接真实多批次数据（ROADMAP §7 决策闸门：无真实数据不投空图）；桌面壳（Tauri）/钉钉 H5 微应用留长期，未进本次；CI workflow 在共享大仓内不触发，须仓库作为独立 repo 方生效。

---

### v0.11.0（2026-08-31）：M10 project-config —— 换配置体检不同项目 + 自身文档全量转绿

> **来源**：M8.5 自我 DRL 暴露"引擎默认配置面向脱敏样例、套真实项目会大量误判"；用户批准把"换配置"从运行时手改 REGISTRY 升级为**声明式可加载 project-config**，并把项目主文档推到可发布、把可推广性做成可跑 demo。
> - **执行（引擎·零回归）**：`gates.mjs` 改为 `analyze/runGates(doc, cfg=DEFAULT_CONFIG)` 可选配置形参，所有既有调用点不带 cfg 即走样例基线；新增 `makeConfig` 深合并；G2 增「版本注册表」`registry.versions`（治理文档合理引用历史版本不再误判漂移，缺省仅认 currentVersion 保样例行为）；G1「数据未挂来源」提示与 G4 广告法统一归入 `channel` 开关（`sourceHint` / `adLaw`，默认 true）；断链引用 P1、敏感信息 P0/P1 任何配置不豁免。
> - **执行（配置系统）**：新建 `project-check.mjs`——加载 `configs/*.json`，按项目 `metaMap` 解析字段映射跑门禁，`--compare` 对照样例默认配置。建三套 config：`gatekeeper-self`（自身口径，`_why` 逐条说明关哪维·为何）、`ecommerce-marketing`（营销对照·G4/指标点亮）、`xiyouji`（跨项目 schema）。
> - **执行（内容修·非放宽）**：交接文档 "v0.8" → "v0.8.0"（补齐三段式版本，符合 v 前缀规范）；配置切换Demo.md 复跑命令去掉 `[--compare]` 方括号（避免被 G1 误作断链）。
> - **执行（交付物）**：新建 `配置切换Demo.md`（三配置三结论叙事 + 介绍话术 + 复现/扩展指南）。**（同日增补·复盘行动项②）**新建 `prototype/check-docs.mjs`——固化核心文档清单 + self-config + `--strict` 的提交前一键门禁（体检逻辑复用 project-check.mjs 保持单一事实源）；project-check 加 `--strict`（任一非可发布 exit 1）。正样本 11/11 退出 0、负样本（故意漂移文档）退出 1 双向验证。README 快速开始 / 交接索引已接线。
> - **文件**：prototype/gates.mjs（config 形参 + 版本注册表 + sourceHint 渠道）、prototype/gatekeeper.html（sync 重注入）、prototype/project-check.mjs（新建）、prototype/configs/gatekeeper-self.json + ecommerce-marketing.json + xiyouji.json（新建）、prototype/output/project-check-GateKeeper_自身治理文档.md + project-check-电商营销物料(对外发布).md + project-check-详解西游记(内容生产项目).md（新建）、配置切换Demo.md（新建）、交接文档.md（v0.8→v0.8.0 + 复利经验 + 文件索引 + 进度/待办）、README.md + STRUCTURE.md（版本 v0.11.0）、prototype/selfcheck.mjs（加退役注记）。
> - **验证**：`sync-gates --check` 通过；样例五裁决**逐字不变**（A 0 / B 49 / C 17 / D 84 / E 100）、`bench` 召回 100% 零误报；负样本 PASS（sourceHint=false 关建议 P3·断链 P1 保留；版本注册表放行历史·当前版本漂移仍报）；self-config 下 **10/10 可发布**（主文档 95 留一处"内部成本"自指 P2，如实不刷）；ecommerce 对照 **0/2 阻断**（G4 真激活·非永久抑制）；xiyouji **0/3 需修复**（如实报 Session 缺失）。
> - **状态**：已落地。遗留（如实）：主文档"内部成本"为描述门禁能力时的自指 P2 良性误报，M11 可加词边界；版本/字段/指标口径变动须同步更新对应 config（防配置漂移，同 9.5 一致性规则）。

---

### v0.10.0（2026-08-31）：M8.5 自我深度审查 —— Self-DRL 验收 + 治理方法论沉淀

> **来源**：对标上一作品 Vannevar 的推进法做差距分析，识别 GateKeeper 两项真差距——① 装了 deep-review-loop 却从未对自己跑一次 DRL 收敛；② 缺对外演示/介绍的速查材料。用户批准落成 M8.5。
> - **执行（Self-DRL R1）**：`run-real.mjs` 对 7 份核心文档跑六道门禁 → **7/7 判阻断**，`G6 证据链`全线命中（无 Session/创建日期/来源）；`G2` 把 `0.07ms / 16.2ms` 等测量值误判为版本；`G1` 命中正文示例 `[n]/[x]`；`G4` 命中文档引用的违规原词。基线留档 `output/self-check-report.md`。
> - **执行（R2-fix）**：给 7 份文档补「证据链元信息块」（`> 创建日期 / > 来源 / > Session` 三行）→ **G6 命中 7 → 0**（专查证据链的工具先补上自己的证据链）。
> - **执行（R3 修 bug）**：自审发现 `gates.mjs` G2 版本正则 `v?\d+\.\d+` 过度匹配 → 收紧为「版本号须带 v 前缀」`\bv\d+(?:\.\d+)+`；`sync-gates.mjs` 重注入 HTML 引擎块。
> - **执行（配置态收敛器）**：新建 `selfcheck.mjs`——套 GateKeeper 自身 project-config（权威版本 + 登记示例 token + 内部文档关闭 G4 渠道开关），产出三段式收敛报告，顺带演示"同一引擎、换配置体检不同项目"。
> - **执行（速查材料）**：新建对外演示用的问答预演与速查卡（参赛期文件，已随 v0.13.0 移除；方法论沉淀改录入交接文档「三」）；self-config 复检仍「可发布 / 100」。
> - **文件**：prototype/gates.mjs（G2 正则收紧）、prototype/gatekeeper.html（sync 重注入）、prototype/selfcheck.mjs（新建）、prototype/output/self-check-report.md（R1 基线）、prototype/output/selfcheck-report.md（三段收敛报告）、README.md + DESIGN.md + ROADMAP.md + 交接文档.md + STRUCTURE.md（各 +证据链 meta）、README.md + STRUCTURE.md + 交接文档.md + selfcheck.mjs（版本 v0.10.0）。
> - **验证**：`sync-gates --check` 通过；负样本 PASS（`0.07ms`/`M8.5` 不再判为版本，`v2.3`/`v2.4.0` 仍抓）；样例五裁决**逐字不变**（A 0 / B 49 / C 17 / D 84 / E 100）；`bench` 召回 100% / 零误报不变；selfcheck 终态 **5/7 可发布**、2 份如实留"需修复"（不刷绿）。
> - **状态**：已落地。遗留（如实标注）：部分文档正文数字密集未转绿、G1 示例 token、G4 渠道开关 → 归 M10（完善 project-config：权威版本口径 + 版本正则边界 + 渠道配置）。

---

### v0.9.1（2026-08-31）：M8.2 衬线字体子集内嵌（跨机像素一致）

> **来源**：用户指令"把字体嵌入做了"（UI升级方案 §9 第 3 项由"实测无需"升级为"执行嵌入"）。
> - **执行（子集）**：从 `gatekeeper.html` 穷举实际用字（677 字符）→ `py -3 -m fontTools.subset` 处理本机 `NotoSerifSC-VF.ttf`（可变字体）→ `output/notoserifsc-subset.woff2` 265KB / 1095 字形 / **fvar wght 轴保留**（单文件覆盖 200–900 全字重）。
> - **执行（注入）**：base64 内嵌 `@font-face`，独立族名 `GKSerif` 置于 `--serif` 栈首（跨机优先命中嵌入字体，未命中仍降级 SimSun/Songti）；脚本化注入避免手贴大文件出错。HTML 65KB→394KB，本地 file:// 零网络依赖。
> - **执行（取舍）**：Inter/JetBrains Mono **不嵌**——实测本机未装但回退链（Segoe UI/微软雅黑/Consolas）均为各 OS 必备字体，嵌入无可见收益、徒增体积；论证记录于 UI升级方案 §9。
> - **文件**：prototype/gatekeeper.html（@font-face + --serif 栈）、prototype/output/used_chars.txt、prototype/output/notoserifsc-subset.woff2、gatekeeper.html.pre-font.bak（回滚备份）、UI升级方案.md（§9 更新）。
> - **验证**：`sync-gates --check` 通过（引擎块未动）；Playwright——`document.fonts` 报 `GKSerif:loaded`、canvas 宽度 87.9 vs 系统 serif 86.1（证明确用嵌入字体）、0 控制台报错、功能回归通过（环50/A阻断0分/E可发布100分）、暗色下字体生效；截图 `screenshots/ui-light-font.png`、`screenshots/ui-dark-font.png`。
> - **状态**：已落地。§9 三项可选优化全部闭环。

### v0.9.0（2026-08-29）：M8.1 设计系统补全（内联迁移 + 暗色模式 + 字体实测）

> **来源**：用户指令处理 UI升级方案 §9 三项可选优化。
> - **执行（内联迁移）**：新增 `.section-label(.right)/.paste-box/.paste-hint/.paste-ta/.paste-actions/.rail-foot/.mono/.tag.sq` 类，body 静态区 9 处内联 style 全部替换；残留 `[style]` 仅为 JS 动态注入色与 pasteBox 显隐（合法）。
> - **执行（暗色模式）**：`:root[data-theme='dark']` 令牌覆盖 + 13 条硬编码渐变暗色覆盖 + `color-scheme` 双态；默认跟随系统（matchMedia 初始化 + change 监听），顶栏「◐ 主题」按钮手动切换（无 localStorage，会话内切换，规避 artifact 存储限制）。
> - **执行（字体实测）**：canvas 宽度对比法验证解析链——Noto Serif SC 本机已装（标题生效）；Inter/JetBrains Mono 未装，回退 Segoe UI/微软雅黑/Consolas 均本机可用；未装 Noto 的机器落到 SimSun/Songti SC 仍保持衬线。结论：不嵌入子集（保持单文件轻量），跨机像素一致的字集嵌入配方已写入 UI升级方案 §9。
> - **文件**：prototype/gatekeeper.html（style + body + 主题 JS，均在引擎块外）、UI升级方案.md（§9 处置记录）。
> - **验证**：`sync-gates --check` 通过（引擎块未动）；Playwright——0 控制台报错、暗色 bodyBg=rgb(19,21,25)、暗色下功能回归通过（A 阻断 0 分/4P0、粘贴检测正常）、明↔暗切换正常；截图留档 `screenshots/ui-light.png`、`screenshots/ui-dark.png`。
> - **状态**：已落地。§9 三项：1、2 完成，3 实测确认无需改动。

### v0.8.0（2026-08-29）：M8 界面全面美化升级（现代高级感设计系统）

> **来源**：用户指令对 `gatekeeper.html` 全面美化——配色/排版/深度/交互/组件一致性/响应式六项，要求简洁精致现代专业。
> - **执行**：整体替换 `<style>` 设计系统（仅 CSS 层）：暖纸底+双 radial 渐变、玻璃拟态顶栏（blur14+saturate1.4）、衬线渐变品牌字、三级阴影/圆角令牌、四色渐变计数块、健康环 drop-shadow+0.9s 过渡、卡片 hover 上浮+错峰 fadeUp 入场、999px 胶囊徽章、荧光笔 mark、统一 cubic-bezier 缓动、`:focus-visible`/`prefers-reduced-motion`、断点 1024/640。保留全部既有 class 名与 JS、引擎块不动。
> - **文件**：prototype/gatekeeper.html（仅 style）、UI升级方案.md（新建，含量化验收与自检）、prototype/screenshots/ui-1280/1024/640.png（验证截图）。
> - **验证**：`sync-gates --check` 通过；Playwright 实测——控制台 0 报错、玻璃/渐变/动效生效、1280 双列/1024 与 640 单列且无横向溢出、功能回归正确（环50、计数6P0/9P1/8P2/1可发布、A阻断0分4P0、E可发布100分）。
> - **状态**：已落地。已知可选优化（内联 style 残留/暗色模式/内嵌字体）记录于 UI升级方案.md §9，非阻塞。

### v0.7.0（2026-08-29）：M7 补齐设计层与路线层

> **来源**：用户指出缺口——只见项目主文档与治理文档，缺一份完整**设计方案**与**后续发展/迭代路线图**；根因是上轮只搬了西游记的治理层，未建其 DESIGN/方案路线层。
> - **执行**：新建 `DESIGN.md`（设计目标原则 / 三层信息架构 / 六道门禁设计契约 / DWS 编排取舍 / 视觉设计系统 tokens / 数据模型 / 诚实设计决策与反模式）与 `ROADMAP.md`（现状基线 / 里程碑节奏 / 短期 M7–M11 路线 / 中期产品化 / 长期愿景 / M 指标演进 / 决策闸门 / 风险依赖）。
> - **文件**：DESIGN.md、ROADMAP.md（新建）。
> - **验证**：内容与既有代码/文档对齐（色板取自 gatekeeper.html 真实 tokens；里程碑与 CHANGELOG M1–M6 一致；决策闸门沿用西游记 judge_gate 思路）；三处版本号同步 v0.7.0。
> - **状态**：已落地。设计/路线层补齐，接手者可直接翻这两份看"怎么设计的 + 往哪演进"。

### v0.6.0（2026-08-29）：M6 真实业务场景端到端 + 报告归档钉钉

> **来源**：用户「都做」——① 用真实文档验证钉钉归档链路；② 开真实业务场景端到端案例（用户未另给素材，取本人真实 AI 协作项目"西游记"docs 作输入，仅作被检对象）。
> - **执行（归档）**：`dws doc create` 将项目文档归档为钉钉文档（nodeId pGBa2Lm8…），验证"体检报告 → 钉钉归档"链路。
> - **执行（真实 runner）**：新建 `prototype/run-real.mjs`——解析真实文档 `> 键：值` 元信息块映射到门禁 meta，跑 `gates.mjs`，输出 `output/real-case-report.md`。对 3 份真实人物分析文档体检：G6 如实暴露"未内联 Session/创建日期"的真实治理债；G4 命中"第一/唯一/最高"等文学语境误报。
> - **执行（端到端）**：真实体检报告再 `dws doc create` 归档钉钉（nodeId LeBq413J…），完成"真实产出物→门禁→报告→钉钉"全链路。
> - **文件**：prototype/run-real.mjs（新建）、prototype/output/real-case-report.md、两份钉钉文档。
> - **验证**：runner 真实读取 xiyouji/docs 文件、结果未粉饰；诚实结论——默认配置面向脱敏样例，真实项目需按自身 schema 配置元信息映射 + 渠道开关（广告法门禁仅营销/发布场景启用），印证规则库可插拔。
> - **状态**：已落地。若需更具代表性的真实案例，待用户提供目标业务场景/素材，按其 schema 配一份 config 再跑。

### v0.5.0（2026-08-28）：M5 端到端计时实测

> **来源**：用户指令「端到端总时长实测一次坐实"<10 秒"」。
> - **执行（端到端实测）**：`dws` 不能与 `date` 混排（宿主钩子要求命令体即 dws），改用两次 `doc create` 的 `createTime` 作锚点夹住中间 4 个真实动作（群消息+待办+DING+归档），实测墙钟 ≈ 2s / 4 动作 ≈ **0.5 秒/动作**；单产出物发布链 ≈ 2s，5 份样例全链路 ≈ 7s（含扫描 <10s）。回写实测口径 + `live-evidence.md` 新增"端到端计时实测"段（含锚点 nodeId）。
> - **文件**：prototype/output/live-evidence.md（计时段）；实测数字同步至项目主文档（参赛期文件已随 v0.13.0 移除，现行收录于 README 核心指标）。
> - **验证**：计时锚点 createTime 差值取自真实 dws 响应；主文档/证据数字一致；诚实标注 createTime 秒级精度、人工基线仍为假设区间。
> - **状态**：已落地。人工基线对照回填需真人（可选，采集器与对照表工具已备）。

### v0.4.0（2026-08-28）：M4 门禁逻辑单一事实源收敛（排雷）

> **来源**：建 STRUCTURE/交接文档时发现真实隐患——`gatekeeper.html` 内联了一份门禁引擎副本，与 `gates.mjs` 两套并存，将来改规则前后端会漂移（违反单一事实源）。用户指令「开始吧」→ 收敛。
> - **执行（生成器）**：新建 `prototype/sync-gates.mjs`——把 `gates.mjs` 去 `export` 后注入 HTML 的 `GATES-SRC-START/END` 标记区；首次运行自动完成一次性重构（抽出 DOCS/esc、用标记替换手写引擎），之后每次从 `gates.mjs` 再生成；`--check` 为漂移门禁（不一致 exit 1）。
> - **执行（渲染层）**：`gates.mjs` 的 `verdictOf` 补 `c/tag` 字段（后端忽略、供 HTML 用）；HTML 引擎块改为纯逻辑（无 `<b>`），DOM 格式化交给渲染层，finding 字段统一 `esc()`（顺带修掉粘贴功能的 XSS/破版隐患）。
> - **文件**：prototype/sync-gates.mjs（新建）、prototype/gates.mjs（verdictOf 加字段）、prototype/gatekeeper.html（引擎块注入 + 渲染 esc）。
> - **验证**：`node sync-gates.mjs --check` 通过（引擎块 == gates.mjs）；Playwright 真机加载无 JS 报错，行为与重构前完全一致（健康环 50、计数 6P0/9P1/8P2/1可发布、A 阻断 0 分、E 可发布 100 分、粘贴检测正常）；粘贴含 `<img onerror>` 文本经 esc 无注入。
> - **状态**：已落地。改规则的正确姿势：只改 `gates.mjs` → `node sync-gates.mjs` → `--check`。

### v0.3.0（2026-08-28）：M3 省时实测 + 人工对照 + 截图留档

> **来源**：用户指令「跑一次人工 vs 流水线省时实测」「做人工实测对照表」「留真实产品截图」。
> - **执行（实测基准）**：新建 `prototype/bench.mjs`——20 条含 15 处植入《广告法》违规的文案，`process.hrtime` 实测流水线扫描（20/200/2000 规模）+ 召回/误报；人工基线用 30–120s/条**假设区间**换算，端到端口径（扫描+DWS 编排）而非"纯算力比人脑"。
> - **执行（对照表）**：新建 `prototype/人工实测对照表.md`，20 条与 bench 完全一致，含任务说明/逐条记录/计时/答案判分页（遮答案），回填可坐实提效结论。
> - **执行（截图）**：Playwright 截取 `prototype/social/`（v0.13.0 起更名 `screenshots/`）真实产品图留档。
> - **文件**：prototype/bench.mjs、prototype/人工实测对照表.md、prototype/screenshots/*.png、gatekeeper.html。
> - **验证**：`node bench.mjs` 实跑——召回 100%、零误报、扫描 1.4ms/20；主动删除"快 44 万倍"误导性倍数，改可信口径；截图经 Read 核验清晰。
> - **状态**：已落地。

### v0.2.0（2026-08-28）：M2 三层架构重构 + 真实钉钉 DWS 端到端跑通

> **来源**：用户指令「接真实钉钉 DWS」「接 OA 审批单让链路更完整」。
> - **执行（单一事实源）**：抽出 `prototype/gates.mjs`（六道门禁纯逻辑，前端与后端共用）；`dws-bridge.mjs` 按裁决生成 dws 命令计划，群发节点由 `send-by-bot` 改为用户身份 `chat message send`（内置助理非自定义模板报 400004）；`--live` 改为生成 `output/dws-plan.sh` 并说明"须 Agent 直接调用"。
> - **执行（真实落地）**：Agent 直接调用 dws，在 GateKeeper 组织建 5 条待办、发 5 条群消息、归档 1 篇钉钉文档、发 1 条 DING 催办审批人；`todo list` 回读确认。
> - **执行（OA 边界）**：`dws oa` 无"发起新审批实例"命令，审批门改由「复核待办 + DING 催办」承载；`oa approval list-forms` 验证连接可用。
> - **文件**：prototype/gates.mjs、dws-bridge.mjs、config.dws.json、artifacts.sample.json、output/live-evidence.md、output/dws-plan.sh、README-DWS.md。
> - **验证**：dry-run 三链路命令正确；live 回执含真实 taskId / openTaskId / 文档 nodeId / DING openDingId（见 live-evidence.md）；Node 抽测门禁引擎 + Playwright 真机加载无报错。
> - **状态**：已落地。

### v0.1.0（2026-08-28）：M1 项目蓝图 + 可视化原型 + 六道门禁引擎

> **来源**：选定"复用西游记门禁治理经验做 AI 产出治理"方向，指令「写蓝图 + 搭原型」。
> - **执行（蓝图）**：新建项目蓝图（定位/痛点/方案/实测/排期/红线四段式 + 五维度自检；参赛期蓝图文件已随 v0.13.0 通用化移除，演进路线现由 ROADMAP.md 承载）。
> - **执行（原型）**：新建 `prototype/gatekeeper.html` 单文件应用——六道门禁真实正则校验、健康环、P0–P3 分级、粘贴实时检测、DWS 编排可视化；故宫宣纸底×Linear 高密度审美。
> - **执行（样例）**：5 份脱敏样例产出物 A–E，覆盖极限词/版本漂移/断链引用/PII/格式/元信息缺失。
> - **文件**：prototype/gatekeeper.html（蓝图文件已移除）。
> - **验证**：抽出纯逻辑 Node 单测——五份样例裁决分布正确（阻断3/需修复1/通过1）；Playwright 加载无 JS 报错、交互与条件分支渲染正确。
> - **状态**：已落地。
