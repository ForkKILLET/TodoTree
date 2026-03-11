<template>
  <TSidePanel :is-open="isOpen && !! todo" title="Todo 详情" @close="handleCloseRequest">
    <div v-if="todo" class="detail-content" data-editor-root>
      <div class="detail-title-row">
        <div
          v-if="! isEditing"
          class="detail-title markdown"
          v-html="renderedContent || '（空内容）'"
          @dblclick="startDetailEdit"
        ></div>
        <template v-else>
          <div
            v-if="editMode === 'wysiwyg'"
            :ref="setEditInputRef"
            class="detail-title markdown edit-contenteditable"
            contenteditable="true"
            @input="handleEditInput"
            @blur="handleEditorBlur"
            @keydown.ctrl.enter.prevent="saveDetailEditAndExit"
          ></div>
          <textarea
            v-else
            :ref="setMarkdownInputRef"
            v-model="editContent"
            class="edit-markdown"
            @blur="handleEditorBlur"
            @keydown.ctrl.enter.prevent="saveDetailEditAndExit"
          />
        </template>

        <TButtonGroup size="sm" class="detail-title-actions" :class="{ 'is-visible': isEditing }">
          <TButton
            v-for="button in currentActionButtons"
            :key="button.key"
            square
            :icon="button.icon"
            :tooltip="button.tooltip"
            @click="button.onClick"
          />
        </TButtonGroup>
      </div>

      <div class="detail-attrs">
        <div class="detail-attr-row">
          <span class="attr-icon"><CircleCheck :size="16" /></span>
          <span class="attr-label">状态</span>
          <div class="attr-value">
            <TodoStatusSelector
              :status="todo.status"
              :show-label="true"
              :dot-size="18"
              :show-ring="! isLeaf"
              :distribution="todo.leafStatusDistribution"
              @change="handleStatusChange"
            />
          </div>
        </div>
        <div class="detail-attr-row">
          <span class="attr-icon"><CalendarPlus2 :size="16" /></span>
          <span class="attr-label">创建时间</span>
          <span class="attr-value">{{ createdAtLabel }}</span>
        </div>
        <div class="detail-attr-row">
          <span class="attr-icon"><CalendarClock :size="16" /></span>
          <span class="attr-label">修改时间</span>
          <span class="attr-value">{{ updatedAtLabel }}</span>
        </div>
        <div class="detail-attr-row">
          <span class="attr-icon"><Timer :size="16" /></span>
          <span class="attr-label">截止时间</span>
          <div class="attr-value due-date-value">
            <div v-if="isDueDateEditing" class="due-date-inputs">
              <input
                ref="dueDateInputEl"
                type="date"
                class="due-date-input"
                :value="dueDateDateValue"
                @change="handleDueDateDateChange"
                @keydown.esc="isDueDateEditing = false"
                @keydown.enter.prevent="isDueDateEditing = false"
              />
              <input
                ref="dueDateTimeInputEl"
                type="time"
                class="due-date-input due-date-time-input"
                :value="dueDateTimeValue"
                placeholder="23:59"
                @change="handleDueDateTimeChange"
                @blur="handleDueDateBlur"
                @keydown.esc="isDueDateEditing = false"
                @keydown.enter.prevent="isDueDateEditing = false"
              />
            </div>
            <template v-else>
              <span
                class="due-date-display"
                :class="{ 'is-empty': ! todo.dueAt }"
                :style="{ color: dueColor }"
                @click="startDueDateEdit"
              >{{ dueDateDisplay }}</span>
              <template v-if="!! dueDateRelative">
                <span class="due-date-bar">|</span>
                <span
                  class="due-date-relative"
                  :style="{ color: dueColor }"
                >{{ dueDateRelative }}</span>
              </template>
              <TButton
                v-if="!! todo.dueAt"
                size="xs"
                square
                theme="ghost"
                :icon="X"
                tooltip="清除截止时间"
                class="due-date-clear"
                @click.stop="handleDueDateClear"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </TSidePanel>

  <ConfirmDialog
    v-model="showExitConfirmDialog"
    title="保存确认"
    message="当前有未保存的编辑内容，是否在退出前保存？"
    confirm-text="保存并退出"
    cancel-text="不保存退出"
    @confirm="handleSaveAndClose"
    @cancel="handleDiscardAndClose"
  />
