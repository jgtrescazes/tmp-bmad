# Story 5.2: Export Markdown 1-Clic

Status: done

## Story

As a **Tech Lead**,
I want **exporter un rapport mensuel complet au format Markdown en 1 clic**,
So that **je peux partager le rapport au DSI en quelques minutes**.

## Acceptance Criteria

1. **Given** dashboard avec période mensuelle **When** je clique "Exporter Rapport" **Then** fichier Markdown généré et téléchargé en <10s (NFR2)
2. **Given** le rapport **Then** il inclut comparaison M/M-1 (FR27), top problèmes (FR28), annotations MEP (FR29)
3. **Given** export réussi **Then** notification toast confirme le téléchargement

## Tasks / Subtasks

- [x] Task 1: Générateur Markdown (AC: #1, #2)
  - [x] 1.1 Créer `app/utils/reportGenerator.ts` — fonction `generateMarkdownReport(data: ReportData): string`
  - [x] 1.2 Section En-tête : période, repository, date de génération
  - [x] 1.3 Section Résumé exécutif : nombre d'anomalies, tendance générale
  - [x] 1.4 Sections par axe : métriques en tableau markdown, deltas signés (+/-), top problèmes
  - [x] 1.5 Section Anomalies : liste complète triée par sévérité
  - [x] 1.6 Section Déploiements : liste des MEP du mois avec SHA, auteur, PR
  - [x] 1.7 Formatage : dates locales via `Intl.DateTimeFormat`, deltas avec signe, valeurs avec unités
- [x] Task 2: UI d'export (AC: #1, #3)
  - [x] 2.1 Implémenter la page `app/pages/report.vue` avec prévisualisation du rapport
  - [x] 2.2 Ajouter bouton "Exporter Rapport" (`UButton`) dans la page report
  - [x] 2.3 Download du fichier `.md` via `Blob` + `URL.createObjectURL`
  - [x] 2.4 Toast de confirmation via `useToast` après téléchargement réussi
- [x] Task 3: Tests (AC: #1, #2, #3)
  - [x] 3.1 Tests `generateMarkdownReport` (structure correcte, contenu des sections, formatage deltas)
  - [x] 3.2 Tests `generateMarkdownReport` avec données partielles (pas de M-1, pas de déploiements)
  - [x] 3.3 Tests page report (bouton présent, interaction download)

## Dev Notes

### Structure du rapport Markdown généré

```markdown
# Rapport Mensuel — {repository} — {période}

> Généré le {date} par Watchtower

## Résumé Exécutif

- **{n} anomalie(s)** détectée(s) ce mois
- Tendance générale : {amélioration/dégradation/stable}

## Stabilité (Sentry)

| Métrique | M ({mois}) | M-1 ({mois-1}) | Delta |
|----------|-----------|----------------|-------|
| Nouvelles erreurs | 42 | 38 | +10.5% ⚠️ |
| ... | ... | ... | ... |

### Top problèmes
- 🔴 {anomalie critical}
- 🟡 {anomalie warning}

## Performance (CWV)
...

## Sécurité (Dependabot)
...

## Qualité (Coverage)
...

## Déploiements du mois

| Date | SHA | Auteur | PR | Message |
|------|-----|--------|-----|---------|
| 2026-02-15 | abc1234 | dev1 | #123 | Fix CLS issue |

---
*Rapport généré automatiquement par Watchtower*
```

### Download Pattern (Blob)

```typescript
function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

### Nom du fichier

Format : `rapport-{repository}-{YYYY-MM}.md`
Exemple : `rapport-international-2026-02.md`

### Dépendances

- Story 5.1 — `useReport` composable et types `ReportData`
- `useToast` — fourni par Nuxt UI pour les notifications

### Performance (NFR2)

- La génération Markdown est une opération synchrone en mémoire sur des données déjà chargées
- Le goulot d'étranglement est le chargement initial des données (`useReport`), pas la génération
- Objectif : <10s du clic au téléchargement

### Anti-patterns to AVOID

- **DO NOT** générer le Markdown côté serveur — tout est côté client avec les données déjà disponibles
- **DO NOT** utiliser de librairie Markdown externe — génération par concaténation de strings
- **DO NOT** utiliser `window.open` — utiliser le pattern Blob + createObjectURL
- **DO NOT** oublier `URL.revokeObjectURL` après le téléchargement (memory leak)

### References

- [Source: epics.md#Story 5.2] — Acceptance criteria
- [Source: prd.md#FR27] — Comparaison M/M-1 dans le rapport
- [Source: prd.md#FR28] — Top problèmes dans le rapport
- [Source: prd.md#FR29] — Annotations MEP dans le rapport
- [Source: prd.md#NFR2] — Temps de génération <10s
- [Source: ux-design-specification.md#Component Strategy] — Nuxt UI components (UButton, useToast)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Fixed ESLint operator-linebreak errors in useReport.ts
- Fixed ESLint singleline-html-element-content-newline in report.vue

### Completion Notes List
- Created `app/utils/reportGenerator.ts` with generateMarkdownReport, generateReportFilename, downloadMarkdown
- Implemented full Markdown report generation with:
  - Header with repository and period
  - Executive summary with anomaly counts and trend
  - Per-axis sections with metrics tables and top problems
  - Deployments table with truncated messages
  - Footer with generation timestamp
- Updated `app/pages/report.vue` with:
  - Month selector dropdown (last 12 months)
  - Report preview with all sections
  - Export button with loading state
  - Toast confirmation on successful download
- Created comprehensive test suite (29 tests) covering:
  - Markdown generation structure and content
  - Filename generation with slug handling
  - Download mechanism with Blob/URL mocking
  - Edge cases (empty data, special characters)

### Change Log
- 2026-03-10: Code review fixes - fixed timezone issue in formatPeriodDisplay (UTC)
- 2026-03-10: Initial implementation of Markdown export (Story 5.2)

### File List
- app/utils/reportGenerator.ts (new)
- app/pages/report.vue (modified)
- tests/unit/utils/reportGenerator.test.ts (new)
