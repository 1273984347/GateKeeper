# 更新日志 · GateKeeper

> 正向时间线，**唯一写细节的文件**。每条含「来源 / 执行 / 文件 / 验证 / 状态」四件套。
> 交接文档、README、STRUCTURE 只更新版本号与引用式表述，细节一律指向本文件。
> 约定：版本 `vX.Y.Z` + 里程碑 `M#`；本文件超过约 50KB 时把过期里程碑归档至 `CHANGELOG-ARCHIVE.md`。

## [Unreleased]
- 待办见 [交接文档.md](交接文档.md)「四、待办事项」。

---

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

> **来源**：M16 review 提出文件清单漂移缺口（nul 卡 add 人工查/内部协作仓 pyc 扫入邻仓事故/STRUCTURE 纯手工无核对），用户拍板方案 A（轻量三查，否决大白名单制）。
> - **执行**：新建 `prototype/tools/lint-workspace.mjs` 三查——①未跟踪垃圾（git status `??` 条目命中 10 类垃圾模式）；②STRUCTURE 树声明→存在（单向核对，围栏裸根标签语义+`<!--lint-workspace:exempt-->` 行级豁免）；③.gitignore 覆盖探针（10 代表路径 git check-ignore）；+ `tools/test-lint-workspace.mjs` 13 例；门序列九→十门 + CI + CLAUDE 常用命令。
> - **首跑 53 FAIL 全处置**：STRUCTURE 三行压缩/通配写法（7 个真实截图文件被 3 行替代）展开为逐文件条目；accept-A..E.md 区间记法豁免保记法；.gitignore 补 7 类覆盖。解析器修 3 bug（裸根标签未入栈/8 字符缩进深度公式/根标签同名仓库根特判），留证 `output/lint-workspace-first-run.md`。
> - **文件**：prototype/tools/lint-workspace.mjs（新建）、tools/test-lint-workspace.mjs（新建）、tools/gate.mjs（十门）、.github/workflows/gatekeeper.yml、CLAUDE.md、STRUCTURE.md、.gitignore、output/lint-workspace-first-run.md（新建）、prototype/configs/gatekeeper-self.json（0.19.1 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 十门全绿；test-lint-workspace 13/13；真文件负样本——gitignore 注释+debug.log 双层齐抓 exit 1/还原 exit 0，mv 已声明文件 STRUCTURE 缺失 exit 1/还原 exit 0。
> - **状态**：已落地。遗留（如实）：①未跟踪非垃圾 WIP 文件为 INFO 不阻断（工作属性使然）；②docs/ 子目录（方法论/档案）未逐文件入树声明，第十门只核对到 docs/ 目录层。

### v0.19.0（2026-10-05）：M16 西游记经验移植 —— 链接体检 + 禁改契约 + 启动Prompt + 方法论文档化 + 改动面审计

