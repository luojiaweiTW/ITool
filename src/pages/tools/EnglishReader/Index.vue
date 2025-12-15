<template>
  <div class="english-reader-layout">
    <!-- Sidebar: Navigation & Config -->
    <aside class="reader-sidebar">
      <div class="sidebar-header">
        <div class="app-title">
          <i class="i-mdi-book-education-outline text-neon-cyan" />
          <span>新概念英语</span>
        </div>
        <div class="sidebar-actions">
           <el-tooltip content="刷新数据" placement="bottom">
            <button class="icon-btn" :disabled="!canReload" @click="reloadDataset">
              <i class="i-mdi-refresh" :class="{ 'animate-spin': datasetLoading }" />
            </button>
          </el-tooltip>
          <el-tooltip content="选择数据目录" placement="bottom">
            <button class="icon-btn" :disabled="!electronReady" @click="handleSelectDataset">
              <i class="i-mdi-cog-outline" />
            </button>
          </el-tooltip>
        </div>
      </div>

      <!-- Dataset Warning -->
      <div v-if="!datasetReady || datasetError" class="sidebar-alert">
         <div v-if="datasetError" class="text-red-400 text-xs flex items-center gap-1">
            <i class="i-mdi-alert-circle" /> {{ datasetError }}
         </div>
         <div v-else-if="!config.datasetPath" class="text-yellow-400 text-xs flex items-center gap-1">
            <i class="i-mdi-folder-alert" /> 请配置数据目录
         </div>
      </div>

      <!-- Book Selector -->
      <div class="book-tabs">
        <button
          v-for="book in englishBooks"
          :key="book.id"
          class="book-tab"
          :class="{ active: book.id === selectedBook }"
          @click="selectBook(book.id)"
          :title="book.title + ' - ' + book.subtitle"
        >
          <span class="book-id">{{ book.id.replace('NCE', '') }}</span>
          <span class="book-label">册</span>
        </button>
      </div>

      <!-- Lesson Search -->
      <div class="lesson-search-wrapper">
        <NeonInput
          v-model="lessonSearch"
          placeholder="搜索标题..."
          clearable
          class="w-full"
        >
          <template #prefix>
            <i class="i-mdi-magnify" />
          </template>
        </NeonInput>
      </div>

      <!-- Lesson List -->
      <div class="lesson-list-container scrollbar">
        <div v-if="datasetLoading" class="loading-state">
           <el-icon class="is-loading"><Loading /></el-icon>
           <span>加载中...</span>
        </div>
        
        <EmptyState
          v-else-if="!filteredLessons.length"
          :title="datasetReady ? '无搜索结果' : '等待数据'"
          :description="datasetReady ? '换个关键词试试' : '请先配置正确的 NCE 数据目录'"
          class="py-8"
        />

        <div v-else class="lesson-list">
          <div
            v-for="(lesson, index) in filteredLessons"
            :key="lesson.filename"
            class="lesson-item"
            :class="{ active: lesson.filename === selectedLesson?.filename }"
            @click="handleLessonClick(lesson)"
          >
            <div class="lesson-progress-indicator">
              <div 
                class="progress-ring" 
                :style="{ '--progress': getLessonProgressPercent(lesson) + '%' }"
                :title="`学习进度: ${getLessonProgressPercent(lesson)}%`"
              ></div>
            </div>
            <div class="lesson-info">
              <div class="lesson-header">
                <span class="lesson-index">{{ formatLessonNumber(index, selectedBook) }}</span>
                <span class="lesson-title truncate">{{ lesson.title }}</span>
              </div>
              <div class="lesson-sub">{{ lesson.filename }}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content: Player & Reader -->
    <main class="reader-main">
      <div v-if="!selectedLesson" class="empty-selection">
        <div class="empty-content">
          <i class="i-mdi-book-open-page-variant-outline text-6xl text-gray-700 mb-4" />
          <h2>开始学习</h2>
          <p>请从左侧列表选择一课</p>
        </div>
      </div>

      <template v-else>
        <!-- Sticky Header with Player -->
        <header class="reader-header">
          <div class="header-content">
            <div class="lesson-breadcrumbs">
               <span class="text-neon-cyan">{{ currentBook?.title }}</span>
               <span class="separator">/</span>
               <span class="text-white">{{ selectedLesson.title }}</span>
            </div>
            
            <div class="audio-player-compact">
               <audio
                ref="audioRef"
                :src="audioUrl"
                preload="auto"
                @play="isPlaying = true"
                @pause="isPlaying = false"
              />
              
              <button class="play-btn" @click="togglePlay">
                <i :class="isPlaying ? 'i-mdi-pause' : 'i-mdi-play'" />
              </button>

              <div class="progress-bar-wrapper" @click="seekAudio">
                <div class="progress-bar-bg">
                   <div class="progress-bar-fill" :style="{ width: playbackStats.percent + '%' }"></div>
                </div>
              </div>
              
              <div class="time-display">
                {{ formatTimestamp(playbackStats.currentTime) }} / {{ formatTimestamp(playbackStats.duration) }}
              </div>
              
              <!-- 显示模式切换按钮 -->
              <div class="display-mode-toggle">
                <button 
                  class="mode-btn" 
                  :class="{ active: displayMode === 'both' }"
                  @click="displayMode = 'both'"
                  title="中英文"
                >
                  <i class="i-mdi-translate" />
                </button>
                <button 
                  class="mode-btn" 
                  :class="{ active: displayMode === 'en' }"
                  @click="displayMode = 'en'"
                  title="仅英文"
                >
                  <span class="mode-text">EN</span>
                </button>
                <button 
                  class="mode-btn" 
                  :class="{ active: displayMode === 'cn' }"
                  @click="displayMode = 'cn'"
                  title="仅中文"
                >
                  <span class="mode-text">中</span>
                </button>
              </div>
              
              <!-- 自动播放控制按钮 -->
              <div class="auto-play-toggle">
                <button 
                  class="auto-play-btn" 
                  :class="{ active: config.autoPlay }"
                  @click="toggleAutoPlay"
                  title="自动播放当前章节"
                >
                  <i class="i-mdi-play-circle-outline" />
                </button>
                <button 
                  class="auto-play-btn" 
                  :class="{ active: config.autoPlayNext }"
                  @click="toggleAutoPlayNext"
                  title="自动播放下一章节"
                >
                  <i class="i-mdi-skip-next-circle-outline" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Scrolling Content -->
        <div class="reader-content scrollbar" ref="sentenceListRef">
            <div v-if="isLessonLoading" class="content-loading">
              <el-icon class="is-loading text-3xl mb-2"><Loading /></el-icon>
              <p>加载课文资源...</p>
            </div>

            <div v-else-if="sentences.length === 0" class="empty-selection">
              <i class="i-mdi-text-box-remove-outline text-5xl mb-4 text-gray-500" />
              <p>未找到课文内容</p>
              <p class="text-xs text-gray-500 mt-2">请检查 LRC 文件格式是否正确</p>
            </div>

            <div v-else class="sentences-wrapper">
               <div
                v-for="(sentence, idx) in sentences"
                :key="sentence.start + '_' + idx"
                class="sentence-row"
                :data-idx="idx"
                :class="{ active: idx === activeSentenceIndex }"
                @click="handleSentenceClick($event, idx)"
              >
                <div class="sentence-marker">
                   <i class="i-mdi-play-circle" v-if="idx === activeSentenceIndex" />
                   <span v-else class="index-num">{{ idx + 1 }}</span>
                </div>
                <div class="sentence-text">
                   <div 
                     class="text-en selectable" 
                     v-if="displayMode === 'both' || displayMode === 'en'"
                     @dblclick="handleWordSelect($event, sentence.en)"
                     @mouseup="handleTextSelect"
                     title="双击或选中文本添加单词"
                   >
                     {{ sentence.en }}
                   </div>
                   <div class="text-cn" v-if="(displayMode === 'both' || displayMode === 'cn') && sentence.cn">{{ sentence.cn }}</div>
                </div>
              </div>
              
              <!-- Bottom Spacer for comfortable reading -->
              <div class="h-32"></div>
            </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import EmptyState from '@/components/EmptyState.vue'
