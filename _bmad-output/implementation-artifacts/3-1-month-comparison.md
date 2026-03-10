# Story 3.1: Comparaison M/M-1

Status: done

## Story

As a **Tech Lead**,
I want **comparer les métriques du mois courant avec le mois précédent sur tous les axes**,
So that **je peux identifier les améliorations et dégradations**.

## Acceptance Criteria

1. **Given** des données pour M et M-1 **When** j'ouvre le dashboard **Then** chaque axe affiche un delta visuel (+12%, -5%) avec flèche et couleur sémantique (FR10)
2. **Given** des graphes d'évolution **When** je compare **Then** les deux périodes sont visibles (superposées ou en comparaison)
3. **Given** M-1 n'a pas de données **When** j'ouvre le dashboard **Then** le delta affiche "N/A" avec tooltip explicatif

## Tasks / Subtasks

- [x] Task 1: Composable de comparaison (AC: #1, #3)
  - [x] 1.1 Créer `app/composables/useComparison.ts` — fetch M et M-1 depuis metrics_daily/monthly via PostgREST
  - [x] 1.2 Calculer deltas (pourcentage et absolu) par métrique
  - [x] 1.3 Gérer le cas "pas de données M-1" (retourner `null`)
- [x] Task 2: Composant DeltaBadge (AC: #1, #3)
  - [x] 2.1 Créer `app/components/common/DeltaBadge.vue` — affiche delta avec flèche et couleur
  - [x] 2.2 Couleurs sémantiques : amélioration=vert, dégradation=rouge, stable=neutre
  - [x] 2.3 Inversion logique pour certaines métriques (moins d'erreurs = vert)
- [x] Task 3: Intégrer dans le dashboard (AC: #1, #2)
  - [x] 3.1 Ajouter DeltaBadge sur chaque summary card (`app/pages/index.vue`)
  - [x] 3.2 Ajouter overlay M-1 sur les graphes ECharts (série en pointillés)
  - [x] 3.3 Intégrer dans chaque page d'axe (`stability.vue`, `performance.vue`, `security.vue`, `quality.vue`)
- [x] Task 4: Tests (AC: #1, #2, #3)
  - [x] 4.1 Tests `useComparison` (calcul deltas, cas `null`, métriques inversées)
  - [x] 4.2 Tests `DeltaBadge` (rendu, couleurs, tooltip N/A)

## Dev Notes

### PostgREST query pattern for monthly aggregates

```typescript
const currentMonth = new Date()
const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)

// Fetch current and previous month aggregates
const { data: current } = await supabase
  .from('metrics_monthly')
  .select('*, dim_metric_types(name, axis, unit)')
  .eq('repository_id', repositoryId)
  .eq('period_start', formatDate(currentMonth))

const { data: previous } = await supabase
  .from('metrics_monthly')
  .select('*, dim_metric_types(name, axis, unit)')
  .eq('repository_id', repositoryId)
  .eq('period_start', formatDate(previousMonth))
```

### Delta calculation formula

```typescript
// Percentage delta
const deltaPercent = previous !== 0
  ? ((current - previous) / Math.abs(previous)) * 100
  : null

// Absolute delta
const deltaAbsolute = current - previous
```

### Inverted metrics (lower is better)

Les métriques suivantes sont inversées — une baisse est une amélioration (vert) :
- `error_count`, `error_rate`, `new_errors`
- `vuln_critical`, `vuln_high`, `vuln_medium`, `vuln_low`
- `lcp`, `cls`, `inp`
- `avg_resolution_time`

Stocker la liste dans `app/utils/metricPolarity.ts` :
```typescript
export const INVERTED_METRICS = [
  'new_errors', 'error_rate', 'avg_resolution_time',
  'lcp', 'cls', 'inp',
  'vuln_critical', 'vuln_high', 'vuln_medium', 'vuln_low',
] as const
```

### ECharts dual series overlay pattern

```typescript
// M-1 series rendered as dashed line behind current month
{
  name: 'M-1',
  type: 'line',
  data: previousMonthData,
  lineStyle: { type: 'dashed', opacity: 0.5 },
  itemStyle: { opacity: 0.5 },
  z: 1, // Behind current month series
}
```

### DeltaBadge component props

```typescript
interface DeltaBadgeProps {
  current: number | null
  previous: number | null
  inverted?: boolean   // true for metrics where lower is better
  unit?: string        // 'percent', 'ms', 'count', 'ratio'
  showAbsolute?: boolean
}
```

### References

- [Source: prd.md#FR10] — Comparaison M/M-1 visuelle
- [Source: epics.md#Epic 3] — Stories comparaison
- [Source: architecture.md#Data Architecture] — Star schema rollup tables
- [Source: ux-design-specification.md] — Couleurs sémantiques, delta badges

## Dev Agent Record

### Implementation Summary (2026-03-09)

**Files Created:**
- `app/utils/metricPolarity.ts` - Metric polarity configuration (INVERTED_METRICS list, getDeltaColor, isImprovement)
- `app/composables/useComparison.ts` - M/M-1 comparison composable with useMonthlyComparison and useComparisonChartData
- `app/components/common/DeltaBadge.vue` - Visual delta badge with semantic colors and N/A tooltip
- `tests/unit/utils/metricPolarity.test.ts` - 16 tests for polarity logic
- `tests/unit/composables/useComparison.test.ts` - 12 tests for comparison logic
- `tests/unit/components/DeltaBadge.test.ts` - 37 tests for DeltaBadge logic

**Files Modified:**
- `app/components/metrics/MetricCard.vue` - Added metricName prop for polarity detection
- `app/utils/chartConfig.ts` - Added createComparisonChartOption and createDeploymentMarkLine
- `app/pages/index.vue` - Pass metricName to MetricCard
- `app/pages/stability.vue` - Added M/M-1 summary cards with DeltaBadge
- `app/pages/performance.vue` - Added M/M-1 comparison with DeltaBadge
- `app/pages/security.vue` - Added M/M-1 comparison for vulnerabilities
- `app/pages/quality.vue` - Added M/M-1 comparison for coverage

**Tests:** 297 tests passing

**Decisions:**
- Used metricPolarity.ts to centralize inverted metrics logic (lower is better)
- DeltaBadge shows N/A with tooltip when previous data unavailable
- Chart overlay shifts M-1 dates to align visually with current period
