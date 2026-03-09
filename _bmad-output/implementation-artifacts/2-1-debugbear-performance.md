# Story 2.1: Collecteur DebugBear & Page Performance

Status: ready-for-dev

## Story

As a **Tech Lead**,
I want **voir les métriques Web Vitals (LCP, CLS, INP) collectées depuis DebugBear**,
So that **je peux surveiller la performance de la plateforme**.

## Acceptance Criteria

1. **Given** une API key DebugBear configurée **When** l'Edge Function collect-debugbear est invoquée (hebdo) **Then** les métriques LCP, CLS, INP (lab et field) sont insérées dans metrics_raw
2. **Given** retry et logging **When** le collecteur rencontre une erreur **Then** retryWithBackoff (3 tentatives, backoff exponentiel) est appliqué et le résultat est loggé dans collection_logs (comme pour Sentry)
3. **Given** des données DebugBear existent **When** j'ouvre /performance **Then** je vois les graphes ECharts pour LCP, CLS, INP avec distinction lab/field (FR23)
4. **Given** la section Performance du dashboard **When** j'ouvre la page d'accueil **Then** un résumé des métriques performance est affiché

## Tasks / Subtasks

- [ ] Task 1: Implémenter le collecteur DebugBear (AC: #1, #2)
  - [ ] 1.1 Créer `supabase/functions/collect-debugbear/index.ts`
  - [ ] 1.2 Appeler l'API DebugBear (pages endpoint, tests endpoint)
  - [ ] 1.3 Mapper vers MetricInsert (lcp, cls, inp — lab + field séparés via metadata JSONB)
  - [ ] 1.4 Wrapper dans retryWithBackoff + logger (collection_logs)
- [ ] Task 2: Implémenter la page Performance (AC: #3, #4)
  - [ ] 2.1 Créer composable `app/composables/usePerformanceMetrics.ts` (filtre axis='performance')
  - [ ] 2.2 Remplacer empty state de `/performance` par graphes ECharts (3 métriques × lab/field)
  - [ ] 2.3 Ajouter seuils Google visuels sur les graphes (LCP 2.5s, INP 200ms, CLS 0.1) via ECharts markLine
  - [ ] 2.4 Ajouter résumé performance dans le dashboard principal (`app/pages/index.vue`)
- [ ] Task 3: Tests (AC: #1, #2, #3)
  - [ ] 3.1 Tests unitaires collecteur DebugBear (mapping API → MetricInsert, retry, error handling)
  - [ ] 3.2 Tests unitaires composable usePerformanceMetrics
  - [ ] 3.3 Tests page Performance (rendu graphes, seuils visibles)

## Dev Notes

### DebugBear API

- Base URL: `https://www.debugbear.com/api/v1/`
- Endpoints principaux : `pages` (liste des pages monitorées), `pages/{id}/tests` (résultats de tests)
- Authentification : header `x-api-key: {DEBUGBEAR_API_KEY}`
- Variable d'environnement : `DEBUGBEAR_API_KEY` (déjà documentée dans `.env.example`)

### Lab vs Field distinction

Les métriques lab et field sont stockées comme des entrées séparées dans metrics_raw, différenciées via le champ `metadata` JSONB :
```json
{ "data_source": "lab", "page_url": "https://wamiz.com/..." }
{ "data_source": "field", "page_url": "https://wamiz.com/..." }
```

### Seuils Google CWV (markLine ECharts)

| Métrique | Bon | À améliorer | Mauvais |
|----------|-----|-------------|---------|
| LCP | ≤ 2500ms | ≤ 4000ms | > 4000ms |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |

### Collector Pattern (identique à Sentry)

```typescript
import { retryWithBackoff } from '../_shared/retry.ts'
import { logger } from '../_shared/logger.ts'
import { supabaseAdmin } from '../_shared/supabaseClient.ts'
import type { CollectResult } from '../_shared/types.ts'

async function collect(): Promise<CollectResult> {
  // 1. Fetch from DebugBear API
  // 2. Map to MetricInsert[]
  // 3. Insert into metrics_raw
  // 4. Return { rowsCollected, status }
}

Deno.serve(async () => {
  return await retryWithBackoff(collect)
})
```

### Composable Pattern

```typescript
// usePerformanceMetrics.ts
export function usePerformanceMetrics(repositoryId: Ref<number>, period: Ref<string>) {
  return useAsyncData('performance-metrics', () =>
    useSupabaseClient()
      .from('metrics_raw')
      .select('*, dim_metric_types!inner(*)')
      .eq('dim_metric_types.axis', 'performance')
      .eq('repository_id', repositoryId.value)
      .order('collected_at', { ascending: true })
  )
}
```

### Dépendances

- Story 1.2 (shared Edge Function code : retry, logger, supabaseClient, types) doit être complétée
- Story 1.3 (configuration ECharts via nuxt-echarts) doit être complétée

### Anti-patterns à éviter

- Ne pas utiliser `$fetch` ou `onMounted` — utiliser `useAsyncData`
- Ne pas utiliser `console.log` dans le collecteur — utiliser `collection_logs`
- Ne pas hardcoder la clé API — utiliser `Deno.env.get('DEBUGBEAR_API_KEY')`

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
