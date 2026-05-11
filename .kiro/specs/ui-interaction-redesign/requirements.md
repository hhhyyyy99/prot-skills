# Requirements Document

## Introduction

本需求文档描述对桌面应用 **AI Skills Manager**（Tauri + React + TypeScript + Tailwind CSS）整体 UI 与交互的重设计。目标是用 Linear 风格的克制工作台替换当前以彩色卡片堆叠为主的布局：更强的排版层级、稳定的间距节律、单一强调色、极少装饰，把信息密度做高但仍然易读。

本次重设计不改变后端能力与业务边界（Skills 发现 / 安装 / 迁移、Tools 检测 / 启停、设置）。改动集中在前端页面结构、组件库、设计令牌、交互模型、动效与可访问性。由于应用运行在 Tauri 桌面窗口内，设计以桌面优先，不针对移动端。

## Glossary

- **App_Shell**：应用整体外壳，包含左侧主导航、顶部工作区标题栏、主内容区与全局快捷栏。
- **Primary_Nav**：左侧主导航，承载一级页面切换（发现 / 我的 Skills / 工具 / 迁移 / 设置）。
- **Workspace_Header**：主内容区顶部区域，包含页面标题、上下文元信息（如数量、状态）、主操作按钮与工作区内搜索/筛选入口。
- **Workspace_Body**：工作区正文，承载列表、表格、详情、表单等主要内容。
- **List_Row**：列表行，Linear 风格的密集列表基础单元，替代原有的 `SkillCard` 和 `ToolCard`。
- **Detail_Panel**：右侧或覆盖式的详情面板，用于在不离开列表上下文的情况下查看或编辑单个实体。
- **Design_Token**：设计系统中的基础变量，包含颜色、字号、字重、行高、间距、圆角、描边、阴影、动效时长与缓动。
- **Accent_Color**：全局唯一的强调色，用于主操作、活动状态、选中指示与关键数据。
- **Motion_System**：动效系统，定义进入、离开、悬停反馈与滚动联动的时长、缓动与位移幅度。
- **Empty_State**：空状态组件，用于零数据、零搜索结果、零筛选结果场景。
- **Command_Bar**：可选的命令面板组件（快捷键唤起），用于跨页跳转与高频操作。
- **Skill**：用户安装或发现的 AI Skill 实体，字段见 `src/types/index.ts#Skill`。
- **Tool**：被管理的 AI 工具实体（如 Claude Desktop 等），字段见 `src/types/index.ts#AITool`。
- **Local_Skill**：迁移页扫描得到的本地 Skill 条目，字段见 `src/types/index.ts#LocalSkill`。

## Requirements

### Requirement 1：整体信息架构与 App Shell

**User Story:** 作为桌面用户，我希望应用有稳定、克制、桌面原生感的外壳结构，以便我始终知道自己在哪、能去哪、能做什么。

#### Acceptance Criteria

1. THE App_Shell SHALL 采用三段式布局：固定宽度的 `Primary_Nav`（左）、`Workspace_Header`（顶）、`Workspace_Body`（主区域）。
2. THE Primary_Nav SHALL 在 1024px 及以上窗口宽度下保持展开，展示图标与文字标签，默认宽度为 224px（±8px 容差）。
3. WHEN 用户窗口宽度小于 1024px 且大于等于 768px，THE Primary_Nav SHALL 折叠为 56px 宽的图标栏，图标保留 tooltip 提示文字。
4. THE Primary_Nav SHALL 使用单一垂直列表呈现五个一级目的地：Discovery、My Skills、Tools、Migrate、Settings；不使用二级分组装饰（如分组标题、彩色徽章）。
5. THE Primary_Nav SHALL 使用 2px 宽的左侧活动指示条和 `Accent_Color` 前景文字标示当前页面，而非整块背景高亮。
6. THE Workspace_Header SHALL 显示当前页面标题（H1 级别）、一行不超过 120 字符的上下文元信息（如实体数量、最后同步时间）与至多两个主操作按钮。
7. THE App_Shell SHALL 在所有页面保持一致的左右/上下内边距节律（左右 32px，上 24px，下 48px；±4px 容差）。
8. WHERE 操作系统为 macOS，THE App_Shell SHALL 在 `Primary_Nav` 顶部预留 28px 高度空白以避让窗口红绿灯按钮。
9. THE App_Shell SHALL 不使用装饰性渐变背景；主背景 SHALL 使用设计系统中的 `color.surface.canvas` 单一纯色。

### Requirement 2：设计系统与设计令牌

