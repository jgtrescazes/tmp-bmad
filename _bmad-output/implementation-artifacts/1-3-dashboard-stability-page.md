# Story 1.3: Dashboard Layout & Page Stabilite

Status: complete

## Story

As a **Tech Lead**,
I want **visualiser les metriques de stabilite Sentry sur un dashboard en dark mode**,
So that **je peux surveiller la sante de la plateforme en un coup d'oeil**.

## Acceptance Criteria

1. **Given** des donnees Sentry existent en base **When** j'ouvre Watchtower **Then** le dashboard s'affiche en dark mode en moins de 3 secondes (NFR1, FR14)
2. **Given** je suis sur la page d'accueil **When** je regarde la section Stabilite **Then** je vois un resume avec les metriques Sentry cles
3. **Given** je suis sur /stability **When** je consulte la page **Then** je vois les graphes ECharts time-series avec nouvelles erreurs, resolues, taux d'erreurs, temps moyen (FR22)
4. **Given** les 3 autres axes n'ont pas de donnees **When** je les consulte **Then** ils affichent un empty state

## Tasks / Subtasks

- [x] Task 1: Installer et configurer Apache ECharts (AC: #1, #3)
  - [x] 1.1 Installer `nuxt-echarts` et `echarts` via pnpm
  - [x] 1.2 Configurer le module dans nuxt.config.ts
  - [x] 1.3 Creer `app/utils/chartConfig.ts` — theme ECharts dark/light, couleurs Watchtower
- [x] Task 2: Creer les composables de donnees (AC: #1, #2, #3)
  - [x] 2.1 Creer `app/composables/useMetrics.ts` — fetch metrics depuis PostgREST via Supabase client
  - [x] 2.2 Creer `app/composables/usePeriod.ts` — gestion periode selectionnee (useState)
- [x] Task 3: Creer le composant MetricChart (AC: #3)
  - [x] 3.1 Creer `app/components/metrics/MetricChart.client.vue` — wrapper ECharts reutilisable (time-series)
  - [x] 3.2 Support dark/light mode via useColorMode
  - [x] 3.3 Props: option, height, loading, autoresize
- [x] Task 4: Implementer la page dashboard (index.vue) (AC: #1, #2, #4)
  - [x] 4.1 Ajouter les summary cards (4 axes) avec MetricCard + icones
  - [x] 4.2 Section Stabilite avec StabilityChart integre
  - [x] 4.3 Sections Performance/Securite/Qualite avec empty states
  - [x] 4.4 Ajouter PeriodSelector dans le header
- [x] Task 5: Implementer la page Stabilite (/stability) (AC: #3)
  - [x] 5.1 Graphes ECharts pour chaque metrique Sentry (4 graphes + vue combinee)
  - [x] 5.2 Tableau UTable avec les metriques detaillees
  - [x] 5.3 Loading states avec USkeleton
- [x] Task 6: Tests (AC: #1, #2, #3)
  - [x] 6.1 Tests composable useMetrics (grouping, summary calculations)
  - [x] 6.2 Tests composable usePeriod (presets, formatting)
  - [x] 6.3 Tests utils chartConfig (themes, option builders)

## Dev Notes

### nuxt-echarts Configuration

```bash
pnpm add nuxt-echarts echarts
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/supabase', 'nuxt-echarts'],
  echarts: {
    renderer: 'canvas',
    charts: ['LineChart', 'BarChart'],
    components: ['GridComponent', 'TooltipComponent', 'LegendComponent', 'DataZoomComponent'],
  },
})
```

**SSR Important :** ECharts ne supporte pas le SSR. Le composant MetricChart doit etre rendu cote client uniquement. Deux options :
1. Nommer le fichier `MetricChart.client.vue` (convention Nuxt)
2. Wrapper dans `<ClientOnly>` avec un fallback USkeleton

Option recommandee : `MetricChart.client.vue` pour la simplicite.

### ECharts Option Structure (Time-Series)

```typescript
// app/utils/chartConfig.ts
import type { EChartsOption } from 'echarts'

export function createTimeSeriesOption(
  data: { date: string; value: number }[],
  title: string,
  unit: string,
  type: 'line' | 'bar' = 'line'
): EChartsOption {
  return {
    title: { text: title, left: 'center' },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => `${params[0].axisValue}<br/>${params[0].value} ${unit}`,
    },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: '{MM}-{dd} {HH}:{mm}' },
    },
    yAxis: {
      type: 'value',
      name: unit,
    },
    series: [{
      type,
      data: data.map(d => [d.date, d.value]),
      smooth: true,
      areaStyle: type === 'line' ? { opacity: 0.15 } : undefined,
    }],
    dataZoom: [{ type: 'inside' }],
  }
}
```

### Dark Mode Chart Theming

```typescript
// app/utils/chartConfig.ts
export const watchtowerDarkTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#e5e7eb' },
  title: { textStyle: { color: '#f3f4f6' } },
  legend: { textStyle: { color: '#d1d5db' } },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#374151' } },
    axisLabel: { color: '#9ca3af' },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#374151' } },
    splitLine: { lineStyle: { color: '#1f2937' } },
    axisLabel: { color: '#9ca3af' },
  },
  color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
}

export const watchtowerLightTheme = {
  backgroundColor: 'transparent',
  color: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'],
}
```

Le composant MetricChart doit ecouter `useColorMode()` et basculer le theme ECharts dynamiquement :
```typescript
const colorMode = useColorMode()
watch(() => colorMode.value, (mode) => {
  // Re-register theme and refresh chart
})
```

### PostgREST Query Patterns via @nuxtjs/supabase

```typescript
// app/composables/useMetrics.ts
export function useMetrics(axis: string, period: Ref<{ from: string; to: string }>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `metrics-${axis}-${period.value.from}-${period.value.to}`,
    async () => {
      const { data, error } = await supabase
        .from('metrics_daily')
        .select(`
          value_avg,
          value_min,
          value_max,
          period_start,
          dim_metric_types!inner(name, display_name, unit),
          dim_sources!inner(name)
        `)
        .eq('dim_metric_types.axis', axis)
        .gte('period_start', period.value.from)
        .lte('period_start', period.value.to)
        .order('period_start', { ascending: true })

      if (error) throw error
      return data
    },
    { watch: [period] }
  )
}
```

**IMPORTANT :** Toujours utiliser `useAsyncData` ou `useFetch`, JAMAIS `$fetch` ou `onMounted` + fetch.

### usePeriod Composable

```typescript
// app/composables/usePeriod.ts
export function usePeriod() {
  const period = useState<{ from: string; to: string }>('selected-period', () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    }
  })

  function setPeriod(from: string, to: string) {
    period.value = { from, to }
  }

  return { period, setPeriod }
}
```

### Loading & Error States

```vue
<!-- Pattern pour chaque section avec donnees -->
<template>
  <USkeleton v-if="pending" class="h-64 w-full" />
  <UAlert v-else-if="error" color="red" :title="error.message" icon="i-lucide-alert-triangle" />
  <MetricChart v-else :data="data" title="Nouvelles erreurs" unit="count" />
</template>

<script setup lang="ts">
const { period } = usePeriod()
const { data, pending, error } = useMetrics('stability', period)
</script>
```

Utiliser `USkeleton` pour les loading states (pas de spinner custom) et `UAlert` pour les erreurs.

### Summary Cards Pattern (index.vue)

```vue
<UCard v-for="axis in axes" :key="axis.name">
  <template #header>
    <div class="flex items-center gap-2">
      <UIcon :name="axis.icon" class="size-5" />
      <span class="font-semibold">{{ axis.label }}</span>
    </div>
  </template>
  <!-- Metric summary or empty state -->
</UCard>
```

Axes config :
```typescript
const axes = [
  { name: 'stability', label: 'Stabilite', icon: 'i-lucide-shield-check', color: 'blue' },
  { name: 'performance', label: 'Performance', icon: 'i-lucide-zap', color: 'green' },
  { name: 'security', label: 'Securite', icon: 'i-lucide-lock', color: 'amber' },
  { name: 'quality', label: 'Qualite', icon: 'i-lucide-check-circle', color: 'purple' },
]
```

### Anti-patterns a EVITER

- **NE PAS** utiliser `$fetch` ou `onMounted` fetch — toujours `useAsyncData`/`useFetch`
- **NE PAS** creer de state de loading custom — utiliser `pending` de `useAsyncData` + `USkeleton`
- **NE PAS** muter directement le resultat de `useAsyncData` — utiliser `refresh()`
- **NE PAS** ajouter Pinia — `useState` suffit pour le state partage (periode, repo)
- **NE PAS** utiliser `any` — typer avec les types Supabase generes
- **NE PAS** oublier le `.client.vue` ou `<ClientOnly>` pour ECharts (pas de SSR)

### References

- [Source: architecture.md#API Pattern] — Read path via PostgREST, useAsyncData
- [Source: architecture.md#State Management] — useState, pas de Pinia
- [Source: prd.md#FR14] — Dark mode natif
- [Source: prd.md#FR22] — Graphes time-series ECharts
- [Source: prd.md#NFR1] — Temps de chargement < 3s
- [Source: ux-design-specification.md#Dashboard] — Layout, cards, sections par axe
- [Source: ux-design-specification.md#Component Strategy] — Nuxt UI first, dark mode
- [Source: epics.md#Story 1.3] — Acceptance criteria
- [Source: research/echarts-integration.md] — nuxt-echarts config, SSR handling, theming

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- MetricChart uses .client.vue suffix for client-only rendering (ECharts no SSR)
- vue-echarts registered via use() with specific chart/component imports for tree-shaking

### Completion Notes List

- Installed nuxt-echarts + echarts v6.0
- Created chartConfig with dark/light themes and time-series option builders
- Created useMetrics composable with grouping and summary calculations
- Created usePeriod composable with presets (7d, 30d, this-month, last-month, 3m)
- Created MetricChart.client.vue with theme switching
- Created MetricCard.vue with delta/trend visualization
- Created PeriodSelector.vue dropdown
- Created StabilityChart.vue wrapper
- Updated index.vue with summary cards and charts
- Updated stability.vue with 4 individual charts + combined view + data table
- 92 tests passing

### Change Log

- 2026-03-09: Story 1.3 implemented (all 6 tasks)
- 2026-03-09: Code Review — Minor ESLint fixes applied

### Senior Developer Review (AI)

**Reviewed by:** Amelia (Dev Agent) on 2026-03-09
**Outcome:** APPROVED

**Issues Found & Fixed:**
1. [LOW] Unused props variable in StabilityChart.vue → Destructured props
2. [LOW] Unused index parameter in chartConfig.ts → Prefixed with underscore

**All ACs satisfied:**
- AC #1: Dashboard dark mode < 3s ✅
- AC #2: Section Stabilité avec résumé ✅
- AC #3: Graphes ECharts time-series ✅
- AC #4: Empty states pour autres axes ✅

### File List

- nuxt.config.ts (modified — added nuxt-echarts module)
- package.json (modified — added echarts deps)
- app/utils/chartConfig.ts (new)
- app/composables/usePeriod.ts (new)
- app/composables/useMetrics.ts (new)
- app/components/metrics/MetricChart.client.vue (new)
- app/components/metrics/MetricCard.vue (new)
- app/components/metrics/StabilityChart.vue (new)
- app/components/common/PeriodSelector.vue (new)
- app/pages/index.vue (modified)
- app/pages/stability.vue (modified)
- tests/unit/composables/usePeriod.test.ts (new)
- tests/unit/composables/useMetrics.test.ts (new)
- tests/unit/utils/chartConfig.test.ts (new)
