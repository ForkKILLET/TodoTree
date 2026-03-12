<template>
  <div
    class="todo-item"
    :class="{
      'filter-match': todo.isFilterMatch,
      'drag-over-before': dragPosition === 'before',
      'drag-over-after': dragPosition === 'after'
    }"
    :style="{ '--indent-offset': `${level * 30}px` }"
    :draggable="isDraggable"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
    @dragend="handleDragEnd"
  >
    <TButtonGroup class="todo-item-actions" size="sm" :class="{ 'is-visible': isEditing }">
      <TButton
        v-for="button in currentActionButtons"
        :key="button.key"
        class="action-btn"
        square
        :icon="button.icon"
        :active="button.active"
        :tooltip="button.tooltip"
        @click="button.onClick"
      />
    </TButtonGroup>

    <div class="todo-item-wrapper">
      <TButton
        v-if="isTree && todo.children.length"
        :class="['expand-btn', { 'expand-to-match': todo.hasCollapsedMatchedDescendant }]"
        size="sm"
        theme="ghost"
        square
        :icon="todo.hasCollapsedMatchedDescendant ? ChevronsRight : (todo.isExpanded ? ChevronDown : ChevronRight)"
        :tooltip="todo.hasCollapsedMatchedDescendant ? '展开到匹配子项' : (todo.isExpanded ? '收起' : '展开')"
        @click="handleExpandClick"
      />
      <div v-else-if="isTree" class="expand-placeholder"></div>

      <div
        class="todo-item-content"
        :class="{ 'detail-active': isDetailActive }"
        data-editor-root
        @click="handleSelect"
      >
        <TodoStatusSelector
          :status="todo.status"
          :show-ring="! isLeaf"
          :distribution="todo.leafStatusDistribution"
          :dot-size="16"
          @change="setStatus"
        />

        <div
          v-if="! isEditing"
          class="markdown"
          v-html="renderedContent"
          @dblclick="startListEdit"
        ></div>
        <template v-else>
          <div
            v-if="editMode === 'wysiwyg'"
            :ref="setEditInputRef"
            class="markdown edit-contenteditable"
            contenteditable="true"
            @input="handleEditInput"
            @blur="handleEditorBlur"
            @keydown.ctrl.enter.prevent="saveAndExitEdit"
          ></div>
          <textarea
            v-else
            :ref="setMarkdownInputRef"
            v-model="editContent"
            class="edit-markdown"
            @blur="handleEditorBlur"
            @keydown.ctrl.enter.prevent="saveAndExitEdit"
          />
        </template>

        <span
          v-if="todo.dueAt"
          class="due-clock"
          :style="{ color: dueTimerColor }"
          :title="dueTimerTitle"
        >
          <Timer :size="13" />
        </span>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model="showDeleteDialog"
    title="删除确认"
    message="确定要删除这个 Todo 项吗？此操作将同时删除所有子项且无法撤销。"
    confirm-text="删除"
    cancel-text="取消"
    @confirm="handleDeleteConfirm"
  />
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, onMounted, onBeforeUnmount, toRef } from 'vue'
import { ChevronRight, ChevronDown, ChevronsRight, Pencil, Plus, Trash2, FileCode2, NotebookPen, Check, X, Timer } from 'lucide-vue-next'
import type { Component } from 'vue'
import TButton from '@/components/TButton.vue'
import TodoStatusSelector from '@/components/TodoStatusSelector.vue'
import type { TodoTreeNode, TodoStatus } from '@/types/todo'
import TButtonGroup from '@/components/TButtonGroup.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { settingsDataInjectionKey } from '@/constants/inject'
import { useTodoContentEditor } from '@/composables/useTodoContentEditor'
import { useNow } from '@/composables/useNow'
import { useDueColor, ONE_DAY } from '@/composables/useDueColor'

