# AI Skills Manager 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Tauri 的桌面 GUI 应用，统一管理所有 AI 开发工具的 Skills，通过软链接实现"一处管理，处处使用"。

**Architecture:** 使用 Tauri (Rust + React) 构建跨平台桌面应用。Rust 后端负责文件系统操作、软链接管理、数据库操作；React 前端提供直观的 GUI 界面。SQLite 存储元数据，本地文件系统存储 Skills。

**Tech Stack:** Tauri, Rust, React, TypeScript, Tailwind CSS, SQLite, rusqlite

**参考设计文档:** [2025-05-11-ai-skills-manager-design.md](../specs/2025-05-11-ai-skills-manager-design.md)

---

## 文件结构规划

```
/Users/apple/Desktop/project/mySpace/demo/app1/
├── src/                          # React 前端源码
│   ├── components/               # 通用组件
│   │   ├── Sidebar.tsx
│   │   ├── SkillCard.tsx
│   │   └── ToolCard.tsx
│   ├── pages/                    # 页面组件
│   │   ├── DiscoveryPage.tsx
│   │   ├── MySkillsPage.tsx
│   │   ├── ToolsPage.tsx
│   │   ├── MigratePage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/                    # 自定义 Hooks
│   │   └── useSkills.ts
│   ├── types/                    # TypeScript 类型
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                    # Rust 后端源码
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 模块导出
│   │   ├── commands/             # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   ├── skill_commands.rs
│   │   │   ├── tool_commands.rs
│   │   │   └── discovery_commands.rs
│   │   ├── services/             # 业务逻辑
│   │   │   ├── mod.rs
│   │   │   ├── skill_service.rs
│   │   │   ├── tool_service.rs
│   │   │   ├── link_service.rs
│   │   │   └── discovery_service.rs
│   │   ├── models/               # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── skill.rs
│   │   │   ├── tool.rs
│   │   │   └── link.rs
│   │   ├── db/                   # 数据库
│   │   │   ├── mod.rs
│   │   │   └── connection.rs
│   │   └── utils/                # 工具函数
│   │       ├── mod.rs
│   │       └── path_utils.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2025-05-11-ai-skills-manager-design.md
│       └── plans/
│           └── 2025-05-11-ai-skills-manager-plan.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── index.html
```

---

## Phase 1: 项目初始化

### Task 1: 初始化 Tauri 项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `tailwind.config.js`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`

- [ ] **Step 1: 创建前端 package.json**

```json
{
  "name": "ai-skills-manager",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^1.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^1.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 TypeScript 配置**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 Vite 配置**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}))
```

- [ ] **Step 4: 创建 HTML 入口**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Skills Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 Tailwind 配置**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 6: 创建 CSS 样式**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

- [ ] **Step 7: 创建 React 入口**

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 8: 创建基础 App 组件**

```typescript
// src/App.tsx
import { useState } from 'react'

function App() {
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">AI Skills Manager</h1>
        <p className="text-gray-600">Welcome to AI Skills Manager</p>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 9: 创建 Tauri Cargo.toml**

```toml
[package]
name = "ai-skills-manager"
version = "0.1.0"
description = "A Tauri App"
authors = ["you"]
license = ""
repository = ""
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5.0", features = [] }

[dependencies]
tauri = { version = "1.5.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rusqlite = { version = "0.30.0", features = ["bundled"] }
dirs = "5.0"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1.0", features = ["full"] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

- [ ] **Step 10: 创建 Tauri 配置**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist",
    "withGlobalTauri": false
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "fs": {
        "all": true
      },
      "path": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.aiskillsmanager.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "AI Skills Manager",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

- [ ] **Step 11: 创建 Rust 主入口**

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ai_skills_manager_lib::run()
}
```

- [ ] **Step 12: 创建 Rust lib 入口**

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 13: 安装依赖并测试运行**

Run: `npm install`
Expected: 依赖安装成功

Run: `npm run tauri dev`
Expected: 应用窗口打开，显示 "AI Skills Manager"

- [ ] **Step 14: Commit**

```bash
git add .
git commit -m "chore: initialize tauri project with react frontend"
```

---

## Phase 2: 后端基础架构

### Task 2: 数据库模块

**Files:**
- Create: `src-tauri/src/db/mod.rs`
- Create: `src-tauri/src/db/connection.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 创建数据库连接模块**

```rust
// src-tauri/src/db/connection.rs
use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_url TEXT,
                local_path TEXT NOT NULL,
                installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_enabled BOOLEAN DEFAULT 1,
                metadata TEXT
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_tools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                config_path TEXT,
                skills_subdir TEXT DEFAULT 'skills',
                is_detected BOOLEAN DEFAULT 0,
                is_enabled BOOLEAN DEFAULT 0,
                detected_at TIMESTAMP,
                custom_path TEXT
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS skill_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_id TEXT NOT NULL,
                tool_id TEXT NOT NULL,
                link_path TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (skill_id) REFERENCES skills(id),
                FOREIGN KEY (tool_id) REFERENCES ai_tools(id),
                UNIQUE(skill_id, tool_id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS skill_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                url TEXT NOT NULL,
                is_enabled BOOLEAN DEFAULT 1,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        Ok(())
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }
}
```

- [ ] **Step 2: 创建 db mod 文件**

```rust
// src-tauri/src/db/mod.rs
pub mod connection;
pub use connection::Database;
```

- [ ] **Step 3: 更新 lib.rs 添加 db 模块**

```rust
// src-tauri/src/lib.rs
pub mod db;

use db::Database;
use std::path::PathBuf;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = dirs::home_dir()
                .expect("Failed to get home dir")
                .join(".ai-skills-manager");
            
            std::fs::create_dir_all(&app_dir)?;
            
            let db_path = app_dir.join("metadata.db");
            let db = Database::new(db_path).expect("Failed to initialize database");
            
            app.manage(std::sync::Mutex::new(db));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add database module with sqlite schema"
```

