<template>
  <div class="calculator-page">
    <div class="calculator-container">
      <!-- 计算器主体 -->
      <div class="calculator">
        <!-- 显示屏 -->
        <div class="display-section">
          <div class="expression" v-if="currentExpression">
            {{ currentExpression }}
          </div>
          <div class="display">
            <input
              ref="displayInput"
              type="text"
              :value="formattedValue"
              @input="handleInput"
              @paste="handlePaste"
              @keydown="handleKeydown"
              class="display-input"
              spellcheck="false"
            />
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="buttons">
          <!-- 第一行 -->
          <button class="btn btn-secondary" @click="clear">C</button>
          <button class="btn btn-secondary" @click="backspace">⌫</button>
          <button class="btn btn-secondary" @click="percentage">%</button>
          <button class="btn btn-operator" @click="inputOperator('÷')">÷</button>

          <!-- 第二行 -->
          <button class="btn btn-number" @click="inputNumber('7')">7</button>
          <button class="btn btn-number" @click="inputNumber('8')">8</button>
          <button class="btn btn-number" @click="inputNumber('9')">9</button>
          <button class="btn btn-operator" @click="inputOperator('×')">×</button>

          <!-- 第三行 -->
          <button class="btn btn-number" @click="inputNumber('4')">4</button>
          <button class="btn btn-number" @click="inputNumber('5')">5</button>
          <button class="btn btn-number" @click="inputNumber('6')">6</button>
          <button class="btn btn-operator" @click="inputOperator('-')">−</button>

          <!-- 第四行 -->
          <button class="btn btn-number" @click="inputNumber('1')">1</button>
          <button class="btn btn-number" @click="inputNumber('2')">2</button>
          <button class="btn btn-number" @click="inputNumber('3')">3</button>
          <button class="btn btn-operator" @click="inputOperator('+')">+</button>

          <!-- 第五行 -->
          <button class="btn btn-number" @click="toggleSign">±</button>
          <button class="btn btn-number" @click="inputNumber('0')">0</button>
          <button class="btn btn-number" @click="inputDecimal">.</button>
          <button class="btn btn-equals" @click="calculate">=</button>
        </div>
      </div>

      <!-- 历史记录面板 -->
      <div class="history-panel">
        <div class="history-header">
          <h3>历史记录</h3>
          <button
            v-if="history.length > 0"
            @click="clearHistory"
            class="clear-history-btn"
            title="清空历史"
          >
            <i class="i-carbon-trash-can" />
          </button>
        </div>

        <div class="history-list" v-if="history.length > 0">
          <div
            v-for="record in history"
            :key="record.id"
            class="history-item"
            @click="restoreFromHistory(record)"
          >
            <div class="history-expression">{{ record.expression }}</div>
            <div class="history-result">= {{ formatNumber(record.result) }}</div>
            <div class="history-time">{{ formatTime(record.timestamp) }}</div>
            <button
              class="delete-btn"
              @click.stop="deleteHistory(record.id)"
              title="删除"
            >
              <i class="i-carbon-close" />
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <i class="i-carbon-calculator" />
          <p>暂无历史记录</p>
          <p class="hint">计算结果会自动保存</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCalculatorStore } from '@/stores/calculator'
import { ElMessage } from 'element-plus'

const calculatorStore = useCalculatorStore()
const {
  currentValue,
  currentExpression,
  history,
  formattedValue
} = storeToRefs(calculatorStore)

const {
  inputNumber,
  inputDecimal,
  inputOperator,
  calculate,
  clear,
  backspace,
  toggleSign,
  percentage,
  clearHistory,
  deleteHistory,
  restoreFromHistory,
  formatNumber,
  parseNumber
} = calculatorStore

const displayInput = ref<HTMLInputElement | null>(null)
const route = useRoute()
const isListenerActive = ref(false)

// 检查焦点是否在任何输入框中（除了计算器输入框）
const isFocusInInput = (): boolean => {
  const activeElement = document.activeElement
  
  // 如果没有焦点，返回 false
  if (!activeElement) return false
  
  // 如果焦点在计算器输入框，返回 false（允许拦截）
  if (activeElement === displayInput.value) return false
  
  // 检查是否在输入框或文本域中
  const tagName = activeElement.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') {
    return true
  }
  
  // 检查是否在可编辑元素中
  if (activeElement.hasAttribute('contenteditable')) {
    return true
  }
  
  return false
}

// 处理输入框输入（支持复制粘贴）
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 移除非数字字符（保留数字、小数点、逗号、负号）
  value = value.replace(/[^\d.,-]/g, '')

  // 移除逗号
  const rawValue = parseNumber(value)

  // 验证是否是有效数字
  if (rawValue === '' || rawValue === '-' || !isNaN(parseFloat(rawValue))) {
    currentValue.value = rawValue
  }
}

