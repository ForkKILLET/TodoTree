import { ref, onMounted, onUnmounted } from 'vue'

// Module-level shared state — single timer regardless of how many components use this
const now = ref(Date.now())
let refCount = 0
let timer: ReturnType<typeof setInterval> | null = null

export function useNow(intervalMs = 30_000) {
  onMounted(() => {
    refCount++
    if (refCount === 1) {
      timer = setInterval(() => { now.value = Date.now() }, intervalMs)
    }
  })
  onUnmounted(() => {
    refCount--
    if (refCount === 0 && timer !== null) {
      clearInterval(timer)
      timer = null
    }
  })
  return now
}
