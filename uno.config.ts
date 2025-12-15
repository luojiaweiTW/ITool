import {
  defineConfig,
  presetUno,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  // ⚡ 阻止无效的 CSS 类名生成（LRC 元数据格式等）
  blocklist: [
    /\[ti[:：]/,      // [ti:标题] 或 [ti：标题]
    /\[ar[:：]/,      // [ar:艺术家] 或 [ar：艺术家]
    /\[al[:：]/,      // [al:专辑] 或 [al：专辑]
    /\[by[:：]/,      // [by:制作者] 或 [by：制作者]
    /\[\d+[:：]\d/,   // [00:12.34] 或 [00：12.34] 时间格式
    /\\!\\\[ti\\:/,   // 转义版本 \![ti:
    /\\!\\\[ar\\:/,   // 转义版本 \![ar:
    /\\!\\\[al\\:/,   // 转义版本 \![al:
    /\\!\\\[by\\:/,   // 转义版本 \![by:
    /\\\[.*[:：]/,    // 任何转义的方括号+冒号模式
  ],
  presets: [
    presetUno(),
    // ⚡ 禁用 presetAttributify 避免误识别 LRC 元数据格式 [ti:标题] 等
    // presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
      // ⚡ 修复打包后图标不显示的问题
      collections: {
        mdi: () => import('@iconify-json/mdi/icons.json').then(i => i.default),
      },
      // 开发环境和生产环境都使用本地图标
      cdn: undefined,
      // 使用 auto 模式自动选择最佳渲染方式
      mode: 'auto',
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  shortcuts: {
    // Neon效果相关的快捷类
    'neon-border': 'border-2 border-solid',
    'neon-glow-cyan': 'shadow-[0_0_12px_#21e6ff,0_0_24px_#21e6ff66]',
    'neon-glow-pink': 'shadow-[0_0_12px_#ff2aa1,0_0_24px_#ff2aa166]',
    'neon-glow-purple': 'shadow-[0_0_12px_#9b5cff,0_0_24px_#9b5cff66]',
    
    // 布局快捷类
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    
    // 过渡效果
    'transition-neon': 'transition-all duration-180 ease-[cubic-bezier(.2,.8,.2,1)]',
  },
  theme: {
    colors: {
      // Neon配色
      'neon-pink': '#ff2aa1',
      'neon-cyan': '#21e6ff',
      'neon-purple': '#9b5cff',
      'neon-yellow': '#ffe600',
      'neon-lime': '#d0ff00',
      
      // 背景色
      'bg-primary': '#0a0f1e',
      'bg-panel': '#0e1530',
      
      // 文本色
      'text-primary': '#eaf6ff',
      'text-muted': '#8aa4c7',
    },
    breakpoints: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
    },
  },
})