</template>

<script setup lang="ts">
import { computed, inject, toRef, ref, watch, nextTick, type Component } from 'vue'
import { CircleCheck, CalendarPlus2, CalendarClock, Pencil, FileCode2, NotebookPen, Check, X, Timer } from 'lucide-vue-next'
import TSidePanel from '@/components/TSidePanel.vue'
import TodoStatusSelector from '@/components/TodoStatusSelector.vue'
import TButton from '@/components/TButton.vue'
import TButtonGroup from '@/components/TButtonGroup.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useNow } from '@/composables/useNow'
import type { TodoTreeNode, TodoStatus } from '@/types/todo'
import { settingsDataInjectionKey } from '@/injectionKeys/settings'
import { useTodoContentEditor } from '@/composables/useTodoContentEditor'

interface Props {
  isOpen: boolean
  todo: TodoTreeNode | null
  autoSubmitOnBlur?: boolean
  externalDraft?: string | null
  forceExitKey?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoSubmitOnBlur: true,
  externalDraft: null,
  forceExitKey: 0
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', id: string, changes: Partial<TodoTreeNode>): void
  (e: 'edit-start', id: string, content: string, source: 'list' | 'detail'): void
  (e: 'edit-change', id: string, content: string, source: 'list' | 'detail'): void
  (e: 'edit-end', id: string, content: string, source: 'list' | 'detail', saved: boolean): void
}>()

interface ActionButton {
  key: string
  icon: Component
  tooltip: string
  onClick: () => void
}

const settingsData = inject(settingsDataInjectionKey, null)
const defaultMarkdownMode = computed(() => settingsData?.value.defaultMarkdownMode ?? false)

const handleStatusChange = (status: TodoStatus) => {
  if (! props.todo) return
  emit('update', props.todo.id, { status })
}

const isLeaf = computed(() => ! props.todo || props.todo.children.length === 0)

// 编辑缓存：存储未保存的编辑内容
const editContentCache = ref<Record<string, string>>({})
const detailEditingState = ref<Record<string, boolean>>({})
const showExitConfirmDialog = ref(false)

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
  sourceContent: toRef(() => {
    // 优先返回缓存内容，如果没有则返回源 todo 内容
    if (props.todo && props.externalDraft !== null) {
      return props.externalDraft
    }
    if (props.todo && editContentCache.value[props.todo.id]) {
      return editContentCache.value[props.todo.id]
    }
    return props.todo?.content ?? ''
  }),
  defaultMarkdownMode,
  autoSubmitOnBlur: ref(false),
  onSave: (content: string) => {
    if (! props.todo) return
    emit('update', props.todo.id, { content })
    // 保存成功后清除缓存
    delete editContentCache.value[props.todo.id]
  }
})

const startDetailEdit = async () => {
  await startEdit()
  if (! props.todo) return
  emit('edit-start', props.todo.id, editContent.value, 'detail')
}

const saveDetailEditAndExit = () => {
  if (! props.todo) return
  saveAndExitEdit()
  delete editContentCache.value[props.todo.id]
  detailEditingState.value[props.todo.id] = false
  emit('edit-end', props.todo.id, editContent.value, 'detail', true)
}

const stopDetailEdit = (saved: boolean) => {
  if (! props.todo) return
  detailEditingState.value[props.todo.id] = false
  emit('edit-end', props.todo.id, editContent.value, 'detail', saved)
  discardEdit()
}

const hasUnsavedEdit = computed(() => {
  if (! props.todo) return false
  if (! isEditing.value) return false
  return editContent.value !== props.todo.content
})

const closePanel = () => {
  emit('close')
}

const handleCloseRequest = () => {
  if (! hasUnsavedEdit.value) {
    closePanel()
    return
  }

  showExitConfirmDialog.value = true
}

const handleSaveAndClose = () => {
  if (props.todo && isEditing.value) {
    saveDetailEditAndExit()
  }
  closePanel()
}

