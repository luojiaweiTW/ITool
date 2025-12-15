<template>
  <div class="json-formatter-compact">
    <!-- 顶部工具栏 -->
    <div class="formatter-toolbar">
      <div class="formatter-toolbar__left">
        <h2 class="formatter-title">
          <i class="i-mdi-code-json" />
          <span>JSON 格式化器</span>
        </h2>
        <span class="formatter-desc">快速格式化、压缩、校验 JSON/YAML 数据</span>
      </div>
      <div class="formatter-toolbar__right">
        <CompactButtonGroup size="sm">
          <CompactButton variant="default" size="sm" icon="i-mdi-broom" @click="handleClear">
            清空
          </CompactButton>
          <CompactButton variant="primary" size="sm" icon="i-mdi-content-copy" @click="handleCopy">
            复制
          </CompactButton>
          <CompactButton variant="success" size="sm" icon="i-mdi-download" @click="handleDownload">
            下载
          </CompactButton>
        </CompactButtonGroup>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="formatter-content">
      <!-- 左侧：输入区 -->
      <CompactCard title="输入">
        <template #actions>
          <CompactButtonGroup size="xs">
            <CompactButton
              v-for="fmt in ['json', 'yaml']"
              :key="fmt"
              :active="inputFormat === fmt"
              size="xs"
              @click="inputFormat = fmt"
            >
              {{ fmt.toUpperCase() }}
            </CompactButton>
          </CompactButtonGroup>
          
          <div class="toolbar-divider" />
          
          <CompactButtonGroup size="xs">
            <CompactButton size="xs" icon="i-mdi-code-braces" @click="handleFormat">
              格式化
            </CompactButton>
            <CompactButton size="xs" icon="i-mdi-compress" @click="handleCompress">
              压缩
            </CompactButton>
            <CompactButton size="xs" icon="i-mdi-check-circle-outline" @click="handleValidate">
              校验
            </CompactButton>
          </CompactButtonGroup>
        </template>

        <div class="editor-wrapper">
          <div class="editor-with-lines">
            <div class="line-numbers" ref="inputLineNumbersRef">
              <div
                v-for="n in inputLineCount"
                :key="n"
                class="line-number"
                :class="{ 'error-line': errorLine === n }"
              >
                {{ n }}
              </div>
            </div>
            <textarea
              ref="textareaRef"
              v-model="inputJson"
              class="compact-textarea"
              :class="{ 'has-error': validationError }"
              placeholder="粘贴或输入 JSON/YAML 数据..."
              spellcheck="false"
              @input="handleInput"
              @scroll="handleInputScroll"
            />
          </div>
          <div v-if="validationError" class="editor-error">
            <i class="i-mdi-alert-circle" />
            <div class="error-content">
              <div class="error-message">{{ validationError.split('\n')[0] }}</div>
              <div v-if="validationError.includes('\n')" class="error-details">
                {{ validationError.split('\n').slice(1).join('\n') }}
              </div>
            </div>
          </div>
        </div>
      </CompactCard>

      <!-- 右侧：输出区 -->
      <CompactCard title="输出">
        <template #actions>
          <!-- 状态标签 -->
          <StatusTag
            v-if="validationError"
            type="error"
            icon="i-mdi-alert-circle"
          >
            格式错误
          </StatusTag>
          <StatusTag
            v-else-if="outputJson"
            type="success"
            icon="i-mdi-check-circle"
          >
            格式正确
          </StatusTag>

          <div class="toolbar-divider" />

          <!-- 视图模式 -->
          <CompactButtonGroup size="xs">
            <CompactButton
              v-for="mode in ['text', 'tree']"
              :key="mode"
              :active="viewMode === mode"
              size="xs"
              @click="viewMode = mode"
            >
              {{ mode === 'text' ? '文本' : '树形' }}
            </CompactButton>
          </CompactButtonGroup>

          <!-- 输出格式 -->
          <CompactButtonGroup v-if="viewMode === 'text'" size="xs">
            <CompactButton
              v-for="fmt in ['json', 'yaml']"
              :key="fmt"
              :active="outputFormat === fmt"
              size="xs"
              @click="outputFormat = fmt; handleOutputFormatChange()"
            >
              {{ fmt.toUpperCase() }}
            </CompactButton>
          </CompactButtonGroup>

          <!-- 树形控制 -->
          <template v-if="viewMode === 'tree'">
            <div class="toolbar-divider" />
            <CompactButtonGroup size="xs">
              <CompactButton size="xs" icon="i-mdi-unfold-more-horizontal" @click="expandAll">
                展开
              </CompactButton>
              <CompactButton size="xs" icon="i-mdi-unfold-less-horizontal" @click="collapseAll">
                折叠
              </CompactButton>
            </CompactButtonGroup>
          </template>
        </template>

        <div class="editor-wrapper">
          <!-- 文本模式 -->
          <div v-if="viewMode === 'text'" class="editor-with-lines">
            <div class="line-numbers" ref="outputLineNumbersRef">
              <div
                v-for="n in outputLineCount"
                :key="n"
                class="line-number"
              >
                {{ n }}
              </div>
            </div>
            <pre ref="outputPreRef" class="compact-output" @scroll="handleOutputScroll"><code>{{ outputJson || '输出结果将显示在这里...' }}</code></pre>
          </div>
          
          <!-- 树形模式 -->
          <div v-else class="json-tree-compact">
            <JsonTreeNode
              v-if="parsedData !== null"
              :data="parsedData"
              :path="'root'"
            />
            <div v-else class="json-tree-compact__empty">
              输入 JSON 数据后将显示树形结构...
            </div>
          </div>
        </div>
      </CompactCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as yaml from 'js-yaml'
