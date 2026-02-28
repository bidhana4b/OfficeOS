-- SUPERSEDED by 20240211_phase7_rls_safe.sql
-- This migration had table existence issues and was replaced
SELECT 1;

-- ============================================
-- HELPER: Check if a user belongs to a tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT tenant_id FROM public.demo_users WHERE id = auth.uid() LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT role FROM public.demo_users WHERE id = auth.uid() LIMIT 1),
    'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- CLIENTS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_all" ON public.clients;
CREATE POLICY "clients_select_all" ON public.clients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "clients_insert_admin" ON public.clients;
CREATE POLICY "clients_insert_admin" ON public.clients
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update_admin" ON public.clients;
CREATE POLICY "clients_update_admin" ON public.clients
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "clients_delete_admin" ON public.clients;
CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE USING (true);

-- ============================================
-- TEAM_MEMBERS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_all" ON public.team_members;
CREATE POLICY "team_members_select_all" ON public.team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_members_insert_admin" ON public.team_members;
CREATE POLICY "team_members_insert_admin" ON public.team_members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "team_members_update_admin" ON public.team_members;
CREATE POLICY "team_members_update_admin" ON public.team_members
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "team_members_delete_admin" ON public.team_members;
CREATE POLICY "team_members_delete_admin" ON public.team_members
  FOR DELETE USING (true);

-- ============================================
-- MESSAGES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_all" ON public.messages;
CREATE POLICY "messages_select_all" ON public.messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "messages_insert_all" ON public.messages;
CREATE POLICY "messages_insert_all" ON public.messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "messages_update_all" ON public.messages;
CREATE POLICY "messages_update_all" ON public.messages
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "messages_delete_all" ON public.messages;
CREATE POLICY "messages_delete_all" ON public.messages
  FOR DELETE USING (true);

-- ============================================
-- CHANNELS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channels_select_all" ON public.channels;
CREATE POLICY "channels_select_all" ON public.channels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "channels_insert_all" ON public.channels;
CREATE POLICY "channels_insert_all" ON public.channels
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "channels_update_all" ON public.channels;
CREATE POLICY "channels_update_all" ON public.channels
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "channels_delete_all" ON public.channels;
CREATE POLICY "channels_delete_all" ON public.channels
  FOR DELETE USING (true);

-- ============================================
-- WORKSPACES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces_select_all" ON public.workspaces;
CREATE POLICY "workspaces_select_all" ON public.workspaces
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "workspaces_insert_all" ON public.workspaces;
CREATE POLICY "workspaces_insert_all" ON public.workspaces
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "workspaces_update_all" ON public.workspaces;
CREATE POLICY "workspaces_update_all" ON public.workspaces
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "workspaces_delete_all" ON public.workspaces;
CREATE POLICY "workspaces_delete_all" ON public.workspaces
  FOR DELETE USING (true);

-- ============================================
-- DELIVERABLES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliverables_select_all" ON public.deliverables;
CREATE POLICY "deliverables_select_all" ON public.deliverables
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "deliverables_insert_all" ON public.deliverables;
CREATE POLICY "deliverables_insert_all" ON public.deliverables
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "deliverables_update_all" ON public.deliverables;
CREATE POLICY "deliverables_update_all" ON public.deliverables
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "deliverables_delete_all" ON public.deliverables;
CREATE POLICY "deliverables_delete_all" ON public.deliverables
  FOR DELETE USING (true);

-- ============================================
-- PACKAGES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_select_all" ON public.packages;
CREATE POLICY "packages_select_all" ON public.packages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "packages_insert_all" ON public.packages;
CREATE POLICY "packages_insert_all" ON public.packages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "packages_update_all" ON public.packages;
CREATE POLICY "packages_update_all" ON public.packages
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "packages_delete_all" ON public.packages;
CREATE POLICY "packages_delete_all" ON public.packages
  FOR DELETE USING (true);

-- ============================================
-- INVOICES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_all" ON public.invoices;
CREATE POLICY "invoices_select_all" ON public.invoices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "invoices_insert_all" ON public.invoices;
CREATE POLICY "invoices_insert_all" ON public.invoices
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_update_all" ON public.invoices;
CREATE POLICY "invoices_update_all" ON public.invoices
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "invoices_delete_all" ON public.invoices;
CREATE POLICY "invoices_delete_all" ON public.invoices
  FOR DELETE USING (true);

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_all" ON public.campaigns;
CREATE POLICY "campaigns_select_all" ON public.campaigns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "campaigns_insert_all" ON public.campaigns;
CREATE POLICY "campaigns_insert_all" ON public.campaigns
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "campaigns_update_all" ON public.campaigns;
CREATE POLICY "campaigns_update_all" ON public.campaigns
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "campaigns_delete_all" ON public.campaigns;
CREATE POLICY "campaigns_delete_all" ON public.campaigns
  FOR DELETE USING (true);

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_all" ON public.activities;
CREATE POLICY "activities_select_all" ON public.activities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "activities_insert_all" ON public.activities;
CREATE POLICY "activities_insert_all" ON public.activities
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "activities_update_all" ON public.activities;
CREATE POLICY "activities_update_all" ON public.activities
  FOR UPDATE USING (true);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_all" ON public.notifications;
CREATE POLICY "notifications_select_all" ON public.notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
CREATE POLICY "notifications_insert_all" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_all" ON public.notifications;
CREATE POLICY "notifications_update_all" ON public.notifications
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "notifications_delete_all" ON public.notifications;
CREATE POLICY "notifications_delete_all" ON public.notifications
  FOR DELETE USING (true);

