-- ====================================
-- PHASE 1 ENHANCEMENTS
-- 1. Enable realtime on message_reactions
-- 2. Add unique constraint for message_reactions (message_id + emoji)
-- 3. Increment team member count helper
-- ====================================

ALTER TABLE message_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique
  ON message_reactions(message_id, emoji);

CREATE OR REPLACE FUNCTION increment_team_member_count(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE teams
  SET total_members = (
    SELECT COUNT(*) FROM team_member_teams WHERE team_id = p_team_id
  )
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
