-- =====================================================
-- PHASE 1: COMPLETE SAFE MIGRATION
-- Combines migrations 112-118 with safe IF NOT EXISTS / DROP IF EXISTS
-- This can be run multiple times without errors
-- =====================================================

-- =====================================================
-- FROM 20240112: FUNCTIONAL TRIGGERS
-- =====================================================

-- PHASE 1: PACKAGE USAGE DEDUCTION TRIGGER
CREATE OR REPLACE FUNCTION deduct_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_client_package_id UUID;
  v_deliverable_type TEXT;
  v_quantity INT;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_client_package_id := NEW.client_package_id;
    v_deliverable_type := NEW.deliverable_type;
    v_quantity := COALESCE(NEW.quantity, 1);

    IF v_client_package_id IS NOT NULL AND v_deliverable_type IS NOT NULL THEN
      UPDATE package_usage
      SET used = used + v_quantity,
          updated_at = NOW()
      WHERE client_package_id = v_client_package_id
        AND deliverable_type = v_deliverable_type;

      INSERT INTO usage_deduction_events (
        client_package_id, deliverable_id, deliverable_type,
        deliverable_name, quantity, confirmed_by, status
      ) VALUES (
        v_client_package_id, NEW.id, v_deliverable_type,
        NEW.title, v_quantity, NEW.confirmed_by, 'confirmed'
      );

      INSERT INTO activities (
        tenant_id, client_id, type, title, description, timestamp, metadata
      ) VALUES (
        NEW.tenant_id, NEW.client_id, 'deliverable_created',
        'Deliverable Completed: ' || NEW.title,
        'Package usage deducted: ' || v_quantity || ' ' || v_deliverable_type,
        NOW(),
        jsonb_build_object('deliverableType', v_deliverable_type, 'quantity', v_quantity)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_package_usage ON deliverables;
CREATE TRIGGER trg_deduct_package_usage
  AFTER UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage();

-- PHASE 2: WALLET DEDUCTION TRIGGER
CREATE OR REPLACE FUNCTION process_wallet_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'debit' THEN
    UPDATE client_wallets
    SET balance = balance - NEW.amount, updated_at = NOW()
    WHERE id = NEW.client_wallet_id;
  ELSIF NEW.type = 'credit' THEN
    UPDATE client_wallets
    SET balance = balance + NEW.amount, updated_at = NOW()
    WHERE id = NEW.client_wallet_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_process_wallet ON wallet_transactions;
CREATE TRIGGER trg_process_wallet
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_wallet_transaction();

-- PHASE 3: AUTO ACTIVITY LOG ON CLIENT CREATE
CREATE OR REPLACE FUNCTION log_client_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (
    tenant_id, client_id, type, title, description, timestamp, metadata
  ) VALUES (
    NEW.tenant_id, NEW.id, 'client_onboarded',
    'New Client: ' || NEW.business_name,
    'Client onboarded - ' || COALESCE(NEW.category, 'Other'),
    NOW(),
    jsonb_build_object('category', COALESCE(NEW.category, 'Other'), 'location', COALESCE(NEW.location, ''))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_client_created ON clients;
CREATE TRIGGER trg_log_client_created
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_client_created();

-- PHASE 4: AUTO CREATE WALLET ON CLIENT CREATE
CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency)
  VALUES (NEW.id, 0, 'BDT')
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_wallet ON clients;
CREATE TRIGGER trg_auto_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- PHASE 5: AUTO INIT PACKAGE USAGE ON client_packages INSERT
CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO package_usage (client_package_id, deliverable_type, used, total)
  SELECT NEW.id, pf.deliverable_type, 0, pf.total_allocated
  FROM package_features pf
  WHERE pf.package_id = NEW.package_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_usage ON client_packages;
CREATE TRIGGER trg_auto_init_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- PHASE 6: AUTO CREATE WORKSPACE ON CLIENT CREATE
CREATE OR REPLACE FUNCTION auto_create_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_ws_id UUID;
BEGIN
  INSERT INTO workspaces (
    tenant_id, client_id, client_name, client_logo,
    last_message, last_message_time, status, health_score
  ) VALUES (
    NEW.tenant_id, NEW.id, NEW.business_name,
    LEFT(NEW.business_name, 2),
    'Welcome to ' || NEW.business_name || ' workspace!',
    NOW(), 'active', NEW.health_score
  )
  RETURNING id INTO v_ws_id;

  INSERT INTO channels (workspace_id, name, type, icon) VALUES
    (v_ws_id, 'general', 'general', 'hash'),
    (v_ws_id, 'deliverables', 'deliverables', 'package'),
    (v_ws_id, 'boost-requests', 'boost-requests', 'rocket'),
    (v_ws_id, 'billing', 'billing', 'credit-card'),
    (v_ws_id, 'internal', 'internal', 'lock');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_workspace ON clients;
CREATE TRIGGER trg_auto_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workspace();

-- PHASE 7: MESSAGE COUNTER UPDATE
CREATE OR REPLACE FUNCTION update_message_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  UPDATE channels
  SET last_message = NEW.content,
      last_message_time = NEW.created_at,
      unread_count = unread_count + 1
  WHERE id = NEW.channel_id;

  SELECT workspace_id INTO v_workspace_id FROM channels WHERE id = NEW.channel_id;

  IF v_workspace_id IS NOT NULL THEN
    UPDATE workspaces
    SET last_message = NEW.content,
        last_message_time = NEW.created_at,
        unread_count = unread_count + 1
    WHERE id = v_workspace_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_msg_meta ON messages;
CREATE TRIGGER trg_update_msg_meta
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_metadata();

-- PHASE 8: DASHBOARD VIEWS
CREATE OR REPLACE VIEW client_usage_summary AS
SELECT
  c.id as client_id,
  c.business_name,
  c.tenant_id,
  COUNT(d.id) as total_deliverables,
  SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN d.status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) as pending
