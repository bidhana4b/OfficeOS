ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_boost_budget NUMERIC DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS boost_budget_currency TEXT DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referrer_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

CREATE OR REPLACE FUNCTION auto_create_client_resources()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency)
  VALUES (NEW.id, 0, 'BDT')
  ON CONFLICT (client_id) DO NOTHING;

  INSERT INTO workspaces (tenant_id, client_id, name, description, type)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.business_name || ' Workspace',
    'Auto-created workspace for ' || NEW.business_name,
    'client'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO ws_id;

  IF ws_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, description, type, is_default)
    VALUES
      (ws_id, 'general', 'General discussion', 'text', true),
      (ws_id, 'deliverables', 'Deliverable updates & approvals', 'text', true),
      (ws_id, 'boost', 'Boost campaign discussions', 'text', true),
      (ws_id, 'billing', 'Billing & invoice discussions', 'text', true),
      (ws_id, 'internal', 'Internal team discussion (client cannot see)', 'text', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;
CREATE TRIGGER trg_auto_create_client_resources
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_resources();
