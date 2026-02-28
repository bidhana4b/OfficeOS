-- Migration: Auth Bridge System - Links Supabase Auth to existing user tables
-- Creates public.users table and sync triggers for Supabase Auth integration

-- 1. Create public.users table to mirror auth.users (for FK relationships)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add auth_user_id column to user_profiles
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

-- 4. Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create trigger to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM user_profiles WHERE id = NEW.id LIMIT 1;
  INSERT INTO public.users (id, email, tenant_id)
  VALUES (NEW.id, NEW.email, v_tenant_id)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS Policy: Users can only read their own user record
DROP POLICY IF EXISTS "Users can read own user" ON public.users;
CREATE POLICY "Users can read own user"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 7. RLS Policy: Service role can manage users
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role');

-- 8. Realtime is controlled separately via supabase UI
-- No publication changes needed here
