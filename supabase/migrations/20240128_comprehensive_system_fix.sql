-- =====================================================
-- COMPREHENSIVE SYSTEM FIX MIGRATION
-- Ensures all tables, triggers, constraints, functions,
-- and realtime are properly configured.
-- Safe to run multiple times (idempotent).
-- =====================================================

-- =====================================================
-- SECTION 1: ENSURE ALL CORE TABLES EXIST
-- =====================================================

-- client_assignments table
CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  assignment_role TEXT DEFAULT 'assigned',
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- default_assignment_rules table
CREATE TABLE IF NOT EXISTS default_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB DEFAULT '{}',
  assignment_team_member_id UUID,
  assignment_role TEXT DEFAULT 'account_manager',
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- client_package_features table
CREATE TABLE IF NOT EXISTS client_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID,
  feature_name TEXT NOT NULL,
  feature_value TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- usage_deduction_events
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

-- pinned_messages
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  pinned_by UUID,
  pinned_at TIMESTAMPTZ DEFAULT NOW()
);

-- saved_messages
CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_profile_id UUID,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- message_read_receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_profile_id UUID,
  read_at TIMESTAMPTZ DEFAULT NOW()
);

-- canned_responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  category TEXT DEFAULT 'general',
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- message_files
CREATE TABLE IF NOT EXISTS message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'document',
  url TEXT NOT NULL,
  size TEXT,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- team_member_teams (many-to-many)
CREATE TABLE IF NOT EXISTS team_member_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL,
  team_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_appearance_settings
CREATE TABLE IF NOT EXISTS user_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL,
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT 'cyan',
  font_size TEXT DEFAULT 'medium',
  compact_mode BOOLEAN DEFAULT false,
  animations_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- quick_actions
CREATE TABLE IF NOT EXISTS quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  action_name TEXT NOT NULL,
  action_label TEXT NOT NULL,
  icon TEXT,
  action_type TEXT,
  linked_service_type TEXT,
  display_order INT DEFAULT 0,
  role_access TEXT DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 2: ENSURE CRITICAL COLUMNS EXIST
-- =====================================================

-- demo_users: link columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN team_member_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'user_profile_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN user_profile_id UUID;
  END IF;
END $$;

-- channel_members: ensure user_profile_id, role, added_by columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channel_members' AND column_name = 'user_profile_id'
  ) THEN
    ALTER TABLE channel_members ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channel_members' AND column_name = 'role_in_channel'
  ) THEN
    ALTER TABLE channel_members ADD COLUMN role_in_channel TEXT DEFAULT 'member';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channel_members' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE channel_members ADD COLUMN added_by TEXT;
  END IF;
END $$;

-- team_members: user_profile_id link
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'user_profile_id'
  ) THEN
    ALTER TABLE team_members ADD COLUMN user_profile_id UUID;
  END IF;
END $$;

-- =====================================================
-- SECTION 3: ENSURE UNIQUE CONSTRAINTS (for upserts)
-- =====================================================

