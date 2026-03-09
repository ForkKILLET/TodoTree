<template>
  <input
    class="t-input"
    v-model="modelValue"
  />
</template>

<script setup lang="ts">
const modelValue = defineModel<string>()
</script>

<style scoped>
.t-input {
  height: 36px;
  padding: 6px 12px;

  outline: none;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);

  font-size: var(--text-base);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.t-input:focus {
  border-color: var(--color-primary);
}
</style>
