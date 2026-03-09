<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="status-dot-svg">
    <circle
      v-if="! showRing"
      :cx="center"
      :cy="center"
      :r="radius"
      :fill="statusColor"
    />

    <template v-else>
      <circle
        v-for="segment in segments"
        :key="segment.status"
        :cx="center"
        :cy="center"
        :r="ringRadius"
        fill="none"
        :stroke="segment.color"
        :stroke-width="ringWidth"
        stroke-linecap="butt"
        :stroke-dasharray="`${segment.length} ${circumference - segment.length}`"
        :stroke-dashoffset="segment.offset"
        :transform="`rotate(-90 ${center} ${center})`"
      />

    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodoStatus, StatusDistribution } from '../types/todo'
import { STATUS_COLORS } from '../constants/colors'

interface Props {
  status: TodoStatus
  size?: number
  showRing?: boolean
  distribution?: StatusDistribution
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  showRing: false,
  distribution: () => ({
    todo: 0,
    doing: 0,
    done: 0,
    cancelled: 0
  })
})

const center = computed(() => props.size / 2)
const radius = computed(() => props.size / 2 - 3)
const ringWidth = 4
const ringRadius = computed(() => radius.value - ringWidth / 2)
const circumference = computed(() => 2 * Math.PI * ringRadius.value)
const statusColor = computed(() => STATUS_COLORS[props.status])

const segments = computed(() => {
  const orderedStatuses: TodoStatus[] = ['todo', 'doing', 'done', 'cancelled']
  const total = orderedStatuses.reduce((sum, status) => sum + (props.distribution?.[status] ?? 0), 0)

  if (total === 0) {
    return [{
      status: props.status,
      color: STATUS_COLORS[props.status],
      length: circumference.value,
      offset: 0
    }]
  }

  let accumulated = 0

  return orderedStatuses
    .filter(status => (props.distribution?.[status] ?? 0) > 0)
    .map(status => {
      const ratio = (props.distribution?.[status] ?? 0) / total
      const length = circumference.value * ratio
      const segment = {
        status,
        color: STATUS_COLORS[status],
        length,
        offset: - accumulated
      }
      accumulated += length
      return segment
    })
})
</script>

<style scoped>
.status-dot-svg {
  display: block;
}
</style>
