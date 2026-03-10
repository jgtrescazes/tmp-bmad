# Story 2.2: Collecteur Dependabot & Page Sécurité

Status: done

## Story

As a **Tech Lead**,
I want **voir les alertes de vulnérabilités Dependabot avec sévérité et âge**,
So that **je peux prioriser les corrections de sécurité**.

## Acceptance Criteria

1. **Given** un token GitHub configuré **When** collect-dependabot est invoqué (quotidien) **Then** les alertes sont collectées via GitHub API (sévérité, date, état) et insérées dans metrics_raw avec counts par sévérité (vuln_critical, vuln_high, vuln_medium, vuln_low) (FR3)
2. **Given** des données Dependabot existent **When** j'ouvre /security **Then** je vois les vulnérabilités par sévérité, l'âge des alertes, et l'évolution du backlog (FR24)

## Tasks / Subtasks

- [x] Task 1: Implémenter le collecteur Dependabot (AC: #1)
  - [x] 1.1 Créer `supabase/functions/collect-dependabot/index.ts`
  - [x] 1.2 Appeler GitHub API (`GET /repos/{owner}/{repo}/dependabot/alerts`)
  - [x] 1.3 Mapper : vuln_critical, vuln_high, vuln_medium, vuln_low counts vers MetricInsert
  - [x] 1.4 Stocker détails alertes dans metadata JSONB (age en jours, state, package name)
  - [x] 1.5 Wrapper dans retryWithBackoff + logger (collection_logs)
- [x] Task 2: Implémenter la page Sécurité (AC: #2)
  - [x] 2.1 Créer composable `app/composables/useSecurityMetrics.ts` (filtre axis='security')
  - [x] 2.2 Remplacer empty state de `/security` par graphes ECharts (vulnérabilités par sévérité, évolution backlog)
  - [x] 2.3 Ajouter tableau UTable avec alertes détaillées (sévérité, package, âge en jours)
  - [x] 2.4 Ajouter résumé sécurité dans le dashboard principal (`app/pages/index.vue`)
- [x] Task 3: Tests (AC: #1, #2)
  - [x] 3.1 Tests unitaires collecteur Dependabot (mapping API → MetricInsert, retry, severity counting)
  - [x] 3.2 Tests page Sécurité (rendu graphes, tableau alertes)

## Dev Notes

### GitHub Dependabot Alerts API

- Endpoint : `GET /repos/{owner}/{repo}/dependabot/alerts`
- Authentification : header `Authorization: Bearer {GITHUB_TOKEN}`
- Variable d'environnement : `GITHUB_TOKEN` (déjà documentée dans `.env.example`)
- Rate limits : 5000 requêtes/heure avec token authentifié
- Paramètres utiles : `state=open` pour ne récupérer que les alertes actives, `per_page=100`
- Pagination : suivre le header `Link` pour les pages suivantes

### Mapping sévérité

```typescript
// GitHub API severity → dim_metric_types name
const SEVERITY_MAP: Record<string, string> = {
  'critical': 'vuln_critical',
  'high': 'vuln_high',
  'medium': 'vuln_medium',
  'low': 'vuln_low',
}
```

### Calcul de l'âge des alertes

```typescript
const ageDays = Math.floor(
  (Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60 * 60 * 24)
)
```

### Structure metadata JSONB

```json
{
  "alerts": [
    {
      "number": 42,
      "state": "open",
      "severity": "high",
      "package": "lodash",
      "age_days": 15,
      "created_at": "2026-02-22T10:00:00Z"
    }
  ],
  "total_open": 7
}
```

### Collector Pattern (identique aux autres collecteurs)

```typescript
import { retryWithBackoff } from '../_shared/retry.ts'
import { logger } from '../_shared/logger.ts'
import { supabaseAdmin } from '../_shared/supabaseClient.ts'
import type { CollectResult } from '../_shared/types.ts'

async function collect(): Promise<CollectResult> {
  // 1. Fetch from GitHub Dependabot API (paginate if needed)
  // 2. Count alerts by severity
  // 3. Insert one MetricInsert per severity level into metrics_raw
  // 4. Return { rowsCollected, status }
}

Deno.serve(async () => {
  return await retryWithBackoff(collect)
})
```

### Graphes page Sécurité

- **Stacked bar chart** : vulnérabilités par sévérité (critical/high/medium/low) avec évolution temporelle
- **Line chart** : évolution du backlog total d'alertes ouvertes
- **UTable** : liste détaillée des alertes ouvertes (colonnes : sévérité, package, âge, état)

### Dépendances

- Story 1.2 (shared Edge Function code : retry, logger, supabaseClient, types) doit être complétée
- Story 1.3 (configuration ECharts via nuxt-echarts) doit être complétée

### Anti-patterns à éviter

- Ne pas utiliser `$fetch` ou `onMounted` — utiliser `useAsyncData`
- Ne pas utiliser `console.log` dans le collecteur — utiliser `collection_logs`
- Ne pas hardcoder le token GitHub — utiliser `Deno.env.get('GITHUB_TOKEN')`
- Ne pas ignorer la pagination GitHub — toujours suivre le header `Link`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests pass: 232 tests across all Epic 1 + Epic 2 stories
- Lint clean after running `pnpm lint --fix`

### Completion Notes List

- Implemented collector with GitHub API pagination support
- Counts vulnerabilities by severity (critical/high/medium/low)
- Alert details stored in metadata JSONB (number, state, severity, package, age_days, created_at)
- UTable displays alerts sorted by severity (critical first) then by age
- Stacked bar + line chart shows vulnerability evolution

### Change Log

- 2026-03-09: Story implemented (all tasks completed)
- 2026-03-09: Code Review — tasks cochées, erreur grammaticale formatAge corrigée (CR-3)

### File List

**Collector:**
- `supabase/functions/collect-dependabot/index.ts`

**Composables:**
- `app/composables/useSecurityMetrics.ts`

**Components:**
- `app/components/metrics/SecurityChart.vue`
- `app/components/metrics/SecuritySummary.vue`

**Pages:**
- `app/pages/security.vue` (updated)
- `app/pages/index.vue` (updated - added SecuritySummary)

**Utils:**
- `app/utils/chartConfig.ts` (extended with createStackedBarOption)

**Tests:**
- `tests/unit/collectors/dependabot.test.ts` (14 tests)
- `tests/unit/composables/useSecurityMetrics.test.ts` (18 tests)_
