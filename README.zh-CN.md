# Prot Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Status](https://img.shields.io/badge/status-early%20development-orange)

[English](README.md) | 简体中文

Prot Skills 是一个开源桌面应用，用于统一管理本机多个 AI 编程工具中的
agent Skills。它可以检测本机工具安装情况、扫描已有 Skills、将 Skills
迁移到统一的受管目录，并通过文件系统软链接让各个工具继续从原路径读取。

项目采用 local-first 设计。当前核心管理流程不依赖云端服务，Skills 文件和
元数据都保存在你的本机。

## 项目状态

Prot Skills 仍处于早期活跃开发阶段。当前已经实现本机工具检测、Skills
扫描、迁移、启用/禁用和卸载流程。远程发现、基于 registry 的安装、来源管理
和正式发布打包还在持续完善中。

在迁移重要 Skills 前，建议先确保它们已经纳入版本管理或做好备份。

## 为什么需要 Prot Skills

越来越多 agent 工具开始支持可复用的 Skills，但不同工具通常把 Skills 存放在
不同的本机目录中。这会让审计、复用、迁移和统一禁用都变得困难。

Prot Skills 的目标是提供：

- 跨多个 agent 工具的统一本机 Skills 清单。
- 一个可以作为“单一事实来源”的受管 Skills 库。
- 兼容现有工具目录结构的迁移流程。
- 面向未来社区发现和安装流程的基础能力。

## 功能特性

- 从常见配置目录检测已安装的 agent 工具。
- 支持添加和管理自定义工具配置路径。
- 扫描已启用工具中包含 `SKILL.md` 的本机 Skill 目录。
- 将选中的 Skills 迁移到 `~/.prot-skills/skills`。
- 将已迁移的工具本地 Skill 目录替换为指向受管副本的软链接。
- 启用、禁用和卸载受管 Skills。
- 在设置中查看受管存储路径。
- 支持跟随系统、浅色和深色主题。
- 包含基于 Vitest 的前端测试和 Rust 后端测试。

## 当前支持检测的工具

Prot Skills 当前内置以下检测规则：

| 工具 | 默认配置目录 | Skills 子目录 |
| --- | --- | --- |
| Cursor | `~/.cursor` | `skills` |
| Trae | `~/.trae` | `skills` |
| Trae CN | `~/.trae-cn` | `skills` |
| Claude | `~/.claude` | `skills` |
| Kiro | `~/.kiro` | `skills` |
| Codex | `~/.codex` | `skills` |
| OpenCode | `~/.opencode` | `skills` |
| Windsurf | `~/.windsurf` | `skills` |
| Aider | `~/.aider` | `skills` |
| Continue | `~/.continue` | `skills` |
| Codeium | `~/.codeium` | `skills` |

你也可以在 Tools 页面添加自定义工具。当前自定义工具默认使用 `skills` 作为
Skills 子目录。

Prot Skills 与上表中的工具没有官方从属或合作关系。

## 迁移机制

Prot Skills 将受管 Skills 存放在：

```text
~/.prot-skills/skills
```

本机元数据存放在：

```text
~/.prot-skills/metadata.db
```

迁移一个 Skill 时，Prot Skills 会：

1. 解析你选中的源目录。
2. 将 Skill 复制到受管 Skills 库。
3. 将元数据写入本机 SQLite 数据库。
4. 将原工具目录中的 Skill 文件夹替换为指向受管副本的软链接。

这样可以让各个工具继续使用它们原本期望的目录结构，同时让 Prot Skills 拥有
一个统一的受管库。

注意：迁移会修改本机文件系统。如果源路径已经存在，Prot Skills 可能会删除
原目录并用软链接替代。迁移前请备份或提交重要 Skills。

## 技术栈

- Vite 5
- React 18
- TypeScript
- Tailwind CSS
- Radix UI primitives
- Tauri 2.x
- Rust
- SQLite via `rusqlite`
- Vitest 与 Testing Library

## 环境要求

- Node.js 18 或更高版本
- pnpm
- Rust stable toolchain
- Tauri 2.x 对应平台的系统依赖

