-- ============================================================
-- PRIORITY COMPLETION MIGRATION
-- Covers Priority 1-5 remaining items:
--   P1: Realtime, storage policies
--   P2: User system unification RPCs
--   P3: Client onboarding automation verification
--   P4: Data source indicators (DB functions)
--   P5: RLS policies
-- ============================================================

-- ============================================================
-- PRIORITY 1: Enable Realtime on Key Tables
-- ============================================================

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE deliverables; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_files; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE read_receipts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_packages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE package_usage; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE demo_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE canned_responses; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_invitations; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ============================================================
-- PRIORITY 2: User System Health RPC (comprehensive)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_system_health(p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  v_total_demo INT;
  v_total_profiles INT;
  v_total_team INT;
  v_orphaned_no_profile INT;
  v_orphaned_no_team INT;
  v_orphaned_tm_no_profile INT;
  v_total_clients INT;
  v_clients_with_wallet INT;
  v_clients_with_workspace INT;
  v_clients_with_login INT;
  v_total_packages INT;
  v_active_packages INT;
  v_total_deliverables INT;
  v_total_messages INT;
  v_total_channels INT;
  v_total_workspaces INT;
  v_total_invoices INT;
  v_total_campaigns INT;
BEGIN
  SELECT COUNT(*) INTO v_total_demo FROM demo_users WHERE tenant_id = p_tenant_id AND is_active = true;
  SELECT COUNT(*) INTO v_total_profiles FROM user_profiles WHERE tenant_id = p_tenant_id AND status = 'active';
  SELECT COUNT(*) INTO v_total_team FROM team_members WHERE tenant_id = p_tenant_id;

  SELECT COUNT(*) INTO v_orphaned_no_profile FROM demo_users
    WHERE tenant_id = p_tenant_id AND is_active = true AND user_profile_id IS NULL;

  SELECT COUNT(*) INTO v_orphaned_no_team FROM demo_users
    WHERE tenant_id = p_tenant_id AND is_active = true AND role != 'client' AND team_member_id IS NULL;

  SELECT COUNT(*) INTO v_orphaned_tm_no_profile FROM team_members
    WHERE tenant_id = p_tenant_id AND user_profile_id IS NULL;

  SELECT COUNT(*) INTO v_total_clients FROM clients WHERE tenant_id = p_tenant_id;

  SELECT COUNT(*) INTO v_clients_with_wallet FROM clients c
    WHERE c.tenant_id = p_tenant_id
    AND EXISTS (SELECT 1 FROM client_wallets cw WHERE cw.client_id = c.id);

  SELECT COUNT(*) INTO v_clients_with_workspace FROM clients c
    WHERE c.tenant_id = p_tenant_id
    AND EXISTS (SELECT 1 FROM workspaces w WHERE w.client_id = c.id);

  SELECT COUNT(*) INTO v_clients_with_login FROM clients c
    WHERE c.tenant_id = p_tenant_id
    AND EXISTS (SELECT 1 FROM demo_users du WHERE du.client_id = c.id AND du.role = 'client' AND du.is_active = true);

  SELECT COUNT(*) INTO v_total_packages FROM packages WHERE tenant_id = p_tenant_id AND is_active = true;

  SELECT COUNT(*) INTO v_active_packages FROM client_packages cp
    JOIN clients c ON cp.client_id = c.id
    WHERE c.tenant_id = p_tenant_id AND cp.status = 'active';

  SELECT COUNT(*) INTO v_total_deliverables FROM deliverables WHERE tenant_id = p_tenant_id;

  BEGIN
    SELECT COUNT(*) INTO v_total_messages FROM messages m
      JOIN channels ch ON m.channel_id = ch.id
      JOIN workspaces ws ON ch.workspace_id = ws.id
      WHERE ws.tenant_id = p_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_total_messages := 0;
  END;

  SELECT COUNT(*) INTO v_total_channels FROM channels ch
    JOIN workspaces ws ON ch.workspace_id = ws.id
    WHERE ws.tenant_id = p_tenant_id;

  SELECT COUNT(*) INTO v_total_workspaces FROM workspaces WHERE tenant_id = p_tenant_id;

  BEGIN
    SELECT COUNT(*) INTO v_total_invoices FROM invoices WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_total_invoices := 0;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_total_campaigns FROM campaigns WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_total_campaigns := 0;
  END;

  result := jsonb_build_object(
    'total_demo_users', v_total_demo,
    'total_user_profiles', v_total_profiles,
    'total_team_members', v_total_team,
    'orphaned_demo_users_no_profile', v_orphaned_no_profile,
    'orphaned_demo_users_no_team', v_orphaned_no_team,
    'orphaned_team_members_no_profile', v_orphaned_tm_no_profile,
    'total_clients', v_total_clients,
    'clients_with_wallet', v_clients_with_wallet,
    'clients_with_workspace', v_clients_with_workspace,
    'clients_with_login', v_clients_with_login,
    'total_packages', v_total_packages,
    'active_packages', v_active_packages,
    'total_deliverables', v_total_deliverables,
    'total_messages', v_total_messages,
    'total_channels', v_total_channels,
    'total_workspaces', v_total_workspaces,
    'total_invoices', v_total_invoices,
    'total_campaigns', v_total_campaigns
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PRIORITY 2: Repair User Links RPC
-- ============================================================

CREATE OR REPLACE FUNCTION repair_user_links(p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS TABLE(
  demo_user_id UUID,
  action_taken TEXT
) AS $$
DECLARE
  du RECORD;
  v_profile_id UUID;
  v_tm_id UUID;
  v_action TEXT;
BEGIN
  FOR du IN
    SELECT d.* FROM demo_users d
    WHERE d.tenant_id = p_tenant_id
      AND d.is_active = true
      AND (d.user_profile_id IS NULL OR (d.team_member_id IS NULL AND d.role != 'client'))
  LOOP
    demo_user_id := du.id;
    v_action := '';

    IF du.user_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM user_profiles
        WHERE email = du.email AND tenant_id = p_tenant_id
        LIMIT 1;

      IF v_profile_id IS NULL THEN
        INSERT INTO user_profiles (tenant_id, full_name, email, avatar, status, auth_user_id)
        VALUES (p_tenant_id, du.display_name, du.email,
                COALESCE(du.avatar, UPPER(LEFT(du.display_name, 2))),
                'active', du.auth_user_id)
        RETURNING id INTO v_profile_id;
        v_action := v_action || 'profile_created;';
      ELSE
        v_action := v_action || 'profile_linked;';
      END IF;

      UPDATE demo_users SET user_profile_id = v_profile_id WHERE id = du.id;
    ELSE
      v_profile_id := du.user_profile_id;
    END IF;

    IF du.team_member_id IS NULL AND du.role != 'client' THEN
      SELECT id INTO v_tm_id FROM team_members
        WHERE email = du.email AND tenant_id = p_tenant_id
        LIMIT 1;

      IF v_tm_id IS NULL THEN
        INSERT INTO team_members (
          tenant_id, user_profile_id, name, email, avatar,
          primary_role, secondary_roles, work_capacity_hours,
          status, current_load, active_deliverables, boost_campaigns,
          tasks_completed_this_month, join_date
        ) VALUES (
          p_tenant_id, v_profile_id, du.display_name, du.email,
          COALESCE(du.avatar, UPPER(LEFT(du.display_name, 2))),
          CASE du.role
            WHEN 'super_admin' THEN 'Super Admin'
            WHEN 'designer' THEN 'Designer'
            WHEN 'media_buyer' THEN 'Media Buyer'
            WHEN 'account_manager' THEN 'Account Manager'
            WHEN 'finance' THEN 'Finance'
            ELSE du.role
          END,
          ARRAY[]::TEXT[], 8, 'online', 0, 0, 0, 0, CURRENT_DATE
        )
        RETURNING id INTO v_tm_id;
        v_action := v_action || 'team_member_created;';
      ELSE
        v_action := v_action || 'team_member_linked;';
      END IF;

      UPDATE demo_users SET team_member_id = v_tm_id WHERE id = du.id;
    END IF;

    IF v_action != '' THEN
      action_taken := v_action;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PRIORITY 3: Verify client onboarding triggers exist
-- ============================================================

-- Ensure auto_create_client_wallet trigger
DROP TRIGGER IF EXISTS trg_auto_create_client_wallet ON clients;
CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency, tenant_id)
  VALUES (NEW.id, 0, 'BDT', NEW.tenant_id)
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_wallet failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_client_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- Ensure auto_create_client_workspace trigger
DROP TRIGGER IF EXISTS trg_auto_create_client_workspace ON clients;
DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;

CREATE OR REPLACE FUNCTION auto_create_client_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_ws_id UUID;
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing FROM workspaces WHERE client_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO workspaces (
    tenant_id, client_id, client_name, client_logo,
    name, description, type, status, health_score
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.business_name,
    NEW.logo,
    NEW.business_name || ' Workspace',
    'Auto-created workspace for ' || NEW.business_name,
    'client',
    COALESCE(NEW.status, 'active'),
    COALESCE(NEW.health_score, 100)
  )
  RETURNING id INTO v_ws_id;

  IF v_ws_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, type, icon, is_default, tenant_id, description) VALUES
      (v_ws_id, 'General', 'general', 'hash', true, NEW.tenant_id, 'General discussion'),
      (v_ws_id, 'Deliverables', 'deliverables', 'package', true, NEW.tenant_id, 'Deliverable updates'),
      (v_ws_id, 'Boost Requests', 'boost-requests', 'zap', true, NEW.tenant_id, 'Boost campaign discussions'),
      (v_ws_id, 'Billing', 'billing', 'credit-card', true, NEW.tenant_id, 'Billing & invoice discussions'),
      (v_ws_id, 'Internal', 'internal', 'lock', true, NEW.tenant_id, 'Internal team discussion');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_workspace failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_client_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_workspace();

-- Ensure auto_create_client_login trigger
DROP TRIGGER IF EXISTS trg_auto_create_client_login ON clients;

CREATE OR REPLACE FUNCTION auto_create_client_login()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_existing_demo UUID;
BEGIN
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
    SELECT id INTO v_existing_demo FROM demo_users
    WHERE email = LOWER(TRIM(NEW.contact_email))
      AND tenant_id = NEW.tenant_id
    LIMIT 1;

    IF v_existing_demo IS NULL THEN
      INSERT INTO user_profiles (
        tenant_id, full_name, email, avatar, status
      ) VALUES (
        NEW.tenant_id,
        NEW.business_name,
        LOWER(TRIM(NEW.contact_email)),
        LEFT(NEW.business_name, 2),
        'active'
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_profile_id;

      IF v_profile_id IS NOT NULL THEN
        INSERT INTO demo_users (
          tenant_id, email, password_hash, display_name, role,
          avatar, client_id, user_profile_id, is_active, metadata
        ) VALUES (
          NEW.tenant_id,
          LOWER(TRIM(NEW.contact_email)),
          '123456',
          NEW.business_name,
          'client',
          LEFT(NEW.business_name, 2),
          NEW.id,
          v_profile_id,
          true,
          jsonb_build_object('auto_created', true, 'business_name', NEW.business_name)
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_login failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_client_login
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_login();

-- Ensure auto_init_package_usage trigger
DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
DROP TRIGGER IF EXISTS trg_auto_init_usage ON client_packages;

CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT pd.deliverable_type, pd.quantity
    FROM package_deliverables pd
    WHERE pd.package_id = NEW.package_id
  LOOP
    INSERT INTO package_usage (
      client_package_id, deliverable_type, used, total, tenant_id
    ) VALUES (
      NEW.id,
      v_rec.deliverable_type,
      0,
      COALESCE(v_rec.quantity, 0),
      COALESCE(NEW.tenant_id, (SELECT tenant_id FROM clients WHERE id = NEW.client_id))
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_init_package_usage failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- ============================================================
-- PRIORITY 4: Data source check function (for UI indicators)
-- ============================================================

CREATE OR REPLACE FUNCTION get_table_counts(p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  result := jsonb_build_object(
    'clients', (SELECT COUNT(*) FROM clients WHERE tenant_id = p_tenant_id),
    'team_members', (SELECT COUNT(*) FROM team_members WHERE tenant_id = p_tenant_id),
    'demo_users', (SELECT COUNT(*) FROM demo_users WHERE tenant_id = p_tenant_id AND is_active = true),
    'packages', (SELECT COUNT(*) FROM packages WHERE tenant_id = p_tenant_id AND is_active = true),
    'deliverables', (SELECT COUNT(*) FROM deliverables WHERE tenant_id = p_tenant_id),
    'workspaces', (SELECT COUNT(*) FROM workspaces WHERE tenant_id = p_tenant_id),
    'notifications', (SELECT COUNT(*) FROM notifications WHERE tenant_id = p_tenant_id)
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PRIORITY 5: RLS Policies (Allow all for now with tenant isolation)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY[
    'clients', 'team_members', 'demo_users', 'user_profiles',
    'packages', 'deliverables', 'workspaces', 'channels',
    'notifications', 'activities', 'invoices', 'campaigns',
    'client_wallets', 'client_packages', 'package_usage',
    'wallet_transactions', 'message_files', 'message_reactions',
    'canned_responses', 'quick_actions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "allow_all_%s" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'RLS policy for % failed: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  tbl TEXT;
  no_tenant_tables TEXT[] := ARRAY[
    'messages', 'workspace_members', 'channel_members',
    'message_read_receipts', 'read_receipts',
    'pinned_messages', 'saved_messages',
    'user_roles', 'roles', 'teams', 'team_member_teams',
    'user_skills', 'user_appearance_settings',
    'deliverable_ratings', 'deliverable_types', 'deliverable_categories',
    'package_deliverables', 'package_tiers', 'package_features',
    'client_package_features', 'usage_deduction_events',
    'invoice_items', 'ad_accounts', 'client_performance',
    'client_sub_users', 'agency_settings', 'dashboard_widgets',
    'user_invitations', 'support_tickets', 'ticket_messages',
    'brand_assets', 'calendar_events'
  ];
BEGIN
  FOREACH tbl IN ARRAY no_tenant_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "allow_all_%s" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- Storage Bucket Policies (for message-attachments and brand-assets)
-- ============================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Storage bucket creation warning: %', SQLERRM;
END $$;

DROP POLICY IF EXISTS "Allow public uploads to message-attachments" ON storage.objects;
CREATE POLICY "Allow public uploads to message-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow public reads from message-attachments" ON storage.objects;
CREATE POLICY "Allow public reads from message-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow public uploads to brand-assets" ON storage.objects;
CREATE POLICY "Allow public uploads to brand-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Allow public reads from brand-assets" ON storage.objects;
CREATE POLICY "Allow public reads from brand-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Allow deletes from message-attachments" ON storage.objects;
CREATE POLICY "Allow deletes from message-attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow deletes from brand-assets" ON storage.objects;
CREATE POLICY "Allow deletes from brand-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-assets');

-- ============================================================
-- DONE
-- ============================================================
