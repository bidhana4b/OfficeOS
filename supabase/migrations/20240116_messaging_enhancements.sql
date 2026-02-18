-- =====================================================
-- MESSAGING ENHANCEMENTS MIGRATION
-- Phase 1: Message Actions (edit, delete, pin, bookmark, forward)
-- Phase 2: File attachments via Supabase Storage
-- Phase 3: Channel member management
-- =====================================================

-- Add new columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'video', 'file', 'system'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INT DEFAULT 0;

-- Add columns to channels for enhanced management
ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS pinned_message_ids UUID[] DEFAULT '{}';

-- Pinned messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  pinned_by UUID,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id)
);

-- Saved/bookmarked messages
CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Read receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Channel members (for managing who's in a channel)
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  user_role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  notification_pref TEXT DEFAULT 'all' CHECK (notification_pref IN ('all', 'mentions', 'none')),
  UNIQUE(channel_id, user_id)
);

-- Canned responses / templates
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  category TEXT DEFAULT 'general',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INT DEFAULT 0
);

-- Enable realtime on new tables
ALTER TABLE pinned_messages REPLICA IDENTITY FULL;
ALTER TABLE saved_messages REPLICA IDENTITY FULL;
ALTER TABLE message_read_receipts REPLICA IDENTITY FULL;
ALTER TABLE channel_members REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pinned_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pinned_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_read_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'channel_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
  END IF;
END$$;

-- Create storage bucket for message attachments (handled via client, but we add a policy-ready structure)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow all uploads/downloads for message attachments
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'message-attachments');
