import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

export interface Word {
  id: string
  word: string // 单词
  phonetic?: string // 音标
  translation: string // 翻译
  example?: string // 例句
  note?: string // 备注
  tags: string[] // 标签
  source?: string // 来源（如：第几课）
  isMastered: boolean // 是否已掌握
  reviewCount: number // 复习次数
  lastReviewAt?: number // 最后复习时间
  createdAt: number
  updatedAt: number
}

const STORAGE_FILE = 'english/wordbook.json'

export const useWordbookStore = defineStore('wordbook', () => {
  // ========== 状态 ==========
  const words = ref<Word[]>([])
  const isLoading = ref(false)
  const searchText = ref('')
  const selectedTags = ref<string[]>([])
  const showMastered = ref(true) // 是否显示已掌握的单词
  const sortBy = ref<'createdAt' | 'updatedAt' | 'word' | 'reviewCount'>('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  
  // 分页
  const pageSize = ref(50) // 每页显示数量
  const currentPage = ref(1) // 当前页码

  // ========== 计算属性 ==========
  const allTags = computed(() => {
    const tagSet = new Set<string>()
    words.value.forEach(word => {
      word.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  })

  const filteredWords = computed(() => {
    let result = [...words.value]

    // 搜索过滤
    if (searchText.value) {
      const query = searchText.value.toLowerCase()
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(query) ||
          w.translation.toLowerCase().includes(query) ||
          w.example?.toLowerCase().includes(query) ||
          w.note?.toLowerCase().includes(query) ||
          w.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    // 标签过滤
    if (selectedTags.value.length > 0) {
      result = result.filter((w) =>
        selectedTags.value.every((tag) => w.tags.includes(tag))
      )
    }

    // 已掌握过滤
    if (!showMastered.value) {
      result = result.filter((w) => !w.isMastered)
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy.value) {
        case 'word':
          comparison = a.word.localeCompare(b.word)
          break
        case 'reviewCount':
          comparison = a.reviewCount - b.reviewCount
          break
        case 'createdAt':
          comparison = a.createdAt - b.createdAt
          break
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt
          break
      }
      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  // 分页后的单词列表
  const paginatedWords = computed(() => {
    const filtered = filteredWords.value
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filtered.slice(start, end)
  })

  // 分页信息
  const pagination = computed(() => {
    const total = filteredWords.value.length
    const totalPages = Math.ceil(total / pageSize.value)
    return {
      total,
      pageSize: pageSize.value,
      currentPage: currentPage.value,
      totalPages,
      hasNextPage: currentPage.value < totalPages,
      hasPrevPage: currentPage.value > 1,
    }
  })

  const stats = computed(() => {
    const total = words.value.length
    const mastered = words.value.filter((w) => w.isMastered).length
    const needReview = words.value.filter((w) => !w.isMastered).length
    return { total, mastered, needReview }
  })

  // ========== 数据加载和保存 ==========
  async function loadWords() {
    if (isLoading.value) return
    isLoading.value = true

    try {
      if (window.electronAPI) {
        const exists = await window.electronAPI.fileExists?.(STORAGE_FILE)
        if (exists) {
          const result = await window.electronAPI.readFile?.(STORAGE_FILE)
          if (result?.success && result.data) {
            words.value = JSON.parse(result.data)
          }
        }
      } else {
        const saved = localStorage.getItem(STORAGE_FILE)
        if (saved) {
          words.value = JSON.parse(saved)
        }
      }
    } catch (error) {
      console.error('加载单词本失败:', error)
      ElMessage.error('加载单词本失败')
    } finally {
      isLoading.value = false
    }
  }

  async function saveWords() {
    try {
      const payload = JSON.stringify(words.value, null, 2)
      if (window.electronAPI) {
        await window.electronAPI.writeFile?.(STORAGE_FILE, payload, false)
      } else {
        localStorage.setItem(STORAGE_FILE, payload)
      }
    } catch (error) {
      console.error('保存单词本失败:', error)
      ElMessage.error('保存单词本失败')
    }
  }

  // ========== CRUD 操作 ==========
  function addWord(word: Omit<Word, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount'>) {
    const newWord: Word = {
      ...word,
      id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reviewCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    words.value.push(newWord)
    saveWords()
    return newWord
  }

  function updateWord(id: string, updates: Partial<Word>) {
    const index = words.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      words.value[index] = {
        ...words.value[index],
        ...updates,
        updatedAt: Date.now(),
      }
      saveWords()
      return words.value[index]
    }
    return null
  }

  function deleteWord(id: string) {
    const index = words.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      words.value.splice(index, 1)
      saveWords()
      return true
    }
    return false
  }

  function getWord(id: string): Word | undefined {
    return words.value.find((w) => w.id === id)
  }

  function wordExists(word: string): boolean {
    return words.value.some((w) => w.word.toLowerCase() === word.toLowerCase())
  }

  // ========== 单词操作 ==========
  function toggleMastered(id: string) {
    const word = getWord(id)
    if (word) {
      updateWord(id, {
        isMastered: !word.isMastered,
        lastReviewAt: Date.now(),
        reviewCount: word.reviewCount + 1,
      })
    }
  }

  function addReview(id: string) {
    const word = getWord(id)
    if (word) {
      updateWord(id, {
        reviewCount: word.reviewCount + 1,
        lastReviewAt: Date.now(),
      })
    }
  }

  // ========== 批量操作 ==========
  function deleteWords(ids: string[]) {
    words.value = words.value.filter((w) => !ids.includes(w.id))
    saveWords()
  }

  function toggleMasteredBatch(ids: string[], mastered: boolean) {
    ids.forEach((id) => {
      const word = getWord(id)
      if (word) {
        updateWord(id, {
          isMastered: mastered,
          lastReviewAt: Date.now(),
          reviewCount: word.reviewCount + 1,
        })
      }
    })
  }

  // ========== 导出导入 ==========
  function exportData() {
    const data = JSON.stringify(words.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wordbook_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  }

  async function importData(data: Word[]) {
    try {
      words.value = data
      await saveWords()
      ElMessage.success('导入成功')
    } catch (error) {
      console.error('导入失败:', error)
      ElMessage.error('导入失败')
    }
  }

  /**
   * 从文本文件导入单词（制表符分隔格式）
   * 格式：id, word, phonetic, type, translate, distortion, phrase, samples
   */
  async function importFromTextFile(filePath: string): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
    try {
      if (!window.electronAPI && !window.electron?.english) {
        return { success: false, imported: 0, skipped: 0, error: 'Electron API 不可用' }
      }

      // 判断是否为绝对路径
      const isAbsolute = filePath.match(/^[A-Za-z]:\\|^\/|^\\\\/) !== null
      
      let result: { success: boolean; data?: string; error?: string }
      
      if (isAbsolute) {
        // 绝对路径：使用 english.readFile（支持绝对路径）
        if (!window.electron?.english) {
          return { success: false, imported: 0, skipped: 0, error: 'English API 不可用' }
        }
        result = await window.electron.english.readFile(filePath, 'utf-8')
      } else {
        // 相对路径：使用 electronAPI.readFile（基于 appData 目录）
        if (!window.electronAPI) {
          return { success: false, imported: 0, skipped: 0, error: 'Electron API 不可用' }
        }
        result = await window.electronAPI.readFile(filePath)
      }
      
      if (!result.success || !result.data) {
        return { success: false, imported: 0, skipped: 0, error: result.error || '读取文件失败' }
      }

      const content = result.data
      
      // 解析整个文件（处理跨行的字段）
      const records = parseTSVContent(content)
      
      if (records.length < 2) {
        return { success: false, imported: 0, skipped: 0, error: '文件格式错误：至少需要表头和数据行' }
      }

      // 解析表头
      const headers = records[0]
      const expectedHeaders = ['id', 'word', 'phonetic', 'type', 'translate', 'distortion', 'phrase', 'samples']
      
      // 验证表头
      if (!headers.every(h => expectedHeaders.includes(h.toLowerCase().replace(/^"|"$/g, '')))) {
        return { success: false, imported: 0, skipped: 0, error: '文件格式错误：表头不匹配' }
      }

      // 解析数据行
      let imported = 0
      let skipped = 0
      const existingWords = new Set(words.value.map(w => w.word.toLowerCase()))

      for (let i = 1; i < records.length; i++) {
        const fields = records[i]
        if (fields.length < 2) continue // 至少需要 id 和 word

        try {
          // 清理字段（移除首尾引号，但保留内容中的引号）
          const cleanFields = fields.map(f => {
            let cleaned = f.trim()
            // 如果字段以引号开始和结束，移除它们
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
              cleaned = cleaned.substring(1, cleaned.length - 1)
              // 处理转义的引号 "" -> "
              cleaned = cleaned.replace(/""/g, '"')
            }
            return cleaned
          })
          
          // 调试：打印前几条记录
          if (i <= 3) {
            console.log(`[调试] 记录 ${i}:`, {
              fieldsCount: cleanFields.length,
              fields: cleanFields.map((f, idx) => `${idx}: ${f.substring(0, 50)}...`)
            })
          }
          
          const wordText = cleanFields[1] || ''
          if (!wordText) continue

          // 检查是否已存在
          if (existingWords.has(wordText.toLowerCase())) {
            skipped++
            continue
          }

          // 提取字段（根据表头顺序：id, word, phonetic, type, translate, distortion, phrase, samples）
          const phonetic = cleanFields[2] || ''
          const translate = cleanFields[4] || ''
          const distortion = cleanFields[5] || ''
          const phrase = cleanFields[6] || ''
          const samples = cleanFields[7] || ''
          
          // 调试：打印提取的字段
          if (i <= 3) {
            console.log(`[调试] 单词 ${wordText}:`, {
              phonetic: phonetic.substring(0, 50),
              translate: translate.substring(0, 50),
              phrase: phrase.substring(0, 50),
              samples: samples.substring(0, 100)
            })
          }

          // 提取例句（从 samples 字段中提取第一个英文例句）
          let example = ''
          if (samples) {
            // 方法1: 尝试提取三重引号格式的例句 """..."（可能后面还有引号）
            const tripleQuoteMatch = samples.match(/^"""([^"]+?)""?/)
            if (tripleQuoteMatch && tripleQuoteMatch[1]) {
              const candidate = tripleQuoteMatch[1].trim()
              if (/^[A-Z]/.test(candidate) && candidate.length > 10) {
                example = candidate
              }
            }
            
            // 方法2: 如果方法1没找到，尝试逐行查找
            if (!example) {
              const lines = samples.split(/\r?\n/).filter(l => l.trim())
              for (const line of lines) {
                // 查找被引号包围的英文句子
                // 匹配格式: "..." 或 """..." 或 """..."""
                const match = line.match(/^"{1,3}([^"]+?)"{0,3}/)
                if (match && match[1]) {
                  const candidate = match[1].trim()
                  // 检查是否是英文句子（以大写字母开头，包含空格，长度足够）
                  if (/^[A-Z]/.test(candidate) && candidate.includes(' ') && candidate.length > 10) {
                    example = candidate
                    break
                  }
                }
              }
            }
          }

          // 构建备注信息（包含短语、变形等信息）
          const noteParts: string[] = []
          if (phrase) {
            noteParts.push(`短语: ${phrase}`)
          }
          if (distortion) {
            noteParts.push(`变形: ${distortion}`)
          }
          const note = noteParts.length > 0 ? noteParts.join('\n') : undefined

          // 如果没有例句，尝试从短语中提取（查找第一个英文短语）
          if (!example && phrase) {
            const phraseLines = phrase.split(/\r?\n/).filter(l => l.trim())
            // 查找第一个看起来像英文短语的行（以字母开头，不包含中文，长度足够）
            for (const line of phraseLines) {
              const trimmed = line.trim()
              if (/^[A-Za-z]/.test(trimmed) && !/[\u4e00-\u9fa5]/.test(trimmed) && trimmed.length > 3) {
                example = trimmed
                break
              }
            }
          }

          // 创建单词对象
          const newWord: Word = {
            id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            word: wordText,
            phonetic: phonetic || undefined,
            translation: translate || '',
            example: example || undefined,
            note: note,
            tags: [],
            isMastered: false,
            reviewCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }

          words.value.push(newWord)
          existingWords.add(wordText.toLowerCase())
          imported++
        } catch (error) {
          console.warn(`解析第 ${i + 1} 条记录失败:`, error)
          skipped++
        }
      }

      // 保存
      await saveWords()
      
      return { success: true, imported, skipped }
    } catch (error) {
      console.error('导入文本文件失败:', error)
      return { success: false, imported: 0, skipped: 0, error: (error as Error).message }
    }
  }

  /**
   * 解析 TSV 内容（处理引号、换行和跨行字段）
   * 使用状态机方式解析，正确处理字段内的换行符
   */
  function parseTSVContent(content: string): string[][] {
    const records: string[][] = []
    let currentRecord: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0
    
    while (i < content.length) {
      const char = content[i]
      const nextChar = content[i + 1]
      const nextNextChar = content[i + 2]
      
      if (char === '"') {
        // 检查是否是转义的引号 ""
        if (nextChar === '"' && (!inQuotes || content[i + 2] !== '"')) {
          // 转义的引号（在引号内，且不是三重引号）
          if (inQuotes) {
            currentField += '"'
            i += 2
          } else {
            // 不在引号内，可能是字段开始
            inQuotes = true
            i++
          }
        } else if (nextChar === '"' && nextNextChar === '"') {
          // 三重引号 """..."""
          currentField += '"""'
          i += 3
          // 继续查找结束的三重引号
          while (i < content.length - 2) {
            if (content[i] === '"' && content[i + 1] === '"' && content[i + 2] === '"') {
              currentField += '"""'
              i += 3
              break
            }
            currentField += content[i]
            i++
          }
        } else {
          // 普通引号：切换引号状态
          inQuotes = !inQuotes
          i++
        }
      } else if (char === '\t' && !inQuotes) {
        // 制表符：字段分隔符（不在引号内）
        currentRecord.push(currentField)
        currentField = ''
        i++
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // 换行符：记录分隔符（不在引号内）
        // 添加当前字段
        if (currentField || currentRecord.length > 0) {
          currentRecord.push(currentField)
        }
        
        // 如果当前记录有内容，保存它
        if (currentRecord.length > 0 && currentRecord.some(f => f.trim())) {
          records.push(currentRecord)
        }
        
        // 重置
        currentRecord = []
        currentField = ''
        
        // 跳过 \r\n 组合
        if (char === '\r' && nextChar === '\n') {
          i += 2
        } else {
          i++
        }
      } else {
        // 普通字符：添加到当前字段
        currentField += char
        i++
      }
    }
    
    // 处理最后一条记录
    if (currentField || currentRecord.length > 0) {
      currentRecord.push(currentField)
      if (currentRecord.length > 0 && currentRecord.some(f => f.trim())) {
        records.push(currentRecord)
      }
    }
    
    return records
  }

  // ========== 分页操作 ==========
  function setPage(page: number) {
    const totalPages = Math.ceil(filteredWords.value.length / pageSize.value)
    currentPage.value = Math.max(1, Math.min(page, totalPages))
  }

  function setPageSize(size: number) {
    pageSize.value = Math.max(1, size)
    // 重新计算当前页，确保不超出范围
    const totalPages = Math.ceil(filteredWords.value.length / pageSize.value)
    if (currentPage.value > totalPages) {
      currentPage.value = Math.max(1, totalPages)
    }
  }

  function nextPage() {
    const totalPages = Math.ceil(filteredWords.value.length / pageSize.value)
    if (currentPage.value < totalPages) {
      currentPage.value++
    }
  }

  function prevPage() {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  // 当过滤条件变化时，重置到第一页
  watch([searchText, selectedTags, showMastered], () => {
    currentPage.value = 1
  })

  // ========== 初始化 ==========
  function init() {
    loadWords()
  }

  return {
    // 状态
    words,
    isLoading,
    searchText,
    selectedTags,
    showMastered,
    sortBy,
    sortOrder,
    pageSize,
    currentPage,
    // 计算属性
    allTags,
    filteredWords,
    paginatedWords,
    pagination,
    stats,
    // 方法
    loadWords,
    saveWords,
    addWord,
    updateWord,
    deleteWord,
    getWord,
    wordExists,
    toggleMastered,
    addReview,
    deleteWords,
    toggleMasteredBatch,
    exportData,
    importData,
    importFromTextFile,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    init,
  }
})

