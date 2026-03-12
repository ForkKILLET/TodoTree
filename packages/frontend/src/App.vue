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
      @settings-open="handleOpenSettings"
      @export="handleExport"
      @import="handleImport"
    />

    <div v-if="loading" class="loading">加载中…</div>

    <TodoList
      v-else
      :todos="displayTodos"
      :is-tree="viewMode === 'tree'"
      :editing-todo-id="editingTodoId"
      :is-draggable="isDraggable"
      :selected-todo-id="showDetailPanel ? selectedTodoId : null"
      :edit-drafts="editDrafts"
      :force-exit-todo-id="listForceExitTodoId"
      :force-exit-key="listForceExitKey"
      @toggle-expand="toggleExpand"
      @toggle-expand-subtree="toggleExpandSubtree"
      @expand-to-matched-descendants="expandToMatchedDescendants"
      @update="handleUpdate"
      @delete="deleteTodo"
      @add-child="handleAddChild"
      @reorder="handleReorder"
      @select="handleSelectTodo"
      @edit-start="handleEditStart"
      @edit-change="handleEditChange"
      @edit-end="handleEditEnd"
    />

    <SettingsPanel :is-open="showSettings" @close="handleCloseSettings" />
    <TodoDetailPanel
      :is-open="showDetailPanel"
      :todo="selectedTodo"
      :auto-submit-on-blur="settingsData.autoSubmitOnBlur ?? true"
      :external-draft="selectedTodoId ? (editDrafts[selectedTodoId] ?? null) : null"
      :force-exit-key="detailForceExitKey"
      @close="handleCloseDetail"
      @update="handleUpdate"
      @edit-start="handleEditStart"
      @edit-change="handleEditChange"
      @edit-end="handleEditEnd"
    />
    <ConfirmDialog
      v-model="showImportConfirm"
      title="确认导入"
      :message="`确定要导入吗？将覆盖当前所有数据（共 ${pendingImportData?.length ?? 0} 条）`"
      confirm-text="导入"
      cancel-text="取消"
      @confirm="doImport"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, provide, toRaw } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import TodoList from '@/components/TodoList.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import TodoDetailPanel from '@/components/TodoDetailPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useTodos } from '@/composables/useTodos'
import { useSettings } from '@/composables/useSettings'
import { settingsDataInjectionKey } from '@/constants/inject'
import type { Todo, TodoStatus, SortOptions, TodoTreeNode } from '@/types/todo'

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
  toggleExpandSubtree,
  expandToMatchedDescendants,
  exportTodos,
  importTodos,
  setViewMode,
  setFilterOptions,
  setSortOptions
} = useTodos()

const { settingsData } = useSettings()
provide(settingsDataInjectionKey, settingsData)

const editingTodoId = ref<string | null>(null)
const showSettings = ref(false)
const selectedTodoId = ref<string | null>(null)
const editDrafts = ref<Record<string, string>>({})
const listEditingTodoId = ref<string | null>(null)
const detailEditingTodoId = ref<string | null>(null)
const listForceExitTodoId = ref<string | null>(null)
const listForceExitKey = ref(0)
const detailForceExitKey = ref(0)
const showImportConfirm = ref(false)
const pendingImportData = ref<Todo[] | null>(null)

const isDraggable = computed(() => sortOptions.value.length === 0 && viewMode.value === 'tree')
const selectedTodo = computed(() => {
  if (! selectedTodoId.value) return null
  return displayTodos.value.find(todo => todo.id === selectedTodoId.value) ?? null
})
const showDetailPanel = computed(() => !! selectedTodo.value && ! showSettings.value)
const unsavedTodoCount = computed(() => {
  const todosMap = new Map(displayTodos.value.map(todo => [todo.id, todo.content]))
  return Object.entries(editDrafts.value).reduce((count, [id, draft]) => {
    const original = todosMap.get(id)
    if (original === undefined) {
      return draft.trim().length > 0 ? count + 1 : count
    }
    return draft !== original ? count + 1 : count
  }, 0)
})

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (settingsData.value.autoSubmitOnBlur ?? true) return
  if (unsavedTodoCount.value === 0) return

  const message = `当前有 ${unsavedTodoCount.value} 个 Todo 项有未保存更改，确定要离开吗？`
  event.preventDefault()
  event.returnValue = message
}

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  await loadTodos()

  // 如果没有数据，添加一些示例数据
  if (displayTodos.value.length === 0) {
    await createTodo('欢迎使用 **TodoTree**\n\n这是一个树形 Todo 管理应用')
    await loadTodos()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const handleFilterUpdate = (statuses: TodoStatus[], searchText: string) => {
  setFilterOptions({ status: statuses.length ? statuses : undefined, searchText: searchText || undefined })
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

const handleOpenSettings = () => {
  showSettings.value = true
}

const handleExport = () => {
  const data = exportTodos()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `todotree-export-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleImport = (data: unknown) => {
  if (! Array.isArray(data)) return
  pendingImportData.value = data as Todo[]
  showImportConfirm.value = true
}

const doImport = async () => {
  if (! pendingImportData.value) return
  await importTodos(toRaw(pendingImportData.value))
  pendingImportData.value = null
}

const handleSelectTodo = (id: string) => {
  // 如果列表项正在编辑其他 todo，清除其编辑状态
  // （编辑内容保存由列表项在更新时负责）
  if (editingTodoId.value && editingTodoId.value !== id) {
    editingTodoId.value = null
  }

  selectedTodoId.value = id
  showSettings.value = false
}

const handleCloseSettings = () => {
  showSettings.value = false
}

const handleCloseDetail = () => {
  selectedTodoId.value = null
}

const handleEditStart = (todoId: string, content: string, source: 'list' | 'detail') => {
  editDrafts.value[todoId] = content

  if (source === 'list') {
    listEditingTodoId.value = todoId
    if (! (settingsData.value.autoSubmitOnBlur ?? true) && detailEditingTodoId.value === todoId) {
      detailForceExitKey.value += 1
      detailEditingTodoId.value = null
    }
    return
  }

  detailEditingTodoId.value = todoId
  if (! (settingsData.value.autoSubmitOnBlur ?? true) && listEditingTodoId.value === todoId) {
    listForceExitTodoId.value = todoId
    listForceExitKey.value += 1
    listEditingTodoId.value = null
  }
}

const handleEditChange = (todoId: string, content: string) => {
  editDrafts.value[todoId] = content
}

const handleEditEnd = (todoId: string, content: string, source: 'list' | 'detail', saved: boolean) => {
  if (saved) {
    delete editDrafts.value[todoId]
  }
  else {
    editDrafts.value[todoId] = content
  }

  if (source === 'list' && listEditingTodoId.value === todoId) {
    listEditingTodoId.value = null
  }

  if (source === 'detail' && detailEditingTodoId.value === todoId) {
    detailEditingTodoId.value = null
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
