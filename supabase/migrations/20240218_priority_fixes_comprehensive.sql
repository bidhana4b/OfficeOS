-- =====================================================
-- TITAN DEV AI - Priority Fixes Comprehensive Migration
-- Ensures ALL missing tables, columns, functions, and
-- seed data are properly created
-- =====================================================

-- 1. Ensure client_performance table exists (used by ClientHome)
CREATE TABLE IF NOT EXISTS client_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  posts_published INTEGER DEFAULT 0,
  ad_spend_this_month NUMERIC(12,2) DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  follower_growth INTEGER DEFAULT 0,
  month TEXT DEFAULT to_char(NOW(), 'YYYY-MM'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_performance_client ON client_performance(client_id);

-- 2. Ensure client_wallets table exists
CREATE TABLE IF NOT EXISTS client_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL UNIQUE,
  balance NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_wallets_client ON client_wallets(client_id);

-- 3. Ensure wallet_transactions table has client_id column if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'client_id') THEN
      ALTER TABLE wallet_transactions ADD COLUMN client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'balance_after') THEN
      ALTER TABLE wallet_transactions ADD COLUMN balance_after NUMERIC(12,2);
    END IF;
  ELSE
    CREATE TABLE wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
      client_id UUID,
      type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
      amount NUMERIC(12,2) NOT NULL,
      description TEXT,
      reference_type TEXT,
      reference_id UUID,
      balance_after NUMERIC(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client ON wallet_transactions(client_id);
  END IF;
END $$;

-- 4. Ensure client_packages table exists
CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  package_id UUID NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  start_date DATE DEFAULT CURRENT_DATE,
  renewal_date DATE,
  billing_cycle TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON client_packages(client_id);

-- 5. Ensure package_usage table exists
CREATE TABLE IF NOT EXISTS package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_package_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_package_usage_cp ON package_usage(client_package_id);

-- 6. Ensure notifications table has target_client_id column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_client_id') THEN
      ALTER TABLE notifications ADD COLUMN target_client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
      ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
      ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'general';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
      ALTER TABLE notifications ADD COLUMN action_url TEXT;
    END IF;
  END IF;
END $$;

-- 7. Ensure invoices table exists
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  description TEXT,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 8. Ensure campaigns table exists
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  platform TEXT DEFAULT 'facebook',
  campaign_type TEXT DEFAULT 'boost',
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'pending', 'active', 'live', 'paused', 'completed', 'cancelled', 'ended')),
  budget NUMERIC(12,2) DEFAULT 0,
  spent NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  target_audience JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- 9. Ensure deliverables has all necessary columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverables') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'requested_by_client') THEN
      ALTER TABLE deliverables ADD COLUMN requested_by_client BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'priority') THEN
      ALTER TABLE deliverables ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'requested_deadline') THEN
      ALTER TABLE deliverables ADD COLUMN requested_deadline DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'confirmed_by') THEN
      ALTER TABLE deliverables ADD COLUMN confirmed_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'confirmed_at') THEN
      ALTER TABLE deliverables ADD COLUMN confirmed_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- 10. Ensure deliverable_revisions table exists
CREATE TABLE IF NOT EXISTS deliverable_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL,
  revision_number INTEGER DEFAULT 1,
  notes TEXT,
  requested_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliverable_revisions_deliverable ON deliverable_revisions(deliverable_id);

-- 11. Ensure client_shared_files table exists (for Files hub)
CREATE TABLE IF NOT EXISTS client_shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'brand_asset', 'deliverable', 'document', 'contract', 'brief')),
  uploaded_by TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_shared_files_client ON client_shared_files(client_id);

-- 12. Ensure client_notification_preferences exists
CREATE TABLE IF NOT EXISTS client_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  task_updates BOOLEAN DEFAULT true,
  billing_alerts BOOLEAN DEFAULT true,
  message_alerts BOOLEAN DEFAULT true,
  package_renewal_alerts BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  weekly_digest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Ensure brand_kit_items table exists
CREATE TABLE IF NOT EXISTS brand_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('logo', 'color', 'font', 'guideline', 'template', 'asset')),
  name TEXT NOT NULL,
  value TEXT,
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brand_kit_items_client ON brand_kit_items(client_id);

