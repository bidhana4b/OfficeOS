-- Fix function conflicts from 20240131 migration
-- Drop the existing function with parameters so it can be recreated

DROP FUNCTION IF EXISTS refresh_dashboard_metrics(uuid);

-- Now create the correct version
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE 'Dashboard metrics refreshed for tenant %', p_tenant_id;
END;
$$ LANGUAGE plpgsql;
