# Story 3.1: Comparaison M/M-1

Status: ready-for-dev

## Story

As a **Tech Lead**,
I want **comparer les métriques du mois courant avec le mois précédent sur tous les axes**,
So that **je peux identifier les améliorations et dégradations**.

## Acceptance Criteria

1. **Given** des données pour M et M-1 **When** j'ouvre le dashboard **Then** chaque axe affiche un delta visuel (+12%, -5%) avec flèche et couleur sémantique (FR10)
2. **Given** des graphes d'évolution **When** je compare **Then** les deux périodes sont visibles (superposées ou en comparaison)
3. **Given** M-1 n'a pas de données **When** j'ouvre le dashboard **Then** le delta affiche "N/A" avec tooltip explicatif

## Tasks / Subtasks

- [ ] Task 1: Composable de comparaison (AC: #1, #3)
  - [ ] 1.1 Créer `app/composables/useComparison.ts` — fetch M et M-1 depuis metrics_daily/monthly via PostgREST
  - [ ] 1.2 Calculer deltas (pourcentage et absolu) par métrique
  - [ ] 1.3 Gérer le cas "pas de données M-1" (retourner `null`)
- [ ] Task 2: Composant DeltaBadge (AC: #1, #3)
  - [ ] 2.1 Créer `app/components/common/DeltaBadge.vue` — affiche delta avec flèche et couleur
  - [ ] 2.2 Couleurs sémantiques : amélioration=vert, dégradation=rouge, stable=neutre
  - [ ] 2.3 Inversion logique pour certaines métriques (moins d'erreurs = vert)
- [ ] Task 3: Intégrer dans le dashboard (AC: #1, #2)
  - [ ] 3.1 Ajouter DeltaBadge sur chaque summary card (`app/pages/index.vue`)
  - [ ] 3.2 Ajouter overlay M-1 sur les graphes ECharts (série en pointillés)
  - [ ] 3.3 Intégrer dans chaque page d'axe (`stability.vue`, `performance.vue`, `security.vue`, `quality.vue`)
- [ ] Task 4: Tests (AC: #1, #2, #3)
  - [ ] 4.1 Tests `useComparison` (calcul deltas, cas `null`, métriques inversées)
  - [ ] 4.2 Tests `DeltaBadge` (rendu, couleurs, tooltip N/A)

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