-- ============================================
-- DEMO_USERS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.demo_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_users_select_all" ON public.demo_users;
CREATE POLICY "demo_users_select_all" ON public.demo_users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "demo_users_insert_all" ON public.demo_users;
CREATE POLICY "demo_users_insert_all" ON public.demo_users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "demo_users_update_all" ON public.demo_users;
CREATE POLICY "demo_users_update_all" ON public.demo_users
  FOR UPDATE USING (true);

-- ============================================
-- USER_PROFILES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_all" ON public.user_profiles;
CREATE POLICY "user_profiles_select_all" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_profiles_insert_all" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_all" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "user_profiles_update_all" ON public.user_profiles;
CREATE POLICY "user_profiles_update_all" ON public.user_profiles
  FOR UPDATE USING (true);

-- ============================================
-- CLIENT_WALLETS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.client_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_wallets_select_all" ON public.client_wallets;
CREATE POLICY "client_wallets_select_all" ON public.client_wallets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "client_wallets_insert_all" ON public.client_wallets;
CREATE POLICY "client_wallets_insert_all" ON public.client_wallets
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "client_wallets_update_all" ON public.client_wallets;
CREATE POLICY "client_wallets_update_all" ON public.client_wallets
  FOR UPDATE USING (true);

-- ============================================
-- WALLET_TRANSACTIONS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_transactions_select_all" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select_all" ON public.wallet_transactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "wallet_transactions_insert_all" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_insert_all" ON public.wallet_transactions
  FOR INSERT WITH CHECK (true);

-- ============================================
-- CHANNEL_MEMBERS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_members_select_all" ON public.channel_members;
CREATE POLICY "channel_members_select_all" ON public.channel_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "channel_members_insert_all" ON public.channel_members;
CREATE POLICY "channel_members_insert_all" ON public.channel_members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "channel_members_update_all" ON public.channel_members;
CREATE POLICY "channel_members_update_all" ON public.channel_members
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "channel_members_delete_all" ON public.channel_members;
CREATE POLICY "channel_members_delete_all" ON public.channel_members
  FOR DELETE USING (true);

-- ============================================
-- WORKSPACE_MEMBERS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_select_all" ON public.workspace_members;
CREATE POLICY "workspace_members_select_all" ON public.workspace_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "workspace_members_insert_all" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_all" ON public.workspace_members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "workspace_members_update_all" ON public.workspace_members;
CREATE POLICY "workspace_members_update_all" ON public.workspace_members
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "workspace_members_delete_all" ON public.workspace_members;
CREATE POLICY "workspace_members_delete_all" ON public.workspace_members
  FOR DELETE USING (true);

-- ============================================
-- CLIENT_ASSIGNMENTS TABLE
-- ============================================
ALTER TABLE IF EXISTS public.client_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_assignments_select_all" ON public.client_assignments;
CREATE POLICY "client_assignments_select_all" ON public.client_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "client_assignments_insert_all" ON public.client_assignments;
CREATE POLICY "client_assignments_insert_all" ON public.client_assignments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "client_assignments_update_all" ON public.client_assignments;
CREATE POLICY "client_assignments_update_all" ON public.client_assignments
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "client_assignments_delete_all" ON public.client_assignments;
CREATE POLICY "client_assignments_delete_all" ON public.client_assignments
  FOR DELETE USING (true);

-- ============================================
-- PACKAGE_USAGE TABLE
-- ============================================
ALTER TABLE IF EXISTS public.package_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "package_usage_select_all" ON public.package_usage;
CREATE POLICY "package_usage_select_all" ON public.package_usage
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "package_usage_insert_all" ON public.package_usage;
CREATE POLICY "package_usage_insert_all" ON public.package_usage
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "package_usage_update_all" ON public.package_usage;
CREATE POLICY "package_usage_update_all" ON public.package_usage
  FOR UPDATE USING (true);

-- ============================================
-- CLIENT_PACKAGES TABLE
-- ============================================
ALTER TABLE IF EXISTS public.client_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_packages_select_all" ON public.client_packages;
CREATE POLICY "client_packages_select_all" ON public.client_packages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "client_packages_insert_all" ON public.client_packages;
CREATE POLICY "client_packages_insert_all" ON public.client_packages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "client_packages_update_all" ON public.client_packages;
CREATE POLICY "client_packages_update_all" ON public.client_packages
  FOR UPDATE USING (true);

-- ============================================
-- SETTINGS TABLE (if exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
    ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "settings_select_all" ON public.settings;
    CREATE POLICY "settings_select_all" ON public.settings FOR SELECT USING (true);

    DROP POLICY IF EXISTS "settings_insert_all" ON public.settings;
    CREATE POLICY "settings_insert_all" ON public.settings FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "settings_update_all" ON public.settings;
    CREATE POLICY "settings_update_all" ON public.settings FOR UPDATE USING (true);
  END IF;
END $$;

-- ============================================
-- STORAGE: message-attachments bucket policy
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'message-attachments') THEN
    DROP POLICY IF EXISTS "message_attachments_select" ON storage.objects;
    CREATE POLICY "message_attachments_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'message-attachments');

    DROP POLICY IF EXISTS "message_attachments_insert" ON storage.objects;
    CREATE POLICY "message_attachments_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'message-attachments');

    DROP POLICY IF EXISTS "message_attachments_delete" ON storage.objects;
    CREATE POLICY "message_attachments_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'message-attachments');
  END IF;
END $$;

-- ============================================
-- ENABLE REALTIME on key tables
-- ============================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['messages', 'channels', 'clients', 'deliverables', 'activities', 'notifications', 'package_usage', 'client_assignments', 'invoices', 'campaigns']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.%I', tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