import type { EnglishAPI } from '@/types/electron'
import { useWordbookStore } from '@/stores/wordbook'

const wordbookStore = useWordbookStore()

// Types
type BookId = 'NCE1' | 'NCE2' | 'NCE3' | 'NCE4'

interface LessonMeta {
  title: string
  filename: string
}

interface SentenceItem {
  en: string
  cn: string
  start: number
  end: number
}

interface LessonProgress {
  lastSentenceIndex: number
  currentTime: number
  percentage: number
  updatedAt: number
}

interface LrcMeta {
  album: string
  artist: string
  by: string
  title: string
}

// Constants
const CONFIG_FILE = 'english/config.json'
const PROGRESS_FILE = 'english/progress.json'
const LOCAL_STORAGE_KEY = 'english-config-browser'
const LOCAL_PROGRESS_KEY = 'english-progress-browser'

const englishBooks: Array<{ id: BookId, title: string, subtitle: string, summary: string, lessons: number }>
= [
  { id: 'NCE1', title: '第一册', subtitle: 'First Things First', summary: '英语初阶', lessons: 144 },
  { id: 'NCE2', title: '第二册', subtitle: 'Practice and Progress', summary: '实践与进步', lessons: 96 },
  { id: 'NCE3', title: '第三册', subtitle: 'Developing Skills', summary: '培养技能', lessons: 60 },
  { id: 'NCE4', title: '第四册', subtitle: 'Fluency in English', summary: '流利表达', lessons: 48 },
]

// State
const config = reactive({
  datasetPath: '',
  lastBook: 'NCE1' as BookId,
  lastLesson: '',
  autoPlay: false, // 是否自动播放当前章节
  autoPlayNext: false, // 是否自动播放下一章节
})

const lessonsData = ref<Record<string, LessonMeta[]>>({})
const datasetLoading = ref(false)
const datasetError = ref('')
const lessonSearch = ref('')
const selectedBook = ref<BookId>('NCE1')
const selectedLesson = ref<LessonMeta | null>(null)
const sentences = ref<SentenceItem[]>([])
const lessonMeta = reactive<LrcMeta>({
  album: '',
  artist: '',
  by: '',
  title: '',
})
const audioUrl = ref('')
const audioRef = ref<HTMLAudioElement | null>(null)
const sentenceListRef = ref<HTMLElement | null>(null)
const activeSentenceIndex = ref(-1)
const segmentEnd = ref(0)
const isLessonLoading = ref(false)
const isPlaying = ref(false)
const displayMode = ref<'both' | 'en' | 'cn'>('both') // 显示模式：both=中英文, en=仅英文, cn=仅中文

const progressMap = reactive<Record<BookId, Record<string, LessonProgress>>>({
  NCE1: {},
  NCE2: {},
  NCE3: {},
  NCE4: {},
})

const playbackStats = reactive({
  currentTime: 0,
  duration: 0,
  percent: 0,
})

const pendingSeekTime = ref(0)
let progressSaveTimer: ReturnType<typeof setTimeout> | null = null

const englishAPI = window.electron?.english as EnglishAPI | undefined
const electronReady = computed(() => Boolean(englishAPI))
const datasetReady = computed(() => electronReady.value && !!config.datasetPath && Object.keys(lessonsData.value).length > 0)
const currentBook = computed(() => englishBooks.find(book => book.id === selectedBook.value))
const canReload = computed(() => electronReady.value && !!config.datasetPath && !datasetLoading.value)

