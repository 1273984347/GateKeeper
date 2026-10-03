# UI 全面美化升级方案 · GateKeeper（gatekeeper.html）

> 版本：v0.8.0（M8）｜对象文件：`prototype/gatekeeper.html` 的 `<style>` 设计系统
> 本方案为**可独立执行的规格**：所有条目给出精确值与验证方式，其他 Agent 无需额外解释即可实施与验收。
> 状态：已实施并通过自检（见 §9 自检结论，数据为 2026-08-29 实测）。

---

## 1. 目标与量化验收标准

| # | 目标 | 可验证判据（通过=达标） |
|---|---|---|
| 1 | 现代配色系统 | `:root` 定义 ≥3 级语义色（主/成功/警示/告警）+ 渐变与分层阴影令牌；`getComputedStyle(body).backgroundImage !== 'none'` |
| 2 | 排版层次 | 标题用衬线栈、正文无衬线、数据等宽；数字启用 `font-feature-settings:"tnum"`；标题/正文/辅助三级字号差 ≥4px |
| 3 | 视觉深度 | 定义 3 级阴影令牌 `--sh-1/2/3`；卡片/按钮/计数块使用渐变或阴影；`header` 启用 `backdrop-filter` 玻璃拟态 |
| 4 | 交互反馈 | 可交互元素含 `transition`（时长 0.14–0.9s、统一 easing）；有 `:hover`/`:active`/`:focus-visible` 三态；入场动画 `fadeUp/pop` |
| 5 | 组件一致性 | 圆角令牌 `--r-lg/md/sm` 全局复用；状态徽章统一 999px 胶囊；所有既有 class 名保留（见 §6） |
| 6 | 响应式 | 断点 1024px、640px；两断点下 `.cols/.cards/.branch/.band` 折叠为单列；640px 无横向滚动 |
| 7 | 可访问性 | `:focus-visible` 描边；`prefers-reduced-motion` 关闭全部动画；`::selection` 定义 |
| 8 | 功能不回归 | 升级后健康环=50、计数=6P0/9P1/8P2/1可发布、A=阻断0分(4×P0)、E=可发布100分；控制台 0 报错 |
| 9 | 引擎不破坏 | `node sync-gates.mjs --check` 通过（引擎块 == gates.mjs） |

## 2. 设计令牌（精确值，全部位于 `:root`）

- 背景：`--bg:#f6f4ef`；`--bg-grad` 双 radial 渐变（朱砂 6% 右上、青玉 5% 左上），`background-attachment:fixed`。
- 表面：`--card:#fff`、`--card-2:#fbfaf7`（卡片用 `linear-gradient(180deg,card,card-2)` 增加厚度）。
- 文字：`--ink:#191b1e`、`--ink-2:#43474d`、`--muted:#878d96`。
- 线条：`--line:#e8e4da`、`--line-2:#efece4`。
- 主色：`--cinnabar:#b23a2e`、`--cinnabar-2:#9c2f24`、`--cinnabar-soft:#f7e7e4`、`--cinnabar-grad:linear-gradient(135deg,#c04a3c,#9c2f24)`。
- 语义：`--jade:#1f7a5c`(pass)、`--orange:#d97706`(P1/warn)、`--ochre:#a97b0a`(P2)、`--p0:#b23a2e`；各配 `-soft` 浅色底。
- 圆角：`--r-lg:16px`、`--r-md:12px`、`--r-sm:8px`。
- 阴影三级：`--sh-1`(贴地)、`--sh-2`(悬浮)、`--sh-3`(弹起)，均为双层柔和投影。
- 字体：`--serif:"Noto Serif SC","Songti SC","STSong","SimSun",Georgia,serif`；`--sans:"Inter","PingFang SC",…,"Microsoft YaHei",system-ui`；`--mono:"JetBrains Mono",…,Consolas,monospace`。
- 缓动：`--ease:cubic-bezier(.22,.61,.36,1)`，全交互统一。

## 3. 逐模块实施清单（机制→类名）

