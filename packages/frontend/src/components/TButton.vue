<template>
  <button
    v-tooltip="tooltip"
    :type="type"
    :class="['t-button', size, theme, { active, square }]"
    v-bind="$attrs"
  >
    <component v-if="icon" :is="icon" :size="iconSize" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { vTooltip } from '@/directives/tooltip'

interface Props {
  icon?: Component
  size?: 'xs' | 'sm' | 'md'
  theme?: 'normal' | 'primary' | 'ghost'
  square?: boolean
  active?: boolean
  tooltip?: string
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  theme: 'normal',
  active: false,
  tooltip: '',
  type: 'button'
})

const iconSize = computed(() => (props.size === 'sm' ? 14 : 18))
</script>

<style scoped>
.t-button {
  border: none;
  cursor: pointer;
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.t-button.xs {
  height: 20px;
  border-radius: var(--radius-md);
}

.t-button.xs:not(.square, .ghost) {
  padding: 2px 4px;
}

.t-button.sm {
  height: 28px;
  border-radius: var(--radius-md);
}

.t-button.sm:not(.square, .ghost) {
  padding: 3px 6px;
}

.t-button.md {
  height: 36px;
  border-radius: var(--radius-lg);
}

.t-button.md:not(.square, .ghost) {
  padding: 6px 12px;
}

.t-button.square.xs {
  width: 20px;
}

.t-button.square.sm {
  width: 28px;
}

.t-button.square.md {
  width: 36px;
}

.t-button.normal {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.t-button.normal {
  border: 1px solid var(--color-border-light);
}

.t-button.ghost {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
}

.t-button:not(.active, .primary):hover {
  background: var(--color-bg-hover);
}

.t-button:not(.ghost).active:hover,
.t-button.primary:hover {
  background: var(--color-primary-hover);
}

.t-button.primary {
  background: var(--color-primary);
  color: var(--color-bg-primary);
}

.t-button.square {
  padding: 0;
}

.t-button:not(.ghost).active {
  background: var(--color-primary);
  color: var(--color-bg-primary);
}

.t-button.ghost:hover,
.t-button.ghost.active {
  background: var(--color-bg-hover);
}
</style>
