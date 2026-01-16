# Design Document: SFTP File Manager

## Overview

SFTP 文件管理器是一个双面板文件管理工具，采用类似 WinSCP/Transmit 的界面设计。该工具作为 IWork 的独立工具页面，与现有 SSH 终端工具共享连接历史，但独立管理自己的 SSH/SFTP 连接。

### 设计目标
- 直观的双面板界面，支持拖拽和按钮操作
- 灵活的数据源切换（本地/远程）
- 独立的连接管理，不影响现有 SSH 终端
- 清晰的传输进度和错误反馈

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vue Component                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    FileTransfer/Index.vue                    ││
│  │  ┌─────────────────┐  ┌───┐  ┌─────────────────┐           ││
│  │  │   FilePanel     │  │ ← │  │   FilePanel     │           ││
│  │  │   (Left)        │  │ → │  │   (Right)       │           ││
│  │  │                 │  └───┘  │                 │           ││
│  │  │ - SourceSelector│         │ - SourceSelector│           ││
│  │  │ - PathBreadcrumb│         │ - PathBreadcrumb│           ││
│  │  │ - FileList      │         │ - FileList      │           ││
│  │  │ - StatusBar     │         │ - StatusBar     │           ││
│  │  └─────────────────┘         └─────────────────┘           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (window.electron.fileTransfer)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  FileTransferManager                         ││
│  │  ┌─────────────────┐    ┌─────────────────┐                 ││
│  │  │ LocalFileSystem │    │ SFTPConnection  │                 ││
│  │  │ (Node.js fs)    │    │ (ssh2 library)  │                 ││
│  │  └─────────────────┘    └─────────────────┘                 ││
│  │           │                      │                           ││
│  │           └──────────┬───────────┘                           ││
│  │                      ▼                                       ││
│  │              Unified File API                                ││
│  │  - listDir(source, path)                                     ││
│  │  - copyFile(src, dest, onProgress)                           ││
│  │  - deleteFile(source, path)                                  ││
│  │  - renameFile(source, oldPath, newPath)                      ││
│  │  - createDir(source, path)                                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Vue 组件结构

```
src/pages/tools/FileTransfer/
├── Index.vue              # 主页面组件
├── components/
│   ├── FilePanel.vue      # 文件面板组件
│   ├── SourceSelector.vue # 数据源选择器
│   ├── PathBreadcrumb.vue # 路径面包屑
│   ├── FileList.vue       # 文件列表
│   ├── FileItem.vue       # 文件条目
│   ├── TransferButtons.vue# 传输按钮组
│   ├── ConnectionDialog.vue# 连接配置对话框
│   └── ProgressOverlay.vue# 传输进度遮罩
└── types.ts               # TypeScript 类型定义
```

### 核心接口定义

```typescript
// types.ts

// 数据源类型
type SourceType = 'local' | 'remote'

// 数据源配置
interface DataSource {
  type: SourceType
  connectionId?: string  // 远程连接时的连接ID
  label: string          // 显示标签，如 "Local" 或 "user@host"
}

// 文件条目
interface FileItem {
  name: string
  path: string           // 完整路径
  type: 'file' | 'directory'
  size: number           // 字节数，目录为 0
  modifiedTime: Date
  permissions?: string   // 如 "rwxr-xr-x"（仅远程）
}

// 面板状态
interface PanelState {
  source: DataSource
  currentPath: string
  files: FileItem[]
  selectedFiles: Set<string>  // 选中的文件路径集合
  isLoading: boolean
  error: string | null
}

// SSH 连接配置（复用现有）
interface SSHConnectionConfig {
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  keyPath?: string
  keyText?: string
  name?: string
}

// 传输进度
interface TransferProgress {
  fileName: string
  currentFile: number
  totalFiles: number
  bytesTransferred: number
  totalBytes: number
  percent: number
  status: 'pending' | 'transferring' | 'completed' | 'failed'
}

// 传输任务
interface TransferTask {
  id: string
  sourceType: SourceType
  sourcePath: string
  destType: SourceType
  destPath: string
  files: string[]
  progress: TransferProgress
}
```

### IPC 接口设计

```typescript
// Preload 暴露的 API
interface FileTransferAPI {
  // 连接管理
  connect: (config: SSHConnectionConfig) => Promise<{ success: boolean; connectionId?: string; error?: string }>
  disconnect: (connectionId: string) => Promise<{ success: boolean }>
  getConnections: () => Promise<{ connectionId: string; label: string }[]>
  
  // 文件操作
  listDir: (source: DataSource, path: string) => Promise<{ success: boolean; files?: FileItem[]; error?: string }>
  copyFiles: (
    srcSource: DataSource, 
    srcPaths: string[], 
    destSource: DataSource, 
    destPath: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteFiles: (source: DataSource, paths: string[]) => Promise<{ success: boolean; error?: string }>
  renameFile: (source: DataSource, oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
  createDir: (source: DataSource, path: string) => Promise<{ success: boolean; error?: string }>
  
  // 进度监听
  onTransferProgress: (callback: (progress: TransferProgress) => void) => void
  offTransferProgress: (callback: (progress: TransferProgress) => void) => void
  
  // 连接历史（复用 SSH 工具）
  loadConnectionHistory: () => Promise<SSHConnectionConfig[]>
}
```

