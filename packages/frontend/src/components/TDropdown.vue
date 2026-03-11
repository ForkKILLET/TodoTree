<template>
  <div
    class="t-dropdown-root"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
  >
    <slot />
    <Transition name="t-dropdown-fade">
      <div
        v-if="isOpen"
        class="t-dropdown-panel-bridge"
      >
        <div class="t-dropdown-panel">
          <slot name="panel" :close="close" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  hideDelay?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hideDelay: 160,
  disabled: false
})

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'close'): void
}>()

const isOpen = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const open = () => {
  if (props.disabled) return
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (! isOpen.value) {
    isOpen.value = true
    emit('open')
  }
}

const close = () => {
  if (isOpen.value) {
    isOpen.value = false
    emit('close')
  }
}

const handleEnter = () => {
  open()
}

const handleLeave = () => {
  hideTimer = setTimeout(close, props.hideDelay)
}

defineExpose({ open, close, isOpen })
</script>

<style scoped>
.t-dropdown-root {
  position: relative;
  display: inline-flex;
}

.t-dropdown-panel-bridge {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 300;
  padding-top: 4px;
}

.t-dropdown-panel {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.t-dropdown-fade-enter-active,
.t-dropdown-fade-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}

.t-dropdown-fade-enter-from,
.t-dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
