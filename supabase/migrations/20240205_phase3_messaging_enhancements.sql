-- Phase 3: Messaging Enhancements
-- Features: Typing indicators, Read receipts, Message search, Threads, Draft messages

-- Clean up any partial tables from previous attempts
DROP TABLE IF EXISTS message_read_receipts CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS thread_messages CASCADE;
DROP TABLE IF EXISTS draft_messages CASCADE;
DROP TABLE IF EXISTS canned_responses CASCADE;
DROP TABLE IF EXISTS message_collections CASCADE;

-- 1. TYPING INDICATORS TABLE
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 seconds'),
  UNIQUE(channel_id, user_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_channel ON typing_indicators(channel_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user ON typing_indicators(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_workspace ON typing_indicators(workspace_id);

-- 2. READ RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, reader_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_reader ON message_read_receipts(reader_profile_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_channel ON message_read_receipts(channel_id);

-- 3. MESSAGE SEARCH INDEX (Full-text search)
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_message_search ON messages USING GIN(search_vector);

-- Update search_vector for existing messages
UPDATE messages 
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- 4. THREAD MESSAGES TABLE (for threaded conversations)
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  thread_parent_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, thread_parent_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_parent ON thread_messages(thread_parent_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_channel ON thread_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_message ON thread_messages(message_id);

-- 5. DRAFT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS draft_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_messages_channel ON draft_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_draft_messages_user ON draft_messages(user_profile_id);

-- 6. CANNED RESPONSES (Quick responses template)
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  creator_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  shortcut TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_workspace ON canned_responses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_creator ON canned_responses(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_category ON canned_responses(category);

-- 7. MESSAGE BOOKMARKS/COLLECTIONS
CREATE TABLE IF NOT EXISTS message_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  collector_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  collection_name TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, collector_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_message_collections_message ON message_collections(message_id);
CREATE INDEX IF NOT EXISTS idx_message_collections_collector ON message_collections(collector_profile_id);

-- 8. UPDATE SEARCH_VECTOR ON MESSAGE INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_message_search ON messages;
CREATE TRIGGER trg_update_message_search
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- 9. CLEAN UP EXPIRED TYPING INDICATORS
CREATE OR REPLACE FUNCTION clean_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. GET THREAD REPLY COUNT
CREATE OR REPLACE FUNCTION get_thread_reply_count(p_parent_message_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM thread_messages
  WHERE thread_parent_id = p_parent_message_id;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 11. ALTER MESSAGES TABLE - Add thread tracking columns if not exists
ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS thread_parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_thread_starter BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_thread_parent ON messages(thread_parent_id);

-- 12. Grant permissions for demo_users to access new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON typing_indicators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_read_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON thread_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON draft_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canned_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_collections TO authenticated;
