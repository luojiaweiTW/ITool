<template>
  <div class="tool-page">
    <Header title="文件查找器" description="在目录中递归查找指定类型的文件" icon="i-mdi-file-search">
      <template #actions>
        <NeonButton @click="handleRefresh" :disabled="!folderPath || !extension || loading">
          <i class="i-mdi-refresh mr-1" :class="{ 'animate-spin': loading }"></i>
          刷新
        </NeonButton>
      </template>
    </Header>

    <div class="tool-page__content">
      <!-- 搜索条件 -->
      <NeonCard title="搜索条件" icon="i-mdi-magnify" compact>
        <div class="search-form">
          <div class="form-row">
            <div class="form-item folder-item">
              <label>文件夹</label>
              <div class="folder-input">
                <el-autocomplete
                  v-model="folderPath"
                  :fetch-suggestions="queryFolderHistory"
                  placeholder="点击选择或从历史选择..."
                  class="history-input"
                  popper-class="history-dropdown"
                  :trigger-on-focus="true"
                  @select="handleFolderSelect"
                >
                  <template #default="{ item }">
                    <div class="history-item">
                      <i class="i-mdi-folder-outline"></i>
                      <span class="history-text">{{ item.value }}</span>
                      <i class="i-mdi-close history-delete" @click.stop="deleteFolderHistory(item.value)"></i>
                    </div>
                  </template>
                </el-autocomplete>
                <NeonButton @click="handleSelectFolder" size="small">
                  <i class="i-mdi-folder-open"></i>
                  选择
                </NeonButton>
              </div>
            </div>
            <div class="form-item ext-item">
              <label>后缀</label>
              <el-autocomplete
                v-model="extension"
                :fetch-suggestions="queryExtHistory"
                placeholder="如 jar、txt"
                class="history-input"
                popper-class="history-dropdown"
                :trigger-on-focus="true"
                @select="handleExtSelect"
                @keyup.enter="handleSearch"
              >
                <template #default="{ item }">
                  <div class="history-item">
                    <i class="i-mdi-file-outline"></i>
                    <span class="history-text">{{ item.value }}</span>
                    <i class="i-mdi-close history-delete" @click.stop="deleteExtHistory(item.value)"></i>
                  </div>
                </template>
              </el-autocomplete>
            </div>
            <div class="form-item search-btn">
              <NeonButton
                type="primary"
                @click="handleSearch"
                :disabled="!folderPath || !extension || loading"
              >
                <i class="i-mdi-magnify mr-1"></i>
                搜索
              </NeonButton>
            </div>
          </div>
        </div>
      </NeonCard>

      <!-- 文件列表 -->
      <NeonCard
        :title="`文件列表${files.length > 0 ? ` (${loading ? '已找到 ' : '共 '}${files.length} 个${loading ? '...' : ''})` : ''}`"
        icon="i-mdi-file-multiple"
        compact
        class="file-list-card"
      >
        <!-- 排序栏 -->
        <div v-if="files.length > 0 || hasSearched" class="sort-bar">
          <span class="sort-label">排序：</span>
          <div class="sort-options">
            <button
              v-for="opt in sortOptions"
              :key="opt.key"
              class="sort-btn"
              :class="{ active: sortKey === opt.key }"
              @click="handleSort(opt.key)"
            >
              {{ opt.label }}
              <i
                v-if="sortKey === opt.key"
                :class="sortOrder === 'asc' ? 'i-mdi-arrow-up' : 'i-mdi-arrow-down'"
              ></i>
            </button>
          </div>
        </div>

        <div v-if="loading && files.length === 0" class="loading-state">
          <i class="i-mdi-loading animate-spin"></i>
          <span>正在扫描...</span>
        </div>

        <div v-else-if="files.length === 0 && hasSearched" class="empty-state">
          <i class="i-mdi-file-search-outline text-4xl opacity-50"></i>
          <span>未找到匹配的文件</span>
        </div>

        <div v-else-if="files.length === 0" class="empty-state">
          <i class="i-mdi-folder-search-outline text-4xl opacity-50"></i>
          <span>选择文件夹并输入后缀开始搜索</span>
        </div>

        <div v-else class="file-list">
          <div
            v-for="file in sortedFiles"
            :key="file.path"
            class="file-item"
          >
            <div class="file-info">
              <div class="file-name">
                <i class="i-mdi-file-outline"></i>
                {{ file.name }}
              </div>
              <div class="file-path">{{ file.path }}</div>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-divider">|</span>
                <span class="file-time">{{ formatTime(file.mtime) }}</span>
              </div>
            </div>
            <div class="file-actions">
              <NeonButton size="small" @click="handleCopyFile(file)">
                <i class="i-mdi-content-copy"></i>
                复制
              </NeonButton>
              <NeonButton size="small" @click="handleShowInFolder(file)">
                <i class="i-mdi-folder-open-outline"></i>
                定位
              </NeonButton>
            </div>
          </div>
        </div>
      </NeonCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Header from '@/components/Header.vue'
