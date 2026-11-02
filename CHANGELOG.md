# 更新日志 · GateKeeper

> 正向时间线，**唯一写细节的文件**。每条含「来源 / 执行 / 文件 / 验证 / 状态」四件套。
> 交接文档、README、STRUCTURE 只更新版本号与引用式表述，细节一律指向本文件。
> 约定：版本 `vX.Y.Z` + 里程碑 `M#`；本文件超过约 50KB 时把过期里程碑归档至 `CHANGELOG-ARCHIVE.md`。

## [Unreleased]
- 维护者待办在内部协作文档维护（本地保留，不入公开面）。

---

### v0.21.5（2026-11-03）：机械面审查处置批 —— 门禁单源化与防回流补洞 + 浏览器工具链收敛 + 退役归并

> **来源**：用户指令「审查口径/级联/脚本/钩子/守卫/兜底/门禁/探针/台账/生成器/计数链/报告链——哪些建了没应用、有问题、可提效、需重构」。四路审查（引擎验收线/注入级联/门禁工具链/编排报告链+CI）产出 20+ 发现，用户拍板全部执行。
> - **执行（P1 安全面与可信度）**：①防回流探针补洞——`TRACKED_FORBIDDEN` 增 glob 规则（`docs/工作复盘与优化分析报告-*.md`）+ 匹配器支持段内通配；负样本实测再抓出 **quotepath 盲区**（`git ls-files` 默认把非 ASCII 路径转八进制转义，中文规则全部匹配落空——v0.21.4 的 CLAUDE.md 负样本能红纯因 ASCII，属侥幸），改 `-z` 原样输出修复；负样本 复盘报告/人工冷跑清单 `add -f` 红→还原→绿 双闭环。②单测清单单源化——gate.mjs 增 `--ci`（剔除浏览器门）为唯一清单源，**CI 十三步收敛为单步引用**（根除 gate/CI 双清单漂移，v0.21.1 的 test-class-audit「接入 CI」失守即此类）；`test-release.mjs`（18 例，此前零接入）与 test-class-audit 双侧对齐；test-lint-workspace 增 `.gitignore` 内部面两节 ↔ `TRACKED_FORBIDDEN` 同步守卫测试（漂移即红）。③release.mjs 红判定——改消费 `gate.mjs --json`，失败集 ⊆ {doc-sync} 才属「预期红」，其余 **fail-closed exit 1**（原实现任何红都打印「属预期」放行）；交接文档版本行改可选（本地件缺省跳过，公开克隆不再崩）。④gate.mjs SKIP 单列（⏭ 计入汇总，不与真过门混同打 ✓）。
> - **执行（P2 口径对齐与退役）**：doc-sync 三扫描器豁免口径统一（门数/单测句跳过 `doc-sync:exempt`，与陈旧词对齐）+ 2 例；dws-bridge 输入默认锚定脚本目录 + 缺文件友好报错（从仓库根误运行不再 ENOENT 崩；产物保持 CWD 相对——test 临时目录隔离依赖此语义，CHANGELOG-ARCHIVE:72 历史声明以本段为勘误不回改）；**selfcheck.mjs / run-real.mjs 退役删除**（0 引用孤儿；selfcheck 默认清单含已本地化的交接文档，公开克隆必崩）；`parse-meta.mjs` 新建收敛 parseDoc 契约（4 份复制→2 消费方共 1 实现）；geo-probe AL5 公式对齐 lint-layout 修正版（旧探针复测会得出与门禁矛盾的基线）。
> - **执行（P3 提效重构）**：`tools/browser.mjs` 新建收敛六处 Playwright 解析+launch 复制粘贴，SKIP/fail-closed 口径全链统一（geo/contrast/shot 缺依赖改 SKIP exit 0；human-baseline-check 缺依赖降级「仅静态自检+显式 SKIP」）；**lint-layout 提速 10.7s→3.8s**（单页复用+双 rAF 替代 3 次整页加载与约 9s 硬编码 sleep，14 项测量值与改前基线逐项一致）；lint-links 两次 ls-files 合并单次 `-t`；lint-workspace 死调用（`check-ignore -q` 结果从未消费）清理。
> - **执行（文档口径）**：RELEASE-CHECKLIST 增「自动化载体」列（11 项中 7 项标注工具载体、4 项显式人工）；VISUAL-ACCEPTANCE 留证口径改「本地留存+CHANGELOG 摘要」（output/ 不入库后留证语义修正）+ A7 双口径分工注记 + shot 命令入五步闭环；CHANGELOG 历史段两处已本地化文件引用加「维护者本地留档」注记。
> - **文件**：tools/gate.mjs、tools/release.mjs、tools/browser.mjs（新建）、tools/lint-layout.mjs、tools/lint-workspace.mjs、tools/test-lint-workspace.mjs、tools/doc-sync.mjs、tools/test-docsync.mjs、tools/lint-links.mjs、tools/smoke.mjs、tools/geo-probe.mjs、tools/contrast-probe.mjs、tools/shot.mjs、tools/human-baseline-check.mjs、tools/RELEASE-CHECKLIST.md、tools/VISUAL-ACCEPTANCE.md、parse-meta.mjs（新建）、project-check.mjs、real-batch-audit.mjs、dws-bridge.mjs、prototype/selfcheck.mjs（删）、prototype/run-real.mjs（删）、.github/workflows/gatekeeper.yml、STRUCTURE.md、DESIGN.md、prototype/configs/gatekeeper-self.json（0.21.5 + 登记）、本文件。
> - **验证**：十三门全绿（test-release 首次入链 18/18；test-lint-workspace 22/22、test-docsync 38/38）；lint-layout 提速后测量值与基线逐项零漂移；`--ci` 12 门独立可跑且失败集判定=「仅 doc-sync」实录；防回流 glob/中文路径负样本 双红双绿；release 新红判定首跑实拦自身 --json 解析 bug（fail-closed 按设计生效）→ 修正 → 预期红正确放行；--verify v0.21.5 全绿；GitHub Actions 单步化后绿。
> - **状态**：已落地。四路审查 20+ 发现全部处置或登记；已知取舍（如实）：dws-bridge 产物保持 CWD 相对（测试隔离设计）、CHANGELOG-ARCHIVE:72 历史声明不回改、parse-meta 契约由两消费方门禁兜底（不另设单测）。

---

### v0.21.4（2026-11-03）：公开整备批 —— 产物/截图/内部协作文档移出跟踪面 + 公开面脱敏 + 防回流探针 + 首航缺口修复 + git 历史重写预备

