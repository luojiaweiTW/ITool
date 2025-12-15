<template>
  <NeonCard class="word-card" :class="{ mastered: word.isMastered }">
    <div class="card-content">
      <div class="word-header">
        <div class="word-main">
          <h3 class="word-text">{{ word.word }}</h3>
          <div v-if="word.phonetic" class="word-phonetic">/ {{ word.phonetic }} /</div>
        </div>
        <div class="word-actions">
          <el-button
            text
            circle
            :type="word.isMastered ? 'success' : 'default'"
            @click="$emit('toggle-mastered', word)"
            :title="word.isMastered ? '已掌握' : '标记为已掌握'"
            class="action-btn"
          >
            <i :class="word.isMastered ? 'i-mdi-check-circle' : 'i-mdi-check-circle-outline'" />
          </el-button>
          <el-button 
            text 
            circle 
            class="action-btn"
            @click="$emit('edit', word)" 
            title="编辑"
          >
            <i class="i-mdi-pencil" />
          </el-button>
          <el-button 
            text 
            circle 
            type="danger" 
            class="action-btn"
            @click="$emit('delete', word)" 
            title="删除"
          >
            <i class="i-mdi-delete" />
          </el-button>
        </div>
      </div>

      <div class="word-translation">{{ word.translation }}</div>

      <!-- 详情区域 - 仅在有内容时显示 -->
      <div v-if="word.example || word.note" class="word-details">
        <div v-if="word.example" class="detail-item">
          <div class="detail-label">
            <i class="i-mdi-format-quote-close" /> 例句
          </div>
          <div class="detail-text">{{ word.example }}</div>
        </div>

        <div v-if="word.note" class="detail-item">
          <div class="detail-label">
            <i class="i-mdi-note-text-outline" /> 备注
          </div>
          <div class="detail-text">{{ word.note }}</div>
        </div>
      </div>

      <!-- 底部信息栏 -->
      <div class="word-meta">
        <div class="meta-left">
          <div v-if="word.source" class="meta-tag source-tag" title="来源">
            <i class="i-mdi-book-open-page-variant" />
            {{ word.source }}
          </div>
          <div v-for="tag in word.tags" :key="tag" class="meta-tag tag-item">
            #{{ tag }}
          </div>
        </div>
        
        <div class="meta-right">
          <span class="review-info" :title="`上次复习: ${formatDate(word.lastReviewAt)}`">
            <i class="i-mdi-refresh" />
            {{ word.reviewCount }}
          </span>
        </div>
      </div>
    </div>
  </NeonCard>
</template>

<script setup lang="ts">
import type { Word } from '@/stores/wordbook'
import NeonCard from '@/components/NeonCard.vue'

interface Props {
  word: Word
}

defineProps<Props>()

defineEmits<{
  edit: [word: Word]
  delete: [word: Word]
  'toggle-mastered': [word: Word]
}>()

function formatDate(timestamp?: number): string {
  if (!timestamp) return '从未'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}
</script>

<style scoped>
.word-card {
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  position: relative;
  overflow: hidden;
}

.word-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.2);
  border-color: rgba(33, 230, 255, 0.3);
  background: linear-gradient(145deg, rgba(33, 230, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.word-card.mastered {
  opacity: 0.85;
  background: linear-gradient(145deg, rgba(103, 194, 58, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
  border-color: rgba(103, 194, 58, 0.2);
}

.word-card.mastered:hover {
  opacity: 1;
  border-color: rgba(103, 194, 58, 0.4);
}

.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.word-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.word-main {
  flex: 1;
  min-width: 0; /* 防止文本溢出 */
}

.word-text {
  font-size: 24px;
  font-weight: 800;
  color: var(--neon-cyan);
  margin: 0;
  line-height: 1.2;
  word-break: break-word;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(33, 230, 255, 0.2);
}

.mastered .word-text {
  color: var(--el-color-success);
  text-shadow: 0 0 10px rgba(103, 194, 58, 0.2);
}

.word-phonetic {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: 'Consolas', monospace;
  margin-top: 4px;
  opacity: 0.8;
}

.word-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
}

.word-card:hover .word-actions {
  opacity: 1;
  transform: translateX(0);
}

/* 在移动端默认显示操作按钮 */
@media (hover: none) {
  .word-actions {
    opacity: 1;
    transform: none;
  }
}

.word-translation {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.6;
  font-weight: 500;
}

.word-details {
  margin-top: auto; /* 推到底部 */
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  font-size: 13px;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  margin-bottom: 2px;
}

.detail-text {
  color: var(--color-text-secondary);
  line-height: 1.5;
  opacity: 0.9;
}

.word-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 12px;
}

.meta-left {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.meta-tag:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.source-tag {
  color: var(--neon-cyan);
  background: rgba(33, 230, 255, 0.1);
}

.meta-right {
  color: var(--color-text-secondary);
}

.review-info {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
}

.word-card:hover .review-info {
  opacity: 1;
}
</style>

