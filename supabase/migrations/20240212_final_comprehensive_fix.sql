-- ================================================================
-- TITAN DEV AI: Final Comprehensive Fix Migration
-- Ensures ALL tables, columns, constraints, triggers exist
-- Safe to run multiple times (all operations use IF NOT EXISTS / OR REPLACE)
-- ================================================================

-- ================================================================
-- 1. ENSURE ALL CORE TABLES EXIST WITH ALL NEEDED COLUMNS
-- ================================================================

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tenants (id, name, slug)
SELECT '00000000-0000-0000-0000-000000000001', 'TITAN Agency', 'titan'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001');

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]',
  user_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo Users
CREATE TABLE IF NOT EXISTS demo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '123456',
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  avatar TEXT,
  client_id UUID,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  session_token TEXT,
  last_login_at TIMESTAMPTZ,
  phone TEXT,
  user_profile_id UUID,
  team_member_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  color TEXT DEFAULT 'cyan',
  icon TEXT DEFAULT 'users',
  total_members INT DEFAULT 0,
  active_tasks INT DEFAULT 0,
  overloaded_members INT DEFAULT 0,
  efficiency_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_profile_id UUID,
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  primary_role TEXT,
  secondary_roles TEXT[] DEFAULT '{}',
  work_capacity_hours INT DEFAULT 8,
  status TEXT DEFAULT 'online',
  current_load INT DEFAULT 0,
  active_deliverables INT DEFAULT 0,
  boost_campaigns INT DEFAULT 0,
  tasks_completed_this_month INT DEFAULT 0,
  join_date DATE DEFAULT CURRENT_DATE,
  phone TEXT,
  bio TEXT,
  hourly_rate NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Member Teams
CREATE TABLE IF NOT EXISTS team_member_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL,
  team_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Skills
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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

-- Client Wallets
CREATE TABLE IF NOT EXISTS client_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  balance NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'standard',
  plan_type TEXT DEFAULT 'monthly',
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  description TEXT,
  features JSONB DEFAULT '[]',
  platform_count INT DEFAULT 1,
  correction_limit INT DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  category_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Features (templates)
CREATE TABLE IF NOT EXISTS package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL,
  quantity INT DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Packages
CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  package_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  start_date TEXT,
  renewal_date TEXT,
  custom_monthly_fee NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Package Features
CREATE TABLE IF NOT EXISTS client_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL,
  label TEXT,
  icon TEXT DEFAULT 'package',
  total_allocated INT DEFAULT 0,
  unit_label TEXT DEFAULT 'units',
  warning_threshold INT DEFAULT 20,
  auto_deduction BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Usage
CREATE TABLE IF NOT EXISTS package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL,
  used INT DEFAULT 0,
  total INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Categories
CREATE TABLE IF NOT EXISTS package_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT 'cyan',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverable Types
CREATE TABLE IF NOT EXISTS deliverable_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  color TEXT DEFAULT 'cyan',
  description TEXT,
  default_unit_label TEXT DEFAULT 'units',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverables
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  client_package_id UUID,
  assigned_to UUID,
  title TEXT NOT NULL,
  deliverable_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  deadline DATE,
  quantity INT DEFAULT 1,
  notes TEXT,
  days_left INT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id UUID,
  client_name TEXT,
  client_logo TEXT,
  status TEXT DEFAULT 'active',
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_profile_id UUID,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  icon TEXT DEFAULT 'hash',
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  unread_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  channel_type TEXT DEFAULT 'open',
  created_by_id UUID,
  member_count INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Members
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  user_profile_id UUID,
  role_in_channel TEXT DEFAULT 'member',
  added_by TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  notification_pref TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  sender_role TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent',
  message_type TEXT DEFAULT 'text',
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_for_everyone BOOLEAN DEFAULT false,
  thread_count INT DEFAULT 0,
  reply_to_id UUID,
  reply_to_sender TEXT,
  reply_to_content TEXT,
  voice_url TEXT,
  voice_duration INT,
  forwarded_from_id UUID,
  forwarded_from_channel TEXT,
  deliverable_tag TEXT,
  boost_tag TEXT,
  is_system_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  user_ids TEXT[] DEFAULT '{}',
  count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Files
CREATE TABLE IF NOT EXISTS message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_name TEXT,
  type TEXT NOT NULL DEFAULT 'document',
  url TEXT NOT NULL,
  file_url TEXT,
  size TEXT,
  thumbnail TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pinned Messages
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  pinned_by TEXT,
  pinned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Messages
CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canned Responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  shortcut TEXT,
  created_by TEXT,
  tenant_id UUID,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  invoice_number TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  issue_date DATE DEFAULT CURRENT_DATE,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  description TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  platform TEXT DEFAULT 'facebook',
  campaign_type TEXT DEFAULT 'boost',
  status TEXT DEFAULT 'draft',
  budget NUMERIC(12,2) DEFAULT 0,
  spent NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  start_date DATE,
  end_date DATE,
  target_audience JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  goal TEXT,
  notes TEXT,
  created_by TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_wallet_id UUID,
  client_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  balance_after NUMERIC(12,2),
  created_by TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Assignments
CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  role_type TEXT DEFAULT 'account_manager',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Assignment Rules
CREATE TABLE IF NOT EXISTS default_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  team_member_id UUID NOT NULL,
  role TEXT DEFAULT 'account_manager',
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick Actions
CREATE TABLE IF NOT EXISTS quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  channel_id UUID,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Metrics
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT,
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  change TEXT,
  change_type TEXT DEFAULT 'neutral',
  icon TEXT DEFAULT 'activity',
  color TEXT DEFAULT 'cyan',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Dashboard Layouts
CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Appearance Settings
CREATE TABLE IF NOT EXISTS user_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT 'cyan',
  font_size TEXT DEFAULT 'medium',
  compact_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo Sessions
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '7 days')
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  progress INT DEFAULT 0,
  client_id UUID,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES (safe)
-- ================================================================

DO $$
BEGIN
  -- clients extra columns
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_website TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_phone TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_phone TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_boost_budget NUMERIC DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS boost_budget_currency TEXT DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS referrer_name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_notes TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- demo_users extra columns
  BEGIN ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS user_profile_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS team_member_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS session_token TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS phone TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- team_members extra columns
  BEGIN ALTER TABLE team_members ADD COLUMN IF NOT EXISTS phone TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bio TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE team_members ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- client_packages - ensure both status and is_active exist
  BEGIN ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS custom_monthly_fee NUMERIC(10,2); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS notes TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- channels extra columns
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_message TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'open'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channels ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- channel_members extra columns
  BEGIN ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS user_profile_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS role_in_channel TEXT DEFAULT 'member'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_by TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS notification_pref TEXT DEFAULT 'all'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- workspace extra columns
  BEGIN ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- workspace_members
  BEGIN ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- messages extra columns
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_count INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_sender TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_content TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS deliverable_tag TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS boost_tag TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- invoices extra columns
  BEGIN ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- campaigns extra columns
  BEGIN ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS goal TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- client_assignments extra columns
  BEGIN ALTER TABLE client_assignments ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'account_manager'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE client_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- dashboard_metrics
  BEGIN ALTER TABLE dashboard_metrics ADD COLUMN IF NOT EXISTS metric_key TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- deliverables
  BEGIN ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS days_left INT; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ================================================================
