<template>
  <div class="app">
    <Toolbar
      ref="toolbar"
      :view-mode="viewMode"
      :filter-options="filterOptions"
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
    <ConfirmDialog
      v-model="showDuplicateTodoConfirm"
      title="发现重复 Todo"
      :message="duplicateTodoMessage"
      confirm-text="确认"
      cancel-text="取消"
      tertiary-text="查看已有"
      @confirm="handleDuplicateTodoConfirm"
      @cancel="clearPendingDuplicateTodoUpdate"
      @tertiary="handleDuplicateTodoJump"
    />
    <ConfirmDialog
      v-model="showWaitingRefreshConfirm"
      title="发现新版本"
      message="TodoTree 有新版本可用，是否刷新页面以更新？"
      confirm-text="立即刷新"
      cancel-text="稍后"
      @confirm="handleWaitingRefreshConfirm"
      @cancel="handleWaitingRefreshCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, provide, toRaw, watch, nextTick, useTemplateRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import Toolbar from '@/components/Toolbar.vue'
import TodoList from '@/components/TodoList.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import TodoDetailPanel from '@/components/TodoDetailPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useTodos } from '@/composables/useTodos'
import { useSettings } from '@/composables/useSettings'
import { settingsDataInjectionKey } from '@/constants/inject'
import type { Todo, FilterOptions, SortOptions, TodoTreeNode } from '@/types/todo'
import type { PwaWaitingRefreshEvent } from '@/types/pwa'

const {
  todos,
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
  setSortOptions,
  setPreserveVisibleTodoIds
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
const showDuplicateTodoConfirm = ref(false)
const showWaitingRefreshConfirm = ref(false)
const waitingRefreshWorker = ref<ServiceWorker | null>(null)
const pendingDuplicateTodoUpdate = ref<{
  todoId: string
  content: string
  duplicateIds: string[]
} | null>(null)

const isDraggable = computed(() => sortOptions.value.length === 0 && viewMode.value === 'tree')
const selectedTodo = computed(() => {
  if (! selectedTodoId.value) return null
  return displayTodos.value.find(todo => todo.id === selectedTodoId.value) ?? null
})
const showDetailPanel = computed(() => !! selectedTodo.value && ! showSettings.value)
const editingPreserveIds = computed(() => {
  const ids = new Set<string>()
  if (selectedTodoId.value) ids.add(selectedTodoId.value)
  if (editingTodoId.value) ids.add(editingTodoId.value)
  if (listEditingTodoId.value) ids.add(listEditingTodoId.value)
  if (detailEditingTodoId.value) ids.add(detailEditingTodoId.value)
  return [...ids]
})
const duplicateTodoMessage = computed(() => {
  const pending = pendingDuplicateTodoUpdate.value
  if (! pending) return '有重复的 Todo 项。'

  return '有重复的 Todo 项。是否继续保存？'
})
const unsavedTodoCount = computed(() => {
  const todosMap = new Map(displayTodos.value.map(todo => [todo.id, todo.content]))
  return Object
    .entries(editDrafts.value)
    .reduce((count, [id, draft]) => {
      const original = todosMap.get(id)
      const isUnsaved = original === undefined
        ? draft.trim().length > 0
        : draft !== original
      return count + Number(isUnsaved)
    }, 0)
})

const TODO_SELECTOR = '.todo-item'
let filterScrollSyncToken = 0

interface ViewportScrollAnchor {
  todoId: string
  offsetFromVisibleTop: number
}

const toolbar = useTemplateRef('toolbar')

const getViewportVisibleTop = () => {
  const toolbarElement = toolbar.value?.$el as HTMLElement | undefined
  if (! toolbarElement) return 0

  const rect = toolbarElement.getBoundingClientRect()
  if (rect.bottom <= 0) return 0

  return Math.min(rect.bottom, window.innerHeight)
}

const captureTopVisibleRootTodoAnchor = (): ViewportScrollAnchor | null => {
  const todoElements = Array.from(document.querySelectorAll<HTMLElement>(TODO_SELECTOR))
  if (todoElements.length === 0) return null

  const viewportVisibleTop = getViewportVisibleTop()
  const viewportHeight = window.innerHeight
  const visibleTodoElements = todoElements.filter(element => {
    const rect = element.getBoundingClientRect()
    return rect.top > viewportVisibleTop && rect.bottom < viewportHeight
  })

  if (visibleTodoElements.length === 0) return null

  const topVisibleElement = visibleTodoElements.reduce((candidate, element) => {
    const candidateLevel = Number(candidate.dataset.todoLevel ?? '')
    const elementLevel = Number(element.dataset.todoLevel ?? '')
    const normalizedCandidateLevel = Number.isFinite(candidateLevel) ? candidateLevel : Number.POSITIVE_INFINITY
    const normalizedElementLevel = Number.isFinite(elementLevel) ? elementLevel : Number.POSITIVE_INFINITY

    if (normalizedElementLevel !== normalizedCandidateLevel) {
      return normalizedElementLevel < normalizedCandidateLevel ? element : candidate
    }

    const candidateVisibleTop = Math.max(candidate.getBoundingClientRect().top, viewportVisibleTop)
    const elementVisibleTop = Math.max(element.getBoundingClientRect().top, viewportVisibleTop)
    return elementVisibleTop < candidateVisibleTop ? element : candidate
  })

  const todoId = topVisibleElement.dataset.todoId
  if (! todoId) return null

  return {
    todoId,
    offsetFromVisibleTop: topVisibleElement.getBoundingClientRect().top - viewportVisibleTop
  }
}

const restoreRootTodoAnchorPosition = (anchor: ViewportScrollAnchor) => {
  const target = document.querySelector<HTMLElement>(`${TODO_SELECTOR}[data-todo-id="${anchor.todoId}"]`)
  if (! target) return null

  const viewportVisibleTop = getViewportVisibleTop()
  const desiredTop = viewportVisibleTop + anchor.offsetFromVisibleTop
  const offset = target.getBoundingClientRect().top - desiredTop
  const absOffset = Math.abs(offset)
  if (absOffset < 0.5) return absOffset

  window.scrollBy({ top: offset, behavior: 'auto' })
  return absOffset
}

const waitForNextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (settingsData.value.autoSubmitOnBlur ?? true) return
  if (unsavedTodoCount.value === 0) return

  event.preventDefault()
}

