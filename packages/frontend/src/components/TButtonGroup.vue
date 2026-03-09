<template>
  <div :class="['t-button-group', size]">
    <div class="t-button-group-wrapper">
      <slot />
    </div>
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
.t-button-group-wrapper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-primary);
  overflow: hidden;
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
