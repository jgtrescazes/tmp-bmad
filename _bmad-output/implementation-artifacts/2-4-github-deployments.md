# Story 2.4: Collecteur Déploiements GitHub

Status: done

## Story

As a **système**,
I want **collecter les événements de déploiement (merges sur main) depuis GitHub**,
So that **les déploiements sont disponibles pour annotation et corrélation**.

## Acceptance Criteria

1. **Given** un token GitHub configuré **When** collect-github est invoqué (toutes les 15 min) **Then** les merges sur main sont détectés et insérés dans la table deployments (sha, message, auteur, date, PR number) (FR5)
2. **Given** des déploiements déjà enregistrés **When** un déploiement existant est re-détecté **Then** il n'est pas dupliqué (UNIQUE constraint sur repository_id + sha)

## Tasks / Subtasks

- [x] Task 1: Implémenter le collecteur GitHub Deployments (AC: #1, #2)
  - [x] 1.1 Créer `supabase/functions/collect-github/index.ts`
  - [x] 1.2 Appeler GitHub API (`GET /repos/{owner}/{repo}/commits?sha=main`)
  - [x] 1.3 Extraire : sha, message, author, date, PR number (depuis le message du merge commit)
  - [x] 1.4 Upsert dans la table deployments (`ON CONFLICT(repository_id, sha) DO NOTHING`)
  - [x] 1.5 Wrapper dans retryWithBackoff + logger (collection_logs)
- [x] Task 2: Tests (AC: #1, #2)
  - [x] 2.1 Tests unitaires collecteur GitHub (mapping commits → deployments, upsert, déduplication)
  - [x] 2.2 Tests extraction PR number depuis le message de merge commit

## Dev Notes

### GitHub Commits API

- Endpoint : `GET /repos/{owner}/{repo}/commits?sha=main&per_page=30`
- Authentification : header `Authorization: Bearer {GITHUB_TOKEN}`
- Variable d'environnement : `GITHUB_TOKEN` (déjà documentée dans `.env.example`)
- Rate limits : 5000 requêtes/heure avec token authentifié
- Récupérer les 30 derniers commits suffit pour une fréquence de 15 min

### Extraction PR number depuis merge commit

Pattern standard GitHub : `Merge pull request #123 from org/branch`

```typescript
function extractPrNumber(message: string): number | null {
  const match = message.match(/Merge pull request #(\d+)/)
  return match ? parseInt(match[1], 10) : null
}
```

### Mapping vers table deployments

```typescript
interface DeploymentInsert {
  repository_id: number
  sha: string        // commit SHA complet (40 chars)
  message: string    // premier line du commit message
  author: string     // commit.author.login ou commit.commit.author.name
  pr_number: number | null
  deployed_at: string // commit.commit.author.date (ISO 8601)
}
```

### Upsert pattern (déduplication)

```typescript
const { error } = await supabaseAdmin
  .from('deployments')
  .upsert(deployments, {
    onConflict: 'repository_id,sha',
    ignoreDuplicates: true,
  })
```

Cela correspond au SQL `ON CONFLICT(repository_id, sha) DO NOTHING` — les déploiements déjà enregistrés sont simplement ignorés.

### Collector Pattern (identique aux autres collecteurs)

```typescript
import { retryWithBackoff } from '../_shared/retry.ts'
import { logger } from '../_shared/logger.ts'
import { supabaseAdmin } from '../_shared/supabaseClient.ts'
import type { CollectResult } from '../_shared/types.ts'

async function collect(): Promise<CollectResult> {
  // 1. Fetch recent commits on main from GitHub API
  // 2. Extract sha, message, author, date, PR number
  // 3. Upsert into deployments table (ON CONFLICT DO NOTHING)
  // 4. Return { rowsCollected, status }
}

Deno.serve(async () => {
  return await retryWithBackoff(collect)
})
```

### Note : pas de page frontend dans cette story

Cette story ne concerne que la collecte de données. Les déploiements seront affichés comme annotations (markLine ECharts) sur les graphes des autres pages dans une story ultérieure (Epic 3 — corrélation M/M-1).

### Dépendances

- Story 1.2 (shared Edge Function code : retry, logger, supabaseClient, types) doit être complétée

### Anti-patterns à éviter

- Ne pas utiliser `console.log` dans le collecteur — utiliser `collection_logs`
- Ne pas hardcoder le token GitHub — utiliser `Deno.env.get('GITHUB_TOKEN')`
- Ne pas récupérer tout l'historique — limiter à `per_page=30` (suffisant pour 15 min de polling)
- Ne pas utiliser `INSERT` simple — utiliser `upsert` avec `ignoreDuplicates` pour la déduplication

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests pass: 232 tests across all Epic 1 + Epic 2 stories
- Lint clean after running `pnpm lint --fix`

### Completion Notes List

- Implemented collector fetching commits from main branch
- Extracts PR number from merge commit messages (pattern: `Merge pull request #123`)
- Uses upsert with `onConflict: 'repository_id,sha'` for deduplication
- No frontend changes (deployments will be used as annotations in Epic 3)

### Change Log

- 2026-03-09: Story implemented (all tasks completed)
- 2026-03-09: Code Review — tasks cochées

### File List

**Collector:**
- `supabase/functions/collect-github/index.ts`

**Tests:**
- `tests/unit/collectors/github.test.ts` (13 tests)_