| 模块 | 类名 | 关键机制 |
|---|---|---|
| 顶栏 | `header.top` | sticky + `backdrop-filter:blur(14px) saturate(1.4)` + 半透明白 + 发丝底边 + 内高光 |
| 品牌字 | `.brand b` | 衬线 21px + `background-clip:text` 墨→朱砂渐变字 |
| 按钮 | `.btn/.ghost/.cinn` | 圆角 8px + 三级态（hover 上浮 1px+sh-2；active 缩放 .98；focus-visible 朱砂描边 2px）；`.cinn` 用主色渐变+彩色投影 |
| 汇总带 | `.band` | 190/1fr/250 三列 + 渐变表面 + sh-2 + `fadeUp` 入场 |
| 健康环 | `.ring` | 140px + `drop-shadow` + `circle{transition:stroke-dashoffset .9s,stroke .4s}`（数值变化时平滑动画） |
| 门禁命中条 | `.gpill` | 白底圆角 12px + sh-1 + hover 上浮 2px |
| 分级计数 | `.cnt` | 四色渐变块 + 衬线大数字 + hover 上浮 |
| 产出物列表 | `.item` | hover 右移 2px；`.active` 朱砂左边条 + 左→右浅朱砂渐变 |
| 裁决徽章 | `.verdict` | 999px 胶囊 + 三态浅色底 + `transition:all .3s` |
| 门禁卡 | `.gate` | 渐变表面 + 圆角 16px + sh-1 + hover 上浮 3px+sh-3 + `fadeUp` 错峰入场 |
| 命中条目 | `.finding` | 左 3px 语义色条 + hover 浅底 + `.snip` 等宽代码块带边框 |
| 高亮 | `mark` | 下半幅朱砂浅渐变（荧光笔效果） |
| DWS 编排 | `.dws/.node/.lane/.step` | `.node.on` 浅朱砂渐变+sh-2；`.lane.active` 实线+渐变底；`.step` hover 上浮 |

## 4. 交互/动效规格

- 统一缓动 `--ease`；位移类 hover 0.14–0.18s；色彩/透明 0.16–0.3s；环 0.9s。
- 入场：`fadeUp`(translateY10px→0) 用于 `.band/.rail/.gate/.dws`，`animation-delay` 0/.06s/.1s 错峰；`pop`(scale.96→1) 用于 `.doc-head`。
- `@keyframes fadeUp/pop` 仅两处，复用。
- `prefers-reduced-motion:reduce` → `*{animation:none;transition:none}`。

## 5. 响应式规格

- `@media(max-width:1024px)`：`.band/.cols/.cards/.branch` 单列；`.counters` 左对齐。
- `@media(max-width:640px)`：`.top-in` 换行；`.doc-head` 纵排；`.verdict` 自对齐起始；`.wrap` 收窄。
- 判据：1024 与 640 下 `.cols` 计算列数=1；640 下 `scrollWidth<=clientWidth`（无横向溢出）。

## 6. 兼容与不可变约束（硬性）

1. **引擎块不可变**：`/*GATES-SRC-START*/…END*/` 之间由 `sync-gates.mjs` 生成，本方案只改 `<style>`，不改该块；验收=`sync-gates --check` 通过。
2. **class 名不可变**：JS 渲染依赖以下类名，全部保留不得改名/删除：`top top-in brand spacer btn(ghost/cinn) wrap band ring num gates-strip gpill(t/v) counters cnt(c-p0/c-p1/c-p2/c-pass) cols rail item(active/name/meta) tag(t-block/t-fix/t-ok) main doc-head(who/sub) verdict(v-block/v-fix/v-ok) doc-body cards gate(gh/ic/gn/sev/gb) finding(P0-P3/snip/issue/basis/fix) clean dws(note) flow node(on/on-reject/nt/nd) arrow branch lane(ok/no/active) steps step footer`。
3. **JS 逻辑不可变**：不修改 `<script>` 任何函数；仅 CSS 层升级。
4. **离线可跑**：不引入 CDN/外部字体文件/图片；字体用系统栈回退。
5. **改前备份**：`gatekeeper.html.bak` 存于工作区（已存）。

## 7. 验证脚本与通过标准

