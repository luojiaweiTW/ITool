# Tech Stack

## 前端框架
- Vue 3.5 (Composition API)
- TypeScript 5.9
- Vue Router 4.5
- Pinia 3.0 (状态管理)

## UI 组件
- Element Plus 2.11
- UnoCSS 66.5 (原子化 CSS)
- @iconify/json (图标库)

## 桌面应用
- Electron 38
- electron-builder 26 (打包)
- electron-screenshots 0.5 (截图功能)

## 终端和网络
- @xterm/xterm 5.5 (终端模拟器)
- ssh2 1.17 (SSH/SFTP 连接)
- axios 1.12 (HTTP 客户端)

## 数据处理
- crypto-js 4.2 (加密)
- marked 16.4 (Markdown 解析)
- highlight.js 11.11 (代码高亮)
- sql-formatter 15.6 (SQL 格式化)
- js-yaml 4.1 (YAML 解析)

## 数据库客户端
- mysql2 3.15 (MySQL 连接)
- ioredis 5.8 (Redis 连接)

## 构建工具
- Vite (rolldown-vite 7.1)
- vue-tsc 3.1 (类型检查)

## 测试
- Playwright 1.56 (E2E 测试)
- fast-check (属性测试，如需要)

## 构建命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev:electron

# 仅前端开发
npm run dev

# 构建前端
npm run build

# 打包 Windows
npm run build:electron

# 打包目录（不生成安装包）
npm run build:dir

# E2E 测试
npm run test:e2e
```

## 关键端口
- 前端开发服务器: 5173

## 数据存储
- 所有用户数据保存在 `appData/` 目录
- 开发模式：项目根目录/appData
- 生产模式：安装目录/appData
