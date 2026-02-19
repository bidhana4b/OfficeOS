-- =====================================================
-- AI INTEGRATION: Ensure system_settings table can store AI config
-- Also add ai_usage_log table for tracking usage
-- =====================================================

-- AI usage log table for tracking token usage
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID,
  feature TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  request_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_usage_log REPLICA IDENTITY FULL;

-- Enable realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_usage_log;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- RLS policy (permissive for demo)
ALTER TABLE IF EXISTS ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_usage_log_all_access" ON ai_usage_log;
CREATE POLICY "ai_usage_log_all_access" ON ai_usage_log FOR ALL USING (true) WITH CHECK (true);
