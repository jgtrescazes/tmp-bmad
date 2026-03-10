<script setup lang="ts">
import { createStackedBarOption, createTimeSeriesOption, CHART_COLORS } from '~/utils/chartConfig'
import type { TimeSeriesDataPoint } from '~/utils/chartConfig'
import { useSecurityChartData, SEVERITY_COLORS } from '~/composables/useSecurityMetrics'

const { height } = withDefaults(defineProps<{
  height?: string
}>(), {
  height: '300px'
})

const { period } = usePeriod()
const { data: chartData, pending, error } = useSecurityChartData(period)

// Stacked bar chart for severity breakdown
const stackedBarOption = computed(() => {
  if (!chartData.value?.length) return null

  const data = chartData.value.map(d => ({
    date: d.date,
    values: {
      Critiques: d.critical,
      Hautes: d.high,
      Moyennes: d.medium,
      Basses: d.low
    }
  }))

  const seriesConfig = [
    { name: 'Critiques', color: SEVERITY_COLORS.critical },
    { name: 'Hautes', color: SEVERITY_COLORS.high },
    { name: 'Moyennes', color: SEVERITY_COLORS.medium },
    { name: 'Basses', color: SEVERITY_COLORS.low }
  ]

  return createStackedBarOption(data, seriesConfig, {
    title: 'Vulnérabilités par sévérité',
    unit: 'vulnérabilités'
  })
})

// Line chart for total backlog evolution
const lineChartOption = computed(() => {
  if (!chartData.value?.length) return null

  const data: TimeSeriesDataPoint[] = chartData.value.map(d => ({
    date: d.date,
    value: d.total
  }))

  return createTimeSeriesOption(data, {
    title: 'Évolution du backlog total',
    unit: 'vulnérabilités',
    type: 'line',
    color: CHART_COLORS.warning
  })
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
      <UIcon name="i-lucide-shield-off" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Aucune donnée de sécurité disponible
      </p>
      <p class="text-xs text-[var(--ui-text-muted)] mt-1">
        Le collecteur Dependabot doit être exécuté au moins une fois
      </p>
    </div>

    <div v-else class="space-y-6">
      <ClientOnly v-if="stackedBarOption">
        <MetricsMetricChart :option="stackedBarOption" :height="height" />
        <template #fallback>
          <USkeleton class="w-full" :style="{ height }" />
        </template>
      </ClientOnly>

      <ClientOnly v-if="lineChartOption">
        <MetricsMetricChart :option="lineChartOption" :height="height" />
        <template #fallback>
          <USkeleton class="w-full" :style="{ height }" />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
