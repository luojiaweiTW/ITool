<template>
  <div class="tool-page">
    <Header title="代码打包器" description="将多个代码文件内容打包，便于喂给 AI" icon="i-mdi-package-variant-closed">
      <template #actions>
        <NeonButton @click="handleClear" :disabled="loading">
          <i class="i-mdi-delete-outline mr-1"></i>
          清空
        </NeonButton>
      </template>
    </Header>

    <div class="tool-page__content">
      <!-- 配置区 -->
      <NeonCard title="配置" icon="i-mdi-cog" compact>
        <div class="config-form">
          <!-- 文件夹选择 -->
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
          </div>

          <!-- 后缀选择 -->
          <div class="form-row">
            <div class="form-item ext-item">
              <label>后缀（可多选）</label>
              <el-select
                v-model="selectedExtensions"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择文件后缀"
                class="ext-select"
                popper-class="ext-dropdown"
              >
                <el-option
                  v-for="ext in extensionOptions"
                  :key="ext"
                  :label="'.' + ext"
                  :value="ext"
                />
              </el-select>
            </div>
          </div>

          <!-- 文件名输入 -->
          <div class="form-row">
            <div class="form-item filename-item">
              <label>文件名（一行一个，不含后缀）</label>
              <el-input
                v-model="fileNamesInput"
                type="textarea"
                :rows="5"
                placeholder="UserService&#10;UserMapper&#10;OrderController"
                class="filename-textarea"
              />
            </div>
          </div>
        </div>
      </NeonCard>

      <!-- 描述区 -->
      <NeonCard title="描述" icon="i-mdi-text" compact>
        <div class="desc-form">
          <!-- 位置选择 -->
          <div class="form-row position-row">
            <label>描述位置</label>
            <el-radio-group v-model="descPosition" class="position-radio">
              <el-radio value="before">放在最前面</el-radio>
              <el-radio value="after">放在最后面</el-radio>
            </el-radio-group>
          </div>

          <!-- 描述输入 -->
          <div class="form-row">
            <div class="form-item desc-item">
              <label>描述内容</label>
              <el-input
                v-model="description"
                type="textarea"
                :rows="3"
                placeholder="请帮我分析这段代码..."
                class="desc-textarea"
              />
            </div>
          </div>

          <!-- 历史记录 -->
          <div v-if="descHistory.length > 0" class="desc-history">
            <label>历史记录（点击复制到输入框）</label>
            <div class="history-list">
              <div
                v-for="(item, index) in descHistory"
                :key="index"
                class="history-tag"
                @click="useDescHistory(item)"
              >
                <span class="tag-text">{{ truncateText(item, 30) }}</span>
                <i class="i-mdi-close tag-delete" @click.stop="deleteDescHistory(index)"></i>
              </div>
            </div>
          </div>
        </div>
      </NeonCard>

      <!-- 操作栏 -->
      <div class="action-bar">
        <NeonButton
          type="primary"
          @click="handleGenerate"
          :disabled="!canGenerate || loading"
          size="large"
        >
          <i class="i-mdi-package-variant mr-1" :class="{ 'animate-spin': loading }"></i>
          {{ loading ? '生成中...' : '生成并复制' }}
        </NeonButton>
      </div>

      <!-- 结果预览 -->
      <NeonCard
        title="结果预览"
        icon="i-mdi-eye"
        compact
        class="result-card"
      >
        <!-- 统计信息 -->
        <div v-if="result" class="result-stats">
          <span class="stat-item">
            <i class="i-mdi-file-check"></i>
            找到 {{ foundFilesCount }} 个文件
          </span>
          <span class="stat-item">
            <i class="i-mdi-text"></i>
            共 {{ result.length }} 字符
          </span>
          <span v-if="notFoundFiles.length > 0" class="stat-item stat-warning">
            <i class="i-mdi-alert"></i>
            {{ notFoundFiles.length }} 个未找到
          </span>
        </div>

        <!-- 未找到的文件 -->
        <div v-if="notFoundFiles.length > 0" class="not-found">
          <span class="not-found-label">未找到：</span>
          <span class="not-found-files">{{ notFoundFiles.join(', ') }}</span>
        </div>

        <!-- 预览内容 -->
        <div class="result-preview">
          <pre v-if="result">{{ result }}</pre>
          <div v-else class="empty-preview">
            <i class="i-mdi-file-document-outline"></i>
            <span>点击"生成并复制"后，结果将显示在这里</span>
          </div>
        </div>
      </NeonCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Header from '@/components/Header.vue'