> **来源**：用户公开前审查指令「新用户首航自测 + 严格区分自己的内容与公开面」——从 GitHub 实克隆首航 13 门全绿（可用性成立），但审查发现三类问题：①`prototype/output/`（41 项运行产物）与 `prototype/screenshots/`（30 张测试截图）被 git 跟踪，违反"测试产物禁止公开"；②`live-evidence.md`/HTML 证据块含真实钉钉回执锚点（taskId×5/alidocs 链接/openDingId），且真实群 openConversationId 存在于 ≥4 个历史提交（v0.14.1 才占位符化）；③内部协作文档（交接文档/对齐表/启动Prompt/CLAUDE/AGENTS/.agents/.zcode/复盘×3/档案方案×6）混入公开面。用户拍板：原仓重写历史 + 顺带修首航缺口。
> - **执行（跟踪面清理）**：95 文件移出跟踪面（`git rm --cached`，工作副本保留）——output/screenshots/内部协作文档；`.gitignore` 增补"运行产物与测试截图""内部协作文档"两节；README 头图（截图引用）摘除，快速开始补环境要求（Node ≥ 20 + Playwright 可选说明）。
> - **执行（公开面脱敏）**：HTML 证据块真实回执锚点中段打码（taskId/nodeId/openDingId，保留"有真实回执"诚实口径）；README/ROADMAP/STRUCTURE/DESIGN/CHANGELOG/方法论×3/README-DWS 共 10 文档去私有仓名（内部协作仓/竞赛→"既有内部仓/竞赛仓"中性表述）与本地盘符路径；"千问办公"作为 DWS 宿主平台名按 v0.13.0 既定决策保留；ROADMAP M14/M15/M16/M17/M19/M20 行去对已归档内部方案文档的链接。
> - **执行（门禁适配公开面）**：check-docs `CORE_DOCS` 收敛为公开面 5 文档（交接/CLAUDE/AGENTS/启动Prompt 移出——权威口径覆盖公开面）；lint-workspace 增第四查**防回流探针**（`TRACKED_FORBIDDEN` 冻结清单：output/screenshots/内部文档命中跟踪面即红，`git add -f` 也拦）+ 单测 6 例（13→19）；lint-links 增**跟踪面校验**（目标本地存在但未入库 → 同判断链，堵"本地绿/公开克隆红"盲区）+ 单测 3 例（15→18）；STRUCTURE 树声明同步公开面实况（output/screenshots 改"本地生成不入库"注记+exempt）。
> - **执行（公开克隆复检处置）**：GitHub 重克隆首跑抓出 2 类本地存在性盲区——lint-links 5 断链（README 复盘行 + UI升级方案×4 内部档案/AGENTS 链）与 STRUCTURE screenshots 声明缺失，全部修复（UI升级方案 治理约束改三道关自包含表述）。
> - **执行（首航缺口修复）**：lint-layout/smoke 无 Playwright 时打印 SKIP 退出 0（替代 import 抛错红门）；**依赖在但浏览器起不来仍 fail-closed exit 1（v0.21.3 口径不变）**——"SKIP 显式声明"替代"静默假绿"。
> - **文件**：.gitignore、README.md、ROADMAP.md、STRUCTURE.md、DESIGN.md、UI升级方案.md、CHANGELOG.md、prototype/check-docs.mjs、tools/lint-workspace.mjs、tools/test-lint-workspace.mjs、tools/lint-links.mjs、tools/test-lint-links.mjs、tools/lint-layout.mjs、tools/smoke.mjs、prototype/gatekeeper.html（证据块）、prototype/README-DWS.md、docs/方法论/×3、prototype/configs/gatekeeper-self.json（0.21.4 + 登记）、本文件；另 95 文件 `git rm --cached`。
> - **验证**：`node tools/gate.mjs` 十三门全绿（本地两轮 + GitHub 重克隆复检）；test-lint-workspace 19/19、test-lint-links 18/18；防回流负样本——`git add -f CLAUDE.md` 后第四查红、`git rm --cached` 后转绿；跟踪面校验负样本即公开克隆首跑 5 断链实录；历史重写后 GitHub 重克隆终验：全历史敏感串扫描 8 项全零（真实群 ID/nodeId/openDingId/taskId/私有仓名/本地路径）、内部路径历史残留 0、72 跟踪文件、70 提交。
> - **状态**：已落地（本地）。git 历史重写（filter-repo 路径剔除 + replace-text 打码真实 ID/路径/仓名）与强推为同批第 2 阶段，重写后原 SHA 失效、旧史仅存本地备份 bundle。
> - **追加（同日用户指令三连）**：①备份 bundle 经用户确认删除（旧 SHA 自此永久不可解析，重写不可回滚）；②README 头图接入品牌资产 `assets/brand/lockup-{light,dark}.svg`（方向 I 纯英文 lockup，`<picture>` 明暗双主题——中文副标仍在候选待拍板故不预设）；③UI升级方案/Web端可扩展改造方案按用户指令移出公开面（本地保留 + gitignore + 防回流清单 + README/DESIGN/ROADMAP/STRUCTURE/VISUAL-ACCEPTANCE 引用改自包含表述）。
> - **例外声明**：本批按公开脱敏例外对 CHANGELOG 历史段做了私有仓名中性化（触碰"历史段只增不删"纪律，原史备份 bundle 已按用户指令删除，脱敏前状态不再可回溯）；交接文档/对齐表等内部文档自此转为本地维护、不再有 git 历史。

---

> **来源**：用户指示「一次收掉」——把 v0.21.2 双复审登记的 5 条遗留一次性处置完毕（人工冷跑数据不在本批：需真人跑出，AI 不代填）。
> - **执行（① 验收表接线）**：`UI升级方案.md` §1 判据表把 G1/G2/G3/G5/G10 的 A 系列指向 `tools/lint-ui.mjs`（第十二门，原标「人工核」）、G9 标注「需浏览器不进 CI」；§7 验证脚本表补 `lint-ui`（A2–A8/A12/A13）与 `human-baseline-check`（冷跑开跑前自检，不代填人工数据）两行，`class-audit` 行补单测说明。
> - **执行（② 视觉闭环补 A 系列检查点）**：`prototype/tools/VISUAL-ACCEPTANCE.md` 新增 §六「A / AL 系列判据检查点」——逐判据列出**机械判定载体 + 门序列 + 人工在本闭环仍需额外确认的点**（如 A4 只判位移不判重叠、A6 只算亮度差不判真实卡片可辨性），并写明「同一判据只由一个门承担、本闭环不重复判定」；§一 三道关表的 smoke 口径由旧 6 项校准为**七项**。
> - **执行（③ 首跑留证）**：按 gk-newgate 五件套第 5 步，为三类新门禁各补首跑留证 —— `prototype/output/class-audit-first-run.md`、`lint-ui-first-run.md`、`lint-layout-first-run.md`（首跑捕获 + 判据清单与**口径声明** + 负样本 exit 证据 + 处置记录）。
> - **执行（④ class-audit 补单测）**：判定逻辑抽成纯函数 `audit(html)` + `isMain` 守卫（避免单测 import 时产生副作用），CLI 增加可选文件路径参数；新增 `prototype/tools/test-class-audit.mjs` **5 例**（1 正样本 + 3 条负样本「删基线 class / 删基线 id / 动态类来源字面量消失 → 必红」+ 1 增量登记），接入门序列与 CI —— 该门此前**无任何自动调用点**。
> - **执行（⑤ lint-layout fail-closed）**：浏览器不可用时由 `console.log(跳过…) + exit 0` 改为 `console.error(…) + exit 1`（**判据未跑 ≠ 判据通过**，与 `sync-gates`/`lint-links`/`lint-workspace` 的 fail-closed 口径一致）；该门不进 CI（需真实浏览器，理由在 workflow 注释），故 fail-closed 不会拖慢 CI。
> - **执行（⑥ 体积终值对齐）**：单文件实测 **105,838 B**（v0.21.2 段的 105,829 B → 差 +9B，来源是**版本号注入**改变注入块字节数，已在 `lint-ui` 留证中登记为漂移源）；现役文档（UI升级方案 / ROADMAP / 对齐表 / v2 方案）统一为 105,838 B。
> - **文件**：UI升级方案.md、prototype/tools/VISUAL-ACCEPTANCE.md、prototype/tools/lint-layout.mjs、prototype/tools/class-audit.mjs、prototype/tools/test-class-audit.mjs（新建）、prototype/tools/gate.mjs（单测接入）、prototype/output/class-audit-first-run.md（新建）、prototype/output/lint-ui-first-run.md（新建）、prototype/output/lint-layout-first-run.md（新建）、ROADMAP.md、docs/档案/批次编号对齐表.md、docs/档案/方案/UI重设计方案-v2.md、prototype/configs/gatekeeper-self.json（registry 升版 + 重注入）。
> - **验证**：`node prototype/tools/gate.mjs` 十三门全绿；`node --test tools/test-class-audit.mjs` 5/5；`node tools/lint-ui.mjs` A 系列全过（字号 7 档 / 圆角越档 0 / hover -1,-2px / 焦点声明块 1 / ΔL 0.086 / 色相差 146.8° / 实心块白字 4.75–7.76:1 / muted 6.19:1 / 等宽 7/7 / 体积 105,838 B / 衬线 0）；`lint-layout` AL1–AL11 全过（chrome 21.2% / band 130,248,232 / P0 118px / rail 空洞 0 / 溢出 0px）；`release.mjs --verify v0.21.3` 四处版本一致通过。
> - **状态**：已落地。**遗留（如实）**：① `human-baseline.html?set=B` 冷跑数据仍待真人跑出（AI 不代填；开跑清单见 `prototype/人工冷跑开跑清单.md`——维护者本地留档，公开面不含）；② **体积精确字节数会随版本号注入漂移**（±个位数字节）——判据「≤120KB」稳定，但**文档中的精确值应改引用式**（本批仅对齐终值）。
> - **勘误（历史段只增不删）**：v0.21.2 段「105,829 B」→ 实测 **105,838 B**（差 +9B，版本号注入所致）。

