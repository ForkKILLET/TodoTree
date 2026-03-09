<template>
  <div class="todo-item" :style="{ '--indent-offset': `${level * 30}px` }">
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
        v-if="isTree && todo.children.length > 0"
        class="expand-btn"
        size="sm"
        theme="ghost"
        square
        :icon="todo.isExpanded ? ChevronDown : ChevronRight"
        @click="$emit('toggle-expand', todo.id)"
      />
      <div v-else-if="isTree" class="expand-placeholder"></div>

      <div class="todo-item-content">
        <div
          class="status-indicator"
          @mouseenter="showStatusMenu = true"
          @mouseleave="handleStatusLeave"
          @click="cycleStatus"
        >
          <StatusDot
            :status="currentStatus"
            :show-ring="!isLeaf"
            :distribution="todo.leafStatusDistribution"
            :size="24"
          />

          <div v-if="showStatusMenu && isLeaf" class="status-menu">
            <div
              class="status-menu-content"
              @mouseenter="cancelHideTimer"
              @mouseleave="handleStatusLeave"
            >
              <TButton
                v-for="status in statusOptions"
                :key="status"
                :class="['status-option', { active: props.todo.status === status }]"
                size="xs"
                theme="ghost"
                square
                :tooltip="status"
                @click.stop="setStatus(status)"
              >
                <StatusDot :status="status" :size="16" />
              </TButton>
            </div>
          </div>
        </div>

        <div
          v-if="! isEditing"
          class="markdown"
          v-html="renderedContent"
          @dblclick="startEdit"
        ></div>
        <template v-else>
          <div
            v-if="editMode === 'wysiwyg'"
            ref="editInput"
            class="markdown edit-contenteditable"
            contenteditable="true"
            @input="handleEditInput"
            @keydown.ctrl.enter.prevent="saveAndExitEdit"
          ></div>
          <textarea
            v-else
            ref="markdownInput"
            v-model="editContent"
            class="edit-markdown"
            rows="3"
            @keydown.ctrl.enter.prevent="saveAndExitEdit"
          />
        </template>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model="showDeleteDialog"
    title="删除确认"
    message="确定要删除这个 TODO 项吗？此操作将同时删除所有子项且无法撤销。"
    confirm-text="删除"
    cancel-text="取消"
    @confirm="handleDeleteConfirm"
  />
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch, useTemplateRef } from 'vue'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { ChevronRight, ChevronDown, Pencil, Plus, Trash2, FileCode2, NotebookPen, Check } from 'lucide-vue-next'
import type { Component } from 'vue'
import StatusDot from './StatusDot.vue'
import TButton from './TButton.vue'
import type { TodoTreeNode, TodoStatus } from '../types/todo'
import TButtonGroup from './TButtonGroup.vue'
import ConfirmDialog from './ConfirmDialog.vue'

interface Props {
  todo: TodoTreeNode
  isTree?: boolean
  level?: number
  shouldAutoEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isTree: true,
  level: 0,
  shouldAutoEdit: false
})

const emit = defineEmits<{
  (e: 'toggle-expand', id: string): void
  (e: 'update', id: string, changes: Partial<TodoTreeNode>): void
  (e: 'delete', id: string): void
  (e: 'add-child', parentId: string): void
}>()

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
})

const isEditing = ref(false)
const editMode = ref<'wysiwyg' | 'markdown'>('wysiwyg')
const editContent = ref('')
const editInput = useTemplateRef('editInput')
const markdownInput = useTemplateRef('markdownInput')
const showStatusMenu = ref(false)
const showDeleteDialog = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

interface ActionButton {
  key: string
  icon: Component
  tooltip: string
  onClick: () => void
  active?: boolean
}

const currentStatus = computed(() => props.todo.computedStatus || props.todo.status)
const isLeaf = computed(() => props.todo.children.length === 0)
const statusOptions: TodoStatus[] = ['todo', 'doing', 'done', 'cancelled']

const renderedContent = computed(() => {
  try {
    return marked.parse(props.todo.content, { async: false }) as string
  }
  catch {
    return props.todo.content
  }
})

const renderedEditContent = computed(() => {
  try {
    const content = marked.parse(editContent.value, { async: false })
    return content.replace(/\n/g, '')
  }
  catch {
    return editContent.value
  }
})

