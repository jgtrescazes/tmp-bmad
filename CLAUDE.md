# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watchtower is a centralized monitoring dashboard for the Wamiz platform. It automates anomaly detection and monthly health report generation across 4 axes: Stability (Sentry), Performance (DebugBear/CWV), Security (Dependabot), Quality (PHPUnit coverage). MVP targets the International repo only.

**Status:** Greenfield — planning artifacts complete in `_bmad-output/planning-artifacts/`, no application code yet.

## Tech Stack

- **Frontend:** Nuxt 4 + Nuxt UI v4.5 + Tailwind CSS v4 + Apache ECharts 6.0 (via `nuxt-echarts`)
- **Backend:** Supabase (PostgreSQL + Edge Functions + pg_cron) — no custom backend server
- **Hosting:** Cloudflare Pages (`nitro: { preset: 'cloudflare_pages' }`)
- **Package manager:** pnpm (always use pnpm, never npm/yarn)
- **Testing:** Vitest + `@nuxt/test-utils`
- **Linting:** `@nuxt/eslint-config` (ESLint flat config)

## Commands

```bash
# Dev
pnpm dev                          # Nuxt dev server (HMR)
supabase start                    # Local PostgreSQL + Edge Functions
supabase functions serve           # Test Edge Functions locally

# Build & Deploy
pnpm build                        # Production build
pnpm lint                         # ESLint
pnpm test                         # Vitest unit tests
pnpm test -- tests/unit/utils/formatters.test.ts  # Single test file

# Database
supabase db push                  # Apply migrations to remote
supabase gen types typescript     # Regenerate TS types from schema (run after every migration)
supabase migration new <name>     # Create new migration

# Edge Functions
supabase functions deploy <name>  # Deploy single Edge Function
```

## Architecture

### Data Flow

```
APIs (Sentry, GitHub, DebugBear, Dependabot)
  → Supabase Edge Functions (collectors, adaptive frequency)
    → metrics_raw (30d retention)
      → pg_cron rollup → metrics_daily (12mo) → metrics_weekly → metrics_monthly (permanent)
        → PostgREST → Nuxt composables → ECharts dashboard
```

### API Pattern (Hybrid)

- **Read (dashboard):** Supabase client (`@nuxtjs/supabase`) → PostgREST — zero backend code
- **Write (collectors):** Supabase Edge Functions with service role key → direct DB insert

### Data Model — Star Schema

- **Fact tables:** `metrics_raw`, `metrics_daily`, `metrics_weekly`, `metrics_monthly`
- **Dimension tables:** `dim_sources`, `dim_metric_types`, `dim_repositories`
- **Events:** `deployments`, `collection_logs`
- Migrations are versioned SQL in `supabase/migrations/`

### Collector Architecture

Each collector is an isolated Supabase Edge Function implementing `collect(): Promise<CollectResult>`. Shared code in `supabase/functions/_shared/` (retry, logger, types). A collector failure never impacts other sources.

| Source | Frequency | Edge Function |
|--------|-----------|---------------|
| Sentry | 5 min | `collect-sentry` |
| GitHub (deploys) | 15 min | `collect-github` |
| DebugBear/CWV | Weekly | `collect-debugbear` |
| Dependabot | Daily | `collect-dependabot` |
| PHPUnit coverage | Daily | `collect-coverage` |

## Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| DB tables | `snake_case`, plural | `metrics_raw`, `collection_logs` |
| DB columns | `snake_case` | `created_at`, `source_id` |
| DB functions | `fn_{action}_{object}` | `fn_rollup_daily()` |
| DB indexes | `idx_{table}_{columns}` | `idx_metrics_raw_source_id_created_at` |
| API endpoints (Nitro) | `kebab-case`, plural | `/api/collectors/`, `/api/health/` |
| JSON response fields | `snake_case` (aligned with DB) | `{ "metric_value": 42 }` |
| Vue components | `PascalCase.vue` | `MetricChart.vue` |
| Composables | `camelCase.ts` | `useMetrics.ts` |
| TS variables/functions | `camelCase` | `getLatestMetrics()` |
| Types/Interfaces | `PascalCase` | `CollectResult`, `MetricRow` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Vue props | `camelCase` declaration, `kebab-case` template | `:metric-data="data"` |

## Key Patterns

### State Management

Use Nuxt/Vue primitives only — no Pinia:
- `useState('key', () => default)` for shared state (selected repo, period)
- `useAsyncData('key', () => fetch)` for server data
- Never mutate `useAsyncData` result directly — use `refresh()`

### Error Handling

| Layer | Pattern |
|-------|---------|
| Collectors | try/catch → log to `collection_logs` → never throw beyond collector |
| Nitro API | `createError({ statusCode, message })` |
| Frontend | `useAsyncData` error ref → `UAlert` component |

### API Response Format (Nitro routes, not PostgREST)

```typescript
// Success: { data: T, error: null }
// Error:   { data: null, error: { code: string, message: string } }
```

### Retry (Collectors)

`retryWithBackoff(fn, maxRetries=3, baseDelayMs=1000)` — exponential backoff (1s, 2s, 4s). Log each attempt. After 3 failures: mark `status: 'failed'` and move on.

### Dates

ISO 8601 everywhere (`2026-03-09T14:30:00Z`). PostgreSQL `timestamptz`. Display in local via `Intl.DateTimeFormat`.

### Nulls

Explicit `null` in API responses (not `undefined`, not omitted fields).

## Anti-Patterns to Avoid

- `$fetch` or `onMounted` fetch instead of `useAsyncData`/`useFetch`
- `snake_case` in TypeScript code (DB field mapping happens at the Supabase client boundary)
- `console.log` in collectors — always use `collection_logs` table
- `any` type — use Supabase-generated types
- Custom loading state — use `pending` from `useAsyncData` + `USkeleton`
- Cache layers for MVP — rollup tables provide sufficient performance

## Project Structure

```
app/
├── pages/           # index, stability, performance, security, quality, report, health
├── components/      # Flat by domain: dashboard/, metrics/, report/, anomalies/, common/
├── composables/     # useMetrics, useAnomalies, useCollectionStatus, useDeployments, useReport, usePeriod
├── layouts/         # default.vue (sidebar + header)
└── utils/           # formatters, chartConfig, anomalyEngine
server/
├── api/             # health.get.ts
└── utils/           # supabase.ts (server-side client)
supabase/
├── migrations/      # Versioned SQL (00001_create_dimensions.sql, etc.)
├── functions/       # Edge Functions (collectors + _shared/)
└── seed.sql
tests/
├── unit/            # {module}.test.ts
└── fixtures/
```

## Planning Documents

Full specs are in `_bmad-output/planning-artifacts/`:
- `prd.md` — PRD with 31 FRs and 15 NFRs
- `architecture.md` — Architecture decisions, patterns, complete directory structure
- `epics.md` — 6 epics with detailed stories and acceptance criteria
- `ux-design-specification.md` — UX spec, component mapping, dark mode
- `research/` — 7 technical research documents (Supabase, time-series DB, polling strategies, etc.)

## Implementation Sequence

Epic 1 (Foundation) → Epic 2 (Multi-sources) → Epic 3 (M/M-1 comparison) → Epic 4 (Anomaly detection) → Epic 5 (Monthly report) → Epic 6 (Data ops & CI/CD)

First steps: `pnpm dlx nuxi@latest init . -t ui` → configure Supabase → create star schema → first collector (Sentry) → first dashboard page.
