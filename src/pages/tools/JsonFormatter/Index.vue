<template>
  <div class="tool-page">
    <Header
      title="JSON 格式化器"
      description="格式化、压缩、校验 JSON 数据"
      icon="i-mdi-code-json"
    >
      <template #actions>
        <NeonButton variant="outline" size="small" @click="handleClear">
          <i class="i-mdi-broom" />
          清空
        </NeonButton>
        <NeonButton variant="primary" size="small" data-action="copy" @click="handleCopy">
          <i class="i-mdi-content-copy" />
          复制 <span style="opacity: 0.6;">(Ctrl+Shift+C)</span>
        </NeonButton>
        <NeonButton variant="success" size="small" @click="handleDownload">
          <i class="i-mdi-download" />
          下载
        </NeonButton>
      </template>
    </Header>

    <div class="tool-page__content">
      <div class="json-formatter">
        <!-- 左侧：输入区 -->
        <NeonCard class="json-formatter__panel" title="输入 JSON" compact>
          <template #extra>
            <div class="json-formatter__controls">
              <el-radio-group v-model="inputFormat" size="small">
                <el-radio-button value="json">JSON</el-radio-button>
                <el-radio-button value="yaml">YAML</el-radio-button>
              </el-radio-group>
              <el-button-group>
                <el-button size="small" :loading="isProcessing" @click="handleFormat">
                  <i class="i-mdi-code-braces" />
                  格式化
                </el-button>
                <el-button size="small" :loading="isProcessing" @click="handleCompress">
                  <i class="i-mdi-compress" />
                  压缩
                </el-button>
                <el-button size="small" :loading="isProcessing" @click="handleValidate">
                  <i class="i-mdi-check-circle-outline" />
                  校验
                </el-button>
              </el-button-group>
            </div>
          </template>
          <div class="input-wrapper">
            <NeonTextarea
              ref="textareaRef"
              v-model="inputJson"
              placeholder="粘贴或输入 JSON 数据..."
              :rows="20"
              :class="{ 'has-error': validationError }"
              @input="handleInput"
              class="input-textarea"
            />
            <div v-if="validationError" class="error-message" @click="handleErrorClick">
              <i class="i-mdi-alert-circle" />
              <span>{{ validationError }}</span>
              <span class="error-message__hint" v-if="errorPosition !== null">点击跳转到错误位置</span>
            </div>
          </div>
        </NeonCard>

        <!-- 右侧：输出区 -->
        <NeonCard class="json-formatter__panel" title="输出结果" compact>
          <template #extra>
            <div class="json-formatter__controls">
              <span class="json-formatter__status">
                <template v-if="isProcessing">
                  <i class="i-mdi-loading" style="color: var(--neon-cyan); animation: spin 1s linear infinite;" />
                  <span style="color: var(--neon-cyan);">处理中...</span>
                </template>
                <template v-else-if="validationError">
                  <i class="i-mdi-alert-circle" style="color: var(--neon-pink);" />
                  <span style="color: var(--neon-pink);">格式错误</span>
                </template>
                <template v-else-if="outputJson">
                  <i class="i-mdi-check-circle" style="color: var(--neon-lime);" />
                  <span style="color: var(--neon-lime);">格式正确</span>
                </template>
                <template v-else-if="!autoFormatEnabled">
                  <i class="i-mdi-information-outline" style="color: var(--neon-yellow);" />
                  <span style="color: var(--neon-yellow);">数据过大，已禁用自动格式化</span>
                </template>
              </span>
              <el-radio-group v-model="viewMode" size="small">
                <el-radio-button value="text">文本</el-radio-button>
                <el-radio-button value="tree">树形</el-radio-button>
              </el-radio-group>
              <el-radio-group v-if="viewMode === 'text'" v-model="outputFormat" size="small" @change="handleOutputFormatChange">
                <el-radio-button value="json">JSON</el-radio-button>
                <el-radio-button value="yaml">YAML</el-radio-button>
              </el-radio-group>
              <template v-if="viewMode === 'tree'">
                <el-button size="small" @click="expandAll">
                  <i class="i-mdi-unfold-more-horizontal" />
                  全部展开
                </el-button>
                <el-button size="small" @click="collapseAll">
                  <i class="i-mdi-unfold-less-horizontal" />
                  全部折叠
                </el-button>
              </template>
            </div>
          </template>
          <!-- 文本模式 -->
          <pre v-if="viewMode === 'text'" class="json-formatter__output mono"><code>{{ outputJson || '输出结果将显示在这里...' }}</code></pre>
          
          <!-- 树形模式 -->
          <div v-else class="json-tree">
            <JsonTreeNode
              v-if="parsedData !== null"
              :data="parsedData"
              :path="'root'"
            />
            <div v-else class="json-tree__empty">
              输入JSON数据后将显示树形结构...
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as yaml from 'js-yaml'
import { debounce } from '@/composables/useDebounce'
import Header from '@/components/Header.vue'
import NeonCard from '@/components/NeonCard.vue'
import NeonButton from '@/components/NeonButton.vue'
import NeonTextarea from '@/components/NeonTextarea.vue'
import JsonTreeNode from './components/JsonTreeNode.vue'

