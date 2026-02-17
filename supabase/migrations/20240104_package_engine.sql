CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  category TEXT,
  tier TEXT NOT NULL,
  monthly_fee NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  platform_count INT DEFAULT 1,
  correction_limit INT DEFAULT 2,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  recommended BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  total_allocated INT DEFAULT 0,
  warning_threshold INT DEFAULT 20,
  auto_deduction BOOLEAN DEFAULT true,
  unit_label TEXT DEFAULT 'units'
);

CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  renewal_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL REFERENCES client_packages(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  used INT DEFAULT 0,
  total INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE package_usage REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE package_usage;
