# Story 4.2: Analyse Tendancielle & Score Sévérité

Status: ready-for-dev

## Story

As a **système**,
I want **détecter les tendances de dégradation sur 3 mois et calculer les scores de sévérité**,
So that **les dégradations progressives et vulnérabilités urgentes sont mises en évidence**.

## Acceptance Criteria

1. **Given** données historiques 3+ mois **When** le moteur s'exécute **Then** dégradation continue sur 3 mois = anomalie tendancielle (FR17)
2. **Given** alertes Dependabot **When** le score est calculé **Then** score = âge(jours) × coefficient sévérité (critical=4, high=3, medium=2, low=1) (FR18)
3. **Given** vulnérabilités scorées **Then** elles sont triées par score décroissant

## Tasks / Subtasks

- [ ] Task 1: Détection tendancielle (AC: #1)
  - [ ] 1.1 Ajouter `detectTrendAnomalies(monthlyData[])` à `app/utils/anomalyEngine.ts`
  - [ ] 1.2 Comparer 3 mois consécutifs : si dégradation continue → anomalie type `'trend'`
  - [ ] 1.3 Configurer le seuil de dégradation minimum
- [ ] Task 2: Score sévérité Dependabot (AC: #2, #3)
  - [ ] 2.1 Ajouter `calculateVulnerabilityScore(alerts)` à `app/utils/anomalyEngine.ts`
  - [ ] 2.2 Formule : `age_days × severity_coefficient`
  - [ ] 2.3 Trier par score décroissant
- [ ] Task 3: Intégrer dans useAnomalies (AC: #1, #2, #3)
  - [ ] 3.1 Ajouter les anomalies tendancielles au composable `app/composables/useAnomalies.ts`
  - [ ] 3.2 Ajouter les scores vulnérabilités
- [ ] Task 4: Tests (AC: #1, #2, #3)
  - [ ] 4.1 Tests `detectTrendAnomalies` (degrading/improving/flat/insufficient data)
  - [ ] 4.2 Tests `calculateVulnerabilityScore` (scoring, sorting, edge cases)
  - [ ] 4.3 Tests intégration `useAnomalies` avec les 3 types (threshold + delta + trend)

## Dev Notes

### Trend Detection Algorithm

Comparer M vs M-1 vs M-2 sur `metrics_monthly` :
- Si les 3 mois montrent une dégradation continue (valeur augmente pour les métriques où "plus haut = pire", ex: LCP, erreurs) → anomalie type `'trend'`
- Si données insuffisantes (<3 mois) → pas de détection tendancielle, retourner un tableau vide

### Severity Coefficients (Dependabot)

| Sévérité | Coefficient |
|----------|------------|
| critical | 4 |
| high | 3 |
| medium | 2 |
| low | 1 |

### Vulnerability Age Calculation

```typescript
const ageDays = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60 * 60 * 24))
const score = ageDays * SEVERITY_COEFFICIENTS[alert.severity]
```

### Types additionnels

```typescript
// Étendre AnomalyType de la Story 4.1
type AnomalyType = 'threshold' | 'delta' | 'trend'

interface MonthlyDataPoint {
  periodStart: string // ISO 8601
  value: number
  metricTypeId: number
}

interface VulnerabilityAlert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  createdAt: string // ISO 8601
  package: string
  title: string
}

interface ScoredVulnerability extends VulnerabilityAlert {
  score: number
}
```

### Dépendance

- Story 4.1 doit être complétée (anomalyEngine.ts et useAnomalies.ts existants)
- Utilise `metrics_monthly` pour le lookback 3 mois

### Anti-patterns to AVOID

- **DO NOT** muter les données d'entrée — toujours retourner de nouvelles structures
- **DO NOT** utiliser `Date` sans timezone — toujours ISO 8601 / `TIMESTAMPTZ`
- **DO NOT** hardcoder les coefficients inline — les exporter comme constantes `SEVERITY_COEFFICIENTS`

### References

- [Source: epics.md#Story 4.2] — Acceptance criteria, FR17, FR18
- [Source: prd.md#FR17] — Dégradation tendancielle 3 mois
- [Source: prd.md#FR18] — Score sévérité vulnérabilités
- [Source: architecture.md#Data Architecture] — metrics_monthly, star schema

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