const handleStatusLeave = () => {
  if (! isLeaf.value) return
  hideTimer = setTimeout(() => {
    showStatusMenu.value = false
  }, 200)
}

const cancelHideTimer = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

const cycleStatus = () => {
  if (! isLeaf.value) return

  const statusCycle: TodoStatus[] = ['todo', 'doing', 'done']
  const currentIndex = statusCycle.indexOf(props.todo.status)
  const nextIndex = currentIndex === - 1 ? 0 : (currentIndex + 1) % statusCycle.length
  emit('update', props.todo.id, { status: statusCycle[nextIndex] })
}

const setStatus = (status: TodoStatus) => {
  emit('update', props.todo.id, { status })
  showStatusMenu.value = false
}

const startEdit = () => {
  isEditing.value = true
  editContent.value = props.todo.content
  editMode.value = 'wysiwyg'
  nextTick(() => {
    if (! editInput.value) return

    editInput.value.innerHTML = renderedEditContent.value
    
    editInput.value.focus()
  })
}

const handleEditInput = () => {
  if (! editInput.value) return
  editContent.value = turndownService.turndown(editInput.value.innerHTML)
}

const saveEdit = () => {
  if (editInput.value) {
    editContent.value = turndownService.turndown(editInput.value.innerHTML)
  }
  emit('update', props.todo.id, { content: editContent.value })
}

const saveAndExitEdit = () => {
  saveEdit()
  isEditing.value = false
}

const toggleEditMode = () => {
  if (editMode.value === 'wysiwyg') {
    handleEditInput()
    editMode.value = 'markdown'
    nextTick(() => {
      markdownInput.value?.focus()
      const len = markdownInput.value?.value.length ?? 0
      markdownInput.value?.setSelectionRange(len, len)
    })
    return
  }

  editMode.value = 'wysiwyg'
  nextTick(() => {
    if (! editInput.value) return
    editInput.value.innerHTML = renderedEditContent.value
    editInput.value.focus()
  })
}

const addChild = () => {
  emit('add-child', props.todo.id)
}

const remove = () => {
  showDeleteDialog.value = true
}

const handleDeleteConfirm = () => {
  emit('delete', props.todo.id)
}

const defaultActionButtons = computed<ActionButton[]>(() => [
  { key: 'edit', icon: Pencil, tooltip: '编辑', onClick: startEdit },
  { key: 'add-child', icon: Plus, tooltip: '添加子项', onClick: addChild },
  { key: 'delete', icon: Trash2, tooltip: '删除', onClick: remove }
])

const editingActionButtons = computed<ActionButton[]>(() => [
  {
    key: 'toggle-edit-mode',
    icon: editMode.value === 'wysiwyg' ? FileCode2 : NotebookPen,
    tooltip: editMode.value === 'wysiwyg' ? '切换为 Markdown 源码模式' : '切换为所见即所得模式',
    onClick: toggleEditMode,
    active: editMode.value === 'markdown'
  },
  { key: 'done-edit', icon: Check, tooltip: '完成编辑', onClick: saveAndExitEdit }
])

const currentActionButtons = computed(() => {
  return isEditing.value ? editingActionButtons.value : defaultActionButtons.value
})

watch(
  () => props.shouldAutoEdit,
  shouldAutoEdit => {
    if (shouldAutoEdit && ! isEditing.value) {
      startEdit()
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

.todo-item-content:hover,
.todo-item-content:focus-within {
  border-color: var(--color-primary);
}

.expand-btn {
  flex-shrink: 0;
}

.expand-placeholder {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.status-indicator {
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
}

.markdown {
  flex: 1;
  cursor: text;
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
  min-height: 72px;
  resize: vertical;
  padding: 0;
  border: none;
  font-family: inherit;
  font-size: var(--text-base);
  line-height: 1.5;
  outline: none;
  background: transparent;
}

.action-btn {
  position: relative;
}

.action-btn:hover {
  background: var(--color-bg-hover);
}

.status-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  pointer-events: none;
}

.status-menu-content {
  pointer-events: auto;
  display: flex;
  gap: 6px;
  align-items: center;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 6px;
}

.status-option {
  position: relative;
}
</style>
