# Story 2.2: Collecteur Dependabot & Page Sécurité

Status: ready-for-dev

## Story

As a **Tech Lead**,
I want **voir les alertes de vulnérabilités Dependabot avec sévérité et âge**,
So that **je peux prioriser les corrections de sécurité**.

## Acceptance Criteria

1. **Given** un token GitHub configuré **When** collect-dependabot est invoqué (quotidien) **Then** les alertes sont collectées via GitHub API (sévérité, date, état) et insérées dans metrics_raw avec counts par sévérité (vuln_critical, vuln_high, vuln_medium, vuln_low) (FR3)
2. **Given** des données Dependabot existent **When** j'ouvre /security **Then** je vois les vulnérabilités par sévérité, l'âge des alertes, et l'évolution du backlog (FR24)

## Tasks / Subtasks

- [ ] Task 1: Implémenter le collecteur Dependabot (AC: #1)
  - [ ] 1.1 Créer `supabase/functions/collect-dependabot/index.ts`
  - [ ] 1.2 Appeler GitHub API (`GET /repos/{owner}/{repo}/dependabot/alerts`)
  - [ ] 1.3 Mapper : vuln_critical, vuln_high, vuln_medium, vuln_low counts vers MetricInsert
  - [ ] 1.4 Stocker détails alertes dans metadata JSONB (age en jours, state, package name)
  - [ ] 1.5 Wrapper dans retryWithBackoff + logger (collection_logs)
- [ ] Task 2: Implémenter la page Sécurité (AC: #2)
  - [ ] 2.1 Créer composable `app/composables/useSecurityMetrics.ts` (filtre axis='security')
  - [ ] 2.2 Remplacer empty state de `/security` par graphes ECharts (vulnérabilités par sévérité, évolution backlog)
  - [ ] 2.3 Ajouter tableau UTable avec alertes détaillées (sévérité, package, âge en jours)
  - [ ] 2.4 Ajouter résumé sécurité dans le dashboard principal (`app/pages/index.vue`)
- [ ] Task 3: Tests (AC: #1, #2)
  - [ ] 3.1 Tests unitaires collecteur Dependabot (mapping API → MetricInsert, retry, severity counting)
  - [ ] 3.2 Tests page Sécurité (rendu graphes, tableau alertes)

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

_(à remplir)_

### Debug Log References

_(à remplir)_

### Completion Notes List

_(à remplir)_

### Change Log

_(à remplir)_

### File List

_(à remplir)_