> **来源**：用户拍板"全部都可做"（五项全移），方案《西游记经验移植方案.md》当日立项当日落地。源仓=详解西游记（本仓方法论祖仓），此为第三轮跨仓移植（M14 内部协作仓、M15 竞赛、M16 西游记）。
> - **执行（T1 lint-links）**：新建 `prototype/tools/lint-links.mjs`（git ls-files 只扫跟踪文件；md/HTML 站内链接存在性、`../` 越仓即红、`lint-links:exempt` 行级豁免）+ `tools/test-lint-links.mjs` 15 例 + 门序列八→九门 + CI。**首跑 6 FAIL 全为例证非真断链**：CHANGELOG v0.12.1 段"G1 假阳性案例"历史引文（当年被误判的链接样子被新门禁再抓出，豁免保原文）+ 本方案自身规格示例 3 行（讲检查器的文档触发检查器）；站内实检 46 条零真实断链；负样本断链/越仓 exit1→还原 exit0。
> - **执行（T2 禁改契约）**：AGENTS.md 新「禁改清单」（7 对象带误改后果与例外通道）与「治理文档维护契约」（结构性编辑/就地替换去重/状态即时更新/150 行膨胀警戒/冲突序五条）；CLAUDE.md 必守第 11 条。
> - **执行（T3 启动Prompt）**：新建《新Agent启动Prompt.md》（39 行五段骨架 payload）+ 纳入 CORE_DOCS（8→9）；**落地即被 check-docs 实拦一次**——元信息块加粗合并行不被 `> 键：值` 提取契约识别（G6 P1），改三行逐行格式并记入 SOP-4 第 5 步（提取契约成文）。
> - **执行（T4 方法论文档化）**：新建 docs/方法论/ 8 篇四段式（来源事故/规则/验证方法/出处，出处含 commit hash 与雷区编号可回查）+ 索引 README；交接文档「三」9 条带锚点（6 既有 + 3 新条）。
> - **执行（T5 改动面审计）**：CLAUDE.md 必守第 12 条 + 启动 Prompt 同步 12 条 + AGENTS「变更与版本约定」锚定；**验收实证一次**：注入垃圾行 → `git diff --name-only` 捕获 → restore 回退后 0 残留。
> - **文件**：prototype/tools/lint-links.mjs（新建）、tools/test-lint-links.mjs（新建）、tools/gate.mjs（九门）、.github/workflows/gatekeeper.yml、check-docs.mjs（CORE_DOCS 8→9）、新Agent启动Prompt.md（新建）、docs/方法论/（新建 9 文件）、AGENTS.md、CLAUDE.md、STRUCTURE.md、交接文档.md、output/lint-links-first-run.md（新建）、ROADMAP.md、西游记经验移植方案.md、prototype/configs/gatekeeper-self.json（0.19.0 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 九门全绿；lint-links 0 FAIL + 断链/越仓负样本必红恢复必绿（退出码直取）；test-lint-links 15/15；check-docs 九文档全绿（Prompt 的 G6 实拦→修复→转绿闭环）；改动面审计实证 0 残留。
> - **状态**：已落地。M16 六 commit：d4d1bae 立项 / ef25b17 T1 / 2f7f490 T2 / 7156af3 T3 / 8df7e73 T4 / dd8c0d1 T5。遗留（如实）：①lint-links v1 不做外链探测与 --fix；②docs/方法论 不入 CORE_DOCS（受链接体检覆盖）；③CI 纯文档提交不触发（paths 设计），由本地九门覆盖。

### v0.18.0（2026-10-05）：M15 竞赛经验移植 —— 文档口径体检 + verify 自洽锁 + 批次编号对齐表

> **来源**：用户 userselect 拍板移植竞赛仓三项治理机制（doc-sync 口径体检 > GATE_TOTAL 自洽锁 > 批次编号对齐表），方案《竞赛经验移植方案.md》当日立项当日落地。方向说明：竞赛仓 M104 已从本仓移植治理模式（其 CLAUDE.md 第 11 条即本仓写作纪律），本批为反向回流第一轮。
> - **执行（T1 doc-sync）**：新建 `prototype/tools/doc-sync.mjs`——机器读代码真值（registry 版本 / gate.mjs 门数 / node --test 单测数 / CORE_DOCS 清单从 check-docs.mjs 源码运行时解析、解析失败即 FAIL）反向对拍文档当前态声明；四规则=三类版本当前态句 + 陈旧门数词（五门禁恒过期）+「N 门全绿」+「测试 N 例」；`<!--doc-sync:exempt-->` 行级豁免标记承载"历史不改写"；+ `tools/test-docsync.mjs` 自测 36 例；接入门序列（七→八门）与 CI。**首跑抓出 9 处"五门禁"存量漂移**（方案盘点 7 处——门禁比人工盘点全）：8 处改写为引用式当前态、历史时点事实打豁免标记（`output/doc-sync-first-run.md` 留证）；负样本：README 版本行改 v0.17.1 → exit 1 点名、还原 exit 0。
> - **执行（T2 自洽锁）**：verify.mjs 增 `VERIFY_TOTAL=12` + ok() 计数 + 实跑≠声明即红；**落地即抓出 gate.mjs 标签"verify（13 项）"漂移并修正（实为 12）**；既有 12 项断言逐字未动（样例五裁决 A0/B49/C17/D84/E100 零变化）；负样本：注释一条断言 →「实跑 11 ≠ 声明 12」exit 1、恢复 exit 0。
> - **执行（T3 对齐表）**：新建 `docs/档案/批次编号对齐表.md`——M1..M15 全行回填、hash 逐行 git 实证；**如实标注历史事实：仓库共 33 提交，M1–M8.2 时期无逐版提交、压缩入基线快照 3c01179**；规则三句（登记认领/不另起编号/不改他方行）+ CLAUDE.md 必守第 10 条 + AGENTS.md「变更与版本约定」对账锚定。
> - **文件**：prototype/tools/doc-sync.mjs（新建）、tools/test-docsync.mjs（新建）、tools/gate.mjs、tools/RELEASE-CHECKLIST.md、.github/workflows/gatekeeper.yml、verify.mjs、README.md、CLAUDE.md、AGENTS.md、STRUCTURE.md、交接文档.md、docs/档案/批次编号对齐表.md（新建）、output/doc-sync-first-run.md（新建）、ROADMAP.md、竞赛经验移植方案.md、prototype/configs/gatekeeper-self.json（0.18.0 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 八门全绿（doc-sync 门 314ms）；test-docsync 36/36；doc-sync 0 FAIL + 负样本必红恢复必绿（退出码直取；R-08 管道吞退出码在落地当天复发两次、均已直取重取并入留证文件）；verify 负样本 11≠12 必红；对齐表 hash 逐行回查成立。
> - **状态**：已落地。M15 四 commit：860856a 立项 / 86beaa8 T1 / f6328de T2 / f6c4056 T3。遗留（如实）：①doc-sync 单测句式规则当前"武装待命"（受检文档暂无「测试 N 例」当前态句）；②M12 尚未立项、编号保留；③CI 对纯文档提交不触发（paths 过滤设计如此），doc-sync 由本地八门覆盖。

