<template>
  <div
    :class="[
      'neon-card',
      `neon-card--${variant}`,
      {
        'neon-card--hoverable': hoverable,
        'neon-card--compact': compact,
      }
    ]"
  >
    <div v-if="$slots.header || title" class="neon-card__header">
      <div class="neon-card__header-content">
        <div v-if="icon" class="neon-card__icon">
          <i :class="icon" />
        </div>
        <div class="neon-card__header-text">
          <h3 v-if="title" class="neon-card__title">{{ title }}</h3>
          <p v-if="subtitle" class="neon-card__subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="$slots.extra" class="neon-card__extra">
        <slot name="extra" />
      </div>
      <slot name="header" />
    </div>
    
    <div class="neon-card__body">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="neon-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  icon?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  hoverable?: boolean
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  hoverable: false,
  compact: false,
})
</script>

<style scoped>
.neon-card {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 修复：使用深色背景，而不是白色半透明，避免发灰 */
  background: rgba(30, 27, 46, 0.6); 
  backdrop-filter: blur(12px);
  /* 修复：边框带一点紫色调 */
  border: 1px solid rgba(120, 110, 160, 0.2); 
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.neon-card--hoverable {
  cursor: pointer;
}

.neon-card--hoverable:hover {
  transform: translateY(-2px);
  /* 悬停时稍微亮一点，带青色倾向 */
  background: rgba(40, 35, 60, 0.8);
  border-color: rgba(33, 230, 255, 0.3);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(33, 230, 255, 0.1);
}

/* 紧凑模式 */
.neon-card--compact .neon-card__header,
.neon-card--compact .neon-card__body,
.neon-card--compact .neon-card__footer {
  padding: 12px 16px;
}

/* 变体样式 - 左侧细条 */
.neon-card--primary { border-left: 3px solid var(--neon-cyan); }
.neon-card--success { border-left: 3px solid var(--neon-lime); }
.neon-card--warning { border-left: 3px solid var(--neon-yellow); }
.neon-card--danger  { border-left: 3px solid var(--neon-pink); }
.neon-card--info    { border-left: 3px solid var(--neon-purple); }

/* Header */
.neon-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(120, 110, 160, 0.1);
  background: rgba(30, 27, 46, 0.3);
}

.neon-card__header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.neon-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--neon-cyan);
  width: 32px;
  height: 32px;
  /* 图标背景改为深色半透明 */
  background: rgba(33, 230, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(33, 230, 255, 0.2);
}

.neon-card__header-text {
  flex: 1;
  min-width: 0;
}

.neon-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
}

.neon-card__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-muted);
}

.neon-card__extra {
  margin-left: 16px;
}

/* Body */
.neon-card__body {
  flex: 1;
  padding: 24px;
}

/* Footer */
.neon-card__footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(120, 110, 160, 0.1);
  background: rgba(30, 27, 46, 0.3);
}
</style>