运行 `prototype/` 下：
```bash
node sync-gates.mjs --check        # 期望输出 "✓ 一致：gatekeeper.html 引擎块 == gates.mjs"
```
Playwright（见 /tmp/uiverify.cjs 思路）断言：
- 控制台 error 数 = 0；
- `header.top` `backdropFilter` 含 `blur(`；`body` `backgroundImage!=='none'`；
- `.gate` `transitionDuration` 含 `0.18s`；`#ringArc` 含 `0.9s`；
- 1280px `.cols` 列数=2；1024px=1；640px=1 且无横向溢出；
- 功能：`#ringNum`=50、`#counters` 含 "6P0…9P1…8P2…1可发布"、切 A 后 `.verdict`="阻断发布 · 0 分" 且 `.finding.P0`=4。

## 8. 实施步骤（另一 Agent 可直接执行）

1. 备份 `gatekeeper.html` → `gatekeeper.html.bak`。
2. 仅替换 `<style>…</style>` 为 §2–§5 规格对应 CSS（保留 §6 全部类名）。
3. 跑 §7 两条验证；任一不达标回滚备份并定位。
4. 截图 1280/1024/640 三档存作视觉留档（目录 v0.13.0 起更名 `prototype/screenshots/`）。
5. 治理登记：CHANGELOG 加 M8 四件套；README/交接文档/STRUCTURE 版本行同步 v0.8.0。

## 9. 自检结论（2026-08-29 实测，真实数据）

| 判据 | 结果 | 达标 |
|---|---|---|
| sync --check | ✓ 一致 | ✅ |
| 控制台报错 | none | ✅ |
| header 玻璃 | blur(14px) saturate(1.4) | ✅ |
| body 渐变 | true | ✅ |
| .gate 过渡 | 0.18s | ✅ |
| 环过渡 | 0.9s | ✅ |
| 1280 列数 | 2 | ✅ |
| 1024 列数 | 1 | ✅ |
| 640 列数/溢出 | 1 / 无 | ✅ |
| 功能回归 | 环50、计数正确、A阻断0分(4P0)、E可发布100分 | ✅ |

**原 3 项可选优化的处置（M8.1 落地两项，M8.2 完成字体嵌入，三项全部闭环）**：

1. **内联 style 迁移 —— 已完成**。新增设计系统类：`.section-label(.right)`、`.paste-box/.paste-hint/.paste-ta/.paste-actions`、`.rail-foot`、`.mono`、`.tag.sq`；body 静态区原 9 处内联 style 全部替换。审计后残留 `[style]` 仅两类且均为合法动态：① JS 按严重度注入的颜色（`#ringArc`、`.gpill .v`、`.ic` 等）；② `#pasteBox` 的 `display` 显隐切换（功能态）。
2. **暗色模式 —— 已完成**。实现方式：`:root[data-theme='dark']` 覆盖令牌（bg/card/ink/line/朱砂提亮为 `#d95f50`/语义色/阴影加深）+ 13 条硬编码渐变的暗色覆盖；`color-scheme` 双态声明（原生控件/滚动条适配）。**默认跟随系统**（JS 读 `matchMedia('(prefers-color-scheme: dark)')` 初始化 `data-theme`，并监听系统切换），顶栏「◐ 主题」按钮手动明↔暗切换。验证：暗色下 bodyBg=`rgb(19,21,25)`、功能回归通过（A 阻断 0 分/4×P0、粘贴检测正常）、可切回明色、0 控制台报错。
3. **字体嵌入 —— 已完成（M8.2）**。实测解析链后对**衬线标题层**做了子集内嵌（Inter 不嵌：拉丁正文回退 Segoe UI/微软雅黑均为各 OS 必备字体，嵌入无可见收益、徒增体积）：
   | 项 | 值 |
   |---|---|
   | 源字体 | `C:/Windows/Fonts/NotoSerifSC-VF.ttf`（可变字体，wght 轴 200–900） |
   | 子集方法 | `py -3 -m fontTools.subset --text-file=used_chars.txt --flavor=woff2 --layout-features='*'`（用字从 `gatekeeper.html` 穷举，677 字符 → 1095 字形，fvar 轴保留） |
   | 产物 | `output/notoserifsc-subset.woff2` 265KB → base64 内嵌 `@font-face`，独立族名 **GKSerif**，`font-weight:200 900` 单文件覆盖全字重 |
   | 栈顺序 | `--serif:"GKSerif","Noto Serif SC","Songti SC","STSong","SimSun",Georgia,serif`（嵌入族优先，保证跨机像素一致；未命中仍优雅降级） |
   | 体积代价 | HTML 65KB → **394KB**（本地 file:// 打开无感，无网络依赖） |
   | 验证 | `document.fonts` → `GKSerif:loaded`；canvas 宽度 87.9 vs 系统 serif 86.1（证明确实启用嵌入字体）；0 控制台报错；功能回归通过（环50 / A阻断0分 / E可发布100分）；暗色下字体同样生效 |
   回滚备份：`gatekeeper.html.pre-font.bak`（嵌入前版本；已随 v0.14.1 清理删除，需要时从 git 历史取回）。

