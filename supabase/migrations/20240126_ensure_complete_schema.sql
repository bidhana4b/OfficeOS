-- =====================================================
-- PHASE: Ensure Complete Schema Integrity
-- Verifies all tables, constraints, and triggers exist
-- Safe to run multiple times
-- =====================================================

-- 1. Ensure usage_deduction_events table exists
CREATE TABLE IF NOT EXISTS usage_deduction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID REFERENCES client_packages(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  deliverable_type TEXT,
  deliverable_name TEXT,
  quantity INT DEFAULT 1,
  confirmed_by UUID,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure pinned_messages table exists
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  pinned_by UUID,
  pinned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure saved_messages table exists
CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_profile_id UUID,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure message_read_receipts table exists
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_profile_id UUID,
  read_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ensure canned_responses table exists
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

-- 6. Ensure message_files table exists
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

-- 7. quick_actions table already exists from messaging upgrade migration

-- 8. Ensure channel_members has proper columns
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
    WHERE table_name = 'channel_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE channel_members ADD COLUMN role TEXT DEFAULT 'member';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channel_members' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE channel_members ADD COLUMN added_by TEXT;
  END IF;
END $$;

-- 9. Ensure workspace_members has unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_members_workspace_id_user_profile_id_key'
  ) THEN
    BEGIN
      ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_user_profile_id_key
        UNIQUE (workspace_id, user_profile_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 10. Ensure client_wallets has unique constraint on client_id for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_wallets_client_id_key'
  ) THEN
    BEGIN
      ALTER TABLE client_wallets ADD CONSTRAINT client_wallets_client_id_key UNIQUE (client_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 11. Ensure team_member_teams table exists for team linkage
CREATE TABLE IF NOT EXISTS team_member_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, team_id)
);

-- 12. RLS policies for new tables (permissive for demo)
DO $$ BEGIN
  ALTER TABLE IF EXISTS usage_deduction_events ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "usage_deduction_events_all_access" ON usage_deduction_events;
  CREATE POLICY "usage_deduction_events_all_access" ON usage_deduction_events FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS pinned_messages ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "pinned_messages_all_access" ON pinned_messages;
  CREATE POLICY "pinned_messages_all_access" ON pinned_messages FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS saved_messages ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "saved_messages_all_access" ON saved_messages;
  CREATE POLICY "saved_messages_all_access" ON saved_messages FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS message_read_receipts ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "message_read_receipts_all_access" ON message_read_receipts;
  CREATE POLICY "message_read_receipts_all_access" ON message_read_receipts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS canned_responses ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "canned_responses_all_access" ON canned_responses;
  CREATE POLICY "canned_responses_all_access" ON canned_responses FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS message_files ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "message_files_all_access" ON message_files;
  CREATE POLICY "message_files_all_access" ON message_files FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS quick_actions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "quick_actions_all_access" ON quick_actions;
  CREATE POLICY "quick_actions_all_access" ON quick_actions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS team_member_teams ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "team_member_teams_all_access" ON team_member_teams;
  CREATE POLICY "team_member_teams_all_access" ON team_member_teams FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS user_appearance_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "user_appearance_settings_all_access" ON user_appearance_settings;
  CREATE POLICY "user_appearance_settings_all_access" ON user_appearance_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 13. Enable realtime on additional tables
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE usage_deduction_events; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE canned_responses; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE quick_actions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_files; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE demo_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_member_teams; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 14. Quick actions seed data already present from other migrations
