-- Fix notifications table to support client dashboard needs

-- Drop restrictive CHECK constraints on notifications category
DO $$
BEGIN
  -- Remove old check constraint on category
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%notifications_category%'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure notifications has all needed columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
    ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'info';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
    ALTER TABLE notifications ADD COLUMN message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_client_id') THEN
    ALTER TABLE notifications ADD COLUMN target_client_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- Ensure deliverable_requests table exists
CREATE TABLE IF NOT EXISTS deliverable_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  deliverable_type TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  requested_deadline DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  converted_deliverable_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliverable_requests_client ON deliverable_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_requests_status ON deliverable_requests(status);

-- RLS
ALTER TABLE deliverable_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on deliverable_requests" ON deliverable_requests;
CREATE POLICY "Allow all on deliverable_requests" ON deliverable_requests FOR ALL USING (true);

-- Create sample notifications for demo client
DO $$
DECLARE
  demo_client_id UUID;
BEGIN
  SELECT id INTO demo_client_id FROM clients 
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001' 
  LIMIT 1;
  
  IF demo_client_id IS NOT NULL THEN
    INSERT INTO notifications (tenant_id, title, message, priority, read, target_client_id, category, created_at)
    VALUES 
      ('00000000-0000-0000-0000-000000000001', 'Welcome to TITAN', 'Your dashboard is ready! Check your package usage and tasks.', 'medium', false, demo_client_id, 'general', NOW() - interval '1 hour'),
      ('00000000-0000-0000-0000-000000000001', 'New Deliverable Ready', 'Your social media post design is ready for review.', 'high', false, demo_client_id, 'task', NOW() - interval '2 hours'),
      ('00000000-0000-0000-0000-000000000001', 'Invoice Generated', 'Invoice #INV-2025-001 has been generated for ৳15,000.', 'medium', false, demo_client_id, 'billing', NOW() - interval '1 day'),
      ('00000000-0000-0000-0000-000000000001', 'Package Renewal Reminder', 'Your Standard Package renews in 15 days.', 'medium', false, demo_client_id, 'package', NOW() - interval '2 days'),
      ('00000000-0000-0000-0000-000000000001', 'Campaign Update', 'Your Facebook boost campaign reached 5,000 impressions!', 'low', true, demo_client_id, 'general', NOW() - interval '3 days')
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notification seed failed: %', SQLERRM;
END $$;
