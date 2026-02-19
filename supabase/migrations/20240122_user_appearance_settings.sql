CREATE TABLE IF NOT EXISTS user_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  theme_mode TEXT NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('dark', 'light', 'system')),
  active_preset TEXT NOT NULL DEFAULT 'cyber-midnight',
  primary_color TEXT DEFAULT '#00D9FF',
  secondary_color TEXT DEFAULT '#7B61FF',
  accent_color TEXT DEFAULT '#FF006E',
  background_color TEXT DEFAULT '#0A0E27',
  sidebar_collapsed BOOLEAN DEFAULT false,
  font_size TEXT DEFAULT 'normal' CHECK (font_size IN ('small', 'normal', 'large')),
  dashboard_layout TEXT DEFAULT 'extended' CHECK (dashboard_layout IN ('compact', 'extended', 'client-simplified')),
  custom_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE user_appearance_settings REPLICA IDENTITY FULL;
