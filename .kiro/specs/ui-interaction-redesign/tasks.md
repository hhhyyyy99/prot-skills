# Implementation Plan

本实施计划把 `design.md` 分解为可按顺序执行、独立可验证的编码任务。执行顺序严格遵循 `design.md` 的 **Migration Plan.发布顺序**：令牌 → 原语/模式 → Shell → 页面 → 清理 → 可选特性 → 验收。每个任务只涉及可被测试或可被目视验证的最小单元；任务末尾用 `_Requirements:` 声明溯源需求。

> 约定：
> - 所有 UI 测试路径为 `src/**/__tests__/*.test.tsx`，纯逻辑测试为 `src/**/*.test.ts`。
> - 每个新增文件在第一次引入时必须附带至少一个 happy-path 测试用例。
> - 任务中出现的 "不改 API 契约" 指 `src/api/index.ts` 与 `src/types/index.ts` 的导出签名保持 byte-for-byte 不变。

## 1. 基础环境与令牌

- [ ] 1.1 引入设计令牌 CSS 与 JSON 产物
  - 新建 `src/design/tokens.css`，内容为 `design.md` 中 `Design_Token：CSS 变量` 段落的完整 CSS（含 `:root` / `[data-theme="dark"]` / `@media (prefers-reduced-motion: reduce)`）。
  - 新建 `src/design/tokens.json`，以 JSON 形式镜像相同色彩、字号、间距、圆角、阴影、动效键值，作为 Figma/Tailwind 共享产物。
  - 在 `src/index.css` 的 `@tailwind base` 之前通过 `@import './design/tokens.css'` 引入。
  - 移除 `src/index.css` 中的 `@apply bg-gray-50 text-gray-900`，保持 `body` 不声明颜色（由 Shell 在根元素上决定）。
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 13.6, 17.1_

- [ ] 1.2 扩展 Tailwind 配置消费 CSS 变量
  - 新建或重写 `tailwind.config.js`，内容完全对应 `design.md` 的 `Tailwind theme.extend` 代码块（colors/fontFamily/fontSize/spacing/borderRadius/boxShadow/transitionDuration/transitionTimingFunction）。
  - 确认 `content: ["./index.html", "./src/**/*.{ts,tsx}"]`。
  - 添加 `scripts/check-tokens.mjs`（Node 脚本），对 `tokens.json` 与 `tailwind.config.js` 的键集做一致性校验（键缺失 / 键多余 → 非零退出）；在 `package.json` 增加 `"test:tokens": "node scripts/check-tokens.mjs"`。
  - _Requirements: 2.1, 17.1_

- [ ] 1.3 纯逻辑库：theme / breakpoint / truncate / filter / toastQueue / motion
  - 新建 `src/lib/theme.ts` 实现 `resolveTheme(pref, systemIsDark)`。
  - 新建 `src/lib/breakpoint.ts` 实现 `classifyWidth(px)`（边界：<800 narrow、<1024 compact、else regular）。
  - 新建 `src/lib/truncate.ts` 实现 `middleEllipsis(path, maxChars)`。
  - 新建 `src/lib/filter.ts` 实现 `filterSkills(list, q, source)`（大小写不敏感；`source='all'` 不过滤）。
  - 新建 `src/lib/toastQueue.ts` 实现 `toastReducer(state, event)`（FIFO、max=3、dismiss 幂等）。
  - 新建 `src/lib/motion.ts` 导出 `MOTION = { fast, base, slow, easeOutQuart, easeInOutQuart }` 四个字符串常量，值均读取 `var(--dur-*)`/`var(--ease-*)`（供 JS 动画场景使用）。
  - 为上述六个模块各写 `*.test.ts`，使用 `fast-check` 覆盖 `design.md` 中列出的属性（单调性、幂等、FIFO、大小写不敏感、`resolveTheme` 的双分支等）。
  - 在 `package.json` `devDependencies` 加入 `vitest` 与 `fast-check`；新增 `"test": "vitest run"`。
  - _Requirements: 2.10, 12.1, 12.4, 15.1, 15.2, 15.3, 15.4, 15.5, 16.5, 17.1_

## 2. Primitives（无业务语义原子组件）

