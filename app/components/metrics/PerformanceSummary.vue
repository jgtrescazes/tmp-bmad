<script setup lang="ts">
import { usePerformanceSummary, formatCWVValue } from '~/composables/usePerformanceMetrics'

const { data: summary, pending, error } = usePerformanceSummary()

function getStatusColor(status: string): string {
  switch (status) {
    case 'good': return 'text-green-500'
    case 'needs-improvement': return 'text-amber-500'
    case 'poor': return 'text-red-500'
    default: return 'text-[var(--ui-text-muted)]'
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'good': return 'i-lucide-check-circle'
    case 'needs-improvement': return 'i-lucide-alert-circle'
    case 'poor': return 'i-lucide-x-circle'
    default: return 'i-lucide-help-circle'
  }
}

const metrics = computed(() => {
  if (!summary.value) return []

  return [
    { name: 'LCP', value: summary.value.lcp.field ?? summary.value.lcp.lab, status: summary.value.lcp.status, key: 'lcp' },
    { name: 'CLS', value: summary.value.cls.field ?? summary.value.cls.lab, status: summary.value.cls.status, key: 'cls' },
    { name: 'INP', value: summary.value.inp.field ?? summary.value.inp.lab, status: summary.value.inp.status, key: 'inp' }
  ]
})

const hasData = computed(() => metrics.value.some(m => m.value !== null))
</script>

<template>
  <div>
    <USkeleton v-if="pending" class="h-32" />

    <UAlert
      v-else-if="error"
      color="red"
      :title="error.message"
      icon="i-lucide-alert-triangle"
      size="sm"
    />

    <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-8 text-center">
      <UIcon name="i-lucide-construction" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Collecteur DebugBear non configuré
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="metric in metrics"
        :key="metric.name"
        class="flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="getStatusIcon(metric.status)"
            :class="['size-4', getStatusColor(metric.status)]"
          />
          <span class="text-sm font-medium">{{ metric.name }}</span>
        </div>
        <span class="text-sm font-mono">{{ formatCWVValue(metric.key, metric.value) }}</span>
      </div>
    </div>
  </div>
</template>
