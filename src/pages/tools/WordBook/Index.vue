<template>
  <div class="wordbook-page">
    <!-- 顶部统计与操作区 -->
    <div class="wordbook-header">
      <div class="header-main">
        <h1 class="title">
          <i class="i-mdi-book-open-variant text-neon-cyan" />
          单词本
        </h1>
        
        <!-- 统计卡片 -->
        <div class="stats-container">
          <div class="stat-item total">
            <div class="stat-value">{{ wordbookStore.stats.total }}</div>
            <div class="stat-label">总词汇</div>
          </div>
          <div class="stat-item mastered">
            <div class="stat-value">{{ wordbookStore.stats.mastered }}</div>
            <div class="stat-label">已掌握</div>
          </div>
          <div class="stat-item review">
            <div class="stat-value">{{ wordbookStore.stats.needReview }}</div>
            <div class="stat-label">待复习</div>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <NeonButton type="primary" size="large" @click="handleAdd" class="add-btn">
          <i class="i-mdi-plus" />
          添加单词
        </NeonButton>

        <el-dropdown @command="handleMenuCommand">
          <NeonButton class="menu-btn">
            <i class="i-mdi-dots-vertical" />
          </NeonButton>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="export">
                <i class="i-mdi-download" />
                导出数据
              </el-dropdown-item>
              <el-dropdown-item command="import">
                <i class="i-mdi-upload" />
                导入 JSON 数据
              </el-dropdown-item>
              <el-dropdown-item command="importText">
                <i class="i-mdi-file-document-outline" />
                导入文本文件
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 工具栏：搜索与筛选 -->
    <div class="toolbar-container">
      <div class="search-section">
        <NeonInput
          v-model="wordbookStore.searchText"
          placeholder="搜索单词、翻译、例句..."
          class="search-input"
          clearable
        >
          <template #prefix>
            <i class="i-mdi-magnify" />
          </template>
        </NeonInput>
      </div>

      <div class="filter-section">
        <NeonButton
          :type="wordbookStore.showMastered ? 'default' : 'primary'"
          @click="wordbookStore.showMastered = !wordbookStore.showMastered"
          size="small"
          class="filter-toggle"
        >
          <i :class="wordbookStore.showMastered ? 'i-mdi-eye' : 'i-mdi-eye-off'" />
          {{ wordbookStore.showMastered ? '显示已掌握' : '隐藏已掌握' }}
        </NeonButton>

        <div class="divider"></div>

        <div class="tags-scroller">
          <span class="filter-label"><i class="i-mdi-tag-outline" /> 标签筛选:</span>
          <div 
            v-for="tag in wordbookStore.allTags"
            :key="tag"
            class="filter-tag"
            :class="{ active: wordbookStore.selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </div>
          <span v-if="wordbookStore.allTags.length === 0" class="no-tags">暂无标签</span>
        </div>
      </div>
    </div>

    <!-- 单词列表内容区 -->
    <div class="wordbook-content">
      <div v-if="wordbookStore.isLoading" class="loading-state">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <EmptyState
        v-else-if="wordbookStore.pagination.total === 0"
        :title="wordbookStore.searchText ? '无搜索结果' : '单词本为空'"
        :description="wordbookStore.searchText ? '换个关键词试试' : '点击右上角按钮添加单词'"
        icon="i-mdi-book-open-page-variant-outline"
        class="empty-state"
      />

      <div v-else>
        <div class="word-grid">
          <WordCard
            v-for="word in wordbookStore.paginatedWords"
            :key="word.id"
            :word="word"
            @edit="handleEdit"
            @delete="handleDelete"
            @toggle-mastered="handleToggleMastered"
          />
        </div>
        
        <!-- 分页组件 -->
        <div class="pagination-container" v-if="wordbookStore.pagination.totalPages > 1">
          <el-pagination
            v-model:current-page="wordbookStore.currentPage"
            :page-size="wordbookStore.pageSize"
            :total="wordbookStore.pagination.total"
            :page-sizes="[20, 50, 100, 200]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
            class="pagination"
          />
        </div>
      </div>
    </div>

    <!-- 单词编辑器 -->
    <WordEditor
      v-model="editorVisible"
      :word="currentWord"
      @save="handleSave"
    />

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入单词本"
      width="600px"
      align-center
    >
      <el-input
        v-model="importData"
        type="textarea"
        :rows="10"
        placeholder="粘贴 JSON 格式的单词数据..."
      />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>

    <!-- 文件输入 -->
    <input
      ref="importInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useWordbookStore, type Word } from '@/stores/wordbook'
