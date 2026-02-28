ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS deliverable_type TEXT;
ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'package';
ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS total_allocated INT DEFAULT 0;
ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS warning_threshold INT DEFAULT 20;
ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS auto_deduction BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS client_package_features ADD COLUMN IF NOT EXISTS unit_label TEXT DEFAULT 'units';

ALTER TABLE IF EXISTS client_packages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE IF EXISTS client_packages ADD COLUMN IF NOT EXISTS custom_monthly_fee NUMERIC;
ALTER TABLE IF EXISTS client_packages ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  UPDATE client_packages SET status = 'active' WHERE is_active = true AND (status IS NULL OR status = '');
  UPDATE client_packages SET status = 'expired' WHERE is_active = false AND (status IS NULL OR status = '');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