不同系统的 Tauri 依赖可能不同。macOS 通常需要 Rust toolchain 和 Xcode
Command Line Tools；Linux 和 Windows 可能需要额外的 WebView 或系统包。

## 快速开始

安装依赖：

```sh
pnpm install
```

启动 Web 开发服务：

```sh
pnpm dev
```

启动桌面应用：

```sh
pnpm tauri:dev
```

构建前端：

```sh
pnpm build
```

构建桌面应用：

```sh
pnpm tauri build
```

### macOS 运行说明

由于应用未经过签名，macOS 可能会拦截或显示"无法验证开发者"的警告。检查可执行文件是否带有 quarantine 属性：

```sh
xattr -l "/Applications/Prot Skills.app"
```

如果看到 `com.apple.quarantine` 属性，使用以下命令移除：

```sh
xattr -d com.apple.quarantine "/Applications/Prot Skills.app"
```

之后应用即可正常启动。

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Vite 开发服务。 |
| `pnpm tauri:dev` | 以开发模式运行 Tauri 桌面应用。 |
| `pnpm build` | 执行 TypeScript 检查并构建前端。 |
| `pnpm preview` | 预览生产构建结果。 |
| `pnpm test` | 运行一次 Vitest 测试。 |
| `pnpm test:watch` | 以 watch 模式运行 Vitest。 |
| `pnpm test:tokens` | 校验设计 token 输出。 |
| `pnpm audit:visual` | 运行视觉审计脚本。 |
| `cd src-tauri && cargo test` | 运行 Rust 测试。 |

## 发布流程

桌面版本通过 git tag 发布，并从仓库内的版本说明文件生成 GitHub draft
release。

```sh
pnpm release:version patch
cp docs/releases/TEMPLATE.md docs/releases/vX.Y.Z.md
pnpm test
pnpm build
cd src-tauri && cargo test
pnpm release:tag vX.Y.Z
```

发布工作流会读取 `docs/releases/vX.Y.Z.md` 并写入对应 tag 的 draft
release。完整清单见
[`docs/releasing.md`](docs/releasing.md)。发布产物会使用更偏产品化的文件名，
例如 `Prot-Skills-v0.0.4-macos-aarch64.dmg`。

## 仓库结构

```text
src/
  api/          React 应用调用的 Tauri command 封装
  components/   基础 UI 控件和可复用 UI pattern
  design/       设计 token 与生成的 CSS 变量
  hooks/        共享 React hooks
  lib/          前端工具函数
  pages/        应用页面
  shell/        布局、导航、providers 和 command bar

src-tauri/
  src/
    commands/   暴露给前端的 Tauri commands
    db/         SQLite 连接与 schema 初始化
    models/     Rust 数据模型
    services/   Skill、工具检测、发现和链接服务
    utils/      路径与文件系统辅助函数

assets/         静态资源
scripts/        校验与审计脚本
```

## 安全与文件系统边界

Prot Skills 是一个会管理本机文件的桌面应用。当前 Tauri 配置开启了文件系统、
路径访问和打开文件夹能力，用于扫描工具、复制 Skills 和创建软链接。

以下区域的改动需要重点审查：

- `src-tauri/tauri.conf.json`
- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `src-tauri/src/utils/path_utils.rs`

不要在未审查内容的情况下迁移来自不可信来源的 Skills。

## 路线图

- 远程 Skill 发现与安装。
- 可配置的 Skill 来源。
- 更安全的迁移预览与冲突处理。
- 从 `SKILL.md` 解析更丰富的 Skill 元数据。
- 面向常见桌面平台的发布打包。
- 导入、导出和备份流程。

## 参与贡献

欢迎提交 issue 和 pull request。提交 PR 时请保持改动范围聚焦，并清晰说明对用户
可见的行为变化。

建议在提交 PR 前运行：

```sh
pnpm test
pnpm build
cd src-tauri && cargo test
```

如果改动涉及可见 UI，请附上截图或录屏。如果改动涉及 Tauri 权限、文件系统行为、
软链接行为或数据库 schema，请在 PR 描述中明确说明。

## 许可证

Prot Skills 基于 [MIT License](LICENSE) 开源。
