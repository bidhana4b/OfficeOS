CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT 'cyan',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverable_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  unit_label TEXT DEFAULT 'units',
  hours_per_unit NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, type_key)
);

ALTER TABLE package_features ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS custom_monthly_fee NUMERIC;
ALTER TABLE client_packages ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS client_package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL REFERENCES client_packages(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  total_allocated INT DEFAULT 0,
  warning_threshold INT DEFAULT 20,
  auto_deduction BOOLEAN DEFAULT true,
  unit_label TEXT DEFAULT 'units'
);

INSERT INTO service_categories (tenant_id, name, icon, color, description, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Motorcycle Dealer', 'bike', 'cyan', 'Marketing packages for motorcycle dealerships', 1),
  ('00000000-0000-0000-0000-000000000001', 'Restaurant', 'utensils-crossed', 'magenta', 'Marketing packages for restaurants and food businesses', 2),
  ('00000000-0000-0000-0000-000000000001', 'Corporate', 'building-2', 'purple', 'Enterprise marketing for corporate clients', 3),
  ('00000000-0000-0000-0000-000000000001', 'E-Commerce', 'shopping-cart', 'lime', 'Online store and e-commerce marketing', 4),
  ('00000000-0000-0000-0000-000000000001', 'Healthcare', 'heart-pulse', 'red', 'Marketing for hospitals and clinics', 5),
  ('00000000-0000-0000-0000-000000000001', 'Education', 'graduation-cap', 'amber', 'Marketing for schools and educational institutions', 6),
  ('00000000-0000-0000-0000-000000000001', 'Custom', 'wrench', 'lime', 'Custom packages for any industry', 99);

INSERT INTO deliverable_types (tenant_id, type_key, label, icon, unit_label, hours_per_unit, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'photo_graphics', 'Photo/Graphics Design', 'image', 'designs', 1.5, 1),
  ('00000000-0000-0000-0000-000000000001', 'video_edit', 'Video Edit', 'video', 'videos', 4, 2),
  ('00000000-0000-0000-0000-000000000001', 'motion_graphics', 'Motion Graphics', 'sparkles', 'animations', 6, 3),
  ('00000000-0000-0000-0000-000000000001', 'reels', 'Reels', 'clapperboard', 'reels', 3, 4),
  ('00000000-0000-0000-0000-000000000001', 'copywriting', 'Copywriting', 'pen-tool', 'copies', 0.5, 5),
  ('00000000-0000-0000-0000-000000000001', 'customer_frames', 'Customer Frames', 'frame', 'frames', 0.75, 6),
  ('00000000-0000-0000-0000-000000000001', 'service_frames', 'Service Frames', 'layout', 'frames', 0.75, 7),
  ('00000000-0000-0000-0000-000000000001', 'boost_campaign', 'Boost Campaign', 'rocket', 'campaigns', 4, 8),
  ('00000000-0000-0000-0000-000000000001', 'ads_management', 'Ads Management', 'megaphone', 'platforms', 8, 9),
  ('00000000-0000-0000-0000-000000000001', 'influencer_marketing', 'Influencer Marketing', 'star', 'campaigns', 12, 10),
  ('00000000-0000-0000-0000-000000000001', 'seo', 'SEO', 'search', 'audits', 10, 11),
  ('00000000-0000-0000-0000-000000000001', 'social_media_posts', 'Social Media Posts', 'message-square', 'posts', 0.5, 12);

ALTER TABLE service_categories REPLICA IDENTITY FULL;
ALTER TABLE deliverable_types REPLICA IDENTITY FULL;
ALTER TABLE packages REPLICA IDENTITY FULL;
ALTER TABLE package_features REPLICA IDENTITY FULL;
ALTER TABLE client_packages REPLICA IDENTITY FULL;
ALTER TABLE client_package_features REPLICA IDENTITY FULL;