const inputJson = ref('')
const outputJson = ref('')
const validationError = ref('')
const errorPosition = ref<number | null>(null)
const inputFormat = ref<'json' | 'yaml'>('json')
const outputFormat = ref<'json' | 'yaml'>('json')
const viewMode = ref<'text' | 'tree'>('text')
const parsedData = ref<any>(null)
const textareaRef = ref<InstanceType<typeof NeonTextarea> | null>(null)
const isProcessing = ref(false)
const autoFormatEnabled = ref(true)

// 性能阈值配置
const LARGE_DATA_THRESHOLD = 500 * 1024 // 500KB
const HUGE_DATA_THRESHOLD = 2 * 1024 * 1024 // 2MB

const handleInput = () => {
  validationError.value = ''
  errorPosition.value = null
}

// 解析错误位置（从错误消息中提取位置）
const parseErrorPosition = (error: any): number | null => {
  if (!error || !error.message) return null
  
  const message = error.message.toString()
  
  // JSON 错误格式：匹配 "at position X"（可能前面有 "in JSON"）
  // 例如："Unexpected token X in JSON at position Y"
  const jsonPositionMatch = message.match(/(?:in JSON )?at position (\d+)/i)
  if (jsonPositionMatch) {
    const pos = parseInt(jsonPositionMatch[1], 10)
    return Math.min(pos, inputJson.value.length)
  }
  
  // YAML 错误格式：匹配 "at line X, column Y"
  const yamlLineColumnMatch = message.match(/at line (\d+),?\s*column (\d+)/i)
  if (yamlLineColumnMatch) {
    const line = parseInt(yamlLineColumnMatch[1], 10)
    const column = parseInt(yamlLineColumnMatch[2], 10)
    const lines = inputJson.value.split('\n')
    if (line > 0 && line <= lines.length) {
      let position = 0
      for (let i = 0; i < line - 1; i++) {
        position += lines[i].length + 1 // +1 for newline
      }
      position += Math.max(0, column - 1)
      return Math.min(position, inputJson.value.length)
    }
  }
  
  // 匹配 "line X" 格式（单独的行号）
  const lineMatch = message.match(/line (\d+)/i)
  if (lineMatch && !yamlLineColumnMatch) {
    const line = parseInt(lineMatch[1], 10)
    const lines = inputJson.value.split('\n')
    if (line > 0 && line <= lines.length) {
      let position = 0
      for (let i = 0; i < line - 1; i++) {
        position += lines[i].length + 1
      }
      return Math.min(position, inputJson.value.length)
    }
  }
  
  return null
}

// 跳转到错误位置
const jumpToErrorPosition = (position: number) => {
  if (!textareaRef.value || !textareaRef.value.textareaRef) return
  
  const textarea = textareaRef.value.textareaRef
  textarea.focus()
  
  // 设置光标位置
  textarea.setSelectionRange(position, position)
  
  // 滚动到可见位置
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 20
  const linesBeforeCursor = inputJson.value.substring(0, position).split('\n').length - 1
  const scrollTop = linesBeforeCursor * lineHeight - textarea.clientHeight / 2
  textarea.scrollTop = Math.max(0, scrollTop)
  
  // 短暂高亮效果
  textarea.classList.add('error-highlight')
  setTimeout(() => {
    textarea.classList.remove('error-highlight')
  }, 1000)
}

// 点击错误提示跳转
const handleErrorClick = () => {
  if (errorPosition.value !== null) {
    jumpToErrorPosition(errorPosition.value)
  }
}

// 解析输入（支持JSON和YAML）
const parseInput = (input?: string) => {
  const text = input ?? inputJson.value
  if (inputFormat.value === 'json') {
    return JSON.parse(text)
  } else {
    return yaml.load(text)
  }
}

// 格式化输出（支持JSON和YAML）- 异步优化版本
const formatOutputAsync = async (data: any, compress = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 使用 setTimeout 将格式化操作放到下一个事件循环，避免阻塞主线程
    setTimeout(() => {
      try {
        let result: string
        if (outputFormat.value === 'json') {
          result = compress ? JSON.stringify(data) : JSON.stringify(data, null, 2)
        } else {
          result = yaml.dump(data, { indent: compress ? 0 : 2, lineWidth: -1 })
        }
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }, 0)
  })
}

