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
      :is-detail-active="selectedTodoId === todo.id"
      :external-draft="editDrafts[todo.id] ?? null"
      :force-exit="forceExitTodoId === todo.id && forceExitKey > 0"
      @toggle-expand="(id) => emit('toggle-expand', id)"
      @toggle-expand-subtree="(id) => emit('toggle-expand-subtree', id)"
      @expand-to-matched-descendants="(id) => emit('expand-to-matched-descendants', id)"
      @update="(id, changes) => emit('update', id, changes)"
      @delete="(id) => emit('delete', id)"
      @add-child="(parentId) => emit('add-child', parentId)"
      @reorder="(draggedId, targetId, insertBefore) => emit('reorder', draggedId, targetId, insertBefore)"
      @select="(id) => emit('select', id)"
      @edit-start="(id, content, source) => emit('edit-start', id, content, source)"
      @edit-change="(id, content, source) => emit('edit-change', id, content, source)"
      @edit-end="(id, content, source, saved) => emit('edit-end', id, content, source, saved)"
    />
    <div v-if="todos.length === 0" class="empty-state">
      暂无 Todo 项
    </div>
    <div v-else class="white-at-end"></div>
  </div>
</template>

<script setup lang="ts">
import TodoItem from '@/components/TodoItem.vue'
import type { TodoTreeNode } from '@/types/todo'

interface Props {
  todos: TodoTreeNode[]
  isTree?: boolean
  editingTodoId?: string | null
  isDraggable?: boolean
  selectedTodoId?: string | null
  editDrafts?: Record<string, string>
  forceExitTodoId?: string | null
  forceExitKey?: number
}

withDefaults(defineProps<Props>(), {
  isTree: true,
  editingTodoId: null,
  isDraggable: false,
  selectedTodoId: null,
  editDrafts: () => ({}),
  forceExitTodoId: null,
  forceExitKey: 0
})

const emit = defineEmits<{
  (e: 'toggle-expand', id: string): void
  (e: 'toggle-expand-subtree', id: string): void
  (e: 'expand-to-matched-descendants', id: string): void
  (e: 'update', id: string, changes: Partial<TodoTreeNode>): void
  (e: 'delete', id: string): void
  (e: 'add-child', parentId: string): void
  (e: 'reorder', draggedId: string, targetId: string, insertBefore: boolean): void
  (e: 'select', id: string): void
  (e: 'edit-start', id: string, content: string, source: 'list' | 'detail'): void
  (e: 'edit-change', id: string, content: string, source: 'list' | 'detail'): void
  (e: 'edit-end', id: string, content: string, source: 'list' | 'detail', saved: boolean): void
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

.white-at-end {
  height: 50vh;
}
</style>
