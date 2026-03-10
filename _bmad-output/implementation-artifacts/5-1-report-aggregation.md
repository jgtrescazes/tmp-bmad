# Story 5.1: Agrégation des Données du Rapport

Status: done

## Story

As a **système**,
I want **agréger les données mensuelles de tous les axes pour le rapport**,
So that **le rapport dispose de toutes les comparaisons et métriques nécessaires**.

## Acceptance Criteria

1. **Given** données pour M et M-1 **When** `useReport` est invoqué **Then** données agrégées retournées : valeur M, valeur M-1, delta, top problèmes par axe
2. **Given** déploiements du mois **Then** ils sont inclus dans l'agrégation
3. **Given** anomalies détectées **Then** elles sont incluses

## Tasks / Subtasks

- [x] Task 1: Composable useReport (AC: #1, #2, #3)
  - [x] 1.1 Créer `app/composables/useReport.ts`
  - [x] 1.2 Agréger `metrics_monthly` pour la période sélectionnée via PostgREST
  - [x] 1.3 Calculer les deltas M/M-1 par axe et par métrique
  - [x] 1.4 Identifier les top problèmes (anomalies les plus sévères par axe)
  - [x] 1.5 Inclure les déploiements significatifs du mois via `deployments` table
- [x] Task 2: Types du rapport (AC: #1)
  - [x] 2.1 Définir `ReportData`, `ReportSection`, `ReportMetric` types dans `app/types/`
  - [x] 2.2 Structure par axe avec métriques, deltas, anomalies
- [x] Task 3: Tests (AC: #1, #2, #3)
  - [x] 3.1 Tests `useReport` (agrégation correcte, deltas calculés, top problèmes identifiés)
  - [x] 3.2 Tests avec données manquantes (M-1 absent, aucun déploiement, aucune anomalie)

## Dev Notes

### Types du rapport

```typescript
interface ReportMetric {
  name: string
  displayName: string
  currentValue: number
  previousValue: number | null
  delta: number | null // pourcentage de variation
  unit: string
}

interface ReportSection {
  axis: 'stability' | 'performance' | 'security' | 'quality'
  displayName: string
  metrics: ReportMetric[]
  anomalies: Anomaly[]
  topProblems: Anomaly[] // top 3 par sévérité
}

interface ReportDeployment {
  sha: string
  shortSha: string
  message: string
  author: string
  prNumber: number | null
  deployedAt: string
}

interface ReportData {
  period: string // ex: "2026-02"
  previousPeriod: string // ex: "2026-01"
  repositoryName: string
  generatedAt: string // ISO 8601
  sections: ReportSection[]
  deployments: ReportDeployment[]
  totalAnomalies: number
}
```

### Requêtes PostgREST

```typescript
// Métriques mensuelles M
const currentMetrics = await supabase
  .from('metrics_monthly')
  .select('*, dim_metric_types(*), dim_sources(*)')
  .eq('repository_id', repoId)
  .eq('period_start', currentPeriodStart)

// Métriques mensuelles M-1
const previousMetrics = await supabase
  .from('metrics_monthly')
  .select('*, dim_metric_types(*), dim_sources(*)')
  .eq('repository_id', repoId)
  .eq('period_start', previousPeriodStart)

// Déploiements du mois
const deployments = await supabase
  .from('deployments')
  .select('*')
  .eq('repository_id', repoId)
  .gte('deployed_at', currentPeriodStart)
  .lt('deployed_at', nextPeriodStart)
  .order('deployed_at', { ascending: false })
```

### Dépendances composables

- `useAnomalies` (Story 4.1 + 4.2) — anomalies détectées
- `useDeployments` — déploiements du mois (si existant, sinon query directe)
- `usePeriod` — période sélectionnée (M et M-1)

### Calcul des deltas

```typescript
const delta = previousValue !== null
  ? ((currentValue - previousValue) / previousValue) * 100
  : null
```

### Anti-patterns to AVOID

- **DO NOT** utiliser `$fetch` — utiliser `useAsyncData` avec le client Supabase
- **DO NOT** muter le résultat de `useAsyncData` — utiliser `refresh()`
- **DO NOT** dupliquer la logique d'anomalies — réutiliser `useAnomalies`
- **DO NOT** utiliser `undefined` pour les valeurs manquantes — utiliser `null` explicitement

### References

- [Source: epics.md#Story 5.1] — Acceptance criteria
- [Source: prd.md#FR27] — Comparaison M/M-1
- [Source: prd.md#FR28] — Top problèmes
- [Source: architecture.md#Data Architecture] — metrics_monthly, PostgREST pattern
- [Source: architecture.md#API Pattern] — Read via Supabase client / PostgREST

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Fixed timezone issue in getMonthStart/getMonthEnd using UTC

### Completion Notes List
- Created `app/types/report.ts` with ReportData, ReportSection, ReportMetric, ReportDeployment types
- Created `app/composables/useReport.ts` with useReport and useReportSummary composables
- Implemented M/M-1 delta calculation with proper null handling
- Implemented top problems extraction by severity (critical > warning > info)
- Implemented trend detection (improving/degrading/stable)
- Created comprehensive test suite with 35 tests covering all edge cases

### Change Log
- 2026-03-10: Code review fixes - changed cacheKey to function, removed unused rawMetrics query
- 2026-03-10: Initial implementation of report aggregation (Story 5.1)

### File List
- app/types/report.ts (new)
- app/composables/useReport.ts (new)
- tests/unit/composables/useReport.test.ts (new)