import CompactCard from '@/components/CompactCard.vue'
import CompactButton from '@/components/CompactButton.vue'
import CompactButtonGroup from '@/components/CompactButtonGroup.vue'
import StatusTag from '@/components/StatusTag.vue'
import JsonTreeNode from './components/JsonTreeNode.vue'

const inputJson = ref('')
const outputJson = ref('')
const validationError = ref('')
const errorLine = ref<number | null>(null)
const errorColumn = ref<number | null>(null)
const errorPosition = ref<number | null>(null)
const inputFormat = ref<'json' | 'yaml'>('json')
const outputFormat = ref<'json' | 'yaml'>('json')
const viewMode = ref<'text' | 'tree'>('text')
const parsedData = ref<any>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputLineNumbersRef = ref<HTMLDivElement | null>(null)
const outputLineNumbersRef = ref<HTMLDivElement | null>(null)
const outputPreRef = ref<HTMLPreElement | null>(null)

// 计算行数
const inputLineCount = computed(() => {
  if (!inputJson.value) return 1
  const lines = inputJson.value.split('\n')
  // 如果最后一行不为空，也要显示行号
  return Math.max(1, lines.length)
})

const outputLineCount = computed(() => {
  if (!outputJson.value) return 1
  const lines = outputJson.value.split('\n')
  // 如果最后一行不为空，也要显示行号
  return Math.max(1, lines.length)
})

