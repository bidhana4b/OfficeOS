-- This migration was split into 20240220_auth_schema.sql and 20240221_auth_rls_policies.sql
-- No-op file kept for reference
SELECT 1;
-- ORIGINAL CONTENT BELOW (not executed)

-- 2. Add auth_user_id column to user_profiles to link with Supabase Auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN auth_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add auth_user_id column to demo_users for backward compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'demo_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN auth_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Create index for quick auth lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_demo_users_auth_user_id ON demo_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_public_users_tenant_id ON public.users(tenant_id);

-- 5. Trigger to auto-create public.users on auth signup
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

-- 6. Create user_auth_metadata view for easy querying
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

-- 7. Create function to get current user's tenant_id from auth
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (SELECT tenant_id FROM public.users WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000001'::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. Create function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM demo_users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1),
    'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. Create password_reset_tokens table for custom password reset flow
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'designer', 'media_buyer', 'account_manager', 'finance', 'client')),
  display_name TEXT NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  invitation_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant ON user_invitations(tenant_id);

-- 11. Enable RLS on new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies for public.users
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can view same tenant" ON public.users;
CREATE POLICY "Users can view same tenant" ON public.users
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- 13. RLS Policies for user_invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage invitations" ON public.user_invitations
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('super_admin', 'account_manager')
  );

DROP POLICY IF EXISTS "Service role full access invitations" ON public.user_invitations;
CREATE POLICY "Service role full access invitations" ON public.user_invitations
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.user_invitations;
CREATE POLICY "Anyone can view invitation by token" ON public.user_invitations
  FOR SELECT USING (true);

-- 14. RLS Policies for password_reset_tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON public.password_reset_tokens;
CREATE POLICY "Users can view own tokens" ON public.password_reset_tokens
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role full access tokens" ON public.password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- 15. Enable RLS on core tables with tenant isolation
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation user_profiles" ON user_profiles;
CREATE POLICY "Tenant isolation user_profiles" ON user_profiles
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Service role full access user_profiles" ON user_profiles;
CREATE POLICY "Service role full access user_profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anon read user_profiles" ON user_profiles;
CREATE POLICY "Anon read user_profiles" ON user_profiles
  FOR SELECT USING (true);

ALTER TABLE demo_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation demo_users" ON demo_users;
CREATE POLICY "Tenant isolation demo_users" ON demo_users
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Service role full access demo_users" ON demo_users;
CREATE POLICY "Service role full access demo_users" ON demo_users
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anon read demo_users for login" ON demo_users;
CREATE POLICY "Anon read demo_users for login" ON demo_users
  FOR SELECT USING (true);
