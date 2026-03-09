<script setup lang="ts">
import type { Axis } from '~/composables/useMetrics'

const props = defineProps<{
  axis: Axis
  title: string
  value: number | null
  previousValue?: number | null
  unit?: string
  icon: string
  loading?: boolean
}>()

const delta = computed(() => {
  if (props.value === null || props.previousValue === null || props.previousValue === undefined) {
    return null
  }
  return props.value - props.previousValue
})

const deltaPercent = computed(() => {
  if (delta.value === null || props.previousValue === 0) return null
  return (delta.value / (props.previousValue || 1)) * 100
})

const trend = computed(() => {
  if (deltaPercent.value === null) return 'unknown'
  if (Math.abs(deltaPercent.value) < 1) return 'stable'
  return deltaPercent.value > 0 ? 'up' : 'down'
})

const trendColor = computed(() => {
  // For most metrics, down is good (errors, vulnerabilities)
  // Exception: coverage where up is good
  const upIsGood = props.axis === 'quality'

  if (trend.value === 'stable') return 'text-gray-500'
  if (trend.value === 'up') return upIsGood ? 'text-green-500' : 'text-red-500'
  if (trend.value === 'down') return upIsGood ? 'text-red-500' : 'text-green-500'
  return 'text-gray-400'
})

const trendIcon = computed(() => {
  if (trend.value === 'up') return 'i-lucide-trending-up'
  if (trend.value === 'down') return 'i-lucide-trending-down'
  return 'i-lucide-minus'
})

function formatValue(val: number | null): string {
  if (val === null) return '-'
  if (props.unit === 'percent') return `${val.toFixed(1)}%`
  if (props.unit === 'ms') return `${Math.round(val)}ms`
  if (props.unit === 'ratio') return val.toFixed(3)
  return val.toLocaleString('fr-FR')
}

function formatDelta(val: number): string {
  const sign = val >= 0 ? '+' : ''
  if (props.unit === 'percent') return `${sign}${val.toFixed(1)}%`
  if (props.unit === 'ms') return `${sign}${Math.round(val)}ms`
  return `${sign}${val.toLocaleString('fr-FR')}`
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon :name="icon" class="size-5 text-[var(--ui-primary)]" />
        <span class="font-semibold">{{ title }}</span>
      </div>
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-8 w-24" />
      <USkeleton class="h-4 w-16" />
    </div>

    <div v-else-if="value === null" class="flex flex-col items-center justify-center py-4 text-center">
      <UIcon name="i-lucide-database" class="size-8 text-[var(--ui-text-muted)]" />
      <p class="mt-2 text-sm text-[var(--ui-text-muted)]">Aucune donnée</p>
    </div>

    <div v-else class="space-y-2">
      <div class="text-3xl font-bold">
        {{ formatValue(value) }}
      </div>

      <div v-if="delta !== null" class="flex items-center gap-1 text-sm" :class="trendColor">
        <UIcon :name="trendIcon" class="size-4" />
        <span>{{ formatDelta(delta) }}</span>
        <span v-if="deltaPercent !== null" class="text-[var(--ui-text-muted)]">
          ({{ deltaPercent >= 0 ? '+' : '' }}{{ deltaPercent.toFixed(1) }}%)
        </span>
      </div>

      <div v-else class="text-sm text-[var(--ui-text-muted)]">
        Pas de comparaison M-1
      </div>
    </div>
  </UCard>
</template>
