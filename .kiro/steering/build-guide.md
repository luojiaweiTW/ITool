# 构建规范

## 构建命令

所有命令在项目根目录执行：

```bash
# 开发模式（推荐）
npm run dev:electron     # Electron + Vite 热重载

# 仅前端开发（浏览器）
npm run dev              # 注意：Electron 功能不可用

# 构建前端
npm run build            # 输出到 dist/

# 打包 Windows 应用
npm run build:electron   # 完整打包（生成安装包）
npm run build:dir        # 仅打包目录（快速测试）

# 测试
npm run test:e2e         # Playwright E2E 测试
npm run test:e2e:ui      # 带 UI 的测试
```

## 构建产物位置

| 类型 | 位置 | 说明 |
|------|------|------|
| 前端构建 | `dist/` | HTML, CSS, JS 静态文件 |
| Windows 安装包 | `release-new/` | .exe 安装程序 |
| 便携版 | `release-new/` | 免安装版本 |

## 开发 vs 生产

| 环境 | 数据目录 | 判断方式 |
|------|----------|----------|
| 开发 | `项目根目录/appData/` | `!app.isPackaged` |
| 生产 | `安装目录/appData/` | `app.isPackaged` |

## 常见问题

### 图标不显示
- 确保 `build/icon.ico` 存在且格式正确
- 运行 `node fix-icon.cjs` 修复

### 端口占用
- 运行 `npm run kill-port` 清理 5173 端口

### 构建失败
- 检查 Node.js 版本 >= 18
- 删除 `node_modules` 重新安装
- 增加内存：`node --max-old-space-size=4096`

## 调试技巧

```bash
# 主进程日志
# 直接在终端查看 console.log 输出

# 渲染进程日志
# 按 F12 打开开发者工具

# 查看 Electron 版本
npm list electron
```
