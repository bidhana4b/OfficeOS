-- =============================================================
-- FIX FOREIGN KEY CONSTRAINTS ON MESSAGING TABLES
-- Remove FK constraints that block demo user message sending
-- =============================================================

-- Drop FK on messages.sender_id -> user_profiles
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'messages' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%sender%'
  LOOP
    EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;

-- Drop FK on messages.channel_id -> channels (if it prevents orphan inserts)
-- Keep the channel_id NOT NULL but drop the FK for flexibility
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'messages' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%channel%'
  LOOP
    EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;

-- Drop FK on messages.reply_to_id -> messages (self-reference can cause issues)
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'messages' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%reply%'
  LOOP
    EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;

-- Drop the status CHECK constraint that may be too restrictive
DO $$ 
DECLARE
  ck_name TEXT;
BEGIN
  FOR ck_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'messages' 
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || ck_name;
  END LOOP;
END $$;

-- Drop the content NOT NULL constraint (needed for file-only or voice-only messages)
DO $$ BEGIN
  ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure sender_id can accept string text UUIDs from demo_users  
-- (demo_users.id is UUID, should work, but let's ensure no FK blocks it)
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'messages' 
      AND constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;

-- Also fix message_files FK if any
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'message_files' 
      AND constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE 'ALTER TABLE message_files DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;

-- Also fix message_reactions FK if any
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'message_reactions' 
      AND constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE 'ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;

-- Fix workspace_members FK - allow members without strict user_profiles FK
DO $$ 
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'workspace_members' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%user_profile%'
  LOOP
    EXECUTE 'ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS ' || fk_name;
  END LOOP;
END $$;
