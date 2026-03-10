<template>
  <div class="todo-list">
    <TodoItem
      v-for="todo in todos"
      :key="todo.id"
      :todo="todo"
      :is-tree="isTree"
      :level="isTree ? todo.level : 0"
      :should-auto-edit="editingTodoId === todo.id"
      :is-draggable="isDraggable"
      @toggle-expand="(id) => $emit('toggle-expand', id)"
      @expand-to-matched-descendants="(id) => $emit('expand-to-matched-descendants', id)"
      @update="(id, changes) => $emit('update', id, changes)"
      @delete="(id) => $emit('delete', id)"
      @add-child="(parentId) => $emit('add-child', parentId)"
      @reorder="(draggedId, targetId, insertBefore) => $emit('reorder', draggedId, targetId, insertBefore)"
    />
    <div v-if="todos.length === 0" class="empty-state">
      暂无 Todo 项
    </div>
  </div>
</template>

<script setup lang="ts">
import TodoItem from './TodoItem.vue'
import type { TodoTreeNode } from '../types/todo'

interface Props {
  todos: TodoTreeNode[]
  isTree?: boolean
  editingTodoId?: string | null
  isDraggable?: boolean
}

withDefaults(defineProps<Props>(), {
  isTree: true,
  editingTodoId: null,
  isDraggable: false
})

defineEmits<{
  (e: 'toggle-expand', id: string): void
  (e: 'expand-to-matched-descendants', id: string): void
  (e: 'update', id: string, changes: Partial<TodoTreeNode>): void
  (e: 'delete', id: string): void
  (e: 'add-child', parentId: string): void
  (e: 'reorder', draggedId: string, targetId: string, insertBefore: boolean): void
}>()
</script>

<style scoped>
.todo-list {
  padding: 8px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  color: #9ca3af;
  padding: 40px;
  font-size: var(--text-lg);
}
</style>
