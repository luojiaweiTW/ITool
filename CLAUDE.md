# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IWork (爱工作) is an Electron-based desktop application featuring 50+ developer tools. It's a toolbox for developers with utilities ranging from JSON formatting, SSH connections, to screenshot capture.

**Tech Stack:** Electron 38 + Vue 3.5 + TypeScript + Element Plus + UnoCSS + Pinia + Vite (rolldown-vite)

## Environment Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## Common Commands

```bash
# Development (starts Vite + Electron concurrently)
npm run dev:electron

# Kill port 5173 if blocked
npm run kill-port

# Build Vite only (no Electron packaging)
npm run build

# Type check before build
npm run build:check

# Build Electron app (unpacked directory only)
npm run build:dir

# Build Electron app (full installer + portable)
npm run build:electron

# Run E2E tests
npm run test:e2e
npm run test:e2e:ui     # With Playwright UI
npm run test:e2e:debug  # Debug mode
npm run test:e2e:report # View test report
```

### Debugging

- **Main process logs:** View in terminal where `npm run dev:electron` runs
- **Renderer DevTools:** Press `Ctrl+Shift+I` in the app window
- **Port conflicts:** Run `npm run kill-port` to free port 5173

## Architecture

### Electron Process Structure

- **Main Process:** `electron-main.cjs` - Handles native functionality (SSH via ssh2, MySQL, Redis, screenshots, clipboard monitoring, SFTP, system monitoring)
- **Preload Script:** `electron-preload.cjs` - Exposes IPC APIs to renderer via `contextBridge`
- **Renderer:** Vue 3 SPA in `src/`

### Key Directories

```
src/
├── pages/
│   ├── Home/          # Home page with tool cards
│   └── tools/         # 50+ tool subdirectories, each with Index.vue
├── components/        # Shared Vue components (NeonCard, Sidebar, Header)
├── layouts/           # MainLayout.vue (sidebar + router-view)
├── router/index.ts    # All routes with meta (title, icon, category)
├── styles/            # Global styles, tokens.css (design system)
└── auto-imports.d.ts  # Auto-generated type definitions

appData/               # Runtime data directory (screenshots, configs, knowledge docs)
```

### Adding a New Tool

1. Create `src/pages/tools/YourTool/Index.vue`
2. Import component in `src/router/index.ts`
3. Add route with proper meta:
   ```typescript
   {
     path: 'tools/your-tool',
     name: 'YourTool',
     component: YourTool,
     meta: {
       title: 'Tool Name',
       description: 'Brief description',
       icon: 'i-mdi-icon-name',  // UnoCSS icon
       category: '分类名称',      // e.g., '文本处理', '编码加密'
     }
   }
   ```
4. Tool will auto-appear in sidebar and home page based on route meta

### IPC Communication Pattern

Main process handlers are registered in `electron-main.cjs` using `ipcMain.handle()`. Key prefixes:
- `ssh:*` - SSH connections and commands
- `mysql:*` - MySQL database operations
- `redis:*` - Redis operations
- `screenshots:*` - Screenshot capture
- `sftp:*` - File transfer
- `network:*` - Ping, traceroute
- `system:*` - System monitoring

**Preload API exposure pattern:**
```javascript
// electron-preload.cjs
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filename) => ipcRenderer.invoke('file:read', filename),
  writeFile: (filename, content) => ipcRenderer.invoke('file:write', filename, content)
})

// Vue component usage
if (window.electronAPI) {
  const result = await window.electronAPI.readFile('config.json')
}
```

### Data Persistence Strategy

**CRITICAL:** All data must be persisted using Electron file system, NOT localStorage.

**Storage location:**
- Development: `project-root/appData/`
- Production: `installation-directory/appData/`

**File naming convention:**
- Config: `tool-name-config.json`
- History: `tool-name-history.json`
- Data: `tool-name-data.json`

**Example implementation:**
```typescript
// Save data
async function saveData() {
  if (window.electronAPI) {
    const data = { config: myConfig.value, history: myHistory.value }
    await window.electronAPI.writeFile('tool-config.json', JSON.stringify(data, null, 2))
  }
}

// Load data
async function loadData() {
  if (window.electronAPI) {
    const exists = await window.electronAPI.fileExists('tool-config.json')
    if (exists.exists) {
      const result = await window.electronAPI.readFile('tool-config.json')
      if (result.success) {
        const data = JSON.parse(result.data)
        myConfig.value = data.config || {}
      }
    }
  }
}

onMounted(() => loadData())
watch([myConfig, myHistory], () => saveData(), { deep: true })
```

### Styling Conventions

**Neon Theme (Pop Art × Vaporwave/Synthwave):**
- Design tokens in `src/styles/tokens.css` (neon colors: `--neon-cyan`, `--neon-purple`, `--neon-pink`)
- Background color: `#0a0e27` (neon dark theme)
- UnoCSS utility classes for rapid styling
- Element Plus components with custom dark theme overrides in `src/styles/element-override.css`

**Custom Neon Components:**
- NeonButton, NeonInput, NeonTextarea, NeonCard
- Consistent glow effects and gradients
- All new tools should use these components for visual consistency

**Scrollbar styling (霓虹风格):**
```css
.container::-webkit-scrollbar {
  width: 8px;
}
.container::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
}
.container::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.8);
}
```

## Important Patterns