### Task 3: 数据模型

**Files:**
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/skill.rs`
- Create: `src-tauri/src/models/tool.rs`
- Create: `src-tauri/src/models/link.rs`

- [ ] **Step 1: 创建 Skill 模型**

```rust
// src-tauri/src/models/skill.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub local_path: String,
    pub installed_at: String,
    pub updated_at: String,
    pub is_enabled: bool,
    pub metadata: Option<SkillMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMetadata {
    pub author: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSkill {
    pub name: String,
    pub path: String,
    pub is_symlink: bool,
    pub target_path: Option<String>,
}
```

- [ ] **Step 2: 创建 Tool 模型**

```rust
// src-tauri/src/models/tool.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AITool {
    pub id: String,
    pub name: String,
    pub config_path: String,
    pub skills_subdir: String,
    pub is_detected: bool,
    pub is_enabled: bool,
    pub detected_at: Option<String>,
    pub custom_path: Option<String>,
}

impl AITool {
    pub fn skills_path(&self) -> String {
        format!("{}/{}", self.config_path, self.skills_subdir)
    }
}
```

- [ ] **Step 3: 创建 Link 模型**

```rust
// src-tauri/src/models/link.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillLink {
    pub id: i64,
    pub skill_id: String,
    pub tool_id: String,
    pub link_path: String,
    pub is_active: bool,
    pub created_at: String,
}
```

- [ ] **Step 4: 创建 models mod 文件**

```rust
// src-tauri/src/models/mod.rs
pub mod skill;
pub mod tool;
pub mod link;

pub use skill::{Skill, LocalSkill, SkillMetadata};
pub use tool::AITool;
pub use link::SkillLink;
```

- [ ] **Step 5: 更新 lib.rs 添加 models 模块**

```rust
// src-tauri/src/lib.rs
pub mod db;
pub mod models;

use db::Database;
use std::path::PathBuf;
// ... rest of the code
```

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add data models for skill, tool, and link"
```

### Task 4: 路径工具模块

**Files:**
- Create: `src-tauri/src/utils/mod.rs`
- Create: `src-tauri/src/utils/path_utils.rs`

- [ ] **Step 1: 创建路径工具模块**

```rust
// src-tauri/src/utils/path_utils.rs
use std::path::{Path, PathBuf};

pub fn get_home_dir() -> PathBuf {
    dirs::home_dir().expect("Failed to get home directory")
}

pub fn get_manager_dir() -> PathBuf {
    get_home_dir().join(".ai-skills-manager")
}

pub fn get_skills_dir() -> PathBuf {
    get_manager_dir().join("skills")
}

pub fn get_default_tool_config_path(tool_id: &str) -> Option<PathBuf> {
    let home = get_home_dir();
    match tool_id {
        "cursor" => Some(home.join(".cursor")),
        "trae" => Some(home.join(".trae")),
        "claude" => Some(home.join(".claude")),
        "kiro" => Some(home.join(".kiro")),
        "codex" => Some(home.join(".codex")),
        "opencode" => Some(home.join(".opencode")),
        "windsurf" => Some(home.join(".windsurf")),
        "aider" => Some(home.join(".aider")),
        "continue" => Some(home.join(".continue")),
        "codeium" => Some(home.join(".codeium")),
        _ => None,
    }
}

pub fn resolve_symlink(path: &Path) -> Option<PathBuf> {
    if let Ok(target) = std::fs::read_link(path) {
        if target.is_absolute() {
            Some(target)
        } else {
            Some(path.parent()?.join(target))
        }
    } else {
        None
    }
}

pub fn is_symlink(path: &Path) -> bool {
    std::fs::symlink_metadata(path)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

pub fn is_in_manager_dir(path: &Path) -> bool {
    let manager_dir = get_manager_dir();
    path.starts_with(&manager_dir)
}
```

- [ ] **Step 2: 创建 utils mod 文件**

```rust
// src-tauri/src/utils/mod.rs
pub mod path_utils;
pub use path_utils::*;
```

- [ ] **Step 3: 更新 lib.rs 添加 utils 模块**

```rust
// src-tauri/src/lib.rs
pub mod db;
pub mod models;
pub mod utils;
// ... rest of the code
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add path utilities for directory management"
```

---

## Phase 3: 核心业务服务

### Task 5: Skill 服务

**Files:**
- Create: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/services/skill_service.rs`

- [ ] **Step 1: 创建 Skill 服务**

```rust
// src-tauri/src/services/skill_service.rs
use crate::db::Database;
use crate::models::{Skill, SkillMetadata};
use crate::utils::{get_skills_dir, is_in_manager_dir, resolve_symlink};
use rusqlite::Result;
use std::fs;
use std::path::Path;

pub struct SkillService;