import NeonCard from '@/components/NeonCard.vue'
import NeonButton from '@/components/NeonButton.vue'
import NeonInput from '@/components/NeonInput.vue'

interface FileInfo {
  name: string
  path: string
  size: number
  mtime: number
}

// 状态
const folderPath = ref('')
const extension = ref('')
const files = ref<FileInfo[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const configLoaded = ref(false) // 标记配置是否已加载

// 历史记录（最多保存10条）
const folderHistory = ref<string[]>([])
const extHistory = ref<string[]>([])
const MAX_HISTORY = 10

// 排序状态
type SortKey = 'name' | 'mtime' | 'size'
const sortKey = ref<SortKey>('mtime')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortOptions = [
  { key: 'name' as SortKey, label: '名称' },
  { key: 'mtime' as SortKey, label: '时间' },
  { key: 'size' as SortKey, label: '大小' },
]

// 排序后的文件列表
const sortedFiles = computed(() => {
  const sorted = [...files.value]
  sorted.sort((a, b) => {
    let cmp = 0
    if (sortKey.value === 'name') {
      cmp = a.name.localeCompare(b.name, 'zh-CN')
    } else if (sortKey.value === 'mtime') {
      cmp = a.mtime - b.mtime
    } else if (sortKey.value === 'size') {
      cmp = a.size - b.size
    }
    return sortOrder.value === 'asc' ? cmp : -cmp
  })
  return sorted
})

// 切换排序
const handleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    // 同一列，切换升降序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 不同列，设置新列并使用默认排序
    sortKey.value = key
    // 名称默认升序，时间和大小默认降序
    sortOrder.value = key === 'name' ? 'asc' : 'desc'
  }
}

// 配置文件名
const CONFIG_FILE = 'file-finder-config.json'

// 历史记录查询
const queryFolderHistory = (queryString: string, cb: (results: { value: string }[]) => void) => {
  const results = folderHistory.value
    .filter(item => !queryString || item.toLowerCase().includes(queryString.toLowerCase()))
    .map(item => ({ value: item }))
  cb(results)
}

const queryExtHistory = (queryString: string, cb: (results: { value: string }[]) => void) => {
  const results = extHistory.value
    .filter(item => !queryString || item.toLowerCase().includes(queryString.toLowerCase()))
    .map(item => ({ value: item }))
  cb(results)
}

// 选择历史记录
const handleFolderSelect = (item: { value: string }) => {
  folderPath.value = item.value
}

const handleExtSelect = (item: { value: string }) => {
  extension.value = item.value
}

// 删除历史记录
const deleteFolderHistory = (value: string) => {
  folderHistory.value = folderHistory.value.filter(item => item !== value)
  saveConfig()
}

const deleteExtHistory = (value: string) => {
  extHistory.value = extHistory.value.filter(item => item !== value)
  saveConfig()
}

// 添加到历史记录
const addToHistory = (list: string[], value: string): string[] => {
  if (!value) return list
  // 移除已存在的相同项
  const filtered = list.filter(item => item !== value)
  // 添加到开头
  filtered.unshift(value)
  // 限制数量
  return filtered.slice(0, MAX_HISTORY)
}

// 检查 Electron API
const isElectronAvailable = () => {
  return window.electronAPI?.fileFinder !== undefined
}

// 选择文件夹
const handleSelectFolder = async () => {
  if (!isElectronAvailable()) {
    ElMessage.warning('此功能仅在 Electron 环境下可用')
    return
  }

  try {
    const result = await window.electronAPI!.fileFinder!.selectFolder()
    if (result.success && result.path) {
      folderPath.value = result.path
    }
  } catch (error: any) {
    ElMessage.error(error.message || '选择文件夹失败')
  }
}

