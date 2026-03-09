# Story 1.4: Page Sante des Collecteurs

Status: complete

## Story

As a **Tech Lead**,
I want **voir le statut de chaque collecteur et etre alerte en cas d'echec**,
So that **je sais si les donnees affichees sont completes et fiables**.

## Acceptance Criteria

1. **Given** des entrees existent dans collection_logs **When** j'ouvre /health **Then** je vois un tableau listant chaque source avec nom, dernier succes, dernier echec, statut actuel
2. **Given** une source est en echec **When** je consulte n'importe quelle page **Then** un badge dans le header indique le nombre de sources en erreur (FR7)
3. **Given** toutes les sources fonctionnent **When** je consulte le header **Then** pas de badge d'alerte

## Tasks / Subtasks

- [x] Task 1: Creer le composable useCollectionStatus (AC: #1, #2, #3)
  - [x] 1.1 Creer `app/composables/useCollectionStatus.ts` — fetch collection_logs, compute status per source
  - [x] 1.2 Exposer: sources avec lastSuccess, lastFailure, currentStatus
  - [x] 1.3 Calculer le nombre de sources en erreur (failedCount, hasFailures)
- [x] Task 2: Implementer la page Health (AC: #1)
  - [x] 2.1 Remplacer l'empty state de `/health` par un UTable avec les statuts
  - [x] 2.2 Badges couleur par statut (success=vert, failed=rouge, partial=amber)
  - [x] 2.3 Afficher duree depuis derniere collecte reussie (formatRelativeTime)
- [x] Task 3: Ajouter le badge d'alerte dans le layout (AC: #2, #3)
  - [x] 3.1 Creer `app/components/common/SourceStatusBadge.vue`
  - [x] 3.2 Integrer dans le layout sidebar (default.vue)
  - [x] 3.3 Afficher uniquement si sources en erreur > 0
- [x] Task 4: Tests (AC: #1, #2, #3)
  - [x] 4.1 Tests useCollectionStatus (status computation, failedCount)
  - [x] 4.2 Tests formatters (formatRelativeTime, formatMetricValue)

## Dev Notes

### PostgREST Query — Latest collection_logs per Source

Pour obtenir le dernier log de chaque source, on utilise une approche en deux requetes ou une vue PostgreSQL. L'approche composable :

```typescript
// app/composables/useCollectionStatus.ts
interface SourceStatus {
  sourceId: number
  sourceName: string
  displayName: string
  currentStatus: 'success' | 'failed' | 'partial' | 'unknown'
  lastSuccess: string | null    // ISO 8601
  lastFailure: string | null    // ISO 8601
  lastRunAt: string | null      // ISO 8601
  rowsCollected: number | null
  durationMs: number | null
  errorMessage: string | null
}

export function useCollectionStatus() {
  const supabase = useSupabaseClient()

  const { data: sources, pending, error, refresh } = useAsyncData(
    'collection-status',
    async () => {
      // Fetch latest log per source (most recent completed_at)
      const { data, error } = await supabase
        .from('collection_logs')
        .select(`
          id,
          source_id,
          status,
          rows_collected,
          error_message,
          duration_ms,
          completed_at,
          dim_sources!inner(name, display_name)
        `)
        .order('completed_at', { ascending: false })

      if (error) throw error

      // Group by source_id, take first (latest) entry
      const latestBySource = new Map<number, SourceStatus>()
      // ... grouping logic
      return Array.from(latestBySource.values())
    }
  )

  const failedCount = computed(() =>
    sources.value?.filter(s => s.currentStatus === 'failed').length ?? 0
  )

  return { sources, pending, error, refresh, failedCount }
}
```

**Alternative SQL (vue ou RPC) pour le DISTINCT ON :**
```sql
-- Vue PostgreSQL plus performante (a creer dans une migration si besoin)
SELECT DISTINCT ON (source_id)
  cl.id,
  cl.source_id,
  ds.name AS source_name,
  ds.display_name,
  cl.status,
  cl.rows_collected,
  cl.error_message,
  cl.duration_ms,
  cl.completed_at
FROM collection_logs cl
JOIN dim_sources ds ON ds.id = cl.source_id
ORDER BY source_id, completed_at DESC;
```

Si le volume de `collection_logs` devient important, envisager de creer une vue PostgreSQL `v_latest_collection_status` et de l'exposer via PostgREST.

### UTable Configuration

```vue
<!-- app/pages/health.vue -->
<template>
  <UContainer>
    <UPageHeader title="Sante des collecteurs" description="Statut de chaque source de donnees" />

    <USkeleton v-if="pending" class="h-96 w-full" />
    <UAlert v-else-if="error" color="red" :title="error.message" icon="i-lucide-alert-triangle" />
    <UTable v-else :rows="sources" :columns="columns">
      <template #status-data="{ row }">
        <UBadge :color="statusColor(row.currentStatus)" :label="row.currentStatus" />
      </template>
      <template #lastSuccess-data="{ row }">
        {{ row.lastSuccess ? formatRelativeTime(row.lastSuccess) : 'Jamais' }}
      </template>
      <template #lastRunAt-data="{ row }">
        {{ row.lastRunAt ? formatRelativeTime(row.lastRunAt) : 'Jamais' }}
      </template>
      <template #durationMs-data="{ row }">
        {{ row.durationMs ? `${row.durationMs}ms` : '-' }}
      </template>
    </UTable>
  </UContainer>
</template>

<script setup lang="ts">
const { sources, pending, error } = useCollectionStatus()

const columns = [
  { key: 'displayName', label: 'Source' },
  { key: 'status', label: 'Statut' },
  { key: 'lastSuccess', label: 'Dernier succes' },
  { key: 'lastRunAt', label: 'Derniere execution' },
  { key: 'rowsCollected', label: 'Lignes' },
  { key: 'durationMs', label: 'Duree' },
  { key: 'errorMessage', label: 'Erreur' },
]

function statusColor(status: string): string {
  switch (status) {
    case 'success': return 'green'
    case 'failed': return 'red'
    case 'partial': return 'amber'
    default: return 'gray'
  }
}
</script>
```

### SourceStatusBadge Component

```vue
<!-- app/components/common/SourceStatusBadge.vue -->
<template>
  <UBadge v-if="failedCount > 0" color="red" variant="subtle" class="cursor-pointer">
    <UIcon name="i-lucide-alert-circle" class="mr-1 size-3.5" />
    {{ failedCount }} source{{ failedCount > 1 ? 's' : '' }} en erreur
  </UBadge>
</template>

<script setup lang="ts">
const { failedCount } = useCollectionStatus()
</script>
```

Le badge est integre dans `app/layouts/default.vue` dans la zone header, a cote des controles existants.

### formatRelativeTime Utility

```typescript
// app/utils/formatters.ts
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'A l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `Il y a ${diffDays}j`
}
```

Alternativement, utiliser `Intl.RelativeTimeFormat` pour l'internationalisation (mais MVP = FR uniquement).

### Status Color avec useColorMode

Les couleurs des badges UBadge (`green`, `red`, `amber`) sont natives Nuxt UI et s'adaptent automatiquement au dark/light mode. Pas besoin de logique custom pour le theming des statuts.

### Anti-patterns a EVITER

- **NE PAS** utiliser `$fetch` ou `onMounted` fetch — toujours `useAsyncData`
- **NE PAS** faire un polling cote client — les donnees sont rafraichies au chargement de page
- **NE PAS** utiliser `any` — typer avec les interfaces definies
- **NE PAS** ajouter de logique de notification (email, Slack) — hors scope MVP, le badge suffit
- **NE PAS** creer de `server/api/` route pour les statuts — utiliser PostgREST direct via Supabase client

### References

- [Source: architecture.md#API Pattern] — Read path via PostgREST
- [Source: architecture.md#Error Handling] — useAsyncData error ref + UAlert
- [Source: prd.md#FR7] — Alerte en cas d'echec collecteur
- [Source: ux-design-specification.md#Health Page] — Tableau statuts, badges couleur
- [Source: ux-design-specification.md#Layout Structure] — Header avec indicateurs
- [Source: epics.md#Story 1.4] — Acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- formatRelativeTime uses French labels (À l'instant, Il y a Xmin/h/j/sem/mois)
- toLocaleString('fr-FR') uses narrow no-break space (U+202F) as thousands separator

### Completion Notes List

- Created useCollectionStatus composable with source status computation
- Created Health page with status table, alerts, and frequency info
- Created SourceStatusBadge component for sidebar alert
- Created formatters.ts with comprehensive date/number formatting utilities
- Integrated badge in sidebar layout (visible when collapsed=false)
- 122 tests passing

### Change Log

- 2026-03-09: Story 1.4 implemented (all 4 tasks)
- 2026-03-09: Code Review — No issues found

### Senior Developer Review (AI)

**Reviewed by:** Amelia (Dev Agent) on 2026-03-09
**Outcome:** APPROVED

**All ACs satisfied:**
- AC #1: Page /health avec tableau statuts ✅
- AC #2: Badge header quand sources en erreur ✅
- AC #3: Pas de badge si tout fonctionne ✅

### File List

- app/composables/useCollectionStatus.ts (new)
- app/pages/health.vue (modified)
- app/components/common/SourceStatusBadge.vue (new)
- app/utils/formatters.ts (new)
- app/utils/index.ts (modified — re-exports)
- app/layouts/default.vue (modified — added SourceStatusBadge)
- tests/unit/composables/useCollectionStatus.test.ts (new)
- tests/unit/utils/formatters.test.ts (new)
