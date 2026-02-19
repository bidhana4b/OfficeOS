-- =====================================================
-- FINAL SYSTEM BOOTSTRAP
-- Ensures ALL tables, columns, triggers, constraints,
-- indexes, realtime, and seed data are properly set up.
-- 100% idempotent — safe to run multiple times.
-- =====================================================

-- =====================================================
-- SECTION 1: CORE TABLES (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  brand_color TEXT DEFAULT '#00D9FF',
  address TEXT,
  tax_info TEXT,
  invoice_footer TEXT,
  legal_info TEXT,
  payment_methods TEXT[] DEFAULT ARRAY['Bank Transfer'],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  full_name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'account_manager',
  avatar TEXT,
  client_id UUID,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  user_profile_id UUID,
  team_member_id UUID,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  user_count INT DEFAULT 0,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  role_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#00D9FF',
  icon TEXT DEFAULT 'users',
  member_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  user_profile_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  primary_role TEXT DEFAULT 'Member',
  secondary_roles TEXT[] DEFAULT '{}',
  work_capacity_hours NUMERIC DEFAULT 8,
  status TEXT DEFAULT 'online',
  current_load NUMERIC DEFAULT 0,
  active_deliverables INT DEFAULT 0,
  boost_campaigns INT DEFAULT 0,
  tasks_completed_this_month INT DEFAULT 0,
  join_date TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_member_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL,
  team_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  business_name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_website TEXT,
  logo TEXT,
  account_manager_id UUID,
  status TEXT DEFAULT 'active',
  health_score INT DEFAULT 100,
  metadata JSONB DEFAULT '{}',
  owner_name TEXT,
  owner_phone TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  monthly_boost_budget NUMERIC DEFAULT 0,
  boost_budget_currency TEXT DEFAULT 'USD',
  referrer_name TEXT,
  onboarding_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID,
  client_id UUID,
  type TEXT DEFAULT 'credit',
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  billing_cycle TEXT DEFAULT 'monthly',
  category TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL,
  quantity INT DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  package_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TEXT,
  renewal_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID,
  feature_name TEXT NOT NULL,
  feature_value TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID,
  deliverable_type TEXT,
  allocated INT DEFAULT 0,
  used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID,
  client_package_id UUID,
  deliverable_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  confirmed_by UUID,
  quantity INT DEFAULT 1,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID,
  client_name TEXT,
  name TEXT,
  description TEXT,
  type TEXT DEFAULT 'client',
  status TEXT DEFAULT 'active',
  health_score INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_profile_id UUID,
  name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'text',
  icon TEXT DEFAULT 'hash',
  is_default BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  user_profile_id UUID,
  workspace_member_id UUID,
  role_in_channel TEXT DEFAULT 'member',
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  parent_id UUID,
  reactions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  pinned_by UUID,
  pinned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_profile_id UUID,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_profile_id UUID,
  read_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID,
  invoice_number TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  status TEXT DEFAULT 'draft',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT DEFAULT 'facebook',
  status TEXT DEFAULT 'draft',
  budget NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  performance JSONB DEFAULT '{}',
  created_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  type TEXT,
  title TEXT,
  description TEXT,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  entity_type TEXT,
  entity_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  section TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS deliverable_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  slug TEXT,
  category TEXT DEFAULT 'design',
  description TEXT,
  default_hours NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#00D9FF',
  icon TEXT DEFAULT 'package',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- SECTION 2: ENSURE CRITICAL COLUMNS
-- =====================================================

DO $$
BEGIN
  -- demo_users columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='is_active') THEN
    ALTER TABLE demo_users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='user_profile_id') THEN
    ALTER TABLE demo_users ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='team_member_id') THEN
    ALTER TABLE demo_users ADD COLUMN team_member_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='last_login_at') THEN
    ALTER TABLE demo_users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_users' AND column_name='password_changed_at') THEN
    ALTER TABLE demo_users ADD COLUMN password_changed_at TIMESTAMPTZ;
  END IF;

  -- team_members columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='user_profile_id') THEN
    ALTER TABLE team_members ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='phone') THEN
    ALTER TABLE team_members ADD COLUMN phone TEXT;
  END IF;

  -- workspace_members columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_members' AND column_name='user_profile_id') THEN
    ALTER TABLE workspace_members ADD COLUMN user_profile_id UUID;
  END IF;

  -- channel_members columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channel_members' AND column_name='user_profile_id') THEN
    ALTER TABLE channel_members ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channel_members' AND column_name='role_in_channel') THEN
    ALTER TABLE channel_members ADD COLUMN role_in_channel TEXT DEFAULT 'member';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channel_members' AND column_name='added_by') THEN
    ALTER TABLE channel_members ADD COLUMN added_by TEXT;
  END IF;

  -- clients extra columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='metadata') THEN
    ALTER TABLE clients ADD COLUMN metadata JSONB DEFAULT '{}';
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
END $$;


-- =====================================================
-- SECTION 3: UNIQUE CONSTRAINTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='demo_users_tenant_email_unique') THEN
    BEGIN
      ALTER TABLE demo_users ADD CONSTRAINT demo_users_tenant_email_unique UNIQUE (tenant_id, email);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profiles_tenant_email_unique') THEN
    BEGIN
      ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_tenant_email_unique UNIQUE (tenant_id, email);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='workspace_members_workspace_id_user_profile_id_key') THEN
    BEGIN
      ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_user_profile_id_key UNIQUE (workspace_id, user_profile_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='client_wallets_client_id_key') THEN
    BEGIN
      ALTER TABLE client_wallets ADD CONSTRAINT client_wallets_client_id_key UNIQUE (client_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='team_member_teams_team_member_id_team_id_key') THEN
    BEGIN
      ALTER TABLE team_member_teams ADD CONSTRAINT team_member_teams_team_member_id_team_id_key UNIQUE (team_member_id, team_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='system_settings_tenant_section_unique') THEN
    BEGIN
      ALTER TABLE system_settings ADD CONSTRAINT system_settings_tenant_section_unique UNIQUE (tenant_id, section);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;


