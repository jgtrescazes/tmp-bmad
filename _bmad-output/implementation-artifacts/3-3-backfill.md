# Story 3.3: Backfill M-1

Status: complete

## Story

As a **système**,
I want **rétro-collecter les données du mois précédent pour chaque source**,
So that **la comparaison M/M-1 est disponible dès le premier mois**.

## Acceptance Criteria

1. **Given** une source vient d'être configurée **When** le backfill est déclenché **Then** les données M-1 sont collectées et insérées dans `metrics_raw` (FR8)
2. **Given** l'API ne supporte pas la profondeur historique **Then** un warning est logué dans `collection_logs`

## Tasks / Subtasks

- [x] Task 1: Mode backfill dans chaque collecteur (AC: #1, #2)
  - [x] 1.1 Ajouter paramètre `backfill: { from: string, to: string }` à l'interface commune des Edge Functions (`supabase/functions/_shared/types.ts`)
  - [x] 1.2 Adapter `collect-sentry` pour le backfill (Sentry stats API avec date range)
  - [x] 1.3 Adapter `collect-debugbear` pour le backfill
  - [x] 1.4 Adapter `collect-dependabot` pour le backfill (returns 'partial' status with warning)
  - [x] 1.5 Adapter `collect-coverage` pour le backfill (GitHub Actions artifacts history)
  - [x] 1.6 Adapter `collect-github` pour le backfill (commits history with since/until)
- [x] Task 2: Endpoint de déclenchement (AC: #1)
  - [x] 2.1 Créer `server/api/backfill.post.ts` — Nitro route pour déclencher le backfill
  - [x] 2.2 Accepter paramètres : `source` (optional, all sources if omitted), `from` (ISO 8601), `to` (ISO 8601)
  - [x] 2.3 Invoquer les Edge Functions avec les paramètres de backfill via `supabase.functions.invoke()`
- [x] Task 3: Tests (AC: #1, #2)
  - [x] 3.1 Tests backfill pour chaque collecteur (date range handling, cas limites)
  - [x] 3.2 Tests endpoint `backfill.post.ts` (validation paramètres, invocation)

## Dev Notes

### Each API's historical data support

| Source | Historical depth | Method | Limitations |
|--------|-----------------|--------|-------------|
| Sentry | 90 days | Stats API with `start`/`end` params | Resolution may vary |
| GitHub (deploys) | Unlimited | Paginated commits API with `since`/`until` | Rate limiting (5000 req/h) |
| DebugBear | Depends on plan | Historical tests API | May require paid plan for >30d |
| Dependabot | Current state only | GraphQL API, snapshot based | No true historical data — log warning (AC #2) |
| PHPUnit coverage | ~90 days | GitHub Actions artifacts retention | Artifacts expire after retention period |

### Backfill parameter interface

```typescript
// supabase/functions/_shared/types.ts
interface BackfillParams {
  from: string  // ISO 8601 date
  to: string    // ISO 8601 date
}

interface CollectRequest {
  time?: string          // Normal collection timestamp
  backfill?: BackfillParams  // Backfill mode
}
```

### Nitro server route pattern

```typescript
// server/api/backfill.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { source, from, to } = body

  // Validate ISO 8601 dates
  if (!from || !to) {
    throw createError({ statusCode: 400, message: 'from and to are required (ISO 8601)' })
  }

  const client = serverSupabaseServiceRole(event)
  const sources = source ? [source] : ['sentry', 'github', 'debugbear', 'dependabot', 'coverage']

  const results = await Promise.allSettled(
    sources.map(s =>
      client.functions.invoke(`collect-${s}`, {
        body: { backfill: { from, to } }
      })
    )
  )

  return { data: results.map(formatResult), error: null }
})
```

### Edge Function backfill pattern (example: Sentry)

```typescript
// supabase/functions/collect-sentry/index.ts
const req: CollectRequest = await request.json()

if (req.backfill) {
  // Backfill mode: use date range
  const stats = await fetchSentryStats(req.backfill.from, req.backfill.to)
  // Insert into metrics_raw with collected_at from the actual data timestamps
} else {
  // Normal mode: collect latest
  const stats = await fetchSentryStats()
}
```

### Warning logging for unsupported backfill

```typescript
// When an API doesn't support historical data (e.g., Dependabot)
await supabase.from('collection_logs').insert({
  source_id: sourceId,
  repository_id: repositoryId,
  status: 'partial',
  rows_collected: 0,
  error_message: 'Backfill not fully supported: Dependabot API provides current state only, no historical snapshots',
  duration_ms: elapsed,
  started_at: startTime,
})
```

### References

- [Source: prd.md#FR8] — Backfill données historiques
- [Source: epics.md#Epic 3] — Story backfill M-1
- [Source: architecture.md#Collector Architecture] — Edge Function pattern, shared types

## Dev Agent Record

### Implementation Summary (2026-03-09)

**Files Created:**
- `server/api/backfill.post.ts` - Backfill API endpoint with validation
- `tests/unit/api/backfill.test.ts` - 20 tests for backfill logic

**Files Modified:**
- `supabase/functions/_shared/types.ts` - Added `BackfillParams`, `CollectRequest` interfaces
- `supabase/functions/collect-sentry/index.ts` - Added `collectBackfillMetrics()` using Stats API
- `supabase/functions/collect-github/index.ts` - Added `fetchHistoricalCommits()` with since/until
- `supabase/functions/collect-dependabot/index.ts` - Added partial status with BACKFILL_WARNING
- `server/utils/supabase.ts` - Added `serverSupabaseServiceRole()`, `isValidISODate()`, `COLLECTOR_SOURCES`

**Key Decisions:**
1. Max backfill range: 90 days (Sentry API limit)
2. Dependabot returns 'partial' status since API only provides current state
3. GitHub uses paginated commits API with MAX_BACKFILL_PAGES=50 safety limit
4. Date validation catches invalid dates like Feb 30 (JS Date lenient parsing)
