# AI Skills Manager 设计文档

## 1. 项目概述

### 1.1 目标
创建一个桌面 GUI 应用，统一管理所有 AI 开发工具的 Skills，通过软链接实现"一处管理，处处使用"。

### 1.2 核心价值
- **统一管理**：所有 Skills 集中存储，避免分散在各工具目录
- **快速复用**：新增 AI 工具时，已有 Skills 可立即通过软链接使用
- **便捷发现**：聚合多个 Skill 来源，方便浏览和安装
- **本地迁移**：自动发现并迁移本地已有 Skills

### 1.3 技术栈
- **框架**: Tauri (Rust + Web 前端)
- **前端**: React + TypeScript + Tailwind CSS
- **存储**: SQLite (元数据) + 本地文件系统 (Skills)
- **配置**: JSON 文件

---

## 2. 系统架构

### 2.1 目录结构

```
~/.ai-skills-manager/              # 统一管理目录
├── skills/                         # Skills 存储目录
│   ├── skill-a/                    # Skill 文件夹
│   │   ├── SKILL.md               # 必须存在
│   │   └── ...                    # 其他资源文件
│   └── skill-b/
│       └── ...
├── config.json                     # 应用配置
└── metadata.db                     # SQLite 数据库 (Skill 元数据、链接状态)
```

### 2.2 应用架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │ Skill 发现   │ │ 我的 Skills │ │ 工具管理 / 本地迁移  │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │ Tauri IPC
┌─────────────────────────┴───────────────────────────────┐
│                   Backend (Rust)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │ Skill 服务   │ │ 链接管理     │ │ 工具配置服务        │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │ 发现服务     │ │ GitHub API  │ │ skills.sh API       │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 数据模型

### 3.1 Skill 结构

Skill 以文件夹形式存在，必须包含 `SKILL.md`，其他文件不受限制。

```
skill-folder/
├── SKILL.md          # 必须
├── examples/         # 可选
├── templates/        # 可选
└── ...               # 其他任意文件
```

### 3.2 数据库 Schema

```sql
-- Skills 表
CREATE TABLE skills (
    id TEXT PRIMARY KEY,           -- 唯一标识 (文件夹名或生成的 UUID)
    name TEXT NOT NULL,            -- 显示名称
    source_type TEXT NOT NULL,     -- 来源: local | github | skills_sh | manual
    source_url TEXT,               -- 来源 URL
    local_path TEXT NOT NULL,      -- 本地路径 (~/.ai-skills-manager/skills/{id}/)
    installed_at TIMESTAMP,        -- 安装时间
    updated_at TIMESTAMP,          -- 更新时间
    is_enabled BOOLEAN DEFAULT 1,  -- 是否启用
    metadata TEXT                  -- JSON: 作者、标签、描述等
);

-- AI 工具配置表
CREATE TABLE ai_tools (
    id TEXT PRIMARY KEY,           -- 工具标识: cursor | trae | claude | ...
    name TEXT NOT NULL,            -- 显示名称
    config_path TEXT,              -- 配置目录路径 (如 ~/.cursor/)
    skills_subdir TEXT DEFAULT 'skills', -- Skills 子目录 (默认 "skills")
    is_detected BOOLEAN DEFAULT 0, -- 是否自动检测到
    is_enabled BOOLEAN DEFAULT 0,  -- 是否启用
    detected_at TIMESTAMP,
    custom_path TEXT               -- 用户自定义路径
);

-- Skill-工具链接表
CREATE TABLE skill_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    link_path TEXT NOT NULL,       -- 软链接完整路径
    is_active BOOLEAN DEFAULT 1,   -- 链接是否有效
    created_at TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id),
    FOREIGN KEY (tool_id) REFERENCES ai_tools(id),
    UNIQUE(skill_id, tool_id)
);

-- Skill 源配置表
CREATE TABLE skill_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,            -- github | skills_sh | local
    url TEXT NOT NULL,             -- 仓库 URL 或本地路径
    is_enabled BOOLEAN DEFAULT 1,
    added_at TIMESTAMP
);
```

### 3.3 配置文件 (config.json)

```json
{
  "app": {
    "version": "1.0.0",
    "first_run": false,
    "theme": "system"
  },
  "paths": {
    "skills_dir": "~/.ai-skills-manager/skills",
    "database": "~/.ai-skills-manager/metadata.db"
  },
  "discovery": {
    "auto_scan_on_startup": true,
    "sources": [
      {
        "name": "skills.sh",
        "type": "skills_sh",
        "url": "https://skills.sh/api/v1"
      }
    ]
  }
}
```

---

## 4. 功能模块详解

