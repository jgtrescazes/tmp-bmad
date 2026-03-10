<script setup lang="ts">
import {
  useQualitySummary,
  getCoverageStatusColor,
  getCoverageStatus,
  formatCoverage,
  COVERAGE_THRESHOLDS
} from '~/composables/useQualityMetrics'
import { githubActionsUrl, useDeepLinkConfig } from '~/utils/deepLinks'

const deepLinkConfig = useDeepLinkConfig()
const actionsUrl = computed(() => githubActionsUrl(deepLinkConfig.githubOrg, deepLinkConfig.githubRepo))

const { data: summary, pending: summaryPending } = useQualitySummary()

// M/M-1 comparison
const { data: comparison } = useMonthlyComparison('quality')

function getComparisonForCoverage(coverageType: string) {
  const metricName = `coverage_${coverageType.toLowerCase()}`
  return comparison.value?.results?.find(r => r.metricName === metricName)
}

const coverageCards = computed(() => {
  if (!summary.value) return []

  return [
    { label: 'Lines', value: summary.value.lines, icon: 'i-lucide-file-code' },
    { label: 'Functions', value: summary.value.functions, icon: 'i-lucide-function-square' },
    { label: 'Classes', value: summary.value.classes, icon: 'i-lucide-box' }
  ]
})

// Table columns for module coverage
const moduleColumns = [
  { key: 'name', label: 'Module', sortable: true },
  { key: 'linesPct', label: 'Coverage', sortable: true }
]

const sortedModules = computed(() => {
  if (!summary.value?.modules?.length) return []
  return [...summary.value.modules].sort((a, b) => a.linesPct - b.linesPct)
})

function getProgressColor(value: number): string {
  if (value >= COVERAGE_THRESHOLDS.good) return 'primary'
  if (value >= COVERAGE_THRESHOLDS.acceptable) return 'warning'
  return 'error'
}
</script>

<template>
  <UDashboardPanel id="quality">
    <template #header>
      <UDashboardNavbar title="Qualité">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-2">
            <UButton
              :to="actionsUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="neutral"
              variant="outline"
              icon="i-lucide-external-link"
            >
              Ouvrir dans GitHub Actions
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
            <UCard v-for="card in coverageCards" :key="card.label">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm text-[var(--ui-text-muted)]">
                    Coverage {{ card.label }}
                  </p>
                  <p class="text-3xl font-bold mt-1">
                    {{ formatCoverage(card.value) }}
                  </p>
                </div>
                <UIcon
                  :name="card.icon"
                  :class="['size-8', `text-${getCoverageStatusColor(card.value)}-500`]"
                />
              </div>

              <div class="mt-4">
                <UProgress
                  :value="card.value || 0"
                  :max="100"
                  :color="getProgressColor(card.value || 0)"
                  size="sm"
                />
                <div class="flex justify-between mt-1 text-xs text-[var(--ui-text-muted)]">
                  <span>{{ getCoverageStatus(card.value) }}</span>
                  <span>Objectif: {{ COVERAGE_THRESHOLDS.good }}%</span>
                </div>
              </div>

              <!-- M/M-1 Comparison -->
              <div v-if="getComparisonForCoverage(card.label)" class="mt-3 pt-3 border-t border-[var(--ui-border)]">
                <CommonDeltaBadge
                  :current="getComparisonForCoverage(card.label)?.currentValue ?? null"
                  :previous="getComparisonForCoverage(card.label)?.previousValue ?? null"
                  :metric-name="`coverage_${card.label.toLowerCase()}`"
                  unit="percent"
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
          title="Seuils de coverage"
          description="Bon: ≥ 80% | Acceptable: ≥ 60% | Faible: ≥ 40% | Insuffisant: < 40%"
        />

        <!-- Chart -->
        <div>
          <h2 class="text-lg font-semibold mb-4">
            Évolution de la coverage
          </h2>
          <MetricsQualityChart height="350px" />
        </div>

        <!-- Module Coverage Table -->
        <div v-if="sortedModules.length > 0">
          <h2 class="text-lg font-semibold mb-4">
            Coverage par module
          </h2>

          <UTable
            :rows="sortedModules"
            :columns="moduleColumns"
            :ui="{ td: { base: 'py-3' } }"
          >
            <template #name-data="{ row }">
              <span class="font-mono text-sm">{{ row.name }}</span>
            </template>

            <template #linesPct-data="{ row }">
              <div class="flex items-center gap-3">
                <UProgress
                  :value="row.linesPct"
                  :max="100"
                  :color="getProgressColor(row.linesPct)"
                  size="sm"
                  class="w-24"
                />
                <span
                  :class="[
                    'font-medium text-sm',
                    row.linesPct < COVERAGE_THRESHOLDS.acceptable ? 'text-red-500' : ''
                  ]"
                >
                  {{ row.linesPct.toFixed(1) }}%
                </span>
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
