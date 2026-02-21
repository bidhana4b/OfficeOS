-- Phase 3: File Upload System Fix
-- Phase 4: Forward Message Fix  
-- Phase 5: Session Management improvements

-- ================================================================
-- PHASE 3: FILE UPLOAD SYSTEM
-- ================================================================

-- Ensure message_files table exists with all needed columns
CREATE TABLE IF NOT EXISTS message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'document',
  url TEXT NOT NULL,
  size TEXT,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for message_files
CREATE INDEX IF NOT EXISTS idx_message_files_message_id ON message_files(message_id);

-- Ensure messages table has voice columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INT;

-- ================================================================
-- PHASE 4: FORWARD MESSAGE FIX
-- ================================================================

-- Ensure forward columns exist on messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT;

-- Create index for forwarded messages
CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from ON messages(forwarded_from_id) WHERE forwarded_from_id IS NOT NULL;

-- Function to forward message with attachments
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
  -- Get original message
  SELECT content, message_type INTO v_original
  FROM messages
  WHERE id = p_original_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original message not found';
  END IF;

  -- Insert forwarded message
  INSERT INTO messages (
    channel_id, sender_id, sender_name, sender_avatar, sender_role,
    content, status, message_type,
    forwarded_from_id, forwarded_from_channel
  ) VALUES (
    p_target_channel_id, p_sender_id, p_sender_name, p_sender_avatar, p_sender_role,
    v_original.content, 'sent', COALESCE(v_original.message_type, 'text'),
    p_original_message_id, p_original_channel_name
  ) RETURNING id INTO v_new_message_id;

  -- Copy attachments
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
-- PHASE 5: SESSION MANAGEMENT
-- ================================================================

-- Ensure demo_users has all required session columns
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE demo_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add index for session lookups
CREATE INDEX IF NOT EXISTS idx_demo_users_email ON demo_users(email);
CREATE INDEX IF NOT EXISTS idx_demo_users_session ON demo_users(session_token) WHERE session_token IS NOT NULL;

-- Function to validate and refresh session
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

-- Function to create session
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

-- Enable realtime for message_files
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_files;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
