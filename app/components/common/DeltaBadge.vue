<script setup lang="ts">
import { getDeltaColor } from '~/utils/metricPolarity'

const props = withDefaults(
  defineProps<{
    current: number | null
    previous: number | null
    metricName?: string
    unit?: 'percent' | 'ms' | 'count' | 'ratio' | string
    showAbsolute?: boolean
    showPercent?: boolean
  }>(),
  {
    metricName: '',
    unit: 'count',
    showAbsolute: true,
    showPercent: true
  }
)

const delta = computed(() => {
  if (props.current === null || props.previous === null) return null
  return props.current - props.previous
})

const deltaPercent = computed(() => {
  if (delta.value === null || props.previous === null || props.previous === 0)
    return null
  return (delta.value / Math.abs(props.previous)) * 100
})

const trend = computed((): 'up' | 'down' | 'stable' | 'unknown' => {
  if (deltaPercent.value === null) return 'unknown'
  if (Math.abs(deltaPercent.value) < 1) return 'stable'
  return deltaPercent.value > 0 ? 'up' : 'down'
})

const color = computed(() => {
  if (delta.value === null) return 'neutral'
  return getDeltaColor(delta.value, props.metricName)
})

const colorClasses = computed(() => {
  switch (color.value) {
    case 'success':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
    case 'danger':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50'
  }
})

const icon = computed(() => {
  switch (trend.value) {
    case 'up':
      return 'i-lucide-trending-up'
    case 'down':
      return 'i-lucide-trending-down'
    default:
      return 'i-lucide-minus'
  }
})

function formatDelta(val: number): string {
  const sign = val >= 0 ? '+' : ''
  switch (props.unit) {
    case 'percent':
      return `${sign}${val.toFixed(1)}%`
    case 'ms':
      return `${sign}${Math.round(val)}ms`
    case 'ratio':
      return `${sign}${val.toFixed(3)}`
    default:
      return `${sign}${val.toLocaleString('fr-FR')}`
  }
}

function formatPercent(val: number): string {
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
}
</script>

<template>
  <div v-if="delta !== null" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium" :class="colorClasses">
    <UIcon :name="icon" class="size-3.5" />
    <span v-if="showAbsolute">{{ formatDelta(delta) }}</span>
    <span v-if="showPercent && deltaPercent !== null" class="opacity-75">
      ({{ formatPercent(deltaPercent) }})
    </span>
  </div>
  <UTooltip v-else text="Pas de donnees pour la periode precedente">
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50">
      <UIcon name="i-lucide-help-circle" class="size-3.5" />
      <span>N/A</span>
    </span>
  </UTooltip>
</template>
