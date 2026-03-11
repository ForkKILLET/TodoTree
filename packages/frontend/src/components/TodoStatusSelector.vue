<template>
  <TDropdown :disabled="! isInteractive" class="todo-status-selector">
    <div
      class="status-trigger"
      :class="{ 'is-interactive': isInteractive, 'show-label': showLabel }"
      @click="handleClick"
    >
      <StatusDot
        :status="status"
        :show-ring="showRing"
        :distribution="distribution"
        :size="dotSize"
      />
      <span v-if="showLabel" class="status-label-text">{{ currentLabel }}</span>
    </div>

    <template #panel="{ close }">
      <div class="status-option-list">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          class="status-option"
          :class="{ 'is-active': opt.value === status }"
          @click.stop="handleSelect(opt.value, close)"
        >
          <StatusDot :status="opt.value" :size="12" />
          <span>{{ opt.label }}</span>
          <Check v-if="opt.value === status" :size="12" class="check-icon" />
        </button>
      </div>
    </template>
  </TDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import TDropdown from './TDropdown.vue'
import StatusDot from './StatusDot.vue'
import type { TodoStatus, StatusDistribution } from '../types/todo'

interface Props {
  status: TodoStatus
  showLabel?: boolean
  dotSize?: number
  showRing?: boolean
  distribution?: StatusDistribution
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: false,
  dotSize: 16,
  showRing: false,
  distribution: () => ({ todo: 0, doing: 0, done: 0, cancelled: 0 })
})

const emit = defineEmits<{
  (e: 'change', status: TodoStatus): void
}>()

// 非叶子节点（showRing）不允许交互
const isInteractive = computed(() => ! props.showRing)

const statusOptions: { value: TodoStatus, label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' }
]

const currentLabel = computed(() => statusOptions.find(o => o.value === props.status)?.label ?? props.status)

const cyclableStatuses: TodoStatus[] = ['todo', 'doing', 'done']

const handleClick = (e: MouseEvent) => {
  if (! isInteractive.value) return
  e.stopPropagation()
  const idx = cyclableStatuses.indexOf(props.status)
  const next = cyclableStatuses[(idx < 0 ? 0 : idx + 1) % cyclableStatuses.length]
  emit('change', next)
}

const handleSelect = (status: TodoStatus, close: () => void) => {
  emit('change', status)
  close()
}
</script>

<style scoped>
.status-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-sm);
  padding: 3px 4px;
  transition: background 0.15s;
}

.status-trigger.is-interactive {
  cursor: pointer;
}

.status-trigger.is-interactive:hover {
  background: var(--color-bg-hover);
}

.status-trigger.show-label {
  padding: 5px 6px;
  margin-left: -6px;
  border-radius: var(--radius-md);
}

.status-label-text {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  line-height: 1;
}

.status-option-list {
  min-width: 140px;
  padding: 4px 0;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--text-base);
  cursor: pointer;
  text-align: left;
  line-height: 1;
}

.status-option:hover {
  background: var(--color-bg-hover);
}

.status-option.is-active {
  color: var(--color-primary);
  font-weight: 500;
}

.check-icon {
  margin-left: auto;
  color: var(--color-primary);
}
</style>
