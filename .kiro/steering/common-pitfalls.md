# 常见问题与最佳实践

本文档记录开发过程中遇到的常见问题及解决方案。

## 1. Electron 功能在浏览器环境不可用

### 问题描述
依赖 Electron API 的功能（如 SSH、文件操作）在 `npm run dev`（纯浏览器）模式下无法工作。

### 解决方案
```typescript
// 检查是否在 Electron 环境
function isElectron(): boolean {
  return !!(window.electron)
}

// 调用前检查
async function connectSSH(config: SSHConfig) {
  if (!isElectron()) {
    ElMessage.warning('此功能仅在桌面应用中可用')
    return { success: false }
  }
  return await window.electron.ssh.connect(config)
}
```

### 规则
- 所有 Electron 专属功能必须检查环境
- 非 Electron 环境下给用户明确提示
- 开发时使用 `npm run dev:electron` 测试完整功能

---

## 2. IPC 返回值格式统一

### 问题描述
IPC 调用返回格式不一致，导致前端处理困难。

### 正确做法
```javascript
// 主进程统一返回格式
ipcMain.handle('some:action', async (event, params) => {
  try {
    const result = await doSomething(params)
    return { success: true, data: result }
  } catch (error) {
    console.error('Action failed:', error)
    return { success: false, error: error.message }
  }
})

// 前端统一处理
const result = await window.electron.some.action(params)
if (result.success) {
  // 使用 result.data
} else {
  ElMessage.error(result.error || '操作失败')
}
```

---

## 3. 文件路径处理

### 问题描述
Windows 和 Unix 路径分隔符不同，硬编码路径导致跨平台问题。

### 正确做法
```javascript
const path = require('path')

// ✅ 使用 path.join
const filePath = path.join(baseDir, 'subdir', 'file.txt')

// ❌ 不要硬编码分隔符
const filePath = baseDir + '\\subdir\\file.txt'
```

---

## 4. 数据目录获取

### 问题描述
开发和生产环境数据目录不同。

### 正确做法
```javascript
// electron-main.cjs 中已定义
function getDataPath() {
  const isDev = !app.isPackaged
  const basePath = isDev ? __dirname : path.dirname(process.execPath)
  return path.join(basePath, 'appData')
}

// 使用
const dataPath = getDataPath()
const sshKeysDir = path.join(dataPath, 'ssh-keys')
```

---

## 5. SSH 连接管理

### 问题描述
SSH 连接未正确关闭，导致资源泄漏。

### 正确做法
```javascript
// 连接时保存引用
let sshClient = null

// 断开时清理
function disconnect() {
  if (sshClient) {
    sshClient.end()
    sshClient = null
  }
  if (sftpClient) {
    sftpClient.end()
    sftpClient = null
  }
}

// 应用退出时清理
app.on('before-quit', () => {
  disconnect()
})
```

---

## 6. 大文件传输进度

### 问题描述
大文件传输时 UI 无响应，用户不知道进度。

### 正确做法
```javascript
// 主进程发送进度
sftp.fastGet(remotePath, localPath, {
  step: (transferred, chunk, total) => {
    mainWindow.webContents.send('transfer:progress', {
      transferred,
      total,
      percent: Math.round((transferred / total) * 100)
    })
  }
})

// 前端监听进度
window.electron.onTransferProgress((progress) => {
  transferProgress.value = progress
})
```

---

## 7. 组件卸载时清理

### 问题描述
组件卸载后事件监听器未清理，导致内存泄漏。

### 正确做法
```typescript
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  window.electron.onSshOutput(handleOutput)
})

onUnmounted(() => {
  window.electron.offSshOutput(handleOutput)
  // 或者断开连接
  window.electron.ssh.disconnect()
})
```

---

## 8. 异步操作的加载状态

### 问题描述
异步操作期间用户重复点击，或不知道操作是否在进行。

### 正确做法
```typescript
const isLoading = ref(false)

async function doAction() {
  if (isLoading.value) return // 防止重复点击
  
  isLoading.value = true
  try {
    await someAsyncOperation()
  } finally {
    isLoading.value = false
  }
}
```

```vue
<template>
  <el-button :loading="isLoading" @click="doAction">
    执行操作
  </el-button>
</template>
```

---

## 9. 敏感信息处理

### 问题描述
密码、密钥等敏感信息被记录到日志或明文存储。

### 规则
- 日志中不打印密码、密钥内容
- 存储密码时提示用户风险
- 密钥文件复制到 appData/ssh-keys 目录管理

```javascript
// ✅ 日志脱敏
console.log('Connecting to:', config.host, 'user:', config.username)
// ❌ 不要打印密码
console.log('Password:', config.password)
```

---

## 10. Element Plus 组件使用

### 常用组件导入
```typescript
import { 
  ElMessage, 
  ElMessageBox, 
  ElNotification 
} from 'element-plus'
```

### 确认对话框
```typescript
try {
  await ElMessageBox.confirm(
    '确定要删除这个文件吗？',
    '确认删除',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  // 用户点击确认
  await deleteFile()
} catch {
  // 用户点击取消
}
```
