# Story 6.3: Pipeline CI/CD GitHub Actions

Status: ready-for-dev

## Story

As a **développeur**,
I want **un pipeline CI/CD automatisé qui lint, teste et déploie sur Cloudflare**,
So that **chaque merge sur main est automatiquement déployé**.

## Acceptance Criteria

1. **Given** une PR ouverte **When** le workflow CI s'exécute **Then** ESLint et Vitest passent
2. **Given** une PR mergée sur main **When** le workflow deploy s'exécute **Then** l'app est buildée et déployée sur Cloudflare Pages via wrangler (NFR15)
3. **Given** le déploiement **Then** il est vérifiable via l'URL de production

## Tasks / Subtasks

- [ ] Task 1: Workflow CI (PR) (AC: #1)
  - [ ] 1.1 Créer `.github/workflows/ci.yml`
  - [ ] 1.2 Steps : checkout, setup Node, setup pnpm (`pnpm/action-setup`), install (`pnpm install --frozen-lockfile`), lint (`pnpm lint`), typecheck (`pnpm nuxi typecheck`), test (`pnpm test`)
  - [ ] 1.3 Déclencher sur `pull_request` (branches: `main`)
  - [ ] 1.4 Configurer le cache pnpm store (`actions/cache` avec `pnpm store path`)
- [ ] Task 2: Workflow Deploy (main) (AC: #2, #3)
  - [ ] 2.1 Créer `.github/workflows/deploy.yml`
  - [ ] 2.2 Steps : checkout, setup Node, setup pnpm, install, build (`pnpm build`), deploy via wrangler (`npx wrangler pages deploy`)
  - [ ] 2.3 Déclencher sur `push` (branches: `main`)
  - [ ] 2.4 Configurer les secrets GitHub : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
  - [ ] 2.5 Passer les variables d'environnement Supabase au build (`SUPABASE_URL`, `SUPABASE_KEY`)
- [ ] Task 3: Configuration Cloudflare (AC: #2, #3)
  - [ ] 3.1 Créer `wrangler.toml` si nécessaire (name, compatibility_date, pages config)
  - [ ] 3.2 Documenter les secrets requis dans `.env.example`
- [ ] Task 4: Tests et validation (AC: #1, #2)
  - [ ] 4.1 Valider le workflow CI localement (dry-run ou `act`)
  - [ ] 4.2 Vérifier que le build fonctionne en mode production (`pnpm build`)
  - [ ] 4.3 Vérifier que le output directory correspond à ce que wrangler attend

## Dev Notes

### Workflow CI — Structure

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm nuxi typecheck
      - run: pnpm test
```

### Workflow Deploy — Structure

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=watchtower
```

### Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Token API Cloudflare avec permissions Pages |
| `CLOUDFLARE_ACCOUNT_ID` | ID du compte Cloudflare |
| `SUPABASE_URL` | URL de l'instance Supabase de production |
| `SUPABASE_KEY` | Clé anon Supabase (utilisée côté client) |

### Nitro preset et output

Le preset `cloudflare_pages` dans `nuxt.config.ts` génère le output dans `dist/`. C'est ce dossier que wrangler déploie.

### Cache pnpm

`pnpm/action-setup@v4` détecte automatiquement la version pnpm depuis `package.json` (`packageManager` field). Le cache est géré par `actions/setup-node@v4` avec `cache: 'pnpm'`.

### Anti-patterns à éviter

- **NE PAS** utiliser npm ou yarn — toujours pnpm
- **NE PAS** hardcoder les secrets dans les fichiers de workflow
- **NE PAS** skip les hooks (`--no-verify`) dans le pipeline
- **NE PAS** utiliser `pnpm install` sans `--frozen-lockfile` en CI

### References

- [Source: prd.md#NFR15] — CI/CD automatisé
- [Source: architecture.md#Hosting] — Cloudflare Pages avec preset `cloudflare_pages`
- [Source: CLAUDE.md#Commands] — Commandes build et lint
- [Source: epics.md#Story 6.3] — Acceptance criteria

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
