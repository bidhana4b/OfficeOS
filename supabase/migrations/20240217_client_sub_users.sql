CREATE TABLE IF NOT EXISTS client_sub_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'approver', 'billing_manager', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited', 'removed')),
  avatar TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{"can_view_tasks": true, "can_approve_deliverables": false, "can_manage_billing": false, "can_send_messages": true, "can_request_deliverables": false, "can_view_analytics": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_sub_users_client_id ON client_sub_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sub_users_email ON client_sub_users(email);

CREATE TABLE IF NOT EXISTS client_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID NOT NULL,
  sub_user_id UUID,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_log_client_id ON client_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_log_sub_user_id ON client_activity_log(sub_user_id);

ALTER TABLE client_sub_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on client_sub_users" ON client_sub_users;
CREATE POLICY "Allow all on client_sub_users" ON client_sub_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on client_activity_log" ON client_activity_log;
CREATE POLICY "Allow all on client_activity_log" ON client_activity_log FOR ALL USING (true);
