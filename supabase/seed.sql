-- Seed data for dimension tables

-- Sources
INSERT INTO dim_sources (name, display_name, frequency_minutes) VALUES
  ('sentry', 'Sentry', 5),
  ('github', 'GitHub Deployments', 15),
  ('debugbear', 'DebugBear', 10080),
  ('dependabot', 'Dependabot', 1440),
  ('coverage', 'PHPUnit Coverage', 1440);

-- Metric types
INSERT INTO dim_metric_types (name, axis, unit, display_name) VALUES
  ('new_errors', 'stability', 'count', 'Nouvelles erreurs'),
  ('resolved_errors', 'stability', 'count', 'Erreurs résolues'),
  ('error_rate', 'stability', 'ratio', 'Taux d''erreurs'),
  ('avg_resolution_time', 'stability', 'ms', 'Temps moyen de résolution'),
  ('lcp', 'performance', 'ms', 'Largest Contentful Paint'),
  ('cls', 'performance', 'ratio', 'Cumulative Layout Shift'),
  ('inp', 'performance', 'ms', 'Interaction to Next Paint'),
  ('vuln_critical', 'security', 'count', 'Vulnérabilités critiques'),
  ('vuln_high', 'security', 'count', 'Vulnérabilités hautes'),
  ('vuln_medium', 'security', 'count', 'Vulnérabilités moyennes'),
  ('vuln_low', 'security', 'count', 'Vulnérabilités basses'),
  ('coverage_lines', 'quality', 'percent', 'Coverage Lines'),
  ('coverage_functions', 'quality', 'percent', 'Coverage Functions'),
  ('coverage_classes', 'quality', 'percent', 'Coverage Classes');

-- Repositories (MVP: International only)
INSERT INTO dim_repositories (name, display_name, github_org, github_repo) VALUES
  ('international', 'International', 'wamiz', 'wamiz-international');
