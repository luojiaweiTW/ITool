# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IWork (爱工作) is an Electron-based desktop application featuring 50+ developer tools. It's a toolbox for developers with utilities ranging from JSON formatting, SSH connections, to screenshot capture.

**Tech Stack:** Electron 38 + Vue 3.5 + TypeScript + Element Plus + UnoCSS + Pinia + Vite (rolldown-vite)

## Common Commands

```bash
# Development (starts Vite + Electron concurrently)
npm run dev:electron

# Build for production (Windows)
npm run build:win

# Build Vite only (no Electron packaging)
npm run build

# Run E2E tests
npm run test:e2e
npm run test:e2e:ui    # With Playwright UI
```

## Architecture

### Electron Process Structure

- **Main Process:** `electron-main.cjs` - Handles native functionality (SSH via ssh2, MySQL, Redis, screenshots, clipboard monitoring, SFTP, system monitoring)
- **Preload Script:** `electron-preload.cjs` - Exposes IPC APIs to renderer via `contextBridge`
- **Renderer:** Vue 3 SPA in `src/`

### Key Directories

```
src/
├── pages/tools/       # Each tool is a subdirectory with Index.vue (50+ tools)
├── components/        # Shared Vue components (NeonCard, Sidebar, Header)
├── stores/            # Pinia stores
├── router/index.ts    # All routes with meta (title, icon, category)
├── styles/            # Global styles, tokens.css (design system)
└── layouts/           # MainLayout.vue

appData/               # Runtime data directory (screenshots, configs, knowledge docs)
```

### Adding a New Tool

1. Create `src/pages/tools/YourTool/Index.vue`
2. Add route in `src/router/index.ts` with proper meta (title, icon, category)
3. Tool will auto-appear in sidebar and home page

### IPC Communication Pattern

Main process handlers are registered in `electron-main.cjs` using `ipcMain.handle()`. Key prefixes:
- `ssh:*` - SSH connections and commands
- `mysql:*` - MySQL database operations
- `redis:*` - Redis operations
- `screenshots:*` - Screenshot capture
- `sftp:*` - File transfer
- `network:*` - Ping, traceroute
- `system:*` - System monitoring

### Styling Conventions

- Uses UnoCSS for utility classes
- Design tokens in `src/styles/tokens.css` (neon theme colors like `--neon-cyan`, `--neon-purple`)
- Element Plus components with custom dark theme overrides in `src/styles/element-override.css`
- Background color: `#0a0e27` (neon dark theme)

## Important Patterns

- **Data Storage:** All user data goes to `appData/` directory (relative to exe in production, project root in dev)
- **Auto-imports:** Vue/Pinia/Vue Router APIs and Element Plus components are auto-imported (configured in vite.config.ts)
- **SSH Output Throttling:** `electron-main.cjs` implements output buffering to prevent UI freeze from large outputs
- **Screenshot Tool:** Uses `electron-screenshots` library with pin window feature for persistent floating screenshots

## Build Notes

- Uses `rolldown-vite` (experimental Vite with Rolldown bundler) for faster builds
- Manual chunk splitting configured for vue-vendor, element-plus, xterm, icons
- Windows build outputs to `release-new/` directory
