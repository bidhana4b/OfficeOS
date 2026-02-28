-- Client Onboarding Engine: Ensure all tables/columns exist for full onboarding flow

-- Ensure activities table has entity_type, entity_id, client_id columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'entity_type') THEN
    ALTER TABLE activities ADD COLUMN entity_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'entity_id') THEN
    ALTER TABLE activities ADD COLUMN entity_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'client_id') THEN
    ALTER TABLE activities ADD COLUMN client_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'user_id') THEN
    ALTER TABLE activities ADD COLUMN user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'user_name') THEN
    ALTER TABLE activities ADD COLUMN user_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'metadata') THEN
    ALTER TABLE activities ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Ensure notifications has all needed columns for onboarding flow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
    ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'info';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
    ALTER TABLE notifications ADD COLUMN message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- Ensure client_packages has both status and is_active for compatibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_packages' AND column_name = 'status') THEN
    ALTER TABLE client_packages ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_packages' AND column_name = 'is_active') THEN
    ALTER TABLE client_packages ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_packages' AND column_name = 'custom_monthly_fee') THEN
    ALTER TABLE client_packages ADD COLUMN custom_monthly_fee NUMERIC(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_packages' AND column_name = 'notes') THEN
    ALTER TABLE client_packages ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Ensure client_package_features table exists with correct schema
CREATE TABLE IF NOT EXISTS client_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  total_allocated INT DEFAULT 0,
  warning_threshold INT DEFAULT 20,
  auto_deduction BOOLEAN DEFAULT true,
  unit_label TEXT DEFAULT 'units'
);

-- Ensure clients table has onboarding-specific columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'owner_name') THEN
    ALTER TABLE clients ADD COLUMN owner_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'owner_phone') THEN
    ALTER TABLE clients ADD COLUMN owner_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'manager_name') THEN
    ALTER TABLE clients ADD COLUMN manager_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'manager_phone') THEN
    ALTER TABLE clients ADD COLUMN manager_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'monthly_boost_budget') THEN
    ALTER TABLE clients ADD COLUMN monthly_boost_budget NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'boost_budget_currency') THEN
    ALTER TABLE clients ADD COLUMN boost_budget_currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'referrer_name') THEN
    ALTER TABLE clients ADD COLUMN referrer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'onboarding_notes') THEN
    ALTER TABLE clients ADD COLUMN onboarding_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'metadata') THEN
    ALTER TABLE clients ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'onboarded_at') THEN
    ALTER TABLE clients ADD COLUMN onboarded_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create or replace the auto-create client resources trigger
CREATE OR REPLACE FUNCTION auto_create_client_resources()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  -- Auto-create wallet
  INSERT INTO client_wallets (client_id, balance, currency)
  VALUES (NEW.id, 0, COALESCE(NEW.boost_budget_currency, 'USD'))
  ON CONFLICT DO NOTHING;

  -- Auto-create workspace
  INSERT INTO workspaces (tenant_id, client_id, name, description)
  VALUES (NEW.tenant_id, NEW.id, NEW.business_name || ' Workspace', 'Workspace for ' || NEW.business_name)
  ON CONFLICT DO NOTHING
  RETURNING id INTO ws_id;

  -- Auto-create default channels if workspace was created
  IF ws_id IS NOT NULL THEN
    INSERT INTO channels (workspace_id, name, description, type) VALUES
      (ws_id, 'general', 'General discussion', 'public'),
      (ws_id, 'deliverables', 'Deliverable updates & files', 'public'),
      (ws_id, 'boost', 'Boost campaign discussions', 'public'),
      (ws_id, 'billing', 'Billing and payment discussions', 'private'),
      (ws_id, 'internal', 'Internal team notes', 'private')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_client_resources ON clients;
CREATE TRIGGER trg_auto_create_client_resources
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_resources();

-- Create or replace auto-init package usage trigger
CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO package_usage (client_package_id, deliverable_type, used, total)
  SELECT NEW.id, pf.deliverable_type, 0, COALESCE(pf.total_allocated, 0)
  FROM package_features pf
  WHERE pf.package_id = NEW.package_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_usage ON client_packages;
CREATE TRIGGER trg_auto_init_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- RLS: ensure open access for development
DROP POLICY IF EXISTS "activities_all_access" ON activities;
CREATE POLICY "activities_all_access" ON activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_all_access" ON notifications;
CREATE POLICY "notifications_all_access" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "client_package_features_all_access" ON client_package_features;
CREATE POLICY "client_package_features_all_access" ON client_package_features FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_package_features_cpid ON client_package_features(client_package_id);
CREATE INDEX IF NOT EXISTS idx_clients_onboarded ON clients(onboarded_at);
