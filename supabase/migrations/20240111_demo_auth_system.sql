CREATE TABLE IF NOT EXISTS demo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT 'demo',
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'designer', 'media_buyer', 'account_manager', 'finance', 'client')),
  avatar TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO demo_users (tenant_id, email, password_hash, display_name, role, avatar, client_id, metadata) VALUES
  ('00000000-0000-0000-0000-000000000001', 'super@demo.com', '123456', 'Ahmed Al-Rashid', 'super_admin', 'AR', NULL, '{"department": "Executive", "title": "CEO & Founder"}'),
  ('00000000-0000-0000-0000-000000000001', 'designer@demo.com', '123456', 'Arif Hassan', 'designer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', NULL, '{"department": "Creative", "title": "Senior Designer"}'),
  ('00000000-0000-0000-0000-000000000001', 'mediabuyer@demo.com', '123456', 'Adeola Bakare', 'media_buyer', 'AB', NULL, '{"department": "Media", "title": "Media Buying Lead"}'),
  ('00000000-0000-0000-0000-000000000001', 'manager@demo.com', '123456', 'Fatima Hassan', 'account_manager', 'FH', NULL, '{"department": "Client Management", "title": "Senior Account Manager"}'),
  ('00000000-0000-0000-0000-000000000001', 'finance@demo.com', '123456', 'Sarah Chen', 'finance', 'SC', NULL, '{"department": "Finance", "title": "Finance Officer"}'),
  ('00000000-0000-0000-0000-000000000001', 'client@demo.com', '123456', 'Imperial Motors', 'client', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&q=80', '00000000-0000-0000-0000-0000000000c1', '{"business_name": "Imperial Motors", "package": "Royal Dominance Package", "category": "Motorcycle Dealer"}');
