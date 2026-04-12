export type TodoStatus = 'todo' | 'doing' | 'done' | 'cancelled'

export type StatusDistribution = Record<TodoStatus, number>

export interface Todo {
  id: string
  content: string
  status: TodoStatus
  parentId: string | null
  children: string[]
  createdAt: number
  updatedAt: number
  order: number
  dueAt?: number | null
  progressTotal?: number | null
  progressDone?: number | null
  progressSegments?: TodoStatus[] | null
}

export interface TodoTreeNode extends Todo {
  childNodes?: TodoTreeNode[]
  level: number
  hasChildrenInSource?: boolean
  isExpanded?: boolean
  leafStatusDistribution?: StatusDistribution
  isFilterMatch?: boolean
  hasCollapsedMatchedDescendant?: boolean
  /** 子树中最早的截止时间（叶子节点等于自身 dueAt） */
  effectiveDueAt?: number
  computedProgressTotal?: number
  computedProgressDone?: number
  computedProgressSegments?: TodoStatus[]
}

export type ViewMode = 'tree' | 'flat'

export type SortField = 'createdAt' | 'updatedAt' | 'status' | 'dueAt'
export type SortDirection = 'asc' | 'desc'

export interface DueDateFilter {
  mode: 'has' | 'none' | 'within'
  days?: number
}

export interface FilterOptions {
  status?: TodoStatus[]
  searchText?: string
  dueDate?: DueDateFilter
}

export interface SortStep {
  field: SortField
  direction: SortDirection
}

export type SortOptions = SortStep[]