**User Story:** 作为前端工程师，我希望有一套可执行的设计令牌集合，以便所有页面复用并产生视觉一致性。

#### Acceptance Criteria

1. THE Design_Token SHALL 以 CSS 自定义属性（CSS variables）形式定义于全局样式中，并在 Tailwind 配置中以 theme extend 方式映射。
2. THE Design_Token SHALL 定义两套调色板：`light` 与 `dark`，两者必须通过切换根元素上的 `data-theme` 属性完成整体切换。
3. THE Design_Token.color 色彩层级 SHALL 包含且仅包含以下语义令牌：`canvas`、`surface`、`surface-raised`、`border-subtle`、`border-default`、`border-strong`、`text-primary`、`text-secondary`、`text-tertiary`、`accent`、`accent-hover`、`accent-foreground`、`success`、`warning`、`danger`。
4. THE Design_Token.color SHALL 仅使用一种 `Accent_Color`；不使用多种强调色并排以避免色彩竞争。
5. THE Design_Token.typography SHALL 定义且仅定义两种字体族：`sans`（UI 主字体，使用系统无衬线栈）与 `mono`（代码/路径字体）。
6. THE Design_Token.typography SHALL 定义以下字号刻度（px）：12、13、14、16、20、28；行高一一对应：16、18、20、24、28、36。
7. THE Design_Token.spacing SHALL 采用 4px 为最小单位，提供刻度：4、8、12、16、20、24、32、48、64。
8. THE Design_Token.radius SHALL 提供三档：`sm=4px`、`md=6px`、`lg=8px`；不使用胶囊或全圆角（除头像与开关控件外）。
9. THE Design_Token.shadow SHALL 提供至多两档：`overlay`（用于弹出层）与 `none`（平面内容默认）；禁止在常规内容区使用投影。
10. THE Design_Token.motion SHALL 定义标准时长（`fast=120ms`、`base=180ms`、`slow=240ms`）与两条缓动曲线（`ease-out-quart`、`ease-in-out-quart`）。
11. IF 某处样式需要偏离上述令牌，THEN THE Design_Token 文档 SHALL 记录偏离原因与审批人；允许先行批准偏离，但 THE Design_Token 文档 SHALL 在偏离上线前补齐记录。

### Requirement 3：Primary Nav 交互

**User Story:** 作为用户，我希望通过稳定的左侧导航与键盘快捷键在页面间快速切换。

#### Acceptance Criteria

1. WHEN 用户点击 `Primary_Nav` 中的某一项，THE App_Shell SHALL 在 180ms 内切换 `Workspace_Body` 并更新活动指示。
2. WHEN 用户按下 `Cmd/Ctrl+1` 到 `Cmd/Ctrl+5`，THE App_Shell SHALL 分别切换到 Discovery、My Skills、Tools、Migrate、Settings 页面。
3. WHEN 用户在导航项上悬停超过 400ms，THE Primary_Nav SHALL 显示简短的 tooltip，仅包含页面名称与快捷键。
4. THE Primary_Nav SHALL 为每个导航项提供键盘可达性：Tab 依序聚焦，Enter 或 Space 触发切换。
5. WHEN 某一页面存在未读或待处理状态（例如新的本地 Skill 可迁移），THE Primary_Nav SHALL 在对应项右侧显示单色小圆点（8px），而非数字徽章。
6. THE Primary_Nav SHALL 不在导航项上使用装饰性彩色图标；图标 SHALL 使用与文字相同的 `text-secondary` 颜色，活动项升级为 `accent`。

### Requirement 4：Discovery 页面重设计

**User Story:** 作为用户，我希望发现页能呈现可用的 Skill 列表并清晰表达"该功能正在建设中"的占位语义，而不是一张彩色装饰卡。

#### Acceptance Criteria

1. THE Discovery_Page SHALL 使用一个 `Workspace_Header`（标题"Discovery"，副文案说明来源），不使用居中装饰性大图标占位。
2. WHILE Discovery 数据源尚未实现，THE Discovery_Page SHALL 在 `Workspace_Body` 中渲染一个 `Empty_State` 组件：左对齐、无图标或仅使用 16px 单色图标、最多两行说明文字、一个次级链接按钮指向外部 `skills.sh`（或 GitHub 搜索）。
3. WHEN 后续版本接入 Skill 来源，THE Discovery_Page SHALL 以单列 `List_Row` 列表呈现可发现的 Skill，每行包含名称、作者、简短描述、一键安装按钮。
4. THE Discovery_Page SHALL 在 `Workspace_Header` 右侧提供搜索输入框，宽度不超过 320px，使用内联下划线或 1px 边框样式，不使用圆形胶囊搜索框。
5. IF 搜索结果为空，THEN THE Discovery_Page SHALL 渲染 `Empty_State`，文案包含当前搜索词与"清除搜索"文本按钮。

