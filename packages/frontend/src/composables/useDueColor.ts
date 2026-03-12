import { computed, type Ref } from 'vue'
import type { TodoStatus } from '@/types/todo'

const ONE_DAY = 86_400_000

/**
 * Computes the color for a due-date indicator based on the todo's status,
 * remaining time, and the configured warning threshold.
 *
 * @param dueAt    - reactive timestamp (ms) or null/undefined
 * @param status   - reactive todo status
 * @param now      - reactive current timestamp (ms)
 * @param warningMs - reactive warning window in milliseconds
 * @returns reactive CSS color string (or undefined when no dueAt)
 */
export function useDueColor(
  dueAt: Ref<number | null | undefined>,
  status: Ref<TodoStatus>,
  now: Ref<number>,
  warningMs: Ref<number>,
) {
  return computed(() => {
    const ts = dueAt.value
    if (! ts) return undefined

    if (status.value === 'done') return 'var(--color-success)'
    if (status.value === 'cancelled') return 'var(--color-text-secondary)'

    const remaining = ts - now.value
    if (remaining > warningMs.value) return 'var(--color-text-secondary)'

    // lerp gray (128,128,128) → red (239,68,68) as remaining → 0 (or past)
    const t = Math.max(0, Math.min(1, 1 - remaining / warningMs.value))
    const r = Math.round(128 + 111 * t)
    const g = Math.round(128 - 60 * t)
    const b = Math.round(128 - 60 * t)
    return `rgb(${r},${g},${b})`
  })
}

export { ONE_DAY }