import NeonCard from '@/components/NeonCard.vue'
import NeonButton from '@/components/NeonButton.vue'

// 配置文件名
const CONFIG_FILE = 'code-packer-config.json'
const MAX_HISTORY = 10

// 默认后缀选项
const extensionOptions = ['java', 'xml', 'vue', 'ts', 'js', 'json', 'yml', 'yaml', 'sql', 'properties', 'md', 'txt']

// 状态
const folderPath = ref('')
const selectedExtensions = ref<string[]>(['java', 'xml'])
const fileNamesInput = ref('')
const description = ref('')
const descPosition = ref<'before' | 'after'>('before')
const loading = ref(false)
const configLoaded = ref(false)

// 历史记录
const folderHistory = ref<string[]>([])
const descHistory = ref<string[]>([])

// 结果
const result = ref('')
const notFoundFiles = ref<string[]>([])
const foundFilesCount = ref(0)

// 计算属性：是否可以生成
const canGenerate = computed(() => {
  return folderPath.value && selectedExtensions.value.length > 0 && fileNamesInput.value.trim()
})

// 解析文件名列表
const parseFileNames = (): string[] => {
  return fileNamesInput.value
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0)
}

// 检查 Electron API
const isElectronAvailable = () => {
  return window.electronAPI?.codePacker !== undefined
}

// 选择文件夹
const handleSelectFolder = async () => {
  if (!isElectronAvailable()) {
    ElMessage.warning('此功能仅在 Electron 环境下可用')
    return
  }

  try {
    const result = await window.electronAPI!.codePacker!.selectFolder()
    if (result.success && result.path) {
      folderPath.value = result.path
      // 添加到历史记录
      folderHistory.value = addToHistory(folderHistory.value, result.path)
      saveConfig()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '选择文件夹失败')
  }
}

// 历史记录查询
const queryFolderHistory = (queryString: string, cb: (results: { value: string }[]) => void) => {
  const results = folderHistory.value
    .filter(item => !queryString || item.toLowerCase().includes(queryString.toLowerCase()))
    .map(item => ({ value: item }))
  cb(results)
}

// 选择历史记录
const handleFolderSelect = (item: { value: string }) => {
  folderPath.value = item.value
}

// 删除文件夹历史
const deleteFolderHistory = (value: string) => {
  folderHistory.value = folderHistory.value.filter(item => item !== value)
  saveConfig()
}

// 使用描述历史
const useDescHistory = (item: string) => {
  description.value = item
}

// 删除描述历史
const deleteDescHistory = (index: number) => {
  descHistory.value.splice(index, 1)
  saveConfig()
}

// 添加到历史记录
const addToHistory = (list: string[], value: string): string[] => {
  if (!value) return list
  const filtered = list.filter(item => item !== value)
  filtered.unshift(value)
  return filtered.slice(0, MAX_HISTORY)
}

// 截断文本
const truncateText = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// 轻度压缩内容
const compressContent = (content: string): string => {
  return content
    // 去掉行尾空格
    .replace(/[ \t]+$/gm, '')
    // 连续空行变成单个空行
    .replace(/\n{3,}/g, '\n\n')
    // 去掉开头和结尾的空行
    .trim()
}