> 结论：方案可实施、符合实际、已通过全部量化验收；原 3 项可选优化已全部落地（1、2 于 M8.1，3 于 M8.2），Inter 经实测论证后明确不嵌（无可见收益）。

---

## 10. M8.3 控制台打磨（v0.14.0 · 2026-10-03 实测）

> 定位：在既有设计系统内**精修**，不改色彩令牌/字体栈/既有类名（全 additive），参考 GitHub 成熟模式（toast 借鉴 sonner/Base Web 的 role=status + hover 暂停自动关闭；键盘导航借鉴 Linear 单键直达 + `?` 速查）。

| # | 项 | 内容 | 验证（Playwright 1.60 实测） |
|---|---|---|---|
| 1 | Toast 组件 | 3 处原生 `alert()` 替换为右下角 toast（语义色左边条：通过=青玉/警示=橙/阻断=朱砂；`role="status"` 不抢焦点；4.5s 自动消失、hover 暂停、点击即关、至多 3 条堆叠） | 阻断文档点「提交发布审批」→ toast 出现且文案含文档名 |
| 2 | 键盘快捷键 | `1–5` 切五视图 · `/` 开粘贴检测并聚焦 · `T` 明暗主题 · `Esc` 收起粘贴框 · `?` 呼出快捷键速查 toast；输入态（input/textarea/select）自动让位；vtab/顶栏按钮加 `title` 提示 | 按 `4` → `view-config` active；按 `?` → 速查 toast |
| 3 | 键盘可达 | 可点 div（.finding/.item/.projcard/面包屑）补 `tabindex=0 + role=button + Enter/Space`；上述元素统一 `:focus-visible` 朱砂描边 | 命中项 Enter 触发定位 |
| 4 | 粘贴检测 | 字数实时计数 + `Ctrl/Cmd+Enter` 快速体检（窄屏隐藏 meta 行）；**修复真回归**：M11 起 `goView` 复位 `state.custom`，粘贴结果被吞成文档 A——改为直设状态绕过 | Ctrl+Enter → docHead=「自定义粘贴内容」· 阻断发布 26 分 · G4/G5 命中、手机号脱敏 |
| 5 | 细节 | 原文折叠摘要加旋转箭头（`details[open]` 旋转 180°）；命中跳转提示改「点击定位原文」；`#docBody/#cards/.doc-head` 加 `scroll-margin-top:140px` 让位 sticky；总览面包屑改显批次名（消除与视图标题的文字重复）；趋势视图口径文案改「跨项目健康分对比（时间线待真实批次，无真实数据不投空图）」 | 截图留档 screenshots/（明暗双态 + 三档响应式重生成） |

**量化验收（2026-10-03）**：控制台/页面 0 error；640px 无横向溢出；暗色 bodyBg=`rgb(19,21,25)`；`sync-gates --check`/`sync-configs --check` 双绿；verify 红线全过（引擎零改动）。human-baseline.html 同步打磨：设计令牌对齐（圆角/阴影/缓动/focus-visible/selection）、进度卡 sticky 悬浮（计时+进度条始终可见）、选项改胶囊并按语义着色（有问题=朱砂/没问题=青玉）、结果页加大数字结论行（召回率 46px 衬线 + 漏检/误报/耗时）、条目错峰入场动画（reduced-motion 全关）。
