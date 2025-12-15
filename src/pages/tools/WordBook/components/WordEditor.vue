<template>
  <el-dialog
    :model-value="modelValue"
    :title="word ? '编辑单词' : '添加单词'"
    width="600px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-form :model="form" label-width="80px" label-position="left">
      <el-form-item label="单词" required>
        <el-input
          v-model="form.word"
          placeholder="输入单词"
          :disabled="!!word"
        />
      </el-form-item>

      <el-form-item label="音标">
        <el-input
          v-model="form.phonetic"
          placeholder="输入音标（可选）"
        />
      </el-form-item>

      <el-form-item label="翻译" required>
        <el-input
          v-model="form.translation"
          type="textarea"
          :rows="2"
          placeholder="输入翻译"
        />
      </el-form-item>

      <el-form-item label="例句">
        <el-input
          v-model="form.example"
          type="textarea"
          :rows="2"
          placeholder="输入例句（可选）"
        />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="3"
          placeholder="输入备注（可选）"
        />
      </el-form-item>

      <el-form-item label="来源">
        <el-input
          v-model="form.source"
          placeholder="如：第一册 / Lesson 1（可选）"
        />
      </el-form-item>

      <el-form-item label="标签">
        <div class="tags-input">
          <el-tag
            v-for="tag in form.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="tagInputVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            size="small"
            class="tag-input"
            @keyup.enter="addTag"
            @blur="addTag"
          />
          <el-button
            v-else
            text
            size="small"
            @click="showTagInput"
          >
            + 添加标签
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { Word } from '@/stores/wordbook'

interface Props {
  modelValue: boolean
  word?: Word | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [word: Omit<Word, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount'>]
}>()

const form = ref({
  word: '',
  phonetic: '',
  translation: '',
  example: '',
  note: '',
  source: '',
  tags: [] as string[],
  isMastered: false,
})

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref<HTMLInputElement>()

watch(() => props.word, (newWord) => {
  if (newWord) {
    form.value = {
      word: newWord.word,
      phonetic: newWord.phonetic || '',
      translation: newWord.translation,
      example: newWord.example || '',
      note: newWord.note || '',
      source: newWord.source || '',
      tags: [...newWord.tags],
      isMastered: newWord.isMastered,
    }
  } else {
    form.value = {
      word: '',
      phonetic: '',
      translation: '',
      example: '',
      note: '',
      source: '',
      tags: [],
      isMastered: false,
    }
  }
}, { immediate: true })

watch(() => props.modelValue, (visible) => {
  if (!visible) {
    tagInputVisible.value = false
    tagInputValue.value = ''
  }
})

function showTagInput() {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

function addTag() {
  const tag = tagInputValue.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  tagInputValue.value = ''
  tagInputVisible.value = false
}

function removeTag(tag: string) {
  const index = form.value.tags.indexOf(tag)
  if (index > -1) {
    form.value.tags.splice(index, 1)
  }
}

function handleSave() {
  if (!form.value.word.trim()) {
    ElMessage.warning('请输入单词')
    return
  }
  if (!form.value.translation.trim()) {
    ElMessage.warning('请输入翻译')
    return
  }

  emit('save', {
    word: form.value.word.trim(),
    phonetic: form.value.phonetic.trim() || undefined,
    translation: form.value.translation.trim(),
    example: form.value.example.trim() || undefined,
    note: form.value.note.trim() || undefined,
    source: form.value.source.trim() || undefined,
    tags: form.value.tags,
    isMastered: form.value.isMastered,
  })
}
</script>

<style scoped>
.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-item {
  margin: 0;
}

.tag-input {
  width: 120px;
}
</style>

