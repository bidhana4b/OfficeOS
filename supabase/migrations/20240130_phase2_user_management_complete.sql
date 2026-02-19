-- =====================================================
-- PHASE 2: USER MANAGEMENT COMPLETE
-- Ensures demo_users email uniqueness, proper constraints,
-- and helper functions for user lifecycle.
-- Safe to run multiple times (idempotent).
-- =====================================================

-- 1. Ensure email uniqueness on demo_users (per tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_users_tenant_email_unique'
  ) THEN
    BEGIN
      ALTER TABLE demo_users ADD CONSTRAINT demo_users_tenant_email_unique
        UNIQUE (tenant_id, email);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 2. Ensure email uniqueness on user_profiles (per tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_tenant_email_unique'
  ) THEN
    BEGIN
      ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_tenant_email_unique
        UNIQUE (tenant_id, email);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 3. Add is_active column to demo_users if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 4. Add password_changed_at tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN password_changed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 5. Add last_login_at tracking column to demo_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE demo_users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
END $$;

-- 6. Ensure workspace_members has user_profile_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'user_profile_id'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN user_profile_id UUID;
  END IF;
END $$;

-- 7. Add realtime for demo_users and user_profiles
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE demo_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 8. Backfill user_profile_id on demo_users for existing seeded users
UPDATE demo_users du
SET user_profile_id = up.id
FROM user_profiles up
WHERE du.email = up.email
  AND du.tenant_id = up.tenant_id
  AND du.user_profile_id IS NULL;

-- 9. Backfill team_member_id on demo_users for existing seeded users
UPDATE demo_users du
SET team_member_id = tm.id
FROM team_members tm
WHERE du.email = tm.email
  AND du.tenant_id = tm.tenant_id
  AND du.team_member_id IS NULL
  AND du.role != 'client';
