-- ================================================================
-- TITAN DEV AI: Comprehensive System Health Migration
-- Ensures ALL tables, columns, triggers, indexes, and functions exist
-- Safe to run multiple times (all operations use IF NOT EXISTS / OR REPLACE)
-- ================================================================

-- ================================================================
-- 1. ENSURE ALL CORE TABLES EXIST
-- ================================================================

-- Ensure client_wallets table exists
CREATE TABLE IF NOT EXISTS client_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  balance NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure client_assignments table exists
CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure default_assignment_rules table exists
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

-- Ensure quick_actions table exists
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

-- Ensure client_package_features table exists
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

-- Ensure pinned_messages table exists
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  pinned_by TEXT,
  pinned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure saved_messages table exists
CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure message_read_receipts table exists
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure canned_responses table exists
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

-- Ensure message_reactions table exists
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  user_ids TEXT[] DEFAULT '{}',
  count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure message_files table exists
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

-- Ensure invoices table exists
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  invoice_number TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure campaigns table exists
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
  notes TEXT,
  created_by TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure wallet_transactions table exists
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

-- Ensure dashboard_metrics table exists
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  change TEXT,
  change_type TEXT DEFAULT 'neutral',
  icon TEXT DEFAULT 'activity',
  color TEXT DEFAULT 'cyan',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_dashboard_layouts table exists
CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_appearance_settings table exists
CREATE TABLE IF NOT EXISTS user_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT 'cyan',
  font_size TEXT DEFAULT 'medium',
  compact_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_skills table exists
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure team_member_teams junction table exists
CREATE TABLE IF NOT EXISTS team_member_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL,
  team_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure demo_sessions table exists for session management
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '7 days')
);

-- ================================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ================================================================

-- demo_users columns
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- messages columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_count INT DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_sender TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deliverable_tag TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS boost_tag TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT false;

-- channels columns
ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'open';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;

-- channel_members columns
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS user_profile_id UUID;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS role_in_channel TEXT DEFAULT 'member';
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_by TEXT;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS notification_pref TEXT DEFAULT 'all';

-- workspaces columns
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

-- workspace_members columns
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- clients columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- team_members columns
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2);

-- deliverables columns (safe additions)
DO $$
BEGIN
  BEGIN ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS days_left INT; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- ================================================================
-- 3. ESSENTIAL INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_client_wallets_client_id ON client_wallets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client_id ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_team_member_id ON client_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(client_wallet_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_files_message_id ON message_files(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_saved_messages_user_id ON saved_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel_id ON pinned_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_team_member_id ON user_skills(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_teams_team_member_id ON team_member_teams(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_teams_team_id ON team_member_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_email ON demo_users(email);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_last_message_time ON channels(last_message_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_workspaces_last_message_time ON workspaces(last_message_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_assigned_to ON deliverables(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deliverables_client_id ON deliverables(client_id);

-- ================================================================
-- 4. ESSENTIAL FUNCTIONS
-- ================================================================

-- Function: update channel + workspace last_message_time on new message
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

-- Function: Auto-create wallet when client is inserted
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

-- Function: Auto-create workspace when client is inserted
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

-- Function: Validate demo session
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

-- Function: Create demo session
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

-- Function: Forward message with attachments
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
-- 5. BACKFILL LAST_MESSAGE_TIME (safe to run multiple times)
-- ================================================================

UPDATE channels c
SET last_message_time = sub.max_time,
    last_message = sub.last_content
FROM (
  SELECT DISTINCT ON (m.channel_id)
    m.channel_id,
    m.created_at as max_time,
    LEFT(m.content, 200) as last_content
  FROM messages m
  ORDER BY m.channel_id, m.created_at DESC
) sub
WHERE c.id = sub.channel_id
AND c.last_message_time IS NULL;

UPDATE workspaces w
SET last_message_time = sub.max_time,
    last_message = sub.last_content
FROM (
  SELECT DISTINCT ON (c.workspace_id)
    c.workspace_id,
    m.created_at as max_time,
    LEFT(m.content, 200) as last_content
  FROM messages m
  JOIN channels c ON c.id = m.channel_id
  ORDER BY c.workspace_id, m.created_at DESC
) sub
WHERE w.id = sub.workspace_id
AND w.last_message_time IS NULL;

-- ================================================================
-- 6. ENABLE REALTIME (ignore if already enabled)
-- ================================================================

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE deliverables; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE package_usage; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_files; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ================================================================
-- 7. ENSURE SEED DATA EXISTS FOR DASHBOARD METRICS
-- ================================================================

-- Add metric_key column if it exists on the table (the real schema has it)
DO $$
BEGIN
  -- Insert seed metrics only if none exist for the tenant
  IF NOT EXISTS (SELECT 1 FROM dashboard_metrics WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    -- Check if metric_key column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_metrics' AND column_name = 'metric_key') THEN
      INSERT INTO dashboard_metrics (metric_key, title, value, change, change_type, icon, color, tenant_id) VALUES
        ('active_clients', 'Active Clients', '24', '+3 this month', 'positive', 'users', 'cyan', '00000000-0000-0000-0000-000000000001'),
        ('monthly_revenue', 'Monthly Revenue', '৳2.4M', '+12% vs last month', 'positive', 'trending-up', 'lime', '00000000-0000-0000-0000-000000000001'),
        ('active_campaigns', 'Active Campaigns', '18', '+5 new', 'positive', 'zap', 'purple', '00000000-0000-0000-0000-000000000001'),
        ('deliverables', 'Deliverables', '156', '92% on-time', 'neutral', 'package', 'magenta', '00000000-0000-0000-0000-000000000001');
    ELSE
      INSERT INTO dashboard_metrics (title, value, change, change_type, icon, color, tenant_id) VALUES
        ('Active Clients', '24', '+3 this month', 'positive', 'users', 'cyan', '00000000-0000-0000-0000-000000000001'),
        ('Monthly Revenue', '৳2.4M', '+12% vs last month', 'positive', 'trending-up', 'lime', '00000000-0000-0000-0000-000000000001'),
        ('Active Campaigns', '18', '+5 new', 'positive', 'zap', 'purple', '00000000-0000-0000-0000-000000000001'),
        ('Deliverables', '156', '92% on-time', 'neutral', 'package', 'magenta', '00000000-0000-0000-0000-000000000001');
    END IF;
  END IF;
END $$;

-- ================================================================
-- 8. CREATE STORAGE BUCKET FOR MESSAGE ATTACHMENTS (via SQL)
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'message-attachments', 'message-attachments', true, 52428800, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'message-attachments');

-- Storage policies for message-attachments bucket
DROP POLICY IF EXISTS "Allow public read access on message-attachments" ON storage.objects;
CREATE POLICY "Allow public read access on message-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow authenticated uploads to message-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to message-attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow authenticated updates to message-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated updates to message-attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow authenticated deletes from message-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from message-attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'message-attachments');
