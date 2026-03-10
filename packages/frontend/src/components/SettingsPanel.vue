<template>
  <div class="settings-panel" v-show="isOpen">
    <div class="settings-header">
      <h2>设置</h2>
      <button
        type="button"
        class="settings-close"
        @click="emit('close')"
        v-tooltip="'关闭'"
      >
        <X :size="20" />
      </button>
    </div>

    <div class="settings-content">
      <div v-for="section in sections" :key="section.id" class="settings-section">
        <h3 class="settings-section-title">{{ section.label }}</h3>

        <div class="settings-items">
          <div v-for="item in section.items" :key="item.key" class="settings-item">
            <label class="settings-item-label">
              <div class="settings-item-info">
                <span class="settings-item-name">{{ item.label }}</span>
                <span v-if="item.description" class="settings-item-description">
                  {{ item.description }}
                </span>
              </div>

              <input
                v-if="item.type === 'boolean'"
                type="checkbox"
                class="settings-toggle"
                v-model="item.ref.value"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useSettings } from '../composables/useSettings'
import { vTooltip } from '../directives/tooltip'

interface Props {
  isOpen: boolean
}

const emit = defineEmits<{
  (e: 'close'): void
}>()

defineProps<Props>()

const { getSections } = useSettings()
const sections = getSections()
</script>

<style scoped>
.settings-panel {
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

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.settings-header h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-close {
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

.settings-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section-title {
  margin: 0 0 12px 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-item {
  padding: 8px;
}

.settings-item-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  gap: 12px;
}

.settings-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-item-name {
  font-size: var(--text-base);
  color: var(--color-text-primary);
}

.settings-item-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.settings-toggle {
  width: 40px;
  height: 24px;
  appearance: none;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.settings-toggle:checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.settings-toggle::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: var(--transition-fast);
}

.settings-toggle:checked::before {
  left: 18px;
}
</style>
