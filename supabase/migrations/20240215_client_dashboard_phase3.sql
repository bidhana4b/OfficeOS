-- Client Dashboard Phase 3: Support Tickets, Deliverable Ratings, Content Calendar, Analytics, Brand Kit

-- 1. Support Ticket System
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'deliverable', 'account', 'feedback')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')),
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Support ticket replies
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'client' CHECK (sender_type IN ('client', 'agent', 'system')),
  sender_id UUID,
  sender_name TEXT,
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON support_ticket_replies(ticket_id);

-- 2. Deliverable Ratings / Feedback
CREATE TABLE IF NOT EXISTS deliverable_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deliverable_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_deliverable_ratings_deliverable ON deliverable_ratings(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_ratings_client ON deliverable_ratings(client_id);

-- 3. Content Calendar (scheduled deliverables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'scheduled_publish_date') THEN
    ALTER TABLE deliverables ADD COLUMN scheduled_publish_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'published_at') THEN
    ALTER TABLE deliverables ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'publish_platform') THEN
    ALTER TABLE deliverables ADD COLUMN publish_platform TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'calendar_color') THEN
    ALTER TABLE deliverables ADD COLUMN calendar_color TEXT DEFAULT '#00D9FF';
  END IF;
END
$$;

-- 4. Brand Kit Repository
CREATE TABLE IF NOT EXISTS brand_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'logo' CHECK (item_type IN ('logo', 'color', 'font', 'guideline', 'template', 'asset')),
  name TEXT NOT NULL,
  value TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_kit_items_client ON brand_kit_items(client_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_items_type ON brand_kit_items(item_type);

-- 5. Client Analytics snapshot (monthly stats cache)
CREATE TABLE IF NOT EXISTS client_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  month_year TEXT NOT NULL,
  total_deliverables INTEGER DEFAULT 0,
  approved_deliverables INTEGER DEFAULT 0,
  revision_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_spend NUMERIC(12,2) DEFAULT 0,
  boost_spend NUMERIC(12,2) DEFAULT 0,
  boost_impressions BIGINT DEFAULT 0,
  boost_clicks BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_client ON client_analytics_snapshots(client_id);

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'support_ticket_replies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_ticket_replies;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'deliverable_ratings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_ratings;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'brand_kit_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE brand_kit_items;
  END IF;
END
$$;
