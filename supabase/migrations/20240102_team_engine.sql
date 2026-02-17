CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'cyan',
  icon TEXT,
  total_members INT DEFAULT 0,
  active_tasks INT DEFAULT 0,
  overloaded_members INT DEFAULT 0,
  efficiency_score INT DEFAULT 0,
  lead_name TEXT,
  max_workload_percent INT DEFAULT 85,
  cross_team_allowed BOOLEAN DEFAULT true,
  overload_warning_percent INT DEFAULT 80,
  auto_redistribute BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  primary_role TEXT NOT NULL,
  secondary_roles TEXT[] DEFAULT '{}',
  work_capacity_hours NUMERIC DEFAULT 8,
  current_load INT DEFAULT 0,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline', 'busy')),
  assigned_clients TEXT[] DEFAULT '{}',
  assigned_packages TEXT[] DEFAULT '{}',
  active_deliverables INT DEFAULT 0,
  boost_campaigns INT DEFAULT 0,
  tasks_completed_this_month INT DEFAULT 0,
  avg_delivery_time TEXT DEFAULT '0 days',
  revision_count INT DEFAULT 0,
  client_rating NUMERIC DEFAULT 0,
  join_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_member_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE(team_member_id, team_id)
);

CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_level INT DEFAULT 1 CHECK (skill_level BETWEEN 1 AND 5)
);
