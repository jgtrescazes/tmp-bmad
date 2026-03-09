<script setup lang="ts">
import { createTimeSeriesOption, CHART_COLORS } from '~/utils/chartConfig'
import type { TimeSeriesDataPoint } from '~/utils/chartConfig'

const props = withDefaults(defineProps<{
  height?: string
}>(), {
  height: '300px'
})

const { period } = usePeriod()
const { data: metrics, pending, error } = useMetrics('stability', period)

const chartData = computed((): TimeSeriesDataPoint[] => {
  if (!metrics.value?.length) return []

  // Filter for new_errors metric and map to chart format
  return metrics.value
    .filter(m => m.metricName === 'new_errors')
    .map(m => ({
      date: m.periodStart,
      value: m.valueAvg
    }))
})

const chartOption = computed(() => {
  if (!chartData.value.length) return null

  return createTimeSeriesOption(chartData.value, {
    unit: 'erreurs',
    type: 'line',
    color: CHART_COLORS.danger
  })
})

const hasData = computed(() => chartData.value.length > 0)
</script>

<template>
  <div :style="{ height }">
    <USkeleton v-if="pending" class="w-full h-full" />

    <UAlert
      v-else-if="error"
      color="red"
      :title="error.message"
      icon="i-lucide-alert-triangle"
    />

    <div v-else-if="!hasData" class="flex flex-col items-center justify-center h-full text-center">
      <UIcon name="i-lucide-bar-chart-3" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Aucune donnée de stabilité disponible
      </p>
      <p class="text-xs text-[var(--ui-text-muted)] mt-1">
        Le collecteur Sentry doit être exécuté au moins une fois
      </p>
    </div>

    <ClientOnly v-else>
      <MetricsMetricChart
        :option="chartOption!"
        :height="height"
      />
      <template #fallback>
        <USkeleton class="w-full h-full" />
      </template>
    </ClientOnly>
  </div>
</template>