// 格式化输出（支持JSON和YAML）
const formatOutput = (data: any, compress = false) => {
  if (outputFormat.value === 'json') {
    return compress ? JSON.stringify(data) : JSON.stringify(data, null, 2)
  } else {
    return yaml.dump(data, { indent: compress ? 0 : 2, lineWidth: -1 })
  }
}

const handleFormat = async () => {
  if (!inputJson.value) {
    ElMessage.warning('请输入JSON数据')
    return
  }

  isProcessing.value = true
  try {
    // 异步解析
    await nextTick()
    const parsed = await new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(parseInput())
        } catch (error) {
          reject(error)
        }
      }, 0)
    })

    // 异步格式化
    const formatted = await formatOutputAsync(parsed, false)
    
    outputJson.value = formatted
    validationError.value = ''
    errorPosition.value = null
    autoFormatEnabled.value = true // 重新启用自动格式化
    ElMessage.success(`格式化成功 (${inputFormat.value.toUpperCase()} → ${outputFormat.value.toUpperCase()})`)
  } catch (error: any) {
    const position = parseErrorPosition(error)
    errorPosition.value = position
    validationError.value = `${inputFormat.value.toUpperCase()} 格式错误: ${error.message}`
    ElMessage.error(`${inputFormat.value.toUpperCase()} 格式错误`)
  } finally {
    isProcessing.value = false
  }
}

const handleCompress = async () => {
  if (!inputJson.value) {
    ElMessage.warning('请输入JSON数据')
    return
  }

  isProcessing.value = true
  try {
    // 异步解析
    await nextTick()
    const parsed = await new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(parseInput())
        } catch (error) {
          reject(error)
        }
      }, 0)
    })

    // 异步格式化
    const formatted = await formatOutputAsync(parsed, true)
    
    outputJson.value = formatted
    validationError.value = ''
    errorPosition.value = null
    ElMessage.success('压缩成功')
  } catch (error: any) {
    const position = parseErrorPosition(error)
    errorPosition.value = position
    validationError.value = `${inputFormat.value.toUpperCase()} 格式错误: ${error.message}`
    ElMessage.error(`${inputFormat.value.toUpperCase()} 格式错误`)
  } finally {
    isProcessing.value = false
  }
}

const handleValidate = async () => {
  if (!inputJson.value) {
    ElMessage.warning('请输入JSON数据')
    return
  }

  isProcessing.value = true
  try {
    // 异步解析
    await nextTick()
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          parseInput()
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 0)
    })

    validationError.value = ''
    errorPosition.value = null
    ElMessage.success(`${inputFormat.value.toUpperCase()} 格式正确`)
  } catch (error: any) {
    const position = parseErrorPosition(error)
    errorPosition.value = position
    validationError.value = `${inputFormat.value.toUpperCase()} 格式错误: ${error.message}`
    ElMessage.error(`${inputFormat.value.toUpperCase()} 格式错误`)
  } finally {
    isProcessing.value = false
  }
}

// 输出格式切换时自动转换
const handleOutputFormatChange = async () => {
  if (!inputJson.value) return
  if (!autoFormatEnabled.value) {
    ElMessage.warning('数据量过大，请手动点击"格式化"按钮')
    return
  }

  isProcessing.value = true
  try {
    await nextTick()
    const parsed = await new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(parseInput())
        } catch (error) {
          reject(error)
        }
      }, 0)
    })

    const formatted = await formatOutputAsync(parsed, false)
    outputJson.value = formatted
    validationError.value = ''
  } catch (error: any) {
    // 保持当前输出，不清空
  } finally {
    isProcessing.value = false
  }
}

const handleClear = () => {
  inputJson.value = ''
  outputJson.value = ''
  validationError.value = ''
  errorPosition.value = null
  isProcessing.value = false
  autoFormatEnabled.value = true // 重置自动格式化状态
  parsedData.value = null
  ElMessage.success('已清空')
}

