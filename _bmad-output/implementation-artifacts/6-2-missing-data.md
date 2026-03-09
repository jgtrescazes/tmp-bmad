# Story 6.2: Gestion des Données Manquantes

Status: ready-for-dev

## Story

As a **Tech Lead**,
I want **voir clairement les trous de données et pouvoir relancer une collecte échouée**,
So that **je sais si les données sont complètes et je peux corriger les problèmes**.

## Acceptance Criteria

1. **Given** une période sans données **When** je consulte un graphe **Then** le trou est visible (interruption courbe) avec warning visuel (FR31)
2. **Given** une collecte échouée **When** je consulte /health **Then** je peux cliquer "Relancer" pour déclencher manuellement la collecte (FR31)
3. **Given** relance déclenchée **Then** le statut se met à jour en temps réel

## Tasks / Subtasks

- [ ] Task 1: Détection et affichage des trous de données (AC: #1)
  - [ ] 1.1 Créer `app/utils/dataGaps.ts` — détecter les périodes manquantes dans une série temporelle
  - [ ] 1.2 Adapter `MetricChart.vue` pour afficher les trous (ECharts disconnected line segments)
  - [ ] 1.3 Ajouter un tooltip warning sur les zones sans données
- [ ] Task 2: Bouton relance manuelle (AC: #2, #3)
  - [ ] 2.1 Créer `server/api/collect/[source].post.ts` — Nitro route pour invoquer un collecteur
  - [ ] 2.2 Ajouter bouton "Relancer" sur chaque ligne du tableau Health
  - [ ] 2.3 Feedback visuel pendant l'exécution (loading state)
  - [ ] 2.4 Rafraîchir le statut après relance (`useAsyncData` refresh)
- [ ] Task 3: Tests (AC: #1, #2, #3)
  - [ ] 3.1 Tests unitaires `dataGaps.ts` (détection, edge cases : série vide, série complète, trous multiples)
  - [ ] 3.2 Tests endpoint relance (`server/api/collect/[source].post.ts`)
  - [ ] 3.3 Tests composant page Health avec bouton relance

## Dev Notes

### ECharts — Affichage des trous de données

Pour afficher des segments déconnectés dans ECharts, insérer `null` dans le tableau de données aux positions sans valeur. ECharts interrompt automatiquement la ligne à ces points.

```typescript
// Exemple : série avec trou
const data = [
  ['2026-03-01', 42],
  ['2026-03-02', 45],
  ['2026-03-03', null], // trou visible
  ['2026-03-04', null], // trou visible
  ['2026-03-05', 38],
]
```

### dataGaps.ts — Algorithme de détection

Comparer les timestamps de la série avec la fréquence attendue de la source (`dim_sources.frequency_minutes`). Si l'écart entre deux points consécutifs dépasse 2× la fréquence attendue, marquer comme trou.

### Nitro route — Relance collecteur

La route `server/api/collect/[source].post.ts` invoque la Supabase Edge Function correspondante via `fetch` avec le service role key. Pattern :

```typescript
// server/api/collect/[source].post.ts
export default defineEventHandler(async (event) => {
  const source = getRouterParam(event, 'source')
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/collect-${source}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return response.json()
})
```

### Loading state

Utiliser un `ref<boolean>` par source pour le loading state du bouton "Relancer". Après succès ou échec, appeler `refresh()` sur le `useAsyncData` de la page Health.

### Anti-patterns à éviter

- **NE PAS** utiliser `$fetch` ou `onMounted` fetch — utiliser `useAsyncData`/`useFetch`
- **NE PAS** créer de custom loading state global — utiliser `pending` de `useAsyncData` + état local pour le bouton

### References

- [Source: prd.md#FR31] — Gestion des données manquantes
- [Source: architecture.md#Error Handling] — Patterns d'erreur par couche
- [Source: ux-design-specification.md] — Health page layout
- [Source: epics.md#Story 6.2] — Acceptance criteria

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
