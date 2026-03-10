<template>
  <div class="toolbar">
    <div class="toolbar-section toolbar-main-row">
      <TButtonGroup size="sm">
        <TButton
          v-for="{ value, label, icon } in viewModes"
          :active="viewMode === value"
          :icon="icon"
          :key="value"
          square
          @click="emit('update:viewMode', value)"
          :tooltip="label"
        >
        </TButton>
      </TButtonGroup>

      <TInput
        v-model="searchText"
        size="sm"
        type="text"
        class="search-input"
        placeholder="搜索..."
        @update:modelValue="updateSearch"
      />

      <div class="menu-anchor">
        <TButton
          size="sm"
          square
          :icon="Funnel"
          tooltip="筛选"
          @click="toggleMenuId('filter-main')"
        />
        <div v-if="openMenuId === 'filter-main'" class="menu-panel">
          <button
            type="button"
            class="menu-item"
            @click="openFilterStatusStep"
          >
            <CircleCheck :size="14" />
            <span>状态</span>
          </button>
        </div>
      </div>

      <div class="menu-anchor">
        <TButton
          size="sm"
          square
          :icon="ArrowUpDown"
          tooltip="排序"
          @click="toggleMenuId('sort-main')"
        />
        <div v-if="openMenuId === 'sort-main'" class="menu-panel">
          <button
            v-for="field in sortFieldsWithIcons"
            :key="field.value"
            type="button"
            class="menu-item"
            @click="addSortStep(field.value)"
          >
            <component :is="field.icon" :size="14" />
            <span>{{ field.label }}</span>
          </button>
        </div>
      </div>

      <TButton
        size="sm"
        theme="primary" 
        square
        :icon="Plus"
        tooltip="添加根项"
        @click="emit('add-root')"
      />

      <div class="toolbar-right-actions">
        <TButton
          size="sm"
          square
          :icon="Settings"
          tooltip="设置"
          @click="openSettings"
        />
        <TButton
          size="sm"
          square
          :icon="Github"
          tooltip="GitHub"
          @click="openGithub"
        >
        </TButton>
      </div>
    </div>

    <div v-if="hasFilterStep || sortSteps.length > 0" class="toolbar-section">
      <div v-if="hasFilterStep" class="menu-anchor">
        <button type="button" class="step-chip" @click="toggleMenuId('filter-step')">
          <Funnel :size="14" class="step-chip-icon" />
          <span>状态</span>
        </button>
        <div v-if="openMenuId === 'filter-step'" class="menu-panel">
          <button
            v-for="status in statuses"
            :key="`step-${status.value}`"
            type="button"
            :class="['menu-item', { active: selectedStatuses.includes(status.value) }]"
            @click="toggleStatus(status.value)"
          >
            <StatusDot :status="status.value" :size="14" />
            <span>{{ status.label }}</span>
          </button>
          <button type="button" class="menu-item danger" @click="removeFilterStep">
            <Trash2 :size="14" />
            删除筛选步骤
          </button>
        </div>
      </div>

      <div v-for="(step, index) in sortSteps" :key="index" class="menu-anchor">
        <button type="button" class="step-chip" @click="toggleMenuId(`sort-step-${index}`)">
          <component :is="step.direction === 'asc' ? SortAsc : SortDesc" :size="14" class="step-chip-icon" />
          <span>{{ getSortFieldLabel(step.field) }}</span>
        </button>
        <div v-if="openMenuId === `sort-step-${index}`" class="menu-panel">
          <button type="button" class="menu-item" @click="toggleSortDirection(index)">
            <ArrowUpDown :size="14" />
            切换为{{ step.direction === 'asc' ? '降序' : '升序' }}
          </button>
          <button type="button" class="menu-item danger" @click="removeSortStep(index)">
            <Trash2 :size="14" />
            删除排序步骤
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { TreePine, List, Plus, Funnel, ArrowUpDown, SortAsc, SortDesc, Trash2, CircleCheck, Clock, Settings, Github } from 'lucide-vue-next'
import StatusDot from './StatusDot.vue'
import TButton from './TButton.vue'
import TButtonGroup from './TButtonGroup.vue'
import TInput from './TInput.vue'
import type { TodoStatus, ViewMode, SortField, SortDirection, SortStep } from '../types/todo'

