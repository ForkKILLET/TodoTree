import { TreePine, List, CalendarPlus2, CalendarClock, CircleCheck } from 'lucide-vue-next'
import type { TodoStatus, ViewMode, SortField } from '../types/todo'
import type { Component } from 'vue'

export interface Definition<T extends string = string> {
  value: T
  label: string
}

export interface DefinitionWithIcon<T extends string = string> extends Definition<T> {
  icon: Component
}

export const STATUSES: Record<TodoStatus, { label: string, color: string }> = {
  todo:      { label: 'Todo',      color: '#808080' },
  doing:     { label: 'Doing',     color: '#3b82f6' },
  done:      { label: 'Done',      color: '#22c55e' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
}

/** Ordered list of all statuses as `{ value, label }` for use in loops */
export const STATUS_LIST: Definition<TodoStatus>[] = (Object.keys(STATUSES) as TodoStatus[])
  .map(value => ({ value, label: STATUSES[value].label }))

/** Statuses that cycle on click (excludes cancelled) */
export const STATUS_CYCLE: TodoStatus[] = ['todo', 'doing', 'done']

export const VIEW_MODES: DefinitionWithIcon<ViewMode>[] = [
  { value: 'tree', label: '树形视图', icon: TreePine },
  { value: 'flat', label: '列表视图', icon: List },
]

export const SORT_FIELDS: DefinitionWithIcon<SortField>[] = [
  { value: 'createdAt', label: '创建时间', icon: CalendarPlus2 },
  { value: 'updatedAt', label: '更新时间', icon: CalendarClock },
  { value: 'status',    label: '状态',    icon: CircleCheck },
]
