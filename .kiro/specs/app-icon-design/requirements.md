# Requirements Document

## Introduction

本特性为 AI Skills Manager 桌面应用设计并交付一套完整的应用图标资产，覆盖 Tauri 打包所需的全部尺寸与平台格式（macOS、Windows、Linux）。图标需要传达"AI 技能统一管理"这一核心产品理念，风格现代简洁，并在所有尺寸下保持清晰可辨识。同时，本特性要包含图标资产的生成、落盘到 `src-tauri/icons/` 目录，以及与 `src-tauri/tauri.conf.json` 配置的对齐，确保 `tauri build` 能正确打包出带有新图标的应用。

## Glossary

- **AI_Skills_Manager**: 本项目桌面应用，一个基于 Tauri 的 AI 技能（Skills）统一管理工具。
- **App_Icon**: 应用图标的"抽象视觉资产"——不依赖具体文件格式的设计稿（通常以 SVG 或 1024x1024 PNG 为主源）。
- **Icon_Source_File**: 图标设计的主源文件，位于 `src-tauri/icons/source/icon.svg`，用于派生所有其他尺寸。
- **Icon_Asset_Set**: 位于 `src-tauri/icons/` 的完整图标文件集合，包括通用 PNG、Windows Store Logo、`icon.icns`、`icon.ico`、`icon.png`。
- **Icon_Generator**: 将 Icon_Source_File 转换为 Icon_Asset_Set 的生成工具或脚本（例如 `tauri icon` 命令或自定义脚本）。
- **Tauri_Bundle_Config**: `src-tauri/tauri.conf.json` 中 `tauri.bundle.icon` 数组及相关配置。
- **Tauri_Build_System**: Tauri 打包子系统，通过 `tauri build` 调用并消费 Icon_Asset_Set。
- **Required_Icon_Files**: Tauri 打包所需的全部图标文件列表（见 Requirement 4）。
- **Design_Palette**: 图标设计所使用的主色与辅助色集合。
- **Readable_Minimum_Size**: 图标在最小应用场景下（32x32 像素）仍可辨识主体图形的要求。

## Requirements

### Requirement 1: 视觉设计理念

**User Story:** 作为 AI Skills Manager 的用户，我希望应用图标在视觉上能够传达"AI 技能管理"的核心概念，以便在系统任务栏、Dock 和应用列表中快速识别该应用。

#### Acceptance Criteria

1. THE App_Icon SHALL 包含一个能够隐喻"技能集合/模块化"的主视觉元素（例如堆叠方块、拼图片段、神经网络节点或书签集合中的一种）。
2. THE App_Icon SHALL 采用现代扁平化设计风格，使用最多 2 种几何形状作为主视觉构成，不包含具象人脸或真实产品复刻。
3. THE App_Icon SHALL 采用居中布局，主视觉元素占据 1024x1024 主源画布的 60% 到 80% 面积（即主体包围盒边长介于 614 像素到 819 像素之间），四周留出透明或背景色安全边距。
4. THE App_Icon SHALL 具备浅色背景与深色背景下都可辨识的对比度，主视觉与背景色之间的 WCAG 对比度比值不低于 3.0:1。

### Requirement 2: 配色方案

**User Story:** 作为产品维护者，我希望图标配色与产品"技术感 + 智能"的定位一致，以便与应用界面和品牌整体协调。

#### Acceptance Criteria

1. THE Design_Palette SHALL 明确定义 1 个主色、1 个强调色、最多 1 个背景色，共不超过 3 种颜色（不含透明）。
2. THE Design_Palette SHALL 使用十六进制色值（例如 `#4F46E5`）在需求文档或设计说明中显式记录每种颜色。
3. THE App_Icon SHALL 在所有尺寸的 PNG 输出中使用完全相同的 Design_Palette 色值，不得在不同尺寸上做色偏调整。
4. WHERE 图标用于 Windows Store Logo（Square*Logo.png）的透明背景场景，THE App_Icon SHALL 使用透明背景（Alpha 通道）而非纯白背景。

### Requirement 3: 主源文件

**User Story:** 作为开发者，我希望存在一个唯一的高分辨率主源文件，以便后续可以重新生成全部尺寸而不损失质量。

#### Acceptance Criteria

1. THE Icon_Source_File SHALL 保存为 `src-tauri/icons/source/icon.svg`，并同时提供一份 1024x1024 像素的 `src-tauri/icons/source/icon-1024.png` 作为栅格主源。
2. THE Icon_Source_File SHALL 使用正方形画布，宽高均为 1024 像素（SVG 的 viewBox 为 `0 0 1024 1024`）。
3. WHEN Icon_Source_File 发生修改，THE Icon_Generator SHALL 能够从该主源一次性重新生成 Icon_Asset_Set 中的所有文件。
4. IF Icon_Source_File 缺失或无法读取，THEN THE Icon_Generator SHALL 终止生成流程并输出明确的错误信息，不得产出任何部分更新的 Icon_Asset_Set。