// 处理粘贴
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  
  const pastedText = event.clipboardData?.getData('text')
  if (!pastedText) return

  // 移除非数字字符
  const cleaned = pastedText.replace(/[^\d.,-]/g, '')
  const rawValue = parseNumber(cleaned)

  if (rawValue && !isNaN(parseFloat(rawValue))) {
    currentValue.value = rawValue
    ElMessage.success('已粘贴数字')
  } else {
    ElMessage.warning('粘贴的内容不是有效数字')
  }
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  const key = event.key

  // 数字键
  if (/^[0-9]$/.test(key)) {
    event.preventDefault()
    inputNumber(key)
  }
  // 运算符
  else if (key === '+') {
    event.preventDefault()
    inputOperator('+')
  } else if (key === '-') {
    event.preventDefault()
    inputOperator('-')
  } else if (key === '*') {
    event.preventDefault()
    inputOperator('×')
  } else if (key === '/') {
    event.preventDefault()
    inputOperator('÷')
  } else if (key === '%') {
    event.preventDefault()
    percentage()
  }
  // Enter 或 =
  else if (key === 'Enter' || key === '=') {
    event.preventDefault()
    calculate()
  }
  // Backspace
  else if (key === 'Backspace') {
    event.preventDefault()
    backspace()
  }
  // Escape
  else if (key === 'Escape') {
    event.preventDefault()
    clear()
  }
  // 小数点
  else if (key === '.') {
    event.preventDefault()
    inputDecimal()
  }
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}

// 键盘事件监听
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // 只有在计算器页面且监听器激活时才处理
  if (!isListenerActive.value) return
  
  // 检查当前路由是否是计算器页面（使用路由名称或路径）
  if (route.name !== 'Calculator' && !route.path.includes('calculator')) return
  
  // 如果焦点在其他输入框中，不拦截（让用户正常输入）
  if (isFocusInInput()) return
  
  // 如果焦点不在计算器输入框，也响应键盘事件（用于全局快捷键）
  if (document.activeElement !== displayInput.value) {
    handleKeydown(event)
  }
}

onMounted(() => {
  // 聚焦输入框
  displayInput.value?.focus()
  
  // 监听全局键盘事件
  window.addEventListener('keydown', handleGlobalKeydown)
  isListenerActive.value = true
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  isListenerActive.value = false
})

// 处理 keep-alive 的激活/停用
onActivated(() => {
  // 组件被激活（从其他页面切回计算器页面）
  if (!isListenerActive.value) {
    window.addEventListener('keydown', handleGlobalKeydown)
    isListenerActive.value = true
  }
  displayInput.value?.focus()
})

onDeactivated(() => {
  // 组件被停用（切换到其他页面）
  window.removeEventListener('keydown', handleGlobalKeydown)
  isListenerActive.value = false
})
</script>

<style scoped>
.calculator-page {
  padding: var(--spacing-md);
  height: 100vh;
  overflow: hidden;
}

.calculator-container {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: var(--spacing-md);
  height: calc(100vh - var(--spacing-md) * 2);
}

/* 计算器主体 */
.calculator {
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 100%;
  overflow: hidden;
}

/* 显示屏 */
.display-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  flex-shrink: 0;
}

.expression {
  color: var(--neon-blue);
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 4px;
  text-align: right;
  font-family: 'Courier New', monospace;
  line-height: 1.4;
}

.display {
  position: relative;
}

.display-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 36px;
  font-weight: bold;
  text-align: right;
  font-family: 'Courier New', monospace;
  cursor: text;
}

.display-input::selection {
  background: var(--neon-blue);
  color: var(--color-bg);
}

/* 按钮区域 */
.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  color: var(--color-text);
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--neon-blue);
  box-shadow: 0 0 10px rgba(33, 230, 255, 0.3);
}

.btn:active {
  transform: scale(0.95);
}

.btn-number {
  background: rgba(255, 255, 255, 0.08);
}

.btn-operator {
  background: rgba(33, 230, 255, 0.15);
  border-color: var(--neon-blue);
  color: var(--neon-blue);
}

.btn-operator:hover {
  background: rgba(33, 230, 255, 0.25);
}

.btn-equals {
  background: var(--neon-blue);
  color: var(--color-bg);
  font-size: 20px;
  font-weight: bold;
}

.btn-equals:hover {
  background: var(--neon-cyan);
  box-shadow: 0 0 20px rgba(33, 230, 255, 0.5);
}

.btn-secondary {
  background: rgba(255, 107, 237, 0.15);
  border-color: var(--neon-pink);
  color: var(--neon-pink);
}

.btn-secondary:hover {
  background: rgba(255, 107, 237, 0.25);
}

/* 历史记录面板 */
.history-panel {
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  max-height: 100%;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.history-header h3 {
  color: var(--neon-blue);
  font-size: 16px;
  margin: 0;
  font-weight: 600;
}

.clear-history-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--border-radius-sm);
  color: #ef4444;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.clear-history-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* 霓虹风格滚动条 */
.history-list::-webkit-scrollbar {
  width: 8px;
}

.history-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb {
  background: rgba(33, 230, 255, 0.5);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 230, 255, 0.8);
}

.history-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.history-item:hover {
  background: rgba(33, 230, 255, 0.1);
  border-color: var(--neon-blue);
  box-shadow: 0 0 15px rgba(33, 230, 255, 0.2);
}

.history-expression {
  color: var(--color-text);
  font-size: 14px;
  font-family: 'Courier New', monospace;
  margin-bottom: 4px;
  line-height: 1.4;
}

.history-result {
  color: var(--neon-blue);
  font-size: 16px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  margin-bottom: 4px;
  line-height: 1.4;
}

.history-time {
  color: var(--color-text-secondary);
  font-size: 11px;
  opacity: 0.7;
}

.delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 50%;
  color: #ef4444;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  font-size: 12px;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  gap: var(--spacing-sm);
}

.empty-state i {
  font-size: 48px;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
}

.empty-state .hint {
  font-size: 14px;
  opacity: 0.7;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .calculator-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .calculator {
    max-width: 360px;
    margin: 0 auto;
  }
}
</style>