### Requirement 5：My Skills 页面重设计

**User Story:** 作为用户，我希望在我的 Skills 页用密集、可扫读的列表管理已安装 Skill，而不是大号卡片。

#### Acceptance Criteria

1. THE MySkills_Page SHALL 使用单列 `List_Row` 列表替代原有的 `SkillCard` 网格/堆叠布局。
2. THE List_Row SHALL 高度为 48px（±4px 容差），包含以下列：启用开关、名称、来源类型、版本、最后更新时间、行级操作入口。
3. THE List_Row SHALL 使用 1px `border-subtle` 分隔相邻行，不使用行级阴影或圆角背景。
4. WHEN 用户悬停在 `List_Row` 上，THE List_Row SHALL 将行背景切换为 `surface-raised`，行级操作入口 SHALL 从隐藏淡入显示，过渡时长 120ms。
5. THE MySkills_Page SHALL 在 `Workspace_Header` 中以文本形式显示 Skill 数量、已启用数量与最近同步时间，而非使用彩色统计卡片。
6. WHEN 用户点击 `List_Row` 的非操作区域，THE MySkills_Page SHALL 打开 `Detail_Panel`，展示 Skill 的元数据（作者、描述、标签、本地路径、安装时间、更新时间）。
7. WHEN 用户在 `Detail_Panel` 中点击"卸载"，THE MySkills_Page SHALL 在二次确认后调用 `uninstallSkill` 并从列表中移除对应条目。
8. WHEN Skill 的 `is_enabled` 切换失败，THE MySkills_Page SHALL 将开关还原到切换前状态并在 `Workspace_Header` 下方显示一条非阻塞的 toast，文案包含失败原因摘要。
9. IF 已安装 Skill 数量为 0，THEN THE MySkills_Page SHALL 渲染 `Empty_State`，包含一行指引文字与一个跳转到 Discovery 的文本按钮。
10. THE MySkills_Page SHALL 提供基于关键字与来源类型的客户端筛选；筛选控件 SHALL 置于 `Workspace_Header` 右侧，不超过两个控件并排。

### Requirement 6：Tools 页面重设计

**User Story:** 作为用户，我希望在工具页以列表形式查看每个 AI 工具的检测与启用状态以及配置路径。

#### Acceptance Criteria

1. THE Tools_Page SHALL 使用单列 `List_Row` 列表替代原有的 `ToolCard` 三列网格。
2. THE Tools_Page List_Row SHALL 显示：工具名称、检测状态（文本徽标，不使用彩色圆形图标）、配置路径（mono 字体，左侧图标省略）、启用开关。
3. THE Tools_Page SHALL 在 `Workspace_Header` 右侧提供"重新检测"主操作按钮，使用 `Accent_Color` 但无渐变与阴影。
4. WHEN 用户点击"重新检测"，THE Tools_Page SHALL 在按钮上显示内联旋转指示（16px），并在操作进行时禁用按钮。
5. WHEN 工具的 `config_path` 超过行宽，THE List_Row SHALL 在末尾以 `…` 截断并通过 tooltip 显示完整路径。
6. WHEN 用户点击 `List_Row` 的路径区域，THE Tools_Page SHALL 调用 Tauri 命令在系统文件浏览器中打开该路径（后续版本可实现，但需在设计上预留入口）。
7. IF 检测返回的工具列表为空，THEN THE Tools_Page SHALL 渲染 `Empty_State`，提示用户重新检测或手动指定路径。

### Requirement 7：Migrate 页面重设计

**User Story:** 作为用户，我希望在迁移页以清晰的两段式工作流（选择工具 → 扫描与选择 Skill → 迁移）完成本地 Skill 导入。

#### Acceptance Criteria

