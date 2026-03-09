-- Cleanup functions: data retention enforcement

CREATE OR REPLACE FUNCTION fn_cleanup_old_raw()
RETURNS void AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM metrics_raw
  WHERE collected_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'fn_cleanup_old_raw: deleted % rows', deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_cleanup_old_daily()
RETURNS void AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM metrics_daily
  WHERE period_start < (CURRENT_DATE - INTERVAL '12 months');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'fn_cleanup_old_daily: deleted % rows', deleted_count;
END;
$$ LANGUAGE plpgsql;
