---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
lastStep: 8
status: 'complete'
completedAt: '2026-03-09'
inputDocuments:
  - prd.md
  - product-brief-watchtower-2026-03-09.md
  - product-brief-platform-monitoring-2026-03-09.md
  - ux-design-specification.md
  - research/domain-apis-monitoring-tools-research-2026-03-09.md
  - research/technical-sgbd-time-series-research-2026-03-09.md
  - research/technical-dashboard-to-presentation-automation-research-2026-03-09.md
  - research/technical-frequence-polling-monitoring-research-2026-03-09.md
  - research/technical-modelisation-donnees-analytiques-research-2026-03-09.md
  - research/technical-polling-vs-storage-monitoring-apis-research-2026-03-09.md
  - research/technical-supabase-mvp-research-2026-03-09.md
workflowType: 'architecture'
project_name: 'watchtower'
user_name: 'Laurent'
date: '2026-03-09'
---

# Architecture Decision Document — Watchtower

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (31 FR):**

| Catégorie | FRs | Implications architecturales |
|-----------|-----|------------------------------|
| Collecte de données | FR1-FR8 | 4 connecteurs MVP indépendants, retry 3x avec backoff, backfill M-1, signalement visuel d'échec |
| Dashboard & Visualisation | FR9-FR14 | SPA Nuxt UI, graphes d'évolution multi-axes, sélecteur repo, dark mode natif |
| Détection d'anomalies | FR15-FR19 | Moteur d'analyse 3 niveaux (absolu, delta, tendanciel), calcul score âge × sévérité, section "À investiguer" auto-générée |
| Corrélation Déploiements | FR20-FR21 | Alignement temporel métriques/événements GitHub, annotations overlay sur graphes |
| Métriques par Axe | FR22-FR25 | 4 modèles de données distincts (Stabilité, Performance, Sécurité, Qualité) |
| Rapport Mensuel | FR26-FR29 | Moteur de templating Markdown, agrégation par période, export structuré |
| Gestion des Données | FR30-FR31 | Rétention différenciée 3 niveaux, gestion données manquantes avec warning visuel |

**Non-Functional Requirements (15 NFR):**

