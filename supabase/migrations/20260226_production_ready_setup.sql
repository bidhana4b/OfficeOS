-- ============================================
-- PRODUCTION READY SETUP MIGRATION
-- Goal: Remove demo data dependency, ensure proper auth bridge,
-- storage, realtime, and RLS for production use
-- ============================================

-- 1. Ensure public.users table exists (auth bridge)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure auth_user_id columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN auth_user_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'demo_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN auth_user_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'demo_users' AND column_name = 'user_profile_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN user_profile_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'demo_users' AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN team_member_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'demo_users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Indexes for auth lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_auth_user_id ON demo_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_public_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_email ON demo_users(email);

-- 4. Auth trigger: auto-create public.users on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'tenant_id')::UUID,
      '00000000-0000-0000-0000-000000000001'::UUID
    )
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (SELECT tenant_id FROM public.users WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000001'::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM demo_users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1),
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Auth view for querying linked data
CREATE OR REPLACE VIEW public.user_auth_view AS
SELECT
  u.id AS auth_id,
  u.email,
  u.tenant_id,
  up.id AS profile_id,
  up.full_name,
  up.avatar,
  up.phone,
  up.status AS profile_status,
  du.id AS demo_user_id,
  du.role,
  du.display_name,
  du.client_id,
  du.metadata,
  du.is_active,
  tm.id AS team_member_id,
  tm.primary_role
FROM public.users u
LEFT JOIN user_profiles up ON up.auth_user_id = u.id
LEFT JOIN demo_users du ON du.auth_user_id = u.id
LEFT JOIN team_members tm ON tm.user_profile_id = up.id;

-- 7. Ensure client onboarding triggers: auto-create wallet + workspace + channels
CREATE OR REPLACE FUNCTION public.auto_create_client_resources()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Create wallet if not exists
  INSERT INTO client_wallets (client_id, tenant_id, balance, currency)
  VALUES (NEW.id, NEW.tenant_id, 0, 'BDT')
  ON CONFLICT (client_id) DO NOTHING;

  -- Create workspace
  INSERT INTO workspaces (tenant_id, client_id, name, description, status, pinned)
  VALUES (NEW.tenant_id, NEW.id, NEW.business_name, 'Workspace for ' || NEW.business_name, 'active', false)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_workspace_id;

  -- Create default channels if workspace was created
  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, type, icon, description) VALUES
      (v_workspace_id, 'general', 'general', 'hash', 'General discussions'),
      (v_workspace_id, 'deliverables', 'deliverables', 'package', 'Deliverable requests and tracking'),
      (v_workspace_id, 'boost-requests', 'boost-requests', 'zap', 'Boost/ad campaign requests'),
      (v_workspace_id, 'billing', 'billing', 'credit-card', 'Billing and payment discussions')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;
CREATE TRIGGER trg_auto_create_client_resources
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_client_resources();

-- 8. Auto-init package usage when package assigned
CREATE OR REPLACE FUNCTION public.auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_pkg_deliverable RECORD;
BEGIN
  FOR v_pkg_deliverable IN
    SELECT pd.deliverable_type, pd.quantity
    FROM package_deliverables pd
    WHERE pd.package_id = NEW.package_id
  LOOP
    INSERT INTO package_usage (client_package_id, deliverable_type, used, total, period_start, period_end)
    VALUES (
      NEW.id,
      v_pkg_deliverable.deliverable_type,
      0,
      v_pkg_deliverable.quantity,
      COALESCE(NEW.start_date::DATE, CURRENT_DATE),
      COALESCE(NEW.renewal_date::DATE, (CURRENT_DATE + INTERVAL '30 days')::DATE)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW EXECUTE FUNCTION public.auto_init_package_usage();

-- 9. Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', false, 52428800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('brand-assets', 'brand-assets', false, 52428800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('deliverable-files', 'deliverable-files', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-attachments
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read message attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read message attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can upload brand assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload brand assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read brand assets" ON storage.objects;
CREATE POLICY "Authenticated users can read brand assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can upload deliverable files" ON storage.objects;
CREATE POLICY "Authenticated users can upload deliverable files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deliverable-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read deliverable files" ON storage.objects;
CREATE POLICY "Authenticated users can read deliverable files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deliverable-files' AND auth.role() = 'authenticated');

-- 10. Enable Realtime on key tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE channels;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_posts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE clients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. Ensure activities table exists for activity logging
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);

-- 12. Ensure client_wallets has proper unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_wallets_client_id_key'
  ) THEN
    BEGIN
      ALTER TABLE client_wallets ADD CONSTRAINT client_wallets_client_id_key UNIQUE (client_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