### v0.17.2（2026-10-04）：CLAUDE.md 增必守规则第 9 条 —— 写作可验证纪律成文

> **来源**：用户拍板"只加 CLAUDE.md"——把项目一贯执行的写作标准（从实际情况出发/表述明确具体/消除模糊措辞/可量化可验证/跨 Agent 与跨 session 读者无需额外解释）从口头纪律固化为必守规则。放置位置经三层分工论证：always-on 写作纪律归速查层（宿主自动加载，动笔即在上下文），不复制进 AGENTS.md（SOP 操作层），防双头漂移——单一事实源，其他文件按需锚定引用。
> - **执行**：CLAUDE.md 必守规则增第 9 条"写作可验证纪律"（禁"尽快/适当/相关"类模糊措辞；可量化可验证替代笼统表述；验收标准含期望输出；跨 Agent/跨 session 自包含），节标题 8 条→9 条；范本指针指向仓内既有实证——UI升级方案.md 抬头（原文即"所有条目给出精确值与验证方式，其他 Agent 无需额外解释即可实施与验收"）与 内部协作仓经验移植方案.md。 <!--lint-links:exempt 历史段链接，目标文件已迁 docs/档案/方案/，历史段不改写-->
> - **文件**：CLAUDE.md、README.md、交接文档.md、prototype/configs/gatekeeper-self.json（0.17.2 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 七门禁全绿（check-docs 扫描 8 核心文档含改后 CLAUDE.md）；版本三处一致 v0.17.2；registry 改后 sync-configs 重注入 --check 绿。
> - **状态**：已落地。

### v0.17.1（2026-10-04）：新增 AGENTS.md 操作手册层 —— SOP-1..5 标准流程固化

> **来源**：用户指令"增加 AGENTS.md"。M14 已移植速查层（CLAUDE.md）与雷区登记制（交接文档「六」），本条补齐内部协作仓模式的第三层——把散落在方法论沉淀/雷区出处/发布检查表里的周期性操作固化为编号 SOP。三层分工定稿：CLAUDE.md=速查 / AGENTS.md=操作 / 交接文档=状态与方法论。
> - **执行**：①新建根目录 `AGENTS.md`——SOP-1 改引擎规则 / SOP-2 版本发布 / SOP-3 UI 视觉变更 / SOP-4 治理文档新增 / SOP-5 新 session 接手，每条带出处锚点（雷区编号/检查表行号/commit hash），只锚定不复制既有内容；②纳入 check-docs CORE_DOCS（7→8 文档）；③STRUCTURE 顶层树、交接文档「五」文件索引、CLAUDE.md「接手导航」三处同步登记。
> - **文件**：AGENTS.md（新建）、prototype/check-docs.mjs、STRUCTURE.md、CLAUDE.md、交接文档.md、README.md、prototype/configs/gatekeeper-self.json（0.17.1 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 七门禁全绿（check-docs 扫描 8 核心文档含 AGENTS.md）；SOP 出处逐条回查真实（R-01/R-05/R-06/R-08、RELEASE-CHECKLIST 第 10 项、commit e4af608）；registry 改后 sync-configs 重注入，--check 绿（SOP-2 第 2 步自证）。
> - **状态**：已落地。命名采用跨工具通行的 AGENTS.md 拼法（与内部协作仓仓一致；用户指令字面为"AGENT.md"）。

