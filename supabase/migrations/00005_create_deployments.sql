-- Deployment events tracked from GitHub

CREATE TABLE deployments (
  id BIGSERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES dim_repositories(id),
  sha TEXT NOT NULL,
  short_sha TEXT GENERATED ALWAYS AS (LEFT(sha, 7)) STORED,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  pr_number INTEGER,
  deployed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, sha)
);

CREATE INDEX idx_deployments_repo_date ON deployments(repository_id, deployed_at);