FROM clients c
LEFT JOIN deliverables d ON d.client_id = c.id
GROUP BY c.id, c.business_name, c.tenant_id;

CREATE OR REPLACE VIEW system_health_summary AS
SELECT
  t.id as tenant_id,
  (SELECT COUNT(*) FROM clients WHERE tenant_id = t.id) as total_clients,
  (SELECT COUNT(*) FROM deliverables WHERE tenant_id = t.id) as total_deliverables,
  (SELECT COUNT(*) FROM messages m JOIN channels ch ON m.channel_id = ch.id JOIN workspaces w ON ch.workspace_id = w.id WHERE w.tenant_id = t.id) as total_messages,
  (SELECT COUNT(*) FROM campaigns WHERE tenant_id = t.id AND status = 'live') as active_campaigns,
  (SELECT COALESCE(SUM(cw.balance), 0) FROM client_wallets cw JOIN clients cl ON cw.client_id = cl.id WHERE cl.tenant_id = t.id) as total_wallet_balance
FROM tenants t;

-- PHASE 9: ENABLE REALTIME ON TABLES
DO $$
BEGIN
  ALTER TABLE clients REPLICA IDENTITY FULL;
  ALTER TABLE client_wallets REPLICA IDENTITY FULL;
  ALTER TABLE campaigns REPLICA IDENTITY FULL;
  ALTER TABLE invoices REPLICA IDENTITY FULL;
  ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;
  ALTER TABLE workspaces REPLICA IDENTITY FULL;
  ALTER TABLE channels REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- PHASE 10: AUTO UPDATE DASHBOARD METRICS FUNCTION
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_revenue NUMERIC;
  v_campaigns INT;
  v_pkg_usage NUMERIC;
  v_utilization NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM invoices WHERE tenant_id = p_tenant_id AND status = 'paid';

  SELECT COUNT(*) INTO v_campaigns
  FROM campaigns WHERE tenant_id = p_tenant_id AND status IN ('live', 'approved');

  SELECT COALESCE(AVG(CASE WHEN pu.total > 0 THEN (pu.used::NUMERIC / pu.total * 100) ELSE 0 END), 0) INTO v_pkg_usage
  FROM package_usage pu
  JOIN client_packages cp ON pu.client_package_id = cp.id
  JOIN clients c ON cp.client_id = c.id
  WHERE c.tenant_id = p_tenant_id AND cp.status = 'active';

  SELECT COALESCE(AVG(current_load), 0) INTO v_utilization
  FROM team_members WHERE tenant_id = p_tenant_id;

  UPDATE dashboard_metrics
  SET value = '$' || TO_CHAR(v_revenue, 'FM999,999'), updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'revenue';

  UPDATE dashboard_metrics
  SET value = v_campaigns::TEXT, updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'campaigns';

  UPDATE dashboard_metrics
  SET value = ROUND(v_pkg_usage)::TEXT || '%', updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'package_usage';

  UPDATE dashboard_metrics
  SET value = ROUND(v_utilization)::TEXT || '%', updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'utilization';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FROM 20240113: PACKAGE SYSTEM UPGRADE
