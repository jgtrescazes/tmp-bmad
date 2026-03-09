-- pg_cron schedules for rollup, cleanup, and collector invocation
-- Requires pg_cron and pg_net extensions (enabled in Supabase by default)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Rollup daily: every day at 02:00 UTC
SELECT cron.schedule('rollup-daily', '0 2 * * *', $$SELECT fn_rollup_daily()$$);

-- Rollup weekly: every Monday at 02:30 UTC
SELECT cron.schedule('rollup-weekly', '30 2 * * 1', $$SELECT fn_rollup_weekly()$$);

-- Rollup monthly: 1st of month at 02:45 UTC
SELECT cron.schedule('rollup-monthly', '45 2 1 * *', $$SELECT fn_rollup_monthly()$$);

-- Cleanup raw data (>30 days): every day at 03:00 UTC
SELECT cron.schedule('cleanup-raw', '0 3 * * *', $$SELECT fn_cleanup_old_raw()$$);

-- Cleanup daily data (>12 months): 1st of month at 04:00 UTC
SELECT cron.schedule('cleanup-daily', '0 4 1 * *', $$SELECT fn_cleanup_old_daily()$$);

-- Collector schedules (invoke Edge Functions via pg_net)
-- Secrets stored in Supabase Vault, not hardcoded

-- Sentry: every 5 minutes
SELECT cron.schedule(
  'collect-sentry',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/collect-sentry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- GitHub deployments: every 15 minutes
SELECT cron.schedule(
  'collect-github',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/collect-github',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- Dependabot: daily at 06:00
SELECT cron.schedule(
  'collect-dependabot',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/collect-dependabot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- DebugBear: weekly Monday at 07:00
SELECT cron.schedule(
  'collect-debugbear',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/collect-debugbear',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- PHPUnit coverage: daily at 06:30
SELECT cron.schedule(
  'collect-coverage',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/collect-coverage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);
