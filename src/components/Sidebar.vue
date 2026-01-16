<template>
  <aside
    :class="[
      'neon-sidebar',
      {
        'neon-sidebar--collapsed': isCollapsed,
      }
    ]"
  >
    <!-- 顶部 Logo 区域 -->
    <div class="neon-sidebar__header">
      <div class="neon-sidebar__logo" @click="toggleCollapse">
        <div class="neon-sidebar__logo-icon">
          <el-icon><Tools /></el-icon>
        </div>
        <transition name="fade">
          <span v-show="!isCollapsed" class="neon-sidebar__logo-text">
            Neon Tools
          </span>
        </transition>
      </div>
    </div>

    <!-- 搜索框 -->
    <div v-show="!isCollapsed" class="neon-sidebar__search">
      <div class="neon-sidebar__search-wrapper">
        <i class="i-mdi-magnify neon-sidebar__search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 (Ctrl+K)"
          class="neon-sidebar__search-input"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
        />
      </div>
    </div>

    <!-- 折叠时的搜索图标 -->
    <div v-show="isCollapsed" class="neon-sidebar__search-collapsed" @click="handleExpandForSearch">
      <i class="i-mdi-magnify" />
    </div>

    <!-- 菜单 -->
    <el-menu
      :default-active="activeRoute"
      class="neon-sidebar__menu"
      :collapse="isCollapsed"
      :collapse-transition="false"
      @select="handleMenuSelect"
    >
      <template v-for="category in filteredCategories">
        <!-- 一级分类（含子菜单） -->
        <el-sub-menu
          v-if="category.children && category.children.length > 0"
          :key="category.id"
          :index="category.id"
          class="neon-menu-category"
        >
          <template #title>
            <i :class="category.icon" class="neon-menu-item__icon" />
            <span>{{ category.title }}</span>
          </template>
          <!-- 二级菜单项 -->
          <el-menu-item
            v-for="item in category.children"
            :key="item.path"
            :index="item.path"
            class="neon-menu-item neon-menu-item--sub"
          >
            <template #title>
              {{ item.title }}
            </template>
          </el-menu-item>
        </el-sub-menu>

        <!-- 一级菜单（无子菜单） -->
        <el-menu-item
          v-else
          :key="'menu-' + category.id"
          :index="category.path || category.id"
          class="neon-menu-item"
        >
          <i :class="category.icon" class="neon-menu-item__icon" />
          <template #title>
            {{ category.title }}
          </template>
        </el-menu-item>
      </template>
    </el-menu>

    <!-- 底部折叠按钮 -->
    <div class="neon-sidebar__footer">
      <button class="neon-sidebar__collapse-btn" @click="toggleCollapse">
        <i :class="isCollapsed ? 'i-mdi-chevron-double-right' : 'i-mdi-chevron-double-left'" />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { Tools } from '@element-plus/icons-vue'

interface MenuItem {
  path: string
  title: string
  icon: string
  description?: string
}

interface MenuCategory {
  id: string
  title: string
  icon: string
  path?: string
  children?: MenuItem[]
}

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()

const searchQuery = ref('')
const isSearchFocused = ref(false)

const isCollapsed = computed(() => uiStore.sidebarCollapsed)