// 同步滚动
const handleInputScroll = () => {
  if (textareaRef.value && inputLineNumbersRef.value) {
    inputLineNumbersRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

const handleOutputScroll = () => {
  if (outputPreRef.value && outputLineNumbersRef.value) {
    outputLineNumbersRef.value.scrollTop = outputPreRef.value.scrollTop
  }
}

const handleInput = () => {
  validationError.value = ''
  errorLine.value = null
  errorColumn.value = null
  errorPosition.value = null
}

// 解析 JSON 错误信息，提取位置和行数
const parseJsonError = (error: Error, jsonText: string) => {
  const message = error.message || ''
  let position: number | null = null
  let line: number | null = null
  let column: number | null = null

  // 尝试从错误信息中提取位置
  // 格式: "Unexpected token X in JSON at position Y"
  const positionMatch = message.match(/position\s+(\d+)/i)
  if (positionMatch) {
    position = parseInt(positionMatch[1], 10)
  }

  // 如果没有找到位置，尝试从堆栈信息中提取
  if (position === null && error.stack) {
    const stackMatch = error.stack.match(/position\s+(\d+)/i)
    if (stackMatch) {
      position = parseInt(stackMatch[1], 10)
    }
  }

  // 如果找到了位置，计算行数和列数
  if (position !== null && position >= 0 && position <= jsonText.length) {
    const textBeforePosition = jsonText.substring(0, position)
    const lines = textBeforePosition.split('\n')
    line = lines.length
    column = lines[lines.length - 1].length + 1 // +1 因为列数从1开始
  } else {
    // 如果找不到位置，尝试查找常见的错误位置
    // 比如缺少引号、逗号等
    const commonErrors = [
      { pattern: /Unexpected token.*in JSON/i, search: /[^\\]"/g },
      { pattern: /Unexpected end/i, search: /$/ }
    ]
    
    for (const err of commonErrors) {
      if (err.pattern.test(message)) {
        // 尝试找到最后一个有效的 JSON 结构
        const lastBrace = jsonText.lastIndexOf('}')
        const lastBracket = jsonText.lastIndexOf(']')
        const lastValid = Math.max(lastBrace, lastBracket)
        if (lastValid > 0) {
          position = lastValid + 1
          const textBeforePosition = jsonText.substring(0, position)
          const lines = textBeforePosition.split('\n')
          line = lines.length
          column = lines[lines.length - 1].length + 1
        }
        break
      }
    }
  }

  return { position, line, column, message }
}

// 解析输入（支持JSON和YAML）
const parseInput = () => {
  if (inputFormat.value === 'json') {
    try {
      return JSON.parse(inputJson.value)
    } catch (error: any) {
      // 解析错误信息
      const errorInfo = parseJsonError(error, inputJson.value)
      errorLine.value = errorInfo.line
      errorColumn.value = errorInfo.column
      errorPosition.value = errorInfo.position
      throw error
    }
  } else {
    try {
      return yaml.load(inputJson.value)
    } catch (error: any) {
      // YAML 错误处理
      const message = error.message || ''
      // YAML 错误通常包含行号
      const lineMatch = message.match(/line\s+(\d+)/i)
      if (lineMatch) {
        errorLine.value = parseInt(lineMatch[1], 10)
      }
      throw error
    }
  }
}

// 格式化输出（支持JSON和YAML）
const formatOutput = (data: any, compress = false) => {
  if (outputFormat.value === 'json') {
    return compress ? JSON.stringify(data) : JSON.stringify(data, null, 2)
  } else {
    return yaml.dump(data, { indent: compress ? 0 : 2, lineWidth: -1 })
  }
}

const handleFormat = () => {
  try {
    const parsed = parseInput()
    outputJson.value = formatOutput(parsed, false)
    validationError.value = ''
    errorLine.value = null
    errorColumn.value = null
    errorPosition.value = null
    ElMessage.success(`格式化成功 (${inputFormat.value.toUpperCase()} → ${outputFormat.value.toUpperCase()})`)
  } catch (error: any) {
    // parseInput 已经解析了错误信息并设置了 errorLine、errorColumn、errorPosition
    let errorMsg = `${inputFormat.value.toUpperCase()} 格式错误: ${error.message}`
    
    if (errorLine.value !== null) {
      errorMsg += `\n位置: 第 ${errorLine.value} 行`
      if (errorColumn.value !== null) {
        errorMsg += `，第 ${errorColumn.value} 列`
      }
      if (errorPosition.value !== null) {
        errorMsg += ` (字符位置: ${errorPosition.value})`
      }
    }
    
    validationError.value = errorMsg
    ElMessage.error(`${inputFormat.value.toUpperCase()} 格式错误`)
    
    // 滚动到错误行
    scrollToErrorLine()
  }
}

const handleCompress = () => {
  try {
    const parsed = parseInput()
    outputJson.value = formatOutput(parsed, true)
    validationError.value = ''
    errorLine.value = null
    errorColumn.value = null
    errorPosition.value = null
    ElMessage.success('压缩成功')
  } catch (error: any) {
    // parseInput 已经解析了错误信息并设置了 errorLine、errorColumn、errorPosition
    let errorMsg = `${inputFormat.value.toUpperCase()} 格式错误: ${error.message}`
    
    if (errorLine.value !== null) {
      errorMsg += `\n位置: 第 ${errorLine.value} 行`
      if (errorColumn.value !== null) {
        errorMsg += `，第 ${errorColumn.value} 列`
      }
      if (errorPosition.value !== null) {
        errorMsg += ` (字符位置: ${errorPosition.value})`
      }
    }
    
    validationError.value = errorMsg
    ElMessage.error(`${inputFormat.value.toUpperCase()} 格式错误`)
    
    // 滚动到错误行
    scrollToErrorLine()
  }
}

const handleValidate = () => {
  try {
    parseInput()
    validationError.value = ''
    errorLine.value = null
    errorColumn.value = null
    errorPosition.value = null
    ElMessage.success(`${inputFormat.value.toUpperCase()} 格式正确`)
  } catch (error: any) {
    // parseInput 已经解析了错误信息并设置了 errorLine、errorColumn、errorPosition
    let errorMsg = `${inputFormat.value.toUpperCase()} 格式错误: ${error.message}`
    
    if (errorLine.value !== null) {
      errorMsg += `\n位置: 第 ${errorLine.value} 行`
      if (errorColumn.value !== null) {
        errorMsg += `，第 ${errorColumn.value} 列`
      }
      if (errorPosition.value !== null) {
        errorMsg += ` (字符位置: ${errorPosition.value})`
      }
    }
    
    validationError.value = errorMsg
    ElMessage.error(`${inputFormat.value.toUpperCase()} 格式错误`)
    
    // 滚动到错误行
    scrollToErrorLine()
  }
}

// 输出格式切换时自动转换
const handleOutputFormatChange = () => {
  if (!inputJson.value) return
  try {
    const parsed = parseInput()
    outputJson.value = formatOutput(parsed, false)
    validationError.value = ''
  } catch (error: any) {
    // 保持当前输出，不清空
  }
}

// 滚动到错误行
const scrollToErrorLine = () => {
  if (errorLine.value !== null && textareaRef.value) {
    nextTick(() => {
      const textarea = textareaRef.value
      if (!textarea) return
      
      const lines = inputJson.value.split('\n')
      let position = 0
      
      // 计算错误行的起始位置
      for (let i = 0; i < errorLine.value! - 1 && i < lines.length; i++) {
        position += lines[i].length + 1 // +1 是换行符
      }
      
      // 设置光标位置并滚动
      textarea.setSelectionRange(position, position)
      textarea.focus()
      
      // 滚动到可见区域
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
      const scrollTop = (errorLine.value! - 1) * lineHeight - textarea.clientHeight / 2
      textarea.scrollTop = Math.max(0, scrollTop)
    })
  }
}

const handleClear = () => {
  inputJson.value = ''
  outputJson.value = ''
  validationError.value = ''
  errorLine.value = null
  errorColumn.value = null
  errorPosition.value = null
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

// 自动格式化（可选）
watch(inputJson, () => {
  if (inputJson.value) {
    try {
      const parsed = parseInput()
      outputJson.value = formatOutput(parsed, false)
      parsedData.value = parsed // 更新树形数据
      validationError.value = ''
    } catch {
      // 输入时不显示错误，只在校验时显示
      parsedData.value = null
    }
  } else {
    outputJson.value = ''
    parsedData.value = null
  }
})
</script>

<style scoped>
.json-formatter-compact {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(10, 10, 20, 0.9) 0%, rgba(20, 20, 40, 0.95) 100%);
}

/* 顶部工具栏 */
.formatter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(33, 230, 255, 0.15);
  gap: 16px;
  flex-shrink: 0;
}

.formatter-toolbar__left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.formatter-toolbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.formatter-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--neon-blue);
  margin: 0;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.formatter-title i {
  font-size: 20px;
}

.formatter-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 主体内容 */
.formatter-content {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  min-height: 0;
}

/* 编辑器包装 */
.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

/* 带行号的编辑器容器 */
.editor-with-lines {
  flex: 1;
  display: flex;
  position: relative;
  min-height: 0;
  overflow: hidden;
  height: 100%;
}

/* 行号区域 */
.line-numbers {
  flex-shrink: 0;
  width: 50px;
  padding: 10px 8px 10px 10px;
  background: rgba(0, 0, 0, 0.4);
  border-right: 1px solid rgba(33, 230, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  text-align: right;
  user-select: none;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  /* 确保行号区域可以显示所有行数，不受高度限制 */
  max-height: none;
}

.line-number {
  height: 19.2px; /* 与 line-height 1.6 * 12px 匹配，使用固定高度确保对齐 */
  min-height: 19.2px;
  padding-right: 8px;
  transition: color 0.2s ease;
  display: block;
}

.line-number.error-line {
  color: rgb(239, 68, 68);
  font-weight: 600;
  background: rgba(239, 68, 68, 0.1);
}

/* 行号滚动条 */
.line-numbers::-webkit-scrollbar {
  width: 4px;
}

.line-numbers::-webkit-scrollbar-track {
  background: transparent;
}

.line-numbers::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.3);
  border-radius: 2px;
}