-- 14. Ensure package_change_requests exists
CREATE TABLE IF NOT EXISTS package_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  current_package_id UUID,
  requested_package_id UUID,
  request_type TEXT DEFAULT 'upgrade' CHECK (request_type IN ('upgrade', 'downgrade', 'addon')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_package_change_requests_client ON package_change_requests(client_id);

-- 15. Ensure client_assignments table exists
CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID,
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_team ON client_assignments(team_member_id);

-- 16. Ensure default_assignment_rules table exists
CREATE TABLE IF NOT EXISTS default_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  category TEXT NOT NULL,
  team_member_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Ensure clients has necessary columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'contact_person') THEN
      ALTER TABLE clients ADD COLUMN contact_person TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'social_links') THEN
      ALTER TABLE clients ADD COLUMN social_links JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'timezone') THEN
      ALTER TABLE clients ADD COLUMN timezone TEXT DEFAULT 'Asia/Dhaka';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'business_hours') THEN
      ALTER TABLE clients ADD COLUMN business_hours TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'contact_website') THEN
      ALTER TABLE clients ADD COLUMN contact_website TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address') THEN
      ALTER TABLE clients ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'notes') THEN
      ALTER TABLE clients ADD COLUMN notes TEXT;
    END IF;
  END IF;
END $$;

-- 18. Ensure workspaces table has client_id column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'client_id') THEN
      ALTER TABLE workspaces ADD COLUMN client_id UUID;
    END IF;
  END IF;
END $$;

-- 19. Ensure channels has unread_count
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channels') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'unread_count') THEN
      ALTER TABLE channels ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- 20. Create helper function for auto-creating wallet on client insert
CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- 21. Create sample notifications for existing clients (safe insert)
DO $$
DECLARE
  col_list TEXT;
BEGIN
  -- Build column list dynamically based on what exists
  SELECT string_agg(column_name, ', ') INTO col_list
  FROM information_schema.columns
  WHERE table_name = 'notifications'
  AND column_name IN ('tenant_id', 'title', 'message', 'priority', 'read', 'category', 'target_client_id', 'created_at');
  
  -- Only insert if target_client_id column exists
  IF col_list LIKE '%target_client_id%' THEN
    INSERT INTO notifications (tenant_id, title, message, priority, read, category, target_client_id, created_at)
    SELECT 
      '00000000-0000-0000-0000-000000000001',
      'Welcome to TITAN',
      'Your dashboard is ready! Explore your package usage, tasks, and more.',
      'medium',
      false,
      'general',
      c.id,
      NOW()
    FROM clients c
    WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n WHERE n.target_client_id = c.id AND n.title = 'Welcome to TITAN'
    )
    LIMIT 5;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not insert sample notifications: %', SQLERRM;
END $$;

-- 22. Create wallets for existing clients that don't have one
DO $$
BEGIN
  INSERT INTO client_wallets (client_id, balance)
  SELECT c.id, 5000
  FROM clients c
  WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM client_wallets w WHERE w.client_id = c.id);
EXCEPTION WHEN OTHERS THEN
  -- Try with tenant_id if column exists
  BEGIN
    INSERT INTO client_wallets (client_id, tenant_id, balance)
    SELECT c.id, c.tenant_id, 5000
    FROM clients c
    WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
    AND NOT EXISTS (SELECT 1 FROM client_wallets w WHERE w.client_id = c.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not insert client wallets: %', SQLERRM;
  END;
END $$;

-- 23. Create performance records for existing clients
DO $$
BEGIN
  INSERT INTO client_performance (client_id, tenant_id, posts_published, ad_spend_this_month, leads_generated, engagement_rate)
  SELECT c.id, c.tenant_id, 
    floor(random() * 30 + 5)::int, 
    floor(random() * 50000 + 5000)::numeric,
    floor(random() * 100 + 10)::int,
    (random() * 5 + 1)::numeric(5,2)
  FROM clients c
  WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM client_performance p WHERE p.client_id = c.id);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not insert client performance: %', SQLERRM;
END $$;

-- 24. Open RLS policies for all new tables (allow all for demo)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'client_performance', 'client_wallets', 'wallet_transactions', 
      'client_packages', 'package_usage', 'invoices', 'campaigns',
      'deliverable_revisions', 'client_shared_files', 
      'client_notification_preferences', 'brand_kit_items',
      'package_change_requests', 'client_assignments', 'default_assignment_rules'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all on %I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow all on %I" ON %I FOR ALL USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- 25. Enable realtime for key tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliverables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
