<template>
  <div class="toolbar">
    <div class="toolbar-section toolbar-main-row">
      <TButtonGroup size="sm">
        <TButton
          v-for="{ value, label, icon } in VIEW_MODES"
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
        placeholder="搜索…"
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
            v-for="step in FILTER_STEPS"
            :key="step.key"
            type="button"
            class="menu-item"
            @click="openFilterStep(step.key)"
          >
            <component :is="step.icon" :size="14" />
            <span>{{ step.label }}</span>
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
            v-for="field in SORT_FIELDS"
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
        <div class="menu-anchor">
          <TButton
            size="sm"
            square
            :icon="MoreHorizontal"
            tooltip="更多"
            @click="toggleMenuId('more')"
          />
          <div v-if="openMenuId === 'more'" class="menu-panel menu-panel-right">
            <button type="button" class="menu-item" @click="openHints">
              <Lightbulb :size="14" />
              <span>随机提示</span>
            </button>
            <div class="menu-divider" />
            <button type="button" class="menu-item" @click="handleExportClick">
              <Download :size="14" />
              <span>导出数据</span>
            </button>
            <button type="button" class="menu-item" @click="triggerImport">
              <Upload :size="14" />
              <span>导入数据</span>
            </button>
          </div>
        </div>
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
          :icon="GitHubIcon"
          tooltip="GitHub"
          @click="openGithub"
        >
        </TButton>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="hidden-file-input"
        @change="handleFileImport"
      />
    </div>

    <HintDialog v-model="showHintDialog" :hints="HINTS" />

    <div v-if="activeFilterSteps.length || sortSteps.length" class="toolbar-section">
      <button
        v-if="showViewAllStep"
        type="button"
        :class="['step-chip', { active: viewAllMode }]"
        @click="toggleViewAllMode"
      >
        <component :is="viewAllMode ? EyeOff : Eye" :size="14" class="step-chip-icon" />
        <span>查看全部</span>
      </button>

      <div v-for="step in activeFilterSteps" :key="step.key" class="menu-anchor">
        <button type="button" class="step-chip" @click="toggleMenuId(step.menuId)">
          <component :is="step.icon" :size="14" class="step-chip-icon" />
          <span>{{ step.label }}</span>
        </button>
        <div v-if="openMenuId === step.menuId" class="menu-panel">
          <template v-if="step.key === 'status'">
            <button
              v-for="status in STATUS_LIST"
              :key="`step-status-${status.value}`"
              type="button"
              :class="['menu-item', { active: selectedStatuses.includes(status.value) }]"
              @click="toggleStatus(status.value)"
            >
              <TodoStatusLabel :status="status.value" :dot-size="14" />
            </button>
          </template>

          <template v-else>
            <button
              type="button"
              :class="['menu-item', { active: dueDateMode === 'has' }]"
              @click="setDueDateMode('has')"
            >
              <CalendarCheck2 :size="14" />
              <span>有截止时间</span>
            </button>
            <button
              type="button"
              :class="['menu-item', { active: dueDateMode === 'none' }]"
              @click="setDueDateMode('none')"
            >
              <CalendarX2 :size="14" />
              <span>无截止时间</span>
            </button>
            <button
              type="button"
              :class="['menu-item', { active: dueDateMode === 'within' }]"
              @click="setDueDateMode('within')"
            >
              <CalendarClock :size="14" />
              <span>n 天内</span>
            </button>
            <div v-if="dueDateMode === 'within'" class="due-input-row">
              <TInput
                v-model="dueWithinDaysInput"
                size="sm"
                type="number"
                min="1"
                step="1"
                class="due-input"
                placeholder="天数"
                @update:modelValue="updateDueWithinDays"
              />
              <span class="due-input-suffix">天内</span>
            </div>
          </template>

          <button type="button" class="menu-item danger" @click="removeFilterStep(step.key)">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Plus, Funnel, ArrowUpDown, SortAsc, SortDesc, Trash2, Settings, CircleCheck, Lightbulb, MoreHorizontal, Download, Upload, Timer, CalendarCheck2, CalendarX2, CalendarClock, Eye, EyeOff } from 'lucide-vue-next'
import type { Component } from 'vue'
import { GitHubIcon } from 'vue3-simple-icons'
import TodoStatusLabel from '@/components/TodoStatusLabel.vue'
import TButton from '@/components/TButton.vue'
import TButtonGroup from '@/components/TButtonGroup.vue'
import TInput from '@/components/TInput.vue'
import type { TodoStatus, ViewMode, SortField, SortDirection, SortStep, FilterOptions, DueDateFilter } from '@/types/todo'
import { VIEW_MODES, SORT_FIELDS, STATUS_LIST } from '@/constants/definition'
import { HINTS } from '@/constants/hints'
import HintDialog from '@/components/HintDialog.vue'

type FilterStepKey = 'status' | 'dueDate'

interface FilterStepDefinition {
  key: FilterStepKey
  label: string
  icon: Component
  menuId: string
}

const FILTER_STEPS: FilterStepDefinition[] = [
  { key: 'status', label: '状态', icon: CircleCheck, menuId: 'filter-step-status' },
  { key: 'dueDate', label: '截止时间', icon: Timer, menuId: 'filter-step-due-date' }
]

interface Props {
  viewMode: ViewMode
  filterOptions: FilterOptions
  sortSteps: SortStep[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode]
  'update:filter': [options: FilterOptions]
  'update:sort': [steps: SortStep[]]
  'add-root': []
  'settings-open': []
  'export': []
  'import': [data: unknown]
}>()