.line-numbers::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.5);
}

/* 紧凑文本域 */
.compact-textarea {
  flex: 1;
  width: 100%;
  padding: 10px;
  padding-left: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(33, 230, 255, 0.2);
  border-left: none;
  border-radius: 0 4px 4px 0;
  color: rgba(255, 255, 255, 0.95);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: all 0.25s ease;
  overflow-y: auto;
  overflow-x: auto;
}

.compact-textarea:focus {
  border-color: rgba(33, 230, 255, 0.4);
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 0 0 2px rgba(33, 230, 255, 0.1);
}

.compact-textarea.has-error {
  border-color: rgba(239, 68, 68, 0.4);
}

.compact-textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

/* 错误提示 */
.editor-error {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  color: rgb(239, 68, 68);
  font-size: 11px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  z-index: 10;
}

.editor-error i {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.error-message {
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.error-details {
  font-size: 10px;
  color: rgba(239, 68, 68, 0.8);
  line-height: 1.5;
  padding-top: 4px;
  border-top: 1px solid rgba(239, 68, 68, 0.2);
  white-space: pre-wrap;
}

/* 紧凑输出 */
.compact-output {
  flex: 1;
  margin: 0;
  padding: 10px;
  padding-left: 8px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(33, 230, 255, 0.2);
  border-left: none;
  border-radius: 0 4px 4px 0;
  overflow-y: auto;
  overflow-x: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.95);
  white-space: pre-wrap;
  word-break: break-word;
  height: 100%;
  max-height: none;
}

.compact-output code {
  background: none;
  border: none;
  padding: 0;
  color: rgba(255, 255, 255, 0.95);
  font-family: inherit;
  font-size: inherit;
}

/* 树形视图 */
.json-tree-compact {
  flex: 1;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(33, 230, 255, 0.2);
  border-radius: 4px;
  overflow: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.7;
}

.json-tree-compact__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  font-size: 12px;
}

