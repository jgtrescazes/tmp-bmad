-- Collection logs: track collector execution status

CREATE TABLE collection_logs (
  id BIGSERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES dim_sources(id),
  repository_id INTEGER NOT NULL REFERENCES dim_repositories(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  rows_collected INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_logs_source_status ON collection_logs(source_id, status, completed_at);