- [ ] 2.1 `Button` 与 `IconButton`
  - 新建 `src/components/primitives/Button.tsx`，严格匹配 `design.md` 的 `ButtonProps` 契约；variant=secondary 为 default；`loading` 时显示 `Loader2`、`disabled` 且 `aria-busy="true"`。
  - 新建 `src/components/primitives/IconButton.tsx`；TypeScript 层要求 `aria-label` 非可选。
  - 所有样式用 Tailwind class（`bg-accent text-accent-fg focus-visible:ring-2 ring-accent …`），不写 inline style。
  - 测试：variant class 存在 / loading 状态 / focus ring 可见 / `IconButton` 缺省 `aria-label` 时 TS 报错（通过 `tsd` 或 `expectType` 断言，可选）。
  - _Requirements: 2.1, 14.1, 17.1_

- [ ] 2.2 `TextField` 与 `Select`
  - 新建 `src/components/primitives/TextField.tsx`；支持 `type='search'`、`leadingIcon`、`trailingSlot`、`error`、`helperText`；`error` 时设置 `aria-invalid` 与 `aria-describedby`；`onSubmit` 在 Enter 时触发。
  - 添加依赖 `@radix-ui/react-select` 到 `package.json` 的 `dependencies`。
  - 新建 `src/components/primitives/Select.tsx`，基于 `@radix-ui/react-select`；trigger 高度与 `TextField` 同级（28/32），content 使用 `shadow-overlay`。
  - 测试：`TextField` error 状态 aria 属性；`Select` 渲染后键盘 ArrowDown 打开列表。
  - _Requirements: 14.1, 14.2_

- [ ] 2.3 `Switch` / `Checkbox` / `Tooltip`
  - 添加依赖 `@radix-ui/react-switch`、`@radix-ui/react-checkbox`、`@radix-ui/react-tooltip`。
  - 新建 `src/components/primitives/Switch.tsx`；关态 `bg-border-default` 开态 `bg-accent`；要求 `aria-label`。
  - 新建 `src/components/primitives/Checkbox.tsx`；支持 `checked: boolean | 'indeterminate'`。
  - 新建 `src/components/primitives/Tooltip.tsx`；`delayMs` 默认 400；背景 `bg-text-primary text-canvas text-12`。
  - 测试：`Switch` 点击触发 `onChange(true)`；`Tooltip` 400ms 后出现（`vi.useFakeTimers`）。
  - _Requirements: 3.3, 14.1_

- [ ] 2.4 `Badge` 与 `Skeleton`
  - 新建 `src/components/primitives/Badge.tsx`；每个 variant 使用同色 `border-{variant}` + `text-{variant}`，无填充。
  - 新建 `src/components/primitives/Skeleton.tsx`；默认 12px 高；动效仅在 `prefers-reduced-motion: no-preference` 时启用，使用 `@keyframes skeleton-pulse` 1000ms 单向透明度循环（在 `tokens.css` 定义 keyframes）。
  - 测试：Badge variant class 存在；Skeleton 在 `prefers-reduced-motion: reduce` 的 `matchMedia` stub 下不带 animation class。
  - _Requirements: 9.5, 9.6, 16.2_

## 3. Pattern 组件

- [ ] 3.1 `ListRow`
  - 新建 `src/components/patterns/ListRow.tsx`，实现 grid `auto | 1fr | auto-auto | auto`；默认 density=regular（48px）；`trailing`/`secondary` 从 `opacity-0` 过渡到 `opacity-100`（hover/focus-within 120ms）。
  - 容器根据 `href` 渲染 `<a>` 或 `<div role="row">`；键盘：`ArrowUp/ArrowDown → onKeyNav`、`Enter → onSelect`。
  - `loading=true` 时整行渲染三块 `Skeleton`。
  - 测试：hover 后 `trailing` 可见；`selected` 时 class 含 `border-accent`；Enter 触发 `onSelect(id)`；ArrowDown 触发 `onKeyNav('down')`。
  - _Requirements: 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 14.4, 15.4_