-- =====================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT 'cyan',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverable_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  unit_label TEXT DEFAULT 'units',
  hours_per_unit NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, type_key)
);

DO $$ BEGIN
  ALTER TABLE package_features ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS custom_monthly_fee NUMERIC;
ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS client_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL REFERENCES client_packages(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  total_allocated INT DEFAULT 0,
  warning_threshold INT DEFAULT 20,
  auto_deduction BOOLEAN DEFAULT true,
  unit_label TEXT DEFAULT 'units'
);

INSERT INTO service_categories (tenant_id, name, icon, color, description, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Motorcycle Dealer', 'bike', 'cyan', 'Marketing packages for motorcycle dealerships', 1),
  ('00000000-0000-0000-0000-000000000001', 'Restaurant', 'utensils-crossed', 'magenta', 'Marketing packages for restaurants and food businesses', 2),
  ('00000000-0000-0000-0000-000000000001', 'Corporate', 'building-2', 'purple', 'Enterprise marketing for corporate clients', 3),
  ('00000000-0000-0000-0000-000000000001', 'E-Commerce', 'shopping-cart', 'lime', 'Online store and e-commerce marketing', 4),
  ('00000000-0000-0000-0000-000000000001', 'Healthcare', 'heart-pulse', 'red', 'Marketing for hospitals and clinics', 5),
  ('00000000-0000-0000-0000-000000000001', 'Education', 'graduation-cap', 'amber', 'Marketing for schools and educational institutions', 6),
  ('00000000-0000-0000-0000-000000000001', 'Custom', 'wrench', 'lime', 'Custom packages for any industry', 99)
ON CONFLICT DO NOTHING;

INSERT INTO deliverable_types (tenant_id, type_key, label, icon, unit_label, hours_per_unit, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'photo_graphics', 'Photo/Graphics Design', 'image', 'designs', 1.5, 1),
  ('00000000-0000-0000-0000-000000000001', 'video_edit', 'Video Edit', 'video', 'videos', 4, 2),
  ('00000000-0000-0000-0000-000000000001', 'motion_graphics', 'Motion Graphics', 'sparkles', 'animations', 6, 3),
  ('00000000-0000-0000-0000-000000000001', 'reels', 'Reels', 'clapperboard', 'reels', 3, 4),
  ('00000000-0000-0000-0000-000000000001', 'copywriting', 'Copywriting', 'pen-tool', 'copies', 0.5, 5),
  ('00000000-0000-0000-0000-000000000001', 'customer_frames', 'Customer Frames', 'frame', 'frames', 0.75, 6),
  ('00000000-0000-0000-0000-000000000001', 'service_frames', 'Service Frames', 'layout', 'frames', 0.75, 7),
  ('00000000-0000-0000-0000-000000000001', 'boost_campaign', 'Boost Campaign', 'rocket', 'campaigns', 4, 8),
  ('00000000-0000-0000-0000-000000000001', 'ads_management', 'Ads Management', 'megaphone', 'platforms', 8, 9),
  ('00000000-0000-0000-0000-000000000001', 'influencer_marketing', 'Influencer Marketing', 'star', 'campaigns', 12, 10),
  ('00000000-0000-0000-0000-000000000001', 'seo', 'SEO', 'search', 'audits', 10, 11),
  ('00000000-0000-0000-0000-000000000001', 'social_media_posts', 'Social Media Posts', 'message-square', 'posts', 0.5, 12)
ON CONFLICT (tenant_id, type_key) DO NOTHING;

DO $$
BEGIN
  ALTER TABLE service_categories REPLICA IDENTITY FULL;
  ALTER TABLE deliverable_types REPLICA IDENTITY FULL;
  ALTER TABLE packages REPLICA IDENTITY FULL;
  ALTER TABLE package_features REPLICA IDENTITY FULL;
  ALTER TABLE client_packages REPLICA IDENTITY FULL;
  ALTER TABLE client_package_features REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- FROM 20240114: CLIENT ASSIGNMENT ENGINE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('designer', 'media_buyer', 'account_manager', 'video_editor', 'content_writer', 'strategist', 'developer')),
  assigned_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, team_member_id)
);

CREATE TABLE IF NOT EXISTS default_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_category TEXT NOT NULL,
  default_roles JSONB NOT NULL DEFAULT '{}',
  min_team_size INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, industry_category)
);