const handleDiscardAndClose = () => {
  if (props.todo && isEditing.value) {
    delete editContentCache.value[props.todo.id]
    detailEditingState.value[props.todo.id] = false
    emit('edit-end', props.todo.id, props.todo.content, 'detail', true)
    discardEdit()
  }
  closePanel()
}

watch(editContent, content => {
  if (! isEditing.value || ! props.todo) return
  emit('edit-change', props.todo.id, content, 'detail')
})

watch(
  () => props.forceExitKey,
  () => {
    if (! isEditing.value) return
    stopDetailEdit(false)
  }
)

// 监听 todo 切换，处理自动保存或缓存
watch(
  () => props.todo?.id,
  async (newTodoId, oldTodoId) => {
    if (oldTodoId && oldTodoId !== newTodoId && isEditing.value) {
      editContentCache.value[oldTodoId] = editContent.value
      detailEditingState.value[oldTodoId] = true
      emit('edit-end', oldTodoId, editContent.value, 'detail', false)
      discardEdit()
    }

    if (newTodoId && detailEditingState.value[newTodoId]) {
      await nextTick()
      await startDetailEdit()
    }
  }
)

const defaultActionButtons = computed<ActionButton[]>(() => [
  { key: 'edit', icon: Pencil, tooltip: '编辑', onClick: () => { void startDetailEdit() } }
])

const editingActionButtons = computed<ActionButton[]>(() => [
  {
    key: 'toggle-edit-mode',
    icon: editMode.value === 'wysiwyg' ? FileCode2 : NotebookPen,
    tooltip: editMode.value === 'wysiwyg' ? '切换为 Markdown 源码模式' : '切换为所见即所得模式',
    onClick: () => { void toggleEditMode() },
  },
  { key: 'discard-edit', icon: X, tooltip: '丢弃编辑', onClick: () => {
    if (props.todo && isEditing.value && editContent.value !== props.todo.content) {
      if (props.autoSubmitOnBlur) {
        void emit('update', props.todo.id, { content: editContent.value })
      }
      else {
        editContentCache.value[props.todo.id] = editContent.value
      }
    }
    stopDetailEdit(false)
  }},
  { key: 'done-edit', icon: Check, tooltip: '完成编辑', onClick: saveDetailEditAndExit }
])

const currentActionButtons = computed(() => {
  return isEditing.value ? editingActionButtons.value : defaultActionButtons.value
})

const createdAtLabel = computed(() => {
  if (! props.todo) return ''
  return new Date(props.todo.createdAt).toLocaleString('zh-CN')
})

const updatedAtLabel = computed(() => {
  if (! props.todo) return ''
  return new Date(props.todo.updatedAt).toLocaleString('zh-CN')
})

// ── Due date ────────────────────────────────────────────────────────────────
const isDueDateEditing = ref(false)
const dueDateInputEl = ref<HTMLInputElement | null>(null)
const dueDateTimeInputEl = ref<HTMLInputElement | null>(null)
const now = useNow()

