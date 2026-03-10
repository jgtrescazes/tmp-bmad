<script setup lang="ts">
import { createCWVChartOption } from '~/utils/chartConfig'
import { usePerformanceChartData, CWV_THRESHOLDS } from '~/composables/usePerformanceMetrics'

const { height } = withDefaults(defineProps<{
  height?: string
}>(), {
  height: '300px'
})

const { period } = usePeriod()
const { data: chartData, pending, error } = usePerformanceChartData(period)

const lcpOption = computed(() => {
  const lcp = chartData.value?.find(m => m.metricName === 'lcp')
  if (!lcp || (lcp.labData.length === 0 && lcp.fieldData.length === 0)) return null

  return createCWVChartOption(
    lcp.labData,
    lcp.fieldData,
    CWV_THRESHOLDS.lcp,
    { title: 'LCP - Largest Contentful Paint', unit: 'ms' }
  )
})

const clsOption = computed(() => {
  const cls = chartData.value?.find(m => m.metricName === 'cls')
  if (!cls || (cls.labData.length === 0 && cls.fieldData.length === 0)) return null

  return createCWVChartOption(
    cls.labData,
    cls.fieldData,
    CWV_THRESHOLDS.cls,
    { title: 'CLS - Cumulative Layout Shift', unit: 'ratio' }
  )
})

const inpOption = computed(() => {
  const inp = chartData.value?.find(m => m.metricName === 'inp')
  if (!inp || (inp.labData.length === 0 && inp.fieldData.length === 0)) return null

  return createCWVChartOption(
    inp.labData,
    inp.fieldData,
    CWV_THRESHOLDS.inp,
    { title: 'INP - Interaction to Next Paint', unit: 'ms' }
  )
})

const hasData = computed(() => lcpOption.value || clsOption.value || inpOption.value)
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
      <UIcon name="i-lucide-gauge" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Aucune donnée de performance disponible
      </p>
      <p class="text-xs text-[var(--ui-text-muted)] mt-1">
        Le collecteur DebugBear doit être exécuté au moins une fois
      </p>
    </div>

    <div v-else class="space-y-6">
      <ClientOnly v-if="lcpOption">
        <MetricsMetricChart :option="lcpOption" :height="height" />
        <template #fallback>
          <USkeleton class="w-full" :style="{ height }" />
        </template>
      </ClientOnly>

      <ClientOnly v-if="clsOption">
        <MetricsMetricChart :option="clsOption" :height="height" />
        <template #fallback>
          <USkeleton class="w-full" :style="{ height }" />
        </template>
      </ClientOnly>

      <ClientOnly v-if="inpOption">
        <MetricsMetricChart :option="inpOption" :height="height" />
        <template #fallback>
          <USkeleton class="w-full" :style="{ height }" />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