interface Props {
  todo: TodoTreeNode
  isTree?: boolean
  level?: number
  shouldAutoEdit?: boolean
  isDraggable?: boolean
  isDetailActive?: boolean
  externalDraft?: string | null
  forceExit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isTree: true,
  level: 0,
  shouldAutoEdit: false,
  isDraggable: false,
  isDetailActive: false,
  externalDraft: null,
  forceExit: false
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

const showDeleteDialog = ref(false)
const dragPosition = ref<'before' | 'after' | null>(null)
const CLEAR_DRAG_INDICATORS_EVENT = 'todotree:clear-drag-indicators'
const ROOT_PARENT_KEY = '__ROOT__'
const DRAG_PARENT_KEY = 'application/x-todotree-parent'

interface ActionButton {
  key: string
  icon: Component
  tooltip: string
  onClick: () => void
  active?: boolean
}

const settingsData = inject(settingsDataInjectionKey)!
const defaultMarkdownMode = computed(() => settingsData.value.defaultMarkdownMode)
const autoSubmitOnBlur = computed(() => settingsData.value.autoSubmitOnBlur)

const isLeaf = computed(() => ! props.todo.children.length)

const now = useNow()
const warningMs = computed(() => (settingsData.value.dueWarningDays) * ONE_DAY)

const dueTimerColor = useDueColor(
  toRef(() => props.todo.dueAt),
  toRef(() => props.todo.status),
  now,
  warningMs,
)

const dueTimerTitle = computed(() => {
  const ts = props.todo.dueAt
  if (! ts) return ''
  const d = new Date(ts)
  const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const diff = ts - now.value
  const abs = Math.abs(diff)
  let rel: string
  if (abs < 3_600_000) rel = `${Math.round(abs / 60_000)} 分钟`
  else if (abs < ONE_DAY) rel = `${Math.round(abs / 3_600_000)} 小时`
  else rel = `${Math.round(abs / ONE_DAY)} 天`
  return diff >= 0
    ? `截止 ${dateStr}（${rel}后）`
    : `截止 ${dateStr}（已过期 ${rel}前）`
})

const {
  isEditing,
  editMode,
  editContent,
  renderedContent,
  setEditInputRef,
  setMarkdownInputRef,
  startEdit,
  handleEditInput,
  saveAndExitEdit,
  discardEdit,
  handleEditorBlur,
  toggleEditMode
} = useTodoContentEditor({
  sourceContent: toRef(() => props.externalDraft ?? props.todo.content),
  defaultMarkdownMode,
  autoSubmitOnBlur,
  onSave: (content: string) => {
    emit('update', props.todo.id, { content })
  }
})

const startListEdit = async () => {
  await startEdit()
  emit('edit-start', props.todo.id, editContent.value, 'list')
}

const saveListEditAndExit = () => {
  saveAndExitEdit()
  emit('edit-end', props.todo.id, editContent.value, 'list', true)
}

const stopListEdit = (saved: boolean) => {
  emit('edit-end', props.todo.id, editContent.value, 'list', saved)
  discardEdit()
}

watch(editContent, content => {
  if (! isEditing.value) return
  emit('edit-change', props.todo.id, content, 'list')
})

watch(
  () => props.forceExit,
  forceExit => {
    if (! forceExit || ! isEditing.value) return
    stopListEdit(false)
  }
)

const setStatus = (status: TodoStatus) => {
  emit('update', props.todo.id, { status })
}

const handleSelect = () => {
  emit('select', props.todo.id)
}

const handleDiscardEdit = () => {
  if (props.todo.content === '') {
    emit('delete', props.todo.id)
    return
  }

  stopListEdit(false)
}

const addChild = () => {
  emit('add-child', props.todo.id)
}

const handleExpandClick = (event: MouseEvent) => {
  if (props.todo.hasCollapsedMatchedDescendant) {
    emit('expand-to-matched-descendants', props.todo.id)
    return
  }
  if (event.shiftKey) {
    emit('toggle-expand-subtree', props.todo.id)
    return
  }
  emit('toggle-expand', props.todo.id)
}

const remove = () => {
  showDeleteDialog.value = true
}

const handleDeleteConfirm = () => {
  emit('delete', props.todo.id)
}

const clearDragIndicator = () => {
  dragPosition.value = null
}

const clearOtherDragIndicators = () => {
  window.dispatchEvent(new CustomEvent(CLEAR_DRAG_INDICATORS_EVENT, {
    detail: { sourceId: props.todo.id }
  }))
}

const handleGlobalClearIndicators = (event: Event) => {
  const customEvent = event as CustomEvent<{ sourceId?: string }>
  if (customEvent.detail?.sourceId === props.todo.id) return
  clearDragIndicator()
}

const toParentKey = (parentId: string | null) => parentId ?? ROOT_PARENT_KEY

// 拖动处理
const handleDragStart = (e: DragEvent) => {
  if (! props.isDraggable) return
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', props.todo.id)
  e.dataTransfer!.setData(DRAG_PARENT_KEY, toParentKey(props.todo.parentId))
  const target = e.currentTarget as HTMLElement
  target.style.opacity = '0.5'
}

const handleDragEnd = (e: DragEvent) => {
  const target = e.currentTarget as HTMLElement
  target.style.opacity = '1'
  clearDragIndicator()
}

const handleDragOver = (e: DragEvent) => {
  if (! props.isDraggable) return
  const draggedParentKey = e.dataTransfer?.getData(DRAG_PARENT_KEY)
  const currentParentKey = toParentKey(props.todo.parentId)
  const isSameLevel = draggedParentKey === currentParentKey

  if (! isSameLevel) {
    e.dataTransfer!.dropEffect = 'none'
    clearDragIndicator()
    return
  }

  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'

  clearOtherDragIndicators()

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2

  dragPosition.value = e.clientY < midpoint ? 'before' : 'after'
}

const handleDragLeave = (e: DragEvent) => {
  // 只在真正离开元素时清除，避免子元素触发
  const target = e.currentTarget as HTMLElement
  const relatedTarget = e.relatedTarget as HTMLElement | null
  if (! relatedTarget || ! target.contains(relatedTarget)) {
    clearDragIndicator()
  }
}

const handleDrop = (e: DragEvent) => {
  if (! props.isDraggable) return
  e.preventDefault()

  const draggedParentKey = e.dataTransfer?.getData(DRAG_PARENT_KEY)
  const currentParentKey = toParentKey(props.todo.parentId)
  if (draggedParentKey !== currentParentKey) {
    clearDragIndicator()
    return
  }

  const draggedId = e.dataTransfer!.getData('text/plain')
  if (draggedId === props.todo.id) {
    clearDragIndicator()
    return
  }

  const insertBefore = dragPosition.value === 'before'
  emit('reorder', draggedId, props.todo.id, insertBefore)
  clearDragIndicator()
}

onMounted(() => {
  window.addEventListener('dragend', clearDragIndicator)
  window.addEventListener('drop', clearDragIndicator)
  window.addEventListener(CLEAR_DRAG_INDICATORS_EVENT, handleGlobalClearIndicators)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragend', clearDragIndicator)
  window.removeEventListener('drop', clearDragIndicator)
  window.removeEventListener(CLEAR_DRAG_INDICATORS_EVENT, handleGlobalClearIndicators)
})

const defaultActionButtons = computed<ActionButton[]>(() => [
  { key: 'edit', icon: Pencil, tooltip: '编辑', onClick: () => { void startListEdit() } },
  { key: 'add-child', icon: Plus, tooltip: '添加子项', onClick: addChild },
  { key: 'delete', icon: Trash2, tooltip: '删除', onClick: remove }
])

const editingActionButtons = computed<ActionButton[]>(() => [
  {
    key: 'toggle-edit-mode',
    icon: editMode.value === 'wysiwyg' ? FileCode2 : NotebookPen,
    tooltip: editMode.value === 'wysiwyg' ? '切换为 Markdown 源码模式' : '切换为所见即所得模式',
    onClick: () => { void toggleEditMode() },
  },
  { key: 'discard-edit', icon: X, tooltip: '丢弃编辑', onClick: handleDiscardEdit },
  { key: 'done-edit', icon: Check, tooltip: '完成编辑', onClick: saveListEditAndExit }
])

const currentActionButtons = computed(() => {
  return isEditing.value ? editingActionButtons.value : defaultActionButtons.value
})

watch(
  () => props.shouldAutoEdit,
  shouldAutoEdit => {
    if (shouldAutoEdit && ! isEditing.value) {
      void startListEdit()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.todo-item {
  position: relative;
  gap: 4px;
  margin: 4px 0;
  width: fit-content;
}

.todo-item[draggable="true"] {
  cursor: move;
}

.todo-item.drag-over-before::before,
.todo-item.drag-over-after::after {
  content: '';
  position: absolute;
  left: calc(var(--indent-offset) + 36px);
  right: 0;
  height: 2px;
  background: var(--color-primary);
  z-index: 10;
}

.todo-item.drag-over-before::before {
  top: -3px;
}

.todo-item.drag-over-after::after {
  bottom: -3px;
}

.todo-item-actions {
  position: absolute;
  right: 8px;
  top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.todo-item:hover .todo-item-actions {
  opacity: 1;
}

.todo-item-actions.is-visible {
  opacity: 1;
}

.todo-item-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: var(--indent-offset);
}

.todo-item-content {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  min-width: 300px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: var(--transition-fast);
}

.todo-item.filter-match .todo-item-content {
  border: 1px solid var(--color-success);
}

.todo-item-content:hover,
.todo-item-content:focus-within {
  border-color: var(--color-primary);
}

.todo-item-content.detail-active {
  border-color: var(--color-primary);
}

.expand-btn {
  flex-shrink: 0;
}

.expand-btn.expand-to-match {
  color: var(--color-success);
}

.expand-placeholder {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}


.markdown {
  flex: 1;
  min-height: 28px;
  line-height: 1.5;
}

.markdown :deep(*) {
  margin: 0;
}

.markdown :deep(code) {
  background: var(--color-bg-hover);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  font-size: 0.9em;
}

.markdown :deep(pre) {
  background: var(--color-bg-hover);
  padding: 8px;
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.edit-contenteditable {
  flex: 1;
  overflow-y: auto;
  resize: vertical;
  padding: 0;
  font-family: inherit;
  outline: none;
  white-space: pre-wrap;
}

.edit-contenteditable:focus {
  outline: none;
}

.edit-contenteditable:empty::before {
  content: '……';
  color: var(--color-text-secondary);
}

.edit-contenteditable :deep(p) {
  margin: 0;
}

.edit-contenteditable :deep(ul),
.edit-contenteditable :deep(ol) {
  margin: 0;
  padding-left: 20px;
}

.edit-markdown {
  flex: 1;
  resize: vertical;
  padding: 0;
  border: none;
  font-family: inherit;
  font-size: var(--text-base);
  line-height: 1.5;
  outline: none;
  background: transparent;
  color: var(--color-text-primary);
}

.action-btn {
  position: relative;
}

.action-btn:hover {
  background: var(--color-bg-hover);
}

.due-clock {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
  padding-right: 2px;
  transition: color 0.4s;
}
</style>