// helpers — produce YYYY-MM-DD and HH:mm strings from the current dueAt
const dueDateDateValue = computed(() => {
  const ts = props.todo?.dueAt
  if (! ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const dueDateTimeValue = computed(() => {
  const ts = props.todo?.dueAt
  if (! ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

const dueDateDisplay = computed(() => {
  const ts = props.todo?.dueAt
  if (! ts) return '无'
  const d = new Date(ts)
  const YYYY = d.getFullYear()
  const M = d.getMonth() + 1
  const D = d.getDate()
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${YYYY}/${M}/${D} ${HH}:${mm}`
})

const ONE_DAY = 86_400_000
const warningMs = computed(() => (settingsData?.value.dueWarningDays ?? 3) * ONE_DAY)

const dueColor = computed(() => {
  const ts = props.todo?.dueAt
  if (! ts) return undefined
  const remaining = ts - now.value
  if (remaining > warningMs.value) return 'var(--color-text-secondary)'
  const t = Math.max(0, Math.min(1, 1 - remaining / warningMs.value))
  const r = Math.round(128 + 111 * t)
  const g = Math.round(128 - 60 * t)
  const b = Math.round(128 - 60 * t)
  return `rgb(${r},${g},${b})`
})

const dueDateRelative = computed(() => {
  const ts = props.todo?.dueAt
  if (! ts) return null
  const diff = ts - now.value
  const abs = Math.abs(diff)
  let amount: string
  if (abs < 3_600_000) amount = `${Math.round(abs / 60_000)} 分钟`
  else if (abs < 172_800_000) amount = `${Math.round(abs / 3_600_000)} 小时`
  else amount = `${Math.round(abs / 86_400_000)} 天`
  return `${amount}${diff >= 0 ? '后' : '前'}`
})

// resolve current editing inputs → timestamp; time defaults to 23:59 if omitted
const resolveTimestamp = (): number | null => {
  const dateVal = dueDateInputEl.value?.value
  if (! dateVal) return null
  const timeVal = dueDateTimeInputEl.value?.value || '23:59'
  return new Date(`${dateVal}T${timeVal}`).getTime()
}

const startDueDateEdit = async () => {
  isDueDateEditing.value = true
  await nextTick()
  dueDateInputEl.value?.showPicker?.()
  dueDateInputEl.value?.focus()
}

const handleDueDateDateChange = () => {
  if (! props.todo) return
  const ts = resolveTimestamp()
  if (ts === null) return
  emit('update', props.todo.id, { dueAt: ts })
  // keep editor open so user can optionally adjust the time
}

const handleDueDateTimeChange = () => {
  if (! props.todo) return
  const ts = resolveTimestamp()
  if (ts === null) return
  emit('update', props.todo.id, { dueAt: ts })
}

const handleDueDateBlur = () => {
  // only close after both inputs have had a chance to receive events
  setTimeout(() => {
    const active = document.activeElement
    if (active !== dueDateInputEl.value && active !== dueDateTimeInputEl.value) {
      isDueDateEditing.value = false
    }
  }, 100)
}

const handleDueDateClear = () => {
  if (! props.todo) return
  emit('update', props.todo.id, { dueAt: null })
}
</script>

<style scoped>
.detail-content {
  padding: 0;
}

.detail-title-row {
  position: relative;
}

.detail-title {
  margin: 0 0 16px;
  padding-right: 120px;
  font-size: var(--text-lg);
  line-height: 1.5;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 28px;
}

.detail-title :deep(*) {
  margin: 0;
}

.detail-title :deep(code) {
  background: var(--color-bg-hover);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  font-size: 0.9em;
}

.detail-title :deep(pre) {
  background: var(--color-bg-hover);
  padding: 8px;
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.detail-title-actions {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.detail-title-row:hover .detail-title-actions {
  opacity: 1;
}

.detail-title-actions.is-visible {
  opacity: 1;
}

.edit-contenteditable {
  overflow-y: auto;
  white-space: pre-wrap;
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
  width: 100%;
  resize: vertical;
  margin: 0;
  padding: 0;
  border: none;
  font-family: inherit;
  font-size: var(--text-lg);
  line-height: 1.5;
  outline: none;
  background: transparent;
  color: var(--color-text-primary);
}

.detail-attrs {
  display: grid;
  grid-template-columns: 16px auto 1fr;
  grid-auto-rows: 32px;
  column-gap: 10px;
  row-gap: 4px;
  align-items: center;
}

.detail-attr-row {
  display: contents;
}

.attr-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: color 0.4s;
}

.attr-label {
  color: var(--color-text-secondary);
  font-size: var(--text-base);
  white-space: nowrap;
}

.attr-value {
  display: flex;
  align-items: center;
  padding-left: 6px;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

.due-date-value {
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 6px;
}

.due-date-display {
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 2px 6px;
  margin: 0 -6px;
  border-radius: var(--radius-sm);
  transition: background 0.15s, color 0.4s;
  white-space: nowrap;
}

.due-date-display:hover {
  background: var(--color-bg-hover);
}

.due-date-display.is-empty {
  opacity: 0.5;
}

.due-date-relative {
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: color 0.4s;
}

.due-date-clear {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.due-date-value:hover .due-date-clear {
  opacity: 1;
}

.due-date-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.due-date-input {
  font-size: var(--text-sm);
  font-family: inherit;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  color: var(--color-text-primary);
  outline: none;
  flex-shrink: 0;
}

.due-date-time-input {
  width: 90px;
}
</style>
