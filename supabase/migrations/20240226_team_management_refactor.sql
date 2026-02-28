-- Team Management Refactor: ensure user_skills has skill_level column
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS skill_level INT DEFAULT 3 CHECK (skill_level BETWEEN 1 AND 5);

-- Add index for workload queries
CREATE INDEX IF NOT EXISTS idx_deliverables_assigned_to ON deliverables(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_tenant_status ON deliverables(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_current_load ON team_members(current_load);

-- Ensure workspace_members has unique constraint for upserts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_id_user_profile_id_key'
  ) THEN
    BEGIN
      ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_user_profile_id_key UNIQUE (workspace_id, user_profile_id);
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;