- [ ] 3.2 `EmptyState`
  - 新建 `src/components/patterns/EmptyState.tsx`，默认 `align='left'`；`secondaryAction` 若含 `href` 且 `external` 为真渲染 `<a target="_blank" rel="noreferrer">`。
  - 严禁渲染大于 16px 的 icon（类型上 `icon?: React.ReactNode` 无法静态校验尺寸，但在开发模式用 `useEffect` 检查子元素 `props.size > 16` 时 `console.warn`）。
  - 测试：`align='left'` 对应 class；external href 含 `target="_blank"`；primary+secondary 同时存在时顺序正确。
  - _Requirements: 4.2, 5.9, 7.x, 16.x_

- [ ] 3.3 `Toast` + `ToastViewport` + `useToast`
  - 新建 `src/components/patterns/Toast.tsx` 实现单条 Toast UI；error/warning 使用 `role="alert"`，其余 `role="status"`。
  - 新建 `src/components/patterns/ToastViewport.tsx` 固定右下角 16px；纵向堆叠最多 3 条；进入/离开 120ms（`fast`）。
  - 新建 `src/hooks/useToast.ts` + `src/shell/ToastProvider.tsx`：Provider 持有由 `toastReducer` 驱动的状态；`toast()` 返回 id；`durationMs=0` 不自动关闭。
  - 测试：`enqueue` 第 4 条时最早一条被移除；`role='alert'` 用于 error；`durationMs=0` 时 timer 不触发。
  - _Requirements: 5.8, 7.7, 13.5, 14.6, 16.5_

## 4. Shell 与 Providers

- [ ] 4.1 Hooks：theme / breakpoint / keyboard / reducedMotion
  - 新建 `src/hooks/useTheme.ts`：`useSyncExternalStore` 订阅 `matchMedia('(prefers-color-scheme: dark)')`；将 `resolved` 写入 `document.documentElement.dataset.theme`；`preference` 持久化到 `localStorage['ui.theme']`，读取失败回退 `'system'`。
  - 新建 `src/hooks/useBreakpoint.ts`：监听 `resize` 并返回 `classifyWidth(window.innerWidth)`。
  - 新建 `src/hooks/useKeyboardShortcuts.ts`：单点 `keydown`；当 `document.activeElement` 是 input/textarea/contentEditable 时只放行 `Escape` 与 `Cmd/Ctrl+K`。
  - 新建 `src/hooks/useReducedMotion.ts`：订阅 `matchMedia('(prefers-reduced-motion: reduce)')` 返回 boolean。
  - 测试（JSDOM）：`useTheme` 初次挂载写入 `dataset.theme`；`useKeyboardShortcuts` 在 input focus 时忽略 `Cmd/Ctrl+1` 但触发 `Cmd/Ctrl+K`。
  - _Requirements: 8.3, 8.4, 12.4, 14.7_

- [ ] 4.2 `ThemeProvider` 与 `AppProviders`
  - 新建 `src/shell/ThemeProvider.tsx` 暴露 `preference`/`setPreference`/`resolved`。
  - 新建 `src/shell/AppProviders.tsx`，按顺序包裹：`ThemeProvider` → `ToastProvider` → `CommandBarProvider`（初期可为 passthrough）。
  - 测试：`ThemeProvider` children 能通过 `useTheme()` 读到默认 `'system'`。
  - _Requirements: 8.3, 8.4, 14.7_

- [ ] 4.3 `PrimaryNav`
  - 新建 `src/shell/PrimaryNav.tsx`，按 `design.md` 的 `PrimaryNavProps` 实现。
  - 结构 `<nav aria-label="Primary"><ul>…<button aria-current>`；活动项使用 `border-l-2 border-accent text-accent`，非活动 `text-text-secondary`；图标与文字同色。
  - `collapsed` 时文字隐藏，tooltip 展示 `${label} · ${shortcut}`；未读指示为 `accent` 8px 圆点。
  - 键盘：Tab 进入首项后 ArrowDown/ArrowUp 在项间移动 focus。
  - 测试：`aria-current="page"` 只出现在 active 项；ArrowDown 切换 focus。
  - _Requirements: 1.4, 1.5, 3.3, 3.4, 3.5, 3.6, 13.3, 14.3_