const filteredLessons = computed(() => {
  const bookIndex = getBookIndex(selectedBook.value)
  const lessons = lessonsData.value[bookIndex] || []
  if (!lessonSearch.value.trim()) return lessons
  const keyword = lessonSearch.value.trim().toLowerCase()
  return lessons.filter(item => item.title.toLowerCase().includes(keyword) || item.filename.toLowerCase().includes(keyword))
})

// Lifecycle
onMounted(async () => {
  await loadConfig()
  await loadProgress()
  wordbookStore.init() // 初始化单词本
  
  // 配置加载完成后，如果 Electron API 已就绪且有数据路径，自动加载数据
  if (config.datasetPath && electronReady.value && Object.keys(lessonsData.value).length === 0) {
    await loadDataset(config.datasetPath)
  }
})

onBeforeUnmount(() => {
  detachAudioListeners()
  if (progressSaveTimer) {
    clearTimeout(progressSaveTimer)
    progressSaveTimer = null
  }
  saveProgressSnapshot().catch(error => console.error('保存学习进度失败:', error))
})

// Watchers
// 监听 Electron API 就绪状态和配置路径，自动加载数据（处理延迟就绪的情况）
watch([electronReady, () => config.datasetPath], async ([ready, path]) => {
  if (ready && path && !datasetLoading.value && Object.keys(lessonsData.value).length === 0) {
    await loadDataset(path)
  }
})

watch(selectedBook, async (book) => {
  if (config.lastBook !== book) {
    config.lastBook = book
    await saveConfig()
  }
  if (datasetReady.value) {
    restoreLessonSelection()
  }
})

watch(filteredLessons, (list) => {
  if (!list.length) {
    selectedLesson.value = null
    sentences.value = []
    return
  }
  if (!selectedLesson.value) return
  const found = list.find(item => item.filename === selectedLesson.value?.filename)
  if (!found) {
    // Don't auto-select on search unless necessary, or logic can be refined
    // Keeping simple: if current selection is lost, deselect
    selectedLesson.value = null
  }
})

watch(audioRef, (audio, prev) => {
  if (prev) {
    prev.removeEventListener('timeupdate', handleTimeUpdate)
    prev.removeEventListener('ended', handleAudioEnded)
    prev.removeEventListener('loadedmetadata', handleLoadedMetadata)
    prev.removeEventListener('play', () => isPlaying.value = true)
    prev.removeEventListener('pause', () => isPlaying.value = false)
  }
  if (audio) {
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleAudioEnded)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', () => isPlaying.value = true)
    audio.addEventListener('pause', () => isPlaying.value = false)
  }
})

// Logic Methods
async function loadConfig() {
  try {
    if (window.electronAPI) {
      const exists = await window.electronAPI.fileExists?.(CONFIG_FILE)
      if (exists) {
        const result = await window.electronAPI.readFile?.(CONFIG_FILE)
        if (result?.success && result.data) {
          applyConfig(JSON.parse(result.data))
          return
        }
      }
    } else {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        applyConfig(JSON.parse(saved))
      }
    }
  } catch (error) {
    console.error('加载英语配置失败:', error)
  }
}

function applyConfig(data: Partial<typeof config>) {
  if (data.datasetPath) config.datasetPath = data.datasetPath
  if (data.lastBook && isBookId(data.lastBook)) {
    config.lastBook = data.lastBook
    selectedBook.value = data.lastBook
  }
  if (data.lastLesson) config.lastLesson = data.lastLesson
  if (typeof data.autoPlay === 'boolean') config.autoPlay = data.autoPlay
  if (typeof data.autoPlayNext === 'boolean') config.autoPlayNext = data.autoPlayNext
}

async function saveConfig() {
  try {
    const payload = JSON.stringify(config, null, 2)
    if (window.electronAPI) {
      await window.electronAPI.writeFile?.(CONFIG_FILE, payload, false)
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, payload)
    }
  } catch (error) {
    console.error('保存英语配置失败:', error)
  }
}

async function loadProgress() {
  try {
    let snapshot: Record<string, Record<string, LessonProgress>> | null = null
    if (window.electronAPI) {
      const exists = await window.electronAPI.fileExists?.(PROGRESS_FILE)
      if (exists) {
        const result = await window.electronAPI.readFile?.(PROGRESS_FILE)
        if (result?.success && result.data) {
          snapshot = JSON.parse(result.data)
        }
      }
    } else {
      const saved = localStorage.getItem(LOCAL_PROGRESS_KEY)
      if (saved) {
        snapshot = JSON.parse(saved)
      }
    }
    if (snapshot) applyProgressSnapshot(snapshot)
  } catch (error) {
    console.error('加载学习进度失败:', error)
  }
}

function applyProgressSnapshot(snapshot: Record<string, Record<string, LessonProgress>>) {
  englishBooks.forEach(book => {
    progressMap[book.id] = { ...(snapshot?.[book.id] || {})
    }
  })
}

async function saveProgressSnapshot() {
  try {
    const plain: Record<string, Record<string, LessonProgress>> = {}
    englishBooks.forEach(book => {
      const entries = progressMap[book.id]
      if (entries && Object.keys(entries).length > 0) {
        plain[book.id] = { ...entries }
      }
    })
    const payload = JSON.stringify(plain, null, 2)
    if (window.electronAPI) {
      await window.electronAPI.writeFile?.(PROGRESS_FILE, payload, false)
    } else {
      localStorage.setItem(LOCAL_PROGRESS_KEY, payload)
    }
  } catch (error) {
    console.error('保存学习进度失败:', error)
  }
}

function scheduleProgressSave() {
  if (progressSaveTimer) clearTimeout(progressSaveTimer)
  progressSaveTimer = setTimeout(() => {
    saveProgressSnapshot().catch(err => console.error('保存学习进度失败:', err))
    progressSaveTimer = null
  }, 800)
}