## Data Models

### 连接管理模型

```typescript
// 主进程中的连接管理
class ConnectionManager {
  private connections: Map<string, {
    client: Client,      // ssh2 Client
    sftp: SFTPWrapper,   // SFTP 实例
    config: SSHConnectionConfig
  }> = new Map()
  
  // 生成唯一连接ID
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  async connect(config: SSHConnectionConfig): Promise<string>
  async disconnect(connectionId: string): Promise<void>
  getSFTP(connectionId: string): SFTPWrapper | null
  getActiveConnections(): { connectionId: string; label: string }[]
}
```

### 文件操作抽象

```typescript
// 统一的文件操作接口
interface FileOperations {
  listDir(path: string): Promise<FileItem[]>
  readFile(path: string): Promise<Buffer>
  writeFile(path: string, data: Buffer): Promise<void>
  deleteFile(path: string): Promise<void>
  deleteDir(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  createDir(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<FileItem>
}

// 本地文件系统实现
class LocalFileOperations implements FileOperations {
  // 使用 Node.js fs 模块
}

// SFTP 远程实现
class SFTPFileOperations implements FileOperations {
  constructor(private sftp: SFTPWrapper) {}
  // 使用 ssh2 SFTP API
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation Consistency

*For any* valid directory path and any navigation action (folder click, parent click, or path input), the panel's currentPath should update to the target path and the files list should contain exactly the contents of that directory.

**Validates: Requirements 3.2, 3.3, 3.5**

### Property 2: Selection State Management

*For any* file list and any sequence of click and Ctrl+click actions, the selectedFiles set should accurately reflect:
- A single click replaces the selection with only the clicked item
- A Ctrl+click on an unselected item adds it to the selection
- A Ctrl+click on a selected item removes it from the selection

**Validates: Requirements 4.1, 4.2**

### Property 3: Range Selection

*For any* file list with a last-selected item at index `i` and a Shift+click on item at index `j`, the selectedFiles set should contain exactly all items from index `min(i,j)` to `max(i,j)` inclusive.

**Validates: Requirements 4.3**

### Property 4: Copy Operation Correctness

*For any* set of source files/folders and a destination directory, after a successful copy operation:
- All source files exist at the destination with the same names
- All source folders are recursively copied with their complete contents
- The source files remain unchanged (copy, not move)
- File contents at destination are identical to source

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 5: Delete Operation Correctness

*For any* set of files/folders selected for deletion, after a successful delete operation:
- None of the deleted files/folders exist at their original paths
- For deleted folders, none of their nested contents exist
- Other files in the same directory remain unchanged

**Validates: Requirements 6.2, 6.3**

### Property 6: Rename Operation Correctness

*For any* file with original name `oldName` renamed to `newName`, after a successful rename operation:
- A file with `oldName` does not exist at the original path
- A file with `newName` exists at the same directory
- The file content is unchanged

**Validates: Requirements 7.2**

## Error Handling

### Connection Errors
- **Connection timeout**: Display "连接超时，请检查网络或服务器地址" with retry button
- **Authentication failed**: Display "认证失败，请检查用户名和密码/密钥" with edit credentials option
- **Connection lost**: Display "连接已断开" with reconnect button, disable file operations

### File Operation Errors
- **Permission denied**: Display "权限不足：{path}"
- **File not found**: Display "文件不存在：{path}"，refresh the panel
- **Disk full**: Display "磁盘空间不足"
- **Name conflict**: Prompt user with overwrite/skip/rename options

### Error Display Strategy
```typescript
interface OperationError {
  code: string
  message: string
  path?: string
  recoverable: boolean
  retryAction?: () => Promise<void>
}

// 错误显示优先级
// 1. 阻塞性错误（如连接断开）：全屏遮罩 + 操作按钮
// 2. 操作错误（如删除失败）：ElMessage.error + 详情
// 3. 警告（如部分文件跳过）：ElMessage.warning
```

## Testing Strategy

### Unit Tests
- FilePanel 组件渲染测试
- SourceSelector 切换逻辑测试
- PathBreadcrumb 路径解析测试
- 选择逻辑（单选、多选、范围选）测试

### Property-Based Tests
使用 fast-check 库进行属性测试：

- **Property 1-3**: 生成随机文件列表和操作序列，验证导航和选择状态
- **Property 4-6**: 使用 mock 文件系统，生成随机文件结构，验证操作结果

配置：每个属性测试运行 100 次迭代

### Integration Tests (Playwright)
- 完整的文件传输流程测试
- 连接管理流程测试
- 错误处理场景测试

### Test File Structure
```
tests/
├── file-transfer/
│   ├── file-panel.spec.ts      # 面板组件测试
│   ├── selection.spec.ts       # 选择逻辑测试
│   ├── navigation.spec.ts      # 导航逻辑测试
│   └── properties/
│       ├── selection.property.ts   # 选择属性测试
│       ├── navigation.property.ts  # 导航属性测试
│       └── operations.property.ts  # 文件操作属性测试
```

