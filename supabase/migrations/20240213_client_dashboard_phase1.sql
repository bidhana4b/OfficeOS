-- Phase 1: Client Dashboard Enhancements
-- 1. Add missing client profile columns
-- 2. Deliverable requests table (client-submitted)
-- 3. Client notifications view enhancements

-- Add missing columns to clients table for profile editing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'contact_person') THEN
    ALTER TABLE clients ADD COLUMN contact_person TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'email') THEN
    ALTER TABLE clients ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'phone') THEN
    ALTER TABLE clients ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address') THEN
    ALTER TABLE clients ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'website') THEN
    ALTER TABLE clients ADD COLUMN website TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'social_links') THEN
    ALTER TABLE clients ADD COLUMN social_links JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'timezone') THEN
    ALTER TABLE clients ADD COLUMN timezone TEXT DEFAULT 'Asia/Dhaka (GMT+6)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'business_hours') THEN
    ALTER TABLE clients ADD COLUMN business_hours TEXT DEFAULT '9:00 AM - 6:00 PM';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'notes') THEN
    ALTER TABLE clients ADD COLUMN notes TEXT;
  END IF;
END
$$;

-- Deliverable requests from clients
CREATE TABLE IF NOT EXISTS deliverable_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  deliverable_type TEXT NOT NULL DEFAULT 'photo_graphics',
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'rejected', 'completed')),
  reference_files TEXT[] DEFAULT '{}',
  notes TEXT,
  requested_deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_requests_client ON deliverable_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_requests_status ON deliverable_requests(status);

-- Enable realtime for deliverable_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'deliverable_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_requests;
  END IF;
END
$$;

-- Ensure notifications table has client-facing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_user_id') THEN
    ALTER TABLE notifications ADD COLUMN target_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_client_id') THEN
    ALTER TABLE notifications ADD COLUMN target_client_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_notifications_target_client ON notifications(target_client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
