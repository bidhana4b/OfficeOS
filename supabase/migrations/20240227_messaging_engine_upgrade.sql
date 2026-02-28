-- ============================================================
-- MESSAGING ENGINE UPGRADE
-- 1. Storage bucket for message-attachments
-- 2. Realtime on messages, channels, notifications
-- 3. Channel member access validation + notify on add
-- 4. Read receipts trigger logic
-- 5. Typing indicator cleanup improvements
-- ============================================================

-- ============================================
-- 1. STORAGE BUCKET: message-attachments
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  52428800,
  ARRAY['image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
        'video/mp4','video/webm','video/quicktime',
        'audio/mpeg','audio/wav','audio/webm','audio/ogg',
        'application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip','text/plain','text/csv']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

DROP POLICY IF EXISTS "Public read message-attachments" ON storage.objects;
CREATE POLICY "Public read message-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated upload message-attachments" ON storage.objects;
CREATE POLICY "Authenticated upload message-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated delete message-attachments" ON storage.objects;
CREATE POLICY "Authenticated delete message-attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-attachments');

-- ============================================
-- 2. REALTIME: enable on messages, channels, notifications, typing_indicators, message_read_receipts
-- ============================================
DO $$ BEGIN
  ALTER TABLE messages REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE channels REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE message_files REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE channel_members REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE typing_indicators REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE message_read_receipts REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_files; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ============================================
-- 3. CHANNEL MEMBER ACCESS VALIDATION
-- ============================================

