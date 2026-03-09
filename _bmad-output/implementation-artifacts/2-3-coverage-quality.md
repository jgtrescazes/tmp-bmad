# Story 2.3: Collecteur PHPUnit Coverage & Page Qualité

Status: ready-for-dev

## Story

As a **Tech Lead**,
I want **voir la coverage backend par module collectée depuis GitHub Actions**,
So that **je peux suivre l'évolution de la qualité du code**.

## Acceptance Criteria

1. **Given** des artifacts PHPUnit existent dans GitHub Actions **When** collect-coverage est invoqué (quotidien) **Then** les données coverage (Lines, Functions, Classes) sont insérées dans metrics_raw (FR4)
2. **Given** des données coverage existent **When** j'ouvre /quality **Then** je vois la coverage par module avec graphes d'évolution (FR25)

## Tasks / Subtasks

- [ ] Task 1: Implémenter le collecteur Coverage (AC: #1)
  - [ ] 1.1 Créer `supabase/functions/collect-coverage/index.ts`
  - [ ] 1.2 Appeler GitHub Actions API (artifacts endpoint : `GET /repos/{owner}/{repo}/actions/artifacts`)
  - [ ] 1.3 Télécharger et parser l'artifact coverage (clover.xml ou coverage-summary.json)
  - [ ] 1.4 Mapper : coverage_lines, coverage_functions, coverage_classes vers MetricInsert
  - [ ] 1.5 Wrapper dans retryWithBackoff + logger (collection_logs)
- [ ] Task 2: Implémenter la page Qualité (AC: #2)
  - [ ] 2.1 Créer composable `app/composables/useQualityMetrics.ts` (filtre axis='quality')
  - [ ] 2.2 Remplacer empty state de `/quality` par graphes ECharts coverage (3 métriques : lines, functions, classes)
  - [ ] 2.3 Ajouter tableau UTable avec coverage par module si disponible dans metadata
  - [ ] 2.4 Ajouter résumé qualité dans le dashboard principal (`app/pages/index.vue`)
- [ ] Task 3: Tests (AC: #1, #2)
  - [ ] 3.1 Tests unitaires collecteur Coverage (parsing clover.xml, parsing coverage-summary.json, mapping, retry)
  - [ ] 3.2 Tests page Qualité (rendu graphes, tableau modules)

## Dev Notes

### GitHub Actions Artifacts API

- Liste des artifacts : `GET /repos/{owner}/{repo}/actions/artifacts`
- Téléchargement : `GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip`
- Authentification : header `Authorization: Bearer {GITHUB_TOKEN}`
- Variable d'environnement : `GITHUB_TOKEN` (déjà documentée dans `.env.example`)
- Filtrer par nom d'artifact (ex : `name=coverage-report`) via query param

### Format clover.xml (parsing)

```xml
<coverage generated="1234567890">
  <project name="wamiz-international">
    <metrics files="100" loc="50000" ncloc="45000"
             classes="200" methods="1500"
             coveredmethods="1200" coveredclasses="180"
             statements="10000" coveredstatements="8500" />
    <package name="App\Module\Auth">
      <metrics .../>
    </package>
  </project>
</coverage>
```

### Format coverage-summary.json (alternative)

```json
{
  "total": {
    "lines": { "total": 10000, "covered": 8500, "pct": 85.0 },
    "functions": { "total": 1500, "covered": 1200, "pct": 80.0 },
    "classes": { "total": 200, "covered": 180, "pct": 90.0 }
  }
}
```

### Mapping vers MetricInsert

```typescript
// coverage_lines: (coveredstatements / statements) * 100
// coverage_functions: (coveredmethods / methods) * 100
// coverage_classes: (coveredclasses / classes) * 100
```

### Structure metadata JSONB

```json
{
  "artifact_id": 12345,
  "format": "clover.xml",
  "modules": [
    { "name": "App\\Module\\Auth", "lines_pct": 92.5 },
    { "name": "App\\Module\\Search", "lines_pct": 78.3 }
  ]
}
```

### Artifact download + unzip pattern

```typescript
// 1. GET /repos/{owner}/{repo}/actions/artifacts?name=coverage-report
// 2. Find latest artifact (sorted by created_at)
// 3. GET /repos/{owner}/{repo}/actions/artifacts/{id}/zip → returns ZIP
// 4. Unzip in memory (Deno std library: @std/archive or pako)
// 5. Parse clover.xml or coverage-summary.json
```

### Collector Pattern (identique aux autres collecteurs)

```typescript
import { retryWithBackoff } from '../_shared/retry.ts'
import { logger } from '../_shared/logger.ts'
import { supabaseAdmin } from '../_shared/supabaseClient.ts'
import type { CollectResult } from '../_shared/types.ts'

async function collect(): Promise<CollectResult> {
  // 1. Fetch latest coverage artifact from GitHub Actions
  // 2. Download and unzip artifact
  // 3. Parse coverage data (clover.xml or coverage-summary.json)
  // 4. Insert coverage_lines, coverage_functions, coverage_classes into metrics_raw
  // 5. Return { rowsCollected, status }
}

Deno.serve(async () => {
  return await retryWithBackoff(collect)
})
```

### Dépendances

- Story 1.2 (shared Edge Function code : retry, logger, supabaseClient, types) doit être complétée
- Story 1.3 (configuration ECharts via nuxt-echarts) doit être complétée

### Anti-patterns à éviter

- Ne pas utiliser `$fetch` ou `onMounted` — utiliser `useAsyncData`
- Ne pas utiliser `console.log` dans le collecteur — utiliser `collection_logs`
- Ne pas hardcoder le token GitHub — utiliser `Deno.env.get('GITHUB_TOKEN')`
- Ne pas supposer le format de l'artifact — supporter clover.xml ET coverage-summary.json

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