// 搜索文件（流式接收结果）
const handleSearch = async () => {
  if (!folderPath.value || !extension.value) {
    ElMessage.warning('请选择文件夹并输入后缀')
    return
  }

  if (!isElectronAvailable()) {
    ElMessage.warning('此功能仅在 Electron 环境下可用')
    return
  }

  // 添加到历史记录
  folderHistory.value = addToHistory(folderHistory.value, folderPath.value)
  extHistory.value = addToHistory(extHistory.value, extension.value)
  saveConfig()

  loading.value = true
  hasSearched.value = true
  files.value = [] // 清空之前的结果

  try {
    // 发起扫描请求（不等待结果，通过事件接收）
    const result = await window.electronAPI!.fileFinder!.scanDir(
      folderPath.value,
      extension.value
    )

    if (!result.success) {
      ElMessage.error(result.error || '扫描失败')
      loading.value = false
    }
    // 扫描完成后 loading 状态由 onScanComplete 事件处理
  } catch (error: any) {
    ElMessage.error(error.message || '扫描失败')
    loading.value = false
  }
}

// 刷新
const handleRefresh = () => {
  handleSearch()
}

// 复制文件到剪贴板
const handleCopyFile = async (file: FileInfo) => {
  if (!isElectronAvailable()) {
    ElMessage.warning('此功能仅在 Electron 环境下可用')
    return
  }

  try {
    const result = await window.electronAPI!.fileFinder!.copyFileToClipboard(file.path)
    if (result.success) {
      ElMessage.success('文件已复制到剪贴板')
    } else {
      ElMessage.error(result.error || '复制失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '复制失败')
  }
}

// 打开文件所在位置
const handleShowInFolder = async (file: FileInfo) => {
  if (!isElectronAvailable()) {
    ElMessage.warning('此功能仅在 Electron 环境下可用')
    return
  }

  try {
    const result = await window.electronAPI!.fileFinder!.showItemInFolder(file.path)
    if (!result.success) {
      ElMessage.error(result.error || '打开失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '打开失败')
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 保存配置
const saveConfig = async () => {
  if (!window.electronAPI?.writeFile) return

  try {
    const config = {
      lastFolder: folderPath.value,
      lastExtension: extension.value,
      folderHistory: folderHistory.value,
      extHistory: extHistory.value
    }
    await window.electronAPI.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

// 加载配置
const loadConfig = async () => {
  if (!window.electronAPI?.fileExists || !window.electronAPI?.readFile) {
    configLoaded.value = true
    return
  }

  try {
    const exists = await window.electronAPI.fileExists(CONFIG_FILE)
    if (exists) {
      const result = await window.electronAPI.readFile(CONFIG_FILE)
      if (result?.success && result.data) {
        const config = JSON.parse(result.data)
        folderPath.value = config.lastFolder || ''
        extension.value = config.lastExtension || ''
        folderHistory.value = config.folderHistory || []
        extHistory.value = config.extHistory || []
        console.log('✓ 加载配置成功:', config)
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  } finally {
    configLoaded.value = true
  }
}

// 监听配置变化，自动保存（仅在配置加载完成后）
watch([folderPath, extension], () => {
  if (configLoaded.value) {
    saveConfig()
  }
}, { deep: true })

// 注册流式事件监听
const setupStreamListeners = () => {
  if (!isElectronAvailable()) return

  // 监听找到的文件（流式）
  window.electronAPI!.fileFinder!.onFileFound((file: FileInfo) => {
    files.value.push(file)
  })

  // 监听扫描完成
  window.electronAPI!.fileFinder!.onScanComplete((data: { count: number }) => {
    loading.value = false
    if (data.count === 0) {
      ElMessage.info('未找到匹配的文件')
    } else {
      ElMessage.success(`找到 ${data.count} 个文件`)
    }
  })
}

// 清理事件监听
const cleanupStreamListeners = () => {
  if (isElectronAvailable()) {
    window.electronAPI!.fileFinder!.removeListeners()
  }
}

onMounted(() => {
  loadConfig()
  setupStreamListeners()
})

onUnmounted(() => {
  cleanupStreamListeners()
})
</script>

<style scoped>
.tool-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tool-page__content {
  flex: 1;
  overflow: auto;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.tool-page__content::-webkit-scrollbar {
  width: 8px;
}

.tool-page__content::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
}

.tool-page__content::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.8);
}

.search-form {
  padding: var(--spacing-md);
}

.form-row {
  display: flex;
  gap: var(--spacing-lg);
  align-items: flex-end;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-item label {
  font-size: 14px;
  color: var(--text-secondary);
}

.folder-item {
  flex: 1;
}

.folder-input {
  display: flex;
  gap: var(--spacing-sm);
  align-items: stretch;
}

.folder-input .history-input {
  flex: 1;
}

.folder-input .neon-button {
  height: 32px;
}

.ext-item {
  width: 150px;
}

.search-btn {
  flex-shrink: 0;
}

.file-list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  max-height: calc(100vh - 320px);
  overflow: visible;
}

.file-list-card :deep(.neon-card-body) {
  flex: 1;
  overflow: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 关键：允许 flex 子元素收缩 */
}

.file-list-card :deep(.neon-card-body)::-webkit-scrollbar {
  width: 8px;
}

.file-list-card :deep(.neon-card-body)::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.file-list-card :deep(.neon-card-body)::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
}

.file-list-card :deep(.neon-card-body)::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.8);
}

/* 排序栏 */
.sort-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.sort-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.sort-options {
  display: flex;
  gap: var(--spacing-xs);
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-btn:hover {
  color: var(--neon-cyan);
  border-color: rgba(33, 230, 255, 0.3);
}

.sort-btn.active {
  color: var(--neon-cyan);
  border-color: var(--neon-cyan);
  background: rgba(33, 230, 255, 0.1);
}

.sort-btn i {
  font-size: 14px;
}

/* Loading 动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl);
  color: var(--text-secondary);
}

.loading-state i {
  font-size: 32px;
  color: var(--neon-cyan);
  display: inline-block;
}

/* 确保刷新按钮里的图标也能正确旋转 */
.neon-button i.animate-spin {
  display: inline-block;
}

.file-list {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.file-item:hover {
  background: rgba(33, 230, 255, 0.05);
  border-color: rgba(33, 230, 255, 0.3);
}

.file-info {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-md);
}

.file-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  word-break: break-all;
}

.file-name i {
  flex-shrink: 0;
  color: var(--neon-cyan);
}

.file-path {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  word-break: break-all;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.file-divider {
  color: var(--text-tertiary);
}

.file-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

/* 历史记录输入框 */
.history-input {
  flex: 1;
}

.history-input :deep(.el-input) {
  height: 32px;
}

.history-input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
  height: 32px;
  padding: 0 11px;
}

.history-input :deep(.el-input__wrapper:hover) {
  border-color: rgba(33, 230, 255, 0.3);
}

.history-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px rgba(33, 230, 255, 0.2);
}

.history-input :deep(.el-input__inner) {
  color: var(--text-primary);
}

.history-input :deep(.el-input__inner::placeholder) {
  color: var(--text-tertiary);
}

/* 历史记录下拉项 */
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  width: 100%;
}

.history-item i {
  color: var(--neon-cyan);
  flex-shrink: 0;
}

.history-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-delete {
  opacity: 0;
  color: var(--text-tertiary) !important;
  cursor: pointer;
  transition: opacity 0.2s, color 0.2s;
}

.history-item:hover .history-delete {
  opacity: 1;
}

.history-delete:hover {
  color: var(--neon-pink) !important;
}
</style>

<!-- 全局样式：下拉框 -->
<style>
.history-dropdown {
  background: rgba(30, 27, 46, 0.95) !important;
  border: 1px solid rgba(33, 230, 255, 0.3) !important;
  backdrop-filter: blur(12px);
}

.history-dropdown .el-autocomplete-suggestion__wrap {
  max-height: 300px;
}

.history-dropdown .el-autocomplete-suggestion li {
  color: var(--text-primary);
  background: transparent;
}

.history-dropdown .el-autocomplete-suggestion li:hover {
  background: rgba(33, 230, 255, 0.1);
}

.history-dropdown .el-autocomplete-suggestion li.highlighted {
  background: rgba(33, 230, 255, 0.15);
}
</style>