const searchText = ref(props.filterOptions.searchText ?? '')
const hasStatusStep = ref(props.filterOptions.status !== undefined)
const selectedStatuses = ref<TodoStatus[]>([...(props.filterOptions.status ?? [])])
const hasDueDateStep = ref(props.filterOptions.dueDate !== undefined)
const dueDateMode = ref<DueDateFilter['mode']>(props.filterOptions.dueDate?.mode ?? 'has')
const dueWithinDaysInput = ref(String(props.filterOptions.dueDate?.days ?? 1))
const viewAllMode = ref(props.filterOptions.viewAll === true)
const sortSteps = ref<SortStep[]>(JSON.parse(JSON.stringify(props.sortSteps)))
const openMenuId = ref<string | null>(null)
const showHintDialog = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const activeFilterSteps = computed(() => {
  return FILTER_STEPS.filter(step => {
    if (step.key === 'status') return hasStatusStep.value
    return hasDueDateStep.value
  })
})

const showViewAllStep = computed(() => activeFilterSteps.value.length > 0)

const getSortFieldLabel = (field: SortField) => {
  return SORT_FIELDS.find(f => f.value === field)?.label || field
}

const toggleMenuId = (id: string) => {
  openMenuId.value = openMenuId.value === id ? null : id
}

const openFilterStep = (key: FilterStepKey) => {
  if (key === 'status') {
    hasStatusStep.value = true
    openMenuId.value = 'filter-step-status'
    updateFilter()
    return
  }

  hasDueDateStep.value = true
  if (! dueDateMode.value) {
    dueDateMode.value = 'has'
  }
  openMenuId.value = 'filter-step-due-date'
  updateFilter()
}

const toggleStatus = (status: TodoStatus) => {
  const index = selectedStatuses.value.indexOf(status)
  if (index > - 1) {
    selectedStatuses.value.splice(index, 1)
  }
  else {
    selectedStatuses.value.push(status)
  }
  updateFilter()
}

const normalizeDueDays = (input: string) => {
  const parsed = Number(input)
  if (! Number.isFinite(parsed)) return 1
  return Math.max(1, Math.floor(parsed))
}

const setDueDateMode = (mode: DueDateFilter['mode']) => {
  dueDateMode.value = mode
  if (mode === 'within') {
    const normalized = normalizeDueDays(dueWithinDaysInput.value)
    dueWithinDaysInput.value = String(normalized)
  }
  updateFilter()
}

const updateDueWithinDays = (value: string | undefined) => {
  dueWithinDaysInput.value = value ?? ''
  if (dueDateMode.value === 'within') {
    updateFilter()
  }
}

const updateSearch = () => {
  updateFilter()
}

const toggleViewAllMode = () => {
  viewAllMode.value = ! viewAllMode.value
  updateFilter()
}

const updateFilter = () => {
  const next: FilterOptions = {}

  if (hasStatusStep.value) {
    next.status = [...selectedStatuses.value]
  }

  if (searchText.value.trim()) {
    next.searchText = searchText.value
  }

  if (hasDueDateStep.value) {
    if (dueDateMode.value === 'within') {
      next.dueDate = {
        mode: 'within',
        days: normalizeDueDays(dueWithinDaysInput.value)
      }
    }
    else {
      next.dueDate = { mode: dueDateMode.value }
    }
  }

  if (viewAllMode.value && (hasStatusStep.value || hasDueDateStep.value)) {
    next.viewAll = true
  }

  emit('update:filter', next)
}

watch(
  () => props.filterOptions,
  value => {
    const nextSearch = value.searchText ?? ''
    if (nextSearch !== searchText.value) {
      searchText.value = nextSearch
    }

    hasStatusStep.value = value.status !== undefined
    selectedStatuses.value = [...(value.status ?? [])]

    hasDueDateStep.value = value.dueDate !== undefined
    dueDateMode.value = value.dueDate?.mode ?? 'has'
    dueWithinDaysInput.value = String(value.dueDate?.days ?? 1)
    viewAllMode.value = value.viewAll === true
  }
  ,
  { deep: true }
)

watch(
  () => props.sortSteps,
  value => {
    sortSteps.value = JSON.parse(JSON.stringify(value))
  },
  { deep: true }
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

const removeFilterStep = (key: FilterStepKey) => {
  if (key === 'status') {
    selectedStatuses.value = []
    hasStatusStep.value = false
  }
  else {
    hasDueDateStep.value = false
    dueDateMode.value = 'has'
    dueWithinDaysInput.value = '1'
  }

  if (! hasStatusStep.value && ! hasDueDateStep.value) {
    viewAllMode.value = false
  }

  updateFilter()
  openMenuId.value = null
}

const updateSort = () => {
  emit('update:sort', sortSteps.value)
}

const openSettings = () => {
  emit('settings-open')
}

const openHints = () => {
  showHintDialog.value = true
  openMenuId.value = null
}

const handleExportClick = () => {
  emit('export')
  openMenuId.value = null
}

const triggerImport = () => {
  fileInputRef.value?.click()
  openMenuId.value = null
}

const handleFileImport = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (! file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (! Array.isArray(data)) throw new Error('not an array')
    emit('import', data)
  }
  catch {
    alert('导入失败：文件格式无效')
  }
  finally {
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
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

.due-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
}

.due-input {
  width: 64px;
}

.due-input-suffix {
  color: var(--color-text-secondary);
  font-size: var(--text-base);
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

.step-chip.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.step-chip-icon {
  color: var(--color-text-secondary);
}

.menu-panel-right {
  left: auto;
  right: 0;
}

.menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 3px 4px;
}

.hidden-file-input {
  display: none;
}
</style>
