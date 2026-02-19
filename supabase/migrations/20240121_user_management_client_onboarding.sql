-- =====================================================
-- PHASE 2 & 3: USER MANAGEMENT + CLIENT ONBOARDING
-- Creates triggers and functions for full user lifecycle
-- =====================================================

-- 1. Auto-create client_wallet when a client is created
CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency)
  VALUES (NEW.id, 0, 'BDT')
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- 2. Auto-create workspace + default channels when a client is created
CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  INSERT INTO workspaces (tenant_id, client_id, client_name, status, health_score)
  VALUES (NEW.tenant_id, NEW.id, NEW.business_name, COALESCE(NEW.status, 'active'), COALESCE(NEW.health_score, 100))
  RETURNING id INTO v_workspace_id;

  INSERT INTO channels (workspace_id, name, type, icon) VALUES
    (v_workspace_id, 'General', 'general', 'hash'),
    (v_workspace_id, 'Deliverables', 'deliverables', 'package'),
    (v_workspace_id, 'Boost Requests', 'boost-requests', 'zap'),
    (v_workspace_id, 'Billing', 'billing', 'credit-card'),
    (v_workspace_id, 'Internal', 'internal', 'lock');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();

-- 3. Add link columns to demo_users if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'user_profile_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 4. Backfill existing wallets for clients that don't have one
INSERT INTO client_wallets (client_id, balance, currency)
SELECT c.id, 0, 'BDT'
FROM clients c
LEFT JOIN client_wallets cw ON cw.client_id = c.id
WHERE cw.id IS NULL
ON CONFLICT (client_id) DO NOTHING;
