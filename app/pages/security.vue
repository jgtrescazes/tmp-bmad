<script setup lang="ts">
import {
  useSecuritySummary,
  useSecurityAlerts,
  getSeverityBadgeColor,
  formatAge,
  SEVERITY_ORDER
} from '~/composables/useSecurityMetrics'
import { githubDependabotUrl, useDeepLinkConfig } from '~/utils/deepLinks'

const deepLinkConfig = useDeepLinkConfig()
const dependabotUrl = computed(() => githubDependabotUrl(deepLinkConfig.githubOrg, deepLinkConfig.githubRepo))

const { data: summary, pending: summaryPending } = useSecuritySummary()
const { data: alerts, pending: alertsPending } = useSecurityAlerts()

// M/M-1 comparison
const { data: comparison } = useMonthlyComparison('security')

function getComparisonForSeverity(severity: string) {
  const metricName = `vuln_${severity}`
  return comparison.value?.results?.find(r => r.metricName === metricName)
}

const summaryCards = computed(() => {
  if (!summary.value) return []

  return [
    { label: 'Critiques', value: summary.value.critical, color: 'error' as const, severity: 'critical' as const },
    { label: 'Hautes', value: summary.value.high, color: 'warning' as const, severity: 'high' as const },
    { label: 'Moyennes', value: summary.value.medium, color: 'warning' as const, severity: 'medium' as const },
    { label: 'Basses', value: summary.value.low, color: 'info' as const, severity: 'low' as const }
  ]
})

// Table columns configuration
const columns = [
  { key: 'severity', label: 'Sévérité', sortable: true },
  { key: 'package', label: 'Package', sortable: true },
  { key: 'ageDays', label: 'Âge', sortable: true },
  { key: 'number', label: '#', sortable: false }
]

// Sort state
const sort = ref({ column: 'severity', direction: 'asc' as 'asc' | 'desc' })

const sortedAlerts = computed(() => {
  if (!alerts.value) return []

  return [...alerts.value].sort((a, b) => {
    const dir = sort.value.direction === 'asc' ? 1 : -1

    if (sort.value.column === 'severity') {
      return dir * (SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    }
    if (sort.value.column === 'ageDays') {
      return dir * (a.ageDays - b.ageDays)
    }
    if (sort.value.column === 'package') {
      return dir * a.package.localeCompare(b.package)
    }
    return 0
  })
})
</script>

<template>
  <UDashboardPanel id="security">
    <template #header>
      <UDashboardNavbar title="Sécurité">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-2">
            <UButton
              :to="dependabotUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="neutral"
              variant="outline"
              icon="i-lucide-external-link"
            >
              Ouvrir dans GitHub
            </UButton>
            <CommonPeriodSelector />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <template v-if="summaryPending">
            <USkeleton v-for="i in 4" :key="i" class="h-24" />
          </template>
          <template v-else>
            <UCard v-for="card in summaryCards" :key="card.severity" :ui="{ body: { padding: 'p-4' } }">
              <div class="text-center">
                <p class="text-sm text-[var(--ui-text-muted)]">
                  {{ card.label }}
                </p>
                <p class="text-3xl font-bold mt-1">
                  {{ card.value }}
                </p>
                <UBadge
                  v-if="card.value > 0"
                  :color="card.color"
                  variant="subtle"
                  size="xs"
                  class="mt-2"
                >
                  {{ card.value }} ouverte{{ card.value > 1 ? 's' : '' }}
                </UBadge>
                <!-- M/M-1 Delta -->
                <div v-if="getComparisonForSeverity(card.severity)" class="mt-2">
                  <CommonDeltaBadge
                    :current="getComparisonForSeverity(card.severity)?.currentValue ?? null"
                    :previous="getComparisonForSeverity(card.severity)?.previousValue ?? null"
                    :metric-name="`vuln_${card.severity}`"
                    unit="count"
                    :show-absolute="true"
                    :show-percent="false"
                  />
                </div>
              </div>
            </UCard>
          </template>
        </div>

        <!-- Total and oldest alert info -->
        <div v-if="summary && summary.total > 0" class="flex flex-wrap gap-4">
          <UAlert
            icon="i-lucide-alert-triangle"
            :color="summary.critical > 0 ? 'error' : summary.high > 0 ? 'warning' : 'info'"
          >
            <template #title>
              {{ summary.total }} vulnérabilité{{ summary.total > 1 ? 's' : '' }} ouverte{{ summary.total > 1 ? 's' : '' }}
            </template>
            <template v-if="summary.oldestAlert" #description>
              La plus ancienne ({{ summary.oldestAlert.package }}) date de {{ formatAge(summary.oldestAlert.ageDays) }}
            </template>
          </UAlert>
        </div>

        <!-- Charts -->
        <div>
          <h2 class="text-lg font-semibold mb-4">
            Évolution des vulnérabilités
          </h2>
          <MetricsSecurityChart height="300px" />
        </div>

        <!-- Alerts Table -->
        <div>
          <h2 class="text-lg font-semibold mb-4">
            Détail des alertes ouvertes
          </h2>

          <USkeleton v-if="alertsPending" class="h-64" />

          <div v-else-if="!alerts?.length" class="flex flex-col items-center justify-center py-8 text-center">
            <UIcon name="i-lucide-check-circle" class="size-10 text-green-500" />
            <p class="mt-3 text-sm">
              Aucune alerte ouverte
            </p>
          </div>

          <UTable
            v-else
            :rows="sortedAlerts"
            :columns="columns"
            :sort="sort"
            :ui="{
              td: { base: 'py-3' }
            }"
            @update:sort="sort = $event"
          >
            <template #severity-data="{ row }">
              <UBadge
                :color="getSeverityBadgeColor(row.severity)"
                variant="subtle"
                size="sm"
              >
                {{ row.severity }}
              </UBadge>
            </template>

            <template #package-data="{ row }">
              <span class="font-mono text-sm">{{ row.package }}</span>
            </template>

            <template #ageDays-data="{ row }">
              <span :class="{ 'text-red-500 font-medium': row.ageDays > 30 }">
                {{ formatAge(row.ageDays) }}
              </span>
            </template>

            <template #number-data="{ row }">
              <span class="text-[var(--ui-text-muted)]">#{{ row.number }}</span>
            </template>
          </UTable>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
