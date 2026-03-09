<script setup lang="ts">
import { createTimeSeriesOption, createMultiSeriesOption, CHART_COLORS } from '~/utils/chartConfig'
import type { TimeSeriesDataPoint, MultiSeriesData } from '~/utils/chartConfig'

const { period } = usePeriod()
const { data: metrics, pending, error, refresh } = useMetrics('stability', period)

// Sentry metric definitions
const metricConfigs = [
  { name: 'new_errors', label: 'Nouvelles erreurs', unit: 'count', color: CHART_COLORS.danger },
  { name: 'resolved_errors', label: 'Erreurs résolues', unit: 'count', color: CHART_COLORS.success },
  { name: 'error_rate', label: 'Taux d\'erreurs', unit: 'ratio', color: CHART_COLORS.warning },
  { name: 'avg_resolution_time', label: 'Temps de résolution', unit: 'ms', color: CHART_COLORS.primary }
]

// Group metrics by type
const metricsByType = computed(() => {
  if (!metrics.value?.length) return {}

  const grouped: Record<string, TimeSeriesDataPoint[]> = {}

  for (const metric of metrics.value) {
    if (!grouped[metric.metricName]) {
      grouped[metric.metricName] = []
    }
    grouped[metric.metricName].push({
      date: metric.periodStart,
      value: metric.valueAvg
    })
  }

  return grouped
})

// Create chart options for each metric
const chartOptions = computed(() => {
  const options: Record<string, ReturnType<typeof createTimeSeriesOption> | null> = {}

  for (const config of metricConfigs) {
    const data = metricsByType.value[config.name]
    if (data?.length) {
      options[config.name] = createTimeSeriesOption(data, {
        title: config.label,
        unit: config.unit,
        color: config.color
      })
    } else {
      options[config.name] = null
    }
  }

  return options
})

// Combined chart with all metrics
const combinedChartOption = computed(() => {
  const series: MultiSeriesData[] = []

  for (const config of metricConfigs) {
    const data = metricsByType.value[config.name]
    if (data?.length) {
      series.push({
        name: config.label,
        data,
        color: config.color
      })
    }
  }

  if (!series.length) return null

  return createMultiSeriesOption(series, {
    title: 'Vue d\'ensemble Stabilité',
    unit: ''
  })
})

// Table data for detailed view
const tableRows = computed(() => {
  if (!metrics.value?.length) return []

  // Get latest value for each metric
  const latestByMetric: Record<string, typeof metrics.value[0]> = {}

  for (const metric of metrics.value) {
    if (!latestByMetric[metric.metricName]
      || new Date(metric.periodStart) > new Date(latestByMetric[metric.metricName].periodStart)) {
      latestByMetric[metric.metricName] = metric
    }
  }

  return Object.values(latestByMetric).map(m => ({
    name: m.metricDisplayName,
    value: formatMetricValue(m.valueAvg, m.metricUnit),
    min: m.valueMin !== null ? formatMetricValue(m.valueMin, m.metricUnit) : '-',
    max: m.valueMax !== null ? formatMetricValue(m.valueMax, m.metricUnit) : '-',
    samples: m.sampleCount,
    date: new Date(m.periodStart).toLocaleDateString('fr-FR')
  }))
})

const tableColumns = [
  { key: 'name', label: 'Métrique' },
  { key: 'value', label: 'Valeur moyenne' },
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
  { key: 'samples', label: 'Échantillons' },
  { key: 'date', label: 'Date' }
]

function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case 'ms':
      return `${Math.round(value).toLocaleString('fr-FR')} ms`
    case 'ratio':
      return value.toFixed(4)
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString('fr-FR')
  }
}

const hasData = computed(() => metrics.value?.length && metrics.value.length > 0)
</script>

<template>
  <UDashboardPanel id="stability">
    <template #header>
      <UDashboardNavbar title="Stabilité — Sentry">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-refresh-cw"
              :loading="pending"
              @click="refresh()"
            >
              Actualiser
            </UButton>
            <PeriodSelector />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Loading state -->
        <div v-if="pending" class="space-y-6">
          <USkeleton class="h-80 w-full" />
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <USkeleton class="h-64" />
            <USkeleton class="h-64" />
          </div>
        </div>

        <!-- Error state -->
        <UAlert
          v-else-if="error"
          color="red"
          :title="'Erreur de chargement'"
          :description="error.message"
          icon="i-lucide-alert-triangle"
        />

        <!-- Empty state -->
        <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-16 text-center">
          <UIcon name="i-lucide-bar-chart-3" class="size-16 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Aucune donnée de stabilité
          </p>
          <p class="mt-2 text-[var(--ui-text-muted)] max-w-md">
            Le collecteur Sentry n'a pas encore collecté de données.
            Vérifiez que le collecteur est configuré et exécuté.
          </p>
          <NuxtLink to="/health" class="mt-4">
            <UButton color="primary" variant="soft">
              Vérifier l'état des collecteurs
            </UButton>
          </NuxtLink>
        </div>

        <!-- Data view -->
        <template v-else>
          <!-- Combined chart -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold">Vue d'ensemble</span>
                <UBadge color="blue" variant="subtle">
                  {{ period.from }} → {{ period.to }}
                </UBadge>
              </div>
            </template>

            <ClientOnly>
              <MetricsMetricChart
                v-if="combinedChartOption"
                :option="combinedChartOption"
                height="350px"
              />
              <template #fallback>
                <USkeleton class="h-[350px] w-full" />
              </template>
            </ClientOnly>
          </UCard>

          <!-- Individual charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UCard v-for="config in metricConfigs" :key="config.name">
              <template #header>
                <span class="font-semibold">{{ config.label }}</span>
              </template>

              <ClientOnly v-if="chartOptions[config.name]">
                <MetricsMetricChart
                  :option="chartOptions[config.name]!"
                  height="250px"
                />
                <template #fallback>
                  <USkeleton class="h-[250px] w-full" />
                </template>
              </ClientOnly>

              <div v-else class="flex flex-col items-center justify-center h-[250px] text-center">
                <UIcon name="i-lucide-database" class="size-8 text-[var(--ui-text-muted)]" />
                <p class="mt-2 text-sm text-[var(--ui-text-muted)]">
                  Pas de données
                </p>
              </div>
            </UCard>
          </div>

          <!-- Data table -->
          <UCard>
            <template #header>
              <span class="font-semibold">Détails des métriques</span>
            </template>

            <UTable :rows="tableRows" :columns="tableColumns" />
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