### v0.17.0（2026-10-04）：M14 内部协作仓经验移植 —— 视觉验收闭环 + 雷区结构化 + AI 速查层

> **来源**：用户复盘"查看 (本地路径) 有哪些值得学习参考借鉴的地方"后拍板的 M14（规格见 [内部协作仓经验移植方案.md](内部协作仓经验移植方案.md)，当日立项当日落地）。移植方法=逐项对照 GateKeeper 现状：已有机制（正向红线/单一事实源/四件套）明确不移植，只立经核实的 3 个缺口（T1 视觉验收闭环 / T2 雷区结构化 / T3 AI 速查层）。 <!--lint-links:exempt 历史段链接，目标已迁 docs/档案/方案/，历史段不改写-->
> - **执行（T1）**：新建 `prototype/tools/VISUAL-ACCEPTANCE.md`——四要素（五步闭环定义/验收 Prompt 模板/像素采样法含 reduced_motion 仿真/三道关分工：smoke 运行时行为→UI升级方案 §7 设计规格→本闭环视觉判定）；RELEASE-CHECKLIST 追加第 10 项"视觉验收闭环"；试运行留证：控制台三档截图（1280/640/暗色）逐页判定 3 pass、must_fix 空（`output/visual-accept-trial.md`）。
> - **执行（T2）**：交接文档「六、已知雷区」结构化为 7 列登记表——存量 4 条零丢失迁移 + 新增 6 条逐条实证出处（goView 复位吞粘贴 v0.14.0／粘贴焦点滞留 v0.15.5／门禁盲区假绿 v0.15.6／管道吞退出码 d540b1c／G2 版本正则误判测量值 v0.10.0／nul 保留名卡 add v0.15.1）；「四、待办事项」勾选清单转表格并增"触发/解锁条件"列（15 行全保留）。
> - **执行（T3）**：新增根目录 `CLAUDE.md`（42 行：8 条必守规则带"详见"权威指针 / 常用命令 / 环境注意逐条实证——Playwright 须全局 NODE_PATH 经有/无对照实测证实）并纳入 check-docs CORE_DOCS（6→7 文档：新文档进门禁覆盖面，防"全绿"声明过期）。
> - **文件**：prototype/tools/VISUAL-ACCEPTANCE.md（新建）、tools/RELEASE-CHECKLIST.md、output/visual-accept-trial.md（新建）、交接文档.md、CLAUDE.md（新建）、prototype/check-docs.mjs、ROADMAP.md、STRUCTURE.md、README.md、prototype/configs/gatekeeper-self.json（0.17.0 + 登记）、本文件。
> - **验证**：`node tools/gate.mjs` 七门禁全绿（check-docs 扫描 7 核心文档含 CLAUDE.md）；T1 试运行 3 页 pass/0 must_fix；T2 雷区表 10 行出处 100% 可回查、存量信息零丢失；T3 CLAUDE.md 42 行 ≤60、规则指针逐条命中、NODE_PATH 对照实测通过。
> - **状态**：已落地。M14 四 commit：437c841 立项 / 2b828ca T1 / cf639ea T2 / 21a112c T3。非目标守住：gates.mjs 引擎零改动、gatekeeper.html 零改动、零新增依赖。遗留（如实）：试运行记录的 3 条轻微视觉瑕疵（环形图中心副标题与描边轻微叠压、640 档栅格换行留空）未修——非阻断，留作下次 UI 迭代的「本轮修复点」输入。

---
> 更早版本段（v0.1.0–v0.16.0，M1–M13 时代）已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。