function updateLessonProgress(bookId: BookId, filename: string | undefined, payload: Partial<LessonProgress>) {
  if (!filename) return
  if (!progressMap[bookId]) progressMap[bookId] = {}
  const prev = progressMap[bookId][filename] || {
    lastSentenceIndex: 0,
    currentTime: 0,
    percentage: 0,
    updatedAt: Date.now(),
  }
  progressMap[bookId][filename] = { ...prev, ...payload, updatedAt: Date.now() }
  scheduleProgressSave()
}

function getLessonProgress(bookId: BookId, filename?: string | null) {
  if (!filename) return undefined
  return progressMap[bookId]?.[filename]
}

function getLessonProgressPercent(lesson: LessonMeta) {
  const progress = getLessonProgress(selectedBook.value, lesson.filename)
  return progress ? Math.round(Math.min(progress.percentage || 0, 1) * 100) : 0
}

function resetPlaybackStats() {
  playbackStats.currentTime = 0
  playbackStats.duration = 0
  playbackStats.percent = 0
  pendingSeekTime.value = 0
  isPlaying.value = false
}

function applyLessonProgressState(bookId: BookId, filename: string) {
  if (!sentences.value.length) {
    activeSentenceIndex.value = -1
    resetPlaybackStats()
    return
  }
  const saved = getLessonProgress(bookId, filename)
  if (!saved) {
    activeSentenceIndex.value = 0
    resetPlaybackStats()
    nextTick(() => scrollSentenceIntoView(0))
    return
  }
  const targetIdx = Math.min(saved.lastSentenceIndex ?? 0, sentences.value.length - 1)
  activeSentenceIndex.value = targetIdx
  playbackStats.currentTime = saved.currentTime || 0
  playbackStats.percent = Math.round(Math.min(saved.percentage || 0, 1) * 100)
  pendingSeekTime.value = saved.currentTime || 0
  nextTick(() => {
    if (pendingSeekTime.value && audioRef.value) {
      const duration = audioRef.value.duration || 0
      playbackStats.duration = duration
      // Don't auto play, just seek
      audioRef.value.currentTime = Math.min(pendingSeekTime.value, duration || pendingSeekTime.value)
      pendingSeekTime.value = 0
    }
    scrollSentenceIntoView(targetIdx)
  })
}

function isBookId(value: string): value is BookId {
  return ['NCE1', 'NCE2', 'NCE3', 'NCE4'].includes(value)
}

function getBookIndex(bookId: BookId) {
  return bookId.replace('NCE', '')
}

async function handleSelectDataset() {
  if (!englishAPI) {
    ElMessage.warning('当前为浏览器模式，请使用 Electron 版本')
    return
  }
  const result = await englishAPI.selectDataset()
  if (result.success && result.path) {
    config.datasetPath = result.path
    await saveConfig()
    await loadDataset(result.path)
    ElMessage.success('数据目录已更新')
  } else if (result.error) {
    ElMessage.error(result.error)
  }
}

async function reloadDataset() {
  if (!config.datasetPath || !englishAPI) return
  await loadDataset(config.datasetPath)
  ElMessage.success('数据已刷新')
}

async function loadDataset(pathValue: string) {
  if (!englishAPI) return
  datasetLoading.value = true
  datasetError.value = ''
  try {
    const resolved = await englishAPI.resolvePath(pathValue, 'static', 'data.json')
    if (!resolved.success || !resolved.path) throw new Error(resolved.error || '无法解析 data.json 路径')
    const info = await englishAPI.pathInfo(resolved.path)
    if (!info.exists || !info.isFile) throw new Error('static/data.json 不存在或不可读')
    const result = await englishAPI.readFile(resolved.path, 'utf-8')
    if (!result.success || !result.data) throw new Error(result.error || '读取 data.json 失败')
    
    lessonsData.value = JSON.parse(result.data)
    config.lastBook = isBookId(config.lastBook) ? config.lastBook : 'NCE1'
    selectedBook.value = config.lastBook
    await saveConfig()
    restoreLessonSelection()
  } catch (error: any) {
    console.error('加载 NCE 数据失败:', error)
    datasetError.value = error?.message || '加载失败'
    lessonsData.value = {}
    selectedLesson.value = null
    sentences.value = []
  } finally {
    datasetLoading.value = false
  }
}

function restoreLessonSelection() {
  const bookIndex = getBookIndex(selectedBook.value)
  const lessons = lessonsData.value[bookIndex] || []
  if (!lessons.length) {
    selectedLesson.value = null
    sentences.value = []
    return
  }
  // Try to find last lesson, otherwise defaults to none (user must click) to keep UI clean
  const target = lessons.find(item => item.filename === config.lastLesson)
  if (target) {
    handleLessonClick(target)
  }
}

function selectBook(bookId: BookId) {
  if (selectedBook.value === bookId) return
  selectedBook.value = bookId
}

function formatLessonNumber(index: number, bookId: BookId) {
  if (bookId === 'NCE1') {
    const start = index * 2 + 1
    return `${start}-${start + 1}`
  }
  return String(index + 1).padStart(2, '0')
}

async function handleLessonClick(lesson: LessonMeta) {
  if (!datasetReady.value) return
  if (selectedLesson.value?.filename === lesson.filename) {
      // Just toggle play if already selected?
      return
  }
  
  selectedLesson.value = lesson
  config.lastLesson = lesson.filename
  await saveConfig()
  await loadLessonContent(lesson)
}

