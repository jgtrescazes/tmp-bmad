-- Rollup functions: aggregate raw metrics into daily/weekly/monthly

CREATE OR REPLACE FUNCTION fn_rollup_daily()
RETURNS void AS $$
BEGIN
  INSERT INTO metrics_daily (source_id, metric_type_id, repository_id, value_avg, value_min, value_max, sample_count, period_start)
  SELECT
    source_id,
    metric_type_id,
    repository_id,
    AVG(value),
    MIN(value),
    MAX(value),
    COUNT(*)::INTEGER,
    DATE(collected_at)
  FROM metrics_raw
  WHERE collected_at < NOW() - INTERVAL '1 hour'
    AND DATE(collected_at) < CURRENT_DATE
  GROUP BY source_id, metric_type_id, repository_id, DATE(collected_at)
  ON CONFLICT (source_id, metric_type_id, repository_id, period_start)
  DO UPDATE SET
    value_avg = EXCLUDED.value_avg,
    value_min = EXCLUDED.value_min,
    value_max = EXCLUDED.value_max,
    sample_count = EXCLUDED.sample_count,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_rollup_weekly()
RETURNS void AS $$
BEGIN
  INSERT INTO metrics_weekly (source_id, metric_type_id, repository_id, value_avg, value_min, value_max, sample_count, period_start)
  SELECT
    source_id,
    metric_type_id,
    repository_id,
    AVG(value_avg),
    MIN(value_min),
    MAX(value_max),
    SUM(sample_count)::INTEGER,
    DATE_TRUNC('week', period_start)::DATE
  FROM metrics_daily
  WHERE period_start < DATE_TRUNC('week', CURRENT_DATE)
  GROUP BY source_id, metric_type_id, repository_id, DATE_TRUNC('week', period_start)
  ON CONFLICT (source_id, metric_type_id, repository_id, period_start)
  DO UPDATE SET
    value_avg = EXCLUDED.value_avg,
    value_min = EXCLUDED.value_min,
    value_max = EXCLUDED.value_max,
    sample_count = EXCLUDED.sample_count,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_rollup_monthly()
RETURNS void AS $$
BEGIN
  INSERT INTO metrics_monthly (source_id, metric_type_id, repository_id, value_avg, value_min, value_max, sample_count, period_start)
  SELECT
    source_id,
    metric_type_id,
    repository_id,
    AVG(value_avg),
    MIN(value_min),
    MAX(value_max),
    SUM(sample_count)::INTEGER,
    DATE_TRUNC('month', period_start)::DATE
  FROM metrics_daily
  WHERE period_start < DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY source_id, metric_type_id, repository_id, DATE_TRUNC('month', period_start)
  ON CONFLICT (source_id, metric_type_id, repository_id, period_start)
  DO UPDATE SET
    value_avg = EXCLUDED.value_avg,
    value_min = EXCLUDED.value_min,
    value_max = EXCLUDED.value_max,
    sample_count = EXCLUDED.sample_count,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;
