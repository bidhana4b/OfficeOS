-- =====================================================
-- Phase 3: Client Onboarding Flow — Complete DB Setup
-- Phase 4: Data Consistency Fix
-- 100% idempotent — safe to run multiple times
-- =====================================================


-- =====================================================
-- SECTION 1: Ensure packages table has all required columns
-- (The original 20240104 migration may have created these,
--  but if 20240131 bootstrap re-created the table, they'd be missing)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='tier') THEN
    ALTER TABLE packages ADD COLUMN tier TEXT DEFAULT 'standard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='monthly_fee') THEN
    ALTER TABLE packages ADD COLUMN monthly_fee NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='plan_type') THEN
    ALTER TABLE packages ADD COLUMN plan_type TEXT DEFAULT 'monthly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='platform_count') THEN
    ALTER TABLE packages ADD COLUMN platform_count INT DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='correction_limit') THEN
    ALTER TABLE packages ADD COLUMN correction_limit INT DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='recommended') THEN
    ALTER TABLE packages ADD COLUMN recommended BOOLEAN DEFAULT false;
  END IF;

  -- Ensure client_wallets has unique constraint on client_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_wallets_client_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE client_wallets ADD CONSTRAINT client_wallets_client_id_unique UNIQUE (client_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- Ensure workspace_members has unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_user_unique'
  ) THEN
    BEGIN
      ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_user_unique UNIQUE (workspace_id, user_profile_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- Ensure workspaces has client_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='client_id') THEN
    ALTER TABLE workspaces ADD COLUMN client_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='client_name') THEN
    ALTER TABLE workspaces ADD COLUMN client_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='health_score') THEN
    ALTER TABLE workspaces ADD COLUMN health_score INT DEFAULT 100;
  END IF;

  -- Ensure channels has is_default and icon
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='is_default') THEN
    ALTER TABLE channels ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='icon') THEN
    ALTER TABLE channels ADD COLUMN icon TEXT DEFAULT 'hash';
  END IF;

  -- Ensure demo_users has client_id for client role login
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='client_id') THEN
    ALTER TABLE demo_users ADD COLUMN client_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='user_profile_id') THEN
    ALTER TABLE demo_users ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='team_member_id') THEN
    ALTER TABLE demo_users ADD COLUMN team_member_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='is_active') THEN
    ALTER TABLE demo_users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='last_login_at') THEN
    ALTER TABLE demo_users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='password_changed_at') THEN
    ALTER TABLE demo_users ADD COLUMN password_changed_at TIMESTAMPTZ;
  END IF;

  -- Ensure team_members has user_profile_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='user_profile_id') THEN
    ALTER TABLE team_members ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='phone') THEN
    ALTER TABLE team_members ADD COLUMN phone TEXT;
  END IF;

  -- Ensure clients has all onboarding columns
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='metadata') THEN
    ALTER TABLE clients ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  -- Ensure client_packages has tenant_id for consistency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_packages' AND column_name='tenant_id') THEN
    ALTER TABLE client_packages ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;


-- =====================================================
-- SECTION 2: Auto-create client_wallet on client insert (TRIGGER)
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency)
  VALUES (NEW.id, 0, 'BDT')
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();


-- =====================================================
-- SECTION 3: Auto-create workspace + channels on client insert (TRIGGER)
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing FROM workspaces WHERE client_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

  INSERT INTO workspaces (tenant_id, client_id, client_name, name, description, type, status, health_score)
  VALUES (
    NEW.tenant_id, NEW.id, NEW.business_name,
    NEW.business_name || ' Workspace',
    'Auto-created workspace for ' || NEW.business_name,
    'client',
    COALESCE(NEW.status, 'active'),
    COALESCE(NEW.health_score, 100)
  )
  RETURNING id INTO v_workspace_id;

  INSERT INTO channels (workspace_id, name, description, type, icon, is_default) VALUES
    (v_workspace_id, 'General', 'General discussion', 'general', 'hash', true),
    (v_workspace_id, 'Deliverables', 'Deliverable updates', 'deliverables', 'package', true),
    (v_workspace_id, 'Boost Requests', 'Boost campaign discussions', 'boost-requests', 'zap', true),
    (v_workspace_id, 'Billing', 'Billing & invoice discussions', 'billing', 'credit-card', true),
    (v_workspace_id, 'Internal', 'Internal team discussion', 'internal', 'lock', true);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;
CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();


-- =====================================================
-- SECTION 4: Package usage auto-init trigger
-- When client_packages is inserted, auto-create package_usage rows
-- =====================================================

CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT deliverable_type, quantity
    FROM package_deliverables
    WHERE package_id = NEW.package_id
  LOOP
    INSERT INTO package_usage (client_package_id, deliverable_type, allocated, used)
    VALUES (NEW.id, v_rec.deliverable_type, v_rec.quantity, 0)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();