INSERT INTO default_assignment_rules (tenant_id, industry_category, default_roles, min_team_size) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Motorcycle Dealer', '{"designer": 1, "media_buyer": 1, "account_manager": 1, "video_editor": 1}', 4),
  ('00000000-0000-0000-0000-000000000001', 'Restaurant', '{"designer": 1, "content_writer": 1, "account_manager": 1}', 3),
  ('00000000-0000-0000-0000-000000000001', 'Corporate', '{"designer": 1, "strategist": 1, "account_manager": 1, "media_buyer": 1}', 4),
  ('00000000-0000-0000-0000-000000000001', 'E-Commerce', '{"designer": 1, "media_buyer": 1, "content_writer": 1, "account_manager": 1}', 4),
  ('00000000-0000-0000-0000-000000000001', 'Healthcare', '{"designer": 1, "content_writer": 1, "account_manager": 1}', 3),
  ('00000000-0000-0000-0000-000000000001', 'Education', '{"designer": 1, "content_writer": 1, "account_manager": 1}', 3),
  ('00000000-0000-0000-0000-000000000001', 'Other', '{"designer": 1, "account_manager": 1}', 2)
ON CONFLICT (tenant_id, industry_category) DO NOTHING;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE OR REPLACE FUNCTION handle_new_client_assignment_flow()
RETURNS TRIGGER AS $$
DECLARE
  v_super_admin_ids UUID[];
  v_admin_id UUID;
  v_rule JSONB;
  v_min_team INT;
BEGIN
  SELECT ARRAY_AGG(ur.user_id) INTO v_super_admin_ids
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.tenant_id = NEW.tenant_id AND r.name = 'Super Admin';

  SELECT default_roles, min_team_size INTO v_rule, v_min_team
  FROM default_assignment_rules
  WHERE tenant_id = NEW.tenant_id AND industry_category = COALESCE(NEW.category, 'Other');

  IF v_rule IS NULL THEN
    SELECT default_roles, min_team_size INTO v_rule, v_min_team
    FROM default_assignment_rules
    WHERE tenant_id = NEW.tenant_id AND industry_category = 'Other';
  END IF;

  IF v_super_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_super_admin_ids
    LOOP
      INSERT INTO notifications (
        tenant_id, user_id, category, title, description,
        related_client_id, action_type, metadata, read
      ) VALUES (
        NEW.tenant_id, v_admin_id, 'client',
        'New Client Joined: ' || NEW.business_name,
        'Category: ' || COALESCE(NEW.category, 'Other') || ' | Recommended team size: ' || COALESCE(v_min_team, 2) || ' members',
        NEW.id, 'assign_team',
        jsonb_build_object(
          'client_id', NEW.id, 'client_name', NEW.business_name,
          'category', COALESCE(NEW.category, 'Other'),
          'suggested_roles', COALESCE(v_rule, '{}'),
          'min_team_size', COALESCE(v_min_team, 2)
        ), false
      );
    END LOOP;
  END IF;

  IF NEW.account_manager_id IS NOT NULL THEN
    INSERT INTO notifications (
      tenant_id, user_id, category, title, description,
      related_client_id, action_type, metadata, read
    )
    SELECT
      NEW.tenant_id, tm.user_profile_id, 'client',
      'New Client Assigned: ' || NEW.business_name,
      'You have been assigned as account manager for ' || NEW.business_name,
      NEW.id, 'view_client',
      jsonb_build_object('client_id', NEW.id, 'role', 'account_manager'),
      false
    FROM team_members tm
    WHERE tm.id = NEW.account_manager_id AND tm.user_profile_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_client_assignment_flow ON clients;
CREATE TRIGGER trg_new_client_assignment_flow
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_client_assignment_flow();

