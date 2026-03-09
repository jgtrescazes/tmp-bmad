-- Fact table: raw metrics (30-day retention)

CREATE TABLE metrics_raw (
  id BIGSERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES dim_sources(id),
  metric_type_id INTEGER NOT NULL REFERENCES dim_metric_types(id),
  repository_id INTEGER NOT NULL REFERENCES dim_repositories(id),
  value NUMERIC NOT NULL,
  metadata JSONB,
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_raw_source_collected ON metrics_raw(source_id, collected_at);
CREATE INDEX idx_metrics_raw_repo_type_collected ON metrics_raw(repository_id, metric_type_id, collected_at);