### Requirement 4: 必需图标文件集合

**User Story:** 作为 Tauri 打包系统，我需要 `src-tauri/icons/` 目录下存在全部所需的图标文件，以便在 macOS、Windows 和 Linux 三个平台正确打包应用。

#### Acceptance Criteria

1. THE Icon_Asset_Set SHALL 包含以下通用 PNG 文件（仅 PNG，其他格式由后续 AC 约束），位于 `src-tauri/icons/`：
   - `32x32.png`（32×32 像素）
   - `128x128.png`（128×128 像素）
   - `128x128@2x.png`（256×256 像素）
   - `icon.png`（Linux 默认，1024×1024 像素）
2. THE Icon_Asset_Set SHALL 包含以下 Windows Store Logo 文件，位于 `src-tauri/icons/`，像素尺寸与文件名一致：
   - `Square30x30Logo.png`、`Square44x44Logo.png`、`Square71x71Logo.png`、`Square89x89Logo.png`、`Square107x107Logo.png`、`Square142x142Logo.png`、`Square150x150Logo.png`、`Square284x284Logo.png`、`Square310x310Logo.png`、`StoreLogo.png`（50×50 像素）
3. THE Icon_Asset_Set SHALL 包含 macOS 图标文件 `src-tauri/icons/icon.icns`，其内部至少嵌入 16、32、64、128、256、512、1024 像素（以及对应 @2x）的位图。
4. THE Icon_Asset_Set SHALL 包含 Windows 图标文件 `src-tauri/icons/icon.ico`，其内部至少嵌入 16、32、48、64、128、256 像素的位图。
5. FOR ALL 文件 F 属于 Required_Icon_Files，在生成完成后 F SHALL 存在、可被读取、且文件大小大于 0 字节。

### Requirement 5: 尺寸与格式正确性

**User Story:** 作为质量审查者，我需要保证每个生成的位图文件的像素尺寸和文件格式与文件名声明的一致，以便避免运行时图标模糊或加载失败。

#### Acceptance Criteria

1. FOR ALL PNG 文件 F 属于 Icon_Asset_Set，F 的解码后宽度和高度 SHALL 严格等于文件名中声明的像素值（例如 `Square142x142Logo.png` 必须为 142×142）。
2. FOR ALL PNG 文件 F 属于 Icon_Asset_Set，F SHALL 符合 PNG 文件签名（以字节 `89 50 4E 47 0D 0A 1A 0A` 起始）。
3. THE `icon.icns` 文件 SHALL 以 Apple Icon Image 格式签名 `icns` 作为前 4 字节。
4. THE `icon.ico` 文件 SHALL 以 Windows ICO 文件头（2 字节保留字 `00 00`，2 字节类型 `01 00`）起始。
5. FOR ALL PNG 文件 F 属于 Icon_Asset_Set，F SHALL 包含 8 位 Alpha 通道（RGBA 色彩模式）。

### Requirement 6: 品牌一致性（跨尺寸与跨平台）

**User Story:** 作为最终用户，我希望在 macOS Dock、Windows 任务栏、Linux 应用菜单以及应用内界面中看到的图标视觉是一致的，以便形成稳定的品牌认知。

#### Acceptance Criteria

1. THE Icon_Asset_Set 中所有 PNG 文件 SHALL 呈现同一设计构图（相同主视觉、相同配色、相同构图比例），不得为不同尺寸使用不同设计稿。
2. WHILE 图标尺寸小于或等于 Readable_Minimum_Size（32×32 像素），THE App_Icon SHALL 保持主视觉元素可辨识，允许移除或简化装饰性细节，但不得更换主视觉形状。
3. THE `icon.icns` 和 `icon.ico` 内部嵌入的各级位图 SHALL 与同尺寸的独立 PNG 文件（若存在）在视觉上一致（允许因压缩/重采样产生的不可感知差异）。
4. WHERE 某个尺寸下由于像素限制需要替换为简化版设计，THE 设计说明 SHALL 在 `src-tauri/icons/source/README.md` 中列出所有使用简化版的尺寸阈值。

### Requirement 7: 与 Tauri 打包配置对齐

**User Story:** 作为开发者，我希望 `tauri build` 能够基于新图标正确打包出各平台安装包，以便发布带新图标的应用版本。