-- 3. UNIQUE CONSTRAINTS FOR UPSERT OPERATIONS
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_id_user_profile_id_key'
  ) THEN
    BEGIN
      ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_user_profile_id_key
        UNIQUE (workspace_id, user_profile_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_member_teams_member_team_unique'
  ) THEN
    BEGIN
      ALTER TABLE team_member_teams ADD CONSTRAINT team_member_teams_member_team_unique
        UNIQUE (team_member_id, team_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ================================================================
-- 4. ESSENTIAL INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_id ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_profile_id ON team_members(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_email ON demo_users(email);
CREATE INDEX IF NOT EXISTS idx_demo_users_tenant_id ON demo_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_wallets_client_id ON client_wallets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client_id ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_team_member_id ON client_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(client_wallet_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_client_id ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_assigned_to ON deliverables(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);

-- ================================================================
-- 5. ESSENTIAL TRIGGERS AND FUNCTIONS
-- ================================================================

-- Auto-create wallet when client is inserted
CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency, tenant_id)
  VALUES (NEW.id, 0, 'BDT', NEW.tenant_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- Auto-create workspace when client is inserted
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();

-- Update channel + workspace last_message_time on new message
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE channels
  SET last_message = LEFT(NEW.content, 200),
      last_message_time = NEW.created_at
  WHERE id = NEW.channel_id;
  
  UPDATE workspaces
  SET last_message = LEFT(NEW.content, 200),
      last_message_time = NEW.created_at
  WHERE id = (SELECT workspace_id FROM channels WHERE id = NEW.channel_id LIMIT 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_channel_last_message ON messages;
CREATE TRIGGER trg_update_channel_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_last_message();

-- Validate demo session
CREATE OR REPLACE FUNCTION validate_demo_session(p_user_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM demo_users
    WHERE id = p_user_id
    AND session_token = p_token
    AND is_active = true
  ) INTO v_valid;

  IF v_valid THEN
    UPDATE demo_users
    SET last_login_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN v_valid;
END;
$$ LANGUAGE plpgsql;

-- Create demo session
CREATE OR REPLACE FUNCTION create_demo_session(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE demo_users
  SET session_token = v_token,
      last_login_at = NOW()
  WHERE id = p_user_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- Forward message with attachments
CREATE OR REPLACE FUNCTION forward_message_with_attachments(
  p_original_message_id UUID,
  p_target_channel_id UUID,
  p_sender_id TEXT,
  p_sender_name TEXT,
  p_sender_avatar TEXT,
  p_sender_role TEXT,
  p_original_channel_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_original RECORD;
  v_new_message_id UUID;
  v_file RECORD;
BEGIN
  SELECT content, message_type INTO v_original
  FROM messages
  WHERE id = p_original_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original message not found';
  END IF;

  INSERT INTO messages (
    channel_id, sender_id, sender_name, sender_avatar, sender_role,
    content, status, message_type,
    forwarded_from_id, forwarded_from_channel
  ) VALUES (
    p_target_channel_id, p_sender_id, p_sender_name, p_sender_avatar, p_sender_role,
    v_original.content, 'sent', COALESCE(v_original.message_type, 'text'),
    p_original_message_id, p_original_channel_name
  ) RETURNING id INTO v_new_message_id;

  FOR v_file IN
    SELECT name, type, url, size, thumbnail
    FROM message_files
    WHERE message_id = p_original_message_id
  LOOP
    INSERT INTO message_files (message_id, name, type, url, size, thumbnail)
    VALUES (v_new_message_id, v_file.name, v_file.type, v_file.url, v_file.size, v_file.thumbnail);
  END LOOP;

  RETURN v_new_message_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 6. STORAGE BUCKET
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'message-attachments', 'message-attachments', true, 52428800, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'message-attachments');

-- ================================================================
-- 7. ENABLE REALTIME
-- ================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'messages', 'channels', 'workspaces', 'clients', 'activities',
    'notifications', 'deliverables', 'package_usage', 'client_assignments',
    'invoices', 'campaigns', 'team_members', 'channel_members',
    'workspace_members', 'wallet_transactions', 'demo_users'
  ]
  LOOP
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.%I', tbl);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ================================================================
-- 8. SEED DATA (only if missing)
-- ================================================================

-- Ensure demo_users exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM demo_users WHERE email = 'super@demo.com' AND tenant_id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO demo_users (tenant_id, email, password_hash, display_name, role, avatar, is_active) VALUES
      ('00000000-0000-0000-0000-000000000001', 'super@demo.com', '123456', 'Rahim Khan', 'super_admin', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', true),
      ('00000000-0000-0000-0000-000000000001', 'designer@demo.com', '123456', 'Nadia Ahmed', 'designer', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', true),
      ('00000000-0000-0000-0000-000000000001', 'mediabuyer@demo.com', '123456', 'Tanvir Hasan', 'media_buyer', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', true),
      ('00000000-0000-0000-0000-000000000001', 'manager@demo.com', '123456', 'Sara Islam', 'account_manager', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', true),
      ('00000000-0000-0000-0000-000000000001', 'finance@demo.com', '123456', 'Kamal Uddin', 'finance', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', true),
      ('00000000-0000-0000-0000-000000000001', 'client@demo.com', '123456', 'Fashion BD Store', 'client', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', true);
  END IF;
END $$;

-- Ensure dashboard metrics exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dashboard_metrics WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO dashboard_metrics (title, value, change, change_type, icon, color, tenant_id) VALUES
      ('Active Clients', '24', '+3 this month', 'positive', 'users', 'cyan', '00000000-0000-0000-0000-000000000001'),
      ('Monthly Revenue', '৳2.4M', '+12% vs last month', 'positive', 'trending-up', 'lime', '00000000-0000-0000-0000-000000000001'),
      ('Active Campaigns', '18', '+5 new', 'positive', 'zap', 'purple', '00000000-0000-0000-0000-000000000001'),
      ('Deliverables', '156', '92% on-time', 'neutral', 'package', 'magenta', '00000000-0000-0000-0000-000000000001');
  END IF;
END $$;

-- Ensure teams exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teams WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO teams (tenant_id, name, category, description, color, icon, total_members) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Design Team', 'design', 'Creative design and graphics', 'purple', 'palette', 3),
      ('00000000-0000-0000-0000-000000000001', 'Media Buying', 'media_buying', 'Campaign management and ads', 'magenta', 'megaphone', 2),
      ('00000000-0000-0000-0000-000000000001', 'Account Management', 'account_management', 'Client relationship management', 'cyan', 'users', 2),
      ('00000000-0000-0000-0000-000000000001', 'Finance', 'finance', 'Billing and financial operations', 'lime', 'dollar-sign', 1);
  END IF;
END $$;

-- Ensure roles exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO roles (tenant_id, name, description, is_system, user_count) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full system access', true, 1),
      ('00000000-0000-0000-0000-000000000001', 'Designer', 'Creative team member', true, 1),
      ('00000000-0000-0000-0000-000000000001', 'Media Buyer', 'Campaign manager', true, 1),
      ('00000000-0000-0000-0000-000000000001', 'Account Manager', 'Client manager', true, 1),
      ('00000000-0000-0000-0000-000000000001', 'Finance', 'Financial operations', true, 1),
      ('00000000-0000-0000-0000-000000000001', 'Client', 'Client portal access', true, 1);
  END IF;
END $$;

-- Ensure some seed activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM activities WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO activities (tenant_id, type, title, description, timestamp) VALUES
      ('00000000-0000-0000-0000-000000000001', 'client_update', 'New client onboarded', 'Fashion BD Store was added to the platform', NOW() - interval '1 hour'),
      ('00000000-0000-0000-0000-000000000001', 'deliverable_complete', 'Logo design completed', 'Completed logo redesign for Tech Solutions', NOW() - interval '2 hours'),
      ('00000000-0000-0000-0000-000000000001', 'campaign_launch', 'Facebook campaign launched', 'Started Eid Collection boost campaign', NOW() - interval '3 hours'),
      ('00000000-0000-0000-0000-000000000001', 'payment_received', 'Payment received', '৳45,000 payment from Foodie Express', NOW() - interval '5 hours'),
      ('00000000-0000-0000-0000-000000000001', 'team_update', 'Team member added', 'New designer joined the team', NOW() - interval '6 hours');
  END IF;
END $$;

-- Ensure some seed notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO notifications (tenant_id, title, description, type) VALUES
      ('00000000-0000-0000-0000-000000000001', 'System Ready', 'TITAN platform is fully operational', 'success'),
      ('00000000-0000-0000-0000-000000000001', 'New Deliverable Request', '3 new design requests pending', 'info'),
      ('00000000-0000-0000-0000-000000000001', 'Invoice Overdue', 'Fashion BD Store has an overdue invoice', 'warning');
  END IF;
END $$;

-- Ensure some seed clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO clients (tenant_id, business_name, category, status, health_score, contact_email, location) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Fashion BD Store', 'E-commerce', 'active', 92, 'info@fashionbd.com', 'Dhaka'),
      ('00000000-0000-0000-0000-000000000001', 'Tech Solutions BD', 'Technology', 'active', 85, 'hello@techsol.bd', 'Chittagong'),
      ('00000000-0000-0000-0000-000000000001', 'Foodie Express', 'Food & Beverage', 'active', 78, 'contact@foodie.bd', 'Dhaka'),
      ('00000000-0000-0000-0000-000000000001', 'Green Living BD', 'Lifestyle', 'active', 95, 'info@greenliving.bd', 'Sylhet');
  END IF;
END $$;

-- Ensure some seed packages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM packages WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    INSERT INTO packages (tenant_id, name, tier, plan_type, monthly_fee, currency, description, features, platform_count, correction_limit, is_active, display_order) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Starter', 'basic', 'monthly', 15000, 'BDT', 'Perfect for small businesses', '["15 Social Media Posts", "5 Stories", "1 Platform"]'::jsonb, 1, 2, true, 1),
      ('00000000-0000-0000-0000-000000000001', 'Growth', 'standard', 'monthly', 25000, 'BDT', 'For growing businesses', '["30 Social Media Posts", "15 Stories", "2 Reels", "2 Platforms"]'::jsonb, 2, 3, true, 2),
      ('00000000-0000-0000-0000-000000000001', 'Premium', 'premium', 'monthly', 45000, 'BDT', 'Full-service package', '["60 Social Media Posts", "30 Stories", "8 Reels", "3 Platforms", "Monthly Report"]'::jsonb, 3, 5, true, 3),
      ('00000000-0000-0000-0000-000000000001', 'Enterprise', 'enterprise', 'monthly', 75000, 'BDT', 'Custom enterprise solution', '["Unlimited Posts", "Unlimited Stories", "15 Reels", "All Platforms", "Dedicated Manager"]'::jsonb, 5, 10, true, 4);
  END IF;
END $$;