### v0.21.2（2026-10-23）：SOP-2 第 7 步双复审落地 —— 编排桥接层 P1 真断裂修复 + 22 条台账向发现处置 + 门禁单测接入

> **来源**：用户知会后推送 origin/main（v0.21.0 `abf1a13` / v0.21.1 `fe5a36d`），按 SOP-2 第 7 步执行双复审 —— 安全向 `rescan-audit`（七路研究员 + 三镜头 2/3 计票）与台账向 `gk-review-wave`（五镜头 + 汇裁 + 逐条独立确认）。两者均为 zcode 编排格式（`.dwf.ts`），当前运行时不可直接执行 → 按其镜头定义改写为自包含只读审计任务执行，报告落 `prototype/output/rescan-v0.21.0-0.21.1.md` 与 `prototype/output/review-wave-v0.21.0-0.21.1.md`。
> - **执行（安全向处置 5 条存活：P1×1 / P2×3 / info×1）**：① **P1 真断裂修复** —— `dws-bridge.mjs` 的 `hasRealIds` 引用 for 块作用域外的 `const a`，自 v0.20.1（2026-10-07）起 dry-run 必抛 `ReferenceError`，编排工具**实际从未成功运行过**（`output/dws-plan.sh` 停在 v0.15.3、`gate-report.json` 停在 v0.15.6），且 v0.20.1「真实 ID 不烘进被跟踪产物」的安全修复路径**永不可达**（只修作用域不修判定口径＝修复即回归陷阱）；改为循环内聚合收集，并把判定口径收紧为**只判 ID/凭据类字段**（文档标题 `a.name` 与署名 `a.author` 不是 ID，计入会让被跟踪的 `dws-plan.sh` 永远不更新）；② `q()` 转义顺序修复（未先转义反斜杠 → 展示行复制进 bash 时 `$(...)` 仍是有效命令替换，依据 IEEE Std 1003.1-2024 §2.2.3）；③ CI 触发面扩为 `prototype/** + docs/** + *.md`（此前 `check-docs` 的 9/9 核心文档全在仓库根，**改核心文档完全不触发 CI**）；④ `tools/` 下 6 个门禁单测（107 例）接入本地门序列与 CI（此前无任何自动调用点，判据被改宽即无信号）；⑤ `lint-layout` 浏览器不可用时静默 exit 0 → **挂账**（属已声明的设计取舍）。
> - **执行（台账向处置 22 条确认：P2×17 / info×5）**：已修 17 条 —— 台账断表修复（v0.21.1 行被空行截断致 GFM 表格断裂）、AL 实测值回填（AL1 23.3→**21.2%**、AL4 46→**47px**、AL5 0→**12px**）、单文件体积终值统一（**105,829 B / −75.7%**）、`--muted` 对比度更正（6.38→**6.19:1**）、smoke「六项」全仓清扫（7 处文档 + 工具自身 3 处）、门位次更正（`lint-layout`=第 13 门）、CLAUDE.md 判据范围更正（A2–A8/A12/A13）+ 三件探针收录、DESIGN.md §5 路线表述改写（弃用「故宫数字馆藏 × Linear」）、交接文档里程碑链与完成表补 M19/M20、CI 补 syntax-check 步、v2 方案自身编排修正；**挂账 5 条** —— `UI升级方案.md` §1/§7 表补行、VISUAL-ACCEPTANCE 补 A 系列检查点、三类新门禁首跑留证、lint-layout fail-open、CHANGELOG 历史段漏列。
> - **文件**：prototype/dws-bridge.mjs、prototype/dws-bridge.test.mjs（新建，4 例正负样本）、prototype/tools/gate.mjs（单测接入 + 步名）、.github/workflows/gatekeeper.yml（paths 扩面 + syntax-check + 单测步）、prototype/output/rescan-v0.21.0-0.21.1.md（新建）、prototype/output/review-wave-v0.21.0-0.21.1.md（新建）、AGENTS.md、CLAUDE.md、README.md、STRUCTURE.md、DESIGN.md、ROADMAP.md、交接文档.md、UI升级方案.md、docs/档案/批次编号对齐表.md（断表修复 + M18 保留注 + AL 值 + touches）、docs/档案/方案/UI重设计方案-v2.md、docs/档案/方案/UI布局与动线优化方案-v1.md、prototype/tools/smoke.mjs、prototype/configs/gatekeeper-self.json（registry 升版 + 重注入）。
> - **验证**：`node prototype/tools/gate.mjs` 十三门全绿（单测步并入 6 个门禁单测后 604ms）；`node --test dws-bridge.test.mjs` 4/4（黑盒子进程 + 临时目录，产物不落仓库）；smoke 7/7；`class-audit` 基线 class 118 + 动态 18 + id 42 全在；`lint-ui` 全绿；`release.mjs --verify v0.21.2` 四处版本一致通过。
> - **状态**：已落地。**遗留（如实）**：① `human-baseline.html?set=B` 冷跑数据未取数（AI 不代填；开跑清单见 `prototype/人工冷跑开跑清单.md`——维护者本地留档，公开面不含）；② `UI升级方案.md` §1/§7 表待补 `lint-ui` 与 `human-baseline-check` 行（该文档已转维护者本地留档，公开面不含）；③ VISUAL-ACCEPTANCE 待补 A1–A13 检查点；④ 三类新门禁待补 `output/<name>-first-run.md` 首跑留证（output/ 不入库，本地留存）；⑤ `lint-layout` 浏览器不可用时 fail-open 待定口径（已于 v0.21.3 改 fail-closed、v0.21.4 补 SKIP 口径）。
> - **勘误（历史段只增不删，故记于此）**：① v0.21.0 段「436KB → 105,618 B（−75.9%）」→ 实测 **105,829 B（−75.7%）**；② v0.21.1 段「105,820 B」→ 同上；③ v0.21.0 段「`--muted` 6.38:1」→ 实测 **6.19:1**；④ v0.21.0 段「文件」行 output 产物通配与实际不符（batch5 无 .json）且漏列 5 个文件；⑤ v0.21.1 段「文件」行漏列 7 个文件（gk-release 技能 / AGENTS.md / README.md / release.mjs / gatekeeper.html / project-check 产物 / 台账）。

### v0.21.1（2026-10-23）：v0.21.0 两条遗留收口 —— A 系列声明级判据工具化（门序列十二门→十三门）+ 人工盲测冷跑开跑前自检