// 恢复完整的菜单数据
const menuCategories: MenuCategory[] = [
  { id: 'home', title: '首页', icon: 'i-mdi-home', path: '/' },
  {
    id: 'text-processing', title: '文本处理', icon: 'i-mdi-text-box-multiple',
    children: [
      { path: '/tools/json-formatter', title: 'JSON 格式化', icon: 'i-mdi-code-json' },
      { path: '/tools/xml-yaml', title: 'XML/YAML 转换', icon: 'i-mdi-file-xml-box' },
      { path: '/tools/sql-formatter', title: 'SQL 格式化', icon: 'i-mdi-database-edit' },
      { path: '/tools/text-diff', title: '文本对比', icon: 'i-mdi-file-compare' },
      { path: '/tools/regex', title: '正则测试', icon: 'i-mdi-regex' },
      { path: '/tools/doc-to-markdown', title: '文档转 Markdown', icon: 'i-mdi-file-document-arrow-right' },
      { path: '/tools/profile-merger', title: 'Profile 配置合成', icon: 'i-mdi-file-settings' },
      { path: '/tools/log-analyzer', title: '日志片段分析', icon: 'i-mdi-text-search' },
    ]
  },
  {
    id: 'encoding-crypto', title: '编码加密', icon: 'i-mdi-shield-lock',
    children: [
      { path: '/tools/base64', title: 'Base64', icon: 'i-mdi-file-code-outline' },
      { path: '/tools/url-encoder', title: 'URL 编码', icon: 'i-mdi-link-variant' },
      { path: '/tools/hash', title: '哈希计算', icon: 'i-mdi-fingerprint' },
      { path: '/tools/encrypt', title: '加密解密', icon: 'i-mdi-lock-outline' },
      { path: '/tools/unicode', title: 'Unicode', icon: 'i-mdi-format-letter-case' },
      { path: '/tools/encoding', title: '编码转换', icon: 'i-mdi-file-swap' },
      { path: '/tools/file-hash', title: '文件哈希', icon: 'i-mdi-shield-check' },
      { path: '/tools/jwt', title: 'JWT 解析', icon: 'i-mdi-key-chain' },
    ]
  },
  {
    id: 'dev-tools', title: '开发工具', icon: 'i-mdi-tools',
    children: [
      { path: '/tools/uuid', title: 'UUID 生成', icon: 'i-mdi-identifier' },
      { path: '/tools/random-generator', title: '随机生成', icon: 'i-mdi-dice-multiple' },
      { path: '/tools/timestamp', title: '时间戳', icon: 'i-mdi-clock-digital' },
      { path: '/tools/time-calculator', title: '时间计算', icon: 'i-mdi-calculator-variant' },
      { path: '/tools/cron', title: 'Cron 表达式', icon: 'i-mdi-calendar-clock' },
      { path: '/tools/qrcode', title: '二维码', icon: 'i-mdi-qrcode' },
      { path: '/tools/maven-search', title: 'Maven 搜索', icon: 'i-mdi-package-variant' },
      { path: '/tools/number-base', title: '进制转换', icon: 'i-mdi-numeric' },
      { path: '/tools/unit-converter', title: '单位换算', icon: 'i-mdi-swap-horizontal' },
      { path: '/tools/color-converter', title: '颜色转换', icon: 'i-mdi-palette' },
    ]
  },
  {
    id: 'image-tools', title: '图片工具', icon: 'i-mdi-image-multiple',
    children: [
      { path: '/tools/image-compressor', title: '图片压缩', icon: 'i-mdi-image-size-select-actual' },
      { path: '/tools/image-converter', title: '图片格式转换', icon: 'i-mdi-image-sync' },
      { path: '/tools/image-cropper', title: '图片裁剪', icon: 'i-mdi-crop' },
      { path: '/tools/base64-image', title: 'Base64 图片', icon: 'i-mdi-image-filter-center-focus' },
    ]
  },
  {
    id: 'java-tools', title: 'Java 工具', icon: 'i-mdi-language-java',
    children: [
      { path: '/tools/json-to-java', title: 'JSON 转 Java', icon: 'i-mdi-code-braces' },
      { path: '/tools/exception-parser', title: '异常分析', icon: 'i-mdi-bug' },
    ]
  },
  {
    id: 'network-tools', title: '网络工具', icon: 'i-mdi-web',
    children: [
      { path: '/tools/ssh', title: 'SSH 终端', icon: 'i-mdi-console' },
      { path: '/tools/http-client', title: 'HTTP 请求', icon: 'i-mdi-api' },
      { path: '/tools/mysql', title: 'MySQL', icon: 'i-mdi-database' },
      { path: '/tools/redis', title: 'Redis', icon: 'i-mdi-database-clock' },
      { path: '/tools/ip-query', title: 'IP 查询', icon: 'i-mdi-ip-network' },
      { path: '/tools/port-scanner', title: '端口扫描', icon: 'i-mdi-lan-connect' },
      { path: '/tools/ip-scanner', title: 'IP 扫描器', icon: 'i-mdi-ip-network-outline' },
      { path: '/tools/websocket', title: 'WebSocket', icon: 'i-mdi-connection' },
    ]
  },
  {
    id: 'productivity', title: '生产力', icon: 'i-mdi-rocket-launch',
    children: [
      { path: '/tools/clipboard-history', title: '剪贴板', icon: 'i-mdi-clipboard-text-clock' },
      { path: '/tools/screenshot', title: '截图', icon: 'i-mdi-camera-outline' },
      { path: '/tools/file-finder', title: '文件查找', icon: 'i-mdi-file-search' },
      { path: '/tools/code-packer', title: '代码打包', icon: 'i-mdi-package-variant-closed' },
      { path: '/tools/knowledge', title: '知识库', icon: 'i-mdi-book-open-page-variant' },
      { path: '/tools/snippets', title: '代码片段', icon: 'i-mdi-code-braces-box' },
      { path: '/tools/bookmarks', title: '收藏夹', icon: 'i-mdi-bookmark-multiple' },
      { path: '/tools/todo-list', title: '待办事项', icon: 'i-mdi-checkbox-marked-outline' },
      { path: '/tools/system-monitor', title: '系统监控', icon: 'i-mdi-monitor-dashboard' },
      { path: '/tools/weather', title: '天气', icon: 'i-mdi-weather-partly-cloudy' },
      { path: '/tools/calculator', title: '计算器', icon: 'i-carbon-calculator' },
    ]
  },
  {
    id: 'entertainment', title: '热榜', icon: 'i-mdi-fire',
    children: [
      { path: '/tools/entertainment', title: '热榜聚合', icon: 'i-mdi-trending-up' },
    ]
  },
  {
    id: 'learning-tools', title: '学习工具', icon: 'i-mdi-school',
    children: [
      { path: '/tools/english-reader', title: '英语学习', icon: 'i-mdi-book-alphabet' },
      { path: '/tools/wordbook', title: '单词本', icon: 'i-mdi-book-open-variant' },
    ]
  },
]

