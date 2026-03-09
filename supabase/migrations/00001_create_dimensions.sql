-- Dimension tables for star schema

CREATE TABLE dim_sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  frequency_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dim_metric_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  axis TEXT NOT NULL CHECK (axis IN ('stability', 'performance', 'security', 'quality')),
  unit TEXT,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dim_repositories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  github_org TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