> **来源**：用户指向 v0.21.0 收官遗留的两项——① `human-baseline.html?set=B` 人工盲测冷跑未取数；② M19 声明级判据 A1–A13 中除 AL7 外尚未工具化（`tools/lint-ui.mjs` 未建），要求收口。
> - **执行（A 系列判据工具化 · 门序列十二门→十三门）**：新建 `prototype/tools/lint-ui.mjs`——A2 字号阶梯 / A3 圆角 / A4 hover 位移 / A5 焦点态声明块数 / A6 语义色可辨（P1-P2 亮度差、品牌-危险色相差、四级实心块压白字）/ A7 辅助文本对比度 / A8 关键数字等宽 / A12 体积 / A13 衬线残留，**纯文本解析无需浏览器，可进 CI**；配套 `tools/test-lint-ui.mjs` 13 例（正样本 + 逐条负样本）。**口径写死在脚本注释**（判据型门禁最易出的错是口径错）：A4 只扫 `:hover` 规则块内的位移、**不含 `@keyframes` 入场动画**；A5 计 `:focus-visible` **声明块数**（一条规则含 8 个选择器仍算 1 块）；A3 设装饰性微元素白名单（荧光笔 `mark` 与 2px Tabs 指示条允许 2px）；令牌解析支持**别名链 + 首次定义优先**（正式定义在前、v1 兼容别名在后，避免把 `--warn` 误解析成悬空别名）。
> - **执行（人工盲测冷跑 · 开跑前自检交付包）**：新建 `prototype/tools/human-baseline-check.mjs`——① 静态：B 集恰 20 条（15 违规 + 5 合规）、违规条均标注类型与法律依据、覆盖 6 类依据、**与 A 集文案零重合**（把「勿测老样本、作者有先验」从口头纪律变成机器可验的保证）；② 动态：采集器 `?set=B` 可跑、提交后出分、回填文本含耗时/召回/漏检字段、0 页面错误（自检期间接受未作答确认框——真实交互细节，脚本不模拟真人作答）。**自检用空答案跑，只验工具链，不代填任何人工判断**：人工召回率/漏检/误报/耗时必须由真人独立跑出，代填即失去盲测意义。
> - **执行（口径澄清）**：人工冷跑用 **B 集**，而 `bench.mjs` 的召回/误报测的是 **A 集**——两者非同一批样本，结论**不可逐条对齐**；已写入自检输出与交接文档「四」条目（此前两处并存易被误读为同一批）。
> - **执行（表述清扫）**：全仓现役「十二门」→「十三门」（AGENTS.md / CLAUDE.md / STRUCTURE.md / release.mjs / gk-release 技能 / 两份方案文档 / UI升级方案.md），并把方案文档与 UI升级方案里的「每批收尾必跑（十门 · smoke 六项）」校准为「十三门 · 七项」；**CHANGELOG 历史段的「十门/十二门」未动**（历史事实，禁改）。
> - **文件**：prototype/tools/{lint-ui,test-lint-ui,human-baseline-check}.mjs（新建）、prototype/tools/gate.mjs（十二门→十三门）、.github/workflows/gatekeeper.yml（新增 lint-ui 步）、STRUCTURE.md、CLAUDE.md、交接文档.md、UI升级方案.md、docs/档案/方案/{UI重设计方案-v2.md,UI布局与动线优化方案-v1.md}、prototype/configs/gatekeeper-self.json（0.21.1 + 登记）、本文件。
> - **验证**：**十三门全绿**（EXIT=0）；`test-lint-ui.mjs` 13/13；`lint-ui` 实测全过——A2 字号集合 12/13/14/16/20/28/40｜A3 越档 0 处（白名单豁免 2 处）｜A4 hover 位移 -1/-2px｜A5 焦点声明块 1 处｜A6 P1/P2 亮度差 **0.086**（≥0.08）· 品牌/危险色相差 **146.8°**（≥12°）· 四级实心块压白字 4.75–7.76（≥4.5）｜A7 `--muted` 对白底 **6.19:1**｜A8 关键数字等宽 7/7｜A12 体积 105,820 B（≤122,880）｜A13 衬线引用 0 + @font-face 0；`human-baseline-check.mjs` 静态与动态全过（B 集 15+5、与 A 集重合 **0 条**、依据覆盖 6 类、采集器出分与回填文本正常）；smoke 7/7；`release.mjs --verify v0.21.1` 四处版本一致通过。
> - **状态**：已落地。遗留（如实）：① **人工冷跑数据仍待真人跑出**——工具链已就绪（自检绿），但数据必须来自真人，回填后 README 核心指标才能由「假设区间」升级为「真人实测对照」；② A1（间距刻度）由 `lint-layout` 的 AL7 承担、`lint-ui` 不重复判定，避免同一判据两个口径；③ SOP-2 第 7 步双复审待推送后执行（本次未推送）。

### v0.21.0（2026-10-23）：UI 重设计 v2 与布局层优化合并落地（Fluent 换肤 + 信息架构/动线/移动端 + 门序列十二门）

