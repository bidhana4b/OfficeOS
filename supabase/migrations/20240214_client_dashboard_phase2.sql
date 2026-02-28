-- Client Dashboard Phase 2: Files Hub, Account Security, Package Details, Payment History
-- This migration adds supporting tables and columns for Phase 2 features

-- 1. Shared Files / Assets Hub
CREATE TABLE IF NOT EXISTS client_shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  uploaded_by UUID,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document',
  file_size BIGINT DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_shared_files_client ON client_shared_files(client_id);
CREATE INDEX IF NOT EXISTS idx_client_shared_files_category ON client_shared_files(category);

-- 2. Client Notification Preferences
CREATE TABLE IF NOT EXISTS client_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  task_updates BOOLEAN DEFAULT true,
  billing_alerts BOOLEAN DEFAULT true,
  message_alerts BOOLEAN DEFAULT true,
  package_renewal_alerts BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notif_prefs_client ON client_notification_preferences(client_id);

-- 3. Package upgrade/downgrade requests
CREATE TABLE IF NOT EXISTS package_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  current_package_id UUID,
  requested_package_id UUID,
  request_type TEXT NOT NULL DEFAULT 'upgrade' CHECK (request_type IN ('upgrade', 'downgrade', 'addon')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pkg_change_req_client ON package_change_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_pkg_change_req_status ON package_change_requests(status);

-- 4. Deliverable revision history 
CREATE TABLE IF NOT EXISTS deliverable_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  requested_by UUID,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_del_revisions_deliverable ON deliverable_revisions(deliverable_id);

-- 5. Add file_category to distinguish approved deliverables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'final_file_url') THEN
    ALTER TABLE deliverables ADD COLUMN final_file_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'final_file_name') THEN
    ALTER TABLE deliverables ADD COLUMN final_file_name TEXT;
  END IF;
END
$$;

-- Enable realtime for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'client_shared_files'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_shared_files;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'package_change_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE package_change_requests;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'deliverable_revisions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_revisions;
  END IF;
END
$$;
