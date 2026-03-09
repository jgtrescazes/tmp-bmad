# Story 6.1: Rétention Différenciée Automatique

Status: ready-for-dev

## Story

As a **système**,
I want **appliquer automatiquement la rétention différenciée**,
So that **le volume de données reste maîtrisé**.

## Acceptance Criteria

1. **Given** données brutes >30j **When** pg_cron rollup s'exécute **Then** données agrégées dans metrics_daily puis supprimées de metrics_raw (FR30)
2. **Given** données daily >12 mois **When** pg_cron rollup mensuel s'exécute **Then** données agrégées dans metrics_monthly puis supprimées de metrics_daily (FR30)
3. **Given** données monthly **Then** elles sont conservées indéfiniment (NFR14)

## Tasks / Subtasks

- [ ] Task 1: Valider les fonctions de rollup existantes (AC: #1, #2)
  - [ ] 1.1 Tester fn_rollup_daily() avec des données de test
  - [ ] 1.2 Tester fn_rollup_weekly() avec des données de test
  - [ ] 1.3 Tester fn_rollup_monthly() avec des données de test
  - [ ] 1.4 Vérifier l'idempotence (ON CONFLICT DO UPDATE)
- [ ] Task 2: Valider les fonctions de cleanup (AC: #1, #2, #3)
  - [ ] 2.1 Tester fn_cleanup_old_raw() — supprime >30j
  - [ ] 2.2 Tester fn_cleanup_old_daily() — supprime >12 mois
  - [ ] 2.3 Vérifier que le cleanup ne supprime pas les données non encore rollupées
- [ ] Task 3: Valider les jobs pg_cron (AC: #1, #2)
  - [ ] 3.1 Vérifier les schedules (rollup daily 02:00, cleanup raw 03:00, cleanup daily 1st 04:00)
  - [ ] 3.2 Vérifier l'ordre d'exécution (rollup AVANT cleanup)
  - [ ] 3.3 Documenter la procédure de monitoring des jobs
- [ ] Task 4: Tests (AC: #1, #2, #3)
  - [ ] 4.1 Tests d'intégration rollup (insert raw → rollup → verify daily)
  - [ ] 4.2 Tests d'intégration cleanup (verify retention periods)
  - [ ] 4.3 Tests idempotence (multiple runs)

## Dev Notes

### Ordre d'exécution pg_cron (CRITICAL)

L'ordre est essentiel pour éviter la perte de données :
- **02:00 UTC** — `fn_rollup_daily()` : agrège metrics_raw → metrics_daily
- **03:00 UTC** — `fn_cleanup_old_raw()` : supprime metrics_raw >30 jours
- **04:00 UTC (1er du mois)** — `fn_cleanup_old_daily()` : supprime metrics_daily >12 mois

Le rollup DOIT s'exécuter AVANT le cleanup pour garantir que les données sont agrégées avant suppression.

### Idempotence

Les fonctions de rollup utilisent `INSERT INTO ... ON CONFLICT DO UPDATE` (upsert), ce qui les rend idempotentes. Plusieurs exécutions successives produisent le même résultat.

### Test local

Tester avec `supabase start` en local. Insérer des données de test dans metrics_raw avec des dates variées (récentes, >30j, >12 mois), puis exécuter les fonctions manuellement via `psql`.

### Monitoring

Les jobs pg_cron loguent dans `cron.job_run_details`. Vérifier aussi `collection_logs` pour le suivi applicatif.

### Rétention permanente (metrics_monthly)

Aucune fonction de cleanup ne cible metrics_monthly — les données mensuelles sont conservées indéfiniment (NFR14).

### References

- [Source: architecture.md#Data Architecture] — Rollup pipeline, retention policy
- [Source: prd.md#FR30] — Rétention différenciée
- [Source: prd.md#NFR14] — Conservation permanente des données mensuelles
- [Source: epics.md#Story 6.1] — Acceptance criteria
- Migrations existantes : `00006_create_rollup_functions.sql`, `00007_create_cleanup_functions.sql`, `00008_create_cron_jobs.sql`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