> **来源**：用户两轮指令 + 拍板。①「给界面出一版重设计：视觉层级、配色与字体体系、间距栅格、组件样式统一都要升级，保留原有功能结构不乱动，先出设计方向再细化」（M19）；②「帮我优化现有界面布局：信息层级梳理、区块分布与留白、操作动线、不同屏幕适配都过一遍，每处调整讲清理由」（M20）。拍板：M19 路线 **C 彻底换肤** / 等宽 tabular / 加深 P2+纹理 / 逐批落地；M20 四项痛点全开 / 允许改 JS 与 DOM / 信息架构可重排 / 手机也要能真正干活 / **两批合并为一条 6 批流水线统一落地**（跨会话协调：让号依据、共享面划分、写顺序、不变量放宽条款均已书面交底）。
> - **执行（M19 呈现层 · 6 批）**：路线 C 换肤（中性灰阶 + Fluent brand 蓝 + 语义四级可辨，品牌色让出危险色语义）；字号 13→7 档；间距归 4px 基线刻度；对比度修复（`--muted` 3.25:1→6.38:1 补 WCAG AA 缺口）；组件族统一（Button 三型 Accent/Subtle/Danger、导航改 Tabs 下划线指示器、徽章五形态分工、Surface 去渐变改纯白+发丝边）；关键数字全改等宽 tabular；焦点态 7 处重复收敛为 1 处通用声明；**删除内嵌衬线字体 base64（−353,916 字节）**。
> - **执行（M20 布局层 · 4 批）**：①**结构层**——汇总带重构为「上下文结论条」（环 + 项目/口径/篇数 + 一句结论 + 分级计数单行，252→130px）、门禁矩阵移入总览、明细视图隐藏项目级 band（消「同屏两个粒度的分数」）、总览新增批次级结论条（唯一答案 + 直达动作）、顶栏语义分区、术语统一、8 栏栅格在新结构上重算；②**布局层**——门禁卡分组渲染（长卡独占整行/短卡并排/0 命中收成「已通过」摘要，0 命中卡 908→46px）、左栏 sticky 按内容取高（空洞 1191→0）、间距全量归刻度、**吸顶重叠 17→0px**；③**动线层**——就近证据条（裁决→首条 P0 498→118px）、提交按钮阻断态禁用、命中定位回跳条、配置空态引导、趋势页去重、过滤折叠；④**移动端层**——390/480 完整布局（首屏 chrome 107%→23.3%、底部固定操作条常驻裁决、汇总带折叠、左栏横排、原文覆盖层 sheet、修横向溢出 780px）。
> - **执行（收官批）**：门序列**十门→十二门**（新增 `class-audit` 只增不删对拍 + `lint-layout` 布局结果判据）；新工具 6 件（class-audit / lint-layout / test-lint-layout / geo-probe / contrast-probe / shot）；间距刻度归一收尾（`.btn` padding 7/14px → `height:32px`+`padding:0 16px`、select 7px → `height:32px`、`.te-snip` 6→8px、底部预留 72→48px）；AL5 口径修正（扣左栏标题下边距）；全仓现役「十门」表述统一改写为「十二门」；UI升级方案 §2–§7 改写为引用式 + 判据表（令牌现役值以代码 `:root` 为唯一来源，不在文档复制色值）。
> - **文件**：prototype/gatekeeper.html、prototype/render-core.mjs（新增 scoreInk）、prototype/tools/{gate,class-audit,lint-layout,test-lint-layout,geo-probe,contrast-probe,shot,smoke}.mjs、prototype/screenshots/{v2-*,layout-*}.png、prototype/output/geo-baseline-m20-batch{2,3,4,5}.{md,json}、docs/档案/方案/{UI重设计方案-v2.md,UI布局与动线优化方案-v1.md}、docs/档案/批次编号对齐表.md、ROADMAP.md、STRUCTURE.md、AGENTS.md、CLAUDE.md、交接文档.md、README.md、UI升级方案.md、.agents/skills/gk-release/SKILL.md、.github/workflows/gatekeeper.yml、prototype/configs/gatekeeper-self.json（0.21.0 + 登记）、本文件。
> - **验证**：**十二门全绿**（EXIT=0）；smoke **7/7 PASS**（原 ④「阻断文档点提交弹 toast」因主按钮上下文联动改为「④ 阻断态按钮禁用并标明原因」+「④b 放行态可点并弹 toast」，断言随行为改写而非迁就）；`tools/lint-layout.mjs` **AL1–AL11 全过**（AL1 390 首屏 chrome 21.2%｜AL2 band 130/248/232｜AL3 裁决→首条 P0 118px｜AL4 已通过摘要条 47px、独立空卡 0｜AL5 rail 空洞 12px｜AL6 同屏结论性分数 1｜AL7 越刻度 0 处｜AL8 孤儿末卡 0｜AL9 横向溢出 0px｜AL10 定位后命中项可达｜AL11 阻断态禁用 + 放行态可点）；`tools/class-audit.mjs` 基线静态 class 全在 + 18 项动态类来源字面量全在 + 基线 #id 42 全在；`test-lint-layout.mjs` 12/12；对比度探针亮/暗各 0 条不足；单文件体积 **436KB → 105,618 字节（−75.9%）**；几何实测：390 首屏 chrome 906→197px、裁决→首条 P0 498→118px、0 命中卡 908→46px、rail 空洞 1191→0、吸顶重叠 17→0px。
> - **状态**：已落地（版本升到 v0.21.0，两批合并收官）。遗留（如实）：①交接「四」的 `human-baseline.html?set=B` 作者盲测冷跑仍未取数（两批均挂账，标注不阻塞，待补跑回填 `prototype/人工实测对照表.md`）；②M19 的声明级判据 A1–A13 尚未工具化（`tools/lint-ui.mjs` 未建），本版仅由 `lint-layout` 承担 AL7 间距刻度，A1–A6/A8–A13 仍靠人工核；③SOP-2 第 7 步双复审（rescan-audit 安全向 + gk-review-wave 台账向）待推送后执行（本次未推送）。

### v0.20.2（2026-10-07）：A-12 写前对账规程 + A-14 lint-links 未跟踪盲区修复（第二期复盘行动部分落地）

> **来源**：用户确认 H-03（并发会话=多 AI session）并询问 A-14 形态取舍，执行方建议方案 a（机械防线）获采纳。
> - **执行（A-12）**：AGENTS「变更与版本约定」增写前对账规程——动工前 `git pull` 对账 + 读对齐表最大 M# + 复用已登记行 + 提交前再 pull；依据=M17 双登记实锤（245221a/692d08c）。
> - **执行（A-14）**：lint-links 扫描范围从 `git ls-files` 扩至 `--cached --others --exclude-standard`（纳入未跟踪非忽略文件），消除"新文件入库前不受检"盲区（M17 复审 P-21 根因）；活体负样本——未跟踪临时 md 断链 exit 1 且逐条点名，删除后 exit 0。
> - **文件**：prototype/tools/lint-links.mjs、AGENTS.md、docs/工作复盘与优化分析报告-2026-10-07.md（H-03 补记）、交接文档.md、prototype/configs/gatekeeper-self.json（0.20.2 + 登记）、本文件。
> - **验证**：十门全绿；test-lint-links 15/15；活体负样本 exit 1/还原 exit 0；H-03 从【待验证】转【已验证】（用户口头确认在案）。
> - **状态**：已落地。第二期复盘行动余项（A-09/A-10/A-13）见交接「四」，A-09+A-10 合并 M18 引擎与工具批。

### v0.20.1（2026-10-05）：M17 双复审实战处置 —— 安全向 P1 两修 + 台账向 18 项全处置 + 双复审时长实测

> **来源**：M17 收官后双复审首跑（SOP-2 第 7 步）结果处置。安全向 rescan-audit（7 研究员+三镜头，1h20m）：16 候选→确认 14 否决 2；台账向 gk-review-wave（五镜头，1h00m）：28 候选→汇裁 18→确认 18（P1×2）0 误报。
> - **执行（安全向 P1×2）**：①`real-batch-audit.mjs` 计划注释行 author 未压平换行——多行占位符形值可向被跟踪的 dws 计划注入未注释活命令行（复扫 R9 同款防线在 dws-bridge 有、本文件漏）→ 对齐 dws-bridge:143 压平 `[
]+`；②`dws-bridge.mjs` hasRealIds 只查 cfg 六字段——artifacts 供入的 authorUserId/author/name 绕过改写本地路径守卫，真实 ID 烘进被跟踪的 dws-plan.sh（历史泄露同款机制旁路）→ hasRealIds 纳入 artifacts 三字段。
> - **执行（台账向 18 项全处置）**：双复审接线四处实补（AGENTS SOP-2 第 7 步/CLAUDE 收官链/gk-release 第 7 步/release.mjs 步骤⑤）；ROADMAP M17 ✅+M13 历史残留 ✅；交接「二」「一」「四」三处同步；方案/STRUCTURE 状态行转存档；.zcode/workflows/ 入 STRUCTURE 树；两份复审报告落盘 `output/review-wave-{试运行-v0.19.2,M17-v0.20.0}.md`（消除断链）。
> - **执行（安全向遗留挂账 M18 安全加固批，报告 artifact 有完整复现与修法）**：F01 gates.mjs G1/成本类 snip 未脱敏 PII（建议 maskSnip 抽公共）；F02 makeConfig registry.versions 畸形可崩溃/静默弱化 G2（建议 safeStrArray 归一化+Array.isArray 守卫）；info 五项（doc 本体形状校验/doc-sync 豁免契约漂移/q() 反斜杠/project-check 表格注入面/.bak- 变体）。
> - **执行（双复审时长实测回填）**：rescan-audit 1h20m26s（29 步/1817 万 tokens）；gk-review-wave 59m55s（72 步/790 万 tokens）——复盘 A-04 与本段遗留②清账，对齐表 M17 行已回填。
> - **执行（v0.20.0 段勘误，历史段不改写故记于此）**：①v0.20.0 段「文件」行双向不符——漏列 README.md/prototype/gatekeeper.html/prototype/output/project-check-GateKeeper_自身治理文档.md，多列 AGENTS.md/.gitignore/prototype/output/lint-workspace-first-run.md（实测 b412813..HEAD=19 文件）；②「lint-workspace 补登记 AGENTS SOP-4」为虚结案（实落 CLAUDE.md 常用命令，AGENTS.md 全历史未含该词）；③「见执行⑤」编号不存在（执行子弹无编号）。
> - **文件**：prototype/dws-bridge.mjs、prototype/real-batch-audit.mjs、.gitignore（`*.local.*`，F05 P1 随批前置修复）、prototype/tools/lint-workspace.mjs（探针+1）、AGENTS.md、CLAUDE.md、STRUCTURE.md、交接文档.md、ROADMAP.md、收官五查工作流方案.md、.agents/skills/gk-release/SKILL.md、prototype/output/review-wave-{试运行-v0.19.2,M17-v0.20.0}.md（新建）、prototype/configs/gatekeeper-self.json（0.20.1 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 十门全绿；test-release 18/18、test-lint-workspace 13/13；F05 修复后 fresh-clone 模拟 `git check-ignore` exit 0；两 P1 修复 `node --check` 通过；安全向 R1-R20 核验台账 20 项全部落地（positive 实证在案）。
> - **状态**：已落地。遗留：M18 安全加固批（F01/F02/info 五项，复现与修法见安全重扫描报告 artifact）。