- [ ] 4.4 `WorkspaceHeader` 与 `WorkspaceBody`
  - 新建 `src/shell/WorkspaceHeader.tsx` 按 props 契约实现两行布局；`primaryActions.length > 2` 时 `console.error` 并只渲染前两个；`meta > 120` 字符时开发模式 `console.warn`。
  - 新建 `src/shell/WorkspaceBody.tsx`，`layout='push'` 用 grid `1fr auto` 配 `clamp(360px, 40%, 480px)`；`layout='overlay'` 时 detail 绝对定位占 70%；过渡 `transition-[grid-template-columns,transform] duration-base ease-out-quart`。
  - 测试：`primaryActions` 传 3 个时只渲染 2 个；push→overlay class 切换。
  - _Requirements: 1.1, 1.6, 1.7, 10.1, 10.2, 15.3_

- [ ] 4.5 `DetailPanel`
  - 新建 `src/shell/DetailPanel.tsx`；`<aside role="complementary" aria-label={…}>` 包裹 header/body/footer。
  - `open: false→true` 自动聚焦关闭按钮；关闭时 focus 还原到 `previousFocusRef`（内部用 `useRef` 在 `open` 上升沿捕获 `document.activeElement`）。
  - `open=true` 期间 `children` 变更不重播动画（用 `hasEnteredRef` 在 `transitionend` 置真；`open` 下降沿重置为假）。
  - Escape 与主区 pointerdown 触发 `onClose`；overlay 模式下监听主区可见部分。
  - 测试：Escape 调用 `onClose`；打开后关闭按钮 focused；切换 children 不再次 transition。
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 14.5_

- [ ] 4.6 `AppShell` 与 `App.tsx` 装配
  - 新建 `src/shell/AppShell.tsx`：持有 `activePage` / `navCollapsed`(由 `useBreakpoint` 派生) / `detailOpen` / `detailLayout`；注册 `Cmd/Ctrl+1..5`、`Cmd/Ctrl+K`、`Escape`；根节点 `data-platform={platform}`（`platform` 通过 `navigator.userAgent` 粗识别或 Tauri 注入，初版 fallback 到 `'macos'`）。
  - 重写 `src/App.tsx` 为薄壳：`<AppProviders><AppShell /></AppProviders>`，移除 `useState('discovery')` 与 `switch`（逻辑搬到 `AppShell`）。
  - CSS：新增 `src/shell/AppShell.css`（或在 `tokens.css` 追加）实现 `@supports (-webkit-backdrop-filter: blur(0)) .app-shell[data-platform="macos"] .primary-nav { padding-top: 28px; }`。
  - 测试：`Cmd/Ctrl+2` 切换到 My Skills；800px 窗口下 nav 变 overlay。
  - _Requirements: 1.1, 1.2, 1.3, 1.8, 1.9, 3.1, 3.2, 15.1, 15.2, 15.3, 15.5_

## 5. 页面重构（Settings → Tools → MySkills → Migrate → Discovery）

- [ ] 5.1 SettingsPage 重构（先行以打通主题链路）
  - 重写 `src/pages/SettingsPage.tsx`：分组 `General` / `Sources` / `Storage` / `Appearance` / `About`；局部 `SettingRow` 组件 grid `200px 1fr auto`。
  - Appearance.Theme：`<Select value={preference} options={[System, Light, Dark]} onChange={setPreference} />`，调用 `useTheme`。
  - Storage：显示占位 `storagePath='~/.ai-skills'`（尚无后端命令，暂硬编码常量，值来源 TODO 注释指向 future Tauri command）。
  - About：应用名 / `import.meta.env.VITE_APP_VERSION ?? '0.1.0'` / `VITE_BUILD_TIME ?? 'dev'` / Licenses `<a href="#licenses">`。
  - 未实现项显示 `<Badge>coming soon</Badge>` 并 `disabled` 对应控件。
  - 测试：切换 Theme 到 Dark 后 `document.documentElement.dataset.theme === 'dark'`；切换完成时间 < 200ms。
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 12.4, 14.7_

