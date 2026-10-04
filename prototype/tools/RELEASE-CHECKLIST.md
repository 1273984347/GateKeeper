# 发布闭环检查表 · 每次提交前逐项勾（SC-01 沉淀物，复盘报告 §5）

> 来源：2026-10-03 周期踩过的全部坑反向成表。配合 `node tools/gate.mjs` 使用；全部 ✅ 才可提交。

| # | 检查项 | 命令/动作 | 本次事故出处 |
|---|---|---|---|
| 1 | 五道门禁全绿 | `node tools/gate.mjs`（或 `--full`） | P-01/P-02 |
| 2 | CHANGELOG 四件套（来源/执行/文件/验证），「文件」行与 `git show --stat` 对齐 | 通读新条目 | v0.15.0 漏列 gatekeeper.html |
| 3 | 版本三处一致：CHANGELOG 顶部 = README 抬头 = 交接文档「一」 | `grep -n "当前版本\|**版本" README.md 交接文档.md` | P-12（第 4 次改A漏B） |
| 4 | 版本三段式 `vX.Y.Z`（禁 `vX.Y.x`），registry currentVersion+versions 已登记 | grep 新版本号 | P-02（check-docs 拦过 2 次） |
| 5 | 代码中"声明"逐条 grep 实证（如"已被 .gitignore 覆盖"） | `git check-ignore <路径>` | P-10 |
| 6 | 残留扫描：参赛/旧品牌/真实 ID | `grep -rnE "参赛\|验收官\|一夫当关\|4745..." --exclude-dir=.git .` | v0.13.0 全仓扫 |
| 7 | 无 `nul` 垃圾文件（Windows 保留名卡 git add） | `ls nul 2>/dev/null` | v0.15.1 提交受阻 |
| 8 | 行尾 LF（.gitattributes eol=lf，批量写文件后归一化） | `grep -qU $'\r' <改动文件>` | v0.13.0 CRLF 警告 |
| 9 | 工作区干净、提交信息规范（`type(scope): 描述 (vX.Y.Z)`） | `git status --short` | — |
| 10 | 视觉验收闭环（涉及 UI/截图变更时）：渲染→逐页判定→修复→复检→像素采样五步走完，判定 JSON 落 `output/visual-accept-*.md` | 按 [VISUAL-ACCEPTANCE.md](VISUAL-ACCEPTANCE.md) 执行；纯后端/纯文档改动可豁免并注明 | M14-T1 立项（闭环缺口，无单次事故） |

**每条修复的附加项**（安全/逻辑修复时）：针对性冒烟 PoC 复现→修复→复测 3/3 通过（E-02）；修复声明由未参与修复的代理复核（E-03）。