### v0.20.0（2026-10-05）：M17 收官五查工作流 gk-review-wave 转正 + 双复审入链 + 历史勘误

> **来源**：用户拍板 P1（收官五查工作流转正）+P2（双路评审做成 depth 扩展点不单建）。试运行（基线 5f4a4e6，v0.19.2 批回溯+逐 commit 快照）：五镜头 30 候选→汇裁 21→独立确认成立 21（P1×3）0 误报——含 HEAD 门禁红等实弹发现；字面复现口径未达（6/8 真值已修复），实弹检测超纲，用户拍板转正。
> - **执行（工作流）**：新建 `.zcode/workflows/gk-review-wave.dwf.ts`——五镜头（台账/状态行/接线/四件套/指针语义）并行+汇裁去重+逐条独立确认+中文报告；args `baseCommit` 提供时逐 commit 快照审查（git show）；`depth` 扩展点预留未实现（P2 双路评审）。
> - **执行（试运行 21 项处置）**：并发会话双登记去重（ROADMAP/对齐表 M17 各两行→各一行；245221a+692d08c 并行立项实锤，git 历史在案）；方案 L5 示例豁免+状态行更新；lint-workspace 补登记 AGENTS SOP-4；"九门"硬编码四处改引用式；执行器覆盖口径三处对齐（CLAUDE/脚本头注/gk-release 第 7 步改复审步）；对齐表 v0.19.1/v0.19.2 行补后继修正 hash（a382abe/b116176）；STRUCTURE 补方案行；release.mjs --verify 无参文案修复；doc-sync 补 CHANGELOG 独立版本核对（见执行⑤）。
> - **执行（历史勘误，历史段不改写故记于本段）**：①v0.19.1/v0.19.2 两段「文件」行均漏列 README.md 与 交接文档.md（版本行系三机械步产物，git diff 实证各 14/13 文件）；②技能层批次（af57252 建 4 个 SKILL.md）与 docs commit（3649bf4 复盘入档、043c8b5 SOP-2 第 6 步）当时未登记版本段，于此补记；③output/lint-workspace-first-run.md 标题"53 FAIL"含解析器 bug 期误报（可复算构成=处置 11+误报 42）；④复盘报告两处小勘误已随手修正（目录 S-01~S-05、提交计数锚定 043c8b5）。
> - **执行（dogfood 发现的门禁死区）**：doc-sync 的 CHANGELOG 顶部版本核对原写在 CORE_DOCS 循环内，而 CHANGELOG 从不在清单——该红线自 v0.18.0 起为死代码（人工收官先写 CHANGELOG 故未暴露）；补独立单规则核对，活体负样本=本收官中间态当场 exit 1。
> - **文件**：.zcode/workflows/gk-review-wave.dwf.ts（新建）、prototype/tools/doc-sync.mjs、tools/release.mjs、CLAUDE.md、AGENTS.md、STRUCTURE.md、交接文档.md、ROADMAP.md、.gitignore、新Agent启动Prompt.md、收官五查工作流方案.md、docs/档案/批次编号对齐表.md、docs/工作复盘与优化分析报告-2026-10-05.md、.agents/skills/gk-{release,review,port}/SKILL.md、output/lint-workspace-first-run.md、prototype/configs/gatekeeper-self.json（0.20.0 + 登记）、本文件。
> - **验证**：test-release 18/18、test-docsync 36/36；十门全绿；`--verify v0.20.0` 通过；doc-sync 活体负样本（registry 0.20.0 vs CHANGELOG v0.19.2 中间态）exit 1 → 填段后 exit 0；gk-review-wave 试运行 21 确认/0 误报；release.mjs 第二战机械步零遗漏。双复审首跑时长于推送后实测、由台账 commit 补记。
> - **状态**：已落地。遗留：①depth 扩展点未实现（P2）；②双复审首跑时长【待补充→本日实测填入台账】。

### v0.19.2（2026-10-05）：收官执行器 release.mjs + 检查表退出码行 + 复审入链（复盘行动 A-01/A-02/A-04）

> **来源**：用户 userselect 拍板第一梯队三项（复盘《工作复盘与优化分析报告-2026-10-05》§8.2：A-02 P0 / A-01 / A-04）。动机数据：收官七步手工链 3 次漏做实史；R-08 族复发 3+1 次未归零；rescan-audit 能力已验证（W42 首跑 1 P1/12 P2）但闲置。
> - **执行（A-02）**：新建 `prototype/tools/release.mjs`——收官模式（registry 锚定登记→sync-configs 重注入→README/交接版本行→十门→打印手工步骤清单含 CHANGELOG 标题模板/commit 草稿/台账与复审提示）+ `--verify`（四处版本一致性+十门复核）+ `--dry-run`（不写盘预演）；**边界=不自动 commit/push**（机械步骤脚本做、判断性内容人写、提交人审——用户拍板）。`tools/test-release.mjs` 18 例测试先行（先红后绿）。接线：CLAUDE 常用命令、STRUCTURE tools 树、AGENTS SOP-2 执行器段、gk-release 技能同步。
> - **执行（A-01）**：RELEASE-CHECKLIST 增第 11 行"退出码直取，禁管道取尾"（出处=R-08+M15 两现行犯+M16 一现行犯）。
> - **执行（A-04）**：SOP-2 增第 7 步"复审（push 后 Agent 运行 rescan-audit 保存工作流）"；首跑计入收官链的时长【待补充：下次收官实测】。
> - **文件**：prototype/tools/release.mjs（新建）、tools/test-release.mjs（新建）、tools/RELEASE-CHECKLIST.md、AGENTS.md、CLAUDE.md、STRUCTURE.md、.agents/skills/gk-release/SKILL.md、prototype/configs/gatekeeper-self.json（0.19.2 + 登记）、本文件。
> - **验证**：test-release 18/18；负样本——坏版本号 exit 1、同版本防重复收官 exit 1、--verify 在四处漂移时逐项点名；**dogfood 实证：本版本收官由 release.mjs 本尊执行**（registry/重注入/版本行三机械步零遗漏，CHANGELOG 由人填后 --verify 复核通过）；`node tools/gate.mjs` 十门全绿。
> - **状态**：已落地。M17 收官继续用本脚本并实测"漏做=0、耗时-50%"（S-03 任务卡验收）。

### v0.19.1（2026-10-05）：工作区体检 lint-workspace —— 文件清单漂移防线（门序列第十门）