CREATE OR REPLACE FUNCTION handle_client_assignment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_member_name TEXT;
  v_member_avatar TEXT;
  v_client_name TEXT;
  v_member_profile_id UUID;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces WHERE client_id = NEW.client_id LIMIT 1;
  SELECT name, avatar, user_profile_id INTO v_member_name, v_member_avatar, v_member_profile_id
  FROM team_members WHERE id = NEW.team_member_id;
  SELECT business_name INTO v_client_name FROM clients WHERE id = NEW.client_id;

  IF v_workspace_id IS NOT NULL AND v_member_name IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_profile_id, name, avatar, role, status)
    VALUES (v_workspace_id, v_member_profile_id, v_member_name, COALESCE(v_member_avatar, ''), NEW.role_type, 'online')
    ON CONFLICT (workspace_id, user_profile_id) DO UPDATE SET role = NEW.role_type;
  END IF;

  IF v_member_profile_id IS NOT NULL THEN
    INSERT INTO notifications (
      tenant_id, user_id, category, title, description,
      related_client_id, action_type, metadata, read
    ) VALUES (
      NEW.tenant_id, v_member_profile_id, 'team',
      'New Client Assignment: ' || COALESCE(v_client_name, 'Unknown'),
      'You have been assigned as ' || NEW.role_type || ' for ' || COALESCE(v_client_name, 'a client'),
      NEW.client_id, 'view_client',
      jsonb_build_object('client_id', NEW.client_id, 'role', NEW.role_type),
      false
    );
  END IF;

  INSERT INTO activities (
    tenant_id, client_id, type, title, description, timestamp, metadata
  ) VALUES (
    NEW.tenant_id, NEW.client_id, 'team_assigned',
    'Team Member Assigned: ' || COALESCE(v_member_name, 'Unknown'),
    COALESCE(v_member_name, 'Unknown') || ' assigned as ' || NEW.role_type,
    NOW(),
    jsonb_build_object('team_member_id', NEW.team_member_id, 'role_type', NEW.role_type, 'member_name', COALESCE(v_member_name, ''))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_assignment_created ON client_assignments;
CREATE TRIGGER trg_client_assignment_created
  AFTER INSERT ON client_assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_client_assignment_created();

CREATE OR REPLACE FUNCTION handle_client_assignment_removed()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_member_profile_id UUID;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces WHERE client_id = OLD.client_id LIMIT 1;
  SELECT user_profile_id INTO v_member_profile_id FROM team_members WHERE id = OLD.team_member_id;

  IF v_workspace_id IS NOT NULL AND v_member_profile_id IS NOT NULL THEN
    DELETE FROM workspace_members WHERE workspace_id = v_workspace_id AND user_profile_id = v_member_profile_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_assignment_removed ON client_assignments;
CREATE TRIGGER trg_client_assignment_removed
  AFTER DELETE ON client_assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_client_assignment_removed();

DO $$
BEGIN
  ALTER TABLE client_assignments REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

INSERT INTO client_assignments (tenant_id, client_id, team_member_id, role_type, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'designer', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f7', 'account_manager', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f3', 'designer', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f8', 'account_manager', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f5', 'designer', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f9', 'account_manager', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000f2', 'designer', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000f7', 'account_manager', 'active')
ON CONFLICT (client_id, team_member_id) DO NOTHING;

-- =====================================================
-- FROM 20240115: PHASE1 ENHANCEMENTS
-- =====================================================

DO $$
BEGIN
  ALTER TABLE message_reactions REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique
  ON message_reactions(message_id, emoji);

CREATE OR REPLACE FUNCTION increment_team_member_count(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE teams
  SET total_members = (
    SELECT COUNT(*) FROM team_member_teams WHERE team_id = p_team_id
  )
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FROM 20240116: MESSAGING ENHANCEMENTS
-- =====================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_channel TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INT DEFAULT 0;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS pinned_message_ids UUID[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  pinned_by UUID,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id)
);

CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  user_avatar TEXT,
  user_role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  notification_pref TEXT DEFAULT 'all'
);

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

DO $$
BEGIN
  ALTER TABLE pinned_messages REPLICA IDENTITY FULL;
  ALTER TABLE saved_messages REPLICA IDENTITY FULL;
  ALTER TABLE message_read_receipts REPLICA IDENTITY FULL;
  ALTER TABLE channel_members REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE pinned_messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 'message-attachments', true, 52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'message-attachments');

-- =====================================================
-- FROM 20240118: ENTERPRISE MESSAGING UPGRADE
-- =====================================================

ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'open';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;

ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS role_in_channel TEXT DEFAULT 'member';
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_by UUID;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  DROP INDEX IF EXISTS idx_channel_members_channel_user;
  CREATE UNIQUE INDEX idx_channel_members_channel_user ON channel_members(channel_id, user_profile_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  action_label TEXT NOT NULL,
  icon TEXT NOT NULL,
  action_type TEXT,
  linked_service_type TEXT,
  linked_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  color_accent TEXT DEFAULT '#00D9FF',
  role_access JSONB DEFAULT '["super_admin","account_manager"]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_actions_tenant ON quick_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_active ON quick_actions(tenant_id, is_active);

INSERT INTO quick_actions (tenant_id, action_name, action_label, icon, action_type, linked_service_type, display_order, role_access)
SELECT 
  t.id, 'create_design', 'Create Design', 'Palette', 'deliverable', 'design', 1,
  '["super_admin","account_manager","client_manager"]'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quick_actions qa WHERE qa.tenant_id = t.id AND qa.action_name = 'create_design'
);