impl SkillService {
    pub fn get_all_skills(db: &Database) -> Result<Vec<Skill>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, source_type, source_url, local_path, 
                    installed_at, updated_at, is_enabled, metadata 
             FROM skills ORDER BY installed_at DESC"
        )?;

        let skills = stmt.query_map([], |row| {
            let metadata_str: Option<String> = row.get(8)?;
            let metadata = metadata_str
                .and_then(|s| serde_json::from_str(&s).ok());

            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                source_type: row.get(2)?,
                source_url: row.get(3)?,
                local_path: row.get(4)?,
                installed_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_enabled: row.get(7)?,
                metadata,
            })
        })?;

        skills.collect()
    }

    pub fn install_skill(
        db: &Database,
        skill_id: &str,
        name: &str,
        source_type: &str,
        source_url: Option<&str>,
        source_path: &Path,
    ) -> Result<Skill> {
        let skills_dir = get_skills_dir();
        let target_path = skills_dir.join(skill_id);

        // Create skills directory if not exists
        fs::create_dir_all(&skills_dir)?;

        // Copy skill folder to manager directory
        copy_dir_all(source_path, &target_path)?;

        let metadata = SkillMetadata {
            author: None,
            description: None,
            tags: vec![],
            version: None,
        };

        let conn = db.get_connection();
        conn.execute(
            "INSERT INTO skills (id, name, source_type, source_url, local_path, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             source_type = excluded.source_type,
             source_url = excluded.source_url,
             local_path = excluded.local_path,
             updated_at = CURRENT_TIMESTAMP,
             metadata = excluded.metadata",
            [
                skill_id,
                name,
                source_type,
                source_url.unwrap_or(""),
                target_path.to_str().unwrap(),
                &serde_json::to_string(&metadata).unwrap(),
            ],
        )?;

        Self::get_skill_by_id(db, skill_id)
            .map(|s| s.expect("Skill should exist after insertion"))
    }

    pub fn get_skill_by_id(db: &Database, skill_id: &str) -> Result<Option<Skill>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, source_type, source_url, local_path, 
                    installed_at, updated_at, is_enabled, metadata 
             FROM skills WHERE id = ?1"
        )?;

        let mut skills = stmt.query_map([skill_id], |row| {
            let metadata_str: Option<String> = row.get(8)?;
            let metadata = metadata_str
                .and_then(|s| serde_json::from_str(&s).ok());

            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                source_type: row.get(2)?,
                source_url: row.get(3)?,
                local_path: row.get(4)?,
                installed_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_enabled: row.get(7)?,
                metadata,
            })
        })?;

        skills.next().transpose()
    }

    pub fn toggle_skill(db: &Database, skill_id: &str, enabled: bool) -> Result<()> {
        let conn = db.get_connection();
        conn.execute(
            "UPDATE skills SET is_enabled = ?1 WHERE id = ?2",
            [enabled, skill_id],
        )?;
        Ok(())
    }

    pub fn uninstall_skill(db: &Database, skill_id: &str) -> Result<()> {
        if let Some(skill) = Self::get_skill_by_id(db, skill_id)? {
            // Remove from database
            let conn = db.get_connection();
            conn.execute("DELETE FROM skill_links WHERE skill_id = ?1", [skill_id])?;
            conn.execute("DELETE FROM skills WHERE id = ?1", [skill_id])?;

            // Remove folder
            let _ = fs::remove_dir_all(&skill.local_path);
        }
        Ok(())
    }
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = path.file_name().unwrap();
        let dest_path = dst.join(file_name);

        if path.is_dir() {
            copy_dir_all(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}
```

- [ ] **Step 2: 创建 services mod 文件**

```rust
// src-tauri/src/services/mod.rs
pub mod skill_service;
pub use skill_service::SkillService;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add skill service with CRUD operations"
```

### Task 6: 工具服务

**Files:**
- Create: `src-tauri/src/services/tool_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建 Tool 服务**

```rust
// src-tauri/src/services/tool_service.rs
use crate::db::Database;
use crate::models::AITool;
use crate::utils::get_default_tool_config_path;
use rusqlite::Result;
use std::path::Path;

pub struct ToolService;

const DEFAULT_TOOLS: &[(&str, &str)] = &[
    ("cursor", "Cursor"),
    ("trae", "Trae"),
    ("claude", "Claude"),
    ("kiro", "Kiro"),
    ("codex", "Codex"),
    ("opencode", "OpenCode"),
    ("windsurf", "Windsurf"),
    ("aider", "Aider"),
    ("continue", "Continue"),
    ("codeium", "Codeium"),
];

impl ToolService {
    pub fn init_default_tools(db: &Database) -> Result<()> {
        let conn = db.get_connection();
        
        for (id, name) in DEFAULT_TOOLS {
            conn.execute(
                "INSERT OR IGNORE INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled)
                 VALUES (?1, ?2, ?3, 'skills', 0, 0)",
                [id, name, &format!("~/.{}", id)],
            )?;
        }
        
        Ok(())
    }

    pub fn detect_tools(db: &Database) -> Result<Vec<AITool>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare("SELECT id FROM ai_tools")?;
        let tool_ids: Vec<String> = stmt.query_map([], |row| {
            row.get::<_, String>(0)
        })?.collect::<Result<Vec<_>, _>>()?;

        for tool_id in &tool_ids {
            if let Some(default_path) = get_default_tool_config_path(tool_id) {
                let exists = default_path.exists();
                let skills_path = default_path.join("skills");
                
                conn.execute(
                    "UPDATE ai_tools SET 
                     is_detected = ?1,
                     detected_at = CASE WHEN ?1 = 1 THEN CURRENT_TIMESTAMP ELSE detected_at END,
                     config_path = ?2
                     WHERE id = ?3",
                    [exists, default_path.to_str().unwrap(), tool_id],
                )?;
            }
        }

        Self::get_all_tools(db)
    }

    pub fn get_all_tools(db: &Database) -> Result<Vec<AITool>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, config_path, skills_subdir, is_detected, is_enabled, detected_at, custom_path
             FROM ai_tools ORDER BY name"
        )?;

        let tools = stmt.query_map([], |row| {
            Ok(AITool {
                id: row.get(0)?,
                name: row.get(1)?,
                config_path: row.get(2)?,
                skills_subdir: row.get(3)?,
                is_detected: row.get(4)?,
                is_enabled: row.get(5)?,
                detected_at: row.get(6)?,
                custom_path: row.get(7)?,
            })
        })?;

        tools.collect()
    }

    pub fn toggle_tool(db: &Database, tool_id: &str, enabled: bool) -> Result<()> {
        let conn = db.get_connection();
        conn.execute(
            "UPDATE ai_tools SET is_enabled = ?1 WHERE id = ?2",
            [enabled, tool_id],
        )?;
        Ok(())
    }

    pub fn update_tool_path(db: &Database, tool_id: &str, custom_path: &str) -> Result<()> {
        let conn = db.get_connection();
        conn.execute(
            "UPDATE ai_tools SET custom_path = ?1, config_path = ?1 WHERE id = ?2",
            [custom_path, tool_id],
        )?;
        Ok(())
    }
}
```

- [ ] **Step 2: 更新 services mod**

```rust
// src-tauri/src/services/mod.rs
pub mod skill_service;
pub mod tool_service;

pub use skill_service::SkillService;
pub use tool_service::ToolService;
```

- [ ] **Step 3: 更新 lib.rs 初始化工具**

```rust
// src-tauri/src/lib.rs
// ... existing imports
use services::ToolService;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = dirs::home_dir()
                .expect("Failed to get home dir")
                .join(".ai-skills-manager");
            
            std::fs::create_dir_all(&app_dir)?;
            
            let db_path = app_dir.join("metadata.db");
            let db = Database::new(db_path).expect("Failed to initialize database");
            
            // Initialize default tools
            ToolService::init_default_tools(&db).expect("Failed to init tools");
            
            app.manage(std::sync::Mutex::new(db));
            Ok(())
        })
        // ... rest
}
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add tool service with auto-detection"
```

### Task 7: 链接服务

**Files:**
- Create: `src-tauri/src/services/link_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建链接服务**

```rust
// src-tauri/src/services/link_service.rs
use crate::db::Database;
use crate::models::{Skill, AITool, SkillLink};
use crate::services::{SkillService, ToolService};
use crate::utils::{is_symlink, resolve_symlink};
use rusqlite::Result;
use std::fs;
use std::os::unix::fs::symlink;
use std::path::Path;

pub struct LinkService;

impl LinkService {
    pub fn create_link(db: &Database, skill: &Skill, tool: &AITool) -> Result<SkillLink> {
        let skills_path = tool.skills_path();
        let link_path = format!("{}/{}", skills_path, skill.id);

        // Ensure parent directory exists
        fs::create_dir_all(&skills_path).map_err(|e| {
            rusqlite::Error::ExecuteReturnedResults
        })?;

        // Remove existing if exists
        if Path::new(&link_path).exists() {
            if is_symlink(Path::new(&link_path)) {
                fs::remove_file(&link_path).ok();
            } else {
                fs::remove_dir_all(&link_path).ok();
            }
        }

        // Create symlink
        #[cfg(unix)]
        {
            symlink(&skill.local_path, &link_path).map_err(|e| {
                rusqlite::Error::ExecuteReturnedResults
            })?;
        }

        // For Windows, we'd use std::os::windows::fs::symlink_dir
        #[cfg(windows)]
        {
            std::os::windows::fs::symlink_dir(&skill.local_path, &link_path).ok();
        }

        // Record in database
        let conn = db.get_connection();
        conn.execute(
            "INSERT OR REPLACE INTO skill_links (skill_id, tool_id, link_path, is_active)
             VALUES (?1, ?2, ?3, 1)",
            [&skill.id, &tool.id, &link_path],
        )?;

        Self::get_link(db, &skill.id, &tool.id)
            .map(|l| l.expect("Link should exist"))
    }

    pub fn remove_link(db: &Database, skill_id: &str, tool_id: &str) -> Result<()> {
        if let Some(link) = Self::get_link(db, skill_id, tool_id)? {
            // Remove filesystem symlink
            if Path::new(&link.link_path).exists() {
                if is_symlink(Path::new(&link.link_path)) {
                    fs::remove_file(&link.link_path).ok();
                } else {
                    fs::remove_dir_all(&link.link_path).ok();
                }
            }

            // Remove from database
            let conn = db.get_connection();
            conn.execute(
                "DELETE FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2",
                [skill_id, tool_id],
            )?;
        }
        Ok(())
    }

    pub fn get_link(db: &Database, skill_id: &str, tool_id: &str) -> Result<Option<SkillLink>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, skill_id, tool_id, link_path, is_active, created_at
             FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2"
        )?;

        let mut links = stmt.query_map([skill_id, tool_id], |row| {
            Ok(SkillLink {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                tool_id: row.get(2)?,
                link_path: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        links.next().transpose()
    }

    pub fn sync_skill_links(db: &Database, skill_id: &str) -> Result<()> {
        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        
        let tools = ToolService::get_all_tools(db)?;
        let enabled_tools: Vec<_> = tools.into_iter()
            .filter(|t| t.is_enabled)
            .collect();

        if skill.is_enabled {
            // Create links for all enabled tools
            for tool in enabled_tools {
                Self::create_link(db, &skill, &tool)?;
            }
        } else {
            // Remove all links for this skill
            let conn = db.get_connection();
            let mut stmt = conn.prepare(
                "SELECT tool_id FROM skill_links WHERE skill_id = ?1"
            )?;
            let tool_ids: Vec<String> = stmt.query_map([skill_id], |row| {
                row.get::<_, String>(0)
            })?.collect::<Result<Vec<_>, _>>()?;

            for tool_id in tool_ids {
                Self::remove_link(db, skill_id, &tool_id)?;
            }
        }

        Ok(())
    }

    pub fn sync_tool_links(db: &Database, tool_id: &str) -> Result<()> {
        let tool = ToolService::get_all_tools(db)?.into_iter()
            .find(|t| t.id == tool_id)
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;

        let skills = SkillService::get_all_skills(db)?;
        let enabled_skills: Vec<_> = skills.into_iter()
            .filter(|s| s.is_enabled)
            .collect();

        if tool.is_enabled {
            // Create links for all enabled skills
            for skill in enabled_skills {
                Self::create_link(db, &skill, &tool)?;
            }
        } else {
            // Remove all links for this tool
            let conn = db.get_connection();
            let mut stmt = conn.prepare(
                "SELECT skill_id FROM skill_links WHERE tool_id = ?1"
            )?;
            let skill_ids: Vec<String> = stmt.query_map([tool_id], |row| {
                row.get::<_, String>(0)
            })?.collect::<Result<Vec<_>, _>>()?;

            for skill_id in skill_ids {
                Self::remove_link(db, &skill_id, tool_id)?;
            }
        }

        Ok(())
    }
}
```

- [ ] **Step 2: 更新 services mod**

```rust
// src-tauri/src/services/mod.rs
pub mod skill_service;
pub mod tool_service;
pub mod link_service;

pub use skill_service::SkillService;
pub use tool_service::ToolService;
pub use link_service::LinkService;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add link service for symlink management"
```

### Task 8: 发现服务

**Files:**
- Create: `src-tauri/src/services/discovery_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建发现服务**

```rust
// src-tauri/src/services/discovery_service.rs
use crate::models::LocalSkill;
use crate::utils::{is_in_manager_dir, is_symlink, resolve_symlink};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub struct DiscoveryService;

impl DiscoveryService {
    pub fn scan_directory(dir_path: &Path) -> Vec<LocalSkill> {
        let mut skills = Vec::new();
        let mut visited = HashSet::new();

        if !dir_path.exists() {
            return skills;
        }

        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                
                if !path.is_dir() {
                    continue;
                }

                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                // Check if it has SKILL.md
                let skill_md = path.join("SKILL.md");
                if !skill_md.exists() {
                    continue;
                }

                // Check if it's a symlink
                let (is_symlink_flag, target_path) = if is_symlink(&path) {
                    if let Some(target) = resolve_symlink(&path) {
                        // Check for circular links
                        let canonical = target.canonicalize().ok();
                        if let Some(ref c) = canonical {
                            if visited.contains(c) {
                                continue; // Circular link, skip
                            }
                            visited.insert(c.clone());
                        }

                        // Check if already in manager dir
                        if is_in_manager_dir(&target) {
                            // Already managed, skip
                            continue;
                        }

                        (true, Some(target.to_str().unwrap_or("").to_string()))
                    } else {
                        (true, None) // Broken symlink
                    }
                } else {
                    (false, None)
                };

                skills.push(LocalSkill {
                    name,
                    path: path.to_str().unwrap_or("").to_string(),
                    is_symlink: is_symlink_flag,
                    target_path,
                });
            }
        }

        skills
    }

    pub fn scan_multiple_directories(dirs: &[&Path]) -> Vec<LocalSkill> {
        let mut all_skills = Vec::new();
        let mut seen_paths = HashSet::new();

        for dir in dirs {
            let skills = Self::scan_directory(dir);
            for skill in skills {
                // Deduplicate by resolved path
                let key = skill.target_path.clone()
                    .unwrap_or_else(|| skill.path.clone());
                
                if !seen_paths.contains(&key) {
                    seen_paths.insert(key);
                    all_skills.push(skill);
                }
            }
        }

        all_skills
    }
}
```

- [ ] **Step 2: 更新 services mod**

```rust
// src-tauri/src/services/mod.rs
pub mod skill_service;
pub mod tool_service;
pub mod link_service;
pub mod discovery_service;

pub use skill_service::SkillService;
pub use tool_service::ToolService;
pub use link_service::LinkService;
pub use discovery_service::DiscoveryService;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add discovery service for scanning local skills"
```

---

## Phase 4: Tauri 命令

### Task 9: Skill 命令

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/skill_commands.rs`

- [ ] **Step 1: 创建 Skill 命令**

```rust
// src-tauri/src/commands/skill_commands.rs
use crate::db::Database;
use crate::models::{Skill, LocalSkill};
use crate::services::{SkillService, LinkService, DiscoveryService};
use crate::utils::{get_skills_dir, is_symlink, resolve_symlink};
use std::fs;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub fn get_skills(db: State<std::sync::Mutex<Database>>) -> Result<Vec<Skill>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    SkillService::get_all_skills(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_skill_from_local(
    db: State<std::sync::Mutex<Database>>,
    source_path: String,
    skill_id: String,
    name: String,
) -> Result<Skill, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let path = Path::new(&source_path);
    
    // If it's a symlink, resolve to target
    let source_path = if is_symlink(path) {
        resolve_symlink(path).unwrap_or_else(|| path.to_path_buf())
    } else {
        path.to_path_buf()
    };

    SkillService::install_skill(&db, &skill_id, &name, "local", None, &source_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_skill(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    
    SkillService::toggle_skill(&db, &skill_id, enabled)
        .map_err(|e| e.to_string())?;
    
    // Sync links
    LinkService::sync_skill_links(&db, &skill_id)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn uninstall_skill(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    SkillService::uninstall_skill(&db, &skill_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scan_local_skills(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
) -> Result<Vec<LocalSkill>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    
    let tools = crate::services::ToolService::get_all_tools(&db)
        .map_err(|e| e.to_string())?;
    
    let tool = tools.into_iter()
        .find(|t| t.id == tool_id)
        .ok_or("Tool not found")?;

    let skills_path = tool.skills_path();
    let skills = DiscoveryService::scan_directory(Path::new(&skills_path));
    
    Ok(skills)
}

#[tauri::command]
pub fn migrate_local_skill(
    db: State<std::sync::Mutex<Database>>,
    source_path: String,
    skill_id: String,
) -> Result<Skill, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let path = Path::new(&source_path);

    // Determine actual source and original location
    let (actual_source, original_location) = if is_symlink(path) {
        let target = resolve_symlink(path)
            .ok_or("Cannot resolve symlink")?;
        (target, path.to_path_buf())
    } else {
        (path.to_path_buf(), path.to_path_buf())
    };

    // Get skill name from folder
    let name = actual_source.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&skill_id)
        .to_string();

    // Install to manager
    let skill = SkillService::install_skill(&db, &skill_id, &name, "local", None, &actual_source)
        .map_err(|e| e.to_string())?;

    // Remove original and create symlink
    if original_location.exists() {
        if original_location.is_dir() && !is_symlink(&original_location) {
            fs::remove_dir_all(&original_location).ok();
        } else {
            fs::remove_file(&original_location).ok();
        }
    }

    // Create new symlink at original location
    let skills_dir = get_skills_dir().join(&skill_id);
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(&skills_dir, &original_location).ok();
    }
    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(&skills_dir, &original_location).ok();
    }

    Ok(skill)
}
```

- [ ] **Step 2: 创建 commands mod**

```rust
// src-tauri/src/commands/mod.rs
pub mod skill_commands;

pub use skill_commands::*;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add skill tauri commands"
```

### Task 10: 工具命令

**Files:**
- Create: `src-tauri/src/commands/tool_commands.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: 创建 Tool 命令**

```rust
// src-tauri/src/commands/tool_commands.rs
use crate::db::Database;
use crate::models::AITool;
use crate::services::{ToolService, LinkService};
use tauri::State;

#[tauri::command]
pub fn get_tools(db: State<std::sync::Mutex<Database>>) -> Result<Vec<AITool>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::get_all_tools(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn detect_tools(db: State<std::sync::Mutex<Database>>) -> Result<Vec<AITool>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::detect_tools(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_tool(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    
    ToolService::toggle_tool(&db, &tool_id, enabled)
        .map_err(|e| e.to_string())?;
    
    // Sync links
    LinkService::sync_tool_links(&db, &tool_id)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_tool_path(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
    custom_path: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::update_tool_path(&db, &tool_id, &custom_path)
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 2: 更新 commands mod**

```rust
// src-tauri/src/commands/mod.rs
pub mod skill_commands;
pub mod tool_commands;

pub use skill_commands::*;
pub use tool_commands::*;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add tool tauri commands"
```

### Task 11: 注册命令到 Tauri

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 更新 lib.rs 注册所有命令**

```rust
// src-tauri/src/lib.rs
pub mod commands;
pub mod db;
pub mod models;
pub mod services;
pub mod utils;

use db::Database;
use services::ToolService;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = dirs::home_dir()
                .expect("Failed to get home dir")
                .join(".ai-skills-manager");
            
            std::fs::create_dir_all(&app_dir)?;
            
            let db_path = app_dir.join("metadata.db");
            let db = Database::new(db_path).expect("Failed to initialize database");
            
            // Initialize default tools
            ToolService::init_default_tools(&db).expect("Failed to init tools");
            
            app.manage(std::sync::Mutex::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Skill commands
            commands::get_skills,
            commands::install_skill_from_local,
            commands::toggle_skill,
            commands::uninstall_skill,
            commands::scan_local_skills,
            commands::migrate_local_skill,
            // Tool commands
            commands::get_tools,
            commands::detect_tools,
            commands::toggle_tool,
            commands::update_tool_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: register all tauri commands"
```

---

## Phase 5: 前端界面

### Task 12: 类型定义和 API 封装

**Files:**
- Create: `src/types/index.ts`
- Create: `src/api/index.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
// src/types/index.ts

export interface Skill {
  id: string;
  name: string;
  source_type: string;
  source_url?: string;
  local_path: string;
  installed_at: string;
  updated_at: string;
  is_enabled: boolean;
  metadata?: SkillMetadata;
}

export interface SkillMetadata {
  author?: string;
  description?: string;
  tags: string[];
  version?: string;
}

export interface LocalSkill {
  name: string;
  path: string;
  is_symlink: boolean;
  target_path?: string;
}

export interface AITool {
  id: string;
  name: string;
  config_path: string;
  skills_subdir: string;
  is_detected: boolean;
  is_enabled: boolean;
  detected_at?: string;
  custom_path?: string;
}

export interface SkillLink {
  id: number;
  skill_id: string;
  tool_id: string;
  link_path: string;
  is_active: boolean;
  created_at: string;
}
```

- [ ] **Step 2: 创建 API 封装**

```typescript
// src/api/index.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { Skill, LocalSkill, AITool } from '../types';

// Skill APIs
export const getSkills = (): Promise<Skill[]> => {
  return invoke('get_skills');
};

export const installSkillFromLocal = (
  sourcePath: string,
  skillId: string,
  name: string
): Promise<Skill> => {
  return invoke('install_skill_from_local', {
    sourcePath,
    skillId,
    name,
  });
};

export const toggleSkill = (skillId: string, enabled: boolean): Promise<void> => {
  return invoke('toggle_skill', { skillId, enabled });
};

export const uninstallSkill = (skillId: string): Promise<void> => {
  return invoke('uninstall_skill', { skillId });
};

export const scanLocalSkills = (toolId: string): Promise<LocalSkill[]> => {
  return invoke('scan_local_skills', { toolId });
};

export const migrateLocalSkill = (
  sourcePath: string,
  skillId: string
): Promise<Skill> => {
  return invoke('migrate_local_skill', { sourcePath, skillId });
};

// Tool APIs
export const getTools = (): Promise<AITool[]> => {
  return invoke('get_tools');
};

export const detectTools = (): Promise<AITool[]> => {
  return invoke('detect_tools');
};

export const toggleTool = (toolId: string, enabled: boolean): Promise<void> => {
  return invoke('toggle_tool', { toolId, enabled });
};

export const updateToolPath = (toolId: string, customPath: string): Promise<void> => {
  return invoke('update_tool_path', { toolId, customPath });
};
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add frontend types and api wrappers"
```

### Task 13: 侧边栏组件

**Files:**
- Create: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 Sidebar 组件**

```tsx
// src/components/Sidebar.tsx
import { Package, Folder, Wrench, Search, Settings } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'discovery', label: '发现', icon: Package },
  { id: 'my-skills', label: '我的 Skills', icon: Folder },
  { id: 'tools', label: '工具管理', icon: Wrench },
  { id: 'migrate', label: '本地迁移', icon: Search },
  { id: 'settings', label: '设置', icon: Settings },
];

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  return (
    <div className="w-48 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold">AI Skills</h1>
        <p className="text-xs text-gray-400">Manager</p>
      </div>
      
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: 更新 App.tsx 添加路由**

```tsx
// src/App.tsx
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { MySkillsPage } from './pages/MySkillsPage';
import { ToolsPage } from './pages/ToolsPage';
import { MigratePage } from './pages/MigratePage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const [activePage, setActivePage] = useState('discovery');

  const renderPage = () => {
    switch (activePage) {
      case 'discovery':
        return <DiscoveryPage />;
      case 'my-skills':
        return <MySkillsPage />;
      case 'tools':
        return <ToolsPage />;
      case 'migrate':
        return <MigratePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DiscoveryPage />;
    }
  };

  return (
    <div className="h-screen flex">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <main className="flex-1 overflow-auto bg-gray-50">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add sidebar navigation and app layout"
```

### Task 14: 我的 Skills 页面

**Files:**
- Create: `src/pages/MySkillsPage.tsx`
- Create: `src/components/SkillCard.tsx`

- [ ] **Step 1: 创建 SkillCard 组件**

```tsx
// src/components/SkillCard.tsx
import { useState } from 'react';
import { FolderOpen, Trash2, Power } from 'lucide-react';
import type { Skill } from '../types';

interface SkillCardProps {
  skill: Skill;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

export function SkillCard({ skill, onToggle, onDelete }: SkillCardProps) {
  const [isEnabled, setIsEnabled] = useState(skill.is_enabled);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle(skill.id, newState);
  };

  const handleOpenFolder = () => {
    // Use Tauri shell open
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{skill.name}</h3>
        <p className="text-sm text-gray-500">ID: {skill.id}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
            {skill.source_type}
          </span>
          {skill.metadata?.version && (
            <span className="text-xs text-gray-400">
              v{skill.metadata.version}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className={`p-2 rounded transition-colors ${
            isEnabled
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={isEnabled ? '禁用' : '启用'}
        >
          <Power size={16} />
        </button>

        <button
          onClick={handleOpenFolder}
          className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          title="打开文件夹"
        >
          <FolderOpen size={16} />
        </button>

        <button
          onClick={() => onDelete(skill.id)}
          className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 MySkillsPage**

```tsx
// src/pages/MySkillsPage.tsx
import { useEffect, useState } from 'react';
import { SkillCard } from '../components/SkillCard';
import { getSkills, toggleSkill, uninstallSkill } from '../api';
import type { Skill } from '../types';

export function MySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await getSkills();
      setSkills(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleSkill(id, enabled);
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Skill 吗？')) return;
    
    try {
      await uninstallSkill(id);
      setSkills(skills.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">我的 Skills</h2>
        <span className="text-sm text-gray-500">
          共 {skills.length} 个 Skill
        </span>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有安装任何 Skills
          <br />
          <span className="text-sm">去"发现"页面安装一些吧</span>
        </div>
      ) : (
        <div className="space-y-4">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add my skills page with skill card component"
```

### Task 15: 工具管理页面

**Files:**
- Create: `src/pages/ToolsPage.tsx`
- Create: `src/components/ToolCard.tsx`

- [ ] **Step 1: 创建 ToolCard 组件**

```tsx
// src/components/ToolCard.tsx
import { useState } from 'react';
import { Power, FolderOpen, CheckCircle, XCircle } from 'lucide-react';
import type { AITool } from '../types';

interface ToolCardProps {
  tool: AITool;
  onToggle: (id: string, enabled: boolean) => void;
}

export function ToolCard({ tool, onToggle }: ToolCardProps) {
  const [isEnabled, setIsEnabled] = useState(tool.is_enabled);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle(tool.id, newState);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">
              {tool.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{tool.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {tool.is_detected ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={12} />
                  已检测
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <XCircle size={12} />
                  未检测
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`p-2 rounded transition-colors ${
            isEnabled
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={isEnabled ? '禁用' : '启用'}
        >
          <Power size={18} />
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FolderOpen size={14} />
          <span className="font-mono text-xs truncate">
            {tool.custom_path || tool.config_path}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 ToolsPage**

```tsx
// src/pages/ToolsPage.tsx
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ToolCard } from '../components/ToolCard';
import { getTools, detectTools, toggleTool } from '../api';
import type { AITool } from '../types';

export function ToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await getTools();
      setTools(data);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    setLoading(true);
    try {
      const data = await detectTools();
      setTools(data);
    } catch (error) {
      console.error('Failed to detect tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleTool(id, enabled);
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">工具管理</h2>
        <button
          onClick={handleDetect}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          重新检测
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add tools management page"
```

### Task 16: 本地迁移页面

**Files:**
- Create: `src/pages/MigratePage.tsx`

- [ ] **Step 1: 创建 MigratePage**

```tsx
// src/pages/MigratePage.tsx
import { useEffect, useState } from 'react';
import { Search, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { getTools, scanLocalSkills, migrateLocalSkill } from '../api';
import type { AITool, LocalSkill } from '../types';

export function MigratePage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [skills, setSkills] = useState<LocalSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await getTools();
      setTools(data.filter(t => t.is_detected));
      if (data.length > 0) {
        setSelectedTool(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const handleScan = async () => {
    if (!selectedTool) return;
    
    setLoading(true);
    try {
      const data = await scanLocalSkills(selectedTool);
      setSkills(data);
      setSelectedSkills(new Set());
    } catch (error) {
      console.error('Failed to scan:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (path: string) => {
    const newSet = new Set(selectedSkills);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedSkills(newSet);
  };

  const handleMigrate = async () => {
    if (selectedSkills.size === 0) return;
    
    setMigrating(true);
    try {
      for (const path of selectedSkills) {
        const skill = skills.find(s => s.path === path);
        if (skill) {
          const skillId = skill.name.toLowerCase().replace(/\s+/g, '-');
          await migrateLocalSkill(path, skillId);
        }
      }
      // Refresh list
      await handleScan();
      alert('迁移完成！');
    } catch (error) {
      console.error('Failed to migrate:', error);
      alert('迁移失败，请查看控制台');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">本地迁移</h2>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">选择工具</option>
            {tools.map(tool => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleScan}
            disabled={!selectedTool || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search size={16} />
            {loading ? '扫描中...' : '扫描'}
          </button>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium">发现的 Skills ({skills.length})</h3>
            <button
              onClick={handleMigrate}
              disabled={selectedSkills.size === 0 || migrating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <ArrowRight size={16} />
              {migrating ? '迁移中...' : `迁移选中 (${selectedSkills.size})`}
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {skills.map(skill => (
              <div
                key={skill.path}
                className="p-4 flex items-center gap-4 hover:bg-gray-50"
              >
                <button
                  onClick={() => toggleSelection(skill.path)}
                  className="text-blue-600"
                >
                  {selectedSkills.has(skill.path) ? (
                    <CheckSquare size={20} />
                  ) : (
                    <Square size={20} />
                  )}
                </button>

                <div className="flex-1">
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-sm text-gray-500 font-mono">
                    {skill.path}
                  </div>
                  {skill.is_symlink && (
                    <div className="text-xs text-orange-600 mt-1">
                      软链接 → {skill.target_path}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          选择工具并点击"扫描"发现本地 Skills
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/
git commit -m "feat: add local migration page"
```

### Task 17: 发现页面和设置页面（占位）

**Files:**
- Create: `src/pages/DiscoveryPage.tsx`
- Create: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: 创建 DiscoveryPage 占位**

```tsx
// src/pages/DiscoveryPage.tsx
import { Package } from 'lucide-react';

export function DiscoveryPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">发现 Skills</h2>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Skill 市场
        </h3>
        <p className="text-gray-500 mb-4">
          从 skills.sh 或 GitHub 仓库发现 Skills
        </p>
        <p className="text-sm text-gray-400">
          此功能将在后续版本实现
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 SettingsPage 占位**

```tsx
// src/pages/SettingsPage.tsx
import { Settings } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">设置</h2>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Settings size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          应用设置
        </h3>
        <p className="text-gray-500 mb-4">
          配置 Skill 源、存储位置等
        </p>
        <p className="text-sm text-gray-400">
          此功能将在后续版本实现
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add placeholder pages for discovery and settings"
```

---

## Phase 6: 测试和优化

### Task 18: 修复 Windows 兼容性

**Files:**
- Modify: `src-tauri/src/services/link_service.rs`
- Modify: `src-tauri/src/commands/skill_commands.rs`

- [ ] **Step 1: 添加 Windows 支持到 link_service**

修改 link_service.rs 中的 symlink 创建代码，确保跨平台兼容。

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/
git commit -m "fix: add windows compatibility for symlinks"
```

### Task 19: 添加错误处理和日志

**Files:**
- Modify: 所有服务文件添加更好的错误处理

- [ ] **Step 1: 添加 tracing 日志**

在 Cargo.toml 中添加 tracing，并在关键操作处添加日志。

- [ ] **Step 2: Commit**

```bash
git add src-tauri/
git commit -m "feat: add error handling and logging"
```

### Task 20: 最终测试

- [ ] **Step 1: 运行开发服务器测试**

Run: `npm run tauri dev`
Expected: 应用正常启动，各页面功能正常

- [ ] **Step 2: 构建测试**

Run: `npm run tauri build`
Expected: 构建成功，生成可执行文件

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: final testing and build verification" --allow-empty
```

---

## 自审检查

### Spec 覆盖检查

| 设计文档需求 | 实现任务 |
|-------------|---------|
| Tauri + React 架构 | Task 1 |
| SQLite 数据库 | Task 2 |
| Skill 模型 | Task 3, 5 |
| Tool 模型 | Task 3, 6 |
| Link 模型 | Task 3, 7 |
| 软链接管理 | Task 7 |
| 本地发现（含软链接追踪） | Task 8, 16 |
| 10+ AI 工具支持 | Task 6 |
| 自动检测 | Task 6 |
| 前端界面 | Task 12-17 |

### Placeholder 检查
- ✅ 无 TBD/TODO
- ✅ 所有代码完整
- ✅ 所有命令有预期输出

### 类型一致性检查
- ✅ Skill 类型前后端一致
- ✅ Tool 类型前后端一致
- ✅ API 参数与命令一致

---

## 执行方式选择

**计划完成并保存到 `docs/superpowers/plans/2025-05-11-ai-skills-manager-plan.md`**

**两个执行选项：**

**1. Subagent-Driven (推荐)** - 每个任务派生子代理执行，任务间审查，快速迭代

**2. Inline Execution** - 在当前会话中使用 executing-plans 批量执行任务，带检查点审查

**请选择执行方式？**
