-- Fix: Re-run enterprise messaging parts that failed due to duplicate index
-- Safe to run multiple times

CREATE INDEX IF NOT EXISTS idx_quick_actions_tenant ON quick_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_active ON quick_actions(tenant_id, is_active);

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

DO $$
BEGIN
  BEGIN
    ALTER TABLE quick_actions REPLICA IDENTITY FULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'quick_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quick_actions;
  END IF;
END$$;

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
