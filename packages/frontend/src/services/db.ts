import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Todo } from '@/types/todo'

export class TodoDatabase extends Dexie {
  todos!: Table<Todo, string>

  constructor() {
    super('TodoTreeDB')

    this.version(1).stores({
      todos: 'id, parentId, status, createdAt, updatedAt, order'
    })

    this.version(2).stores({
      todos: 'id, parentId, status, createdAt, updatedAt, order, dueAt'
    })
  }

  async getAllTodos(): Promise<Todo[]> {
    return await this.todos.toArray()
  }

  async getTodoById(id: string): Promise<Todo | undefined> {
    return await this.todos.get(id)
  }

  async addTodo(todo: Todo): Promise<string> {
    return await this.todos.add(todo)
  }

  async updateTodo(id: string, changes: Partial<Todo>): Promise<number> {
    return await this.todos.update(id, { ...changes, updatedAt: Date.now() })
  }

  async deleteTodo(id: string): Promise<void> {
    // 先删除所有子节点
    const todo = await this.getTodoById(id)
    if (todo && todo.children.length) {
      for (const childId of todo.children) {
        await this.deleteTodo(childId)
      }
    }

    // 删除自己
    await this.todos.delete(id)

    // 从父节点的children中移除
    if (todo?.parentId) {
      const parent = await this.getTodoById(todo.parentId)
      if (parent) {
        const updatedChildren = parent.children.filter(cid => cid !== id)
        await this.updateTodo(parent.id, { children: updatedChildren })
      }
    }
  }

  async getTodosByParentId(parentId: string | null): Promise<Todo[]> {
    return await this.todos.filter(todo => todo.parentId === parentId).toArray()
  }

  async clearAllTodos(): Promise<void> {
    await this.todos.clear()
  }
}

export const db = new TodoDatabase()
