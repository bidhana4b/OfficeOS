-- ============================================
-- DASHBOARD CUSTOMIZATION SYSTEM
-- ============================================
-- Migration: 20240206_dashboard_customization.sql
-- Purpose: User-specific dashboard layout preferences and widget visibility

-- Dashboard Layout Preferences Table
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Widget Configuration (JSON)
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example structure:
  -- [
  --   { "id": "hero-metrics", "visible": true, "order": 0, "gridArea": "1 / 1 / 2 / 3" },
  --   { "id": "activity-feed", "visible": true, "order": 1, "gridArea": "1 / 3 / 3 / 4" },
  --   { "id": "quick-actions", "visible": true, "order": 2, "gridArea": "2 / 1 / 3 / 2" }
  -- ]
  
  -- Layout Type (grid, list, custom)
  layout_type TEXT NOT NULL DEFAULT 'grid',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one layout per user
  UNIQUE(user_profile_id, tenant_id)
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Email Notifications
  email_enabled BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'instant', -- instant, hourly, daily, weekly
  
  -- Push Notifications
  push_enabled BOOLEAN DEFAULT true,
  
  -- Category Preferences (JSONB)
  categories JSONB NOT NULL DEFAULT '{
    "client": true,
    "team": true,
    "financial": true,
    "deliverable": true,
    "system": true,
    "assignment": true,
    "message": true
  }'::jsonb,
  
  -- Do Not Disturb
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start_time TIME,
  dnd_end_time TIME,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one preference per user
  UNIQUE(user_profile_id, tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON dashboard_layouts(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_tenant ON dashboard_layouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant ON notification_preferences(tenant_id);

-- Update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_dashboard_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboard_layouts_updated_at
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_layouts_updated_at();

CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Insert default layout for existing demo users
INSERT INTO dashboard_layouts (user_profile_id, tenant_id, widgets, layout_type)
SELECT 
  up.id, 
  du.tenant_id,
  '[
    {"id": "hero-metrics", "visible": true, "order": 0, "size": "large"},
    {"id": "activity-feed", "visible": true, "order": 1, "size": "medium"},
    {"id": "quick-actions", "visible": true, "order": 2, "size": "small"},
    {"id": "ai-insights", "visible": true, "order": 3, "size": "medium"},
    {"id": "projects-kanban", "visible": true, "order": 4, "size": "large"},
    {"id": "financial-pulse", "visible": true, "order": 5, "size": "medium"}
  ]'::jsonb,
  'grid'
FROM demo_users du
JOIN user_profiles up ON up.email = du.email
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_layouts dl WHERE dl.user_profile_id = up.id
)
ON CONFLICT (user_profile_id, tenant_id) DO NOTHING;

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_profile_id, tenant_id)
SELECT 
  up.id, 
  du.tenant_id
FROM demo_users du
JOIN user_profiles up ON up.email = du.email
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np WHERE np.user_profile_id = up.id
)
ON CONFLICT (user_profile_id, tenant_id) DO NOTHING;

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE dashboard_layouts IS 'Stores user-specific dashboard widget configuration and layout preferences';
COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences and Do Not Disturb settings';
