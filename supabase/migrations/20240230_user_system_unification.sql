-- ============================================================
-- User System Unification Migration
-- Priority 2: Link demo_users ↔ user_profiles ↔ team_members
-- ============================================================

-- 1. Ensure auto_create_client_wallet trigger exists
CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, tenant_id, balance, currency)
  VALUES (NEW.id, NEW.tenant_id, 0, 'BDT')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_create_client_wallet();

-- 2. Ensure auto_create_client_workspace trigger exists
CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  INSERT INTO workspaces (tenant_id, client_id, name, description, status)
  VALUES (NEW.tenant_id, NEW.id, NEW.business_name || ' Workspace', 'Auto-created workspace for ' || NEW.business_name, 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO ws_id;

  IF ws_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, type, description, is_default, sort_order)
    VALUES
      (ws_id, 'general', 'text', 'General discussion', true, 0),
      (ws_id, 'content-review', 'text', 'Content review and approvals', false, 1),
      (ws_id, 'boost-requests', 'text', 'Boost campaign requests', false, 2)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_create_client_workspace();

-- 3. Create repair_user_links function to fix orphaned records
CREATE OR REPLACE FUNCTION repair_user_links(p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS TABLE(
  demo_user_id UUID,
  action_taken TEXT
) AS $$
DECLARE
  du RECORD;
  profile_id UUID;
  tm_id UUID;
BEGIN
  FOR du IN
    SELECT d.* FROM demo_users d
    WHERE d.tenant_id = p_tenant_id
      AND d.is_active = true
      AND (d.user_profile_id IS NULL OR d.team_member_id IS NULL)
  LOOP
    demo_user_id := du.id;
    action_taken := '';

    -- Fix missing user_profile
    IF du.user_profile_id IS NULL THEN
      -- Try to find existing profile by email
      SELECT id INTO profile_id FROM user_profiles
        WHERE email = du.email AND tenant_id = p_tenant_id
        LIMIT 1;

      IF profile_id IS NULL THEN
        -- Create new profile
        INSERT INTO user_profiles (tenant_id, full_name, email, avatar, status, auth_user_id)
        VALUES (p_tenant_id, du.display_name, du.email,
                COALESCE(du.avatar, UPPER(LEFT(du.display_name, 2))),
                'active', du.auth_user_id)
        RETURNING id INTO profile_id;
        action_taken := action_taken || 'profile_created;';
      ELSE
        action_taken := action_taken || 'profile_linked;';
      END IF;

      UPDATE demo_users SET user_profile_id = profile_id WHERE id = du.id;
    ELSE
      profile_id := du.user_profile_id;
    END IF;

    -- Fix missing team_member (only for non-client roles)
    IF du.team_member_id IS NULL AND du.role != 'client' THEN
      -- Try to find existing team_member by email
      SELECT id INTO tm_id FROM team_members
        WHERE email = du.email AND tenant_id = p_tenant_id
        LIMIT 1;

      IF tm_id IS NULL THEN
        -- Create new team_member
        INSERT INTO team_members (
          tenant_id, user_profile_id, name, email, avatar,
          primary_role, secondary_roles, work_capacity_hours,
          status, current_load, active_deliverables,
          boost_campaigns, tasks_completed_this_month, join_date
        ) VALUES (
          p_tenant_id, profile_id, du.display_name, du.email,
          COALESCE(du.avatar, UPPER(LEFT(du.display_name, 2))),
          CASE du.role
            WHEN 'super_admin' THEN 'Super Admin'
            WHEN 'designer' THEN 'Designer'
            WHEN 'media_buyer' THEN 'Media Buyer'
            WHEN 'account_manager' THEN 'Account Manager'
            WHEN 'finance' THEN 'Finance Manager'
            ELSE du.role
          END,
          '{}', 8, 'online', 0, 0, 0, 0, CURRENT_DATE
        )
        RETURNING id INTO tm_id;
        action_taken := action_taken || 'team_member_created;';
      ELSE
        action_taken := action_taken || 'team_member_linked;';
        -- Also link the profile
        UPDATE team_members SET user_profile_id = profile_id WHERE id = tm_id AND user_profile_id IS NULL;
      END IF;

      UPDATE demo_users SET team_member_id = tm_id WHERE id = du.id;
    END IF;

    -- Sync auth_user_id across linked records
    IF du.auth_user_id IS NOT NULL THEN
      UPDATE user_profiles SET auth_user_id = du.auth_user_id
        WHERE id = profile_id AND auth_user_id IS NULL;
    END IF;

    -- Return the result
    IF action_taken != '' THEN
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create get_user_system_health function
CREATE OR REPLACE FUNCTION get_user_system_health(p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_demo_users', (SELECT COUNT(*) FROM demo_users WHERE tenant_id = p_tenant_id AND is_active = true),
    'total_user_profiles', (SELECT COUNT(*) FROM user_profiles WHERE tenant_id = p_tenant_id AND status = 'active'),
    'total_team_members', (SELECT COUNT(*) FROM team_members WHERE tenant_id = p_tenant_id),
    'orphaned_demo_users_no_profile', (SELECT COUNT(*) FROM demo_users WHERE tenant_id = p_tenant_id AND is_active = true AND user_profile_id IS NULL),
    'orphaned_demo_users_no_team', (SELECT COUNT(*) FROM demo_users WHERE tenant_id = p_tenant_id AND is_active = true AND role != 'client' AND team_member_id IS NULL),
    'orphaned_team_members_no_profile', (SELECT COUNT(*) FROM team_members WHERE tenant_id = p_tenant_id AND user_profile_id IS NULL),
    'total_clients', (SELECT COUNT(*) FROM clients WHERE tenant_id = p_tenant_id AND status = 'active'),
    'clients_with_wallet', (SELECT COUNT(DISTINCT cw.client_id) FROM client_wallets cw JOIN clients c ON c.id = cw.client_id WHERE c.tenant_id = p_tenant_id),
    'clients_with_workspace', (SELECT COUNT(DISTINCT w.client_id) FROM workspaces w JOIN clients c ON c.id = w.client_id WHERE c.tenant_id = p_tenant_id),
    'clients_with_login', (SELECT COUNT(DISTINCT d.client_id) FROM demo_users d WHERE d.tenant_id = p_tenant_id AND d.role = 'client' AND d.client_id IS NOT NULL AND d.is_active = true)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Auto-run repair on existing data
SELECT * FROM repair_user_links();
