<template>
  <div :class="['t-button-group', size]">
    <slot ghost :size="size" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})
</script>

<style scoped>
.t-button-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.t-button-group :deep(.t-button) {
  border: none;
  border-radius: 0;
}

.t-button-group.sm :deep(.t-button) {
  height: calc(28px - 2px);
}

.t-button-group.md :deep(.t-button) {
  height: calc(36px - 2px);
}

.t-button-group.sm :deep(.t-button.square) {
  width: calc(28px - 2px);
}

.t-button-group.md :deep(.t-button.square) {
  width: calc(36px - 2px);
}

.t-button-group :deep(.t-button + .t-button) {
  border-left: 1px solid var(--color-border-light);
}
</style>
