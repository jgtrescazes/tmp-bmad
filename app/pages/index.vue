<script setup lang="ts">
const { period } = usePeriod()

// Fetch summary for each axis
const { data: stabilitySummary, pending: stabilityPending } = useMetricsSummary('stability', period)
const { data: performanceSummary, pending: performancePending } = useMetricsSummary('performance', period)
const { data: securitySummary, pending: securityPending } = useMetricsSummary('security', period)
const { data: qualitySummary, pending: qualityPending } = useMetricsSummary('quality', period)

// Axis configuration
const axes = [
  {
    name: 'stability' as const,
    label: 'Stabilité',
    icon: 'i-lucide-shield-check',
    route: '/stability',
    summary: stabilitySummary,
    pending: stabilityPending,
    primaryMetric: 'new_errors'
  },
  {
    name: 'performance' as const,
    label: 'Performance',
    icon: 'i-lucide-zap',
    route: '/performance',
    summary: performanceSummary,
    pending: performancePending,
    primaryMetric: 'lcp'
  },
  {
    name: 'security' as const,
    label: 'Sécurité',
    icon: 'i-lucide-lock',
    route: '/security',
    summary: securitySummary,
    pending: securityPending,
    primaryMetric: 'vuln_critical'
  },
  {
    name: 'quality' as const,
    label: 'Qualité',
    icon: 'i-lucide-check-circle',
    route: '/quality',
    summary: qualitySummary,
    pending: qualityPending,
    primaryMetric: 'coverage_lines'
  }
]

function getPrimaryMetric(axis: typeof axes[number]) {
  if (!axis.summary?.length) return null
  return axis.summary.find(m => m.label.toLowerCase().includes(axis.primaryMetric.split('_')[0]))
    || axis.summary[0]
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Vue d'ensemble">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <CommonPeriodSelector />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Investigate Banner (FR19) -->
        <AnomaliesInvestigateBanner />

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <NuxtLink
            v-for="axis in axes"
            :key="axis.name"
            :to="axis.route"
            class="block transition-transform hover:scale-[1.02]"
          >
            <MetricsMetricCard
              :axis="axis.name"
              :title="axis.label"
              :icon="axis.icon"
              :value="getPrimaryMetric(axis)?.currentValue ?? null"
              :previous-value="getPrimaryMetric(axis)?.previousValue"
              :unit="getPrimaryMetric(axis)?.unit"
              :metric-name="axis.primaryMetric"
              :loading="axis.pending"
            />
          </NuxtLink>
        </div>

        <!-- Quick overview sections -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Stability Chart -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-shield-check" class="size-5 text-blue-500" />
                  <span class="font-semibold">Stabilité</span>
                </div>
                <NuxtLink to="/stability" class="text-sm text-[var(--ui-primary)] hover:underline">
                  Voir détails
                </NuxtLink>
              </div>
            </template>

            <MetricsStabilityChart :height="'250px'" />
          </UCard>

          <!-- Performance Summary -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-zap" class="size-5 text-green-500" />
                  <span class="font-semibold">Performance</span>
                </div>
                <NuxtLink to="/performance" class="text-sm text-[var(--ui-primary)] hover:underline">
                  Voir détails
                </NuxtLink>
              </div>
            </template>

            <MetricsPerformanceSummary />
          </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Security Summary -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-lock" class="size-5 text-amber-500" />
                  <span class="font-semibold">Sécurité</span>
                </div>
                <NuxtLink to="/security" class="text-sm text-[var(--ui-primary)] hover:underline">
                  Voir détails
                </NuxtLink>
              </div>
            </template>

            <MetricsSecuritySummary />
          </UCard>

          <!-- Quality Summary -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="size-5 text-purple-500" />
                  <span class="font-semibold">Qualité</span>
                </div>
                <NuxtLink to="/quality" class="text-sm text-[var(--ui-primary)] hover:underline">
                  Voir détails
                </NuxtLink>
              </div>
            </template>

            <MetricsQualitySummary />
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