- **Route Preloading:** All tool components are imported at router level (not lazy-loaded) for instant navigation
- **Auto-imports:** Vue/Pinia/Vue Router APIs and Element Plus components are auto-imported (configured in vite.config.ts)
- **SSH Output Throttling:** `electron-main.cjs` implements output buffering to prevent UI freeze from large outputs
- **Screenshot Tool:** Uses `electron-screenshots` library with pin window feature for persistent floating screenshots
- **Route State Persistence:** Last visited route saved to sessionStorage in router beforeEach guard

## Development Workflow

### Testing New Features

**CRITICAL:** Every new feature MUST have an automated test script before delivery.

1. Create test script: `test-[feature-name].mjs`
2. Use Playwright for browser automation:
   ```javascript
   import { chromium } from '@playwright/test'

   const browser = await chromium.launch({ headless: false, slowMo: 500 })
   const page = await browser.newPage()
   await page.goto('http://localhost:5173/#/tools/your-tool')

   // Test functionality
   // Check UI details (scrollbar, contrast, layout)
   // Keep browser open for manual inspection
   await page.waitForTimeout(10000)
   ```
3. Run test: `node test-[feature-name].mjs`
4. Fix any issues discovered
5. Re-test until all checks pass

**UI Testing Checklist:**
- [ ] Page loads without errors
- [ ] All inputs/buttons work correctly
- [ ] Scrollbars are visible (8px, neon cyan)
- [ ] Color contrast is sufficient (WCAG AA: 4.5:1 for text)
- [ ] Text displays horizontally (not stacked vertically)
- [ ] Auto-scroll works for message lists
- [ ] Data persistence works after page reload
- [ ] Error handling shows user-friendly messages

### Common Issues and Fixes

**Issue: Text appears vertically stacked**
- Cause: Container width too narrow (< 100px for 5+ characters)
- Fix: Set `max-width: 50%` on title containers, prevent flex-shrink

**Issue: Scrollbar not visible**
- Cause: Missing scrollbar styles or width: 0
- Fix: Add neon scrollbar styles (see Styling Conventions)

**Issue: Icons not visible on colored buttons**
- Cause: Low color contrast (e.g., red icon on red button)
- Fix: Force white color: `.el-button--danger i { color: #ffffff !important; }`

**Issue: Data lost after refresh**
- Cause: Using localStorage instead of Electron file system
- Fix: Implement file-based persistence (see Data Persistence Strategy)

## Build Notes

- Uses `rolldown-vite` (experimental Vite with Rolldown bundler) for faster builds
- Manual chunk splitting configured for vue-vendor, element-plus, xterm, icons, utils
- Windows build outputs to `release-new/` directory
- Build targets: NSIS installer (x64) and Portable (x64)
- Icon handling: `fix-icon.cjs` script runs after build to ensure proper icon display

### Build Process

```bash
# Full build process
npm run build              # Build Vite
electron-builder --dir     # Create unpacked app
node fix-icon.cjs          # Fix icon issues
electron-builder           # Create installer + portable
```

## Tool Categories

Tools are organized into categories (defined in route meta):
- 文本处理 (Text Processing): JSON, XML/YAML, SQL, Diff, Regex, Doc to Markdown
- 编码加密 (Encoding/Encryption): Base64, URL, Hash, Encrypt, Unicode, File Hash
- 认证安全 (Authentication): JWT
- 时间调度 (Time/Scheduling): Timestamp, Cron, Time Calculator
- 开发工具 (Dev Tools): UUID, Random Generator, Number Base, QRCode, Unit Converter, Color Converter
- 图片工具 (Image Tools): Compressor, Converter, Cropper, Base64 Image
- 学习工具 (Learning): English Reader, Word Book
- Java 工具 (Java Tools): JSON to Java, Exception Parser, Maven Search
- 网络工具 (Network Tools): HTTP Client, IP Query, SSH, MySQL, Redis, Port Scanner, IP Scanner, WebSocket
- 实用工具 (Utilities): Clipboard History, Screenshot, System Monitor, Weather, Calculator
- 知识管理 (Knowledge Management): Knowledge Base, Snippets, Bookmarks, Todo List
- 热榜聚合 (Hot Topics): Entertainment/Trending aggregator

## 开发注意事项（踩坑总结）

### 1. Electron IPC 数据传递

**Vue Proxy 对象不能直接传递给 IPC**：Vue 3 的响应式数据是 Proxy 对象，通过 IPC 传递时会导致调用卡住无响应。

```javascript
// ❌ 错误
await electronAPI.someMethod(reactiveArray.value)

// ✅ 正确 - 用展开运算符转成普通数组
await electronAPI.someMethod([...reactiveArray.value])
```

### 2. 新增 IPC 功能的完整流程

1. `electron-main.cjs` - 添加 `ipcMain.handle()`
2. `electron-preload.cjs` - 暴露 API 到 `window.electronAPI`
3. `src/types/electron.d.ts` - 添加类型定义
4. Vue 组件中调用

### 3. 添加新工具的完整流程

1. 创建 `src/pages/tools/YourTool/Index.vue`
2. `src/router/index.ts` - 添加 import 和路由配置
3. **`src/components/Sidebar.vue` - 手动添加菜单项**（菜单是硬编码的，不会自动从路由生成）

### 4. NeonCard 内容被截断

NeonCard 组件默认有 `overflow: hidden`，如果内容被截断，在页面样式中覆盖：

```css
.your-container :deep(.neon-card) {
  overflow: visible;
}
.your-container :deep(.neon-card__body) {
  overflow: visible;
}
```

### 5. 页面滚动

页面容器使用 `overflow: auto` 而不是 `overflow: hidden`，并添加霓虹风格滚动条样式。
