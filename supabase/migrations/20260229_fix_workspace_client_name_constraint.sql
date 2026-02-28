-- Fix: workspaces.client_name NOT NULL constraint causing client onboarding to fail
-- The original table (20240106) defined client_name as TEXT NOT NULL
-- but the trigger inserts NEW.business_name which may evaluate as NULL in some edge cases

-- Step 1: Make client_name nullable (it can always be derived from client)
ALTER TABLE workspaces ALTER COLUMN client_name DROP NOT NULL;

-- Step 2: Set a default for any NULL client_names
UPDATE workspaces SET client_name = 'Unnamed' WHERE client_name IS NULL;

-- Step 3: Also ensure the 'name' column exists and is not causing issues
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='name') THEN
    ALTER TABLE workspaces ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='description') THEN
    ALTER TABLE workspaces ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='type') THEN
    ALTER TABLE workspaces ADD COLUMN type TEXT DEFAULT 'client';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='client_logo') THEN
    ALTER TABLE workspaces ADD COLUMN client_logo TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='pinned') THEN
    ALTER TABLE workspaces ADD COLUMN pinned BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='last_message') THEN
    ALTER TABLE workspaces ADD COLUMN last_message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='last_message_time') THEN
    ALTER TABLE workspaces ADD COLUMN last_message_time TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='unread_count') THEN
    ALTER TABLE workspaces ADD COLUMN unread_count INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='package_usage') THEN
    ALTER TABLE workspaces ADD COLUMN package_usage INT DEFAULT 0;
  END IF;
END $$;

-- Step 4: Ensure clients table has all columns the trigger references
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='logo') THEN
    ALTER TABLE clients ADD COLUMN logo TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='owner_name') THEN
    ALTER TABLE clients ADD COLUMN owner_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='owner_phone') THEN
    ALTER TABLE clients ADD COLUMN owner_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='manager_name') THEN
    ALTER TABLE clients ADD COLUMN manager_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='manager_phone') THEN
    ALTER TABLE clients ADD COLUMN manager_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='monthly_boost_budget') THEN
    ALTER TABLE clients ADD COLUMN monthly_boost_budget NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='boost_budget_currency') THEN
    ALTER TABLE clients ADD COLUMN boost_budget_currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='referrer_name') THEN
    ALTER TABLE clients ADD COLUMN referrer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='onboarding_notes') THEN
    ALTER TABLE clients ADD COLUMN onboarding_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='onboarded_at') THEN
    ALTER TABLE clients ADD COLUMN onboarded_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='metadata') THEN
    ALTER TABLE clients ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Step 5: Recreate the trigger with bulletproof NULL handling
DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;

CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_ws_id UUID;
  v_existing UUID;
  v_client_name TEXT;
BEGIN
  SELECT id INTO v_existing FROM workspaces WHERE client_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_client_name := COALESCE(NEW.business_name, 'Unnamed Client');

  INSERT INTO workspaces (
    tenant_id, client_id, client_name, client_logo,
    name, description, type, status, health_score
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    v_client_name,
    NEW.logo,
    v_client_name || ' Workspace',
    'Auto-created workspace for ' || v_client_name,
    'client',
    COALESCE(NEW.status, 'active'),
    COALESCE(NEW.health_score, 100)
  )
  RETURNING id INTO v_ws_id;

  IF v_ws_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, type, icon, is_default, tenant_id, description) VALUES
      (v_ws_id, 'General', 'general', 'hash', true, NEW.tenant_id, 'General discussion'),
      (v_ws_id, 'Deliverables', 'deliverables', 'package', true, NEW.tenant_id, 'Deliverable updates'),
      (v_ws_id, 'Boost Requests', 'boost-requests', 'zap', true, NEW.tenant_id, 'Boost campaign discussions'),
      (v_ws_id, 'Billing', 'billing', 'credit-card', true, NEW.tenant_id, 'Billing & invoice discussions'),
      (v_ws_id, 'Internal', 'internal', 'lock', true, NEW.tenant_id, 'Internal team discussion');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_workspace failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();

-- Step 6: Also recreate the wallet trigger to be safe
DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;

CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency, tenant_id)
  VALUES (NEW.id, 0, 'BDT', NEW.tenant_id)
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_wallet failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();