const activeRoute = ref(route.path)

watch(() => route.path, (newPath) => {
  activeRoute.value = newPath
}, { flush: 'post' })

const filteredCategories = computed(() => {
  if (!searchQuery.value) return menuCategories
  const query = searchQuery.value.toLowerCase()
  return menuCategories
    .map(category => {
      const categoryMatches = category.title.toLowerCase().includes(query)
      const filteredChildren = category.children?.filter(item =>
        item.title.toLowerCase().includes(query)
      ) || []
      
      if (categoryMatches) return category
      if (filteredChildren.length > 0) return { ...category, children: filteredChildren }
      return null
    })
    .filter(Boolean) as MenuCategory[]
})

let navigateTimer: ReturnType<typeof setTimeout> | null = null

const handleMenuSelect = (path: string) => {
  if (!path.startsWith('/') || route.path === path) return
  if (navigateTimer) clearTimeout(navigateTimer)
  router.push(path).catch(() => {})
}

const toggleCollapse = () => {
  uiStore.toggleSidebar()
}

const handleExpandForSearch = () => {
  uiStore.setSidebarCollapsed(false)
  setTimeout(() => {
    (document.querySelector('.neon-sidebar__search-input') as HTMLInputElement)?.focus()
  }, 250)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'b') {
    event.preventDefault()
    toggleCollapse()
  }
  if (event.ctrlKey && event.key === 'k') {
    event.preventDefault()
    if (isCollapsed.value) handleExpandForSearch()
    else (document.querySelector('.neon-sidebar__search-input') as HTMLInputElement)?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.neon-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width-expanded);
  height: 100vh;
  /* 恢复紫色基调背景 */
  background: rgba(30, 27, 46, 0.6); 
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(120, 110, 160, 0.15); /* 极细紫色边框 */
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: var(--z-fixed);
  user-select: none;
}

