<script setup lang="ts">
import { createMultiSeriesOption, CHART_COLORS } from '~/utils/chartConfig'
import type { MultiSeriesData } from '~/utils/chartConfig'
import { useQualityChartData, COVERAGE_THRESHOLDS } from '~/composables/useQualityMetrics'

const { height } = withDefaults(defineProps<{
  height?: string
}>(), {
  height: '300px'
})

const { period } = usePeriod()
const { data: chartData, pending, error } = useQualityChartData(period)

const chartOption = computed(() => {
  if (!chartData.value?.length) return null

  const series: MultiSeriesData[] = [
    {
      name: 'Lines',
      data: chartData.value
        .filter(d => d.lines !== null)
        .map(d => ({ date: d.date, value: d.lines! })),
      color: CHART_COLORS.primary
    },
    {
      name: 'Functions',
      data: chartData.value
        .filter(d => d.functions !== null)
        .map(d => ({ date: d.date, value: d.functions! })),
      color: CHART_COLORS.success
    },
    {
      name: 'Classes',
      data: chartData.value
        .filter(d => d.classes !== null)
        .map(d => ({ date: d.date, value: d.classes! })),
      color: CHART_COLORS.purple
    }
  ].filter(s => s.data.length > 0)

  const option = createMultiSeriesOption(series, {
    title: 'Évolution de la coverage',
    unit: '%',
    type: 'line'
  })

  // Add threshold markLines
  if (option.series && Array.isArray(option.series) && option.series.length > 0) {
    option.series[0] = {
      ...option.series[0],
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' },
        data: [
          {
            yAxis: COVERAGE_THRESHOLDS.good,
            label: { formatter: 'Bon (80%)', position: 'end' },
            lineStyle: { color: CHART_COLORS.success }
          },
          {
            yAxis: COVERAGE_THRESHOLDS.acceptable,
            label: { formatter: 'Acceptable (60%)', position: 'end' },
            lineStyle: { color: CHART_COLORS.warning }
          }
        ]
      }
    }
  }

  // Set Y axis max to 100%
  if (option.yAxis && typeof option.yAxis === 'object' && !Array.isArray(option.yAxis)) {
    option.yAxis.max = 100
    option.yAxis.min = 0
  }

  return option
})

const hasData = computed(() => chartData.value && chartData.value.length > 0)
</script>

<template>
  <div>
    <USkeleton v-if="pending" class="w-full" :style="{ height }" />

    <UAlert
      v-else-if="error"
      color="red"
      :title="error.message"
      icon="i-lucide-alert-triangle"
    />

    <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-12 text-center">
      <UIcon name="i-lucide-test-tubes" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Aucune donnée de coverage disponible
      </p>
      <p class="text-xs text-[var(--ui-text-muted)] mt-1">
        Le collecteur Coverage doit être exécuté au moins une fois
      </p>
    </div>

    <ClientOnly v-else>
      <MetricsMetricChart :option="chartOption!" :height="height" />
      <template #fallback>
        <USkeleton class="w-full" :style="{ height }" />
      </template>
    </ClientOnly>
  </div>
</template>
