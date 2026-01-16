# IWork 项目总结文档

## 📋 项目概述

**IWork (爱工作)** 是一款基于 Electron + Vue 3 + TypeScript 构建的桌面开发工具集应用，集成了 50+ 实用开发工具，覆盖文本处理、编码加密、网络调试、知识管理等多个领域。

### 基本信息
- **项目名称**: IWork (爱工作)
- **版本**: 1.0.0
- **作者**: luojiawei (luojiawei24@163.com)
- **许可证**: MIT
- **GitHub**: https://github.com/luojiaweiTW/tool-nm

---

## 🛠️ 技术栈

### 前端框架
| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.5.22 | 渐进式 JavaScript 框架 |
| TypeScript | 5.9.3 | 类型安全 |
| Element Plus | 2.11.4 | UI 组件库 |
| UnoCSS | 66.5.2 | 原子化 CSS 引擎 |
| Pinia | 3.0.3 | 状态管理 |
| Vue Router | 4.5.1 | 路由管理 |

### 桌面端
| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 38.2.2 | 跨平台桌面应用框架 |
| electron-screenshots | 0.5.27 | 截图功能 |
| ssh2 | 1.17.0 | SSH 连接 |
| mysql2 | 3.15.3 | MySQL 数据库连接 |
| ioredis | 5.8.2 | Redis 连接 |
| xterm | 5.5.0 | 终端模拟器 |

### 构建工具
| 技术 | 版本 | 用途 |
|------|------|------|
| Vite (rolldown-vite) | 7.1.14 | 前端构建工具 |
| electron-builder | 26.0.12 | Electron 打包 |
| Playwright | 1.56.1 | E2E 测试 |

---

## 📁 项目结构

```
iwork/
├── electron/                  # Electron 源码 (TypeScript)
│   ├── main.ts               # 主进程入口
│   └── preload.ts            # 预加载脚本
├── electron-main.cjs          # 编译后的主进程
├── electron-preload.cjs       # 编译后的预加载脚本
├── src/
│   ├── App.vue               # 应用根组件
│   ├── main.ts               # Vue 应用入口
│   ├── pages/
│   │   ├── Home/             # 首页
│   │   └── tools/            # 50+ 工具页面
│   ├── components/           # 公共组件
│   │   ├── Sidebar.vue       # 侧边栏导航
│   │   ├── Header.vue        # 顶部栏
│   │   ├── NeonCard.vue      # 霓虹卡片组件
│   │   ├── NeonButton.vue    # 霓虹按钮组件
│   │   └── ...
│   ├── layouts/              # 布局组件
│   │   └── MainLayout.vue    # 主布局
│   ├── router/index.ts       # 路由配置
│   ├── stores/               # Pinia 状态管理
│   ├── styles/               # 全局样式
│   │   ├── tokens.css        # 设计令牌 (霓虹主题)
│   │   ├── global.css        # 全局样式
│   │   └── element-override.css
│   ├── types/                # TypeScript 类型定义
│   └── utils/                # 工具函数
├── appData/                  # 用户数据目录
│   ├── screenshots/          # 截图文件
│   ├── knowledge-docs/       # 知识库文档
│   └── *.json                # 各工具配置文件
├── build/                    # 构建资源 (图标等)
├── tests/e2e/                # E2E 测试
└── release-new/              # 打包输出目录
```

---

## 🎨 设计风格

项目采用 **霓虹 (Neon)** 主题设计，融合 Pop Art × Vaporwave/Synthwave 风格：

- **主背景色**: `#0a0e27` (深蓝黑)
- **主色调**: 
  - 青色 (Cyan): `#21e6ff`
  - 紫色 (Purple): `#9b5cff`
  - 粉色 (Pink): `#ff5caa`
- **特效**: 发光效果、渐变、毛玻璃

---

## 🔧 功能模块 (50+ 工具)

### 1. 文本处理 (8个)
- JSON 格式化/压缩/校验
- XML/YAML/JSON 互转
- SQL 格式化
- 文本差异对比
- 正则表达式测试
- Word 文档转 Markdown
- Profile 配置合成
- 日志片段分析

### 2. 编码加密 (8个)
- Base64 编解码
- URL 编解码
- 哈希计算 (MD5/SHA)
- AES/DES 加密解密
- Unicode 转换
- 编码格式转换
- 文件哈希校验
- JWT 解析

