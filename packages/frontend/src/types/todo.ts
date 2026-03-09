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
}

export interface TodoTreeNode extends Todo {
  childNodes?: TodoTreeNode[]
  level: number
  isExpanded?: boolean
  computedStatus?: TodoStatus
  leafStatusDistribution?: StatusDistribution
}

export type ViewMode = 'tree' | 'flat'

export type SortField = 'createdAt' | 'updatedAt' | 'order' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface FilterOptions {
  status?: TodoStatus[]
  searchText?: string
}

export interface SortOptions {
  field: SortField
  direction: SortDirection
}