interface Props {
  viewMode: ViewMode
  filterStatuses: TodoStatus[]
  filterSearchText: string
  sortSteps: SortStep[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode]
  'update:filter': [statuses: TodoStatus[], searchText: string]
  'update:sort': [steps: SortStep[]]
  'add-root': []
  'settings-open': []
}>()

const searchText = ref(props.filterSearchText)
const selectedStatuses = ref<TodoStatus[]>([...props.filterStatuses])
const sortSteps = ref<SortStep[]>(JSON.parse(JSON.stringify(props.sortSteps)))
const hasFilterStep = ref(selectedStatuses.value.length > 0)
const openMenuId = ref<string | null>(null)

interface Definition<T> {
  label: string
  value: T
}

interface DefinitionWithIcon<T> extends Definition<T> {
  icon: Component
}

const viewModes: DefinitionWithIcon<ViewMode>[] = [
  { value: 'tree', label: '树形视图', icon: TreePine },
  { value: 'flat', label: '列表视图', icon: List }
]
const statuses: Definition<TodoStatus>[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' }
]
const sortFieldsWithIcons: DefinitionWithIcon<SortField>[] = [
  { value: 'createdAt', label: '创建时间', icon: Clock },
  { value: 'updatedAt', label: '更新时间', icon: Clock },
  { value: 'status', label: '状态', icon: CircleCheck }
]

const getSortFieldLabel = (field: SortField) => {
  return sortFieldsWithIcons.find(f => f.value === field)?.label || field
}

const toggleMenuId = (id: string) => {
  openMenuId.value = openMenuId.value === id ? null : id
}

const openFilterStatusStep = () => {
  hasFilterStep.value = true
  openMenuId.value = 'filter-step'
}

const toggleStatus = (status: TodoStatus) => {
  const index = selectedStatuses.value.indexOf(status)
  if (index > - 1) {
    selectedStatuses.value.splice(index, 1)
  }
  else {
    selectedStatuses.value.push(status)
  }
  hasFilterStep.value = selectedStatuses.value.length > 0
  updateFilter()
}

const updateSearch = () => {
  updateFilter()
}

const updateFilter = () => {
  emit('update:filter', selectedStatuses.value, searchText.value)
}

watch(
  () => props.filterSearchText,
  value => {
    if (value !== searchText.value) {
      searchText.value = value
    }
  }
)

const addSortStep = (field: SortField) => {
  const direction: SortDirection = 'asc'
  sortSteps.value.push({ field, direction })
  // 自动打开新增的排序步骤菜单
  const newStepId = `sort-step-${sortSteps.value.length - 1}`
  nextTick(() => {
    openMenuId.value = newStepId
  })
  updateSort()
}

const toggleSortDirection = (index: number) => {
  const step = sortSteps.value[index]
  if (! step) return
  step.direction = step.direction === 'asc' ? 'desc' : 'asc'
  openMenuId.value = null
  updateSort()
}

const removeSortStep = (index: number) => {
  sortSteps.value.splice(index, 1)
  openMenuId.value = null
  updateSort()
}

const removeFilterStep = () => {
  selectedStatuses.value = []
  hasFilterStep.value = false
  updateFilter()
  openMenuId.value = null
}

const updateSort = () => {
  emit('update:sort', sortSteps.value)
}

const openSettings = () => {
  emit('settings-open')
}

const openGithub = () => {
  window.open('https://github.com/ForkKILLET/TodoTree', '_blank')
}

const handleOutsideClick = (event: MouseEvent) => {
  if (! openMenuId.value) return
  const target = event.target as HTMLElement | null
  if (! target?.closest('.menu-anchor')) {
    openMenuId.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.toolbar {
  position: sticky;
  top: 0;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-main-row {
  width: 100%;
}

.toolbar-right-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  min-width: 200px;
}

.menu-anchor {
  position: relative;
}

.menu-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 140px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 50;
}

.menu-item {
  height: 30px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  cursor: pointer;
  font-size: var(--text-base);
}

.menu-item:disabled {
  cursor: not-allowed;
  color: var(--color-text-secondary);
}

.menu-item:hover {
  background: var(--color-bg-hover);
}

.menu-item:disabled:hover {
  background: transparent;
}

.menu-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.menu-item.danger {
  color: var(--color-danger);
}

.step-chip {
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-primary);
  border-radius: var(--radius-full);
  height: 28px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  gap: 6px;
}

.step-chip:hover {
  background: var(--color-bg-hover);
}

.step-chip-icon {
  color: var(--color-text-secondary);
}
</style>
