<template>
  <header class="neon-header">
    <div class="neon-header__main">
      <div class="neon-header__info">
        <h1 class="neon-header__title">
          <i v-if="icon" :class="icon" class="neon-header__icon" />
          {{ title }}
        </h1>
        <p v-if="description" class="neon-header__description">
          {{ description }}
        </p>
      </div>
      <div class="neon-header__actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.tabs" class="neon-header__tabs">
      <slot name="tabs" />
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  icon?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
})
</script>

<style scoped>
.neon-header {
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgba(13, 18, 29, 0.8); /* 半透明背景 */
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); /* 极细底边框 */
  z-index: var(--z-sticky);
}

.neon-header__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 32px;
  min-height: 72px;
}

.neon-header__info {
  flex: 1;
  min-width: 0;
}

.neon-header__title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.5px;
}

.neon-header__icon {
  font-size: 22px;
  color: var(--neon-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 移除原本厚重的边框，改为纯净的图标 */
  width: 32px;
  height: 32px;
  background: rgba(33, 230, 255, 0.1);
  border-radius: 8px;
}

.neon-header__description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-muted);
  font-weight: 400;
  padding-left: 44px; /* 对齐标题文字 */
}

/* 如果没有图标，取消左缩进 */
.neon-header__title:not(:has(.neon-header__icon)) + .neon-header__description {
  padding-left: 0;
}

.neon-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.neon-header__tabs {
  padding: 0 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

/* 顶部细微高光条，增加精致感 */
.neon-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.1) 50%, 
    transparent 100%
  );
}
</style>