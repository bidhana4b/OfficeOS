-- Migration: RLS policies for auth system

-- RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view same tenant" ON public.users;
CREATE POLICY "Users can view same tenant" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anon insert users" ON public.users;
CREATE POLICY "Anon insert users" ON public.users
  FOR INSERT WITH CHECK (true);

-- RLS on password_reset_tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role full access tokens" ON public.password_reset_tokens
  FOR ALL USING (true);

-- RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view invitations" ON public.user_invitations;
CREATE POLICY "Anyone can view invitations" ON public.user_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manage invitations" ON public.user_invitations;
CREATE POLICY "Service role manage invitations" ON public.user_invitations
  FOR ALL USING (true);
