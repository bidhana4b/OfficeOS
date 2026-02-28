ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS logo TEXT;

CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_ws_id UUID;
BEGIN
  INSERT INTO workspaces (client_id, client_name, client_logo, tenant_id, status)
  VALUES (NEW.id, NEW.business_name, NEW.logo, NEW.tenant_id, 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_ws_id;

  IF v_ws_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, type, icon, tenant_id) VALUES
      (v_ws_id, 'general', 'general', 'hash', NEW.tenant_id),
      (v_ws_id, 'deliverables', 'deliverables', 'package', NEW.tenant_id),
      (v_ws_id, 'boost-requests', 'boost-requests', 'zap', NEW.tenant_id),
      (v_ws_id, 'billing', 'billing', 'credit-card', NEW.tenant_id),
      (v_ws_id, 'internal', 'internal', 'lock', NEW.tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