import NeonButton from '@/components/NeonButton.vue'
import NeonInput from '@/components/NeonInput.vue'
import EmptyState from '@/components/EmptyState.vue'
import WordCard from './components/WordCard.vue'
import WordEditor from './components/WordEditor.vue'

const wordbookStore = useWordbookStore()

// 编辑器
const editorVisible = ref(false)
const currentWord = ref<Word | null>(null)

function handleAdd() {
  currentWord.value = null
  editorVisible.value = true
}

function handleEdit(word: Word) {
  currentWord.value = word
  editorVisible.value = true
}

function handleSave(word: Word) {
  if (currentWord.value) {
    // 更新
    wordbookStore.updateWord(currentWord.value.id, word)
    ElMessage.success('单词已更新')
  } else {
    // 添加
    if (wordbookStore.wordExists(word.word)) {
      ElMessage.warning('该单词已存在')
      return
    }
    wordbookStore.addWord(word)
    ElMessage.success('单词已添加')
  }
  editorVisible.value = false
  currentWord.value = null
}

async function handleDelete(word: Word) {
  try {
    await ElMessageBox.confirm('确定要删除这个单词吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    wordbookStore.deleteWord(word.id)
    ElMessage.success('单词已删除')
  } catch {
    // 取消删除
  }
}

function handleToggleMastered(word: Word) {
  wordbookStore.toggleMastered(word.id)
}

function toggleTag(tag: string) {
  const index = wordbookStore.selectedTags.indexOf(tag)
  if (index > -1) {
    wordbookStore.selectedTags.splice(index, 1)
  } else {
    wordbookStore.selectedTags.push(tag)
  }
}

// 菜单命令
async function handleMenuCommand(command: string) {
  switch (command) {
    case 'export':
      wordbookStore.exportData()
      break
    case 'import':
      importDialogVisible.value = true
      importData.value = ''
      break
    case 'importText':
      await handleImportTextFile()
      break
  }
}

// 导入
const importDialogVisible = ref(false)
const importData = ref('')
const importInput = ref<HTMLInputElement>()

function handleImport() {
  try {
    const data = JSON.parse(importData.value)
    if (Array.isArray(data)) {
      wordbookStore.importData(data)
      importDialogVisible.value = false
    } else {
      ElMessage.error('数据格式错误')
    }
  } catch (error) {
    ElMessage.error('导入失败：' + (error as Error).message)
  }
}

function handleFileImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (Array.isArray(data)) {
        wordbookStore.importData(data)
      } else {
        ElMessage.error('数据格式错误')
      }
    } catch (error) {
      ElMessage.error('导入失败：' + (error as Error).message)
    }
  }
  reader.readAsText(file)
}

// 导入文本文件
async function handleImportTextFile() {
  try {
    // 检查 Electron API
    if (!window.electron?.dialog?.selectFile) {
      ElMessage.warning('当前为浏览器模式，请使用 Electron 版本')
      return
    }

    // 选择文件
    const result = await window.electron.dialog.selectFile()
    if (!result.success || result.canceled || !result.filePath) {
      return
    }

    const filePath = result.filePath
    
    // 显示加载提示
    const loadingMessage = ElMessage({
      message: '正在导入单词...',
      type: 'info',
      duration: 0,
    })

    try {
      // 导入文件
      const importResult = await wordbookStore.importFromTextFile(filePath)
      
      loadingMessage.close()

      if (importResult.success) {
        ElMessage.success(
          `导入成功！已导入 ${importResult.imported} 个单词，跳过 ${importResult.skipped} 个重复单词`
        )
      } else {
        ElMessage.error('导入失败：' + (importResult.error || '未知错误'))
      }
    } catch (error) {
      loadingMessage.close()
      ElMessage.error('导入失败：' + (error as Error).message)
    }
  } catch (error) {
    ElMessage.error('选择文件失败：' + (error as Error).message)
  }
}

onMounted(() => {
  wordbookStore.init()
  
  if (import.meta.env.DEV && window.electronAPI) {
    const urlParams = new URLSearchParams(window.location.search)
    const quickImportPath = urlParams.get('quickImport')
    if (quickImportPath) {
      handleQuickImport(decodeURIComponent(quickImportPath))
    }
  }
})