> **来源**：M16 review 提出文件清单漂移缺口（nul 卡 add 人工查/邻仓 pyc 扫入事故/STRUCTURE 纯手工无核对），用户拍板方案 A（轻量三查，否决大白名单制）。
> - **执行**：新建 `prototype/tools/lint-workspace.mjs` 三查——①未跟踪垃圾（git status `??` 条目命中 10 类垃圾模式）；②STRUCTURE 树声明→存在（单向核对，围栏裸根标签语义+`<!--lint-workspace:exempt-->` 行级豁免）；③.gitignore 覆盖探针（10 代表路径 git check-ignore）；+ `tools/test-lint-workspace.mjs` 13 例；门序列九→十门 + CI + CLAUDE 常用命令。
> - **首跑 53 FAIL 全处置**：STRUCTURE 三行压缩/通配写法（7 个真实截图文件被 3 行替代）展开为逐文件条目；accept-A..E.md 区间记法豁免保记法；.gitignore 补 7 类覆盖。解析器修 3 bug（裸根标签未入栈/8 字符缩进深度公式/根标签同名仓库根特判），留证 `output/lint-workspace-first-run.md`。
> - **文件**：prototype/tools/lint-workspace.mjs（新建）、tools/test-lint-workspace.mjs（新建）、tools/gate.mjs（十门）、.github/workflows/gatekeeper.yml、CLAUDE.md、STRUCTURE.md、.gitignore、output/lint-workspace-first-run.md（新建）、prototype/configs/gatekeeper-self.json（0.19.1 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 十门全绿；test-lint-workspace 13/13；真文件负样本——gitignore 注释+debug.log 双层齐抓 exit 1/还原 exit 0，mv 已声明文件 STRUCTURE 缺失 exit 1/还原 exit 0。
> - **状态**：已落地。遗留（如实）：①未跟踪非垃圾 WIP 文件为 INFO 不阻断（工作属性使然）；②docs/ 子目录（方法论/档案）未逐文件入树声明，第十门只核对到 docs/ 目录层。

### v0.19.0（2026-10-05）：M16 西游记经验移植 —— 链接体检 + 禁改契约 + 启动Prompt + 方法论文档化 + 改动面审计

> **来源**：用户拍板"全部都可做"（五项全移），方案存档于 docs/档案/方案/，当日立项当日落地。源仓=既有内容生产仓（demo 配置 xiyouji 所本），此为第三轮跨仓移植。
> - **执行（T1 lint-links）**：新建 `prototype/tools/lint-links.mjs`（git ls-files 只扫跟踪文件；md/HTML 站内链接存在性、`../` 越仓即红、`lint-links:exempt` 行级豁免）+ `tools/test-lint-links.mjs` 15 例 + 门序列八→九门 + CI。**首跑 6 FAIL 全为例证非真断链**：CHANGELOG v0.12.1 段"G1 假阳性案例"历史引文（当年被误判的链接样子被新门禁再抓出，豁免保原文）+ 本方案自身规格示例 3 行（讲检查器的文档触发检查器）；站内实检 46 条零真实断链；负样本断链/越仓 exit1→还原 exit0。
> - **执行（T2 禁改契约）**：AGENTS.md 新「禁改清单」（7 对象带误改后果与例外通道）与「治理文档维护契约」（结构性编辑/就地替换去重/状态即时更新/150 行膨胀警戒/冲突序五条）；CLAUDE.md 必守第 11 条。
> - **执行（T3 启动Prompt）**：新建《新Agent启动Prompt.md》（39 行五段骨架 payload）+ 纳入 CORE_DOCS（8→9）；**落地即被 check-docs 实拦一次**——元信息块加粗合并行不被 `> 键：值` 提取契约识别（G6 P1），改三行逐行格式并记入 SOP-4 第 5 步（提取契约成文）。
> - **执行（T4 方法论文档化）**：新建 docs/方法论/ 8 篇四段式（来源事故/规则/验证方法/出处，出处含 commit hash 与雷区编号可回查）+ 索引 README；交接文档「三」9 条带锚点（6 既有 + 3 新条）。
> - **执行（T5 改动面审计）**：CLAUDE.md 必守第 12 条 + 启动 Prompt 同步 12 条 + AGENTS「变更与版本约定」锚定；**验收实证一次**：注入垃圾行 → `git diff --name-only` 捕获 → restore 回退后 0 残留。
> - **文件**：prototype/tools/lint-links.mjs（新建）、tools/test-lint-links.mjs（新建）、tools/gate.mjs（九门）、.github/workflows/gatekeeper.yml、check-docs.mjs（CORE_DOCS 8→9）、新Agent启动Prompt.md（新建）、docs/方法论/（新建 9 文件）、AGENTS.md、CLAUDE.md、STRUCTURE.md、交接文档.md、output/lint-links-first-run.md（新建）、ROADMAP.md、西游记经验移植方案.md、prototype/configs/gatekeeper-self.json（0.19.0 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 九门全绿；lint-links 0 FAIL + 断链/越仓负样本必红恢复必绿（退出码直取）；test-lint-links 15/15；check-docs 九文档全绿（Prompt 的 G6 实拦→修复→转绿闭环）；改动面审计实证 0 残留。
> - **状态**：已落地。M16 六 commit：d4d1bae 立项 / ef25b17 T1 / 2f7f490 T2 / 7156af3 T3 / 8df7e73 T4 / dd8c0d1 T5。遗留（如实）：①lint-links v1 不做外链探测与 --fix；②docs/方法论 不入 CORE_DOCS（受链接体检覆盖）；③CI 纯文档提交不触发（paths 设计），由本地九门覆盖。

### v0.18.0（2026-10-05）：M15 经验移植 —— 文档口径体检 + verify 自洽锁 + 批次编号对齐表

> **来源**：用户 userselect 拍板移植既有竞赛仓三项治理机制（doc-sync 口径体检 > GATE_TOTAL 自洽锁 > 批次编号对齐表），方案存档于 docs/档案/方案/，当日立项当日落地。方向说明：该仓已从本仓反向移植治理模式，本批为反向回流第一轮。
> - **执行（T1 doc-sync）**：新建 `prototype/tools/doc-sync.mjs`——机器读代码真值（registry 版本 / gate.mjs 门数 / node --test 单测数 / CORE_DOCS 清单从 check-docs.mjs 源码运行时解析、解析失败即 FAIL）反向对拍文档当前态声明；四规则=三类版本当前态句 + 陈旧门数词（五门禁恒过期）+「N 门全绿」+「测试 N 例」；`<!--doc-sync:exempt-->` 行级豁免标记承载"历史不改写"；+ `tools/test-docsync.mjs` 自测 36 例；接入门序列（七→八门）与 CI。**首跑抓出 9 处"五门禁"存量漂移**（方案盘点 7 处——门禁比人工盘点全）：8 处改写为引用式当前态、历史时点事实打豁免标记（`output/doc-sync-first-run.md` 留证）；负样本：README 版本行改 v0.17.1 → exit 1 点名、还原 exit 0。
> - **执行（T2 自洽锁）**：verify.mjs 增 `VERIFY_TOTAL=12` + ok() 计数 + 实跑≠声明即红；**落地即抓出 gate.mjs 标签"verify（13 项）"漂移并修正（实为 12）**；既有 12 项断言逐字未动（样例五裁决 A0/B49/C17/D84/E100 零变化）；负样本：注释一条断言 →「实跑 11 ≠ 声明 12」exit 1、恢复 exit 0。
> - **执行（T3 对齐表）**：新建 `docs/档案/批次编号对齐表.md`——M1..M15 全行回填、hash 逐行 git 实证；**如实标注历史事实：仓库共 33 提交，M1–M8.2 时期无逐版提交、压缩入基线快照 3c01179**；规则三句（登记认领/不另起编号/不改他方行）+ CLAUDE.md 必守第 10 条 + AGENTS.md「变更与版本约定」对账锚定。
> - **文件**：prototype/tools/doc-sync.mjs（新建）、tools/test-docsync.mjs（新建）、tools/gate.mjs、tools/RELEASE-CHECKLIST.md、.github/workflows/gatekeeper.yml、verify.mjs、README.md、CLAUDE.md、AGENTS.md、STRUCTURE.md、交接文档.md、docs/档案/批次编号对齐表.md（新建）、output/doc-sync-first-run.md（新建）、ROADMAP.md、经验移植方案（存档于 docs/档案/方案/）、prototype/configs/gatekeeper-self.json（0.18.0 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 八门全绿（doc-sync 门 314ms）；test-docsync 36/36；doc-sync 0 FAIL + 负样本必红恢复必绿（退出码直取；R-08 管道吞退出码在落地当天复发两次、均已直取重取并入留证文件）；verify 负样本 11≠12 必红；对齐表 hash 逐行回查成立。
> - **状态**：已落地。M15 四 commit：860856a 立项 / 86beaa8 T1 / f6328de T2 / f6c4056 T3。遗留（如实）：①doc-sync 单测句式规则当前"武装待命"（受检文档暂无「测试 N 例」当前态句）；②M12 尚未立项、编号保留；③CI 对纯文档提交不触发（paths 过滤设计如此），doc-sync 由本地八门覆盖。