.neon-sidebar--collapsed {
  width: var(--sidebar-width-collapsed);
}

/* Header */
.neon-sidebar__header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.neon-sidebar__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  color: var(--neon-cyan);
}

.neon-sidebar__logo-icon {
  font-size: 24px;
  display: flex;
  transition: transform 0.3s;
  color: var(--neon-purple); /* 恢复紫色图标 */
}

.neon-sidebar__logo:hover .neon-sidebar__logo-icon {
  transform: rotate(90deg);
  color: var(--neon-cyan);
}

.neon-sidebar__logo-text {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* Search */
.neon-sidebar__search {
  padding: 0 16px 16px;
}

.neon-sidebar__search-wrapper {
  display: flex;
  align-items: center;
  background: rgba(40, 35, 60, 0.5); /* 紫色系深色 */
  border: 1px solid rgba(120, 110, 160, 0.2);
  border-radius: 8px;
  padding: 0 10px;
  height: 36px;
  transition: all 0.2s;
}

.neon-sidebar__search-wrapper:focus-within {
  border-color: var(--neon-purple);
  background: rgba(50, 45, 80, 0.6);
  box-shadow: 0 0 10px rgba(155, 92, 255, 0.2);
}

.neon-sidebar__search-icon {
  color: var(--color-text-secondary);
  font-size: 16px;
  margin-right: 8px;
}

.neon-sidebar__search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  min-width: 0;
}

.neon-sidebar__search-collapsed {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.neon-sidebar__search-collapsed:hover {
  color: var(--neon-cyan);
}

/* Menu */
.neon-sidebar__menu {
  flex: 1;
  border: none !important;
  background: transparent !important;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 菜单项样式重置 */
:deep(.el-menu-item), :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  color: var(--color-text-secondary);
  margin: 4px 12px;
  border-radius: 8px;
  background: transparent !important;
}

:deep(.el-menu-item:hover), :deep(.el-sub-menu__title:hover) {
  background: rgba(155, 92, 255, 0.1) !important; /* 紫色悬停 */
  color: var(--color-text);
}

:deep(.el-menu-item.is-active) {
  background: rgba(33, 230, 255, 0.15) !important; /* 青色高亮 */
  color: var(--neon-cyan);
  font-weight: 500;
  /* 左侧加一个小光条指示器 */
  box-shadow: inset 4px 0 0 var(--neon-cyan);
}

:deep(.neon-menu-item__icon) {
  font-size: 18px;
  margin-right: 10px;
  width: 24px;
  text-align: center;
}

/* 子菜单缩进 */
:deep(.el-menu--inline .el-menu-item) {
  padding-left: 48px !important;
  margin: 2px 12px;
  height: 36px;
  line-height: 36px;
  font-size: 13px;
}

/* 折叠状态适配 */
.neon-sidebar--collapsed :deep(.el-menu-item),
.neon-sidebar--collapsed :deep(.el-sub-menu__title) {
  padding: 0 !important;
  justify-content: center;
  margin: 4px 8px;
}

.neon-sidebar--collapsed :deep(.neon-menu-item__icon) {
  margin: 0;
}

.neon-sidebar--collapsed :deep(.el-sub-menu__icon-arrow),
.neon-sidebar--collapsed :deep(.el-menu-tooltip__trigger) {
  display: none;
}

/* Footer */
.neon-sidebar__footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
}

.neon-sidebar--collapsed .neon-sidebar__footer {
  justify-content: center;
}

.neon-sidebar__collapse-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.neon-sidebar__collapse-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