async function loadLessonContent(lesson: LessonMeta) {
  if (!englishAPI || !config.datasetPath) return
  isLessonLoading.value = true
  sentences.value = []
  activeSentenceIndex.value = -1
  segmentEnd.value = 0
  autoPlayNextTriggered = false // 重置自动播放标志
  resetPlaybackStats()
  
  try {
    const bookFolder = selectedBook.value
    const lrcPathRes = await englishAPI.resolvePath(config.datasetPath, bookFolder, `${lesson.filename}.lrc`)
    if (!lrcPathRes.success || !lrcPathRes.path) throw new Error(lrcPathRes.error || '找不到 LRC 文件')
    const mp3PathRes = await englishAPI.resolvePath(config.datasetPath, bookFolder, `${lesson.filename}.mp3`)
    if (!mp3PathRes.success || !mp3PathRes.path) throw new Error(mp3PathRes.error || '找不到 MP3 文件')

    const lrcData = await englishAPI.readFile(lrcPathRes.path, 'utf-8')
    if (!lrcData.success || !lrcData.data) throw new Error(lrcData.error || '读取 LRC 失败')

    // 解析 LRC 文件
    const { lines, meta } = parseLrc(lrcData.data)
    
    // 检查解析结果
    if (lines.length === 0) {
      console.warn('LRC 文件解析结果为空:', {
        filename: lesson.filename,
        filePath: lrcPathRes.path,
        fileSize: lrcData.data.length,
        preview: lrcData.data.substring(0, 200) // 前200个字符用于调试
      })
      throw new Error('LRC 文件格式不正确或为空。请检查文件格式是否为标准 LRC 格式（如时间标签+文本）')
    }
    
    sentences.value = lines
    Object.assign(lessonMeta, meta)
    
    console.log(`成功解析课文: ${lesson.filename}`, {
      sentences: lines.length,
      meta,
      firstSentence: lines[0]
    })

    const mp3Url = await englishAPI.getFileUrl(mp3PathRes.path)
    audioUrl.value = mp3Url.success && mp3Url.url ? mp3Url.url : ''
    
    await nextTick()
    audioRef.value?.load?.()
    applyLessonProgressState(selectedBook.value, lesson.filename)
    
    // 如果启用了自动播放，则自动开始播放
    if (config.autoPlay && audioRef.value) {
      // 等待音频元数据加载完成后再播放
      const tryAutoPlay = () => {
        if (audioRef.value && audioRef.value.readyState >= 2) {
          // readyState >= 2 表示至少已加载元数据
          audioRef.value.play().catch(err => {
            console.warn('自动播放失败:', err)
          })
        } else {
          // 如果还没加载完成，等待 loadedmetadata 事件
          if (audioRef.value) {
            const onLoaded = () => {
              if (audioRef.value) {
                audioRef.value.play().catch(err => {
                  console.warn('自动播放失败:', err)
                })
                audioRef.value.removeEventListener('loadedmetadata', onLoaded)
              }
            }
            audioRef.value.addEventListener('loadedmetadata', onLoaded, { once: true })
            // 设置超时，避免一直等待
            setTimeout(() => {
              if (audioRef.value) {
                audioRef.value.removeEventListener('loadedmetadata', onLoaded)
              }
            }, 3000)
          }
        }
      }
      
      await nextTick()
      tryAutoPlay()
    }
  } catch (error: any) {
    console.error('加载课文失败:', error)
    datasetError.value = error?.message || '课文加载失败'
  } finally {
    isLessonLoading.value = false
  }
}

function parseLrc(content: string) {
  const lines: SentenceItem[] = []
  const meta: LrcMeta = { album: '', artist: '', by: '', title: '' }
  const rowList = content.split(/\r?\n/).filter(Boolean)
  
  // 支持多种时间标签格式：
  // 1. 标准格式: [分钟:秒数] 或 [分钟:秒数.毫秒]
  // 2. 自定义格式: ![分钟:秒数!]
  const timeReg = /(?:!?\[(\d+):(\d+(?:\.\d+)?)(?:!)?\])/g
  
  // 支持多种元数据格式：
  // 1. 标准格式: `[ti:标题]` `[ar:艺术家]` `[al:专辑]` `[by:制作者]`
  // 2. 自定义格式: `![ti:标题]` `![ar:艺术家]` 等
  const infoReg = /^!?\[(ti|ar|al|by):(.+?)\]$/

  rowList.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return

    // 尝试匹配元数据
    const info = trimmedLine.match(infoReg)
    if (info) {
      const [, key, value] = info
      const cleanValue = value.trim()
      if (key === 'ti') meta.title = cleanValue
      if (key === 'ar') meta.artist = cleanValue
      if (key === 'al') meta.album = cleanValue
      if (key === 'by') meta.by = cleanValue
      return
    }

    // 尝试匹配时间标签
    const timeMatches = [...trimmedLine.matchAll(timeReg)]
    if (!timeMatches.length) {
      // 如果不是元数据也不是时间标签，可能是空行或注释，跳过
      return
    }

    // 移除所有时间标签，获取文本内容
    const text = trimmedLine.replace(timeReg, '').trim()
    if (!text) {
      // 只有时间标签没有文本，跳过
      return
    }

    // 解析文本：支持 "英文|中文" 或单独的英文
    const [en, cn = ''] = text.split('|').map(item => item.trim())
    
    if (!en) {
      // 英文为空，跳过
      return
    }

    // 为每个时间标签创建一行
    timeMatches.forEach(match => {
      const minutes = match[1]
      const seconds = match[2]
      const start = convertToSeconds(minutes, seconds)
      lines.push({ en, cn, start, end: start + 3 })
    })
  })

  // 按时间排序
  lines.sort((a, b) => a.start - b.start)
  
  // 计算每行的结束时间
  for (let i = 0; i < lines.length - 1; i++) {
    lines[i].end = lines[i + 1].start
  }
  if (lines.length) {
    lines[lines.length - 1].end = lines[lines.length - 1].start + 4
  }
  
  return { lines, meta }
}

function convertToSeconds(minute: string, second: string) {
  const minutes = parseInt(minute, 10)
  const seconds = parseFloat(second)
  return minutes * 60 + seconds - 0.3
}

