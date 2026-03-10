# Story 3.4: Drill-down & Sélecteur Repo

Status: complete

## Story

As a **Tech Lead**,
I want **naviguer en 1 clic vers l'outil source et pouvoir sélectionner un repo**,
So that **je peux investiguer rapidement un problème**.

## Acceptance Criteria

1. **Given** je consulte des métriques **When** je clique un lien drill-down **Then** l'outil source s'ouvre dans un nouvel onglet (FR13, < 2 clics)
2. **Given** le header **When** je vois le sélecteur repo **Then** "International" est pré-sélectionné (FR11, mono-repo MVP)

## Tasks / Subtasks

- [x] Task 1: Liens drill-down (AC: #1)
  - [x] 1.1 Créer `app/utils/deepLinks.ts` — fonctions pour générer les URLs vers Sentry, GitHub, DebugBear, Dependabot
  - [x] 1.2 Ajouter boutons/liens drill-down sur chaque page d'axe (`stability.vue`, `performance.vue`, `security.vue`, `quality.vue`)
  - [x] 1.3 Ouvrir dans un nouvel onglet (`target="_blank"`, `rel="noopener noreferrer"`)
- [x] Task 2: Sélecteur repo (AC: #2)
  - [x] 2.1 Créer `app/components/common/RepoSelector.vue` — `UDropdownMenu` avec la liste des repos
  - [x] 2.2 Créer `app/composables/useRepository.ts` — `useState` pour le repo sélectionné
  - [x] 2.3 Intégrer `RepoSelector` dans le header du layout (`app/layouts/default.vue`)
  - [x] 2.4 Connecter `useRepository` aux queries PostgREST (filtrer par `repository_id`)
- [x] Task 3: Tests (AC: #1, #2)
  - [x] 3.1 Tests `deepLinks.ts` (URL generation pour chaque source)
  - [x] 3.2 Tests `RepoSelector` (rendu, sélection, état initial)
  - [x] 3.3 Tests `useRepository` (état par défaut, changement de repo)

## Dev Notes

### Deep link URL patterns for each source

```typescript
// app/utils/deepLinks.ts

interface DeepLinkConfig {
  org: string
  repo: string
}

export function sentryIssuesUrl(org: string, project: string): string {
  return `https://${org}.sentry.io/issues/?project=${project}`
}

export function sentryIssueUrl(org: string, project: string, issueId: string): string {
  return `https://${org}.sentry.io/issues/${issueId}/?project=${project}`
}

export function githubDependabotUrl(org: string, repo: string): string {
  return `https://github.com/${org}/${repo}/security/dependabot`
}

export function githubDependabotAlertUrl(org: string, repo: string, alertNumber: number): string {
  return `https://github.com/${org}/${repo}/security/dependabot/${alertNumber}`
}

export function debugbearDashboardUrl(siteId: string): string {
  return `https://www.debugbear.com/project/${siteId}/overview`
}

export function githubActionsUrl(org: string, repo: string): string {
  return `https://github.com/${org}/${repo}/actions`
}
```

### UDropdownMenu configuration for RepoSelector

```vue
<!-- app/components/common/RepoSelector.vue -->
<template>
  <UDropdownMenu :items="repoItems">
    <UButton variant="ghost" :label="selectedRepo?.display_name" icon="i-lucide-git-branch" />
  </UDropdownMenu>
</template>
```

### useState for global repo selection

```typescript
// app/composables/useRepository.ts
export function useRepository() {
  const currentRepo = useState<Repository | null>('selected-repository', () => null)

  async function loadRepositories() {
    const supabase = useSupabaseClient()
    const { data } = await supabase
      .from('dim_repositories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return data
  }

  // Initialize with 'international' (MVP default)
  async function init() {
    if (!currentRepo.value) {
      const repos = await loadRepositories()
      currentRepo.value = repos?.find(r => r.name === 'international') ?? repos?.[0] ?? null
    }
  }

  return { currentRepo, loadRepositories, init }
}
```

### PostgREST filter pattern

```typescript
// In any composable that fetches metrics:
const { currentRepo } = useRepository()

const { data } = await supabase
  .from('metrics_daily')
  .select('*')
  .eq('repository_id', currentRepo.value?.id)
  // ... other filters
```

### Drill-down button pattern in axis pages

```vue
<UButton
  :to="sentryIssuesUrl(config.sentryOrg, config.sentryProject)"
  target="_blank"
  rel="noopener noreferrer"
  variant="outline"
  icon="i-lucide-external-link"
  label="Ouvrir dans Sentry"
/>
```

### References

- [Source: prd.md#FR11] — Sélecteur repo, mono-repo MVP
- [Source: prd.md#FR13] — Drill-down < 2 clics
- [Source: epics.md#Epic 3] — Stories drill-down et sélecteur repo
- [Source: ux-design-specification.md#Header] — Emplacement du sélecteur repo
- [Source: architecture.md#State Management] — useState pattern, pas de Pinia

## Dev Agent Record

### Implementation Summary (2026-03-09)

**Files Created:**
- `app/utils/deepLinks.ts` - URL generators for all source tools (Sentry, GitHub, DebugBear, Codecov)
- `app/composables/useRepository.ts` - Global repository selection state with useState
- `app/components/common/RepoSelector.vue` - Dropdown component for repo selection
- `tests/unit/utils/deepLinks.test.ts` - 15 tests for URL generation
- `tests/unit/composables/useRepository.test.ts` - 18 tests for repository state

**Files Modified:**
- `app/layouts/default.vue` - Added RepoSelector to sidebar header
- `app/pages/stability.vue` - Added "Ouvrir dans Sentry" drill-down button
- `app/pages/performance.vue` - Added "Ouvrir dans DebugBear" drill-down button
- `app/pages/security.vue` - Added "Ouvrir dans GitHub" (Dependabot) drill-down button
- `app/pages/quality.vue` - Added "Ouvrir dans GitHub Actions" drill-down button

**Key Decisions:**
1. Deep link config comes from runtime config (sentryOrg, githubOrg, debugbearSiteId, etc.)
2. RepoSelector placed in sidebar below app title for MVP
3. Repository state uses useState for SSR compatibility
4. Default repository is 'international' (MVP mono-repo)
