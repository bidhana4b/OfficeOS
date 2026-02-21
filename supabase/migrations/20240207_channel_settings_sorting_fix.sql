-- Phase 1 & 2: Channel Settings Panel + Workspace/Channel Sorting Fix
-- Ensures channels table has all required columns and triggers for last_message_time updates

-- 1. Ensure channels has all needed columns
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

-- 2. Ensure channel_members has all needed columns (dual schema support)
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS user_profile_id UUID;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS role_in_channel TEXT DEFAULT 'member';
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_by TEXT;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS notification_pref TEXT DEFAULT 'all';

-- 3. Ensure workspaces has last_message_time column
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

-- 4. Create/replace trigger to update channel.last_message_time when a new message is inserted
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE channels
  SET last_message = LEFT(NEW.content, 200),
      last_message_time = NEW.created_at
  WHERE id = NEW.channel_id;
  
  -- Also update the workspace last_message_time
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

-- 5. Backfill last_message_time for channels that have messages but no timestamp
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

-- 6. Backfill last_message_time for workspaces
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

-- 7. Create indexes for better sorting performance
CREATE INDEX IF NOT EXISTS idx_channels_last_message_time ON channels(last_message_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_workspaces_last_message_time ON workspaces(last_message_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_profile_id ON channel_members(user_profile_id);

-- 8. Enable realtime for tables (ignore errors if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE channels;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
