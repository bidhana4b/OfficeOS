-- =====================================================
-- REALTIME VERIFICATION & COMPLETION MIGRATION
-- Date: 2024-03-01
-- Priority: 1 (Critical - Required for Messaging & Notifications)
-- =====================================================

-- Ensure key tables have realtime enabled
-- This migration ensures messages, notifications, and deliverables 
-- are properly configured for Supabase Realtime subscriptions

-- =====================================================
-- 1. VERIFY REPLICA IDENTITY (Required for Realtime)
-- =====================================================

DO $$
BEGIN
  -- Messages table
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'messages' 
    AND relreplident = 'f'
  ) THEN
    ALTER TABLE messages REPLICA IDENTITY FULL;
    RAISE NOTICE 'Set messages REPLICA IDENTITY FULL';
  END IF;

  -- Notifications table
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'notifications' 
    AND relreplident = 'f'
  ) THEN
    ALTER TABLE notifications REPLICA IDENTITY FULL;
    RAISE NOTICE 'Set notifications REPLICA IDENTITY FULL';
  END IF;

  -- Deliverables table
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'deliverables' 
    AND relreplident = 'f'
  ) THEN
    ALTER TABLE deliverables REPLICA IDENTITY FULL;
    RAISE NOTICE 'Set deliverables REPLICA IDENTITY FULL';
  END IF;

  -- Channel members (for messaging presence)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'channel_members' 
    AND relreplident = 'f'
  ) THEN
    ALTER TABLE channel_members REPLICA IDENTITY FULL;
    RAISE NOTICE 'Set channel_members REPLICA IDENTITY FULL';
  END IF;

  -- Workspace members (for messaging presence)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'workspace_members' 
    AND relreplident = 'f'
  ) THEN
    ALTER TABLE workspace_members REPLICA IDENTITY FULL;
    RAISE NOTICE 'Set workspace_members REPLICA IDENTITY FULL';
  END IF;
END $$;

-- =====================================================
-- 2. ADD TABLES TO REALTIME PUBLICATION
-- =====================================================

DO $$
BEGIN
  -- Add messages to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    RAISE NOTICE 'Added messages to supabase_realtime publication';
  END IF;

  -- Add notifications to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    RAISE NOTICE 'Added notifications to supabase_realtime publication';
  END IF;

  -- Add deliverables to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliverables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
    RAISE NOTICE 'Added deliverables to supabase_realtime publication';
  END IF;

  -- Add channel_members to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'channel_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
    RAISE NOTICE 'Added channel_members to supabase_realtime publication';
  END IF;

  -- Add workspace_members to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workspace_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
    RAISE NOTICE 'Added workspace_members to supabase_realtime publication';
  END IF;

  -- Add message_reactions (for live reactions)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    BEGIN
      ALTER TABLE message_reactions REPLICA IDENTITY FULL;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
    RAISE NOTICE 'Added message_reactions to supabase_realtime publication';
  END IF;

  -- Add message_read_receipts (for typing indicators)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_read_receipts'
  ) THEN
    BEGIN
      ALTER TABLE message_read_receipts REPLICA IDENTITY FULL;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
    RAISE NOTICE 'Added message_read_receipts to supabase_realtime publication';
  END IF;
END $$;

-- =====================================================
-- 3. CREATE REALTIME HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_realtime_status()
RETURNS TABLE(
  table_name TEXT,
  has_replica_identity BOOLEAN,
  in_publication BOOLEAN,
  status TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH tables_to_check AS (
    SELECT unnest(ARRAY[
      'messages',
      'notifications',
      'deliverables',
      'channel_members',
      'workspace_members',
      'message_reactions',
      'message_read_receipts'
    ]) AS tbl
  ),
  replica_check AS (
    SELECT 
      t.tbl,
      COALESCE(c.relreplident = 'f', false) AS has_replica
    FROM tables_to_check t
    LEFT JOIN pg_class c ON c.relname = t.tbl
  ),
  publication_check AS (
    SELECT 
      t.tbl,
      EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = t.tbl
      ) AS in_pub
    FROM tables_to_check t
  )
  SELECT 
    rc.tbl AS table_name,
    rc.has_replica AS has_replica_identity,
    pc.in_pub AS in_publication,
    CASE 
      WHEN rc.has_replica AND pc.in_pub THEN 'READY ✓'
      WHEN rc.has_replica AND NOT pc.in_pub THEN 'MISSING FROM PUBLICATION ⚠'
      WHEN NOT rc.has_replica AND pc.in_pub THEN 'MISSING REPLICA IDENTITY ⚠'
      ELSE 'NOT CONFIGURED ✕'
    END AS status
  FROM replica_check rc
  JOIN publication_check pc ON pc.tbl = rc.tbl
  ORDER BY 
    CASE 
      WHEN rc.has_replica AND pc.in_pub THEN 1
      ELSE 2
    END,
    rc.tbl;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_realtime_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_realtime_status() TO anon;

-- =====================================================
-- 4. ADD INDEXES FOR REALTIME PERFORMANCE
-- =====================================================

-- Messages: optimize realtime queries by channel
CREATE INDEX IF NOT EXISTS idx_messages_channel_created 
ON messages(channel_id, created_at DESC);

-- Notifications: optimize realtime queries by user (check column name first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'user_profile_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON notifications(user_profile_id, created_at DESC) 
    WHERE read = false;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON notifications(user_id, created_at DESC) 
    WHERE read = false;
  END IF;
END $$;

-- Deliverables: optimize realtime queries by status
CREATE INDEX IF NOT EXISTS idx_deliverables_status_updated 
ON deliverables(status, updated_at DESC);

-- Channel members: optimize presence queries (check if status column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channel_members' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_channel_members_status 
    ON channel_members(channel_id, status) 
    WHERE status = 'online';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_channel_members_channel 
    ON channel_members(channel_id, joined_at DESC);
  END IF;
END $$;

-- =====================================================
-- 5. SUMMARY LOG
-- =====================================================

DO $$
DECLARE
  realtime_summary RECORD;
  ready_count INT := 0;
  total_count INT := 0;
BEGIN
  -- Count ready tables
  SELECT 
    COUNT(*) FILTER (WHERE status LIKE 'READY%') AS ready,
    COUNT(*) AS total
  INTO ready_count, total_count
  FROM check_realtime_status();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'REALTIME VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ready: % / % tables', ready_count, total_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Status by table:';
  
  FOR realtime_summary IN 
    SELECT * FROM check_realtime_status()
  LOOP
    RAISE NOTICE '  % : %', 
      RPAD(realtime_summary.table_name, 25), 
      realtime_summary.status;
  END LOOP;
  
  RAISE NOTICE '========================================';
  
  IF ready_count = total_count THEN
    RAISE NOTICE '✓ All tables configured for Realtime';
  ELSE
    RAISE WARNING '⚠ Some tables need configuration';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration ensures:
-- 1. ✓ REPLICA IDENTITY FULL on all realtime tables
-- 2. ✓ All tables added to supabase_realtime publication
-- 3. ✓ Health check function for monitoring
-- 4. ✓ Performance indexes for realtime queries
-- 5. ✓ Verification summary logged
--
-- Test with: SELECT * FROM check_realtime_status();
-- =====================================================