// 生成并复制
const handleGenerate = async () => {
  if (!canGenerate.value) return

  if (!isElectronAvailable()) {
    ElMessage.warning('此功能仅在 Electron 环境下可用')
    return
  }

  loading.value = true
  result.value = ''
  notFoundFiles.value = []
  foundFilesCount.value = 0

  try {
    const fileNames = parseFileNames()

    // 添加描述到历史记录
    if (description.value.trim()) {
      descHistory.value = addToHistory(descHistory.value, description.value.trim())
    }
    saveConfig()

    // 确保传递的是普通数组，而不是 Proxy
    const extensionsArray = [...selectedExtensions.value]
    const fileNamesArray = [...fileNames]

    // 查找文件
    const findResult = await window.electronAPI!.codePacker!.findFiles(
      folderPath.value,
      fileNamesArray,
      extensionsArray
    )

    if (!findResult.success) {
      ElMessage.error(findResult.error || '查找文件失败')
      loading.value = false
      return
    }

    notFoundFiles.value = findResult.notFound
    foundFilesCount.value = findResult.files.length

    if (findResult.files.length === 0) {
      ElMessage.warning('未找到任何匹配的文件')
      loading.value = false
      return
    }

    // 读取文件内容
    const filePaths = findResult.files.map(f => f.path)
    const readResult = await window.electronAPI!.codePacker!.readFiles(filePaths)

    if (!readResult.success) {
      ElMessage.error(readResult.error || '读取文件失败')
      loading.value = false
      return
    }

    // 拼接内容
    const parts: string[] = []

    // 描述放前面
    if (descPosition.value === 'before' && description.value.trim()) {
      parts.push(description.value.trim())
      parts.push('')
    }

    // 文件内容
    for (const file of readResult.contents) {
      if (file.error) {
        parts.push(`=== ${file.name} ===`)
        parts.push(`[读取失败: ${file.error}]`)
        parts.push('')
      } else {
        parts.push(`=== ${file.name} ===`)
        parts.push(compressContent(file.content))
        parts.push('')
      }
    }

    // 描述放后面
    if (descPosition.value === 'after' && description.value.trim()) {
      parts.push(description.value.trim())
    }

    result.value = parts.join('\n').trim()

    // 复制到剪贴板
    await navigator.clipboard.writeText(result.value)
    ElMessage.success(`已复制 ${foundFilesCount.value} 个文件内容到剪贴板`)

  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    loading.value = false
  }
}

// 清空
const handleClear = () => {
  fileNamesInput.value = ''
  description.value = ''
  result.value = ''
  notFoundFiles.value = []
  foundFilesCount.value = 0
}

// 保存配置
const saveConfig = async () => {
  if (!window.electronAPI?.writeFile) return

  try {
    const config = {
      lastFolder: folderPath.value,
      folderHistory: folderHistory.value,
      lastExtensions: selectedExtensions.value,
      lastFileNames: fileNamesInput.value,
      descriptionPosition: descPosition.value,
      descriptionHistory: descHistory.value
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
        folderHistory.value = config.folderHistory || []
        selectedExtensions.value = config.lastExtensions || ['java', 'xml']
        fileNamesInput.value = config.lastFileNames || ''
        descPosition.value = config.descriptionPosition || 'before'
        descHistory.value = config.descriptionHistory || []
        console.log('✓ 加载配置成功:', config)
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  } finally {
    configLoaded.value = true
  }
}

// 监听配置变化，自动保存
watch([folderPath, selectedExtensions, fileNamesInput, descPosition], () => {
  if (configLoaded.value) {
    saveConfig()
  }
}, { deep: true })

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.tool-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
}

.tool-page::-webkit-scrollbar {
  width: 8px;
}

.tool-page::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
}

.tool-page::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.8);
}

