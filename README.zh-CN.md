# Prot Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Status](https://img.shields.io/badge/status-early%20development-orange)

[English](README.md) | 简体中文

Prot Skills 是一个 local-first 的桌面应用，用一个界面统一管理本机多个 AI
编程工具中的 agent Skills。它会检测已安装的工具、扫描各工具的 Skill 目录，把
Skills 迁移到一个统一的受管目录，再通过软链接把它们接回各工具的原目录，
让每个工具都能从原本期望的路径继续读取。

> **当前状态：** 早期开发中。本机检测、扫描、迁移、启用/禁用、卸载已经可用；
> 远程发现、来源管理、正式发布打包仍在完善。迁移前请先备份重要 Skills。

## 功能特性

- 检测已安装的 agent 工具，也支持添加自定义路径。
- 扫描各工具下包含 `SKILL.md` 的 Skill 目录。
- 把 Skills 迁移到 `~/.prot-skills/skills`，原目录替换为指向受管副本的软链接。
- 新增或迁移的 Skill 默认自动链接到所有启用的工具，可在 **My Skills**
  中为单个工具单独开关。
- 启用、禁用、卸载受管 Skills。
- 在 **设置** 中查看受管路径；支持系统/浅色/深色主题。
- 内置 Vitest 前端测试和 Rust 后端测试。

## 支持的工具

内置检测规则：

| 工具     | 默认配置目录  | Skills 子目录 |
| -------- | ------------- | ------------- |
| Cursor   | `~/.cursor`   | `skills`      |
| Trae     | `~/.trae`     | `skills`      |
| Trae CN  | `~/.trae-cn`  | `skills`      |
| Claude   | `~/.claude`   | `skills`      |
| Kiro     | `~/.kiro`     | `skills`      |
| Codex    | `~/.codex`    | `skills`      |
| OpenCode | `~/.opencode` | `skills`      |
| Windsurf | `~/.windsurf` | `skills`      |
| Aider    | `~/.aider`    | `skills`      |
| Continue | `~/.continue` | `skills`      |
| Codeium  | `~/.codeium`  | `skills`      |
| Gemini   | `~/.gemini`   | `skills`      |
| Pi       | `~/.pi/agent` | `skills`      |

也可以在 **Tools** 页面注册自定义工具（目前默认使用 `skills/` 作为子目录）。
Prot Skills 与上述工具均无官方关联。

## 迁移机制

受管 Skills 存放在 `~/.prot-skills/skills`，元数据存放在
`~/.prot-skills/metadata.db`。

迁移一个 Skill 时，Prot Skills 会：

1. 把源目录复制到受管库。
2. 把元数据写入本机 SQLite 数据库。
3. 创建并验证指向受管副本的替换软链接。
4. **仅在软链接验证成功后替换原目录**。
5. 如果无法安全完成替换，会保留原目录并报告失败。
6. 默认把它链接到所有已启用的工具。

> ⚠️ 迁移会修改文件系统，可能删除原目录。请先把重要 Skills 提交到版本管理或
> 单独备份。

## 技术栈

Vite 5 · React 18 · React Router 6 · TypeScript 5 · Tailwind CSS 3 ·
Radix UI · `cmdk` · `lucide-react` · Tauri 2 · Rust 2021 · `rusqlite` ·
Vitest + Testing Library。

## 快速开始

环境要求：Node.js ≥ 18、pnpm、Rust stable、对应平台的
[Tauri 2 系统依赖](https://tauri.app/start/prerequisites/)。

```sh
pnpm install
pnpm dev          # Vite 开发服务
pnpm tauri:dev    # 桌面应用开发模式
pnpm build        # TypeScript 检查 + 前端构建
pnpm tauri build  # 构建桌面应用
```

### macOS 运行说明

应用未签名，macOS 可能提示"无法验证开发者"。出现时移除 quarantine 属性即可：

```sh
xattr -d com.apple.quarantine "/Applications/Prot Skills.app"
```

## 开发命令

| 命令                         | 说明                          |
| ---------------------------- | ----------------------------- |
| `pnpm dev`                   | 启动 Vite 开发服务。          |
| `pnpm tauri:dev`             | 以开发模式运行桌面应用。      |
| `pnpm build`                 | TypeScript 检查 + 前端构建。  |
| `pnpm preview`               | 预览生产构建。                |
| `pnpm test` / `test:watch`   | 运行 Vitest（单次 / watch）。 |
| `pnpm test:tokens`           | 校验设计 token 输出。         |
| `pnpm audit:visual`          | 运行视觉审计脚本。            |
| `cd src-tauri && cargo test` | 运行 Rust 测试。              |

## 发布流程

通过 git tag 发布，版本说明放在 `docs/releases/vX.Y.Z.md`：

```sh
pnpm release:version patch
cp docs/releases/TEMPLATE.md docs/releases/vX.Y.Z.md
pnpm test && pnpm build
cd src-tauri && cargo test
pnpm release:tag vX.Y.Z
```

发布工作流会读取该 Markdown 并创建对应 tag 的 GitHub Release，产物文件名形如
`Prot-Skills-vX.Y.Z-<platform>-<arch>.<ext>`。完整清单见
[`docs/releasing.md`](docs/releasing.md)。

## 仓库结构

```text
src/
  api/         Tauri command 封装
  components/  UI 控件与可复用 pattern
  design/      设计 token 与 CSS 变量
  hooks/       共享 React hooks
  lib/         前端工具函数
  pages/       应用页面
  shell/       布局、导航、providers、command bar

src-tauri/src/
  commands/    暴露给前端的 Tauri commands
  db/          SQLite 连接与 schema
  models/      Rust 数据模型
  services/    Skill、工具检测、发现、链接服务
  utils/       路径与文件系统辅助函数

assets/        静态资源
scripts/       校验与审计脚本
```

## 安全与文件系统边界

Prot Skills 会创建软链接并修改本机文件，Tauri 当前开启了文件系统、路径访问和
打开文件夹能力。以下文件的改动需要重点审查：

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `src-tauri/src/utils/path_utils.rs`

不要迁移你没有审查过的来源不明的 Skills。

## 路线图

- 远程 Skill 发现与安装
- 可配置的 Skill 来源
- 迁移预览与冲突处理
- 更丰富的 `SKILL.md` 元数据解析
- 跨平台发布打包
- 导入 / 导出 / 备份流程

## 参与贡献

欢迎提交 issue 和 PR — 请保持改动聚焦，并清晰说明用户可见的行为变化。提交前
请运行：

```sh
pnpm test
pnpm build
cd src-tauri && cargo test
```

UI 改动请附截图或录屏。涉及 Tauri 权限、文件系统行为、软链接或数据库 schema
的改动请在 PR 描述中明确说明。

## 许可证

[MIT](LICENSE)

## 友链

- [Linux Do](https://linux.do/)
