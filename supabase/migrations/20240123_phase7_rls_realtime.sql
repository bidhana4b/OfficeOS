-- ============================================
-- PHASE 7: Production Ready — RLS Policies & Security
-- Safe migration with IF NOT EXISTS / DROP IF EXISTS patterns
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON ALL MAJOR TABLES
-- ============================================

-- Core tables
ALTER TABLE IF EXISTS demo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;

-- Client tables
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_package_features ENABLE ROW LEVEL SECURITY;

-- Team tables
ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;

-- Deliverable tables
ALTER TABLE IF EXISTS deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_usage ENABLE ROW LEVEL SECURITY;

-- Package tables
ALTER TABLE IF EXISTS packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliverable_types ENABLE ROW LEVEL SECURITY;

-- Finance tables
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Messaging tables
ALTER TABLE IF EXISTS workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channel_members ENABLE ROW LEVEL SECURITY;

-- Dashboard & Settings tables
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- Assignment tables
ALTER TABLE IF EXISTS client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS default_assignment_rules ENABLE ROW LEVEL SECURITY;

-- Quick actions
ALTER TABLE IF EXISTS quick_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREATE PERMISSIVE POLICIES (anon key access)
-- Since this app uses demo_users with anon key,
-- we allow all operations via anon key for now.
-- In production, this should be replaced with
-- proper Supabase Auth-based policies.
-- ============================================

-- Helper: Create a simple "allow all" policy for a table
-- This is intentionally permissive for the demo/MVP stage.

-- demo_users
DROP POLICY IF EXISTS "demo_users_all_access" ON demo_users;
CREATE POLICY "demo_users_all_access" ON demo_users FOR ALL USING (true) WITH CHECK (true);

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_all_access" ON user_profiles;
CREATE POLICY "user_profiles_all_access" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- user_roles
DROP POLICY IF EXISTS "user_roles_all_access" ON user_roles;
CREATE POLICY "user_roles_all_access" ON user_roles FOR ALL USING (true) WITH CHECK (true);

-- clients
DROP POLICY IF EXISTS "clients_all_access" ON clients;
CREATE POLICY "clients_all_access" ON clients FOR ALL USING (true) WITH CHECK (true);

-- client_wallets
DROP POLICY IF EXISTS "client_wallets_all_access" ON client_wallets;
CREATE POLICY "client_wallets_all_access" ON client_wallets FOR ALL USING (true) WITH CHECK (true);

-- client_packages
DROP POLICY IF EXISTS "client_packages_all_access" ON client_packages;
CREATE POLICY "client_packages_all_access" ON client_packages FOR ALL USING (true) WITH CHECK (true);

-- client_package_features
DROP POLICY IF EXISTS "client_package_features_all_access" ON client_package_features;
CREATE POLICY "client_package_features_all_access" ON client_package_features FOR ALL USING (true) WITH CHECK (true);

-- team_members
DROP POLICY IF EXISTS "team_members_all_access" ON team_members;
CREATE POLICY "team_members_all_access" ON team_members FOR ALL USING (true) WITH CHECK (true);

-- teams
DROP POLICY IF EXISTS "teams_all_access" ON teams;
CREATE POLICY "teams_all_access" ON teams FOR ALL USING (true) WITH CHECK (true);

-- deliverables
DROP POLICY IF EXISTS "deliverables_all_access" ON deliverables;
CREATE POLICY "deliverables_all_access" ON deliverables FOR ALL USING (true) WITH CHECK (true);

-- package_usage
DROP POLICY IF EXISTS "package_usage_all_access" ON package_usage;
CREATE POLICY "package_usage_all_access" ON package_usage FOR ALL USING (true) WITH CHECK (true);

-- packages
DROP POLICY IF EXISTS "packages_all_access" ON packages;
CREATE POLICY "packages_all_access" ON packages FOR ALL USING (true) WITH CHECK (true);

-- deliverable_types
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverable_types') THEN
    DROP POLICY IF EXISTS "deliverable_types_all_access" ON deliverable_types;
    CREATE POLICY "deliverable_types_all_access" ON deliverable_types FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- invoices
DROP POLICY IF EXISTS "invoices_all_access" ON invoices;
CREATE POLICY "invoices_all_access" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- invoice_items
DROP POLICY IF EXISTS "invoice_items_all_access" ON invoice_items;
CREATE POLICY "invoice_items_all_access" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

-- campaigns
DROP POLICY IF EXISTS "campaigns_all_access" ON campaigns;
CREATE POLICY "campaigns_all_access" ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- wallet_transactions
DROP POLICY IF EXISTS "wallet_transactions_all_access" ON wallet_transactions;
CREATE POLICY "wallet_transactions_all_access" ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);

-- workspaces
DROP POLICY IF EXISTS "workspaces_all_access" ON workspaces;
CREATE POLICY "workspaces_all_access" ON workspaces FOR ALL USING (true) WITH CHECK (true);

-- channels
DROP POLICY IF EXISTS "channels_all_access" ON channels;
CREATE POLICY "channels_all_access" ON channels FOR ALL USING (true) WITH CHECK (true);

-- messages
DROP POLICY IF EXISTS "messages_all_access" ON messages;
CREATE POLICY "messages_all_access" ON messages FOR ALL USING (true) WITH CHECK (true);

-- workspace_members
DROP POLICY IF EXISTS "workspace_members_all_access" ON workspace_members;
CREATE POLICY "workspace_members_all_access" ON workspace_members FOR ALL USING (true) WITH CHECK (true);

-- channel_members
DROP POLICY IF EXISTS "channel_members_all_access" ON channel_members;
CREATE POLICY "channel_members_all_access" ON channel_members FOR ALL USING (true) WITH CHECK (true);

-- activities
DROP POLICY IF EXISTS "activities_all_access" ON activities;
CREATE POLICY "activities_all_access" ON activities FOR ALL USING (true) WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS "notifications_all_access" ON notifications;
CREATE POLICY "notifications_all_access" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- dashboard_metrics
DROP POLICY IF EXISTS "dashboard_metrics_all_access" ON dashboard_metrics;
CREATE POLICY "dashboard_metrics_all_access" ON dashboard_metrics FOR ALL USING (true) WITH CHECK (true);

-- client_assignments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_assignments') THEN
    DROP POLICY IF EXISTS "client_assignments_all_access" ON client_assignments;
    CREATE POLICY "client_assignments_all_access" ON client_assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- default_assignment_rules
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'default_assignment_rules') THEN
    DROP POLICY IF EXISTS "default_assignment_rules_all_access" ON default_assignment_rules;
    CREATE POLICY "default_assignment_rules_all_access" ON default_assignment_rules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- quick_actions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quick_actions') THEN
    DROP POLICY IF EXISTS "quick_actions_all_access" ON quick_actions;
    CREATE POLICY "quick_actions_all_access" ON quick_actions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 3. ENABLE REALTIME ON KEY TABLES
-- ============================================
DO $$
BEGIN
  -- Enable realtime for tables that need live updates
  -- This uses the supabase_realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE clients;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activities;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE package_usage;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE channels;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
