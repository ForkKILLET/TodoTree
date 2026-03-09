import type { TodoStatus } from '../types/todo'

export const STATUS_COLORS: Record<TodoStatus, string> = {
  todo: '#808080',
  doing: '#3b82f6',
  done: '#22c55e',
  cancelled: '#ef4444'
}

export const COLORS = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryLight: '#eff6ff',
  primaryBorder: '#93c5fd',

  success: '#22c55e',
  danger: '#ef4444',
  warning: '#3b82f6',

  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#4b5563',

  bgPrimary: '#fff',
  bgSecondary: '#f9fafb',
  bgHover: '#f3f4f6',

  border: '#e5e7eb',
  borderLight: '#d1d5db',

  grayTodo: '#808080'
}
