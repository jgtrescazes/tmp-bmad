<script setup lang="ts">
import type { Anomaly } from '~/utils/anomalyEngine'
import { getAnomalyRoute, getAnomalySeverityColor, formatAnomalyType } from '~/composables/useAnomalies'

const props = defineProps<{
  anomaly: Anomaly
}>()

const route = computed(() => getAnomalyRoute(props.anomaly))
const badgeColor = computed(() => getAnomalySeverityColor(props.anomaly.severity))
const typeLabel = computed(() => formatAnomalyType(props.anomaly.type))

// Color class based on severity
const valueColorClass = computed(() => {
  switch (props.anomaly.severity) {
    case 'critical':
      return 'text-red-500'
    case 'warning':
      return 'text-amber-500'
    case 'info':
    default:
      return 'text-blue-500'
  }
})

function formatValue(value: number, metric: string): string {
  if (metric === 'cls') {
    return value.toFixed(3)
  }
  if (['lcp', 'inp', 'fcp', 'ttfb'].includes(metric)) {
    return `${value}ms`
  }
  if (metric.includes('coverage')) {
    return `${value.toFixed(1)}%`
  }
  return String(Math.round(value))
}
</script>

<template>
  <UCard
    data-testid="anomaly-card"
    class="hover:ring-2 hover:ring-[var(--ui-primary)] transition-all"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <UBadge
            data-testid="severity-badge"
            :color="badgeColor"
            size="xs"
          >
            {{ anomaly.severity }}
          </UBadge>
          <span class="text-xs text-[var(--ui-text-muted)]">{{ typeLabel }}</span>
        </div>

        <p class="font-medium text-sm truncate">
          {{ anomaly.metric }}
        </p>

        <div class="flex items-baseline gap-2 mt-1 text-sm">
          <span class="text-[var(--ui-text-muted)]">Actuel:</span>
          <span class="font-mono font-semibold" :class="valueColorClass">
            {{ formatValue(anomaly.currentValue, anomaly.metric) }}
          </span>
          <span class="text-[var(--ui-text-muted)]">vs</span>
          <span class="font-mono">
            {{ formatValue(anomaly.expectedValue, anomaly.metric) }}
          </span>
        </div>
      </div>

      <NuxtLink
        data-testid="investigate-link"
        :to="route"
        class="shrink-0"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-arrow-right"
          aria-label="Investiguer"
        />
      </NuxtLink>
    </div>
  </UCard>
</template>
