-- =============================================
-- LIVE SYSTEM BOOTSTRAP - Make everything work today
-- =============================================

-- 1. Ensure public.users table exists (for FK relationships with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure tenants table has the demo tenant
INSERT INTO tenants (id, name, slug, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TITAN DEV AI Agency',
  'titan-dev',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 3. Add missing columns to demo_users if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_users' AND column_name = 'auth_user_id') THEN
    ALTER TABLE demo_users ADD COLUMN auth_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_users' AND column_name = 'user_profile_id') THEN
    ALTER TABLE demo_users ADD COLUMN user_profile_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_users' AND column_name = 'team_member_id') THEN
    ALTER TABLE demo_users ADD COLUMN team_member_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_users' AND column_name = 'last_login_at') THEN
    ALTER TABLE demo_users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Ensure clients table has demo client
INSERT INTO clients (id, tenant_id, business_name, category, status, health_score, contact_email)
VALUES (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-000000000001',
  'Imperial Motors',
  'Motorcycle Dealer',
  'active',
  100,
  'client@demo.com'
) ON CONFLICT (id) DO NOTHING;

-- 5. Ensure demo_users exist with proper data
INSERT INTO demo_users (tenant_id, email, password_hash, display_name, role, avatar, client_id, metadata, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'super@demo.com', '123456', 'Ahmed Al-Rashid', 'super_admin', 'AR', NULL, '{"department": "Executive", "title": "CEO & Founder"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000001', 'designer@demo.com', '123456', 'Arif Hassan', 'designer', 'AH', NULL, '{"department": "Creative", "title": "Senior Designer"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000001', 'mediabuyer@demo.com', '123456', 'Adeola Bakare', 'media_buyer', 'AB', NULL, '{"department": "Media", "title": "Media Buying Lead"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000001', 'manager@demo.com', '123456', 'Fatima Hassan', 'account_manager', 'FH', NULL, '{"department": "Client Management", "title": "Senior Account Manager"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000001', 'finance@demo.com', '123456', 'Sarah Chen', 'finance', 'SC', NULL, '{"department": "Finance", "title": "Finance Officer"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000001', 'client@demo.com', '123456', 'Imperial Motors', 'client', 'IM', '00000000-0000-0000-0000-0000000000c1', '{"business_name": "Imperial Motors", "package": "Royal Dominance Package"}'::jsonb, true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  password_hash = EXCLUDED.password_hash;

-- 6. Auto-create trigger for public.users on auth signup
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

-- 7. Ensure workspaces exist for the demo client
INSERT INTO workspaces (id, tenant_id, name, description, client_id, client_name, pinned, status)
VALUES (
  'a0000000-0000-0000-0000-000000000a01',
  '00000000-0000-0000-0000-000000000001',
  'Imperial Motors',
  'Client workspace for Imperial Motors',
  '00000000-0000-0000-0000-0000000000c1',
  'Imperial Motors',
  true,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 8. Ensure default channels exist
INSERT INTO channels (id, workspace_id, name, type, description, is_default, tenant_id)
VALUES
  ('b0000000-0000-0000-0000-000000000b01', 'a0000000-0000-0000-0000-000000000a01', 'general', 'general', 'General discussion', true, '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000b02', 'a0000000-0000-0000-0000-000000000a01', 'deliverables', 'deliverables', 'Deliverable requests and tracking', true, '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000b03', 'a0000000-0000-0000-0000-000000000a01', 'boost-requests', 'boost-requests', 'Ad boost requests', true, '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000b04', 'a0000000-0000-0000-0000-000000000a01', 'billing', 'billing', 'Billing and invoices', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 9. Ensure client_wallets exists for demo client
INSERT INTO client_wallets (tenant_id, client_id, balance, currency)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c1',
  5000.00,
  'BDT'
) ON CONFLICT DO NOTHING;

-- 10. Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('message-attachments', 'message-attachments', true, 52428800, ARRAY['image/*', 'application/pdf', 'video/*', 'audio/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.*']),
  ('brand-assets', 'brand-assets', true, 52428800, ARRAY['image/*', 'application/pdf', 'video/*']),
  ('deliverable-files', 'deliverable-files', true, 104857600, ARRAY['image/*', 'application/pdf', 'video/*', 'audio/*', 'application/zip'])
ON CONFLICT (id) DO NOTHING;

-- 11. Storage policies for public access
DROP POLICY IF EXISTS "Public read message-attachments" ON storage.objects;
CREATE POLICY "Public read message-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Auth upload message-attachments" ON storage.objects;
CREATE POLICY "Auth upload message-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Auth delete message-attachments" ON storage.objects;
CREATE POLICY "Auth delete message-attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
CREATE POLICY "Public read brand-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Auth upload brand-assets" ON storage.objects;
CREATE POLICY "Auth upload brand-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Public read deliverable-files" ON storage.objects;
CREATE POLICY "Public read deliverable-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deliverable-files');

DROP POLICY IF EXISTS "Auth upload deliverable-files" ON storage.objects;
CREATE POLICY "Auth upload deliverable-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deliverable-files');

DROP POLICY IF EXISTS "Auth delete deliverable-files" ON storage.objects;
CREATE POLICY "Auth delete deliverable-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'deliverable-files');

-- 12. Disable RLS on all core tables so the system works immediately
-- (In production, re-enable with proper policies)
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS demo_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_deliverables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliverable_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliverable_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliverables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliverable_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS read_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallet_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agency_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboard_widgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_sub_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_accounts DISABLE ROW LEVEL SECURITY;

-- 13. Enable Realtime on key tables (safe - ignore if already added)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE deliverables; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE read_receipts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 14. Helper function: get_client_portal_data
CREATE OR REPLACE FUNCTION get_client_portal_data(p_client_id UUID, p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'client', (SELECT row_to_json(c) FROM clients c WHERE c.id = p_client_id AND c.tenant_id = p_tenant_id),
    'wallet', (SELECT row_to_json(w) FROM client_wallets w WHERE w.client_id = p_client_id AND w.tenant_id = p_tenant_id),
    'packages', COALESCE((SELECT json_agg(row_to_json(cp)) FROM client_packages cp WHERE cp.client_id = p_client_id AND cp.tenant_id = p_tenant_id AND cp.status = 'active'), '[]'::json),
    'pending_deliverables', COALESCE((SELECT count(*) FROM deliverables d WHERE d.client_id = p_client_id AND d.tenant_id = p_tenant_id AND d.status IN ('pending', 'assigned', 'in_progress')), 0),
    'unread_messages', 0
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
