-- =====================================================
-- Migration: Team Member Complete Flow
-- Date: 2025-01-XX
-- Description: Enhanced team member creation flow
--   - Ensures user_profiles and demo_users are auto-created
--   - Adds helper function for complete team member onboarding
-- =====================================================

-- =====================================================
-- FUNCTION: create_complete_team_member
-- Creates team member with associated user profile and login
-- =====================================================

CREATE OR REPLACE FUNCTION create_complete_team_member(
  p_tenant_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT DEFAULT '123456',
  p_primary_role TEXT DEFAULT 'Team Member',
  p_secondary_roles TEXT[] DEFAULT '{}',
  p_work_capacity_hours INTEGER DEFAULT 8,
  p_avatar TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'online'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_profile_id UUID;
  v_demo_user_id UUID;
  v_team_member_id UUID;
  v_result JSON;
BEGIN
  -- 1. Create user_profile
  INSERT INTO user_profiles (
    tenant_id,
    full_name,
    email,
    role,
    avatar,
    status
  ) VALUES (
    p_tenant_id,
    p_name,
    p_email,
    p_primary_role,
    COALESCE(p_avatar, SUBSTRING(p_name FROM 1 FOR 2)),
    p_status
  )
  RETURNING id INTO v_user_profile_id;

  -- 2. Create demo_users login
  INSERT INTO demo_users (
    tenant_id,
    email,
    display_name,
    password_hash,
    role
  ) VALUES (
    p_tenant_id,
    p_email,
    p_name,
    crypt(p_password, gen_salt('bf')),
    p_primary_role
  )
  RETURNING id INTO v_demo_user_id;

  -- 3. Create team_members record
  INSERT INTO team_members (
    tenant_id,
    user_profile_id,
    name,
    email,
    primary_role,
    secondary_roles,
    work_capacity_hours,
    avatar,
    status,
    current_load,
    active_deliverables,
    boost_campaigns,
    tasks_completed_this_month,
    join_date
  ) VALUES (
    p_tenant_id,
    v_user_profile_id,
    p_name,
    p_email,
    p_primary_role,
    p_secondary_roles,
    p_work_capacity_hours,
    COALESCE(p_avatar, SUBSTRING(p_name FROM 1 FOR 2)),
    p_status,
    0,
    0,
    0,
    0,
    CURRENT_DATE
  )
  RETURNING id INTO v_team_member_id;

  -- 4. Log activity
  INSERT INTO activities (
    tenant_id,
    type,
    title,
    description,
    timestamp,
    metadata
  ) VALUES (
    p_tenant_id,
    'team_update',
    'New Team Member: ' || p_name,
    p_primary_role || ' joined the team',
    NOW(),
    jsonb_build_object(
      'name', p_name,
      'role', p_primary_role,
      'user_profile_id', v_user_profile_id,
      'team_member_id', v_team_member_id
    )
  );

  -- Build result
  v_result := json_build_object(
    'team_member_id', v_team_member_id,
    'user_profile_id', v_user_profile_id,
    'demo_user_id', v_demo_user_id,
    'name', p_name,
    'email', p_email,
    'role', p_primary_role
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- FUNCTION: assign_team_member_to_client
-- Assigns team member to client workspace and channels
-- =====================================================

CREATE OR REPLACE FUNCTION assign_team_member_to_client(
  p_team_member_id UUID,
  p_client_id UUID,
  p_workspace_role TEXT DEFAULT 'member',
  p_assign_to_all_channels BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_profile_id UUID;
  v_workspace_id UUID;
  v_member_name TEXT;
  v_member_avatar TEXT;
  v_channels_assigned INTEGER := 0;
  v_channel_record RECORD;
  v_result JSON;
BEGIN
  -- 1. Get team member details
  SELECT user_profile_id, name, avatar
  INTO v_user_profile_id, v_member_name, v_member_avatar
  FROM team_members
  WHERE id = p_team_member_id;

  IF v_user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Team member not found or missing user_profile_id: %', p_team_member_id;
  END IF;

  -- 2. Get workspace for client
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE client_id = p_client_id
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No workspace found for client: %', p_client_id;
  END IF;

  -- 3. Add to workspace_members
  INSERT INTO workspace_members (
    workspace_id,
    user_profile_id,
    name,
    avatar,
    role,
    status
  ) VALUES (
    v_workspace_id,
    v_user_profile_id,
    v_member_name,
    COALESCE(v_member_avatar, ''),
    p_workspace_role,
    'online'
  )
  ON CONFLICT (workspace_id, user_profile_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    avatar = EXCLUDED.avatar,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- 4. Add to channels if requested
  IF p_assign_to_all_channels THEN
    FOR v_channel_record IN (
      SELECT id FROM channels WHERE workspace_id = v_workspace_id
    )
    LOOP
      INSERT INTO channel_members (
        channel_id,
        user_profile_id,
        role_in_channel,
        added_by
      ) VALUES (
        v_channel_record.id,
        v_user_profile_id,
        'member',
        v_user_profile_id
      )
      ON CONFLICT (channel_id, user_profile_id) DO NOTHING;
      
      v_channels_assigned := v_channels_assigned + 1;
    END LOOP;
  END IF;

  -- 5. Update client assignment in team_members
  UPDATE team_members
  SET client_assignments = COALESCE(client_assignments, '[]'::jsonb) || 
      jsonb_build_object('client_id', p_client_id, 'workspace_id', v_workspace_id)
  WHERE id = p_team_member_id;

  -- Build result
  v_result := json_build_object(
    'success', TRUE,
    'team_member_id', p_team_member_id,
    'user_profile_id', v_user_profile_id,
    'workspace_id', v_workspace_id,
    'channels_assigned', v_channels_assigned
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- Add client_assignments column to team_members if missing
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_members' 
    AND column_name = 'client_assignments'
  ) THEN
    ALTER TABLE team_members ADD COLUMN client_assignments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- =====================================================
-- Grant execute permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION create_complete_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION assign_team_member_to_client TO authenticated;

-- =====================================================
-- Test the functions (commented out - uncomment to test)
-- =====================================================

-- Test 1: Create a complete team member
-- SELECT create_complete_team_member(
--   (SELECT id FROM tenants LIMIT 1),
--   'Test Designer',
--   'test.designer@agency.com',
--   '123456',
--   'Graphic Designer',
--   ARRAY['UI/UX', 'Branding'],
--   8,
--   'TD',
--   'online'
-- );

-- Test 2: Assign team member to client
-- SELECT assign_team_member_to_client(
--   (SELECT id FROM team_members WHERE email = 'test.designer@agency.com' LIMIT 1),
--   (SELECT id FROM clients LIMIT 1),
--   'member',
--   TRUE
-- );