- [ ] 5.2 ToolsPage 重构
  - 重写 `src/pages/ToolsPage.tsx`：Header 标题 `Tools`、主操作 `Re-detect`（`Button variant="primary" loading={detecting}`）。
  - 列表为 `ListRow`，`leading=<Switch disabled={!tool.is_detected} />`、`primary=tool.name`、`meta=[<Badge variant={detected?'success':'neutral'}>…</Badge>, <Tooltip content={config_path}><code class="font-mono">{middleEllipsis(config_path, 40)}</code></Tooltip>]`、`trailing=<IconButton icon={<FolderOpen/>} aria-label="Open path" onClick={openPath} />`。
  - `openPath` 先占位实现：`console.log('open_path', path)`，保留注释 `// TODO: invoke('open_path', { path })`。
  - 空状态：`<EmptyState title="No tools detected" primaryAction={{ label: 'Re-detect', onClick: redetect }} />`。
  - 失败态：inline 错误条 + Retry（用 `InlineError` 组件，见任务 5.5 共享）。
  - 测试：`Re-detect` 点击后 `detectTools` 被调用；路径超长时 code 内含 `…` 且 Tooltip content 为完整路径。
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.x_

- [ ] 5.3 MySkillsPage 重构
  - 重写 `src/pages/MySkillsPage.tsx`：Header `title="My Skills"`、`meta="{visible}/{total} · {enabledCount} enabled · Updated {relativeTime(lastSync)}"`、`search`、`filters=[<Select options={sourceOptions} />]`、`primaryActions=[<IconButton icon={<RefreshCw/>} aria-label="Refresh" />]`。
  - `filterSkills` 驱动 `visible`；加载首屏渲染 8 行 `<ListRow loading />`；零项走 `EmptyState`。
  - `ListRow`：`leading=<Switch checked={skill.is_enabled} />`、`primary=name`、`secondary=description`、`meta=[sourceBadge, version, relativeTime(updatedAt)]`、`trailing=<IconButton icon={<MoreHorizontal/>} aria-label="Actions" />`、`onSelect` 打开 `DetailPanel`。
  - Toggle：乐观更新；`toggleSkill` 失败回滚 + `toast({ variant: 'error' })`。
  - `DetailPanel`：展示元数据；footer 的 Uninstall 用 `@radix-ui/react-popover` 做二次确认；成功后关闭面板并 `toast({ variant: 'success' })`。
  - 测试：toggle 失败 UI 回滚；Discovery 跳转按钮在零安装时出现；过滤零匹配时 `Clear filters` 按钮可见。
  - _Requirements: 5.1–5.10, 9.1–9.6, 10.1–10.6, 16.3_

- [ ] 5.4 MigratePage 重构
  - 重写 `src/pages/MigratePage.tsx`：Header `title="Migrate"`、`meta="Import Skills from a detected tool's folder"`；Control row 置于 Body 顶部。
  - Control row：`<Select value={toolId} options={detectedTools} />` + `<Button variant="primary" loading={scanning} disabled={!toolId}>Scan</Button>`；`!toolId` 时右侧显示引导文本。
  - 列表顶部粘性工具条（仅 `selected.size > 0`）：`<Checkbox label="Select all" />` + `Selected {n}` + `Migrate selected ({n})` + `Clear`。
  - 每行 `ListRow`：`leading=<Checkbox />`、`primary=name`、`meta=[<code>{middleEllipsis(path,48)}</code>, is_symlink ? <Badge variant="warning">Symlink</Badge> : null]`、`trailing=rowStatus[path]==='error' ? <Retry button> : null`。
  - 迁移执行：for-loop 调用 `migrateLocalSkill`，单条失败仅标记 `rowStatus[path]='error'`，**不中断**；过程中顶部显示 `Migrating {done}/{total}…`；完成后 `toast({ durationMs: 6000, title: 'Migrated {s}, failed {f}' })`。
  - **移除** `window.alert` / `window.confirm`。
  - 测试：3 项中 1 项失败时 loop 继续；成功后自动 `handleScan()` 刷新列表；Toast 文案正确。
  - _Requirements: 7.1–7.9, 13.5, 16.x_

