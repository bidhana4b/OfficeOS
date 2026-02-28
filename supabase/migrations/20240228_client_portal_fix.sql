-- ============================================================
-- Client Portal Fix Migration
-- 1. Create brand-assets storage bucket
-- 2. Ensure deliverable_ratings table has proper constraints
-- 3. Ensure client onboarding triggers exist for auto-provisioning
-- 4. Add helper functions for client portal
-- ============================================================

-- 1. Create brand-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp', 'application/pdf', 'font/ttf', 'font/otf', 'font/woff', 'font/woff2']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public brand asset read" ON storage.objects;
CREATE POLICY "Public brand asset read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Authenticated brand asset upload" ON storage.objects;
CREATE POLICY "Authenticated brand asset upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Authenticated brand asset delete" ON storage.objects;
CREATE POLICY "Authenticated brand asset delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-assets');

-- 2. Ensure deliverable_ratings columns are complete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliverable_ratings' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE deliverable_ratings 
      ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;

-- 3. Create/replace function for client login auto-creation during onboarding
-- This is the DB trigger approach (complementary to the edge function approach)
CREATE OR REPLACE FUNCTION auto_create_client_login()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM demo_users 
      WHERE email = LOWER(TRIM(NEW.contact_email))
      AND tenant_id = NEW.tenant_id
    ) THEN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_login ON clients;
CREATE TRIGGER trg_auto_create_client_login
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_login();

-- 4. Helper RPC: get client portal data in one call
CREATE OR REPLACE FUNCTION get_client_portal_data(p_client_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_client RECORD;
  v_wallet RECORD;
  v_pkg RECORD;
  v_usage JSON;
  v_stats JSON;
BEGIN
  SELECT * INTO v_client FROM clients WHERE id = p_client_id;
  IF v_client IS NULL THEN
    RETURN json_build_object('error', 'Client not found');
  END IF;

  SELECT * INTO v_wallet FROM client_wallets WHERE client_id = p_client_id;

  SELECT cp.*, p.name as package_name, p.description as package_description, 
         p.monthly_fee, p.currency
  INTO v_pkg
  FROM client_packages cp
  JOIN packages p ON cp.package_id = p.id
  WHERE cp.client_id = p_client_id AND cp.status = 'active'
  LIMIT 1;

  IF v_pkg IS NOT NULL THEN
    SELECT json_agg(json_build_object(
      'deliverable_type', pu.deliverable_type,
      'label', COALESCE(cpf.label, pf.label, INITCAP(REPLACE(pu.deliverable_type, '_', ' '))),
      'icon', COALESCE(cpf.icon, pf.icon, pu.deliverable_type),
      'used', pu.used,
      'total', COALESCE(cpf.total_allocated, pf.total_allocated, pu.total),
      'remaining', GREATEST(0, COALESCE(cpf.total_allocated, pf.total_allocated, pu.total) - pu.used),
      'warning_threshold', COALESCE(cpf.warning_threshold, pf.warning_threshold, 20),
      'source', CASE 
        WHEN cpf.id IS NOT NULL THEN 'client_override'
        WHEN pf.id IS NOT NULL THEN 'package_feature'
        ELSE 'raw_usage'
      END
    ))
    INTO v_usage
    FROM package_usage pu
    LEFT JOIN client_package_features cpf 
      ON cpf.client_package_id = pu.client_package_id 
      AND cpf.deliverable_type = pu.deliverable_type
    LEFT JOIN package_features pf
      ON pf.package_id = v_pkg.package_id
      AND pf.deliverable_type = pu.deliverable_type
    WHERE pu.client_package_id = v_pkg.id;
  END IF;

  SELECT json_build_object(
    'posts_published', COALESCE((SELECT COUNT(*) FROM deliverables WHERE client_id = p_client_id AND status = 'delivered'), 0),
    'active_campaigns', COALESCE((SELECT COUNT(*) FROM campaigns WHERE client_id = p_client_id AND status IN ('active', 'live')), 0),
    'ad_spend', COALESCE((SELECT SUM(spent) FROM campaigns WHERE client_id = p_client_id), 0),
    'leads_generated', COALESCE((SELECT SUM(clicks) FROM campaigns WHERE client_id = p_client_id), 0)
  ) INTO v_stats;

  RETURN json_build_object(
    'client', row_to_json(v_client),
    'wallet', CASE WHEN v_wallet IS NOT NULL THEN row_to_json(v_wallet) ELSE NULL END,
    'package', CASE WHEN v_pkg IS NOT NULL THEN json_build_object(
      'id', v_pkg.id,
      'package_name', v_pkg.package_name,
      'package_description', v_pkg.package_description,
      'monthly_fee', v_pkg.monthly_fee,
      'currency', v_pkg.currency,
      'renewal_date', v_pkg.renewal_date,
      'start_date', v_pkg.start_date,
      'status', v_pkg.status
    ) ELSE NULL END,
    'usage', COALESCE(v_usage, '[]'::json),
    'stats', v_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ensure realtime on deliverable_ratings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'deliverable_ratings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_ratings;
  END IF;
END $$;