-- =====================================================
-- SECTION 5: Package usage deduction trigger
-- When deliverable status changes to 'delivered', deduct from usage
-- =====================================================

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
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_package_usage ON deliverables;
CREATE TRIGGER trg_deduct_package_usage
  AFTER UPDATE ON deliverables FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage();


-- =====================================================
-- SECTION 6: Dashboard metrics refresh function
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS VOID AS $$
DECLARE
  v_total_clients INT;
  v_active_clients INT;
  v_total_team INT;
  v_total_revenue NUMERIC;
  v_active_projects INT;
BEGIN
  SELECT COUNT(*) INTO v_total_clients FROM clients WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_active_clients FROM clients WHERE tenant_id = p_tenant_id AND status = 'active';
  SELECT COUNT(*) INTO v_total_team FROM team_members WHERE tenant_id = p_tenant_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue FROM invoices WHERE tenant_id = p_tenant_id AND status = 'paid';
  SELECT COUNT(*) INTO v_active_projects FROM deliverables WHERE tenant_id = p_tenant_id AND status IN ('in_progress', 'pending', 'review');

  INSERT INTO system_settings (tenant_id, category, key, value)
  VALUES
    (p_tenant_id, 'dashboard_metrics', 'total_clients', v_total_clients::TEXT),
    (p_tenant_id, 'dashboard_metrics', 'active_clients', v_active_clients::TEXT),
    (p_tenant_id, 'dashboard_metrics', 'total_team', v_total_team::TEXT),
    (p_tenant_id, 'dashboard_metrics', 'total_revenue', v_total_revenue::TEXT),
    (p_tenant_id, 'dashboard_metrics', 'active_projects', v_active_projects::TEXT)
  ON CONFLICT (tenant_id, category, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- SECTION 7: Backfill existing clients without wallets/workspaces
-- =====================================================

DO $$
DECLARE
  v_client RECORD;
  v_workspace_id UUID;
BEGIN
  FOR v_client IN
    SELECT c.id, c.tenant_id, c.business_name, c.status, c.health_score
    FROM clients c
    LEFT JOIN client_wallets cw ON cw.client_id = c.id
    WHERE cw.id IS NULL
  LOOP
    INSERT INTO client_wallets (client_id, balance, currency)
    VALUES (v_client.id, 0, 'BDT')
    ON CONFLICT (client_id) DO NOTHING;
  END LOOP;

  FOR v_client IN
    SELECT c.id, c.tenant_id, c.business_name, c.status, c.health_score
    FROM clients c
    LEFT JOIN workspaces w ON w.client_id = c.id
    WHERE w.id IS NULL
  LOOP
    INSERT INTO workspaces (tenant_id, client_id, client_name, name, description, type, status, health_score)
    VALUES (
      v_client.tenant_id, v_client.id, v_client.business_name,
      v_client.business_name || ' Workspace',
      'Auto-created workspace for ' || v_client.business_name,
      'client',
      COALESCE(v_client.status, 'active'),
      COALESCE(v_client.health_score, 100)
    )
    RETURNING id INTO v_workspace_id;

    IF v_workspace_id IS NOT NULL THEN
      INSERT INTO channels (workspace_id, name, description, type, icon, is_default) VALUES
        (v_workspace_id, 'General', 'General discussion', 'general', 'hash', true),
        (v_workspace_id, 'Deliverables', 'Deliverable updates', 'deliverables', 'package', true),
        (v_workspace_id, 'Boost Requests', 'Boost campaign discussions', 'boost-requests', 'zap', true),
        (v_workspace_id, 'Billing', 'Billing & invoice discussions', 'billing', 'credit-card', true),
        (v_workspace_id, 'Internal', 'Internal team discussion', 'internal', 'lock', true);
    END IF;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- =====================================================
-- SECTION 8: RLS Policies (permissive for demo mode)
-- =====================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'tenants', 'user_profiles', 'demo_users', 'user_roles',
      'teams', 'team_members', 'clients', 'client_wallets', 'wallet_transactions',
      'client_assignments', 'default_assignment_rules',
      'packages', 'package_deliverables', 'client_packages', 'client_package_features', 'package_usage', 'package_categories',
      'deliverables', 'deliverable_types',
      'workspaces', 'workspace_members', 'channels', 'channel_members', 'messages',
      'pinned_messages', 'saved_messages', 'message_read_receipts', 'canned_responses',
      'invoices', 'invoice_items', 'campaigns',
      'activities', 'notifications', 'system_settings', 'quick_actions'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for demo" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for demo" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- =====================================================
-- SECTION 9: Realtime for key tables
-- =====================================================

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE deliverables; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE package_usage; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_packages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE demo_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE packages; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;


-- =====================================================
-- SECTION 10: Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_client_wallets_client ON client_wallets(client_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_client ON workspaces(client_id);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_package ON client_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_package_deliverables_pkg ON package_deliverables(package_id);
CREATE INDEX IF NOT EXISTS idx_package_usage_cp ON package_usage(client_package_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_email_tenant ON demo_users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON clients(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deliverables_client ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
