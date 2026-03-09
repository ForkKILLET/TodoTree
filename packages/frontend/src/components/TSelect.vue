<template>
  <select
    class="t-select"
    v-model="modelValue"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
const modelValue = defineModel<string>()
</script>

<style scoped>
.t-select {
  height: 36px;
  padding: 6px 12px;

  outline: none;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);

  font-size: var(--text-base);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);

  appearance: none;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
}

.t-select:focus {
  border-color: var(--color-primary);
}
</style>