-- Function: validate_channel_access - checks if user is a member of the channel
CREATE OR REPLACE FUNCTION validate_channel_access(
  p_channel_id UUID,
  p_user_profile_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_member BOOLEAN;
  v_channel_type TEXT;
BEGIN
  SELECT type INTO v_channel_type FROM channels WHERE id = p_channel_id;
  
  IF v_channel_type = 'general' THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id
    AND user_profile_id = p_user_profile_id
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql;

-- Function: validate_message_send - check access before sending
CREATE OR REPLACE FUNCTION validate_message_send()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_type TEXT;
  v_has_access BOOLEAN;
BEGIN
  SELECT type INTO v_channel_type FROM channels WHERE id = NEW.channel_id;
  
  IF v_channel_type = 'general' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.is_system_message = TRUE THEN
    RETURN NEW;
  END IF;
  
  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM channel_members
    WHERE channel_id = NEW.channel_id
    AND user_profile_id = NEW.sender_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    SELECT EXISTS(
      SELECT 1 FROM workspace_members wm
      JOIN channels c ON c.workspace_id = wm.workspace_id
      WHERE c.id = NEW.channel_id
      AND wm.user_profile_id = NEW.sender_id
    ) INTO v_has_access;
  END IF;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'User does not have access to this channel';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_message_send ON messages;
CREATE TRIGGER trg_validate_message_send
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_send();

-- ============================================
-- 4. CHANNEL MEMBER: notify on add
-- ============================================

CREATE OR REPLACE FUNCTION notify_channel_member_added()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_name TEXT;
  v_workspace_id UUID;
  v_added_by_name TEXT DEFAULT 'Someone';
  v_member_name TEXT DEFAULT 'User';
  v_tenant_id UUID;
BEGIN
  SELECT c.name, c.workspace_id INTO v_channel_name, v_workspace_id
  FROM channels c WHERE c.id = NEW.channel_id;

  IF v_channel_name IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w.tenant_id INTO v_tenant_id
  FROM workspaces w WHERE w.id = v_workspace_id;

  SELECT COALESCE(wm.name, 'Someone')
  INTO v_added_by_name
  FROM workspace_members wm
  WHERE wm.user_profile_id::TEXT = COALESCE(NEW.added_by, '')
  AND wm.workspace_id = v_workspace_id
  LIMIT 1;

  v_added_by_name := COALESCE(v_added_by_name, 'Someone');

  SELECT COALESCE(wm.name, 'User')
  INTO v_member_name
  FROM workspace_members wm
  WHERE wm.user_profile_id = NEW.user_profile_id
  AND wm.workspace_id = v_workspace_id
  LIMIT 1;

  v_member_name := COALESCE(v_member_name, 'User');

  INSERT INTO notifications (tenant_id, user_id, title, message, type, action_url, read)
  VALUES (
    v_tenant_id,
    NEW.user_profile_id,
    'Added to Channel',
    v_added_by_name || ' added you to #' || COALESCE(v_channel_name, 'channel'),
    'messaging',
    '/messaging?channel=' || NEW.channel_id::TEXT,
    false
  );

  INSERT INTO messages (channel_id, sender_name, sender_role, content, is_system_message)
  VALUES (
    NEW.channel_id,
    'System',
    'admin',
    v_member_name || ' has been added to the channel by ' || v_added_by_name,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_channel_member_added ON channel_members;
CREATE TRIGGER trg_notify_channel_member_added
  AFTER INSERT ON channel_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_channel_member_added();

-- ============================================
-- 5. READ RECEIPTS: auto-update message status
-- ============================================

CREATE OR REPLACE FUNCTION update_message_status_on_read()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_id UUID;
  v_total_members INT;
  v_total_readers INT;
BEGIN
  SELECT sender_id INTO v_sender_id FROM messages WHERE id = NEW.message_id;
  
  IF v_sender_id IS NOT NULL AND NEW.reader_profile_id != v_sender_id THEN
    UPDATE messages SET status = 'read' WHERE id = NEW.message_id AND status != 'read';
  END IF;

  SELECT COUNT(*) INTO v_total_members
  FROM channel_members WHERE channel_id = NEW.channel_id;

  SELECT COUNT(DISTINCT reader_profile_id) INTO v_total_readers
  FROM message_read_receipts WHERE message_id = NEW.message_id;

  IF v_total_readers >= GREATEST(v_total_members - 1, 1) THEN
    UPDATE messages SET status = 'read' WHERE id = NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_message_status_on_read ON message_read_receipts;
CREATE TRIGGER trg_update_message_status_on_read
  AFTER INSERT ON message_read_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_message_status_on_read();

-- ============================================
-- 6. CHANNEL/WORKSPACE STATS: update on new messages
-- ============================================

CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE channels SET
    last_message = LEFT(NEW.content, 100),
    last_message_time = NEW.created_at,
    unread_count = unread_count + 1
  WHERE id = NEW.channel_id;

  UPDATE workspaces SET
    last_message = LEFT(NEW.content, 100),
    last_message_time = NEW.created_at,
    unread_count = unread_count + 1
  WHERE id = (SELECT workspace_id FROM channels WHERE id = NEW.channel_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_channel_last_message ON messages;
CREATE TRIGGER trg_update_channel_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_last_message();

-- ============================================
-- 7. MARK CHANNEL AS READ RPC
-- ============================================

CREATE OR REPLACE FUNCTION mark_channel_as_read(
  p_channel_id UUID,
  p_reader_profile_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO message_read_receipts (message_id, reader_profile_id, channel_id)
  SELECT m.id, p_reader_profile_id, p_channel_id
  FROM messages m
  WHERE m.channel_id = p_channel_id
  AND m.sender_id IS DISTINCT FROM p_reader_profile_id
  AND NOT EXISTS (
    SELECT 1 FROM message_read_receipts mrr
    WHERE mrr.message_id = m.id
    AND mrr.reader_profile_id = p_reader_profile_id
  )
  ORDER BY m.created_at DESC
  LIMIT 50;

  UPDATE channels SET unread_count = 0 WHERE id = p_channel_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TYPING INDICATOR CLEANUP (auto-expire)
-- ============================================

CREATE OR REPLACE FUNCTION clean_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. ENSURE message_files has needed columns
-- ============================================
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS channel_id UUID;
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS file_size INT DEFAULT 0;
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE message_files ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION set_message_file_channel_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel_id IS NULL THEN
    SELECT channel_id INTO NEW.channel_id FROM messages WHERE id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_message_file_channel_id ON message_files;
CREATE TRIGGER trg_set_message_file_channel_id
  BEFORE INSERT ON message_files
  FOR EACH ROW
  EXECUTE FUNCTION set_message_file_channel_id();

-- ============================================
-- 10. INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_channel_reader ON message_read_receipts(channel_id, reader_profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_typing_expires ON typing_indicators(expires_at);

-- ============================================
-- 11. ENSURE messages has needed columns for full feature set
-- ============================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT;
