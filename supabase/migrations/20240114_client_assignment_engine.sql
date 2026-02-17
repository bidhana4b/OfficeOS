-- ====================================
-- CLIENT ASSIGNMENT ENGINE
-- Auto team assignment, notifications, messaging access
-- ====================================

-- 1. CLIENT ASSIGNMENTS TABLE
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

-- 2. DEFAULT ASSIGNMENT RULES TABLE
CREATE TABLE IF NOT EXISTS default_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_category TEXT NOT NULL,
  default_roles JSONB NOT NULL DEFAULT '{}',
  min_team_size INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, industry_category)
);

-- 3. SEED DEFAULT ASSIGNMENT RULES
INSERT INTO default_assignment_rules (tenant_id, industry_category, default_roles, min_team_size) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Motorcycle Dealer', '{"designer": 1, "media_buyer": 1, "account_manager": 1, "video_editor": 1}', 4),
  ('00000000-0000-0000-0000-000000000001', 'Restaurant', '{"designer": 1, "content_writer": 1, "account_manager": 1}', 3),
  ('00000000-0000-0000-0000-000000000001', 'Corporate', '{"designer": 1, "strategist": 1, "account_manager": 1, "media_buyer": 1}', 4),
  ('00000000-0000-0000-0000-000000000001', 'E-Commerce', '{"designer": 1, "media_buyer": 1, "content_writer": 1, "account_manager": 1}', 4),
  ('00000000-0000-0000-0000-000000000001', 'Healthcare', '{"designer": 1, "content_writer": 1, "account_manager": 1}', 3),
  ('00000000-0000-0000-0000-000000000001', 'Education', '{"designer": 1, "content_writer": 1, "account_manager": 1}', 3),
  ('00000000-0000-0000-0000-000000000001', 'Other', '{"designer": 1, "account_manager": 1}', 2)
ON CONFLICT (tenant_id, industry_category) DO NOTHING;

-- 4. UPDATE notifications table to support related_client_id and action_type
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 5. TRIGGER: Auto-create notification when new client is created
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
        NEW.tenant_id,
        v_admin_id,
        'client',
        'New Client Joined: ' || NEW.business_name,
        'Category: ' || COALESCE(NEW.category, 'Other') || ' | Recommended team size: ' || COALESCE(v_min_team, 2) || ' members',
        NEW.id,
        'assign_team',
        jsonb_build_object(
          'client_id', NEW.id,
          'client_name', NEW.business_name,
          'category', COALESCE(NEW.category, 'Other'),
          'suggested_roles', COALESCE(v_rule, '{}'),
          'min_team_size', COALESCE(v_min_team, 2)
        ),
        false
      );
    END LOOP;
  END IF;

  IF NEW.account_manager_id IS NOT NULL THEN
    INSERT INTO notifications (
      tenant_id, user_id, category, title, description,
      related_client_id, action_type, metadata, read
    )
    SELECT
      NEW.tenant_id,
      tm.user_profile_id,
      'client',
      'New Client Assigned: ' || NEW.business_name,
      'You have been assigned as account manager for ' || NEW.business_name,
      NEW.id,
      'view_client',
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

-- 6. TRIGGER: Auto-add to workspace_members when client_assignments inserted
CREATE OR REPLACE FUNCTION handle_client_assignment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_member_name TEXT;
  v_member_avatar TEXT;
  v_client_name TEXT;
  v_member_profile_id UUID;
BEGIN
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE client_id = NEW.client_id
  LIMIT 1;

  SELECT name, avatar, user_profile_id INTO v_member_name, v_member_avatar, v_member_profile_id
  FROM team_members
  WHERE id = NEW.team_member_id;

  SELECT business_name INTO v_client_name
  FROM clients
  WHERE id = NEW.client_id;

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
      NEW.tenant_id,
      v_member_profile_id,
      'team',
      'New Client Assignment: ' || COALESCE(v_client_name, 'Unknown'),
      'You have been assigned as ' || NEW.role_type || ' for ' || COALESCE(v_client_name, 'a client'),
      NEW.client_id,
      'view_client',
      jsonb_build_object('client_id', NEW.client_id, 'role', NEW.role_type),
      false
    );
  END IF;

  INSERT INTO activities (
    tenant_id, client_id, type, title, description, timestamp, metadata
  ) VALUES (
    NEW.tenant_id,
    NEW.client_id,
    'team_assigned',
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

-- 7. TRIGGER: Clean up on assignment removed
CREATE OR REPLACE FUNCTION handle_client_assignment_removed()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_member_profile_id UUID;
BEGIN
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE client_id = OLD.client_id
  LIMIT 1;

  SELECT user_profile_id INTO v_member_profile_id
  FROM team_members
  WHERE id = OLD.team_member_id;

  IF v_workspace_id IS NOT NULL AND v_member_profile_id IS NOT NULL THEN
    DELETE FROM workspace_members
    WHERE workspace_id = v_workspace_id AND user_profile_id = v_member_profile_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_assignment_removed ON client_assignments;
CREATE TRIGGER trg_client_assignment_removed
  AFTER DELETE ON client_assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_client_assignment_removed();

-- 8. ENABLE REALTIME
ALTER TABLE client_assignments REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 9. SEED EXISTING CLIENT ASSIGNMENTS
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