function togglePlay() {
  if (!audioRef.value) return
  if (audioRef.value.paused) {
    audioRef.value.play()
  } else {
    audioRef.value.pause()
  }
}

function seekAudio(e: MouseEvent) {
  if (!audioRef.value || !playbackStats.duration) return
  const bar = e.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  const x = e.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, x / rect.width))
  const time = ratio * playbackStats.duration
  audioRef.value.currentTime = time
}

function handleSentenceClick(event: MouseEvent, idx: number) {
  // 如果用户正在选择文本，不触发播放
  const selection = window.getSelection()
  if (selection && selection.toString().trim().length > 0) {
    return
  }
  
  // 如果点击的是文本区域，也不触发播放（让双击事件处理）
  const target = event.target as HTMLElement
  if (target.classList.contains('text-en') || target.closest('.text-en')) {
    return
  }
  
  playSentence(idx)
}

function playSentence(idx: number) {
  if (!audioRef.value || !sentences.value[idx]) return
  const target = sentences.value[idx]
  const startTime = Math.max(target.start, 0)
  audioRef.value.currentTime = startTime
  audioRef.value.play().catch(() => {})
  segmentEnd.value = target.end
  activeSentenceIndex.value = idx
  playbackStats.currentTime = startTime
  
  // Progress Logic
  const total = sentences.value.length
  const ratio = total > 0 ? (idx + 1) / total : 0
  if (selectedLesson.value) {
    updateLessonProgress(selectedBook.value, selectedLesson.value?.filename, {
      lastSentenceIndex: idx,
      currentTime: startTime,
      percentage: Math.min(1, ratio),
    })
  }
  scrollSentenceIntoView(idx)
}

let autoPlayNextTriggered = false // 防止重复触发自动播放下一课

function handleTimeUpdate() {
  if (!audioRef.value) return
  const current = audioRef.value.currentTime
  playbackStats.duration = audioRef.value.duration || playbackStats.duration
  playbackStats.currentTime = current
  playbackStats.percent = playbackStats.duration
    ? Math.min(100, (current / playbackStats.duration) * 100)
    : 0
    
  // Segment Loop Logic
  if (segmentEnd.value && current >= segmentEnd.value) {
    audioRef.value.pause()
    segmentEnd.value = 0
  }
  
  // 检测播放完成（作为 ended 事件的备用检测）
  if (playbackStats.duration > 0 && !segmentEnd.value && config.autoPlayNext && !autoPlayNextTriggered) {
    const remaining = playbackStats.duration - current
    // 当剩余时间少于 0.5 秒时，认为播放即将完成
    if (remaining <= 0.5) {
      autoPlayNextTriggered = true
      // 延迟一小段时间，确保音频真正结束
      setTimeout(() => {
        if (audioRef.value && audioRef.value.ended) {
          handleAudioEnded()
        }
      }, 600)
    }
  }
  
  // Update Active Sentence Highlighting
  const idx = sentences.value.findIndex(item => current >= item.start && current < item.end)
  if (idx !== -1 && idx !== activeSentenceIndex.value) {
    activeSentenceIndex.value = idx
    scrollSentenceIntoView(idx)
  }
  
  // Save Progress
  if (idx !== -1 && selectedLesson.value) {
    const total = sentences.value.length
    const ratio = total > 0 ? (idx + 1) / total : playbackStats.percent / 100
    updateLessonProgress(selectedBook.value, selectedLesson.value?.filename, {
      lastSentenceIndex: idx,
      currentTime: current,
      percentage: Math.min(1, ratio),
    })
  }
}

async function handleAudioEnded() {
  // 防止重复触发
  if (autoPlayNextTriggered) return
  autoPlayNextTriggered = true
  
  segmentEnd.value = 0
  activeSentenceIndex.value = -1
  playbackStats.currentTime = playbackStats.duration
  playbackStats.percent = 100
  isPlaying.value = false
  if (selectedLesson.value) {
    const lastIdx = sentences.value.length ? sentences.value.length - 1 : 0
    updateLessonProgress(selectedBook.value, selectedLesson.value?.filename, {
      lastSentenceIndex: lastIdx,
      currentTime: playbackStats.duration,
      percentage: 1,
    })
  }
  
  // 如果启用了自动播放下一课，则自动播放下一课
  if (config.autoPlayNext) {
    const nextLesson = getNextLesson()
    if (nextLesson) {
      console.log('🎵 当前课播放完成，自动切换到下一课:', nextLesson.filename)
      // 延迟一小段时间再播放，让用户看到当前课已完成
      setTimeout(async () => {
        try {
          await handleLessonClick(nextLesson)
          // 重置标志，允许下次触发
          setTimeout(() => {
            autoPlayNextTriggered = false
          }, 1000)
        } catch (error) {
          console.error('自动切换下一课失败:', error)
          autoPlayNextTriggered = false
        }
      }, 500)
    } else {
      console.log('📚 已是最后一课，无法自动切换')
      autoPlayNextTriggered = false
    }
  } else {
    autoPlayNextTriggered = false
  }
}

function handleLoadedMetadata() {
  if (!audioRef.value) return
  playbackStats.duration = audioRef.value.duration || 0
  if (pendingSeekTime.value) {
    audioRef.value.currentTime = Math.min(pendingSeekTime.value, playbackStats.duration || pendingSeekTime.value)
    pendingSeekTime.value = 0
  }
}

