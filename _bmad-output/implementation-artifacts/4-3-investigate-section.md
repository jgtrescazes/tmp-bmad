# Story 4.3: Section "À Investiguer"

Status: ready-for-dev

## Story

As a **Tech Lead**,
I want **voir une section "À investiguer" auto-générée listant les anomalies détectées**,
So that **je sais immédiatement quoi prioriser**.

## Acceptance Criteria

1. **Given** anomalies détectées **When** j'ouvre le dashboard **Then** bannière UAlert "À investiguer" avec nombre d'éléments (FR19)
2. **Given** une anomalie affichée **Then** elle montre : type, source, métrique, valeur actuelle vs attendue, badge sévérité
3. **Given** je clique sur une anomalie **Then** je navigue vers la section détaillée
4. **Given** aucune anomalie **Then** la bannière n'apparaît pas

## Tasks / Subtasks

- [ ] Task 1: Composant InvestigateBanner (AC: #1, #4)
  - [ ] 1.1 Créer `app/components/anomalies/InvestigateBanner.vue` — bannière `UAlert`
  - [ ] 1.2 Afficher le nombre d'anomalies et un résumé (ex: "3 anomalies à investiguer")
  - [ ] 1.3 Expandable : liste détaillée des anomalies au clic
  - [ ] 1.4 Affichage conditionnel (`v-if` anomalies.length > 0)
- [ ] Task 2: Composant AnomalyCard (AC: #2, #3)
  - [ ] 2.1 Créer `app/components/anomalies/AnomalyCard.vue` — carte individuelle
  - [ ] 2.2 Afficher type (seuil/delta/tendance), source, métrique, valeurs actuelles vs attendues
  - [ ] 2.3 Badge sévérité avec couleur correspondante
  - [ ] 2.4 Lien de navigation vers la page d'axe concernée via `NuxtLink`
- [ ] Task 3: Intégrer dans le dashboard (AC: #1, #4)
  - [ ] 3.1 Ajouter `InvestigateBanner` en haut de `app/pages/index.vue` (après header, avant cards)
  - [ ] 3.2 Consommer le composable `useAnomalies` pour alimenter les données
- [ ] Task 4: Tests (AC: #1, #2, #3, #4)
  - [ ] 4.1 Tests `InvestigateBanner` (avec anomalies / sans anomalies / expand)
  - [ ] 4.2 Tests `AnomalyCard` (rendu complet, badge sévérité, lien navigation)

## Dev Notes

### Composants Nuxt UI utilisés

- `UAlert` — bannière principale (color `warning`)
- `UBadge` — badges sévérité
- `UCard` — carte anomalie individuelle
- `NuxtLink` — navigation vers les pages d'axes

### Severity Badge Colors

| Sévérité | Couleur UBadge |
|----------|---------------|
| critical | `red` |
| warning | `amber` |
| info | `blue` |

### Navigation Mapping (anomalie → page)

| Source / Axe | Route |
|-------------|-------|
| stability | `/stability` |
| performance | `/performance` |
| security | `/security` |
| quality | `/quality` |

### Structure du composant InvestigateBanner

```vue
<template>
  <UAlert
    v-if="anomalies.length > 0"
    color="warning"
    :title="`${anomalies.length} anomalie(s) à investiguer`"
  >
    <!-- Liste expandable des AnomalyCard -->
  </UAlert>
</template>
```

### Dépendances

- Story 4.1 — `useAnomalies` composable et types `Anomaly`
- Story 4.2 — anomalies tendancielles intégrées dans `useAnomalies`

### Anti-patterns to AVOID

- **DO NOT** fetch data dans les composants — utiliser `useAnomalies` composable
- **DO NOT** utiliser `$fetch` ou `onMounted` — utiliser `useAsyncData` via le composable
- **DO NOT** ajouter du state local pour les anomalies — le composable gère tout
- **DO NOT** utiliser des couleurs hardcodées — utiliser les tokens Nuxt UI (`color` prop)

### References

- [Source: epics.md#Story 4.3] — Acceptance criteria, FR19
- [Source: prd.md#FR19] — Section "À investiguer" auto-générée
- [Source: ux-design-specification.md#Component Strategy] — Nuxt UI 4.5 first principle
- [Source: architecture.md#Implementation Patterns] — Composables pattern, naming conventions

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
