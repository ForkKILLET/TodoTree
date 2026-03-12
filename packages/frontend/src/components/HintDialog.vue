<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="dialog-overlay" @click.self="close">
        <div class="dialog-content">
          <div class="dialog-header">
            <h3 class="dialog-title">提示</h3>
          </div>
          <div class="dialog-body">
            <p class="dialog-message">{{ hints[currentIndex] }}</p>
            <p class="dialog-counter">{{ currentIndex + 1 }} / {{ hints.length }}</p>
          </div>
          <div class="dialog-footer">
            <TButton theme="normal" @click="close">关闭</TButton>
            <TButton theme="primary" @click="next">下一个</TButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import TButton from '@/components/TButton.vue'

interface Props {
  modelValue: boolean
  hints: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const currentIndex = ref(0)

const randomIndex = () => Math.floor(Math.random() * props.hints.length)

watch(
  () => props.modelValue,
  open => {
    if (open) currentIndex.value = randomIndex()
  }
)

const next = () => {
  let next = randomIndex()
  // avoid repeating the same hint consecutively
  if (props.hints.length > 1 && next === currentIndex.value) {
    next = (next + 1) % props.hints.length
  }
  currentIndex.value = next
}

const close = () => emit('update:modelValue', false)
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.dialog-content {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 90%;
  width: 420px;
  overflow: hidden;
}

.dialog-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.dialog-body {
  padding: 20px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 80px;
}

.dialog-message {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.dialog-counter {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary, var(--color-text-secondary));
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-active .dialog-content,
.dialog-fade-leave-active .dialog-content {
  transition: transform 0.2s ease;
}

.dialog-fade-enter-from .dialog-content,
.dialog-fade-leave-to .dialog-content {
  transform: scale(0.95);
}
</style>