### 3. 开发工具 (10个)
- UUID 生成器
- 随机数据生成
- 时间戳转换
- 时间计算器
- Cron 表达式生成
- 二维码生成
- Maven 依赖搜索
- 进制转换
- 单位换算器
- 颜色转换器

### 4. 图片工具 (4个)
- 图片压缩
- 图片格式转换
- 图片裁剪缩放
- Base64 图片转换

### 5. Java 工具 (2个)
- JSON 转 Java 实体类
- 异常堆栈分析

### 6. 网络工具 (8个)
- SSH 终端 (支持密钥认证)
- HTTP 请求测试 (类 Postman)
- MySQL 查询客户端
- Redis 管理客户端
- IP 地址查询
- 端口扫描
- IP 扫描器
- WebSocket 测试

### 7. 生产力工具 (11个)
- 剪贴板历史
- 截图工具 (快捷键 Ctrl+Shift+X)
- 文件查找器
- 代码打包器
- 知识库管理
- 代码片段管理
- 网页收藏夹
- 待办事项
- 系统监控
- 天气查询
- 计算器

### 8. 学习工具 (2个)
- 英语学习 (新概念英语)
- 单词本

### 9. 热榜聚合 (1个)
- 各平台热门话题聚合

---

## 🚀 开发命令

```bash
# 安装依赖
npm install

# 开发模式 (Vite + Electron)
npm run dev:electron

# 仅启动 Vite 开发服务器
npm run dev

# 构建 Vite (不打包 Electron)
npm run build

# 构建 Electron 应用 (完整打包)
npm run build:electron

# 构建 Electron 应用 (仅目录)
npm run build:dir

# 运行 E2E 测试
npm run test:e2e

# 清理端口 5173
npm run kill-port
```

---

## 📦 数据持久化

项目使用 **Electron 文件系统** 进行数据持久化，而非 localStorage：

- **开发环境**: `项目根目录/appData/`
- **生产环境**: `安装目录/appData/` 或 `%APPDATA%/IWork/`

### 文件命名规范
- 配置文件: `tool-name-config.json`
- 历史记录: `tool-name-history.json`
- 数据文件: `tool-name-data.json`

---

## ⌨️ 快捷键

| 功能 | 快捷键 |
|------|--------|
| 快速截图 | `Ctrl+Shift+X` |
| 显示/隐藏窗口 | `Ctrl+Shift+N` |
| 搜索工具 | `Ctrl+K` |
| 折叠侧边栏 | `Ctrl+B` |
| 开发者工具 | `F12` |
| 刷新 | `Ctrl+R` |

---

## 🔌 IPC 通信

主进程与渲染进程通过 IPC 通信，主要 API 前缀：

| 前缀 | 功能 |
|------|------|
| `ssh:*` | SSH 连接和命令 |
| `mysql:*` | MySQL 数据库操作 |
| `redis:*` | Redis 操作 |
| `screenshots:*` | 截图功能 |
| `sftp:*` | 文件传输 |
| `network:*` | Ping/Traceroute |
| `system:*` | 系统监控 |
| `file:*` | 文件读写 |

---

## 📝 开发注意事项

### 1. Vue Proxy 对象不能直接传递给 IPC
```javascript
// ❌ 错误
await electronAPI.someMethod(reactiveArray.value)

// ✅ 正确
await electronAPI.someMethod([...reactiveArray.value])
```

### 2. 添加新工具的步骤
1. 创建 `src/pages/tools/YourTool/Index.vue`
2. 在 `src/router/index.ts` 添加路由
3. 在 `src/components/Sidebar.vue` 添加菜单项 (菜单是硬编码的)

### 3. NeonCard 内容被截断
```css
.your-container :deep(.neon-card) {
  overflow: visible;
}
```

---

## 📊 项目统计

- **工具数量**: 50+
- **代码文件**: 200+
- **依赖包**: 30+ (生产) / 15+ (开发)
- **支持平台**: Windows (主要), macOS, Linux

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [CLAUDE.md](./CLAUDE.md) - AI 开发指南
- [docs/](./docs/) - 功能文档
  - MCP 集成指南
  - MySQL IPC 选项
  - Redis 使用说明
  - 天气功能更新说明

---

*文档生成时间: 2026-01-13*
