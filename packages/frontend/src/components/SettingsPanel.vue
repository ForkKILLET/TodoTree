<template>
  <TSidePanel :is-open="isOpen" title="设置" @close="emit('close')">
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
  </TSidePanel>
</template>

<script setup lang="ts">
import TSidePanel from './TSidePanel.vue'
import { useSettings } from '../composables/useSettings'

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
.settings-content {
  padding: 0;
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