#### Acceptance Criteria

1. THE Tauri_Bundle_Config 中 `tauri.bundle.icon` 数组 SHALL 包含以下五个相对路径，且顺序为：`icons/32x32.png`、`icons/128x128.png`、`icons/128x128@2x.png`、`icons/icon.icns`、`icons/icon.ico`。
2. FOR ALL 路径 P 属于 Tauri_Bundle_Config 的 `tauri.bundle.icon` 数组，P SHALL 指向一个实际存在于 `src-tauri/` 下的文件。
3. WHEN 执行 `tauri build` 命令，THE Tauri_Build_System SHALL 在不修改 Icon_Asset_Set 的前提下成功完成打包，且退出码为 0。
4. THE Tauri_Bundle_Config 的非图标字段（`identifier`、`targets`、`active` 等）SHALL 在本次变更中保持不变。

### Requirement 8: 图标生成流程可重复性

**User Story:** 作为开发者，我希望有一条一键命令能够从主源重新生成全部图标，以便在未来迭代设计时不需要手工处理每个尺寸。

#### Acceptance Criteria

1. THE Icon_Generator SHALL 以 npm 脚本形式暴露为 `package.json` 中的 `icons:generate` 命令。
2. WHEN 开发者执行 `npm run icons:generate`，THE Icon_Generator SHALL 从 Icon_Source_File 读取，并输出完整的 Required_Icon_Files 到 `src-tauri/icons/`。
3. WHEN Icon_Generator 连续执行两次且 Icon_Source_File 未被修改，THE 第二次执行 SHALL 产出与第一次完全相同的 Icon_Asset_Set（逐字节一致或在同一 PNG 标准化配置下视觉一致），即生成过程具有幂等性。
4. IF Icon_Generator 执行过程中任一尺寸生成失败，THEN THE Icon_Generator SHALL 同时满足以下两个行为：返回非零退出码，以及将 `src-tauri/icons/` 中所有 Required_Icon_Files 保持为生成前的原始内容（逐字节一致），不得留下任何部分更新的文件。
5. WHEN Icon_Generator 成功执行完成，THE Icon_Generator SHALL 在 `src-tauri/icons/.backup/` 目录下保留执行前 Required_Icon_Files 的一份逐字节副本，以便在视觉回归时可被手工恢复。

### Requirement 9: 旧图标替换与清理

**User Story:** 作为代码维护者，我希望原有占位图标文件被新图标彻底替换而不是共存，以避免仓库中保留无效资产。

#### Acceptance Criteria

1. WHEN 新 Icon_Asset_Set 生成完成，THE `src-tauri/icons/` 目录 SHALL 不包含任何不在 Required_Icon_Files 列表中的残留 PNG/ICO/ICNS 文件。
2. THE 旧占位图标文件 SHALL 被新生成的同名文件原地覆盖，而不是新增带后缀的副本（例如禁止出现 `icon-new.png`、`32x32-v2.png` 等）。
3. WHERE 图标主源文件目录 `src-tauri/icons/source/` 包含 SVG 或说明文件，THE 这些文件 SHALL 被保留，且不会影响 Tauri_Build_System 识别 Required_Icon_Files。

### Requirement 10: 图标资产验证属性（round-trip / 不变量）

**User Story:** 作为自动化测试，我希望可以通过程序化检查快速验证图标资产集合的完整性和正确性，以便在 CI 中防止未来的错误提交。

#### Acceptance Criteria

1. FOR ALL 文件名 N 属于 Required_Icon_Files 中声明的 PNG 文件集合，在 `src-tauri/icons/` 下 SHALL 存在同名文件且其解码后尺寸与文件名中的像素声明完全一致（尺寸-文件名不变量）；IF 任一声明文件缺失，THEN 该不变量 SHALL 被视为违反，而非空真满足。
2. FOR 主源到输出的生成过程，WHEN 从 Icon_Source_File 重新生成全部资产并再次读取每个输出 PNG 的尺寸，THE 读取到的尺寸集合 SHALL 等于文件名所隐含的尺寸集合（生成-读取 round-trip 属性）。
3. FOR 幂等性验证，WHEN 在不修改 Icon_Source_File 的前提下执行 `npm run icons:generate` 两次，THE 第二次执行后所有 Icon_Asset_Set 文件的 SHA-256 哈希值 SHALL 与第一次执行后的哈希值一一相等。
4. FOR `icon.ico` 和 `icon.icns`，THE 文件中嵌入的子图像尺寸集合 SHALL 分别是 Requirement 4 中约定的最小嵌入尺寸集合的超集。