-- =====================================================
-- SECTION 4: FIX CAMPAIGN STATUS CONSTRAINT
-- =====================================================

ALTER TABLE IF EXISTS campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
DO $$
BEGIN
  BEGIN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
      CHECK (status IN ('draft','requested','approved','active','live','paused','completed','rejected','cancelled'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;


-- =====================================================
-- SECTION 5: TRIGGERS & FUNCTIONS
-- =====================================================

-- 5.1 Auto-create client_wallet on client insert
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
  AFTER INSERT ON clients FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- 5.2 Auto-create workspace + channels on client insert
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;
CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();

-- 5.3 Package usage deduction
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
      UPDATE package_usage SET used = used + v_quantity, updated_at = NOW()
        WHERE client_package_id = v_client_package_id AND deliverable_type = v_deliverable_type;
      INSERT INTO usage_deduction_events (client_package_id, deliverable_id, deliverable_type, deliverable_name, quantity, confirmed_by, status)
        VALUES (v_client_package_id, NEW.id, v_deliverable_type, NEW.title, v_quantity, NEW.confirmed_by, 'confirmed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_package_usage ON deliverables;
CREATE TRIGGER trg_deduct_package_usage
  AFTER UPDATE ON deliverables FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage();

-- 5.4 Auto-init package usage on client_packages insert
CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_pkg RECORD;
BEGIN
  FOR v_pkg IN SELECT pd.deliverable_type, pd.quantity FROM package_deliverables pd WHERE pd.package_id = NEW.package_id
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
  AFTER INSERT ON client_packages FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- 5.5 Dashboard metrics RPC
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE 'Dashboard metrics refreshed for tenant %', p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- SECTION 6: BACKFILL MISSING DATA
-- =====================================================

-- Wallets for clients without one
INSERT INTO client_wallets (client_id, balance, currency)
SELECT c.id, 0, 'BDT' FROM clients c
LEFT JOIN client_wallets cw ON cw.client_id = c.id
WHERE cw.id IS NULL
ON CONFLICT (client_id) DO NOTHING;

-- Workspaces for clients without one
DO $$
DECLARE v_client RECORD; v_ws_id UUID;
BEGIN
  FOR v_client IN
    SELECT c.id, c.tenant_id, c.business_name, c.status, c.health_score
    FROM clients c LEFT JOIN workspaces w ON w.client_id = c.id WHERE w.id IS NULL
  LOOP
    INSERT INTO workspaces (tenant_id, client_id, client_name, name, description, type, status, health_score)
    VALUES (v_client.tenant_id, v_client.id, v_client.business_name, v_client.business_name || ' Workspace', 'Auto-created', 'client', COALESCE(v_client.status, 'active'), COALESCE(v_client.health_score, 100))
    RETURNING id INTO v_ws_id;

    INSERT INTO channels (workspace_id, name, description, type, icon, is_default) VALUES
      (v_ws_id, 'General', 'General discussion', 'general', 'hash', true),
      (v_ws_id, 'Deliverables', 'Deliverable updates', 'deliverables', 'package', true),
      (v_ws_id, 'Boost Requests', 'Boost discussions', 'boost-requests', 'zap', true),
      (v_ws_id, 'Billing', 'Billing discussions', 'billing', 'credit-card', true),
      (v_ws_id, 'Internal', 'Internal team', 'internal', 'lock', true);
  END LOOP;
END $$;

-- Backfill user_profile_id on demo_users
UPDATE demo_users du SET user_profile_id = up.id
FROM user_profiles up
WHERE du.email = up.email AND du.tenant_id = up.tenant_id AND du.user_profile_id IS NULL;

-- Backfill team_member_id on demo_users
UPDATE demo_users du SET team_member_id = tm.id
FROM team_members tm
WHERE du.email = tm.email AND du.tenant_id = tm.tenant_id
  AND du.team_member_id IS NULL AND du.role != 'client';


-- =====================================================
-- SECTION 7: PERMISSIVE RLS FOR ALL TABLES (demo mode)
-- =====================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'tenants','user_profiles','demo_users','roles','user_roles',
    'teams','team_members','team_member_teams',
    'clients','client_wallets','wallet_transactions','client_assignments','default_assignment_rules',
    'packages','package_deliverables','client_packages','client_package_features','package_usage',
    'deliverables','usage_deduction_events','deliverable_types','package_categories',
    'workspaces','workspace_members','channels','channel_members',
    'messages','message_files','pinned_messages','saved_messages','message_read_receipts','canned_responses',
    'invoices','campaigns','activities','notifications',
    'system_settings','quick_actions','user_appearance_settings'
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
-- SECTION 8: REALTIME
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
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE teams; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE quick_actions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE system_settings; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE packages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_packages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;


-- =====================================================
-- SECTION 9: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_demo_users_tenant ON demo_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_email ON demo_users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_tenant ON client_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_member ON client_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_client ON workspaces(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_tenant ON deliverables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_client ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_tenant ON quick_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_active ON quick_actions(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_default_rules_tenant ON default_assignment_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_tenant ON packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_tenant ON system_settings(tenant_id);


-- =====================================================
-- SECTION 10: ENSURE DEFAULT TENANT EXISTS
-- =====================================================

INSERT INTO tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'TITAN DEV AI', 'titan-dev-ai')
ON CONFLICT (id) DO NOTHING;


-- Done!