const handleWaitingRefresh = (event: PwaWaitingRefreshEvent) => {
  waitingRefreshWorker.value = event.detail.worker
  showWaitingRefreshConfirm.value = true
}

const handleWaitingRefreshConfirm = () => {
  const worker = waitingRefreshWorker.value
  waitingRefreshWorker.value = null

  if (! worker) return

  worker.postMessage({ type: 'SKIP_WAITING' })
  window.location.reload()
}

const handleWaitingRefreshCancel = () => {
  waitingRefreshWorker.value = null
}

useEventListener(window, 'beforeunload', handleBeforeUnload)
useEventListener(window, 'rsbuild-plugin-pwa:waiting-refresh', handleWaitingRefresh)

onMounted(async () => {
  await loadTodos()

  // 如果没有数据，添加一些示例数据
  if (displayTodos.value.length === 0) {
    await createTodo('欢迎使用 **TodoTree**\n\n这是一个树形 Todo 管理应用')
    await loadTodos()
  }
})

watch(
  editingPreserveIds,
  setPreserveVisibleTodoIds,
  { immediate: true }
)

const handleFilterUpdate = async (options: FilterOptions) => {
  const anchor = captureTopVisibleRootTodoAnchor()
  filterScrollSyncToken += 1
  const token = filterScrollSyncToken

  setFilterOptions(options)

  if (! anchor) return
  await nextTick()

  if (token !== filterScrollSyncToken) return
  restoreRootTodoAnchorPosition(anchor)

  // 二次校正，覆盖筛选后 toolbar 高度/内容重排带来的迟到位移
  await waitForNextFrame()
  if (token !== filterScrollSyncToken) return
  restoreRootTodoAnchorPosition(anchor)
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

const getDuplicateSiblingIds = (todoId: string, content: string) => {
  const normalized = content.trim()
  if (! normalized) return []

  const currentTodo = todos.value.find(todo => todo.id === todoId)
  if (! currentTodo) return []

  return todos.value
    .filter(todo => {
      if (todo.id === todoId) return false
      if (todo.parentId !== currentTodo.parentId) return false
      return todo.content.trim() === normalized
    })
    .sort((a, b) => a.order - b.order)
    .map(todo => todo.id)
}

const expandToTodo = (todoId: string) => {
  const todoMap = new Map(todos.value.map(todo => [todo.id, todo]))
  let current = todoMap.get(todoId)

  while (current?.parentId) {
    if (! expandedIds.value.has(current.parentId)) {
      toggleExpand(current.parentId)
    }
    current = todoMap.get(current.parentId)
  }
}

const clearPendingDuplicateTodoUpdate = () => {
  pendingDuplicateTodoUpdate.value = null
}

const handleUpdate = async (id: string, changes: Partial<TodoTreeNode>) => {
  const nextContent = typeof changes.content === 'string' ? changes.content : null
  if (nextContent !== null) {
    const currentTodo = todos.value.find(todo => todo.id === id)
    if (currentTodo && nextContent !== currentTodo.content) {
      const duplicateIds = getDuplicateSiblingIds(id, nextContent)
      if (duplicateIds.length > 0) {
        pendingDuplicateTodoUpdate.value = { todoId: id, content: nextContent, duplicateIds }
        showDuplicateTodoConfirm.value = true
        return
      }
    }
  }

  await updateTodo(id, changes)
  if (editingTodoId.value === id && Object.prototype.hasOwnProperty.call(changes, 'content')) {
    editingTodoId.value = null
  }
}

const handleDuplicateTodoConfirm = async () => {
  const pending = pendingDuplicateTodoUpdate.value
  if (! pending) return

  await updateTodo(pending.todoId, { content: pending.content })
  delete editDrafts.value[pending.todoId]

  if (editingTodoId.value === pending.todoId) {
    editingTodoId.value = null
  }

  clearPendingDuplicateTodoUpdate()
}

const handleDuplicateTodoJump = () => {
  const pending = pendingDuplicateTodoUpdate.value
  if (! pending) return

  const existingTodoId = pending.duplicateIds[0]
  if (! existingTodoId) {
    clearPendingDuplicateTodoUpdate()
    return
  }

  expandToTodo(existingTodoId)
  selectedTodoId.value = existingTodoId
  showSettings.value = false
  clearPendingDuplicateTodoUpdate()
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
  const hasPendingDuplicateForTodo = pendingDuplicateTodoUpdate.value?.todoId === todoId

  if (saved && ! hasPendingDuplicateForTodo) {
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