| Axe | NFRs | Contrainte architecturale clé |
|-----|------|-------------------------------|
| Performance | NFR1-3 | Dashboard <3s, rapport <10s, graphes fluides — nécessite pré-agrégation ou cache |
| Fiabilité | NFR4-7 | >99% uptime, fraîcheur <24h, isolation par source, pas de perte silencieuse |
| Intégration | NFR8-10 | Respect rate limits, fréquence adaptative par source, config par fichier |
| Sécurité | NFR11-12 | API keys en .env, accès réseau restreint (pas d'auth pour MVP) |
| Infrastructure | NFR13-15 | Coût <50€/mois, rétention différenciée automatisée, CD depuis GitHub |

**Scale & Complexity:**

- Domaine principal : Full-stack (SPA + backend collecte + stockage analytique)
- Niveau de complexité : **Moyen** — intégration multi-APIs avec analytics, mono-tenant, solo dev
- Composants architecturaux estimés : ~8-10 (frontend, API, 4 connecteurs, moteur anomalies, moteur rapport, stockage)

### Technical Constraints & Dependencies

| Contrainte | Source | Impact |
|------------|--------|--------|
| **Nuxt UI 4.5 + Cloudflare** | PRD, Brief | Frontend SSR/SSG sur edge, composants prêts à l'emploi |
| **Supabase/PostgreSQL MVP** | PRD, Recherche | API auto-générée, RLS si besoin, migration TimescaleDB/ClickHouse possible |
| **Budget <50€/mois** | NFR13 | Privilégier services managés avec tiers gratuits (Supabase Free → Pro) |
| **Solo dev** | PRD | Architecture simple, pas d'over-engineering, incrémentale |
| **Desktop only, dark mode** | UX Spec | Pas de responsive mobile, Tailwind dark mode natif |
| **Repo International uniquement (MVP)** | PRD | Simplification initiale, multi-repos V1.5 |

### Cross-Cutting Concerns Identified

1. **Résilience de collecte** — Retry 3x, backoff exponentiel, isolation par source, flag "collecte incomplète" visible → affecte tous les connecteurs et le dashboard
2. **Rétention différenciée** — Journalier 30j, hebdo 12 mois, mensuel pluriannuel → affecte le stockage, la modélisation, les requêtes
3. **Annotations MEP** — Overlay des déploiements sur toutes les courbes → affecte la corrélation temporelle, le stockage d'événements, la visualisation
4. **Fréquences adaptatives** — Quasi temps réel (Sentry), quotidien (Dependabot, coverage), hebdomadaire (CWV agrégés) → affecte l'orchestration des collecteurs
5. **Comparaison M/M-1** — Disponible sur tous les axes → affecte la modélisation des données et les requêtes d'agrégation

## Starter Template Evaluation

### Primary Technology Domain

Application web full-stack (dashboard SPA) — identifié depuis le PRD et l'UX spec. Nuxt 4 + Nuxt UI est le framework imposé par les exigences projet.

### Starter Options Considered

| Starter | Description | Verdict |
|---------|-------------|---------|
| `npx nuxi init` (minimal) | Projet Nuxt 4 vierge | ⚠️ Trop nu, nécessite beaucoup de config |
| **Nuxt UI Dashboard template** | Template officiel avec layout dashboard, sidebar, tables | ✅ **Sélectionné** |
| nuxt4-boilerplate (communauté) | Nuxt 4 + Tailwind + Nuxt UI + ESLint + Vitest + Playwright | ⚠️ Non officiel, risque de maintenance |
| Nuxt UI SaaS template | Template SaaS avec auth, landing, dashboard | ⚠️ Trop de features hors scope |

### Selected Starter: Nuxt UI Dashboard Template

**Rationale for Selection:**

1. Template officiel Nuxt UI — maintenu par l'équipe Nuxt, 125+ composants gratuits
2. Layout dashboard prêt — sidebar, header, structure de page idéale pour Watchtower
3. Nuxt UI v4.5.1 (dernière version stable, janvier 2026) — tous les composants requis inclus
4. Dark mode natif — conforme à l'UX spec
5. Tailwind CSS v4 intégré

**Initialization Command:**

```bash
pnpm dlx nuxi@latest init watchtower -t ui
cd watchtower
pnpm install
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript strict, Nuxt 4, Vue 3.5+, Nitro server engine

**Styling Solution:**
Tailwind CSS v4 via Nuxt UI, design tokens configurables via `app.config.ts`

**Build Tooling:**
Vite (HMR ultra-rapide), Nitro (server engine universel), preset `cloudflare_pages` disponible

**Component Library:**
Nuxt UI v4.5 — 125+ composants (UCard, UTable, UBadge, UAlert, UDropdownMenu, USkeleton, UTooltip, etc.)

**Code Organization:**
Convention Nuxt : `pages/`, `components/`, `composables/`, `server/`, `layouts/`

**State Management:**
Vue reactivity + `useState` composable natif (Pinia optionnel si besoin)

**Additional Setup Required:**

| Besoin | Solution à configurer |
|--------|----------------------|
| Tests unitaires | Vitest + `@nuxt/test-utils` |
| Linting | `@nuxt/eslint-config` |
| Graphes (MetricChart) | Apache ECharts ou Chart.js |
| Base de données | `@nuxtjs/supabase` module |
| Déploiement Cloudflare | `nitro: { preset: 'cloudflare_pages' }` |

**Note:** L'initialisation du projet avec cette commande constitue la première story d'implémentation.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Bloquent l'implémentation) :**

| # | Décision | Choix |
|---|----------|-------|
| 1.1 | Modélisation des données | Star Schema multi-granularité avec rollup automatique |
| 1.3 | Migrations DB | SQL manuelles via CLI Supabase |
| 2.1 | Pattern API | Hybride PostgREST (lecture) + Nitro routes (collecteurs) |
| 2.2 | Architecture connecteurs | Module par source, interface commune, isolation par source |
| 4.2 | Orchestration collecteurs | Supabase pg_cron + Edge Functions |

**Important Decisions (Façonnent l'architecture) :**

| # | Décision | Choix |
|---|----------|-------|
| 1.2 | Cache | Pas de cache applicatif MVP — rollup suffisent |
| 2.3 | Gestion d'erreurs | Table `collection_logs` + flag `last_successful_collection` |
| 3.1 | State management | `useState` natif + `useFetch`/`useAsyncData` |
| 3.2 | Graphiques | Apache ECharts 6.0 via `nuxt-echarts` |
| 3.3 | Organisation composants | Flat par domaine fonctionnel |
| 4.1 | CI/CD | GitHub Actions → Cloudflare Pages via wrangler |
| 4.3 | Monitoring app | Minimal — logs natifs + table collection_logs |

**Deferred Decisions (Post-MVP) :**

| Décision | Trigger |
|----------|---------|
| Cache Nitro | Performance dashboard > 3s |
| Migration TimescaleDB/ClickHouse | Volume > 5M lignes/mois |
| Auth utilisateur | Multi-tenant V1.5 |
| Notifications échec collecte | Feedback utilisateur |
| Export PDF rapports | V2 — Playwright + python-pptx |

### Data Architecture

**Modélisation — Star Schema multi-granularité :**

- Tables de faits : `metrics_raw` (données brutes), `metrics_daily`, `metrics_weekly`, `metrics_monthly`
- Tables de dimensions : `dim_source` (Sentry, GitHub, DebugBear, Dependabot), `dim_metric_type`, `dim_repository`
- Rollup automatique via fonctions PostgreSQL déclenchées par `pg_cron`
- Rétention : raw 30j → daily 12 mois → monthly pluriannuel (suppression automatique via pg_cron)

**Migrations :** Fichiers SQL versionnés dans `supabase/migrations/`, typage auto via `supabase gen types typescript`

**Cache :** Pas de cache applicatif MVP — les tables rollup pré-agrégées garantissent des temps de requête <100ms sur les volumes attendus

### Authentication & Security

- **MVP : pas d'authentification** — accès réseau restreint uniquement (NFR11-12)
- API keys des sources externes stockées en variables d'environnement (`.env` local, secrets Supabase/GitHub Actions en production)
- Supabase service role key côté serveur uniquement (Edge Functions + Nitro server routes)
- Supabase anon key côté client pour les requêtes lecture via PostgREST (RLS non activé MVP)

### API & Communication Patterns

**Hybride PostgREST + Nitro :**

- **Lecture (dashboard)** : Client Supabase (`@nuxtjs/supabase`) → PostgREST auto-généré, zéro code backend
- **Écriture (collecteurs)** : Supabase Edge Functions avec service role key → insert direct en base

**Architecture des connecteurs :**

```
supabase/functions/collectors/
├── _shared/
│   ├── types.ts          # Interface CollectResult commune
│   └── retry.ts          # Wrapper retry 3x backoff exponentiel
├── collect-sentry/
│   └── index.ts          # Collecteur Sentry
├── collect-github/
│   └── index.ts          # Collecteur GitHub (déploiements)
├── collect-debugbear/
│   └── index.ts          # Collecteur DebugBear/CWV
└── collect-dependabot/
    └── index.ts          # Collecteur Dependabot
```

- Chaque collecteur implémente `collect(): Promise<CollectResult>`
- Isolation totale : un échec Sentry n'impacte pas les autres sources

**Logging :** Table `collection_logs` (source, status, error_message, rows_collected, duration_ms, created_at)

### Frontend Architecture

**State management :** `useState` natif pour l'état partagé (repo sélectionné, période), `useFetch`/`useAsyncData` pour les données serveur

**Graphiques :** Apache ECharts 6.0 via module `nuxt-echarts` — SSR SVG, lazy-loading, support natif annotations overlay (marqueurs MEP), zoom, multi-séries temporelles

**Organisation composants :**

```
components/
├── dashboard/        # Widgets dashboard principal
├── metrics/          # Composants graphes par axe
├── report/           # Composants rapport mensuel
├── anomalies/        # Section "À investiguer"
└── common/           # Composants réutilisables (selectors, badges, status)
```

### Infrastructure & Deployment

**Hébergement :** Cloudflare Pages (frontend Nuxt SSR) + Supabase (DB PostgreSQL + Edge Functions + pg_cron)

**CI/CD :** GitHub Actions

- PR → lint + tests + preview deploy
- Merge main → build + deploy production Cloudflare Pages
- Déploiement via `wrangler` CLI

**Orchestration collecteurs :** Supabase pg_cron déclenche les Edge Functions selon fréquences adaptatives :

| Source | Fréquence | Justification |
|--------|-----------|---------------|
| Sentry | Toutes les 5 min | Quasi temps réel, événements critiques |
| GitHub (déploiements) | Toutes les 15 min | Corrélation MEP rapide |
| DebugBear/CWV | Hebdomadaire | Données agrégées par nature |
| Dependabot | Quotidien | Scan quotidien GitHub |

**Monitoring :** Table `collection_logs` + page Health dashboard intégrée à Watchtower

### Decision Impact Analysis

**Séquence d'implémentation recommandée :**

1. Init projet Nuxt UI + config Supabase + schéma DB (star schema)
2. Premier collecteur (Sentry) + Edge Function + pg_cron
3. Dashboard lecture via PostgREST + premier graphe ECharts
4. Connecteurs restants (GitHub, DebugBear, Dependabot)
5. Moteur d'anomalies + section "À investiguer"
6. Rapport mensuel
7. CI/CD GitHub Actions complet

**Dépendances cross-composants :**

- Les collecteurs dépendent du schéma DB (star schema) → schéma en premier
- Le dashboard dépend de données en base → au moins un collecteur actif
- Les anomalies dépendent de données historiques → collecteurs + rollup fonctionnels
- Le rapport dépend des agrégations mensuelles → rollup pg_cron configuré

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**12 points de conflit potentiels identifiés** où des agents IA pourraient diverger. Règles établies ci-dessous.

### Naming Patterns

**Database (PostgreSQL/Supabase) :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Tables | `snake_case`, pluriel | `metrics_raw`, `collection_logs`, `dim_sources` |
| Colonnes | `snake_case` | `created_at`, `metric_type`, `error_message` |
| Foreign keys | `{table_singulier}_id` | `source_id`, `repository_id` |
| Index | `idx_{table}_{colonnes}` | `idx_metrics_raw_source_id_created_at` |
| Fonctions PG | `fn_{action}_{objet}` | `fn_rollup_daily()`, `fn_cleanup_old_raw()` |

**API (PostgREST + Nitro) :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Endpoints Nitro | `kebab-case`, pluriel | `/api/collectors/`, `/api/health/` |
| Query params PostgREST | `snake_case` (convention PG) | `?source_id=eq.1&created_at=gte.2026-01-01` |
| JSON response fields | `snake_case` (aligné DB) | `{ "metric_value": 42, "created_at": "..." }` |

**Code (TypeScript/Vue) :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichiers composants | `PascalCase.vue` | `MetricChart.vue`, `HealthStatus.vue` |
| Fichiers composables | `camelCase.ts` | `useMetrics.ts`, `useCollectionStatus.ts` |
| Fichiers utils/server | `camelCase.ts` | `retryWithBackoff.ts`, `dateUtils.ts` |
| Variables/fonctions TS | `camelCase` | `metricValue`, `getLatestMetrics()` |
| Types/Interfaces | `PascalCase` | `CollectResult`, `MetricRow`, `SourceConfig` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_BACKOFF_MS` |
| Props Vue | `camelCase` (declaration), `kebab-case` (template) | `:metric-data="data"` |

### Structure Patterns

**Organisation projet :**

```
watchtower/
├── app/
│   ├── pages/                    # Routes Nuxt
│   ├── components/
│   │   ├── dashboard/            # Par domaine fonctionnel
│   │   ├── metrics/
│   │   ├── report/
│   │   ├── anomalies/
│   │   └── common/
│   ├── composables/              # Logique réutilisable
│   ├── layouts/                  # Layouts Nuxt UI
│   └── utils/                    # Helpers frontend purs
├── server/
│   ├── api/                      # Routes API Nitro (health, etc.)
│   └── utils/                    # Utils serveur
├── supabase/
│   ├── migrations/               # SQL versionnées
│   ├── functions/                # Edge Functions (collecteurs)
│   │   ├── _shared/              # Code partagé collecteurs
│   │   ├── collect-sentry/
│   │   ├── collect-github/
│   │   ├── collect-debugbear/
│   │   └── collect-dependabot/
│   └── seed.sql                  # Données de test
├── tests/
│   ├── unit/                     # Tests Vitest
│   └── e2e/                      # Tests E2E (post-MVP)
├── nuxt.config.ts
├── app.config.ts
└── supabase/config.toml
```

**Tests :** Dossier `tests/` séparé (pas co-localisés) — convention Nuxt standard. Nommage : `{module}.test.ts`

### Format Patterns

**Réponses API Nitro (hors PostgREST) :**

```typescript
// Succès
{ data: T, error: null }

// Erreur
{ data: null, error: { code: string, message: string } }
```

**Dates :** ISO 8601 partout (`2026-03-09T14:30:00Z`). PostgreSQL `timestamptz`, affiché en local côté frontend via `Intl.DateTimeFormat`.

**Nulls :** `null` explicite (pas `undefined`, pas de champ omis) dans les réponses API. Côté DB : `NULL` autorisé uniquement sur les champs optionnels.

### Communication Patterns

**Pas de système d'événements** pour le MVP — architecture request/response simple :

- Le dashboard fetch les données via PostgREST
- Les collecteurs écrivent en base via Edge Functions
- Pas de WebSocket/Realtime Supabase pour le MVP

**State management Vue :**

- État global via `useState('key', () => defaultValue)` — clés en `camelCase`
- Données serveur via `useAsyncData('key', () => fetch)` — clés descriptives : `'dashboard-metrics'`, `'collection-status'`
- Pas de mutation directe du state retourné par `useAsyncData` — utiliser `refresh()`

### Process Patterns

**Error handling :**

| Couche | Pattern |
|--------|---------|
| Collecteurs (Edge Functions) | Try/catch → log dans `collection_logs` → ne jamais throw au-delà du collecteur |
| API Nitro | `createError({ statusCode, message })` — erreurs HTTP standard |
| Frontend | `useAsyncData` avec `error` ref → affichage via `UAlert` component |
| Composants | `<ErrorBoundary>` Vue 3 natif pour les crashes inattendus |

**Loading states :**

- `useAsyncData` fournit `pending` nativement → utiliser `USkeleton` pendant le chargement
- Pas de state de loading custom — s'appuyer sur les primitives Nuxt

**Retry (collecteurs) :**

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T>
```

- 3 tentatives max, backoff exponentiel (1s, 2s, 4s)
- Log chaque tentative dans `collection_logs`
- Après 3 échecs : marquer `status: 'failed'` et passer au collecteur suivant

### Enforcement Guidelines

**Tous les agents IA DOIVENT :**

1. Suivre les conventions de nommage exactement comme documentées (snake_case DB, camelCase TS, PascalCase composants)
2. Placer les fichiers dans la structure définie ci-dessus — ne jamais créer de nouveaux dossiers racine sans justification
3. Utiliser les primitives Nuxt/Vue (`useAsyncData`, `useState`, `useFetch`) plutôt que des abstractions custom
4. Logger les erreurs collecteurs dans `collection_logs` — jamais de `console.log` en production
5. Typer strictement avec TypeScript — pas de `any`, utiliser les types générés par Supabase

**Vérification :** ESLint + règles Nuxt appliquées en CI (GitHub Actions). Les types Supabase sont régénérés à chaque migration.

### Pattern Examples

**Bon exemple — Composable de métriques :**

```typescript
// composables/useMetrics.ts
export function useMetrics(sourceId: number, period: string) {
  return useAsyncData(
    `metrics-${sourceId}-${period}`,
    () => useSupabaseClient()
      .from('metrics_daily')
      .select('*')
      .eq('source_id', sourceId)
      .gte('created_at', period)
  )
}
```

**Anti-patterns — À éviter :**

```typescript
// ❌ Fetch custom au lieu de useAsyncData
const data = ref(null)
onMounted(async () => {
  data.value = await $fetch('/api/metrics')
})

// ❌ snake_case dans le code TypeScript
const metric_value = data.metric_value

// ❌ Console.log au lieu de collection_logs
console.log('Sentry collection failed:', error)
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
watchtower/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + tests sur PR
│       └── deploy.yml                      # Build + deploy Cloudflare Pages sur merge main
├── .env.example                            # Template variables d'environnement
├── .gitignore
├── nuxt.config.ts                          # Config Nuxt + modules + Nitro preset
├── app.config.ts                           # Design tokens Nuxt UI + thème
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── eslint.config.mjs                       # ESLint flat config Nuxt
│
├── app/
│   ├── app.vue                             # Root component
│   ├── layouts/
│   │   └── default.vue                     # Layout dashboard (sidebar + header)
│   │
│   ├── pages/
│   │   ├── index.vue                       # Dashboard principal — vue d'ensemble
│   │   ├── stability.vue                   # Axe Stabilité (Sentry)
│   │   ├── performance.vue                 # Axe Performance (DebugBear/CWV)
│   │   ├── security.vue                    # Axe Sécurité (Dependabot)
│   │   ├── quality.vue                     # Axe Qualité (coverage, tests)
│   │   ├── report.vue                      # Rapport mensuel
│   │   └── health.vue                      # Health status des collecteurs
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ScoreCard.vue               # Card score par axe (FR9)
│   │   │   ├── OverviewGrid.vue            # Grille 4 axes dashboard
│   │   │   └── TrendIndicator.vue          # Indicateur tendance ↑↓→
│   │   ├── metrics/
│   │   │   ├── MetricChart.vue             # Graphe ECharts générique time-series
│   │   │   ├── ComparisonChart.vue         # Graphe comparaison M/M-1 (FR13)
│   │   │   ├── DeploymentOverlay.vue       # Annotations MEP sur graphes (FR20-21)
│   │   │   └── MetricTable.vue             # Table détaillée métriques
│   │   ├── anomalies/
│   │   │   ├── AnomalyList.vue             # Liste "À investiguer" (FR15-19)
│   │   │   ├── AnomalyCard.vue             # Card anomalie avec score sévérité
│   │   │   └── AnomalyBadge.vue            # Badge niveau (critique/warning/info)
│   │   ├── report/
│   │   │   ├── ReportPreview.vue           # Aperçu rapport mensuel (FR26)
│   │   │   ├── ReportSection.vue           # Section par axe dans le rapport
│   │   │   └── ReportExport.vue            # Export Markdown (FR29)
│   │   └── common/
│   │       ├── PeriodSelector.vue          # Sélecteur période (jour/semaine/mois)
│   │       ├── SourceStatusBadge.vue       # Badge état collecte par source
│   │       ├── DataWarning.vue             # Warning données manquantes (FR31)
│   │       └── PageHeader.vue              # Header de page avec titre + filtres
│   │
│   ├── composables/
│   │   ├── useMetrics.ts                   # Fetch métriques par axe/source/période
│   │   ├── useAnomalies.ts                 # Détection anomalies 3 niveaux
│   │   ├── useCollectionStatus.ts          # Statut de santé des collecteurs
│   │   ├── useDeployments.ts               # Fetch événements déploiements GitHub
│   │   ├── useReport.ts                    # Génération rapport mensuel
│   │   └── usePeriod.ts                    # State global période sélectionnée
│   │
│   └── utils/
│       ├── formatters.ts                   # Formatage dates, nombres, pourcentages
│       ├── chartConfig.ts                  # Config ECharts partagée (thème, couleurs)
│       └── anomalyEngine.ts               # Logique détection anomalies (absolu, delta, tendance)
│
├── server/
│   ├── api/
│   │   └── health.get.ts                  # Endpoint health check app
│   └── utils/
│       └── supabase.ts                    # Client Supabase server-side (service role)
│
├── supabase/
│   ├── config.toml                        # Config Supabase locale
│   ├── seed.sql                           # Données de seed pour dev
│   ├── migrations/
│   │   ├── 00001_create_dimensions.sql    # dim_sources, dim_metric_types, dim_repositories
│   │   ├── 00002_create_metrics_raw.sql   # Table metrics_raw
│   │   ├── 00003_create_metrics_rollup.sql # Tables daily, weekly, monthly
│   │   ├── 00004_create_collection_logs.sql # Table collection_logs
│   │   ├── 00005_create_deployments.sql   # Table deployments (événements GitHub)
│   │   ├── 00006_create_rollup_functions.sql # fn_rollup_daily, fn_rollup_weekly, fn_rollup_monthly
│   │   ├── 00007_create_cleanup_functions.sql # fn_cleanup_old_raw, fn_cleanup_old_daily
│   │   └── 00008_create_cron_jobs.sql     # pg_cron schedules (collecte + rollup + cleanup)
│   └── functions/
│       ├── _shared/
│       │   ├── types.ts                   # CollectResult, SourceConfig, MetricRow
│       │   ├── retry.ts                   # retryWithBackoff()
│       │   ├── logger.ts                  # Insert dans collection_logs
│       │   └── supabaseClient.ts          # Client Supabase avec service role
│       ├── collect-sentry/
│       │   └── index.ts                   # Collecteur Sentry (issues, events, crash rate)
│       ├── collect-github/
│       │   └── index.ts                   # Collecteur GitHub (deployments, releases)
│       ├── collect-debugbear/
│       │   └── index.ts                   # Collecteur DebugBear (CWV, scores perf)
│       └── collect-dependabot/
│           └── index.ts                   # Collecteur Dependabot (alertes sécurité)
│
├── tests/
│   ├── unit/
│   │   ├── composables/
│   │   │   ├── useMetrics.test.ts
│   │   │   └── useAnomalies.test.ts
│   │   ├── utils/
│   │   │   ├── anomalyEngine.test.ts
│   │   │   └── formatters.test.ts
│   │   └── collectors/
│   │       ├── sentry.test.ts
│   │       └── retry.test.ts
│   └── fixtures/
│       ├── metricsData.ts                 # Données de test métriques
│       └── collectionLogs.ts              # Données de test logs collecte
│
└── public/
    └── favicon.ico
```

### Architectural Boundaries

**API Boundaries :**

| Boundary | Direction | Protocol | Auth |
|----------|-----------|----------|------|
| Dashboard → Supabase | Client → PostgREST | HTTPS (anon key) | Anon key (pas de RLS MVP) |
| Edge Functions → Supabase DB | Server → PostgreSQL | Direct connection | Service role key |
| Edge Functions → APIs externes | Server → REST | HTTPS | API keys par source (.env) |
| pg_cron → Edge Functions | Internal trigger | HTTP invoke | Service role |
| GitHub Actions → Cloudflare | CI → Deploy | Wrangler CLI | API token |

**Component Boundaries :**

```
┌──────────────────────────────────────────────────────┐
│  Cloudflare Pages (Frontend Nuxt SSR)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Pages    │→ │Composables│→ │ Supabase Client  │───┼──→ PostgREST (lecture)
│  │  (Vue)    │  │          │  │ (@nuxtjs/supabase)│   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│       ↓                                              │
│  ┌──────────────────┐                                │
│  │ ECharts (graphes) │                               │
│  └──────────────────┘                                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Supabase (Backend)                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ pg_cron  │→ │Edge Functions │→ │ APIs externes │  │
│  │(scheduler)│  │(collecteurs) │  │(Sentry, GH...)│  │
│  └──────────┘  └──────┬───────┘  └───────────────┘  │
│                       ↓                              │
│  ┌─────────────────────────────────────────────┐     │
│  │  PostgreSQL (star schema)                   │     │
│  │  metrics_raw → rollup → daily/weekly/monthly│     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Requirements to Structure Mapping

**FR Categories → Fichiers :**

| FR Category | Pages | Components | Composables | Supabase |
|-------------|-------|------------|-------------|----------|
| FR1-8 Collecte | health.vue | common/SourceStatusBadge | useCollectionStatus | functions/collect-* |
| FR9-14 Dashboard | index.vue | dashboard/*, metrics/MetricChart | useMetrics, usePeriod | migrations/metrics_* |
| FR15-19 Anomalies | (section dans chaque axe) | anomalies/* | useAnomalies | — (calcul frontend) |
| FR20-21 Déploiements | (overlay sur graphes) | metrics/DeploymentOverlay | useDeployments | migrations/deployments |
| FR22-25 Axes | stability/performance/security/quality.vue | metrics/* | useMetrics | metrics_raw par source |
| FR26-29 Rapport | report.vue | report/* | useReport | rollup tables |
| FR30-31 Rétention | — | common/DataWarning | — | migrations/cleanup_functions |

**Cross-Cutting Concerns → Fichiers :**

| Concern | Fichiers impactés |
|---------|-------------------|
| Résilience collecte | _shared/retry.ts, _shared/logger.ts, collection_logs |
| Rétention différenciée | migrations/00006-00008, pg_cron |
| Annotations MEP | DeploymentOverlay.vue, useDeployments.ts, deployments table |
| Fréquences adaptatives | migrations/00008_create_cron_jobs.sql |
| Comparaison M/M-1 | ComparisonChart.vue, useMetrics.ts (requêtes par période) |

### Data Flow

```
APIs externes (Sentry, GitHub, DebugBear, Dependabot)
        ↓ [collecte via Edge Functions, fréquence adaptative]
  metrics_raw (données brutes, rétention 30j)
        ↓ [pg_cron rollup quotidien]
  metrics_daily (rétention 12 mois)
        ↓ [pg_cron rollup hebdo/mensuel]
  metrics_weekly / metrics_monthly (rétention pluriannuelle)
        ↓ [PostgREST → client Supabase]
  Dashboard Nuxt (composables → composants → ECharts)
```

### Development Workflow

**Développement local :**

1. `pnpm dev` — Nuxt dev server (HMR)
2. `supabase start` — PostgreSQL + Edge Functions local
3. `supabase functions serve` — Test Edge Functions local

**Déploiement :**

1. PR → GitHub Actions : lint + tests
2. Merge main → GitHub Actions : `pnpm build` + `wrangler pages deploy`
3. Migrations DB : `supabase db push` (manuel, pré-deploy)

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility :** Toutes les technologies sont compatibles et forment un écosystème cohérent. Nuxt 4 + Nuxt UI v4.5 + Tailwind v4 côté frontend, Supabase (PostgreSQL + Edge Functions + pg_cron) côté backend, Cloudflare Pages pour l'hébergement. Aucun conflit de version identifié.

**Pattern Consistency :** Les conventions de nommage respectent les standards de chaque couche (snake_case PostgreSQL, camelCase TypeScript, PascalCase Vue). Les patterns de communication (PostgREST lecture, Edge Functions écriture) sont cohérents avec l'architecture hybride choisie.

**Structure Alignment :** La structure de fichiers reflète exactement les décisions architecturales — séparation claire frontend (app/), backend (server/), data layer (supabase/), tests.

### Requirements Coverage Validation ✅

**Functional Requirements :** 31/31 FRs couverts architecturalement. Chaque catégorie de FR est mappée à des fichiers et composants spécifiques dans la structure projet.

**Non-Functional Requirements :** 15/15 NFRs adressés. Performance via rollup, fiabilité via retry + isolation, sécurité via .env + service role, infrastructure dans le budget <50€/mois.

### Implementation Readiness Validation ✅

**Decision Completeness :** Toutes les décisions critiques sont documentées avec versions vérifiées (ECharts 6.0, Nuxt UI v4.5.1, Nuxt 4, Tailwind v4). Les décisions différées sont explicitement listées avec leurs triggers.

**Structure Completeness :** Arborescence complète avec ~50 fichiers identifiés, chacun commenté avec sa responsabilité. Mapping FR → fichiers exhaustif.

**Pattern Completeness :** Conventions de nommage, structure, formats API, gestion d'erreurs, loading states, retry — tous les points de conflit potentiels sont couverts avec exemples et anti-patterns.

### Gap Analysis Results

| Gap | Sévérité | Résolution |
|-----|----------|------------|
| Backfill M-1 (FR7) non explicité dans la structure | Important | Logique de backfill intégrée dans chaque collecteur au premier lancement |
| Sélecteur de repo (FR10) absent des composants | Mineur | MVP mono-repo (International), sélecteur ajouté en V1.5 multi-repos |
| Score âge × sévérité (FR18) non détaillé | Mineur | Logique dans `anomalyEngine.ts`, algorithme spécifié dans la story dédiée |
| Export Markdown du rapport (FR29) | Mineur | Génération Markdown côté client dans `ReportExport.vue`, pas de route serveur nécessaire |

Aucun gap critique bloquant l'implémentation.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed (31 FRs, 15 NFRs)
- [x] Scale and complexity assessed (Moyen — multi-API, mono-tenant, solo dev)
- [x] Technical constraints identified (6 contraintes documentées)
- [x] Cross-cutting concerns mapped (5 concerns identifiés)

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions (5 decisions critiques)
- [x] Technology stack fully specified (Nuxt 4, Supabase, Cloudflare, ECharts 6)
- [x] Integration patterns defined (PostgREST + Edge Functions hybride)
- [x] Performance considerations addressed (rollup tables, pas de cache MVP)

**✅ Implementation Patterns**

- [x] Naming conventions established (DB, API, Code — 3 couches)
- [x] Structure patterns defined (flat par domaine)
- [x] Communication patterns specified (request/response, pas d'événements)
- [x] Process patterns documented (error handling, retry, loading states)

**✅ Project Structure**

- [x] Complete directory structure defined (~50 fichiers)
- [x] Component boundaries established (Cloudflare ↔ Supabase)
- [x] Integration points mapped (5 boundaries API)
- [x] Requirements to structure mapping complete (7 FR categories + 5 cross-cutting)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**

- Architecture simple et pragmatique, adaptée solo dev
- Séparation nette frontend/backend via Supabase (pas de backend custom à maintenir)
- Conventions claires qui évitent les divergences entre agents IA
- Décisions différées explicites — pas d'over-engineering

**Areas for Future Enhancement:**

- Cache applicatif si performance insuffisante
- Migration vers TimescaleDB si volume dépasse 5M lignes/mois
- Auth utilisateur pour multi-tenant V1.5
- Monitoring applicatif dédié (Sentry pour Watchtower)

### Implementation Handoff

**AI Agent Guidelines:**

- Suivre toutes les décisions architecturales exactement comme documentées
- Utiliser les patterns d'implémentation de manière cohérente sur tous les composants
- Respecter la structure projet et les boundaries
- Se référer à ce document pour toutes les questions architecturales

**First Implementation Priority:**

```bash
pnpm dlx nuxi@latest init watchtower -t ui
cd watchtower
pnpm install
```

Puis : configuration Supabase, création du schéma DB (star schema), premier collecteur (Sentry).
