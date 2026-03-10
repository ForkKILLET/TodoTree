<template>
  <div class="app">
    <Toolbar
      :view-mode="viewMode"
      :filter-statuses="filterOptions.status || []"
      :filter-search-text="filterOptions.searchText || ''"
      :sort-steps="sortOptions"
      @update:view-mode="setViewMode"
      @update:filter="handleFilterUpdate"
      @update:sort="handleSortUpdate"
      @add-root="handleAddRoot"
      @settings-open="showSettings = true"
    />

    <div v-if="loading" class="loading">加载中…</div>

    <TodoList
      v-else
      :todos="displayTodos"
      :is-tree="viewMode === 'tree'"
      :editing-todo-id="editingTodoId"
      :is-draggable="isDraggable"
      @toggle-expand="toggleExpand"
      @expand-to-matched-descendants="expandToMatchedDescendants"
      @update="handleUpdate"
      @delete="deleteTodo"
      @add-child="handleAddChild"
      @reorder="handleReorder"
    />

    <SettingsPanel :is-open="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, provide } from 'vue'
import Toolbar from './components/Toolbar.vue'
import TodoList from './components/TodoList.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useTodos } from './composables/useTodos'
import { useSettings } from './composables/useSettings'
import { settingsDataInjectionKey } from './injectionKeys/settings'
import type { TodoStatus, SortOptions, TodoTreeNode } from './types/todo'

const {
  displayTodos,
  viewMode,
  filterOptions,
  sortOptions,
  loading,
  expandedIds,
  loadTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  toggleExpand,
  expandToMatchedDescendants,
  setViewMode,
  setFilterOptions,
  setSortOptions
} = useTodos()

const { settingsData } = useSettings()
provide(settingsDataInjectionKey, settingsData)

const editingTodoId = ref<string | null>(null)
const showSettings = ref(false)

const isDraggable = computed(() => sortOptions.value.length === 0 && viewMode.value === 'tree')

onMounted(async () => {
  await loadTodos()

  // 如果没有数据，添加一些示例数据
  if (displayTodos.value.length === 0) {
    await createTodo('欢迎使用 **TodoTree**\n\n这是一个树形 Todo 管理应用')
    await loadTodos()
  }
})

const handleFilterUpdate = (statuses: TodoStatus[], searchText: string) => {
  setFilterOptions({ status: statuses.length > 0 ? statuses : undefined, searchText: searchText || undefined })
}

const handleSortUpdate = (sortSteps: SortOptions) => {
  setSortOptions(sortSteps)
}

const handleAddRoot = async () => {
  const id = await createTodo('', null)
  editingTodoId.value = id
}

const handleAddChild = async (parentId: string) => {
  if (viewMode.value === 'tree' && ! expandedIds.value.has(parentId)) {
    toggleExpand(parentId)
  }
  const id = await createTodo('', parentId)
  editingTodoId.value = id
}

const handleUpdate = async (id: string, changes: Partial<TodoTreeNode>) => {
  await updateTodo(id, changes)
  if (editingTodoId.value === id && Object.prototype.hasOwnProperty.call(changes, 'content')) {
    editingTodoId.value = null
  }
}

const handleReorder = async (draggedId: string, targetId: string, insertBefore: boolean) => {
  await reorderTodos(draggedId, targetId, insertBefore)
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--color-bg-secondary);
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
}
</style>
