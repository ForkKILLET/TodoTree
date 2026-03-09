<template>
  <input
    :class="['t-input', size]"
    v-model="modelValue"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})

const modelValue = defineModel<string>()
</script>

<style scoped>
.t-input {
  outline: none;
  border: 1px solid var(--color-border-light);
  font-size: var(--text-base);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.t-input.sm {
  height: 28px;
  padding: 3px 8px;
  border-radius: var(--radius-md);
}

.t-input.md {
  height: 36px;
  padding: 6px 12px;
  border-radius: var(--radius-lg);
}

.t-input:focus {
  border-color: var(--color-primary);
}
</style>