INSERT INTO quick_actions (tenant_id, action_name, action_label, icon, action_type, linked_service_type, display_order, role_access)
SELECT 
  t.id, 'create_boost', 'Create Boost', 'Rocket', 'boost', NULL, 2,
  '["super_admin","account_manager","client_manager"]'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quick_actions qa WHERE qa.tenant_id = t.id AND qa.action_name = 'create_boost'
);

INSERT INTO quick_actions (tenant_id, action_name, action_label, icon, action_type, linked_service_type, display_order, role_access)
SELECT 
  t.id, 'create_video', 'Create Video', 'Video', 'deliverable', 'video', 3,
  '["super_admin","account_manager","client_manager"]'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quick_actions qa WHERE qa.tenant_id = t.id AND qa.action_name = 'create_video'
);

DO $$
BEGIN
  ALTER TABLE quick_actions REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE quick_actions; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

CREATE OR REPLACE FUNCTION auto_add_members_to_open_channel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel_type = 'open' THEN
    INSERT INTO channel_members (channel_id, user_profile_id, role_in_channel, added_by)
    SELECT 
      NEW.id, wm.user_profile_id, 'member', NEW.created_by_id
    FROM workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id
    AND wm.user_profile_id IS NOT NULL
    ON CONFLICT (channel_id, user_profile_id) DO NOTHING;
    
    UPDATE channels SET member_count = (
      SELECT COUNT(*) FROM channel_members WHERE channel_id = NEW.id
    ) WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_add_members ON channels;
CREATE TRIGGER trigger_auto_add_members
  AFTER INSERT ON channels
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_members_to_open_channel();

CREATE OR REPLACE FUNCTION add_channel_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by_id IS NOT NULL THEN
    INSERT INTO channel_members (channel_id, user_profile_id, role_in_channel, added_by)
    VALUES (NEW.id, NEW.created_by_id, 'admin', NEW.created_by_id)
    ON CONFLICT (channel_id, user_profile_id) DO UPDATE
    SET role_in_channel = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_creator_as_admin ON channels;
CREATE TRIGGER trigger_add_creator_as_admin
  AFTER INSERT ON channels
  FOR EACH ROW
  EXECUTE FUNCTION add_channel_creator_as_admin();

CREATE OR REPLACE FUNCTION update_channel_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    UPDATE channels SET member_count = (
      SELECT COUNT(*) FROM channel_members 
      WHERE channel_id = COALESCE(NEW.channel_id, OLD.channel_id)
    ) WHERE id = COALESCE(NEW.channel_id, OLD.channel_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_member_count ON channel_members;
CREATE TRIGGER trigger_update_member_count
  AFTER INSERT OR DELETE ON channel_members
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_member_count();

CREATE OR REPLACE FUNCTION notify_channel_member_added()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_name TEXT;
  v_workspace_id UUID;
BEGIN
  SELECT c.name, c.workspace_id INTO v_channel_name, v_workspace_id
  FROM channels c WHERE c.id = NEW.channel_id;
  
  INSERT INTO notifications (
    tenant_id, user_id, type, title, message, priority, read, created_at
  )
  SELECT 
    up.tenant_id, up.id::TEXT, 'channel_added', 'Added to Channel',
    'You were added to #' || v_channel_name, 'medium', false, NOW()
  FROM user_profiles up
  WHERE up.id = NEW.user_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_member_added ON channel_members;
CREATE TRIGGER trigger_notify_member_added
  AFTER INSERT ON channel_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_channel_member_added();

-- =====================================================
-- ENABLE REALTIME ON ALL CRITICAL TABLES
-- =====================================================

DO $$
BEGIN
  ALTER TABLE messages REPLICA IDENTITY FULL;
  ALTER TABLE deliverables REPLICA IDENTITY FULL;
  ALTER TABLE activities REPLICA IDENTITY FULL;
  ALTER TABLE notifications REPLICA IDENTITY FULL;
  ALTER TABLE package_usage REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE deliverables; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE package_usage; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
