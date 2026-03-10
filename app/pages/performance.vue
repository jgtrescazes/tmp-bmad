<script setup lang="ts">
import { usePerformanceSummary, formatCWVValue } from '~/composables/usePerformanceMetrics'
import { debugbearDashboardUrl, useDeepLinkConfig } from '~/utils/deepLinks'

const deepLinkConfig = useDeepLinkConfig()
const debugbearUrl = computed(() => debugbearDashboardUrl(deepLinkConfig.debugbearSiteId))

const { data: summary, pending: summaryPending } = usePerformanceSummary()

// M/M-1 comparison
const { data: comparison } = useMonthlyComparison('performance')

const metrics = computed(() => {
  if (!summary.value) return []

  return [
    {
      name: 'LCP',
      fullName: 'Largest Contentful Paint',
      lab: summary.value.lcp.lab,
      field: summary.value.lcp.field,
      status: summary.value.lcp.status,
      metricName: 'lcp'
    },
    {
      name: 'CLS',
      fullName: 'Cumulative Layout Shift',
      lab: summary.value.cls.lab,
      field: summary.value.cls.field,
      status: summary.value.cls.status,
      metricName: 'cls'
    },
    {
      name: 'INP',
      fullName: 'Interaction to Next Paint',
      lab: summary.value.inp.lab,
      field: summary.value.inp.field,
      status: summary.value.inp.status,
      metricName: 'inp'
    }
  ]
})

function getStatusBadge(status: string): { color: 'success' | 'warning' | 'error' | 'neutral', label: string } {
  switch (status) {
    case 'good':
      return { color: 'success', label: 'Bon' }
    case 'needs-improvement':
      return { color: 'warning', label: 'À améliorer' }
    case 'poor':
      return { color: 'error', label: 'Mauvais' }
    default:
      return { color: 'neutral', label: 'Inconnu' }
  }
}

function getComparisonForMetric(metricName: string) {
  return comparison.value?.results?.find(r => r.metricName === metricName)
}
</script>

<template>
  <UDashboardPanel id="performance">
    <template #header>
      <UDashboardNavbar title="Performance">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-2">
            <UButton
              v-if="deepLinkConfig.debugbearSiteId"
              :to="debugbearUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="neutral"
              variant="outline"
              icon="i-lucide-external-link"
            >
              Ouvrir dans DebugBear
            </UButton>
            <CommonPeriodSelector />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <template v-if="summaryPending">
            <USkeleton v-for="i in 3" :key="i" class="h-32" />
          </template>
          <template v-else>
            <UCard v-for="metric in metrics" :key="metric.name">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm text-[var(--ui-text-muted)]">
                    {{ metric.fullName }}
                  </p>
                  <p class="text-2xl font-semibold mt-1">
                    {{ metric.name }}
                  </p>
                </div>
                <UBadge
                  :color="getStatusBadge(metric.status).color"
                  variant="subtle"
                  size="sm"
                >
                  {{ getStatusBadge(metric.status).label }}
                </UBadge>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-[var(--ui-text-muted)]">
                    Lab
                  </p>
                  <p class="font-medium">
                    {{ formatCWVValue(metric.metricName, metric.lab) }}
                  </p>
                </div>
                <div>
                  <p class="text-[var(--ui-text-muted)]">
                    Field
                  </p>
                  <p class="font-medium">
                    {{ formatCWVValue(metric.metricName, metric.field) }}
                  </p>
                </div>
              </div>

              <!-- M/M-1 Comparison -->
              <div v-if="comparison?.results?.length" class="mt-3 pt-3 border-t border-[var(--ui-border)]">
                <CommonDeltaBadge
                  v-if="getComparisonForMetric(metric.metricName)"
                  :current="getComparisonForMetric(metric.metricName)?.currentValue ?? null"
                  :previous="getComparisonForMetric(metric.metricName)?.previousValue ?? null"
                  :metric-name="metric.metricName"
                  :unit="metric.metricName === 'cls' ? 'ratio' : 'ms'"
                  :show-absolute="true"
                  :show-percent="true"
                />
              </div>
            </UCard>
          </template>
        </div>

        <!-- Thresholds Info -->
        <UAlert
          icon="i-lucide-info"
          color="info"
          title="Seuils Google Core Web Vitals"
          description="LCP: Bon ≤ 2.5s | CLS: Bon ≤ 0.1 | INP: Bon ≤ 200ms. Les lignes en pointillés sur les graphiques représentent ces seuils."
        />

        <!-- Charts -->
        <div>
          <h2 class="text-lg font-semibold mb-4">
            Évolution des métriques
          </h2>
          <MetricsPerformanceChart height="350px" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