1. THE Migrate_Page SHALL 将原卡片式控制面板替换为一行内联控件：工具选择器（下拉）+ "扫描"按钮，置于 `Workspace_Header` 下方 16px 处。
2. THE Migrate_Page SHALL 使用 `List_Row` 列表显示扫描结果，每行包含：多选复选框、Skill 名称、相对路径（mono 字体）、符号链接指示（若为软链接）。
3. THE Migrate_Page SHALL 在列表顶部提供一行全选/取消全选复选框与当前选中数量文本。
4. WHEN 用户勾选一个或多个 `List_Row`，THE Migrate_Page SHALL 在列表上方显示一个粘性工具条，显示"迁移选中（N）"主按钮与"取消选择"次按钮。
5. WHEN 用户点击"迁移选中"，THE Migrate_Page SHALL 禁用所有行级交互并显示一个带进度文字的非阻塞指示器（形如"正在迁移 2/5"），不使用模态遮罩。
6. WHEN 单个 Skill 迁移失败，THE Migrate_Page SHALL 在对应 `List_Row` 右侧显示 `danger` 文本状态与重试文本按钮，且不中断后续 Skill 的迁移。
7. WHEN 所有选中 Skill 迁移完成，THE Migrate_Page SHALL 在列表上方显示一条总结文本（"已迁移 N，失败 M"），持续 6 秒后自动消失。
8. IF 所选工具尚未被检测到，THEN THE Migrate_Page SHALL 禁用"扫描"按钮，并在按钮旁显示一行说明文字引导用户前往 Tools 页。
9. THE Migrate_Page SHALL 不使用 `window.alert` 或 `window.confirm` 作为交互反馈；所有反馈 SHALL 使用应用内组件（toast、inline message、二次确认 popover）。

### Requirement 8：Settings 页面重设计

**User Story:** 作为用户，我希望在设置页以分组表单形式管理 Skill 来源、存储位置与外观等配置。

#### Acceptance Criteria

1. THE Settings_Page SHALL 将内容划分为分组：`General`、`Sources`、`Storage`、`Appearance`、`About`。
2. THE Settings_Page SHALL 使用左对齐的"标签 / 控件 / 说明"三列网格排版每条设置项，不使用居中占位图。
3. THE Settings_Page.Appearance 分组 SHALL 提供主题切换控件，选项为 `System`、`Light`、`Dark`，默认 `System`。
4. WHEN 用户切换主题，THE App_Shell SHALL 在 180ms 内完成主题过渡，过渡期间不闪烁。
5. THE Settings_Page.Storage 分组 SHALL 显示当前 Skill 本地目录路径（mono 字体）与"打开目录"次操作按钮。
6. THE Settings_Page.About 分组 SHALL 显示应用名称、版本号、构建时间与第三方许可信息链接。
7. IF 某设置项尚未实现，THEN THE Settings_Page SHALL 在该行右侧显示 `coming soon` 文本徽标并禁用控件，无论该项是否已有计划发布时间。

### Requirement 9：List Row 组件规范

**User Story:** 作为设计系统维护者，我希望列表行是一个统一组件，以便在 My Skills、Tools、Migrate、Discovery 等场景复用。

#### Acceptance Criteria

1. THE List_Row SHALL 是一个公共组件，接收 `leading`、`primary`、`secondary`、`meta`、`trailing`、`onSelect`、`selected`、`disabled` 等 prop。
2. THE List_Row SHALL 默认仅展示 `primary` 与至多两个 `meta` 字段；`secondary` 与行级操作 SHALL 在悬停时才显示。
3. WHEN `selected` 为 true，THE List_Row SHALL 显示 2px `accent` 左侧指示条与 `surface-raised` 行背景。
4. THE List_Row SHALL 支持键盘导航：ArrowUp / ArrowDown 切换焦点，Enter 触发 `onSelect`，Space 切换复选框（如果提供）。
5. WHILE 列表行处于加载状态（例如新增行正在写入），THE List_Row SHALL 使用骨架条占位，骨架条使用 `border-subtle` 同色的 1px 纯色矩形，而非彩色闪动。
6. THE List_Row SHALL 不使用投影、渐变、圆形彩色图标背景；图标 SHALL 与文字同色。

### Requirement 10：Detail Panel 组件规范

**User Story:** 作为用户，我希望在不离开列表上下文的情况下查看并编辑单个条目的详细信息。

#### Acceptance Criteria

1. THE Detail_Panel SHALL 在 `Workspace_Body` 右侧以推入式面板呈现，宽度为 `Workspace_Body` 的 40%，最小 360px，最大 480px。
2. WHEN 用户首次打开 `Detail_Panel`，THE Detail_Panel SHALL 使用 `base=180ms` 过渡从右侧滑入，同时列表列宽使用相同缓动收窄。
3. WHEN 用户按下 `Escape` 或点击面板外主内容区，THE Detail_Panel SHALL 关闭，过渡时长与进入相同。
4. THE Detail_Panel SHALL 包含固定的 `panel-header`（标题 + 关闭按钮）、可滚动的 `panel-body` 与可选的 `panel-footer`（主操作）。
5. THE Detail_Panel SHALL 不使用模态遮罩；主工作区保持可见但不可交互。
6. WHEN 用户在列表中切换选中行，THE Detail_Panel SHALL 在当前实例内更新内容，不执行二次进入动效。

