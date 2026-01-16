# Vue/TypeScript 开发规范

## 命名规范

### 文件命名
- 组件文件：PascalCase，如 `NeonCard.vue`、`FilePanel.vue`
- 工具页面：目录名 PascalCase，入口文件 `Index.vue`
- TypeScript 文件：camelCase，如 `sshService.ts`
- 样式文件：kebab-case，如 `neon-theme.css`

### 代码命名
- 组件名：PascalCase，如 `<NeonCard>`
- Props/Emits：camelCase，如 `showPanel`、`onFileSelect`
- 变量/函数：camelCase，如 `connectionHistory`、`loadFiles`
- 常量：UPPER_SNAKE_CASE，如 `MAX_BUFFER_SIZE`
- CSS 类名：kebab-case，如 `.ssh-toolbar`

## Vue 组件规范

### Composition API 结构
```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from 'vue'
import type { FileItem } from './types'

// 2. Props 和 Emits
const props = defineProps<{
  path: string
  showHidden?: boolean
}>()

const emit = defineEmits<{
  select: [file: FileItem]
  navigate: [path: string]
}>()

// 3. 响应式状态
const files = ref<FileItem[]>([])
const isLoading = ref(false)

// 4. 计算属性
const sortedFiles = computed(() => {
  return [...files.value].sort((a, b) => a.name.localeCompare(b.name))
})

// 5. 方法
async function loadFiles() {
  isLoading.value = true
  try {
    files.value = await window.electron.fs.readDir(props.path)
  } finally {
    isLoading.value = false
  }
}

// 6. 生命周期
onMounted(() => {
  loadFiles()
})
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 组件样式 */
</style>
```

### Props 定义
```typescript
// ✅ 使用 TypeScript 泛型定义
const props = defineProps<{
  title: string
  count?: number
  items: string[]
}>()

// ✅ 带默认值
const props = withDefaults(defineProps<{
  title: string
  count?: number
}>(), {
  count: 0
})
```

## Electron IPC 规范

### Preload 暴露 API
```typescript
// electron-preload.cjs
contextBridge.exposeInMainWorld('electron', {
  // 按功能模块分组
  ssh: {
    connect: (config) => ipcRenderer.invoke('ssh:connect', config),
    disconnect: () => ipcRenderer.invoke('ssh:disconnect'),
  },
  fs: {
    readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
    copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  }
})
```

### 主进程处理
```javascript
// electron-main.cjs
ipcMain.handle('ssh:connect', async (event, config) => {
  try {
    // 处理逻辑
    return { success: true, data: result }
  } catch (error) {
    console.error('SSH connect error:', error)
    return { success: false, error: error.message }
  }
})
```

### 渲染进程调用
```typescript
// 在 Vue 组件中
const result = await window.electron.ssh.connect(config)
if (result.success) {
  // 处理成功
} else {
  ElMessage.error(result.error || '连接失败')
}
```

## 错误处理

### API 调用
```typescript
async function loadData() {
  isLoading.value = true
  error.value = null
  
  try {
    const result = await window.electron.someApi()
    if (!result.success) {
      throw new Error(result.error)
    }
    data.value = result.data
  } catch (e) {
    error.value = e instanceof Error ? e.message : '未知错误'
    console.error('加载数据失败:', e)
  } finally {
    isLoading.value = false
  }
}
```

### 用户提示
```typescript
import { ElMessage, ElMessageBox } from 'element-plus'

// 成功提示
ElMessage.success('操作成功')

// 错误提示
ElMessage.error('操作失败：' + error.message)

// 确认对话框
const confirmed = await ElMessageBox.confirm(
  '确定要删除吗？',
  '确认删除',
  { type: 'warning' }
).catch(() => false)
```

## 样式规范

### 使用 UnoCSS 原子类
```vue
<template>
  <!-- ✅ 简单布局用原子类 -->
  <div class="flex items-center gap-2 p-4">
    <span class="text-sm text-gray-500">标签</span>
  </div>
</template>
```

### 复杂样式用 scoped CSS
```vue
<style scoped>
/* 组件特有的复杂样式 */
.file-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.file-item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: var(--el-fill-color-light);
}
</style>
```

### 使用 CSS 变量
```css
/* 使用项目定义的 CSS 变量 */
.neon-text {
  color: var(--neon-cyan);
}

.card-bg {
  background: var(--card-bg);
}
```

## 性能优化

### 大列表使用虚拟滚动
```vue
<el-table-v2
  :data="largeList"
  :height="400"
  :row-height="40"
/>
```

### 避免不必要的响应式
```typescript
// ✅ 静态数据用 shallowRef
const staticConfig = shallowRef(loadConfig())

// ✅ 大数组用 shallowRef
const largeList = shallowRef<Item[]>([])
```

### 防抖和节流
```typescript
import { useDebounceFn, useThrottleFn } from '@vueuse/core'

// 搜索输入防抖
const debouncedSearch = useDebounceFn((query: string) => {
  performSearch(query)
}, 300)

// 滚动事件节流
const throttledScroll = useThrottleFn(() => {
  updateScrollPosition()
}, 100)
```