const handleCopy = () => {
  if (!outputJson.value) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  
  navigator.clipboard.writeText(outputJson.value).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const handleDownload = () => {
  if (!outputJson.value) {
    ElMessage.warning('没有可下载的内容')
    return
  }
  
  const blob = new Blob([outputJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `formatted-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('下载成功')
}

// 展开/折叠控制
const expandAllSignal = ref(0)
const collapseAllSignal = ref(0)

function expandAll() {
  expandAllSignal.value++
}

function collapseAll() {
  collapseAllSignal.value++
}

// 提供展开/折叠信号给子组件
provide('expandAllSignal', expandAllSignal)
provide('collapseAllSignal', collapseAllSignal)

// 异步处理JSON格式化（避免阻塞主线程）
const processJsonAsync = async (input: string) => {
  if (!input) {
    outputJson.value = ''
    parsedData.value = null
    return
  }

  // 检查数据大小
  const inputSize = new Blob([input]).size
  
  // 超大数据：禁用自动格式化，提示用户手动格式化
  if (inputSize > HUGE_DATA_THRESHOLD) {
    autoFormatEnabled.value = false
    outputJson.value = ''
    parsedData.value = null
    validationError.value = ''
    ElMessage.warning('数据量过大，已禁用自动格式化。请手动点击"格式化"按钮。')
    return
  }

  // 大数据：使用更长的延迟和异步处理
  if (inputSize > LARGE_DATA_THRESHOLD) {
    autoFormatEnabled.value = true
    isProcessing.value = true
    
    try {
      // 先尝试异步解析（使用传入的 input，而不是 inputJson.value）
      await nextTick()
      const parsed = await new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(parseInput(input))
          } catch (error) {
            reject(error)
          }
        }, 0)
      })

      // 异步格式化
      const formatted = await formatOutputAsync(parsed, false)
      
      outputJson.value = formatted
      parsedData.value = parsed
      validationError.value = ''
    } catch {
      // 输入时不显示错误，只在校验时显示
      parsedData.value = null
    } finally {
      isProcessing.value = false
    }
  } else {
    // 小数据：正常处理，但也要异步化避免阻塞
    autoFormatEnabled.value = true
    isProcessing.value = true
    
    try {
      await nextTick()
      const parsed = await new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(parseInput(input))
          } catch (error) {
            reject(error)
          }
        }, 0)
      })
      
      // 即使是小数据，也异步格式化，保持UI响应
      const formatted = await formatOutputAsync(parsed, false)
      
      outputJson.value = formatted
      parsedData.value = parsed
      validationError.value = ''
    } catch {
      parsedData.value = null
    } finally {
      isProcessing.value = false
    }
  }
}

// 防抖处理函数
const debouncedProcessJson = debounce(processJsonAsync, 500)

// 自动格式化（防抖优化版本）
watch(inputJson, (newValue) => {
  if (autoFormatEnabled.value) {
    debouncedProcessJson(newValue)
  } else {
    // 如果自动格式化被禁用，只清空输出
    outputJson.value = ''
    parsedData.value = null
  }
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
}

.json-formatter {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-xl);
  height: 100%;
}

.json-formatter__panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.json-formatter__panel :deep(.neon-card__body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.json-formatter__panel :deep(.neon-textarea-wrapper) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.json-formatter__panel :deep(.neon-textarea) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.json-formatter__panel :deep(.neon-textarea__inner) {
  flex: 1;
  min-height: 0;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  background-color: #ffffff !important;
  color: #000000 !important;
}

.json-formatter__panel :deep(.neon-textarea__inner)::selection {
  background-color: rgba(33, 230, 255, 0.3);
}

.json-formatter__panel :deep(.neon-textarea__inner.error-highlight) {
  background-color: rgba(255, 82, 197, 0.1) !important;
  transition: background-color 0.3s ease;
}

.json-formatter__output {
  height: 600px; /* 🔧 固定高度确保滚动 */
  margin: 0;
  padding: var(--spacing-md);
  background-color: #ffffff !important;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: auto;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: #000000 !important;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-formatter__output code {
  background: none !important;
  color: #000000 !important;
}

.json-formatter__controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.json-formatter__status {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.json-formatter__output code {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
}

/* 错误提示 */
.error-message {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(255, 82, 197, 0.1);
  border: 1px solid var(--neon-pink);
  border-radius: var(--radius-sm);
  color: #d63384;
  font-size: var(--font-size-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  transition: all 0.2s ease;
}

.error-message:hover {
  background-color: rgba(255, 82, 197, 0.2);
  border-color: var(--neon-pink);
}

.error-message i {
  color: var(--neon-pink);
  font-size: 16px;
}

.error-message__hint {
  margin-left: auto;
  font-size: var(--font-size-xs);
  opacity: 0.7;
  font-style: italic;
}

/* 树形视图 */
.json-tree {
  height: 600px; /* 🔧 固定高度确保滚动 */
  padding: var(--spacing-md);
  background-color: #ffffff !important;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: auto;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: 1.8;
  color: #000000 !important;
}

.json-tree__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .json-formatter {
    grid-template-columns: 1fr;
  }
}

/* 🔧 输入区域固定高度 */
.input-wrapper {
  height: 600px;
  overflow: hidden;
}

.input-textarea :deep(textarea) {
  height: 100% !important;
  min-height: 600px !important;
}

.input-textarea.has-error :deep(.neon-textarea) {
  border-color: var(--neon-pink);
}

.input-textarea.has-error :deep(.neon-textarea--focused) {
  box-shadow: var(--glow-pink);
}
</style>

