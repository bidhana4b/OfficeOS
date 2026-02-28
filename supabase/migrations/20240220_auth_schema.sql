-- Migration: Create auth bridge tables (Schema only)

-- 1. Create public.users table to mirror auth.users (for FK relationships)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add auth_user_id column to user_profiles to link with Supabase Auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN auth_user_id UUID;
  END IF;
END $$;

-- 3. Add auth_user_id column to demo_users for backward compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'demo_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN auth_user_id UUID;
  END IF;
END $$;

-- 4. Create indexes
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

-- 6. Helper functions
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
    'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'designer', 'media_buyer', 'account_manager', 'finance', 'client')),
  display_name TEXT NOT NULL,
  invited_by UUID,
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

-- 9. Create auth user view
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
