<script setup lang="ts">
import { use, registerTheme } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { watchtowerDarkTheme, watchtowerLightTheme } from '~/utils/chartConfig'
import type { Deployment } from '~/composables/useDeployments'
import { deploymentsToMarkLine, createDeploymentTooltipFormatter } from '~/composables/useDeployments'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  TitleComponent
])

// Register themes
registerTheme('watchtower-dark', watchtowerDarkTheme)
registerTheme('watchtower-light', watchtowerLightTheme)

const props = withDefaults(defineProps<{
  option: EChartsOption
  height?: string
  loading?: boolean
  autoresize?: boolean
  deployments?: Deployment[]
}>(), {
  height: '300px',
  loading: false,
  autoresize: true,
  deployments: () => []
})

const colorMode = useColorMode()

const theme = computed(() =>
  colorMode.value === 'dark' ? 'watchtower-dark' : 'watchtower-light'
)

// Merge deployments markLine into chart options
const mergedOption = computed((): EChartsOption => {
  if (!props.deployments || props.deployments.length === 0) {
    return props.option
  }

  const markLineData = deploymentsToMarkLine(props.deployments)
  // Use structuredClone for proper deep cloning (handles Date, undefined, etc.)
  const option = structuredClone(props.option) as EChartsOption

  // Inject markLine into first series
  if (Array.isArray(option.series) && option.series.length > 0) {
    const firstSeries = option.series[0] as LineSeriesOption
    firstSeries.markLine = markLineData.markLine
  }

  // Enhance tooltip to handle deployment markers
  if (option.tooltip && typeof option.tooltip === 'object') {
    const originalFormatter = option.tooltip.formatter
    option.tooltip.formatter = createDeploymentTooltipFormatter(
      props.deployments,
      (params) => {
        if (typeof originalFormatter === 'function') {
          return originalFormatter(params, {}) as string
        }
        if (typeof originalFormatter === 'string') {
          return originalFormatter
        }
        // Default formatter for axis trigger
        const p = params as Array<{ seriesName: string, value: [string, number] }>
        if (Array.isArray(p) && p.length > 0) {
          return p.map(item => `${item.seriesName}: ${item.value[1]}`).join('<br/>')
        }
        return ''
      }
    )
  }

  return option
})
</script>

<template>
  <div class="metric-chart" :style="{ height }">
    <VChart
      :option="mergedOption"
      :theme="theme"
      :loading="loading"
      :autoresize="autoresize"
      class="w-full h-full"
    />
  </div>
</template>

<style scoped>
.metric-chart {
  min-height: 200px;
}
</style>
