import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'archived'
export type TodoPriority = 'high' | 'medium' | 'low'

export interface Todo {
  id: string
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  tags: string[]
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

export interface TodoTag {
  id: string
  name: string
  color: string
}

// 状态配置
export const STATUS_CONFIG: Record<TodoStatus, { label: string; color: string; icon: string }> = {
  pending: { label: '待处理', color: '#21E6FF', icon: 'i-mdi-clock-outline' },
  in_progress: { label: '进行中', color: '#FDFF21', icon: 'i-mdi-progress-clock' },
  completed: { label: '已完成', color: '#B0FF21', icon: 'i-mdi-check-circle' },
  archived: { label: '已归档', color: '#888888', icon: 'i-mdi-archive' },
}

// 优先级配置
export const PRIORITY_CONFIG: Record<TodoPriority, { label: string; color: string; icon: string; order: number }> = {
  high: { label: '高', color: '#FF2AA1', icon: '↑', order: 0 },
  medium: { label: '中', color: '#FDFF21', icon: '●', order: 1 },
  low: { label: '低', color: '#21E6FF', icon: '↓', order: 2 },
}

export const useTodosStore = defineStore('todos', () => {
  // ========== 状态 ==========
  const todos = ref<Todo[]>([])
  const tags = ref<TodoTag[]>([
    { id: 'work', name: '工作', color: '#21E6FF' },
    { id: 'personal', name: '个人', color: '#9B5CFF' },
    { id: 'urgent', name: '紧急', color: '#FF2AA1' },
    { id: 'learning', name: '学习', color: '#B0FF21' },
  ])

  const isLoading = ref(false)
  const searchText = ref('')
  const selectedStatus = ref<TodoStatus | ''>('')
  const selectedTags = ref<string[]>([])
  const showPinned = ref(false)
  const showArchived = ref(false)
  const sortBy = ref<'createdAt' | 'updatedAt' | 'priority'>('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // ========== 计算属性 ==========
  const filteredTodos = computed(() => {
    let result = [...todos.value]

    // 默认不显示已归档
    if (!showArchived.value) {
      result = result.filter((t) => t.status !== 'archived')
    }

    // 搜索过滤
    if (searchText.value) {
      const query = searchText.value.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // 状态过滤
    if (selectedStatus.value) {
      result = result.filter((t) => t.status === selectedStatus.value)
    }

    // 标签过滤
    if (selectedTags.value.length > 0) {
      result = result.filter((t) =>
        selectedTags.value.every((tag) => t.tags.includes(tag))
      )
    }

    // 置顶过滤
    if (showPinned.value) {
      result = result.filter((t) => t.isPinned)
    }

    // 排序：置顶优先，然后按选择的排序方式
    result.sort((a, b) => {
      // 置顶优先
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1
      }

      // 置顶内部按优先级排序
      if (a.isPinned && b.isPinned) {
        const priorityDiff = PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order
        if (priorityDiff !== 0) return priorityDiff
      }

      // 按选择的排序方式
      if (sortBy.value === 'priority') {
        const priorityDiff = PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order
        if (priorityDiff !== 0) {
          return sortOrder.value === 'asc' ? priorityDiff : -priorityDiff
        }
      }

      // 按时间排序
      const timeA = sortBy.value === 'updatedAt' ? a.updatedAt : a.createdAt
      const timeB = sortBy.value === 'updatedAt' ? b.updatedAt : b.createdAt
      return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA
    })

    return result
  })

  // 统计信息
  const stats = computed(() => {
    const all = todos.value.filter((t) => t.status !== 'archived')
    return {
      total: all.length,
      pending: all.filter((t) => t.status === 'pending').length,
      inProgress: all.filter((t) => t.status === 'in_progress').length,
      completed: all.filter((t) => t.status === 'completed').length,
      archived: todos.value.filter((t) => t.status === 'archived').length,
      pinned: all.filter((t) => t.isPinned).length,
      byTag: tags.value.reduce((acc, tag) => {
        acc[tag.id] = all.filter((t) => t.tags.includes(tag.id)).length
        return acc
      }, {} as Record<string, number>),
    }
  })

  // ========== 方法 ==========

  // 生成唯一 ID
  function generateId(): string {
    return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  // 加载数据
  async function loadTodos() {
    isLoading.value = true
    try {
      console.log('[Todos] Loading todos, electron.todos:', window.electron?.todos)
      const data = await window.electron?.todos?.load()
      console.log('[Todos] Loaded data:', data)
      if (data) {
        todos.value = data.todos || []
        if (data.tags && data.tags.length > 0) {
          tags.value = data.tags
        }
      }
    } catch (error) {
      console.error('Failed to load todos:', error)
      ElMessage.error('加载待办事项失败')
    } finally {
      isLoading.value = false
    }
  }

  // 保存数据
  async function saveTodos() {
    try {
      console.log('[Todos] Saving todos, electron.todos:', window.electron?.todos)
      const result = await window.electron?.todos?.save({
        todos: todos.value,
        tags: tags.value,
      })
      console.log('[Todos] Save result:', result)
      if (!result?.success) {
        console.error('[Todos] Save failed:', result?.error)
      }
    } catch (error) {
      console.error('Failed to save todos:', error)
      ElMessage.error('保存待办事项失败')
    }
  }

  // 添加待办
  function addTodo(data: Partial<Todo>) {
    const now = Date.now()
    const newTodo: Todo = {
      id: generateId(),
      title: data.title || '新待办',
      description: data.description,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      tags: data.tags || [],
      isPinned: data.isPinned || false,
      createdAt: now,
      updatedAt: now,
    }
    todos.value.unshift(newTodo)
    saveTodos()
    ElMessage.success('添加成功')
    return newTodo
  }

  // 更新待办
  function updateTodo(id: string, data: Partial<Todo>) {
    const index = todos.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      todos.value[index] = {
        ...todos.value[index],
        ...data,
        updatedAt: Date.now(),
      }
      saveTodos()
    }
  }

  // 删除待办
  function deleteTodo(id: string) {
    const index = todos.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      todos.value.splice(index, 1)
      saveTodos()
      ElMessage.success('删除成功')
    }
  }

  // 切换置顶
  function togglePin(id: string) {
    const todo = todos.value.find((t) => t.id === id)
    if (todo) {
      todo.isPinned = !todo.isPinned
      todo.updatedAt = Date.now()
      saveTodos()
    }
  }

  // 更新状态
  function updateStatus(id: string, status: TodoStatus) {
    const todo = todos.value.find((t) => t.id === id)
    if (todo) {
      todo.status = status
      todo.updatedAt = Date.now()
      saveTodos()
    }
  }

  // 归档已完成
  function archiveCompleted() {
    const completed = todos.value.filter((t) => t.status === 'completed')
    if (completed.length === 0) {
      ElMessage.warning('没有已完成的待办')
      return
    }
    completed.forEach((t) => {
      t.status = 'archived'
      t.updatedAt = Date.now()
    })
    saveTodos()
    ElMessage.success(`已归档 ${completed.length} 条待办`)
  }

  // 清空已归档
  function clearArchived() {
    const archivedCount = todos.value.filter((t) => t.status === 'archived').length
    if (archivedCount === 0) {
      ElMessage.warning('没有已归档的待办')
      return
    }
    todos.value = todos.value.filter((t) => t.status !== 'archived')
    saveTodos()
    ElMessage.success(`已清空 ${archivedCount} 条归档`)
  }

  // 添加标签
  function addTag(name: string, color: string) {
    const id = `tag_${Date.now()}`
    tags.value.push({ id, name, color })
    saveTodos()
    return id
  }

  // 删除标签
  function deleteTag(id: string) {
    const index = tags.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      tags.value.splice(index, 1)
      // 从所有待办中移除该标签
      todos.value.forEach((todo) => {
        const tagIndex = todo.tags.indexOf(id)
        if (tagIndex !== -1) {
          todo.tags.splice(tagIndex, 1)
        }
      })
      saveTodos()
    }
  }

  // 更新标签
  function updateTag(id: string, data: Partial<TodoTag>) {
    const tag = tags.value.find((t) => t.id === id)
    if (tag) {
      Object.assign(tag, data)
      saveTodos()
    }
  }

  return {
    // 状态
    todos,
    tags,
    isLoading,
    searchText,
    selectedStatus,
    selectedTags,
    showPinned,
    showArchived,
    sortBy,
    sortOrder,
    // 计算属性
    filteredTodos,
    stats,
    // 方法
    loadTodos,
    saveTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    togglePin,
    updateStatus,
    archiveCompleted,
    clearArchived,
    addTag,
    deleteTag,
    updateTag,
  }
})