### v0.17.2（2026-10-04）：CLAUDE.md 增必守规则第 9 条 —— 写作可验证纪律成文

> **来源**：用户拍板"只加 CLAUDE.md"——把项目一贯执行的写作标准（从实际情况出发/表述明确具体/消除模糊措辞/可量化可验证/跨 Agent 与跨 session 读者无需额外解释）从口头纪律固化为必守规则。放置位置经三层分工论证：always-on 写作纪律归速查层（宿主自动加载，动笔即在上下文），不复制进 AGENTS.md（SOP 操作层），防双头漂移——单一事实源，其他文件按需锚定引用。
> - **执行**：CLAUDE.md 必守规则增第 9 条"写作可验证纪律"（禁"尽快/适当/相关"类模糊措辞；可量化可验证替代笼统表述；验收标准含期望输出；跨 Agent/跨 session 自包含），节标题 8 条→9 条；范本指针指向仓内既有实证——UI升级方案.md 抬头（原文即"所有条目给出精确值与验证方式，其他 Agent 无需额外解释即可实施与验收"）与既有内部仓方案存档。 <!--lint-links:exempt 历史段链接，目标文件已迁 docs/档案/方案/，历史段不改写-->
> - **文件**：CLAUDE.md、README.md、交接文档.md、prototype/configs/gatekeeper-self.json（0.17.2 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 七门禁全绿（check-docs 扫描 8 核心文档含改后 CLAUDE.md）；版本三处一致 v0.17.2；registry 改后 sync-configs 重注入 --check 绿。
> - **状态**：已落地。

### v0.17.1（2026-10-04）：新增 AGENTS.md 操作手册层 —— SOP-1..5 标准流程固化

> **来源**：用户指令"增加 AGENTS.md"。M14 已移植速查层（CLAUDE.md）与雷区登记制（交接文档「六」），本条补齐既有内部仓模式的第三层——把散落在方法论沉淀/雷区出处/发布检查表里的周期性操作固化为编号 SOP。三层分工定稿：CLAUDE.md=速查 / AGENTS.md=操作 / 交接文档=状态与方法论。
> - **执行**：①新建根目录 `AGENTS.md`——SOP-1 改引擎规则 / SOP-2 版本发布 / SOP-3 UI 视觉变更 / SOP-4 治理文档新增 / SOP-5 新 session 接手，每条带出处锚点（雷区编号/检查表行号/commit hash），只锚定不复制既有内容；②纳入 check-docs CORE_DOCS（7→8 文档）；③STRUCTURE 顶层树、交接文档「五」文件索引、CLAUDE.md「接手导航」三处同步登记。
> - **文件**：AGENTS.md（新建）、prototype/check-docs.mjs、STRUCTURE.md、CLAUDE.md、交接文档.md、README.md、prototype/configs/gatekeeper-self.json（0.17.1 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 七门禁全绿（check-docs 扫描 8 核心文档含 AGENTS.md）；SOP 出处逐条回查真实（R-01/R-05/R-06/R-08、RELEASE-CHECKLIST 第 10 项、commit e4af608）；registry 改后 sync-configs 重注入，--check 绿（SOP-2 第 2 步自证）。
> - **状态**：已落地。命名采用跨工具通行的 AGENTS.md 拼法（与既有内部仓一致；用户指令字面为"AGENT.md"）。

### v0.17.0（2026-10-04）：M14 经验移植 —— 视觉验收闭环 + 雷区结构化 + AI 速查层

> **来源**：用户指令对既有内部仓做经验盘点后拍板的 M14（规格方案存档于 docs/档案/方案/，当日立项当日落地）。移植方法=逐项对照 GateKeeper 现状：已有机制（正向红线/单一事实源/四件套）明确不移植，只立经核实的 3 个缺口（T1 视觉验收闭环 / T2 雷区结构化 / T3 AI 速查层）。
> - **执行（T1）**：新建 `prototype/tools/VISUAL-ACCEPTANCE.md`——四要素（五步闭环定义/验收 Prompt 模板/像素采样法含 reduced_motion 仿真/三道关分工：smoke 运行时行为→UI升级方案 §7 设计规格→本闭环视觉判定）；RELEASE-CHECKLIST 追加第 10 项"视觉验收闭环"；试运行留证：控制台三档截图（1280/640/暗色）逐页判定 3 pass、must_fix 空（`output/visual-accept-trial.md`）。
> - **执行（T2）**：交接文档「六、已知雷区」结构化为 7 列登记表——存量 4 条零丢失迁移 + 新增 6 条逐条实证出处（goView 复位吞粘贴 v0.14.0／粘贴焦点滞留 v0.15.5／门禁盲区假绿 v0.15.6／管道吞退出码 d540b1c／G2 版本正则误判测量值 v0.10.0／nul 保留名卡 add v0.15.1）；「四、待办事项」勾选清单转表格并增"触发/解锁条件"列（15 行全保留）。
> - **执行（T3）**：新增根目录 `CLAUDE.md`（42 行：8 条必守规则带"详见"权威指针 / 常用命令 / 环境注意逐条实证——Playwright 须全局 NODE_PATH 经有/无对照实测证实）并纳入 check-docs CORE_DOCS（6→7 文档：新文档进门禁覆盖面，防"全绿"声明过期）。
> - **文件**：prototype/tools/VISUAL-ACCEPTANCE.md（新建）、tools/RELEASE-CHECKLIST.md、output/visual-accept-trial.md（新建）、交接文档.md、CLAUDE.md（新建）、prototype/check-docs.mjs、ROADMAP.md、STRUCTURE.md、README.md、prototype/configs/gatekeeper-self.json（0.17.0 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 七门禁全绿（check-docs 扫描 7 核心文档含 CLAUDE.md）；T1 试运行 3 页 pass/0 must_fix；T2 雷区表 10 行出处 100% 可回查、存量信息零丢失；T3 CLAUDE.md 42 行 ≤60、规则指针逐条命中、NODE_PATH 对照实测通过。
> - **状态**：已落地。M14 四 commit：437c841 立项 / 2b828ca T1 / cf639ea T2 / 21a112c T3。非目标守住：gates.mjs 引擎零改动、gatekeeper.html 零改动、零新增依赖。遗留（如实）：试运行记录的 3 条轻微视觉瑕疵（环形图中心副标题与描边轻微叠压、640 档栅格换行留空）未修——非阻断，留作下次 UI 迭代的「本轮修复点」输入。

---
> 更早版本段（v0.1.0–v0.16.0，M1–M13 时代）已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。