### 4.1 Skill 发现/市场

**功能描述**：聚合多个 Skill 来源，提供统一的浏览、搜索、安装界面。

**支持的来源**：
1. **skills.sh** - 通过 API 获取 Skill 列表
2. **GitHub 仓库** - 支持添加任意 GitHub 仓库作为源
3. **本地目录** - 添加本地文件夹作为源

**界面要素**：
- 搜索框（支持名称、标签、描述搜索）
- 来源筛选器
- Skill 卡片列表（名称、描述、来源、安装按钮）
- Skill 详情页（完整信息、预览、安装）

**安装流程**：
1. 用户点击"安装"
2. 下载 Skill 到 `~/.ai-skills-manager/skills/{id}/`
3. 写入数据库记录
4. 如果工具已启用，自动创建软链接

### 4.2 我的 Skills

**功能描述**：管理已安装的 Skills。

**界面要素**：
- Skill 列表（名称、来源、安装时间、启用状态）
- 启用/禁用开关
- 删除按钮（删除 Skill 文件夹和数据库记录）
- 在文件夹中打开

**启用/禁用逻辑**：
- **启用**：为所有已启用的 AI 工具创建软链接
- **禁用**：移除所有软链接，保留 Skill 文件

### 4.3 工具管理

**功能描述**：配置各 AI 工具的路径和启用状态。

**初始支持的工具**：

| 工具 | 默认配置路径 (macOS) |
|------|---------------------|
| Cursor | `~/.cursor/skills/` |
| Trae | `~/.trae/skills/` |
| Claude | `~/.claude/skills/` |
| Kiro | `~/.kiro/skills/` |
| Codex | `~/.codex/skills/` |
| OpenCode | `~/.opencode/skills/` |
| Windsurf | `~/.windsurf/skills/` |
| Aider | `~/.aider/skills/` |
| Continue | `~/.continue/skills/` |
| Codeium | `~/.codeium/skills/` |

**自动检测逻辑**：
1. 启动时扫描默认路径
2. 如果目录存在，标记为 `is_detected = true`
3. 用户可手动启用/禁用
4. 支持手动指定自定义路径

**启用工具**：
- 为所有已启用的 Skills 创建软链接到该工具的配置目录

### 4.4 本地迁移

**功能描述**：扫描各 AI 工具的配置目录，发现并迁移已有 Skills。

**扫描逻辑**：
1. 遍历所有已配置的工具路径
2. 识别包含 `SKILL.md` 的文件夹
3. **处理软链接**：
   - 如果是软链接，追踪到原始目标路径
   - 检查原始路径是否已在统一管理目录中
   - 如果已在管理目录中，跳过（避免重复）
   - 如果不在，将原始路径作为迁移源
4. 显示发现的 Skills 列表（显示原始路径信息）
5. 用户选择要迁移的 Skills

**迁移流程**：
1. **判断源类型**：
   - 如果是普通文件夹：直接复制到 `~/.ai-skills-manager/skills/{id}/`
   - 如果是软链接：复制原始目标文件夹到统一管理目录
2. **处理原位置**：
   - 删除原位置的软链接或文件夹
   - 创建新的软链接指向统一管理目录
3. 写入数据库记录
4. 标记 `source_type = 'local'`

**特殊情况处理**：
- **循环链接**：检测到循环软链接时跳过并提示用户
- **断链**：软链接指向不存在的路径时，尝试恢复或提示用户
- **已在管理目录**：如果软链接已指向统一管理目录，仅记录到数据库，不重复迁移

### 4.5 设置

**功能描述**：应用配置和 Skill 源管理。

**配置项**：
- **Skill 源管理**：添加/删除/编辑 Skill 来源
- **通用设置**：主题、启动时自动扫描
- **存储位置**：修改 Skills 存储目录（高级）

---

## 5. 软链接管理

### 5.1 链接创建规则

```
源: ~/.ai-skills-manager/skills/{skill-id}/
目标: {tool-config-path}/skills/{skill-id}

示例:
源: ~/.ai-skills-manager/skills/react-best-practices/
目标: ~/.cursor/skills/react-best-practices/
目标: ~/.trae/skills/react-best-practices/
```

### 5.2 链接状态维护

- 启动时检查所有链接的有效性
- 发现断链时标记 `is_active = false`
- 提供"修复链接"功能

### 5.3 命名冲突处理

如果目标位置已存在同名文件夹：
1. 检查是否为软链接且指向正确 → 忽略
2. 检查是否为软链接但指向错误 → 更新链接
3. 如果是普通文件夹 → 提示用户选择（覆盖/跳过/重命名）

---

