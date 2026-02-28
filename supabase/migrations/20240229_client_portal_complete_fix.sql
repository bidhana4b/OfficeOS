-- ============================================================
-- Client Portal Complete Fix Migration
-- 1. Ensure brand-assets storage bucket exists
-- 2. Ensure deliverable_ratings table has all required columns & constraints
-- 3. Ensure auto_create_client_login trigger exists
-- 4. Ensure auto_init_package_usage trigger exists
-- 5. Ensure get_client_portal_data RPC is up to date
-- 6. Enable realtime on key tables
-- 7. Create message-attachments bucket if missing
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

DROP POLICY IF EXISTS "Authenticated brand asset update" ON storage.objects;
CREATE POLICY "Authenticated brand asset update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'brand-assets');

-- 1b. Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public message attachment read" ON storage.objects;
CREATE POLICY "Public message attachment read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated message attachment upload" ON storage.objects;
CREATE POLICY "Authenticated message attachment upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated message attachment delete" ON storage.objects;
CREATE POLICY "Authenticated message attachment delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-attachments');

-- 2. Ensure deliverable_ratings table exists with all required columns
CREATE TABLE IF NOT EXISTS deliverable_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliverable_ratings' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE deliverable_ratings 
      ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliverable_ratings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE deliverable_ratings 
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deliverable_ratings_unique_deliverable_client'
  ) THEN
    ALTER TABLE deliverable_ratings 
      ADD CONSTRAINT deliverable_ratings_unique_deliverable_client 
      UNIQUE (deliverable_id, client_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_deliverable_ratings_deliverable 
  ON deliverable_ratings(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_ratings_client 
  ON deliverable_ratings(client_id);

-- 3. Auto-create client login trigger (when client is created with contact_email)
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

        -- Also add to workspace if already created
        DECLARE
          v_workspace_id UUID;
        BEGIN
          SELECT id INTO v_workspace_id FROM workspaces WHERE client_id = NEW.id LIMIT 1;
          IF v_workspace_id IS NOT NULL THEN
            INSERT INTO workspace_members (
              workspace_id, user_profile_id, name, avatar, role, status
            ) VALUES (
              v_workspace_id, v_profile_id, NEW.business_name,
              LEFT(NEW.business_name, 2), 'member', 'online'
            ) ON CONFLICT DO NOTHING;
          END IF;
        END;
      END IF;
    ELSE
      -- Update existing demo_user to link to this client
      UPDATE demo_users SET client_id = NEW.id
      WHERE id = v_existing_demo AND client_id IS NULL;
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

-- 4. Auto-init package usage trigger (robust version)
CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_deliverable RECORD;
BEGIN
  FOR v_deliverable IN
    SELECT pd.deliverable_type, pd.quantity
    FROM package_deliverables pd
    WHERE pd.package_id = NEW.package_id
  LOOP
    INSERT INTO package_usage (
      client_package_id, deliverable_type, used, total, period_start, period_end
    ) VALUES (
      NEW.id,
      v_deliverable.deliverable_type,
      0,
      v_deliverable.quantity,
      NOW(),
      NOW() + INTERVAL '30 days'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- 5. get_client_portal_data RPC (optimized single-call portal data)
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

-- 6. Enable realtime on key tables
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'deliverables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE channels;
  END IF;
END $$;
