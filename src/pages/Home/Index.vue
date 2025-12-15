<template>
  <div class="home-page">
    <!-- 欢迎区域 -->
    <div class="hero-section">
      <div class="hero-content">
        <!-- Logo 和标题 -->
        <div class="hero-header">
          <div class="hero-logo">
            <img src="/build/icon.png" alt="IWork" class="logo-image" />
          </div>
          <h1 class="hero-title">
            <span class="gradient-text">IWork</span>
          </h1>
        </div>
        
        <p class="hero-subtitle">
          功能强大的在线工具集合 · 简洁高效 · 开箱即用
        </p>
        
        <!-- Slogan -->
        <transition name="fade-slide" mode="out-in">
          <p :key="currentSloganIndex" class="hero-slogan">{{ currentSlogan }} 💪</p>
        </transition>

        <!-- 搜索框 -->
        <div class="search-container">
          <div class="search-box">
            <i class="i-mdi-magnify search-icon" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索工具 (Ctrl+K)..."
              class="search-input"
              @keyup.enter="handleSearch"
            />
            <button v-if="searchKeyword" class="clear-btn" @click="searchKeyword = ''">
              <i class="i-mdi-close" />
            </button>
          </div>
          <!-- 快捷键提示 -->
          <div class="shortcut-hint">
            <span class="key">Ctrl</span> + <span class="key">K</span>
          </div>
        </div>

        <!-- 快速统计 -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-val">{{ totalTools }}</span>
            <span class="stat-label">个工具</span>
          </div>
          <div class="divider">/</div>
          <div class="stat-item">
            <span class="stat-val">{{ categories.length }}</span>
            <span class="stat-label">个分类</span>
          </div>
          <div class="divider">/</div>
          <div class="stat-item">
            <span class="stat-val">持续更新</span>
          </div>
        </div>
      </div>
      
      <!-- 天气卡片 (浮动) -->
      <div class="weather-widget">
        <HomeWeatherCard />
      </div>
    </div>

    <!-- 工具分类列表 -->
    <div class="content-section">
      <div v-if="filteredCategories.length === 0" class="empty-result">
        <i class="i-mdi-package-variant-closed" />
        <p>未找到相关工具</p>
      </div>

      <div class="categories-grid">
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="category-group"
        >
          <div class="category-header">
            <div class="header-left">
              <i :class="category.icon" class="category-icon" />
              <h3 class="category-title">{{ category.title }}</h3>
            </div>
          </div>
          
          <div class="tools-grid">
            <div
              v-for="tool in category.children"
              :key="tool.path"
              class="tool-card"
              @click="navigateToTool(tool.path)"
            >
              <div class="tool-icon-box">
                <i :class="tool.icon" />
              </div>
              <div class="tool-info">
                <div class="tool-name">{{ tool.title }}</div>
                <div class="tool-desc">{{ tool.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import HomeWeatherCard from '@/components/HomeWeatherCard.vue'

const router = useRouter()
const searchKeyword = ref('')

// Slogan
const slogans = [
  '我打工，故我卑微；我加班，故我存在',
  '他人即地狱，老板更是地狱中的地狱',
  '不知是我在打工，还是工作在打我',
  '某天早上醒来，发现自己变成了一只打工虫',
  '人生天地间，若白驹过隙，唯有工作最漫长',
  '世上本没有内卷，打工的人多了，便有了内卷',
  '未经反思的打工不值得过，但反思了更痛苦',
  '凝视深渊的打工人，最终也被深渊所凝视',
  '打工是西西弗斯的巨石，日复一日永无止境',
  '人生即痛苦，打工是痛苦的具象化',
  '向死而生，向钱而卷，此即打工人的宿命',
  '打工前，山是山；打工后，山还是山，但我已爬不动',
  '天地不仁，以万物为刍狗；老板不仁，以打工人为牛马',
  '人不能两次踏进同一条河流，但能无数次踏进同一个办公室',
  '打工是枷锁，自由只在梦里',
  '生老病死之外，还有第五苦：打工',
  '打工人创造价值，却只能得到工资',
  '自由意志？那是打工之前的幻觉',
  '人之初，性本善；打工后，性本累',
  '知行合一？先让我周末能合眼',
]

const currentSloganIndex = ref(0)
const currentSlogan = computed(() => slogans[currentSloganIndex.value])
let sloganTimer: ReturnType<typeof setInterval> | null = null

// 完整的工具列表
const categories = [
  {
    id: 'text-processing',
    title: '📝 文本处理',
    icon: 'i-mdi-text-box-multiple',
    children: [
      { path: '/tools/json-formatter', title: 'JSON 格式化', icon: 'i-mdi-code-json', description: '格式化、压缩、校验 JSON 数据' },
      { path: '/tools/xml-yaml', title: 'XML/YAML 转换', icon: 'i-mdi-file-xml-box', description: 'XML、YAML、JSON 格式互转' },
      { path: '/tools/sql-formatter', title: 'SQL 格式化', icon: 'i-mdi-database-edit', description: 'SQL 语句格式化与美化' },
      { path: '/tools/text-diff', title: '文本对比', icon: 'i-mdi-file-compare', description: '文本差异对比工具' },
      { path: '/tools/regex', title: '正则表达式', icon: 'i-mdi-regex', description: '正则表达式测试与匹配' },
      { path: '/tools/doc-to-markdown', title: '文档转 Markdown', icon: 'i-mdi-file-document-arrow-right', description: 'Word 文档转 Markdown' },
      { path: '/tools/profile-merger', title: 'Profile 配置合成', icon: 'i-mdi-file-settings', description: '合并 Spring Boot 多环境配置' },
      { path: '/tools/log-analyzer', title: '日志片段分析', icon: 'i-mdi-text-search', description: '日志分级高亮、异常定位' },
    ]
  },
  {
    id: 'encoding-crypto',
    title: '🔐 编码加密',
    icon: 'i-mdi-shield-lock',
    children: [
      { path: '/tools/base64', title: 'Base64 编解码', icon: 'i-mdi-file-code-outline', description: 'Base64 编码解码工具' },
      { path: '/tools/url-encoder', title: 'URL 编码', icon: 'i-mdi-link-variant', description: 'URL 编码与解码' },
      { path: '/tools/hash', title: '哈希计算', icon: 'i-mdi-fingerprint', description: 'MD5、SHA 等哈希计算' },
      { path: '/tools/encrypt', title: '加密解密', icon: 'i-mdi-lock-outline', description: 'AES、DES、RSA 加密解密' },
      { path: '/tools/unicode', title: 'Unicode 转换', icon: 'i-mdi-format-letter-case', description: 'Unicode、HTML 实体编码转换' },
      { path: '/tools/encoding', title: '编码格式转换', icon: 'i-mdi-file-swap', description: 'UTF-8、GBK、GB2312 互转' },
      { path: '/tools/file-hash', title: '文件哈希校验', icon: 'i-mdi-shield-check', description: 'MD5/SHA1/SHA256/SHA512 哈希' },
    ]
  },
  {
    id: 'auth-security',
    title: '🔑 认证安全',
    icon: 'i-mdi-key-variant',
    children: [
      { path: '/tools/jwt', title: 'JWT 解析', icon: 'i-mdi-key-chain', description: 'JWT Token 解析与验证' },
    ]
  },
  {
    id: 'time-schedule',
    title: '⏰ 时间调度',
    icon: 'i-mdi-clock-outline',
    children: [
      { path: '/tools/timestamp', title: '时间戳转换', icon: 'i-mdi-clock-digital', description: 'Unix 时间戳与日期转换' },
      { path: '/tools/cron', title: 'Cron 表达式', icon: 'i-mdi-calendar-clock', description: 'Cron 表达式生成与解析' },
      { path: '/tools/time-calculator', title: '时间计算器', icon: 'i-mdi-calculator-variant', description: '日期时间加减运算' },
    ]
  },
  {
    id: 'image-tools',
    title: '🖼️ 图片工具',
    icon: 'i-mdi-image-multiple',
    children: [
      { path: '/tools/image-compressor', title: '图片压缩', icon: 'i-mdi-image-size-select-actual', description: '在线压缩 JPG/PNG/WebP' },
      { path: '/tools/image-converter', title: '图片格式转换', icon: 'i-mdi-image-sync', description: 'JPG/PNG/WebP/GIF 互转' },
      { path: '/tools/image-cropper', title: '图片裁剪缩放', icon: 'i-mdi-crop', description: '裁剪图片、调整尺寸' },
      { path: '/tools/base64-image', title: 'Base64 图片转换', icon: 'i-mdi-image-filter-center-focus', description: '图片与 Base64 互转' },
    ]
  },
  {
    id: 'dev-tools',
    title: '🔧 开发工具',
    icon: 'i-mdi-tools',
    children: [
      { path: '/tools/uuid', title: 'UUID 生成', icon: 'i-mdi-identifier', description: '生成 UUID/GUID' },
      { path: '/tools/random-generator', title: '随机数据生成', icon: 'i-mdi-dice-multiple', description: '生成随机字符串、模拟数据' },
      { path: '/tools/number-base', title: '进制转换', icon: 'i-mdi-numeric', description: '十进制、十六进制、二进制转换' },
      { path: '/tools/qrcode', title: '二维码生成', icon: 'i-mdi-qrcode', description: '支持文本、网址、名片、WiFi' },
      { path: '/tools/unit-converter', title: '单位换算器', icon: 'i-mdi-swap-horizontal', description: '长度、重量、温度等单位互转' },
      { path: '/tools/color-converter', title: '颜色转换器', icon: 'i-mdi-palette', description: 'HEX、RGB、HSL 颜色格式互转' },
    ]
  },
  {
    id: 'java-tools',
    title: '💻 Java 工具',
    icon: 'i-mdi-language-java',
    children: [
      { path: '/tools/json-to-java', title: 'JSON 转 Java', icon: 'i-mdi-code-braces', description: 'JSON 转 Java 实体类' },
      { path: '/tools/exception-parser', title: '异常堆栈分析', icon: 'i-mdi-bug', description: 'Java 异常堆栈美化与分析' },
      { path: '/tools/maven-search', title: 'Maven 依赖', icon: 'i-mdi-package-variant', description: 'Maven 依赖坐标查询' },
    ]
  },
  {
    id: 'network-tools',
    title: '🌐 网络工具',
    icon: 'i-mdi-web',
    children: [
      { path: '/tools/http-client', title: 'HTTP 测试', icon: 'i-mdi-api', description: 'HTTP 请求测试工具' },
      { path: '/tools/ip-query', title: 'IP 查询', icon: 'i-mdi-ip-network', description: '查询 IP 地址详细信息' },
      { path: '/tools/ssh', title: 'SSH 连接', icon: 'i-mdi-console', description: '连接远程服务器' },
      { path: '/tools/mysql', title: 'MySQL 查询', icon: 'i-mdi-database', description: '通过SSH连接MySQL数据库' },
      { path: '/tools/redis', title: 'Redis 管理', icon: 'i-mdi-database-clock', description: '连接Redis数据库，管理键值' },
      { path: '/tools/port-scanner', title: '端口扫描', icon: 'i-mdi-lan-connect', description: '扫描服务器开放端口' },
      { path: '/tools/ip-scanner', title: 'IP 扫描器', icon: 'i-mdi-ip-network-outline', description: '扫描局域网 IP 地址' },
      { path: '/tools/websocket', title: 'WebSocket 测试', icon: 'i-mdi-connection', description: '连接 WebSocket 服务器' },
    ]
  },
  {
    id: 'knowledge-management',
    title: '📚 知识管理',
    icon: 'i-mdi-book-open-variant',
    children: [
      { path: '/tools/knowledge', title: '知识库', icon: 'i-mdi-book-open-page-variant', description: '个人知识管理，支持文本和图片' },
      { path: '/tools/snippets', title: '代码片段', icon: 'i-mdi-code-braces-box', description: '管理和使用代码片段' },
      { path: '/tools/bookmarks', title: '网页收藏夹', icon: 'i-mdi-bookmark-multiple', description: '管理常用网站和资源链接' },
    ]
  },
  {
    id: 'utility-tools',
    title: '🎯 实用工具',
    icon: 'i-mdi-apps',
    children: [
      { path: '/tools/clipboard-history', title: '剪贴板历史', icon: 'i-mdi-clipboard-text-clock', description: '自动记录复制的文本内容' },
      { path: '/tools/screenshot', title: '截图工具', icon: 'i-mdi-camera-outline', description: '快速截取屏幕或窗口' },
      { path: '/tools/system-monitor', title: '系统监控', icon: 'i-mdi-monitor-dashboard', description: '实时监控 CPU、内存、磁盘' },
      { path: '/tools/weather', title: '天气查询', icon: 'i-mdi-weather-partly-cloudy', description: '查看多个城市的天气预报' },
      { path: '/tools/calculator', title: '计算器', icon: 'i-carbon-calculator', description: '支持历史记录和时间旅行' },
    ]
  },
  {
    id: 'entertainment',
    title: '🔥 热榜聚合',
    icon: 'i-mdi-fire',
    children: [
      { path: '/tools/entertainment', title: '热榜聚合', icon: 'i-mdi-trending-up', description: '实时聚合各大平台热门话题' },
    ]
  },
]

const totalTools = computed(() => categories.reduce((sum, cat) => sum + cat.children.length, 0))

const filteredCategories = computed(() => {
  if (!searchKeyword.value) return categories
  
  const keyword = searchKeyword.value.toLowerCase()
  return categories
    .map(cat => ({
      ...cat,
      children: cat.children.filter(tool => 
        tool.title.toLowerCase().includes(keyword) ||
        tool.description.toLowerCase().includes(keyword)
      )
    }))
    .filter(cat => cat.children.length > 0)
})

function navigateToTool(path: string) {
  router.push(path)
}

function handleSearch() {
  if (filteredCategories.value.length > 0 && filteredCategories.value[0].children.length > 0) {
    navigateToTool(filteredCategories.value[0].children[0].path)
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    document.querySelector<HTMLInputElement>('.search-input')?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  sloganTimer = setInterval(() => {
    currentSloganIndex.value = (currentSloganIndex.value + 1) % slogans.length
  }, 5000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (sloganTimer) clearInterval(sloganTimer)
})
</script>

<style scoped>
.home-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px 80px;
  display: flex;
  flex-direction: column;
  gap: 60px;
}

/* Hero Section */
.hero-section {
  text-align: center;
  padding: 40px 0 20px;
  animation: fadeIn 0.8s ease-out;
  position: relative;
}

.weather-widget {
  position: absolute;
  top: 0;
  right: 20px;
  width: 240px;
  z-index: 10;
}

@media (max-width: 1024px) {
  .weather-widget {
    position: static;
    margin: 20px auto 0;
    width: 100%;
    max-width: 300px;
  }
}

/* Logo 和标题容器 */
.hero-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}

.hero-logo {
  flex-shrink: 0;
}

.logo-image {
  width: 80px;
  height: 80px;
  filter: drop-shadow(0 0 20px rgba(155, 92, 255, 0.3)); /* 改为紫色光晕 */
  transition: transform 0.3s ease;
}

.logo-image:hover {
  transform: scale(1.05) rotate(5deg);
}

.hero-title {
  font-size: 3rem;
  margin: 0;
  letter-spacing: -1px;
}

.gradient-text {
  background: linear-gradient(135deg, #fff 30%, var(--neon-purple) 100%); /* 改为紫色渐变 */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.hero-slogan {
  font-size: 0.95rem;
  color: var(--color-muted);
  height: 24px;
  font-family: var(--font-family-mono);
  opacity: 0.8;
}

/* Search Box - 修正背景色 */
.search-container {
  position: relative;
  max-width: 500px;
  margin: 40px auto 30px;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(30, 27, 46, 0.6); /* 深紫色半透明 */
  border: 1px solid rgba(120, 110, 160, 0.3);
  border-radius: 12px;
  padding: 0 16px;
  height: 52px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.search-box:focus-within {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px var(--neon-cyan), 0 0 12px rgba(33, 230, 255, 0.2);
  transform: translateY(-2px);
  background: rgba(40, 35, 60, 0.8);
}

.search-icon {
  font-size: 20px;
  color: var(--color-text-secondary);
  margin-right: 12px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 16px;
  outline: none;
  height: 100%;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.shortcut-hint {
  position: absolute;
  right: -80px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-muted);
  font-size: 12px;
  display: none;
}

@media (min-width: 768px) {
  .shortcut-hint {
    display: block;
  }
}

.key {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

/* Stats */
.stats-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.stat-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.stat-val {
  color: var(--color-text);
  font-weight: 600;
  font-family: var(--font-family-mono);
}

.divider {
  color: rgba(255, 255, 255, 0.1);
}

/* Categories */
.category-group {
  margin-bottom: 40px;
}

.category-header {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(120, 110, 160, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-icon {
  font-size: 1.2rem;
  color: var(--neon-purple); /* 标题图标改为紫色 */
  opacity: 0.9;
}

.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
  letter-spacing: 0.05em;
}

/* Tools Grid - 卡片样式修复 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.tool-card {
  /* 恢复紫色调背景 */
  background: rgba(30, 27, 46, 0.6);
  border: 1px solid rgba(120, 110, 160, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  backdrop-filter: blur(10px);
}

.tool-card:hover {
  /* 悬停更亮 */
  background: rgba(40, 35, 60, 0.9);
  border-color: rgba(155, 92, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.tool-icon-box {
  width: 36px;
  height: 36px;
  background: rgba(155, 92, 255, 0.1); /* 紫色底 */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--neon-purple);
  font-size: 20px;
  transition: all 0.2s;
  border: 1px solid rgba(155, 92, 255, 0.2);
}

.tool-card:hover .tool-icon-box {
  background: var(--neon-cyan); /* 悬停变青色 */
  color: #000;
  border-color: var(--neon-cyan);
}

.tool-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
}

.tool-desc {
  font-size: 0.8rem;
  color: var(--color-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Empty State */
.empty-result {
  text-align: center;
  padding: 60px 0;
  color: var(--color-muted);
}

.empty-result i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
  display: block;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .hero-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .logo-image {
    width: 60px;
    height: 60px;
  }
  
  .hero-title {
    font-size: 2rem;
  }
}

/* Animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
