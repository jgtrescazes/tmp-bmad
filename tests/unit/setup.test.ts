import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

describe('Project Setup', () => {
  it('has nuxt.config.ts with required modules', () => {
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf-8')
    expect(config).toContain('@nuxt/ui')
    expect(config).toContain('@nuxtjs/supabase')
    expect(config).toContain('@nuxt/eslint')
    expect(config).toContain('@vueuse/nuxt')
  })

  it('has supabase configured with redirect disabled', () => {
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf-8')
    expect(config).toContain('redirect: false')
  })

  it('has cloudflare_pages preset configured', () => {
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf-8')
    expect(config).toContain('preset: \'cloudflare_pages\'')
  })

  it('has .env.example with all required variables', () => {
    const envExample = readFileSync(resolve(root, '.env.example'), 'utf-8')
    expect(envExample).toContain('SUPABASE_URL')
    expect(envExample).toContain('SUPABASE_KEY')
    expect(envExample).toContain('SUPABASE_SECRET_KEY')
    expect(envExample).toContain('SENTRY_AUTH_TOKEN')
    expect(envExample).toContain('GITHUB_TOKEN')
    expect(envExample).toContain('DEBUGBEAR_API_KEY')
  })

  it('has eslint.config.mjs', () => {
    expect(existsSync(resolve(root, 'eslint.config.mjs'))).toBe(true)
  })
})

describe('Pages Structure', () => {
  const pages = ['index', 'stability', 'performance', 'security', 'quality', 'report', 'health']

  pages.forEach((page) => {
    it(`has ${page}.vue page`, () => {
      expect(existsSync(resolve(root, `app/pages/${page}.vue`))).toBe(true)
    })
  })
})

describe('Supabase Migrations', () => {
  const migrations = [
    '00001_create_dimensions.sql',
    '00002_create_metrics_raw.sql',
    '00003_create_metrics_rollup.sql',
    '00004_create_collection_logs.sql',
    '00005_create_deployments.sql',
    '00006_create_rollup_functions.sql',
    '00007_create_cleanup_functions.sql',
    '00008_create_cron_jobs.sql'
  ]

  migrations.forEach((migration) => {
    it(`has migration ${migration}`, () => {
      expect(existsSync(resolve(root, `supabase/migrations/${migration}`))).toBe(true)
    })
  })

  it('has seed.sql with dimension data', () => {
    const seed = readFileSync(resolve(root, 'supabase/seed.sql'), 'utf-8')
    expect(seed).toContain('dim_sources')
    expect(seed).toContain('dim_metric_types')
    expect(seed).toContain('dim_repositories')
    expect(seed).toContain('international')
  })
})

describe('Database Schema - Dimensions', () => {
  const dimSql = readFileSync(resolve(root, 'supabase/migrations/00001_create_dimensions.sql'), 'utf-8')

  it('creates dim_sources table', () => {
    expect(dimSql).toContain('CREATE TABLE dim_sources')
    expect(dimSql).toContain('frequency_minutes')
  })

  it('creates dim_metric_types table with axis constraint', () => {
    expect(dimSql).toContain('CREATE TABLE dim_metric_types')
    expect(dimSql).toContain('axis IN (\'stability\', \'performance\', \'security\', \'quality\')')
  })

  it('creates dim_repositories table', () => {
    expect(dimSql).toContain('CREATE TABLE dim_repositories')
    expect(dimSql).toContain('github_org')
    expect(dimSql).toContain('github_repo')
  })
})

describe('Database Schema - Fact Tables', () => {
  it('creates metrics_raw with proper indexes', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00002_create_metrics_raw.sql'), 'utf-8')
    expect(sql).toContain('CREATE TABLE metrics_raw')
    expect(sql).toContain('idx_metrics_raw_source_collected')
    expect(sql).toContain('idx_metrics_raw_repo_type_collected')
    expect(sql).toContain('REFERENCES dim_sources')
    expect(sql).toContain('REFERENCES dim_metric_types')
    expect(sql).toContain('REFERENCES dim_repositories')
  })

  it('creates rollup tables with UNIQUE constraints', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00003_create_metrics_rollup.sql'), 'utf-8')
    expect(sql).toContain('CREATE TABLE metrics_daily')
    expect(sql).toContain('CREATE TABLE metrics_weekly')
    expect(sql).toContain('CREATE TABLE metrics_monthly')
    expect(sql).toContain('UNIQUE(source_id, metric_type_id, repository_id, period_start)')
  })

  it('creates collection_logs table', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00004_create_collection_logs.sql'), 'utf-8')
    expect(sql).toContain('CREATE TABLE collection_logs')
    expect(sql).toContain('status IN (\'success\', \'failed\', \'partial\')')
  })

  it('creates deployments table with generated short_sha', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00005_create_deployments.sql'), 'utf-8')
    expect(sql).toContain('CREATE TABLE deployments')
    expect(sql).toContain('GENERATED ALWAYS AS')
    expect(sql).toContain('LEFT(sha, 7)')
  })
})

describe('Database Schema - Functions', () => {
  it('creates rollup functions', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00006_create_rollup_functions.sql'), 'utf-8')
    expect(sql).toContain('fn_rollup_daily')
    expect(sql).toContain('fn_rollup_weekly')
    expect(sql).toContain('fn_rollup_monthly')
    expect(sql).toContain('ON CONFLICT')
  })

  it('creates cleanup functions with retention periods', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00007_create_cleanup_functions.sql'), 'utf-8')
    expect(sql).toContain('fn_cleanup_old_raw')
    expect(sql).toContain('fn_cleanup_old_daily')
    expect(sql).toContain('INTERVAL \'30 days\'')
    expect(sql).toContain('INTERVAL \'12 months\'')
  })

  it('creates cron jobs for rollup and collectors', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/00008_create_cron_jobs.sql'), 'utf-8')
    expect(sql).toContain('cron.schedule')
    expect(sql).toContain('rollup-daily')
    expect(sql).toContain('collect-sentry')
    expect(sql).toContain('collect-github')
    expect(sql).toContain('collect-dependabot')
    expect(sql).toContain('collect-debugbear')
    expect(sql).toContain('collect-coverage')
    expect(sql).toContain('vault.decrypted_secrets')
  })
})

describe('Navigation Layout', () => {
  it('has sidebar with watchtower navigation links', () => {
    const layout = readFileSync(resolve(root, 'app/layouts/default.vue'), 'utf-8')
    expect(layout).toContain('/stability')
    expect(layout).toContain('/performance')
    expect(layout).toContain('/security')
    expect(layout).toContain('/quality')
    expect(layout).toContain('/report')
    expect(layout).toContain('/health')
    expect(layout).toContain('Watchtower')
  })
})
