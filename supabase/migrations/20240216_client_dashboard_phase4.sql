-- Client Dashboard Phase 4: Personalization, Language, Auto-Payment, 2FA

-- 1. Client Language & Personalization Preferences
CREATE TABLE IF NOT EXISTS client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'bn')),
  theme_mode TEXT NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('dark', 'light', 'system')),
  theme_preset TEXT DEFAULT 'cyber-midnight',
  dashboard_widgets JSONB DEFAULT '[]',
  timezone TEXT DEFAULT 'Asia/Dhaka',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  currency_display TEXT DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_preferences_client ON client_preferences(client_id);

-- 2. Auto-Payment Configuration
CREATE TABLE IF NOT EXISTS client_auto_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  enabled BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT DEFAULT 'wallet' CHECK (payment_method IN ('wallet', 'bkash', 'nagad', 'bank_transfer', 'card')),
  payment_details JSONB DEFAULT '{}',
  auto_pay_invoices BOOLEAN DEFAULT true,
  auto_renew_package BOOLEAN DEFAULT true,
  min_wallet_balance NUMERIC(12,2) DEFAULT 0,
  auto_topup_enabled BOOLEAN DEFAULT false,
  auto_topup_amount NUMERIC(12,2) DEFAULT 0,
  auto_topup_threshold NUMERIC(12,2) DEFAULT 0,
  last_auto_payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_auto_payments_client ON client_auto_payments(client_id);

-- 3. 2FA Setup table
CREATE TABLE IF NOT EXISTS client_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  enabled BOOLEAN NOT NULL DEFAULT false,
  method TEXT DEFAULT 'email' CHECK (method IN ('email', 'sms', 'authenticator')),
  phone_number TEXT,
  email TEXT,
  backup_codes TEXT[] DEFAULT '{}',
  last_verified_at TIMESTAMPTZ,
  setup_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_2fa_client ON client_2fa_settings(client_id);

-- 4. Export Audit Log (track downloads)
CREATE TABLE IF NOT EXISTS client_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  export_type TEXT NOT NULL CHECK (export_type IN ('analytics_csv', 'payment_history_csv', 'invoice_pdf', 'deliverables_csv', 'brand_kit_zip')),
  file_name TEXT,
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_export_logs_client ON client_export_logs(client_id);

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'client_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_preferences;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'client_auto_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_auto_payments;
  END IF;
END
$$;