/* 工具栏分隔线 */
.toolbar-divider {
  width: 1px;
  height: 16px;
  background: rgba(33, 230, 255, 0.2);
  flex-shrink: 0;
}

/* 滚动条样式 */
.compact-textarea::-webkit-scrollbar,
.compact-output::-webkit-scrollbar,
.json-tree-compact::-webkit-scrollbar,
.editor-error::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.compact-textarea::-webkit-scrollbar-track,
.compact-output::-webkit-scrollbar-track,
.json-tree-compact::-webkit-scrollbar-track,
.editor-error::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.compact-textarea::-webkit-scrollbar-thumb,
.compact-output::-webkit-scrollbar-thumb,
.json-tree-compact::-webkit-scrollbar-thumb,
.editor-error::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.compact-textarea::-webkit-scrollbar-thumb:hover,
.compact-output::-webkit-scrollbar-thumb:hover,
.json-tree-compact::-webkit-scrollbar-thumb:hover,
.editor-error::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.8);
}

/* 响应式 */
@media (max-width: 1200px) {
  .formatter-content {
    grid-template-columns: 1fr;
  }
  
  .formatter-desc {
    display: none;
  }
}

@media (max-width: 768px) {
  .formatter-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .formatter-toolbar__left,
  .formatter-toolbar__right {
    justify-content: space-between;
  }
}
</style>


