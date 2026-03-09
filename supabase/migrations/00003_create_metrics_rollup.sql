-- Rollup tables: daily (12mo), weekly, monthly (permanent)

CREATE TABLE metrics_daily (
  id BIGSERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES dim_sources(id),
  metric_type_id INTEGER NOT NULL REFERENCES dim_metric_types(id),
  repository_id INTEGER NOT NULL REFERENCES dim_repositories(id),
  value_avg NUMERIC NOT NULL,
  value_min NUMERIC,
  value_max NUMERIC,
  sample_count INTEGER NOT NULL,
  period_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, metric_type_id, repository_id, period_start)
);

CREATE INDEX idx_metrics_daily_repo_period ON metrics_daily(repository_id, period_start);

CREATE TABLE metrics_weekly (
  id BIGSERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES dim_sources(id),
  metric_type_id INTEGER NOT NULL REFERENCES dim_metric_types(id),
  repository_id INTEGER NOT NULL REFERENCES dim_repositories(id),
  value_avg NUMERIC NOT NULL,
  value_min NUMERIC,
  value_max NUMERIC,
  sample_count INTEGER NOT NULL,
  period_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, metric_type_id, repository_id, period_start)
);

CREATE INDEX idx_metrics_weekly_repo_period ON metrics_weekly(repository_id, period_start);

CREATE TABLE metrics_monthly (
  id BIGSERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES dim_sources(id),
  metric_type_id INTEGER NOT NULL REFERENCES dim_metric_types(id),
  repository_id INTEGER NOT NULL REFERENCES dim_repositories(id),
  value_avg NUMERIC NOT NULL,
  value_min NUMERIC,
  value_max NUMERIC,
  sample_count INTEGER NOT NULL,
  period_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, metric_type_id, repository_id, period_start)
);

CREATE INDEX idx_metrics_monthly_repo_period ON metrics_monthly(repository_id, period_start);