.tool-page__content {
  flex: 1;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* 确保 NeonCard 内容不被截断 */
.tool-page__content :deep(.neon-card) {
  overflow: visible;
}

.tool-page__content :deep(.neon-card__body) {
  overflow: visible;
}

/* 表单样式 */
.config-form,
.desc-form {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-row {
  display: flex;
  gap: var(--spacing-lg);
  align-items: flex-start;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-item label,
.position-row > label,
.desc-history > label {
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
  flex: 1;
  max-width: 400px;
}

.ext-select {
  width: 100%;
}

.filename-item {
  flex: 1;
}

.filename-textarea :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  resize: vertical;
}

.filename-textarea :deep(.el-textarea__inner:hover) {
  border-color: rgba(33, 230, 255, 0.3);
}

.filename-textarea :deep(.el-textarea__inner:focus) {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px rgba(33, 230, 255, 0.2);
}

/* 描述区 */
.position-row {
  align-items: center;
  gap: var(--spacing-md);
}

.position-radio {
  display: flex;
  gap: var(--spacing-lg);
}

.position-radio :deep(.el-radio__label) {
  color: var(--text-primary);
}

.position-radio :deep(.el-radio__input.is-checked .el-radio__inner) {
  background: var(--neon-cyan);
  border-color: var(--neon-cyan);
}

.position-radio :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: var(--neon-cyan);
}

.desc-item {
  flex: 1;
}

.desc-textarea :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  resize: vertical;
}

.desc-textarea :deep(.el-textarea__inner:hover) {
  border-color: rgba(33, 230, 255, 0.3);
}

.desc-textarea :deep(.el-textarea__inner:focus) {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px rgba(33, 230, 255, 0.2);
}

/* 历史记录 */
.desc-history {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.history-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-tag:hover {
  background: rgba(33, 230, 255, 0.1);
  border-color: rgba(33, 230, 255, 0.3);
  color: var(--text-primary);
}

.tag-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-delete {
  font-size: 14px;
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.history-tag:hover .tag-delete {
  opacity: 1;
}

.tag-delete:hover {
  color: var(--neon-pink);
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md) 0;
}

/* 结果卡片 */
.result-card {
  flex-shrink: 0;
}

.result-card :deep(.neon-card-body) {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.result-stats {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-item i {
  color: var(--neon-cyan);
}

.stat-warning {
  color: var(--neon-orange, #ff9500);
}

.stat-warning i {
  color: var(--neon-orange, #ff9500);
}

.not-found {
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 149, 0, 0.1);
  border: 1px solid rgba(255, 149, 0, 0.3);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.not-found-label {
  color: var(--neon-orange, #ff9500);
  font-weight: 500;
}

.not-found-files {
  color: var(--text-secondary);
}

.result-preview {
  max-height: 300px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
}

.result-preview::-webkit-scrollbar {
  width: 8px;
}

.result-preview::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
}

.result-preview pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl);
  color: var(--text-tertiary);
}

.empty-preview i {
  font-size: 48px;
  opacity: 0.5;
}

.empty-preview span {
  font-size: 14px;
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

/* 后缀选择器样式 */
.ext-select :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
  min-height: 32px;
}

.ext-select :deep(.el-select__wrapper:hover) {
  border-color: rgba(33, 230, 255, 0.3);
}

.ext-select :deep(.el-select__wrapper.is-focused) {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px rgba(33, 230, 255, 0.2);
}

.ext-select :deep(.el-select__selection) {
  color: var(--text-primary);
}

.ext-select :deep(.el-tag) {
  background: rgba(33, 230, 255, 0.15);
  border-color: rgba(33, 230, 255, 0.3);
  color: var(--neon-cyan);
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
  display: inline-block;
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

.ext-dropdown {
  background: rgba(30, 27, 46, 0.95) !important;
  border: 1px solid rgba(33, 230, 255, 0.3) !important;
  backdrop-filter: blur(12px);
}

.ext-dropdown .el-select-dropdown__item {
  color: var(--text-primary);
}

.ext-dropdown .el-select-dropdown__item:hover {
  background: rgba(33, 230, 255, 0.1);
}

.ext-dropdown .el-select-dropdown__item.is-selected {
  color: var(--neon-cyan);
  background: rgba(33, 230, 255, 0.15);
}
</style>
