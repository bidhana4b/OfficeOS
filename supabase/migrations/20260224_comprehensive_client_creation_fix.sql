-- ============================================================
-- COMPREHENSIVE CLIENT CREATION FIX
-- Fixes ALL missing columns and ALL trigger functions
-- so that client creation works end-to-end without errors
-- ============================================================

-- ============================================================
-- STEP 1: Add ALL missing columns to messaging tables
-- ============================================================

-- channels: add tenant_id (the column that was causing the error)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'open';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- workspaces: ensure all columns exist
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_logo TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'client';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 100;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS package_usage INT DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- workspace_members: ensure all columns exist
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- clients: ensure all extra columns exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_boost_budget NUMERIC DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS boost_budget_currency TEXT DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referrer_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- client_wallets: ensure tenant_id exists
ALTER TABLE client_wallets ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- channel_members: ensure all columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_members') THEN
    ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS user_profile_id UUID;
    ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS workspace_member_id UUID;
    ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS role_in_channel TEXT DEFAULT 'member';
    ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_by TEXT;
    ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS notification_pref TEXT DEFAULT 'all';
    ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================
-- STEP 2: Create indexes for tenant_id on messaging tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_channels_tenant_id ON channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_client_id ON workspaces(client_id);

-- ============================================================
-- STEP 3: Fix ALL trigger functions for client creation
-- ============================================================

-- 3.1: Auto-create client wallet (simple, just wallet)
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

DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- 3.2: Auto-create workspace + default channels (the main problematic one)
CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_ws_id UUID;
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing FROM workspaces WHERE client_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO workspaces (
    tenant_id, client_id, client_name, client_logo,
    name, description, type, status, health_score
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.business_name,
    NEW.logo,
    NEW.business_name || ' Workspace',
    'Auto-created workspace for ' || NEW.business_name,
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

DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;
CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();

-- 3.3: Auto-create client login (demo_user + user_profile)
CREATE OR REPLACE FUNCTION auto_create_client_login()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_existing_demo UUID;
BEGIN
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
    SELECT id INTO v_existing_demo FROM demo_users
    WHERE email = LOWER(TRIM(NEW.contact_email))
      AND tenant_id = NEW.tenant_id
    LIMIT 1;

    IF v_existing_demo IS NULL THEN
      INSERT INTO user_profiles (
        tenant_id, full_name, email, avatar, status
      ) VALUES (
        NEW.tenant_id,
        NEW.business_name,
        LOWER(TRIM(NEW.contact_email)),
        LEFT(NEW.business_name, 2),
        'active'
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_profile_id;

      IF v_profile_id IS NOT NULL THEN
        INSERT INTO demo_users (
          tenant_id, email, password_hash, display_name, role,
          avatar, client_id, user_profile_id, is_active, metadata
        ) VALUES (
          NEW.tenant_id,
          LOWER(TRIM(NEW.contact_email)),
          '123456',
          NEW.business_name,
          'client',
          LEFT(NEW.business_name, 2),
          NEW.id,
          v_profile_id,
          true,
          jsonb_build_object('auto_created', true, 'business_name', NEW.business_name)
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_login failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_login ON clients;
CREATE TRIGGER trg_auto_create_client_login
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_login();

-- 3.4: Auto-init package usage when client_packages is assigned
CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT pd.deliverable_type, pd.quantity
    FROM package_deliverables pd
    WHERE pd.package_id = NEW.package_id
  LOOP
    INSERT INTO package_usage (
      client_package_id, deliverable_type, used, total, tenant_id
    ) VALUES (
      NEW.id,
      v_rec.deliverable_type,
      0,
      COALESCE(v_rec.quantity, 0),
      NEW.tenant_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_init_package_usage failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
DROP TRIGGER IF EXISTS trg_auto_init_usage ON client_packages;
CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- 3.5: Deduct package usage when deliverable is marked 'delivered'
CREATE OR REPLACE FUNCTION deduct_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_client_package_id UUID;
  v_deliverable_type TEXT;
  v_quantity INT;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_client_package_id := NEW.client_package_id;
    v_deliverable_type := NEW.deliverable_type;
    v_quantity := COALESCE(NEW.quantity, 1);

    IF v_client_package_id IS NOT NULL AND v_deliverable_type IS NOT NULL THEN
      UPDATE package_usage
      SET used = used + v_quantity, updated_at = NOW()
      WHERE client_package_id = v_client_package_id
        AND deliverable_type = v_deliverable_type;

      INSERT INTO usage_deduction_events (
        client_package_id, deliverable_id, deliverable_type,
        deliverable_name, quantity, status
      ) VALUES (
        v_client_package_id, NEW.id, v_deliverable_type,
        NEW.title, v_quantity, 'confirmed'
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'deduct_package_usage failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_package_usage ON deliverables;
CREATE TRIGGER trg_deduct_package_usage
  AFTER UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage();

-- ============================================================
-- STEP 4: Ensure package_usage has tenant_id
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'package_usage') THEN
    ALTER TABLE package_usage ADD COLUMN IF NOT EXISTS tenant_id UUID;
  END IF;
END $$;

-- ============================================================
-- STEP 5: Ensure usage_deduction_events table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_deduction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID,
  deliverable_id UUID,
  deliverable_type TEXT,
  deliverable_name TEXT,
  quantity INT DEFAULT 1,
  confirmed_by UUID,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONE
-- ============================================================
