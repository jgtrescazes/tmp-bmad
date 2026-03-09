# Story 4.1: Moteur d'Anomalies — Seuils & Deltas

Status: ready-for-dev

## Story

As a **système**,
I want **détecter automatiquement les dépassements de seuils Google CWV et les deltas significatifs M/M-1**,
So that **les anomalies sont identifiées sans intervention humaine**.

## Acceptance Criteria

1. **Given** données performance existent **When** le moteur s'exécute **Then** les dépassements seuils absolus Google sont détectés: LCP>2.5s, INP>200ms, CLS>0.1 (FR15)
2. **Given** données M et M-1 **When** le moteur s'exécute **Then** les deltas significatifs (>10% configurable) sont détectés (FR16)
3. **Given** une anomalie détectée **Then** elle est typée: threshold ou delta

## Tasks / Subtasks

- [ ] Task 1: Créer le moteur d'anomalies (AC: #1, #3)
  - [ ] 1.1 Créer `app/utils/anomalyEngine.ts` — fonctions pures de détection
  - [ ] 1.2 Implémenter `detectThresholdAnomalies(metrics)` — seuils absolus CWV
  - [ ] 1.3 Implémenter `detectDeltaAnomalies(current, previous, threshold=0.1)` — deltas M/M-1
  - [ ] 1.4 Définir types `Anomaly { type, source, metric, currentValue, expectedValue, severity }`
- [ ] Task 2: Composable useAnomalies (AC: #1, #2, #3)
  - [ ] 2.1 Créer `app/composables/useAnomalies.ts` — orchestrer le moteur avec les données
  - [ ] 2.2 Combiner threshold + delta anomalies
  - [ ] 2.3 Trier par sévérité (critical > warning > info)
- [ ] Task 3: Tests (TDD) (AC: #1, #2, #3)
  - [ ] 3.1 Tests `detectThresholdAnomalies` (above/below/edge cases)
  - [ ] 3.2 Tests `detectDeltaAnomalies` (significant/insignificant/no previous data)
  - [ ] 3.3 Tests `useAnomalies` (combination, sorting)

## Dev Notes

### CWV Thresholds (seuils absolus Google)

| Metric | Seuil | Unité |
|--------|-------|-------|
| LCP | 2500 | ms |
| INP | 200 | ms |
| CLS | 0.1 | ratio |

### Severity Mapping

- `threshold exceeded` → `critical`
- `delta > 20%` → `warning`
- `delta > 10%` → `info`

### Architecture

- `anomalyEngine.ts` contient uniquement des fonctions pures (pas d'accès DB, pas de side effects) pour maximiser la testabilité
- `useAnomalies.ts` orchestre le moteur avec les données provenant de `useAsyncData` / PostgREST
- Le seuil delta (10% par défaut) est configurable via paramètre

### Types

```typescript
type AnomalyType = 'threshold' | 'delta'
type AnomalySeverity = 'critical' | 'warning' | 'info'

interface Anomaly {
  type: AnomalyType
  source: string
  metric: string
  currentValue: number
  expectedValue: number
  severity: AnomalySeverity
}
```

### Anti-patterns to AVOID

- **DO NOT** fetch data inside `anomalyEngine.ts` — fonctions pures uniquement
- **DO NOT** use `any` type — typer tous les paramètres et retours
- **DO NOT** hardcode thresholds sans export — les rendre configurables/exportées comme constantes `UPPER_SNAKE_CASE`

### References

- [Source: epics.md#Story 4.1] — Acceptance criteria, FR15, FR16
- [Source: architecture.md#Implementation Patterns] — Naming conventions, composables pattern
- [Source: prd.md#FR15] — Seuils absolus CWV Google
- [Source: prd.md#FR16] — Deltas significatifs M/M-1

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
