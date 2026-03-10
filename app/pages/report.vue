<script setup lang="ts">
import { useCurrentMonthReport, useReportSummary } from '~/composables/useReport'
import { useRepository } from '~/composables/useRepository'
import {
  generateMarkdownReport,
  generateReportFilename,
  downloadMarkdown
} from '~/utils/reportGenerator'
import type { ReportTrend } from '~/types/report'

// Repository selection
const { currentRepoId, init } = useRepository()

// Initialize repository on mount
await init()

// Report data
const { data: reportData, pending, error, refresh, year, month, setMonth } = useCurrentMonthReport(currentRepoId)
const summary = useReportSummary(reportData)

// Toast for export confirmation
const toast = useToast()

// Month selection options (last 12 months)
const monthOptions = computed(() => {
  const options: Array<{ label: string, value: { year: number, month: number } }> = []
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric'
    }).format(date)

    options.push({
      label,
      value: { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  return options
})

// Current selection
const selectedMonth = computed({
  get: () => {
    return monthOptions.value.find(
      opt => opt.value.year === year.value && opt.value.month === month.value
    ) || monthOptions.value[0]
  },
  set: (option) => {
    if (option) {
      setMonth(option.value.year, option.value.month)
    }
  }
})

// Export handler
const isExporting = ref(false)

async function handleExport() {
  if (!reportData.value) return

  isExporting.value = true

  try {
    const markdown = generateMarkdownReport(reportData.value)
    const filename = generateReportFilename(reportData.value)

    downloadMarkdown(markdown, filename)

    toast.add({
      title: 'Export reussi',
      description: `Le rapport ${filename} a ete telecharge.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (err) {
    console.error('Export failed:', err)
    toast.add({
      title: 'Erreur d\'export',
      description: 'Une erreur est survenue lors de la generation du rapport.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isExporting.value = false
  }
}

// Trend display helpers
function getTrendEmoji(trend: ReportTrend): string {
  switch (trend) {
    case 'improving':
      return '📈'
    case 'degrading':
      return '📉'
    case 'stable':
      return '➡️'
  }
}

function getTrendLabel(trend: ReportTrend): string {
  switch (trend) {
    case 'improving':
      return 'Amelioration'
    case 'degrading':
      return 'Degradation'
    case 'stable':
      return 'Stable'
  }
}

function getTrendColor(trend: ReportTrend): 'success' | 'error' | 'neutral' {
  switch (trend) {
    case 'improving':
      return 'success'
    case 'degrading':
      return 'error'
    case 'stable':
      return 'neutral'
  }
}

// Format delta with sign
function formatDelta(delta: number | null): string {
  if (delta === null) return 'N/A'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}%`
}

// Format value with unit
function formatValue(value: number, unit: string): string {
  if (unit === 'ms') return `${value.toFixed(0)} ms`
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'ratio') return value.toFixed(3)
  if (Number.isInteger(value)) return `${value}${unit ? ` ${unit}` : ''}`
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`
}

// Format date for display
function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium'
  }).format(new Date(isoString))
}

// Severity colors
function getSeverityColor(severity: 'critical' | 'warning' | 'info'): 'error' | 'warning' | 'info' {
  switch (severity) {
    case 'critical':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
  }
}
</script>

<template>
  <UDashboardPanel id="report">
    <template #header>
      <UDashboardNavbar title="Rapport mensuel">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-3">
            <!-- Month selector -->
            <USelectMenu
              v-model="selectedMonth"
              :options="monthOptions"
              option-attribute="label"
              class="w-48"
            />

            <!-- Refresh button -->
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-refresh-cw"
              :loading="pending"
              @click="refresh()"
            >
              Actualiser
            </UButton>

            <!-- Export button -->
            <UButton
              color="primary"
              icon="i-lucide-download"
              :loading="isExporting"
              :disabled="!reportData || pending"
              @click="handleExport"
            >
              Exporter Rapport
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Loading state -->
        <div v-if="pending" class="space-y-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <USkeleton v-for="i in 4" :key="i" class="h-28" />
          </div>
          <USkeleton class="h-64 w-full" />
        </div>

        <!-- Error state -->
        <UAlert
          v-else-if="error"
          color="red"
          title="Erreur de chargement"
          :description="error.message"
          icon="i-lucide-alert-triangle"
        />

        <!-- Report content -->
        <template v-else-if="reportData">
          <!-- Executive Summary -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-lg font-semibold">Resume Executif</span>
                <UBadge v-if="summary" :color="getTrendColor(summary.trend)" variant="subtle">
                  {{ getTrendEmoji(summary.trend) }} {{ getTrendLabel(summary.trend) }}
                </UBadge>
              </div>
            </template>

            <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <!-- Total anomalies -->
              <div class="flex flex-col gap-1">
                <span class="text-sm text-[var(--ui-text-muted)]">Anomalies</span>
                <span class="text-3xl font-bold">{{ summary.totalAnomalies }}</span>
                <div class="flex gap-2 text-sm">
                  <span v-if="summary.criticalCount" class="text-red-500">{{ summary.criticalCount }} critiques</span>
                  <span v-if="summary.warningCount" class="text-yellow-500">{{ summary.warningCount }} avert.</span>
                </div>
              </div>

              <!-- Deployments -->
              <div class="flex flex-col gap-1">
                <span class="text-sm text-[var(--ui-text-muted)]">Deploiements</span>
                <span class="text-3xl font-bold">{{ summary.deploymentCount }}</span>
              </div>

              <!-- Period -->
              <div class="flex flex-col gap-1">
                <span class="text-sm text-[var(--ui-text-muted)]">Periode</span>
                <span class="text-lg font-semibold">{{ reportData.period }}</span>
                <span class="text-sm text-[var(--ui-text-muted)]">vs {{ reportData.previousPeriod }}</span>
              </div>

              <!-- Repository -->
              <div class="flex flex-col gap-1">
                <span class="text-sm text-[var(--ui-text-muted)]">Repository</span>
                <span class="text-lg font-semibold">{{ reportData.repositoryName }}</span>
              </div>
            </div>
          </UCard>

          <!-- Sections by axis -->
          <div class="space-y-4">
            <UCard v-for="section in reportData.sections" :key="section.axis">
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="font-semibold">{{ section.displayName }}</span>
                  <UBadge v-if="section.anomalies.length" color="warning" variant="subtle">
                    {{ section.anomalies.length }} anomalie(s)
                  </UBadge>
                </div>
              </template>

              <!-- Metrics table -->
              <UTable
                v-if="section.metrics.length"
                :rows="section.metrics.map(m => ({
                  name: m.displayName,
                  current: formatValue(m.currentValue, m.unit),
                  previous: m.previousValue !== null ? formatValue(m.previousValue, m.unit) : 'N/A',
                  delta: formatDelta(m.delta)
                }))"
                :columns="[
                  { key: 'name', label: 'Metrique' },
                  { key: 'current', label: `M (${reportData.period})` },
                  { key: 'previous', label: `M-1 (${reportData.previousPeriod})` },
                  { key: 'delta', label: 'Delta' }
                ]"
              />

              <p v-else class="text-[var(--ui-text-muted)] text-center py-4">
                Aucune metrique disponible
              </p>

              <!-- Top problems -->
              <div v-if="section.topProblems.length" class="mt-4 pt-4 border-t border-[var(--ui-border)]">
                <p class="text-sm font-medium mb-2">
                  Top problemes
                </p>
                <div class="space-y-2">
                  <div
                    v-for="(problem, index) in section.topProblems"
                    :key="index"
                    class="flex items-center gap-2"
                  >
                    <UBadge :color="getSeverityColor(problem.severity)" variant="subtle" size="xs">
                      {{ problem.severity }}
                    </UBadge>
                    <span class="text-sm">
                      <strong>{{ problem.metric }}</strong>
                      <span class="text-[var(--ui-text-muted)]">
                        — {{ problem.currentValue }} (attendu: {{ problem.expectedValue }})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Deployments -->
          <UCard>
            <template #header>
              <span class="font-semibold">Deploiements du mois</span>
            </template>

            <UTable
              v-if="reportData.deployments.length"
              :rows="reportData.deployments.map(d => ({
                date: formatDate(d.deployedAt),
                sha: d.shortSha,
                author: d.author,
                pr: d.prNumber ? `#${d.prNumber}` : '-',
                message: d.message.length > 50 ? d.message.substring(0, 47) + '...' : d.message
              }))"
              :columns="[
                { key: 'date', label: 'Date' },
                { key: 'sha', label: 'SHA' },
                { key: 'author', label: 'Auteur' },
                { key: 'pr', label: 'PR' },
                { key: 'message', label: 'Message' }
              ]"
            />

            <p v-else class="text-[var(--ui-text-muted)] text-center py-4">
              Aucun deploiement ce mois
            </p>
          </UCard>

          <!-- Footer -->
          <div class="text-center text-sm text-[var(--ui-text-muted)] pt-4">
            <p>
              Rapport genere le {{ new Date(reportData.generatedAt).toLocaleString('fr-FR') }}
              par <strong>Watchtower</strong>
            </p>
          </div>
        </template>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <UIcon name="i-lucide-file-text" class="size-16 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Aucune donnee disponible
          </p>
          <p class="mt-2 text-[var(--ui-text-muted)] max-w-md">
            Aucune donnee n'a ete collectee pour cette periode.
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