### Requirement 11：Command Bar（可选功能）

**User Story:** 作为熟练用户，我希望通过命令面板快速跳转页面与执行高频操作。

#### Acceptance Criteria

1. WHERE `Command_Bar` 被启用，WHEN 用户按下 `Cmd/Ctrl+K`，THE App_Shell SHALL 唤起 `Command_Bar` 并将输入焦点置于搜索框。
2. WHERE `Command_Bar` 被启用，THE Command_Bar SHALL 至少提供以下命令类别：页面跳转、重新检测工具、扫描本地 Skills、切换主题。
3. WHERE `Command_Bar` 被启用，WHEN 用户按下 `Escape`，THE Command_Bar SHALL 关闭并将焦点还原到此前焦点所在元素。
4. WHERE `Command_Bar` 被启用，THE Command_Bar SHALL 使用与 `Detail_Panel` 相同的 `overlay` 阴影令牌，不使用强烈投影或毛玻璃装饰。

### Requirement 12：Motion System 动效系统

**User Story:** 作为用户，我希望动效仅在强化方向、因果与层级时出现，而不是为了动而动。

#### Acceptance Criteria

1. THE Motion_System SHALL 对所有进入/离开过渡使用 `Design_Token.motion` 中定义的时长与缓动，不允许组件内自定义。
2. THE Motion_System SHALL 限定允许使用动效的四类场景：`enter-sequence`（页面或面板进入）、`state-change`（悬停、选中、开关）、`scroll-linked`（长列表顶部吸附）、`feedback`（操作成功或失败提示）。
3. THE Motion_System SHALL 禁止以下动效：循环呼吸光晕、装饰性渐变流动、不停旋转的背景元素、超过 24px 位移的入场动画。
4. WHEN 用户系统设置 `prefers-reduced-motion: reduce`，THE Motion_System SHALL 将所有时长缩减为 0ms 并移除位移，仅保留透明度过渡。
5. WHEN 页面首次加载完成（包括应用首次启动与页面刷新时的首次加载），THE Workspace_Body SHALL 以不超过 16px 的垂直位移与透明度从 0 到 1 进入；同一会话中同一页面的二次访问或路由切换不再重复该动画。

### Requirement 13：组件清单：保留 / 替换 / 移除

**User Story:** 作为前端工程师，我希望得到明确的组件迁移清单，以便按计划重构现有代码。

#### Acceptance Criteria

1. THE Migration_Inventory SHALL 将 `src/components/SkillCard.tsx` 标记为 `replace`，由新的 `List_Row` + `Detail_Panel` 组合替代。
2. THE Migration_Inventory SHALL 将 `src/components/ToolCard.tsx` 标记为 `replace`，由新的 `List_Row` 替代。
3. THE Migration_Inventory SHALL 将 `src/components/Sidebar.tsx` 标记为 `replace`，由新的 `Primary_Nav` 组件替代；WHERE 新组件的 prop 契约需要变更（例如为支持折叠态、未读指示或快捷键），THE Migration_Inventory SHALL 记录新旧 prop 差异并同步更新 `App.tsx` 调用点。
4. THE Migration_Inventory SHALL 新增以下组件：`Primary_Nav`、`Workspace_Header`、`List_Row`、`Detail_Panel`、`Empty_State`、`Toast`、`Button`、`IconButton`、`TextField`、`Select`、`Switch`、`Checkbox`、`Tooltip`、`Badge`。
5. THE Migration_Inventory SHALL 将 `window.alert` 与 `window.confirm` 标记为 `remove`，改由 `Toast` 与二次确认 popover 替代。
6. THE Migration_Inventory SHALL 将 `src/index.css` 中的 `body` 背景硬编码（`bg-gray-50`）替换为基于 `Design_Token.color.canvas` 的 CSS 变量。

### Requirement 14：可访问性

**User Story:** 作为需要辅助技术的用户，我希望应用在键盘、焦点与语义上可访问。

#### Acceptance Criteria