- [ ] 5.5 DiscoveryPage 重构 + 共享 `InlineError`
  - 新建 `src/components/patterns/InlineError.tsx` 按 `design.md` 的 `InlineErrorProps` 实现；MySkills/Tools/Migrate 所有页面失败态统一使用。
  - 重写 `src/pages/DiscoveryPage.tsx`：Header `title="Discovery"`、search ≤ 320px；Body 渲染 `EmptyState align="left"`，secondaryAction 指向 `https://skills.sh`（external），搜索词非空且零结果时包含 `Clear search` 主按钮。
  - 测试：零结果文案含当前 `q`；external link 有 `rel="noreferrer"`。
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 16.3_

## 6. 清理与反向依赖移除

- [ ] 6.1 删除旧组件与样式
  - 删除 `src/components/SkillCard.tsx`、`src/components/ToolCard.tsx`、`src/components/Sidebar.tsx`。
  - 全仓 `grep` 确认无引用残留：`grep -R "SkillCard\|ToolCard\|Sidebar" src/` 必须返回空。
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 6.2 移除 `window.alert` / `window.confirm` 与彩色硬编码
  - `grep -R "window.alert\|window.confirm\|bg-gradient" src/` 必须返回空。
  - `grep -R "bg-gray-50\|bg-gray-900\|text-blue-600\|bg-blue-600\|bg-green-600" src/` 必须返回空（这些都是旧代码颜色硬编码）。
  - 若有遗留，改用 token 类（`bg-canvas` / `bg-surface` / `text-accent` / `bg-accent`）。
  - _Requirements: 13.5, 13.6, 17.5_

## 7. 可选特性

- [ ] 7.1 `CommandBar`（可选）
  - 添加依赖 `cmdk`。
  - 新建 `src/components/command/CommandBar.tsx` 实现 `CommandBarProps`；命令分组 Navigate/Tools/Skills/Theme；宽 560px，overlay 阴影 `shadow-overlay`。
  - 新建 `src/shell/CommandBarProvider.tsx`：暴露 `open()` / `close()`；`AppShell` 的 `Cmd/Ctrl+K` 快捷键唤起。
  - Escape 关闭并 focus 还原到触发器。
  - 测试：`Cmd/Ctrl+K` 打开 + 输入框 focused；Escape 关闭；命令执行后 `commands.perform()` 被调用。
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

## 8. 验收与度量

- [ ] 8.1 性能度量
  - 新建 `src/shell/PerfMark.tsx`（仅 dev 模式启用）：在 `AppShell` 挂载后 `performance.mark('interactive')` 并在控制台打印 `performance.now()`。
  - 手工记录 1440×900 下首次可交互时间；若 > 1200ms 需提 issue 拆解原因。
  - _Requirements: 17.4_

- [ ] 8.2 视觉约束检查脚本
  - 新建 `scripts/audit-visual.mjs`：
    - `grep -R "bg-gradient" src/` → 必须空；
    - `grep -R "shadow-\(sm\|md\|lg\|xl\|2xl\)" src/` → 必须空（只允许 `shadow-overlay` 与 `shadow-none`）；
    - 提取所有 `<Badge>` 使用点，统计单页同时并列 `accent/success/warning/danger` 数量 ≤ 2。
  - 接入 `package.json` `"audit:visual": "node scripts/audit-visual.mjs"` 与 CI（若有）。
  - _Requirements: 17.5_

- [ ] 8.3 迁移清单交付物
  - 新建 `docs/migration-inventory.md`（或在 `design.md` 的 Migration Plan 段落基础上导出）：列出 `replace` / `remove` / `add` 的完整路径与替代物，与代码最终状态一致。
  - `design/tokens.json` 与 `tailwind.config.js` 通过任务 1.2 的 `test:tokens` 脚本保持一致，作为交付附件。
  - _Requirements: 13.1–13.6, 17.1, 17.2_

- [ ] 8.4 端到端冒烟（本地 tauri dev）
  - 在 `pnpm tauri:dev` 下手动走通：启动 → 切换 5 页 → 切换主题 → 触发一次 toast → 打开/关闭 DetailPanel → 800px 缩窗验证 overlay → macOS 红绿灯不被覆盖。
  - 在 PR 描述中贴上 4 张截图（Discovery 空态、My Skills 列表+Detail、Tools、Settings Dark 主题）。
  - _Requirements: 1.8, 12.4, 15.1, 17.3, 17.4, 17.5_
