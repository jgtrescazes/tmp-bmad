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
import type { EChartsOption } from 'echarts'
import { watchtowerDarkTheme, watchtowerLightTheme } from '~/utils/chartConfig'

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

withDefaults(defineProps<{
  option: EChartsOption
  height?: string
  loading?: boolean
  autoresize?: boolean
}>(), {
  height: '300px',
  loading: false,
  autoresize: true
})

const colorMode = useColorMode()

const theme = computed(() =>
  colorMode.value === 'dark' ? 'watchtower-dark' : 'watchtower-light'
)
</script>

<template>
  <div class="metric-chart" :style="{ height }">
    <VChart
      :option="option"
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