DO $$
BEGIN
  -- workspace_members unique
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_id_user_profile_id_key'
  ) THEN
    BEGIN
      ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_user_profile_id_key
        UNIQUE (workspace_id, user_profile_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- client_wallets unique on client_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_wallets_client_id_key'
  ) THEN
    BEGIN
      ALTER TABLE client_wallets ADD CONSTRAINT client_wallets_client_id_key UNIQUE (client_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- team_member_teams unique
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_member_teams_team_member_id_team_id_key'
  ) THEN
    BEGIN
      ALTER TABLE team_member_teams ADD CONSTRAINT team_member_teams_team_member_id_team_id_key
        UNIQUE (team_member_id, team_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- SECTION 4: TRIGGERS & FUNCTIONS
-- =====================================================

-- 4.1: Auto-create client_wallet on client insert
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

-- 4.2: Auto-create workspace + default channels on client insert
CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing FROM workspaces WHERE client_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

-- 4.3: Package usage deduction trigger
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
      SET used = used + v_quantity,
          updated_at = NOW()
      WHERE client_package_id = v_client_package_id
        AND deliverable_type = v_deliverable_type;

      INSERT INTO usage_deduction_events (
        client_package_id, deliverable_id, deliverable_type,
        deliverable_name, quantity, confirmed_by, status
      ) VALUES (
        v_client_package_id, NEW.id, v_deliverable_type,
        NEW.title, v_quantity, NEW.confirmed_by, 'confirmed'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_package_usage ON deliverables;
CREATE TRIGGER trg_deduct_package_usage
  AFTER UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage();

-- 4.4: Auto-init package usage on client_packages insert
CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_pkg RECORD;
BEGIN
  FOR v_pkg IN
    SELECT pd.deliverable_type, pd.quantity
    FROM package_deliverables pd
    WHERE pd.package_id = NEW.package_id
  LOOP
    INSERT INTO package_usage (client_package_id, deliverable_type, allocated, used)
    VALUES (NEW.id, v_pkg.deliverable_type, v_pkg.quantity, 0)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- 4.5: Refresh dashboard metrics RPC function
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- This is a placeholder that triggers metric recalculation
  -- In a production system this would update a materialized view
  RAISE NOTICE 'Dashboard metrics refreshed for tenant %', p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 5: FIX CAMPAIGN STATUS CONSTRAINT
-- =====================================================
ALTER TABLE IF EXISTS campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
DO $$
BEGIN
  BEGIN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_status_check
      CHECK (status IN ('draft', 'requested', 'approved', 'active', 'live', 'paused', 'completed', 'rejected', 'cancelled'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- =====================================================
-- SECTION 6: BACKFILL MISSING DATA
-- =====================================================

-- Backfill wallets for clients that don't have one
INSERT INTO client_wallets (client_id, balance, currency)
SELECT c.id, 0, 'BDT'
FROM clients c
LEFT JOIN client_wallets cw ON cw.client_id = c.id
WHERE cw.id IS NULL
ON CONFLICT (client_id) DO NOTHING;

-- Backfill workspaces for clients that don't have one
DO $$
DECLARE
  v_client RECORD;
  v_ws_id UUID;
BEGIN
  FOR v_client IN
    SELECT c.id, c.tenant_id, c.business_name, c.status, c.health_score
    FROM clients c
    LEFT JOIN workspaces w ON w.client_id = c.id
    WHERE w.id IS NULL
  LOOP
    INSERT INTO workspaces (tenant_id, client_id, client_name, status, health_score)
    VALUES (v_client.tenant_id, v_client.id, v_client.business_name, COALESCE(v_client.status, 'active'), COALESCE(v_client.health_score, 100))
    RETURNING id INTO v_ws_id;

    INSERT INTO channels (workspace_id, name, type, icon) VALUES
      (v_ws_id, 'General', 'general', 'hash'),
      (v_ws_id, 'Deliverables', 'deliverables', 'package'),
      (v_ws_id, 'Boost Requests', 'boost-requests', 'zap'),
      (v_ws_id, 'Billing', 'billing', 'credit-card'),
      (v_ws_id, 'Internal', 'internal', 'lock');
  END LOOP;
END $$;

-- =====================================================
-- SECTION 7: PERMISSIVE RLS FOR DEMO
-- =====================================================

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'client_assignments', 'default_assignment_rules', 'client_package_features',
    'usage_deduction_events', 'pinned_messages', 'saved_messages',
    'message_read_receipts', 'canned_responses', 'message_files',
    'quick_actions', 'team_member_teams', 'user_appearance_settings'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_all_access" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_all_access" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- =====================================================
-- SECTION 8: ENABLE REALTIME ON KEY TABLES
-- =====================================================

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE deliverables; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE package_usage; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE demo_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE quick_actions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE usage_deduction_events; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE teams; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- =====================================================
-- SECTION 9: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_client_assignments_tenant ON client_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_member ON client_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_default_rules_tenant ON default_assignment_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_tenant ON quick_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_active ON quick_actions(tenant_id, is_active);

-- Done!
