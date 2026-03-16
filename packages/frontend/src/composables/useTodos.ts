import { ref, computed } from 'vue'
import { db } from '@/services/db'
import type {
  Todo,
  TodoTreeNode,
  TodoStatus,
  StatusDistribution,
  ViewMode,
  FilterOptions,
  SortOptions
} from '@/types/todo'

export function useTodos() {
  const STORAGE_KEYS = {
    expandedIds: 'todotree.expandedIds',
    viewMode: 'todotree.viewMode',
    filterOptions: 'todotree.filterOptions',
    sortOptions: 'todotree.sortOptions'
  } as const

  const readStorage = <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback

    try {
      const raw = window.localStorage.getItem(key)
      if (! raw) return fallback
      return JSON.parse(raw) as T
    }
    catch {
      return fallback
    }
  }

  const writeStorage = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
    catch {
      // ignore storage errors
    }
  }

  const initialExpandedIds = readStorage<string[]>(STORAGE_KEYS.expandedIds, [])
  const storedViewMode = readStorage<string>(STORAGE_KEYS.viewMode, 'tree')
  const initialViewMode: ViewMode = storedViewMode === 'flat' ? 'flat' : 'tree'
  const initialFilterOptions = readStorage<FilterOptions>(STORAGE_KEYS.filterOptions, {})
  const initialSortOptions = readStorage<SortOptions>(STORAGE_KEYS.sortOptions, [])

  const todos = ref<Todo[]>([])
  const viewMode = ref<ViewMode>(initialViewMode)
  const filterOptions = ref<FilterOptions>(initialFilterOptions)
  const sortOptions = ref<SortOptions>(initialSortOptions)
  const loading = ref(false)
  const expandedIds = ref<Set<string>>(new Set(initialExpandedIds))

  const loadTodos = async () => {
    loading.value = true
    try {
      todos.value = await db.getAllTodos()
    }
    catch (error) {
      console.error('Failed to load todos:', error)
    }
    finally {
      loading.value = false
    }
  }

  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const createTodo = async (content = '', parentId: string | null = null) => {
    const now = Date.now()

    if (parentId) {
      const parent = todos.value.find(todo => todo.id === parentId) ?? await db.getTodoById(parentId)
      if (parent && hasUserProgress(parent)) {
        throw new Error('Todos with progress cannot have children')
      }
    }

    const newTodo: Todo = {
      id: generateId(),
      content,
      status: 'todo',
      parentId,
      children: [],
      createdAt: now,
      updatedAt: now,
      order: now,
      dueAt: null,
      progressTotal: null,
      progressDone: null,
      progressSegments: null,
    }

    try {
      await db.addTodo(newTodo)

      if (parentId) {
        const parentIndex = todos.value.findIndex(todo => todo.id === parentId)

        if (parentIndex !== - 1) {
          const parent = todos.value[parentIndex]
          const updatedChildren = [...parent.children, newTodo.id]
          const updatedAt = Date.now()

          await db.updateTodo(parentId, { children: updatedChildren })
          todos.value[parentIndex] = {
            ...parent,
            children: updatedChildren,
            updatedAt
          }
        }
        else {
          const parent = await db.getTodoById(parentId)
          if (parent) {
            await db.updateTodo(parentId, {
              children: [...parent.children, newTodo.id]
            })
          }
        }
      }

      todos.value.push(newTodo)
      return newTodo.id
    }
    catch (error) {
      console.error('Failed to create todo:', error)
      await loadTodos()
      throw error
    }
  }

  const updateTodo = async (id: string, changes: Partial<Todo>) => {
    try {
      const index = todos.value.findIndex(todo => todo.id === id)
      if (index < 0) return

      const current = index !== - 1 ? todos.value[index] : null
      const hasProgressChange = 'progressTotal' in changes || 'progressDone' in changes || 'progressSegments' in changes

      const normalizedChanges: Partial<Todo> = { ...changes }

      if (current && hasProgressChange) {
        const nextProgressTotal = 'progressTotal' in normalizedChanges
          ? normalizedChanges.progressTotal ?? null
          : current.progressTotal ?? null
        const nextProgressDone = 'progressDone' in normalizedChanges
          ? normalizedChanges.progressDone ?? null
          : current.progressDone ?? null
        const nextProgressSegments = 'progressSegments' in normalizedChanges
          ? normalizedChanges.progressSegments ?? null
          : current.progressSegments ?? null
        const normalizedProgress = normalizeProgress(nextProgressTotal, nextProgressDone, nextProgressSegments)

        if (current.children.length > 0 && normalizedProgress) {
          throw new Error('Only leaf todos can have progress')
        }

        normalizedChanges.progressTotal = normalizedProgress?.total ?? null
        normalizedChanges.progressDone = normalizedProgress?.done ?? null
        normalizedChanges.progressSegments = normalizedProgress?.segments ?? null
      }

      await db.updateTodo(id, normalizedChanges)

      if (current) {
        todos.value[index] = {
          ...current,
          ...normalizedChanges,
          updatedAt: Date.now()
        }
      }

      if (changes.status !== undefined || hasProgressChange) {
        await updateParentStatuses(id)
      }
    }
    catch (error) {
      console.error('Failed to update todo:', error)
      await loadTodos()
      throw error
    }
  }

  const reorderTodos = async (draggedId: string, targetId: string, insertBefore: boolean) => {
    const draggedIndex = todos.value.findIndex(t => t.id === draggedId)
    const targetIndex = todos.value.findIndex(t => t.id === targetId)

    if (draggedIndex < 0 || targetIndex < 0) return

    const dragged = todos.value[draggedIndex]
    const target = todos.value[targetIndex]

    // 确保是同级元素
    if (dragged.parentId !== target.parentId) return

    // 获取同级所有元素
    const siblings = todos.value.filter(t => t.parentId === dragged.parentId)
    siblings.sort((a, b) => a.order - b.order)

    // 找到拖动元素在同级中的位置
    const draggedSiblingIndex = siblings.findIndex(t => t.id === draggedId)
    if (draggedSiblingIndex < 0) return

    // 移除拖动的元素
    siblings.splice(draggedSiblingIndex, 1)

    // 找到目标元素在移除后的数组中的新索引
    const targetNewIndex = siblings.findIndex(t => t.id === targetId)
    if (targetNewIndex < 0) return

    // 根据 insertBefore 决定插入位置
    const insertIndex = insertBefore ? targetNewIndex : targetNewIndex + 1
    siblings.splice(insertIndex, 0, dragged)

    // 更新所有同级元素的order
    const updates: Array<{ id: string, order: number }> = []
    siblings.forEach((todo, index) => {
      const newOrder = index * 1000 // 使用1000的间隔以便后续插入
      if (todo.order !== newOrder) {
        updates.push({ id: todo.id, order: newOrder })
      }
    })

    // 批量更新数据库和内存
    try {
      const now = Date.now()
      for (const { id, order } of updates) {
        await db.updateTodo(id, { order, updatedAt: now })
        // 同步更新内存中的数据
        const index = todos.value.findIndex(t => t.id === id)
        if (index !== - 1) {
          todos.value[index] = {
            ...todos.value[index],
            order,
            updatedAt: now
          }
        }
      }
      // 触发响应式更新
      todos.value = [...todos.value]
    }
    catch (error) {
      console.error('Failed to reorder todos:', error)
      await loadTodos()
      throw error
    }
  }

  const deleteTodo = async (id: string) => {
    const todoMap = new Map<string, Todo>()
    todos.value.forEach(todo => todoMap.set(todo.id, todo))

    const collectDescendantIds = (todoId: string): string[] => {
      const todo = todoMap.get(todoId)
      if (! todo) return [todoId]

      const ids = [todoId]
      for (const childId of todo.children) {
        ids.push(...collectDescendantIds(childId))
      }
      return ids
    }

    try {
      await db.deleteTodo(id)

      const deletedIds = new Set(collectDescendantIds(id))
      const updatedAt = Date.now()

      todos.value = todos.value
        .filter(todo => ! deletedIds.has(todo.id))
        .map(todo => {
          const hasDeletedChild = todo.children.some(childId => deletedIds.has(childId))
          if (! hasDeletedChild) {
            return todo
          }

          return {
            ...todo,
            children: todo.children.filter(childId => ! deletedIds.has(childId)),
            updatedAt
          }
        })
    }
    catch (error) {
      console.error('Failed to delete todo:', error)
      await loadTodos()
      throw error
    }
  }

  const createEmptyDistribution = (): StatusDistribution => ({
    todo: 0,
    doing: 0,
    done: 0,
    cancelled: 0
  })

  const PROGRESS_COMPLETED_STATUSES: TodoStatus[] = ['done', 'cancelled']

  const isTodoStatus = (value: unknown): value is TodoStatus => {
    return value === 'todo' || value === 'doing' || value === 'done' || value === 'cancelled'
  }

  const normalizeProgress = (
    progressTotal: number | null | undefined,
    progressDone: number | null | undefined,
    progressSegments?: Array<TodoStatus | boolean> | null,
  ) => {
    if (progressTotal == null && progressSegments == null) return null

    const normalizedSegmentsSource = Array.isArray(progressSegments)
      ? progressSegments.map(segment => {
        if (isTodoStatus(segment)) return segment
        return segment ? 'done' : 'todo'
      })
      : null

    const total = progressTotal == null
      ? normalizedSegmentsSource?.length ?? null
      : Math.max(1, Math.round(progressTotal))

    if (total == null) {
      return null
    }

    let segments = normalizedSegmentsSource
      ? [...normalizedSegmentsSource]
      : Array.from(
        { length: total },
        (_, index) => index < Math.min(total, Math.max(0, Math.round(progressDone ?? 0))) ? 'done' : 'todo'
      )

    if (segments.length < total) {
      segments = [...segments, ...Array.from({ length: total - segments.length }, () => 'todo' as const)]
    }
    else if (segments.length > total) {
      segments = segments.slice(0, total)
    }

    const done = segments.filter(status => PROGRESS_COMPLETED_STATUSES.includes(status)).length
    return { total, done, segments }
  }

  const hasUserProgress = (todo: Pick<Todo, 'children' | 'progressTotal' | 'progressDone' | 'progressSegments'>) => {
    return todo.children.length === 0 && normalizeProgress(todo.progressTotal, todo.progressDone, todo.progressSegments) !== null
  }

  const computeLeafStatus = (todo: Todo): TodoStatus => {
    const progress = todo.children.length === 0
      ? normalizeProgress(todo.progressTotal, todo.progressDone, todo.progressSegments)
      : null

    if (! progress) {
      return todo.status
    }

    return computeStatusByChildren(progress.segments)
  }

  const getLeafProgressStatuses = (todo: Todo, todoMap: Map<string, Todo>): TodoStatus[] => {
    if (todo.children.length === 0) {
      return [computeLeafStatus(todo)]
    }

    return todo.children
      .map(childId => todoMap.get(childId))
      .filter((child): child is Todo => !! child)
      .flatMap(child => getLeafProgressStatuses(child, todoMap))
  }

  const computeProgressSummary = (todo: Todo, todoMap: Map<string, Todo>): { total: number, done: number, segments: TodoStatus[] } | null => {
    if (todo.children.length === 0) {
      const progress = normalizeProgress(todo.progressTotal, todo.progressDone, todo.progressSegments)
      return progress
        ? { total: progress.total, done: progress.done, segments: progress.segments }
        : null
    }

    const segments = getLeafProgressStatuses(todo, todoMap)
    if (segments.length === 0) {
      return null
    }

    return {
      total: segments.length,
      done: segments.filter(status => PROGRESS_COMPLETED_STATUSES.includes(status)).length,
      segments
    }
  }

  const computeStatusByChildren = (childStatuses: TodoStatus[]): TodoStatus => {
    if (childStatuses.every(s => s === 'cancelled')) return 'cancelled'
    if (childStatuses.every(s => s === 'done')) return 'done'
    if (childStatuses.every(s => s === 'todo')) return 'todo'
    return 'doing'
  }

  const computeStatus = (todo: Todo, todoMap: Map<string, Todo>): { status: TodoStatus, leafStatusDistribution: StatusDistribution } => {
    if (todo.children.length === 0) {
      const distribution = createEmptyDistribution()
      const progress = normalizeProgress(todo.progressTotal, todo.progressDone, todo.progressSegments)
      const status = computeLeafStatus(todo)

      if (progress) {
        progress.segments.forEach(segmentStatus => {
          distribution[segmentStatus] += 1
        })
      }
      else {
        distribution[status] = 1
      }

      return { status, leafStatusDistribution: distribution }
    }
    const leafStatusDistribution = createEmptyDistribution()
    const childStatuses: TodoStatus[] = []

    for (const childId of todo.children) {
      const child = todoMap.get(childId)
      if (! child) continue

      const childResult = computeStatus(child, todoMap)
      childStatuses.push(childResult.status)

      if (child.children.length === 0) {
        // 叶子节点（即便有进度虚拟子 todo）对父级只贡献一个状态单位，避免越级展开
        leafStatusDistribution[childResult.status] += 1
      }
      else {
        for (const status of Object.keys(leafStatusDistribution) as TodoStatus[]) {
          leafStatusDistribution[status] += childResult.leafStatusDistribution[status]
        }
      }
    }

    if (childStatuses.length === 0) {
      return { status: todo.status, leafStatusDistribution }
    }

    const status = computeStatusByChildren(childStatuses)

    return { status, leafStatusDistribution }
  }

  const updateParentStatuses = async (changedId: string) => {
    const todoMap = new Map<string, Todo>()
    todos.value.forEach(todo => todoMap.set(todo.id, todo))

    let current = todoMap.get(changedId)
    while (current) {
      const { status: newStatus } = computeStatus(current, todoMap)

      if (newStatus !== current.status) {
        const updatedAt = Date.now()
        await db.updateTodo(current.id, { status: newStatus })

        const currentIndex = todos.value.findIndex(t => t.id === current!.id)
        if (currentIndex !== - 1) {
          todos.value[currentIndex] = { ...todos.value[currentIndex], status: newStatus, updatedAt }
        }

        todoMap.set(current.id, { ...current, status: newStatus, updatedAt })
      }

      current = current.parentId ? todoMap.get(current.parentId) : undefined
    }
  }

  // 计算节点子树内最早的截止时间

  const EFFECTIVE_DUE_AT_STATUS: TodoStatus[] = ['todo', 'doing']

  const computeEffectiveDueAt = (todo: Todo, todoMap: Map<string, Todo>): number => {
    const status = computeStatus(todo, todoMap).status

    return Math.min(
      (EFFECTIVE_DUE_AT_STATUS.includes(status) ? todo.dueAt : null) ?? Infinity,
      ...todo.children
        .map((childId) => todoMap.get(childId))
        .filter((child): child is Todo => !! child)
        .map(child => computeEffectiveDueAt(child, todoMap))
    )
  }

  // 构建树形结构
  const buildTree = (items: Todo[]): TodoTreeNode[] => {
    const todoMap = new Map<string, Todo>()
    items.forEach(todo => todoMap.set(todo.id, todo))

    const rootNodes: TodoTreeNode[] = []

    items.forEach(todo => {
      if (todo.parentId === null) {
        const { status, leafStatusDistribution } = computeStatus(todo, todoMap)
        const progress = computeProgressSummary(todo, todoMap)
        const node: TodoTreeNode = {
          ...todo,
          level: 0,
          hasChildrenInSource: todo.children.length > 0,
          isExpanded: expandedIds.value.has(todo.id),
          status,
          leafStatusDistribution,
          effectiveDueAt: computeEffectiveDueAt(todo, todoMap),
          computedProgressTotal: progress?.total,
          computedProgressDone: progress?.done,
          computedProgressSegments: progress?.segments
        }
        rootNodes.push(node)
      }
    })

    // 递归构建子节点
    const buildChildren = (node: TodoTreeNode): TodoTreeNode => {
      if (node.children.length === 0) {
        return node
      }

      node.childNodes = node.children
        .map(childId => {
          const child = todoMap.get(childId)
          if (! child) return null

          const { status, leafStatusDistribution } = computeStatus(child, todoMap)
          const progress = computeProgressSummary(child, todoMap)
          const childNode: TodoTreeNode = {
            ...child,
            level: node.level + 1,
            hasChildrenInSource: child.children.length > 0,
            isExpanded: expandedIds.value.has(child.id),
            status,
            leafStatusDistribution,
            effectiveDueAt: computeEffectiveDueAt(child, todoMap),
            computedProgressTotal: progress?.total,
            computedProgressDone: progress?.done,
            computedProgressSegments: progress?.segments
          }
          return buildChildren(childNode)
        })
        .filter((n): n is TodoTreeNode => n !== null)

      return node
    }

    return rootNodes.map(buildChildren)
  }

  // 扁平化树
  const flattenTree = (nodes: TodoTreeNode[]): TodoTreeNode[] => {
    const result: TodoTreeNode[] = []

    const flatten = (node: TodoTreeNode) => {
      result.push(node)
      if (node.isExpanded && node.childNodes) {
        node.childNodes.forEach(flatten)
      }
    }

    nodes.forEach(flatten)
    return result
  }

  // 获取所有节点（扁平视图用）
  const getAllNodes = (items: Todo[]): TodoTreeNode[] => {
    const todoMap = new Map<string, Todo>()
    items.forEach(todo => todoMap.set(todo.id, todo))

    return items.map(todo => {
      const { status, leafStatusDistribution } = computeStatus(todo, todoMap)
      const progress = computeProgressSummary(todo, todoMap)
      return {
        ...todo,
        level: 0,
        hasChildrenInSource: todo.children.length > 0,
        status,
        leafStatusDistribution,
        effectiveDueAt: computeEffectiveDueAt(todo, todoMap),
        computedProgressTotal: progress?.total,
        computedProgressDone: progress?.done,
        computedProgressSegments: progress?.segments
      }
    })
  }

  // 检查节点是否匹配筛选条件
  const nodeMatchesFilter = (node: TodoTreeNode): boolean => {
    if (filterOptions.value.status && filterOptions.value.status.length) {
      if (! filterOptions.value.status.includes(node.status)) {
        return false
      }
    }

    if (filterOptions.value.searchText) {
      const searchLower = filterOptions.value.searchText.toLowerCase()
      if (! node.content.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    return true
  }

  // 树形筛选：保留匹配节点及其所有祖先，并标记匹配节点/未展开命中后代
  const filterTreeNodes = (nodes: TodoTreeNode[], matchedIds: Set<string>): TodoTreeNode[] => {
    const hasSearchText = Boolean(filterOptions.value.searchText?.trim())

    const walk = (node: TodoTreeNode): { kept: TodoTreeNode | null, hasMatchInSubtree: boolean, hasCollapsedMatchInSubtree: boolean } => {
      const childResults = (node.childNodes || []).map(walk)
      const keptChildren = childResults
        .map(result => result.kept)
        .filter((child): child is TodoTreeNode => child !== null)

      const isMatch = nodeMatchesFilter(node)
      if (isMatch) {
        matchedIds.add(node.id)
      }

      const hasMatchInSubtree = isMatch || childResults.some(result => result.hasMatchInSubtree)
      if (! hasMatchInSubtree) {
        return { kept: null, hasMatchInSubtree: false, hasCollapsedMatchInSubtree: false }
      }

      const hasCollapsedBySelf = hasSearchText && ! node.isExpanded && keptChildren.length > 0
      const hasCollapsedByDescendant = hasSearchText && childResults.some(result => result.hasCollapsedMatchInSubtree)
      const hasCollapsedMatchInSubtree = hasCollapsedBySelf || hasCollapsedByDescendant

      return {
        kept: {
          ...node,
          children: keptChildren.map(c => c.id),
          childNodes: keptChildren,
          isFilterMatch: hasSearchText && isMatch,
          hasCollapsedMatchedDescendant: hasCollapsedMatchInSubtree
        },
        hasMatchInSubtree,
        hasCollapsedMatchInSubtree
      }
    }

    return nodes
      .map(walk)
      .map(result => result.kept)
      .filter((node): node is TodoTreeNode => node !== null)
  }

  const findNodeInTree = (nodes: TodoTreeNode[], id: string): TodoTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (! node.childNodes?.length) continue
      const found = findNodeInTree(node.childNodes, id)
      if (found) return found
    }
    return null
  }

  const collectExpandableIds = (node: TodoTreeNode, ids: Set<string>) => {
    if (! node.childNodes?.length) {
      return
    }
    ids.add(node.id)
    node.childNodes.forEach(child => collectExpandableIds(child, ids))
  }

  // 扁平列表过滤（仅用于扁平视图）
  const applyFilter = (items: TodoTreeNode[]): TodoTreeNode[] => {
    let filtered = items

    if (filterOptions.value.status && filterOptions.value.status.length) {
      filtered = filtered.filter(item =>
        filterOptions.value.status!.includes(item.status)
      )
    }

    if (filterOptions.value.searchText) {
      const searchLower = filterOptions.value.searchText.toLowerCase()
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }

  // 排序比较器（级联多步骤排序）
  const compareBySortOptions = (a: TodoTreeNode, b: TodoTreeNode) => {
    const steps = sortOptions.value

    // 如果没有排序步骤，默认按 order 排序
    if (steps.length === 0) {
      return a.order - b.order
    }

    for (const { field, direction } of steps) {
      let aVal, bVal: string | number

      if (field === 'status') {
        aVal = a.status
        bVal = b.status
      }
      else if (field === 'dueAt') {
        aVal = a.effectiveDueAt ?? Infinity
        bVal = b.effectiveDueAt ?? Infinity
      }
      else {
        aVal = a[field]
        bVal = b[field]
      }

      return (aVal < bVal) === (direction === 'asc') ? - 1 : 1
    }
    return 0
  }

  // 平铺列表排序（仅用于平铺视图）
  const applySort = (items: TodoTreeNode[]): TodoTreeNode[] => {
    const sorted = [...items]
    sorted.sort(compareBySortOptions)
    return sorted
  }

  // 树内同级排序（父子层级不打散）
  const sortTreeNodes = (nodes: TodoTreeNode[]): TodoTreeNode[] => {
    const sorted = [...nodes].sort(compareBySortOptions)

    return sorted.map(node => {
      if (! node.childNodes || node.childNodes.length === 0) {
        return node
      }

      return {
        ...node,
        childNodes: sortTreeNodes(node.childNodes)
      }
    })
  }

  const buildFilteredMap = (nodes: TodoTreeNode[]): Map<string, Todo> => {
    const map = new Map<string, Todo>()
    const collect = (node: TodoTreeNode) => {
      map.set(node.id, node)
      node.childNodes?.forEach(collect)
    }
    nodes.forEach(collect)
    return map
  }

  // 计算显示的todos
  const displayTodos = computed(() => {
    if (! todos.value.length) return []

    let nodes: TodoTreeNode[]

    if (viewMode.value === 'tree') {
      const tree = buildTree(todos.value)

      // 先筛选，再基于筛选结果重算 effectiveDueAt，最后排序
      const matchedIds = new Set<string>()
      const filteredTree = filterTreeNodes(tree, matchedIds)
      const filteredMap = buildFilteredMap(filteredTree)
      const assignEffectiveDueAt = (node: TodoTreeNode) => {
        node.childNodes?.forEach(assignEffectiveDueAt)
        node.effectiveDueAt = computeEffectiveDueAt(node, filteredMap)
      }
      filteredTree.forEach(assignEffectiveDueAt)
      const sortedTree = sortTreeNodes(filteredTree)

      // 最后扁平化展示
      nodes = flattenTree(sortedTree)
      return nodes
    }

    nodes = getAllNodes(todos.value)
    nodes = applyFilter(nodes)
    nodes = applySort(nodes)

    return nodes
  })

  // 切换展开状态
  const toggleExpand = (id: string) => {
    if (expandedIds.value.has(id)) {
      expandedIds.value.delete(id)
    }
    else {
      expandedIds.value.add(id)
    }
    expandedIds.value = new Set(expandedIds.value)
    writeStorage(STORAGE_KEYS.expandedIds, [...expandedIds.value])
  }

  // 展开/折叠整个子树
  const toggleExpandSubtree = (id: string) => {
    const todoMap = new Map<string, Todo>()
    todos.value.forEach(t => todoMap.set(t.id, t))

    const root = todoMap.get(id)
    if (! root || root.children.length === 0) return

    const shouldExpand = ! expandedIds.value.has(id)

    const ids = new Set<string>()
    const collectSubtreeParentIds = (nodeId: string): void => {
      const node = todoMap.get(nodeId)
      if (! node || node.children.length === 0) return
      ids.add(nodeId)
      node.children.forEach(childId => collectSubtreeParentIds(childId))
    }
    collectSubtreeParentIds(id)

    const newExpanded = new Set(expandedIds.value)
    if (shouldExpand) {
      ids.forEach(nodeId => newExpanded.add(nodeId))
    }
    else {
      ids.forEach(nodeId => newExpanded.delete(nodeId))
    }
    expandedIds.value = newExpanded
    writeStorage(STORAGE_KEYS.expandedIds, [...expandedIds.value])
  }

  const expandToMatchedDescendants = (id: string) => {
    if (viewMode.value !== 'tree') return
    if (! filterOptions.value.searchText?.trim()) return

    const tree = buildTree(todos.value)
    const sortedTree = sortTreeNodes(tree)
    const matchedIds = new Set<string>()
    const filteredTree = filterTreeNodes(sortedTree, matchedIds)
    const targetNode = findNodeInTree(filteredTree, id)
    if (! targetNode) return

    const idsToExpand = new Set<string>()
    collectExpandableIds(targetNode, idsToExpand)
    idsToExpand.forEach(nodeId => expandedIds.value.add(nodeId))

    expandedIds.value = new Set(expandedIds.value)
    writeStorage(STORAGE_KEYS.expandedIds, [...expandedIds.value])
  }

  const exportTodos = (): Todo[] => [...todos.value]

  const importTodos = async (data: Todo[]): Promise<void> => {
    await db.importAllTodos(data)
    await loadTodos()
  }

  // 切换视图模式
  const setViewMode = (mode: ViewMode) => {
    viewMode.value = mode
    writeStorage(STORAGE_KEYS.viewMode, mode)
  }

  // 设置过滤选项
  const setFilterOptions = (options: FilterOptions) => {
    filterOptions.value = options
    writeStorage(STORAGE_KEYS.filterOptions, options)
  }

  // 设置排序选项
  const setSortOptions = (options: SortOptions) => {
    sortOptions.value = options
    writeStorage(STORAGE_KEYS.sortOptions, sortOptions.value)
  }

  return {
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
    setSortOptions
  }
}
