# Project Structure

```
iwork/
├── electron-main.cjs           # Electron 主进程
├── electron-preload.cjs        # Preload 脚本 (IPC 桥接)
├── src/
│   ├── main.ts                 # Vue 应用入口
│   ├── App.vue                 # 根组件
│   ├── pages/                  # 页面组件
│   │   ├── Home/               # 首页
│   │   └── tools/              # 工具页面（每个工具一个目录）
│   │       ├── SSH/            # SSH 客户端
│   │       ├── Screenshot/     # 截图工具
│   │       ├── JsonFormatter/  # JSON 格式化
│   │       ├── HttpClient/     # HTTP 客户端
│   │       ├── Knowledge/      # 知识库
│   │       └── ...             # 其他 40+ 工具
│   ├── components/             # 公共组件
│   │   └── NeonCard.vue        # 霓虹风格卡片
│   ├── stores/                 # Pinia 状态管理
│   ├── router/                 # Vue Router 配置
│   │   └── index.ts
│   └── styles/                 # 全局样式
├── build/                      # 构建资源
│   └── icon.ico                # 应用图标
├── appData/                    # 用户数据目录
│   ├── screenshots/            # 截图文件
│   ├── knowledge-docs/         # 知识库文档
│   ├── ssh-keys/               # SSH 密钥
│   └── toolData/               # 工具配置数据
├── tests/                      # 测试
│   └── *.spec.ts               # Playwright 测试
├── package.json                # npm 配置
├── electron-builder.json       # Electron 打包配置
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
└── uno.config.ts               # UnoCSS 配置
```

## 架构模式

### Electron 主进程 (electron-main.cjs)
- 窗口管理（创建、菜单、快捷键）
- IPC 处理（SSH 连接、文件操作、截图等）
- 系统集成（剪贴板监听、全局快捷键）
- 数据持久化（读写 appData 目录）

### Preload 脚本 (electron-preload.cjs)
- 通过 contextBridge 安全暴露 API
- 定义 window.electron 接口
- IPC 通信桥接

### Vue 前端
- 组件化 Vue 3 Composition API
- 每个工具是独立的页面组件
- Pinia stores 管理跨组件状态
- Element Plus 提供 UI 组件

## 添加新工具

1. 在 `src/pages/tools/` 创建新目录（如 `NewTool/`）
2. 创建 `Index.vue` 组件
3. 在 `src/router/index.ts` 添加路由
4. 在首页 `src/pages/Home/` 添加入口卡片

## IPC 通信模式

```typescript
// Preload 暴露 API
contextBridge.exposeInMainWorld('electron', {
  ssh: {
    connect: (config) => ipcRenderer.invoke('ssh:connect', config),
    disconnect: () => ipcRenderer.invoke('ssh:disconnect'),
    // ...
  }
})

// 主进程处理
ipcMain.handle('ssh:connect', async (event, config) => {
  // 处理逻辑
})

// 渲染进程调用
const result = await window.electron.ssh.connect(config)
```
