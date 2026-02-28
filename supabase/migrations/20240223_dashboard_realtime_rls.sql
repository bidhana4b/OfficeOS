-- Enable realtime on key dashboard tables
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE deliverables; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE wallet_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;

  ALTER PUBLICATION supabase_realtime ADD TABLE activities;
  ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
  ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
END;
$$;

-- Ensure dashboard_layouts table exists with proper schema
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id TEXT NOT NULL,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout_type TEXT NOT NULL DEFAULT 'grid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON dashboard_layouts(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_tenant ON dashboard_layouts(tenant_id);

-- RLS on dashboard_layouts
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own dashboard layout" ON dashboard_layouts;
CREATE POLICY "Users can view their own dashboard layout"
  ON dashboard_layouts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own dashboard layout" ON dashboard_layouts;
CREATE POLICY "Users can insert their own dashboard layout"
  ON dashboard_layouts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own dashboard layout" ON dashboard_layouts;
CREATE POLICY "Users can update their own dashboard layout"
  ON dashboard_layouts FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete their own dashboard layout" ON dashboard_layouts;
CREATE POLICY "Users can delete their own dashboard layout"
  ON dashboard_layouts FOR DELETE
  USING (true);

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE dashboard_layouts; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_layouts;
END;
$$;

-- Ensure activities has proper indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_activities_tenant_timestamp ON activities(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_tenant_assigned ON deliverables(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_deliverables_tenant_status ON deliverables(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
