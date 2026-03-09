# Story 1.3: Dashboard Layout & Page Stabilite

Status: ready-for-dev

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

- [ ] Task 1: Installer et configurer Apache ECharts (AC: #1, #3)
  - [ ] 1.1 Installer `nuxt-echarts` et `echarts` via pnpm
  - [ ] 1.2 Configurer le module dans nuxt.config.ts
  - [ ] 1.3 Creer `app/utils/chartConfig.ts` — theme ECharts dark/light, couleurs Watchtower
- [ ] Task 2: Creer les composables de donnees (AC: #1, #2, #3)
  - [ ] 2.1 Creer `app/composables/useMetrics.ts` — fetch metrics depuis PostgREST via Supabase client
  - [ ] 2.2 Creer `app/composables/usePeriod.ts` — gestion periode selectionnee (useState)
- [ ] Task 3: Creer le composant MetricChart (AC: #3)
  - [ ] 3.1 Creer `app/components/metrics/MetricChart.vue` — wrapper ECharts reutilisable (time-series)
  - [ ] 3.2 Support dark/light mode via useColorMode
  - [ ] 3.3 Props: data, title, unit, type (line/bar)
- [ ] Task 4: Implementer la page dashboard (index.vue) (AC: #1, #2, #4)
  - [ ] 4.1 Ajouter les summary cards (4 axes) avec UCard + icones
  - [ ] 4.2 Section Stabilite avec graphe integre
  - [ ] 4.3 Sections Performance/Securite/Qualite avec empty states
  - [ ] 4.4 Ajouter le header avec time range placeholder
- [ ] Task 5: Implementer la page Stabilite (/stability) (AC: #3)
  - [ ] 5.1 Graphes ECharts pour chaque metrique Sentry (4 graphes)
  - [ ] 5.2 Tableau UTable avec les metriques detaillees
  - [ ] 5.3 Loading states avec USkeleton
- [ ] Task 6: Tests (AC: #1, #2, #3)
  - [ ] 6.1 Tests composable useMetrics (mock Supabase client)
  - [ ] 6.2 Tests composable usePeriod
  - [ ] 6.3 Tests composant MetricChart (rendu, props)

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

(none yet)

### Debug Log References

(none yet)

### Completion Notes List

(none yet)

### Change Log

(none yet)

### File List

(none yet)
