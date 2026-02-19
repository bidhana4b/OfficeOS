-- =====================================================
-- ENTERPRISE MESSAGING UPGRADE
-- Features: Channel Creation (Open/Closed), Member Management, Quick Actions
-- =====================================================

-- Update channels table for open/closed channel types
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'open' CHECK (channel_type IN ('open', 'closed'));
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;

-- Update channel_members table (enhance existing)
ALTER TABLE channel_members DROP COLUMN IF EXISTS user_id;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS role_in_channel TEXT DEFAULT 'member' CHECK (role_in_channel IN ('admin', 'member'));
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_by UUID;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_channel_members_channel_user;
CREATE UNIQUE INDEX idx_channel_members_channel_user ON channel_members(channel_id, user_profile_id);

-- Quick Actions table
CREATE TABLE IF NOT EXISTS quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  action_label TEXT NOT NULL,
  icon TEXT NOT NULL,
  action_type TEXT CHECK (action_type IN ('deliverable', 'boost', 'custom', 'link')),
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

CREATE INDEX idx_quick_actions_tenant ON quick_actions(tenant_id);
CREATE INDEX idx_quick_actions_active ON quick_actions(tenant_id, is_active);

-- Seed default quick actions for each tenant
INSERT INTO quick_actions (tenant_id, action_name, action_label, icon, action_type, linked_service_type, display_order, role_access)
SELECT 
  t.id,
  'create_design',
  'Create Design',
  'Palette',
  'deliverable',
  'design',
  1,
  '["super_admin","account_manager","client_manager"]'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quick_actions qa WHERE qa.tenant_id = t.id AND qa.action_name = 'create_design'
);

INSERT INTO quick_actions (tenant_id, action_name, action_label, icon, action_type, linked_service_type, display_order, role_access)
SELECT 
  t.id,
  'create_boost',
  'Create Boost',
  'Rocket',
  'boost',
  NULL,
  2,
  '["super_admin","account_manager","client_manager"]'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quick_actions qa WHERE qa.tenant_id = t.id AND qa.action_name = 'create_boost'
);

INSERT INTO quick_actions (tenant_id, action_name, action_label, icon, action_type, linked_service_type, display_order, role_access)
SELECT 
  t.id,
  'create_video',
  'Create Video',
  'Video',
  'deliverable',
  'video',
  3,
  '["super_admin","account_manager","client_manager"]'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quick_actions qa WHERE qa.tenant_id = t.id AND qa.action_name = 'create_video'
);

-- Enable realtime
ALTER TABLE quick_actions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'quick_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quick_actions;
  END IF;
END$$;

-- Function: Auto-add workspace members to open channels
CREATE OR REPLACE FUNCTION auto_add_members_to_open_channel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel_type = 'open' THEN
    INSERT INTO channel_members (channel_id, user_profile_id, role_in_channel, added_by)
    SELECT 
      NEW.id,
      wm.user_profile_id,
      'member',
      NEW.created_by_id
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

-- Function: Add creator as channel admin
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

-- Function: Update member count when members added/removed
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

-- Send notification when user added to channel
CREATE OR REPLACE FUNCTION notify_channel_member_added()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_name TEXT;
  v_workspace_id UUID;
BEGIN
  SELECT c.name, c.workspace_id INTO v_channel_name, v_workspace_id
  FROM channels c WHERE c.id = NEW.channel_id;
  
  INSERT INTO notifications (
    tenant_id,
    user_id,
    type,
    title,
    message,
    priority,
    read,
    created_at
  )
  SELECT 
    up.tenant_id,
    up.id::TEXT,
    'channel_added',
    'Added to Channel',
    'You were added to #' || v_channel_name,
    'medium',
    false,
    NOW()
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
