# 发布闭环检查表 · 每次提交前逐项勾（SC-01 沉淀物，复盘报告 §5）

> 来源：2026-10-03 周期踩过的全部坑反向成表。配合 `node tools/gate.mjs` 使用；全部 ✅ 才可提交。

| # | 检查项 | 命令/动作 | 自动化载体 | 本次事故出处 |
|---|---|---|---|---|
| 1 | 全量门禁全绿 | `node tools/gate.mjs`（或 `--full`） | 本项即自动化 | P-01/P-02 |
| 2 | CHANGELOG 四件套（来源/执行/文件/验证），「文件」行与 `git show --stat` 对齐 | 通读新条目 | **人工**（判断性内容不自动化） | v0.15.0 漏列 gatekeeper.html |
| 3 | 版本三处一致：CHANGELOG 顶部 = README 抬头 = 交接文档「一」 | `node tools/release.mjs --verify` | release.mjs --verify + doc-sync 版本句 | P-12（第 4 次改A漏B） |
| 4 | 版本三段式 `vX.Y.Z`（禁 `vX.Y.x`），registry currentVersion+versions 已登记 | `node tools/release.mjs vX.Y.Z --dry-run` 预演 | release.mjs（锚定替换 fail-closed） | P-02（check-docs 拦过 2 次） |
| 5 | 代码中"声明"逐条 grep 实证（如"已被 .gitignore 覆盖"） | `git check-ignore <路径>` | **人工**（E1 铁律，逐声明） | P-10 |
| 6 | 残留扫描：旧品牌/真实 ID/私有仓名 | `grep -rnE "参赛\|验收官\|cid0pTIe..." --exclude-dir=.git .` | **人工**（E1 铁律；v0.21.4 起另有防回流探针兜底跟踪面） | v0.13.0 全仓扫 |
| 7 | 无 `nul` 垃圾文件（Windows 保留名卡 git add） | `ls nul 2>/dev/null` | lint-workspace 第一/三查（第十门） | v0.15.1 提交受阻 |
| 8 | 行尾 LF（.gitattributes eol=lf，批量写文件后归一化） | `grep -qU $'\r' <改动文件>` | **人工**（批量写后自查） | v0.13.0 CRLF 警告 |
| 9 | 工作区干净、提交信息规范（`type(scope): 描述 (vX.Y.Z)`） | `git status --short` | lint-workspace（untracked/防回流）；commit 信息**人工** | — |
| 10 | 视觉验收闭环（涉及 UI/截图变更时）：渲染→逐页判定→修复→复检→像素采样五步走完，判定 JSON 落 `output/visual-accept-*.md`（本地留存，公开面不含——结论摘要进 CHANGELOG） | 按 [VISUAL-ACCEPTANCE.md](VISUAL-ACCEPTANCE.md) 执行；纯后端/纯文档改动可豁免并注明 | **人工**（视觉判定不自动化） | M14-T1 立项（闭环缺口，无单次事故） |
| 11 | 退出码直取：门禁/取证命令禁管道取尾（`cmd \| tail` 后的 `$?` 是 tail 的恒绿）；需要输出又需退出码时先存变量再过滤 | `out=$(cmd); s=$?`；门禁一律经 `tools/gate.mjs` 串行 | 本项即纪律（gate.mjs 内部已直取） | R-08（v0.15.6 实拦）；M15 两现行犯+M16 一现行犯（复盘 P-01 族，A-01） |

**每条修复的附加项**（安全/逻辑修复时）：针对性冒烟 PoC 复现→修复→复测 3/3 通过（E-02）；修复声明由未参与修复的代理复核（E-03）。