1. THE App_Shell SHALL 保证所有可交互元素在键盘焦点下呈现 2px `accent` 焦点环，且焦点环不被裁剪。
2. THE App_Shell SHALL 保证 `text-primary` 在 `canvas` 背景上的对比度不低于 WCAG 2.2 AA 的 4.5:1，`text-secondary` 不低于 3:1。
3. THE Primary_Nav SHALL 使用 `nav` 语义元素，导航项使用 `aria-current="page"` 标识活动项。
4. THE List_Row SHALL 使用 `role="row"` 或 `role="listitem"` 语义，行内可交互元素 SHALL 使用原生 `button` / `input` 元素。
5. THE Detail_Panel SHALL 使用 `role="complementary"` 并包含 `aria-label`；面板打开时焦点 SHALL 移动到 `panel-header` 关闭按钮。
6. THE Toast SHALL 使用 `role="status"`（成功/信息）或 `role="alert"`（失败/警告）。
7. WHEN 用户启用 `prefers-color-scheme: dark` 且 Settings 中主题为 `System`，THE App_Shell SHALL 自动切换到 dark 令牌。

### Requirement 15：桌面窗口响应式行为

**User Story:** 作为用户，我希望在不同窗口尺寸下应用仍然可用，因为我会缩放 Tauri 窗口。

#### Acceptance Criteria

1. THE App_Shell SHALL 在最小窗口尺寸 800×600 下仍可完整显示 `Primary_Nav`（折叠态）与 `Workspace_Body`。
2. WHEN 窗口宽度小于 1024px，THE Primary_Nav SHALL 折叠为图标栏，且 `Workspace_Header` 中的次要元信息 SHALL 折叠为图标加 tooltip。
3. WHEN 窗口宽度小于 900px 且 `Detail_Panel` 处于打开态，THE Detail_Panel SHALL 覆盖 `Workspace_Body` 的 70% 宽度而非推入式布局，以保证主区域可读宽度。
4. THE List_Row SHALL 在窗口缩放时保持单行显示；任意列超长时 SHALL 使用 `…` 截断，而非换行堆叠。
5. IF 窗口宽度小于 800px，THEN THE App_Shell SHALL 仅保证 `Workspace_Body` 可用，允许 `Primary_Nav` 以 overlay 方式显示。

### Requirement 16：全局状态反馈（空、加载、错误）

**User Story:** 作为用户，我希望在任何页面都能看到一致的加载、空与错误状态。

#### Acceptance Criteria

1. WHILE 任意页面正在加载首屏数据，THE Workspace_Body SHALL 显示骨架占位（`List_Row` 骨架或内容骨架），不使用居中文字"加载中..."。
2. THE Skeleton_Placeholder SHALL 仅使用 `border-subtle` 同色的矩形，不使用彩色闪动或波纹动效；如动效被允许，SHALL 使用 1000ms 内的单向透明度循环。
3. WHEN 页面接口调用失败，THE Workspace_Body SHALL 在正文顶部渲染一条 inline 错误条，包含错误摘要与"重试"文本按钮；错误条使用 `danger` 前景与 1px `danger` 边框，不使用填充背景色块。
4. IF 错误来自 Tauri 命令异常，THEN THE Workspace_Body SHALL 将完整错误文本折叠在"查看详情"之后，默认隐藏。
5. THE Toast SHALL 至多同时显示 3 条；超出数量时 SHALL 按时间先后出队，过渡时长使用 `fast=120ms`。

### Requirement 17：交付与度量

**User Story:** 作为项目负责人，我希望对本次重设计有可验收的度量，以便确认目标达成。

#### Acceptance Criteria

1. THE Redesign SHALL 在交付时提供设计令牌 JSON 文件与 Tailwind 配置两份产物，二者必须一致。
2. THE Redesign SHALL 在交付时提供组件迁移清单对照表（保留 / 替换 / 移除），与 Requirement 13 保持一致。
3. THE Redesign SHALL 保证所有五个一级页面在重构后通过既有的 Tauri 后端命令契约（`getSkills`、`toggleSkill`、`uninstallSkill`、`getTools`、`detectTools`、`toggleTool`、`scanLocalSkills`、`migrateLocalSkill`）无改动完成集成。
4. THE Redesign SHALL 在 1440×900 窗口下，首屏（首次可交互）时间不超过 1200ms（基于本地 dev 构建测量）。
5. THE Redesign SHALL 在视觉审阅中满足以下约束：整屏强调色使用面积不超过 5%、不出现两个以上并列彩色徽标、不出现装饰性大图标占位、不出现 `bg-gradient-*` 类名。
