<template>
  <div class="todo-status-label">
    <StatusDot :status="status" :size="dotSize" />
    <span>{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusDot from './StatusDot.vue'
import type { TodoStatus } from '../types/todo'

interface Props {
  status: TodoStatus
  dotSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  dotSize: 14
})

const statusMap = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
  cancelled: 'Cancelled'
} as const

const text = computed(() => statusMap[props.status])
</script>

<style scoped>
.todo-status-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
