<template>
  <div class="side-panel" v-show="isOpen">
    <div class="side-panel-header">
      <h2>{{ title }}</h2>
      <button
        type="button"
        class="side-panel-close"
        @click="emit('close')"
        v-tooltip="'关闭'"
      >
        <X :size="20" />
      </button>
    </div>

    <div class="side-panel-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { vTooltip } from '../directives/tooltip'

interface Props {
  isOpen: boolean
  title: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped>
.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(100vw, 360px);
  z-index: 999;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
}

.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.side-panel-header h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.side-panel-close {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}

.side-panel-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.side-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