## 6. UI 设计

### 6.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  AI Skills Manager                              [─] [□] [×] │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  📦 发现  │              Main Content Area                   │
│          │                                                  │
│  📁 我的  │     (Skill 列表 / 详情 / 工具配置 / 设置)         │
│          │                                                  │
│  🔧 工具  │                                                  │
│          │                                                  │
│  🔍 迁移  │                                                  │
│          │                                                  │
│  ⚙️ 设置  │                                                  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### 6.2 页面设计

**发现页**：
- 顶部搜索栏 + 来源筛选
- 网格/列表视图切换
- Skill 卡片（图标、名称、描述、来源标签、安装按钮）

**我的 Skills 页**：
- 列表视图
- 每行：名称、来源、启用开关、操作按钮（删除、在文件夹中打开）

**工具管理页**：
- 卡片列表，每工具一个卡片
- 显示：图标、名称、路径、检测状态、启用开关
- 编辑路径按钮

**本地迁移页**：
- 扫描按钮
- 发现的 Skills 列表（复选框、名称、原位置）
- 批量迁移按钮

---

## 7. API 设计 (Rust Backend)

### 7.1 Skill 相关

```rust
// 获取所有已安装 Skills
#[tauri::command]
async fn get_skills() -> Result<Vec<Skill>, String>

// 安装 Skill (从 URL 或本地路径)
#[tauri::command]
async fn install_skill(source: String, source_type: String) -> Result<Skill, String>

// 卸载 Skill
#[tauri::command]
async fn uninstall_skill(skill_id: String) -> Result<(), String>

// 启用/禁用 Skill
#[tauri::command]
async fn toggle_skill(skill_id: String, enabled: bool) -> Result<(), String>
```

### 7.2 工具相关

```rust
// 获取所有工具配置
#[tauri::command]
async fn get_tools() -> Result<Vec<AITool>, String>

// 更新工具配置
#[tauri::command]
async fn update_tool(tool: AITool) -> Result<(), String>

// 启用/禁用工具
#[tauri::command]
async fn toggle_tool(tool_id: String, enabled: bool) -> Result<(), String>
```

### 7.3 发现相关

```rust
// 从 skills.sh 搜索
#[tauri::command]
async fn search_skills_sh(query: String) -> Result<Vec<RemoteSkill>, String>

// 从 GitHub 仓库获取 Skills
#[tauri::command]
async fn fetch_github_skills(repo_url: String) -> Result<Vec<RemoteSkill>, String>

// 扫描本地 Skills
#[tauri::command]
async fn scan_local_skills() -> Result<Vec<LocalSkill>, String>

// 迁移本地 Skill
#[tauri::command]
async fn migrate_local_skill(path: String) -> Result<Skill, String>
```

---

## 8. 错误处理

### 8.1 常见错误场景

| 场景 | 处理方式 |
|------|---------|
| 下载失败 | 显示错误信息，支持重试 |
| 软链接创建失败 | 检查权限，提示用户 |
| 工具路径不存在 | 标记为未检测，提示配置 |
| 命名冲突 | 弹窗让用户选择处理方式 |
| 数据库损坏 | 自动重建，尝试恢复数据 |

### 8.2 日志记录

- 使用 `tracing` crate 记录日志
- 日志文件：`~/.ai-skills-manager/logs/app.log`
- 支持导出日志用于调试

---

## 9. 安全考虑

1. **路径验证**：所有路径操作前验证合法性，防止目录遍历攻击
2. **软链接检查**：创建前确认目标路径安全
3. **网络请求**：验证 HTTPS 证书，支持代理配置
4. **文件权限**：保持原文件权限，不提升权限运行

---

## 10. 后续扩展

1. **Skill 版本管理**：支持更新 Skills
2. **Skill 同步**：多设备同步 Skills
3. **团队协作**：支持共享 Skill 配置
4. **更多工具**：持续添加新 AI 工具支持
5. **导入/导出**：配置和 Skills 的导入导出

---

## 11. 开发计划

### Phase 1: 核心功能
- [ ] 项目初始化 (Tauri + React)
- [ ] 数据库和配置系统
- [ ] Skill 管理基础功能
- [ ] 软链接管理
- [ ] 基础 UI

### Phase 2: 工具支持
- [ ] 自动检测逻辑
- [ ] 10+ AI 工具支持
- [ ] 工具配置界面

### Phase 3: 发现功能
- [ ] skills.sh 集成
- [ ] GitHub 仓库支持
- [ ] 本地扫描和迁移

### Phase 4: 完善
- [ ] 错误处理和日志
- [ ] 设置界面
- [ ] 测试和优化