async function handleQuickImport(filePath: string) {
  try {
    const loadingMessage = ElMessage({
      message: `正在快速导入单词...\n文件: ${filePath}`,
      type: 'info',
      duration: 0,
    })
    const importResult = await wordbookStore.importFromTextFile(filePath)
    loadingMessage.close()
    if (importResult.success) {
      ElMessage.success(
        `快速导入成功！已导入 ${importResult.imported} 个单词，跳过 ${importResult.skipped} 个重复单词`
      )
    } else {
      ElMessage.error('快速导入失败：' + (importResult.error || '未知错误'))
    }
  } catch (error) {
    ElMessage.error('快速导入失败：' + (error as Error).message)
  }
}

// 分页处理
function handlePageChange(page: number) {
  wordbookStore.setPage(page)
  // 滚动到顶部
  const contentEl = document.querySelector('.wordbook-content')
  if (contentEl) {
    contentEl.scrollTop = 0
  }
}

function handlePageSizeChange(size: number) {
  wordbookStore.setPageSize(size)
  // 滚动到顶部
  const contentEl = document.querySelector('.wordbook-content')
  if (contentEl) {
    contentEl.scrollTop = 0
  }
}
</script>

<style scoped>
.wordbook-page {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  gap: 20px;
}

.wordbook-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  letter-spacing: -0.5px;
}

.stats-container {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  min-width: 80px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.stat-item.total .stat-value { color: var(--color-text); }
.stat-item.mastered .stat-value { color: var(--el-color-success); }
.stat-item.review .stat-value { color: var(--el-color-warning); }

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-btn {
  padding-left: 20px;
  padding-right: 20px;
  font-weight: 600;
}

.toolbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  gap: 16px;
  flex-wrap: wrap;
}

.search-section {
  flex: 0 0 300px;
}

.filter-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0; /* 防止溢出 */
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.tags-scroller {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px; /* 滚动条空间 */
}

/* 隐藏滚动条但保留功能 */
.tags-scroller::-webkit-scrollbar {
  height: 4px;
}
.tags-scroller::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.filter-label {
  color: var(--color-text-secondary);
  font-size: 13px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-tag {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  border: 1px solid transparent;
}

.filter-tag:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.filter-tag.active {
  background: rgba(33, 230, 255, 0.15);
  color: var(--neon-cyan);
  border-color: rgba(33, 230, 255, 0.3);
}

.no-tags {
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.5;
}

.wordbook-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* Flex容器中的滚动 */
  padding-right: 4px; /* 滚动条间距 */
}

.loading-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--color-text-secondary);
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding-bottom: 24px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 24px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 20px;
}

.pagination {
  --el-pagination-bg-color: rgba(255, 255, 255, 0.02);
  --el-pagination-text-color: var(--color-text);
  --el-pagination-border-radius: 8px;
  --el-pagination-button-color: var(--color-text-secondary);
  --el-pagination-hover-color: var(--neon-cyan);
  --el-pagination-active-color: var(--neon-cyan);
}

:deep(.el-pagination) {
  .el-pagination__total,
  .el-pagination__sizes,
  .el-pagination__jump {
    color: var(--color-text-secondary);
  }
  
  .el-pager li {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &:hover {
      color: var(--neon-cyan);
      border-color: var(--neon-cyan);
    }
    
    &.is-active {
      background: rgba(33, 230, 255, 0.15);
      color: var(--neon-cyan);
      border-color: var(--neon-cyan);
    }
  }
  
  .btn-prev,
  .btn-next {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &:hover {
      color: var(--neon-cyan);
      border-color: var(--neon-cyan);
    }
    
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
  
  .el-select {
    .el-input__inner {
      background: rgba(255, 255, 255, 0.05);
      color: var(--color-text);
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
  
  .el-input__inner {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
    border-color: rgba(255, 255, 255, 0.1);
    
    &:focus {
      border-color: var(--neon-cyan);
    }
  }
}

@media (max-width: 768px) {
  .wordbook-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }

  .add-btn {
    flex: 1;
  }

  .toolbar-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-section {
    flex: none;
    width: 100%;
  }

  .filter-section {
    width: 100%;
    overflow-x: auto;
  }
}
</style>