function scrollSentenceIntoView(idx: number) {
  const container = sentenceListRef.value
  if (!container || idx < 0) return
  // Use simple smooth scroll
  const target = container.querySelector<HTMLElement>(`.sentence-row[data-idx="${idx}"]`)
  if (target) {
     target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function detachAudioListeners() {
  const audio = audioRef.value
  if (audio) {
    audio.removeEventListener('timeupdate', handleTimeUpdate)
    audio.removeEventListener('ended', handleAudioEnded)
  }
}

function formatTimestamp(value?: number) {
  const safeValue = Number.isFinite(value) ? Number(value) : 0
  const minutes = Math.max(Math.floor(safeValue / 60), 0)
  const seconds = Math.max(safeValue - minutes * 60, 0)
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`
}

function toggleAutoPlay() {
  config.autoPlay = !config.autoPlay
  saveConfig()
  if (config.autoPlay && audioRef.value && audioRef.value.paused) {
    audioRef.value.play().catch(err => {
      console.warn('自动播放失败:', err)
    })
  }
}

function toggleAutoPlayNext() {
  config.autoPlayNext = !config.autoPlayNext
  saveConfig()
}

function getNextLesson(): LessonMeta | null {
  if (!selectedLesson.value || !datasetReady.value) return null
  
  const bookIndex = getBookIndex(selectedBook.value)
  const lessons = lessonsData.value[bookIndex] || []
  if (!lessons.length) return null
  
  const currentIndex = lessons.findIndex(lesson => lesson.filename === selectedLesson.value?.filename)
  if (currentIndex === -1) return null
  
  // 如果当前是最后一课，返回 null
  if (currentIndex >= lessons.length - 1) return null
  
  // 返回下一课
  return lessons[currentIndex + 1]
}

// ========== 单词本功能 ==========
function handleWordSelect(event: MouseEvent, sentence: string) {
  // 清除文本选择的定时器
  if (textSelectTimer) {
    clearTimeout(textSelectTimer)
    textSelectTimer = null
  }
  
  event.preventDefault()
  event.stopPropagation()
  
  const selection = window.getSelection()
  
  // 如果有选中的文本，使用选中的文本
  if (selection && selection.toString().trim().length > 0) {
    const selectedText = selection.toString().trim()
    const words = extractWords(selectedText)
    if (words.length > 0) {
      showAddWordDialog(words[0], sentence)
      selection.removeAllRanges()
      return
    }
  }
  
  // 如果没有选中文本，使用浏览器默认的双击选择
  // 延迟一下，让浏览器先完成双击选择
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim()
      const words = extractWords(selectedText)
      if (words.length > 0) {
        showAddWordDialog(words[0], sentence)
        selection.removeAllRanges()
        return
      }
    }
    
    // 如果还是没有选中文本，尝试使用 Range API
    const target = event.target as HTMLElement
    const text = target.textContent || ''
    
    if (document.caretRangeFromPoint) {
      try {
        const range = document.caretRangeFromPoint(event.clientX, event.clientY)
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = range.startContainer as Text
          const offset = range.startOffset
          const word = getWordAtPosition(textNode.textContent || '', offset)
          if (word && word.length > 0) {
            showAddWordDialog(word, sentence)
            return
          }
        }
      } catch (e) {
        console.warn('Range API 失败:', e)
      }
    }
    
    // 最后备用方案：提示用户
    ElMessage.warning('请双击单词或先选中单词文本')
  }, 50)
}

function getClickOffset(element: HTMLElement, event: MouseEvent): number | null {
  const rect = element.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // 创建一个临时范围来测量文本位置
  const range = document.createRange()
  const textNode = element.childNodes[0] as Text
  if (!textNode) return null
  
  range.setStart(textNode, 0)
  range.setEnd(textNode, textNode.length)
  
  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      // 找到对应的行，计算字符位置
      const lineText = textNode.textContent || ''
      const charWidth = r.width / lineText.length
      const offset = Math.floor((x - r.left) / charWidth)
      return Math.min(offset, lineText.length - 1)
    }
  }
  
  return null
}

let textSelectTimer: ReturnType<typeof setTimeout> | null = null

function handleTextSelect(event: MouseEvent) {
  // 清除之前的定时器
  if (textSelectTimer) {
    clearTimeout(textSelectTimer)
  }
  
  // 延迟检查，确保选择已完成
  textSelectTimer = setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim()
      const words = extractWords(selectedText)
      
      // 如果只选中了一个单词，显示快速添加
      if (words.length === 1 && words[0].length > 1) {
        const target = event.target as HTMLElement
        const sentence = target.textContent || ''
        showQuickAddWord(words[0], sentence)
        // 清除选择
        selection.removeAllRanges()
      } else if (words.length > 1) {
        // 如果选中了多个单词，显示提示
        ElMessage.info('请只选中一个单词')
      }
    }
  }, 200)
}

function extractWords(text: string): string[] {
  // 提取单词，去除标点符号
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase())
}

function getWordAtPosition(text: string, position: number): string | null {
  // 从指定位置提取单词
  let start = position
  let end = position
  
  // 向前查找单词开始
  while (start > 0 && /[\w]/.test(text[start - 1])) {
    start--
  }
  
  // 向后查找单词结束
  while (end < text.length && /[\w]/.test(text[end])) {
    end++
  }
  
  if (start < end) {
    return text.substring(start, end).toLowerCase()
  }
  
  return null
}

function showQuickAddWord(word: string, sentence: string) {
  // 快速添加单词（不显示对话框，直接添加）
  if (wordbookStore.wordExists(word)) {
    ElMessage.info('该单词已在单词本中')
    return
  }
  
  const source = selectedLesson.value 
    ? `${currentBook.value?.title} / ${selectedLesson.value.title}`
    : undefined
  
  wordbookStore.addWord({
    word: word,
    translation: '', // 用户稍后可以编辑
    tags: [],
    isMastered: false,
    source,
  })
  
  ElMessage.success(`"${word}" 已添加到单词本`)
}

async function showAddWordDialog(word: string, sentence: string) {
  if (!word || word.trim().length === 0) {
    ElMessage.warning('请选择有效的单词')
    return
  }
  
  // 清理单词（去除标点符号）
  const cleanWord = word.replace(/[^\w]/g, '').toLowerCase()
  if (cleanWord.length === 0) {
    ElMessage.warning('请选择有效的单词')
    return
  }
  
  if (wordbookStore.wordExists(cleanWord)) {
    ElMessage.info('该单词已在单词本中')
    return
  }
  
  try {
    const { value: translation } = await ElMessageBox.prompt(
      `添加单词 "${cleanWord}" 到单词本`,
      '添加单词',
      {
        confirmButtonText: '添加',
        cancelButtonText: '取消',
        inputPlaceholder: '输入翻译（可选）',
        inputType: 'textarea',
        inputValue: '',
      }
    )
    
    const source = selectedLesson.value 
      ? `${currentBook.value?.title} / ${selectedLesson.value.title}`
      : undefined
    
    wordbookStore.addWord({
      word: cleanWord,
      translation: translation?.trim() || '',
      example: sentence,
      tags: [],
      isMastered: false,
      source,
    })
    
    ElMessage.success(`"${cleanWord}" 已添加到单词本`)
  } catch {
    // 用户取消，不显示错误
  }
}

</script>

<style scoped>
.english-reader-layout {
  display: flex;
  height: calc(100vh - 100px); /* Approx adjust for MainLayout headers if any */
  width: 100%;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
}

/* Sidebar */
.reader-sidebar {
  width: 320px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  color: var(--color-text);
}

.sidebar-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  padding: 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--neon-cyan);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sidebar-alert {
  padding: 8px 16px;
  background: rgba(0,0,0,0.2);
}

.book-tabs {
  display: flex;
  padding: 12px 16px;
  gap: 8px;
}

.book-tab {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid transparent;
  padding: 6px 0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;
  color: var(--color-text-secondary);
}

.book-tab:hover {
  background: rgba(255,255,255,0.1);
}

.book-tab.active {
  background: rgba(33, 230, 255, 0.1);
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
}

.book-id {
  font-weight: 700;
  font-size: 14px;
}

.book-label {
  font-size: 10px;
  opacity: 0.7;
}

.lesson-search-wrapper {
  padding: 0 16px 12px;
}

.lesson-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--color-text-secondary);
}

.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 20px;
}

.lesson-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.lesson-item:hover {
  background: rgba(255,255,255,0.03);
}

.lesson-item.active {
  background: rgba(33, 230, 255, 0.1);
  border-color: rgba(33, 230, 255, 0.3);
}

.lesson-progress-indicator {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: conic-gradient(var(--neon-cyan) var(--progress), rgba(255,255,255,0.1) 0deg);
  mask: radial-gradient(transparent 50%, black 51%);
  -webkit-mask: radial-gradient(transparent 50%, black 51%);
}

.lesson-info {
  flex: 1;
  overflow: hidden;
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.lesson-index {
  font-family: monospace;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.lesson-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
}

.lesson-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

/* Main Content */
.reader-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--color-panel); /* slightly lighter than sidebar */
}

.empty-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  color: var(--color-text-secondary);
}

.reader-header {
  padding: 16px 32px;
  background: rgba(19, 17, 28, 0.8); /* var(--color-bg) with opacity */
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  z-index: 10;
  flex-shrink: 0;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.lesson-breadcrumbs {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.lesson-breadcrumbs .separator {
  margin: 0 6px;
}

.audio-player-compact {
  display: flex;
  align-items: center;
  gap: 16px;
}

.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--neon-cyan);
  border: none;
  color: #000;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.play-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px var(--neon-cyan);
}

.progress-bar-wrapper {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.progress-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--neon-cyan);
  transition: width 0.1s linear;
}

.time-display {
  font-family: monospace;
  font-size: 12px;
  color: var(--color-text-secondary);
  width: 100px;
  text-align: right;
}

.display-mode-toggle {
  display: flex;
  gap: 4px;
  align-items: center;
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
  flex-shrink: 0;
}

.auto-play-toggle {
  display: flex;
  gap: 4px;
  align-items: center;
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
  flex-shrink: 0;
}

.auto-play-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  max-width: 32px;
  max-height: 32px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  position: relative;
  outline: none;
}

.auto-play-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--neon-cyan);
  border-color: rgba(33, 230, 255, 0.3);
}

.auto-play-btn.active {
  background: rgba(33, 230, 255, 0.15);
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
}

.mode-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  max-width: 32px;
  max-height: 32px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  position: relative;
  outline: none;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--neon-cyan);
  border-color: rgba(33, 230, 255, 0.3);
}

.mode-btn.active {
  background: rgba(33, 230, 255, 0.15);
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
}

.mode-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 0 16px;
}

.sentences-wrapper {
  max-width: 800px;
  margin: 24px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sentence-row {
  display: flex;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
  border: 1px solid transparent;
}

.sentence-row:hover {
  background: rgba(255,255,255,0.02);
}

.sentence-row.active {
  background: rgba(33, 230, 255, 0.05);
  border-color: rgba(33, 230, 255, 0.2);
  transform: scale(1.01);
}

.sentence-marker {
  width: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  color: var(--color-text-secondary);
}

.sentence-row.active .sentence-marker {
  color: var(--neon-cyan);
}

.sentence-text {
  flex: 1;
}

.text-en {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 4px;
  color: #e6edf3; /* Fallback */
  color: var(--color-text);
}

.text-en.selectable {
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  position: relative;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.text-en.selectable:hover {
  background: rgba(33, 230, 255, 0.05);
}

.text-en.selectable::selection {
  background: rgba(33, 230, 255, 0.3);
  color: var(--neon-cyan);
}

.sentence-row.active .text-en {
  color: #21e6ff; /* Fallback */
  color: var(--neon-cyan);
  font-weight: 600;
}

.text-cn {
  font-size: 14px;
  color: #aab8c5; /* Fallback */
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.content-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .english-reader-layout {
    flex-direction: column;
    height: auto;
  }
  .reader-sidebar {
    width: 100%;
    height: 400px;
  }
  .reader-main {
    height: 600px;
  }
}
</style>