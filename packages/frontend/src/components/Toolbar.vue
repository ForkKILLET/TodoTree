<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <!-- 视图模式切换 -->
      <TButtonGroup size="md">
        <TButton
          v-for="{ value, label, icon } in viewModes"
          :active="viewMode === value"
          :icon="icon"
          :key="value"
          square
          @click="$emit('update:viewMode', value)"
          :tooltip="label"
        >
        </TButton>
      </TButtonGroup>

      <!-- 搜索框 -->
      <TInput
        v-model="searchText"
        type="text"
        class="search-input"
        placeholder="搜索..."
        @update:modelValue="updateSearch"
      />

      <!-- 状态筛选 -->
      <div class="filter-group">
        <div class="status-filter-menu">
          <TButton
            v-for="status in statuses"
            :key="status.value"
            type="button"
            :class="['status-option', { active: selectedStatuses.includes(status.value) }]"
            size="xs"
            theme="ghost"
            square
            :tooltip="status.label"
            @click="toggleStatus(status.value)"
          >
            <StatusDot :status="status.value" :size="16" />
          </TButton>
        </div>
      </div>

      <!-- 排序 -->
      <TSelect v-model="sortField" class="sort-select" @update:modelValue="updateSort">
        <option value="order">顺序</option>
        <option value="createdAt">创建时间</option>
        <option value="updatedAt">更新时间</option>
        <option value="status">状态</option>
      </TSelect>

      <TButton
        size="md"
        square
        :icon="sortDirection === 'asc' ? SortAsc : SortDesc"
        @click="toggleDirection"
      />

      <!-- 添加按钮 -->
      <TButton
        size="md"
        theme="primary" 
        square
        :icon="Plus"
        @click="$emit('add-root')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue'
import { TreePine, List, Plus, SortAsc, SortDesc } from 'lucide-vue-next'
import StatusDot from './StatusDot.vue'
import TButton from './TButton.vue'
import TButtonGroup from './TButtonGroup.vue'
import TInput from './TInput.vue'
import TSelect from './TSelect.vue'
import type { TodoStatus, ViewMode, SortField, SortDirection } from '../types/todo'

interface Props {
  viewMode: ViewMode
  filterStatuses: TodoStatus[]
  sortField: SortField
  sortDirection: SortDirection
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode]
  'update:filter': [statuses: TodoStatus[], searchText: string]
  'update:sort': [field: SortField, direction: SortDirection]
  'add-root': []
}>()

const searchText = ref('')
const selectedStatuses = ref<TodoStatus[]>([...props.filterStatuses])
const sortField = ref<SortField>(props.sortField)
const sortDirection = ref<SortDirection>(props.sortDirection)

interface Definition<T> {
  label: string
  value: T
}

interface DefinitionWithIcon<T> extends Definition<T> {
  icon: Component
}

const viewModes: DefinitionWithIcon<ViewMode>[] = [
  { value: 'tree', label: '树形', icon: TreePine },
  { value: 'flat', label: '列表', icon: List }
]
const statuses: Definition<TodoStatus>[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' }
]

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

const updateSearch = () => {
  updateFilter()
}

const updateFilter = () => {
  emit('update:filter', selectedStatuses.value, searchText.value)
}

const updateSort = () => {
  emit('update:sort', sortField.value, sortDirection.value)
}

const toggleDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  updateSort()
}
</script>

<style scoped>
.toolbar {
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-filter-menu {
  display: flex;
  gap: 4px;
}

h1 {
  margin: 0;
  font-size: var(--text-xl);
  color: var(--color-text-primary);
}

.search-input {
  min-width: 200px;
}

.sort-select {
  min-width: 120px;
}
</style>
