-- Fix channels and workspaces to ensure all required columns exist

-- Add tenant_id to channels if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'tenant_id') THEN
    ALTER TABLE channels ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'is_default') THEN
    ALTER TABLE channels ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'description') THEN
    ALTER TABLE channels ADD COLUMN description TEXT;
  END IF;
END $$;

-- Ensure workspace has client_name column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'client_name') THEN
    ALTER TABLE workspaces ADD COLUMN client_name TEXT;
  END IF;
END $$;

-- Insert the demo workspace if not exists (using proper column set)
INSERT INTO workspaces (id, tenant_id, name, description, client_id, client_name, pinned, status)
VALUES (
  'a0000000-0000-0000-0000-000000000a01',
  '00000000-0000-0000-0000-000000000001',
  'Imperial Motors',
  'Client workspace for Imperial Motors',
  '00000000-0000-0000-0000-0000000000c1',
  'Imperial Motors',
  true,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert default channels
INSERT INTO channels (id, workspace_id, name, type, description, is_default, tenant_id)
VALUES
  ('b0000000-0000-0000-0000-000000000b01', 'a0000000-0000-0000-0000-000000000a01', 'general', 'general', 'General discussion', true, '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000b02', 'a0000000-0000-0000-0000-000000000a01', 'deliverables', 'deliverables', 'Deliverable requests and tracking', true, '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000b03', 'a0000000-0000-0000-0000-000000000a01', 'boost-requests', 'boost-requests', 'Ad boost requests', true, '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000b04', 'a0000000-0000-0000-0000-000000000a01', 'billing', 'billing', 'Billing and invoices', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Ensure message_files table exists (some components reference it)
CREATE TABLE IF NOT EXISTS message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure the activities table exists for logging
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS message_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities DISABLE ROW LEVEL SECURITY;
