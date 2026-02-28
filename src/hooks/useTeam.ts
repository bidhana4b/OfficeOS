import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { TeamInfo, TeamMember, TeamDashboardSummary } from '@/components/team/types';
import {
  calculateWorkload,
  getSkillsForMember,
  addSkillToMember,
  updateSkillLevel,
  removeSkillFromMember,
  type WorkloadData,
  type SkillRecord,
} from '@/lib/data-service';

export function useTeams() {
  const [data, setData] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('teams')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID);

      if (err) throw err;

      const mapped: TeamInfo[] = (result || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        category: r.category as TeamInfo['category'],
        description: (r.description as string) || '',
        color: (r.color as TeamInfo['color']) || 'cyan',
        totalMembers: (r.total_members as number) || 0,
        activeTasks: (r.active_tasks as number) || 0,
        overloadedMembers: (r.overloaded_members as number) || 0,
        efficiencyScore: (r.efficiency_score as number) || 0,
        icon: (r.icon as string) || 'users',
      }));
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

export function useTeamMembers(teamCategory?: string) {
  const [data, setData] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('team_members')
        .select(`
          *,
          user_skills(skill_name),
          team_member_teams(team:teams(category))
        `)
        .eq('tenant_id', DEMO_TENANT_ID);

      if (err) throw err;

      let mapped: TeamMember[] = (result || []).map((r: Record<string, unknown>) => {
        const skills = (r.user_skills as Record<string, unknown>[]) || [];
        const teamLinks = (r.team_member_teams as Record<string, unknown>[]) || [];
        const belongsToTeams = teamLinks
          .map((tl) => {
            const team = tl.team as Record<string, unknown> | null;
            return team?.category as string;
          })
          .filter(Boolean);

        return {
          id: r.id as string,
          name: r.name as string,
          avatar: (r.avatar as string) || '',
          primaryRole: (r.primary_role as string) || '',
          secondaryRoles: (r.secondary_roles as string[]) || [],
          skillTags: skills.map((s) => s.skill_name as string) as TeamMember['skillTags'],
          workCapacityHours: Number(r.work_capacity_hours) || 8,
          currentLoad: (r.current_load as number) || 0,
          status: (r.status as TeamMember['status']) || 'offline',
          belongsToTeams: belongsToTeams as TeamMember['belongsToTeams'],
          assignedClients: (r.assigned_clients as string[]) || [],
          assignedPackages: (r.assigned_packages as string[]) || [],
          activeDeliverables: (r.active_deliverables as number) || 0,
          boostCampaigns: (r.boost_campaigns as number) || 0,
          tasksCompletedThisMonth: (r.tasks_completed_this_month as number) || 0,
          avgDeliveryTime: (r.avg_delivery_time as string) || '0 days',
          revisionCount: (r.revision_count as number) || 0,
          clientRating: Number(r.client_rating) || 0,
          joinDate: (r.join_date as string) || '',
          email: (r.email as string) || '',
        };
      });

      if (teamCategory) {
        mapped = mapped.filter((m) => m.belongsToTeams.includes(teamCategory as TeamMember['belongsToTeams'][number]));
      }

      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading team members');
    } finally {
      setLoading(false);
    }
  }, [teamCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

export function useTeamDashboardSummary(): {
  data: TeamDashboardSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<TeamDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const [clientsRes, deliverablesRes, campaignsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID).eq('status', 'active'),
        supabase.from('deliverables').select('id, status', { count: 'exact' }).eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID).eq('status', 'live'),
      ]);

      // Count overloaded team members (current_load >= 85)
      const { count: overloadedCount } = await supabase
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', DEMO_TENANT_ID)
        .gte('current_load', 85);

      const deliverables = deliverablesRes.data || [];
      const pending = deliverables.filter((d: Record<string, unknown>) => d.status === 'review').length;
      const overdue = deliverables.filter((d: Record<string, unknown>) => d.status === 'pending').length;

      setData({
        totalActiveClients: clientsRes.count || 0,
        totalActiveDeliverables: deliverables.length,
        pendingApprovals: pending,
        runningCampaigns: campaignsRes.count || 0,
        overdueTasks: overdue,
        lowPackageClients: overloadedCount || 0, // Reusing as overloaded members count
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}

// Real workload calculator hook
export function useWorkload(teamMemberId: string | null) {
  const [data, setData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = useCallback(async () => {
    if (!teamMemberId || !supabase) { return; }
    setLoading(true);
    setError(null);
    try {
      const result = await calculateWorkload(teamMemberId);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error calculating workload');
    } finally {
      setLoading(false);
    }
  }, [teamMemberId]);

  useEffect(() => { fetchWorkload(); }, [fetchWorkload]);

  return { data, loading, error, refetch: fetchWorkload };
}

// Skill management hook
export function useSkillManagement(teamMemberId: string | null) {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!teamMemberId) { return; }
    setLoading(true);
    setError(null);
    try {
      const result = await getSkillsForMember(teamMemberId);
      setSkills(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading skills');
    } finally {
      setLoading(false);
    }
  }, [teamMemberId]);

  const addSkill = useCallback(async (skillName: string, skillLevel: number = 3) => {
    if (!teamMemberId) return;
    try {
      const newSkill = await addSkillToMember(teamMemberId, skillName, skillLevel);
      setSkills((prev) => [...prev, newSkill]);
      return newSkill;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error adding skill');
      throw e;
    }
  }, [teamMemberId]);

  const updateLevel = useCallback(async (skillId: string, level: number) => {
    try {
      const updated = await updateSkillLevel(skillId, level);
      setSkills((prev) => prev.map((s) => (s.id === skillId ? updated : s)));
      return updated;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error updating skill');
      throw e;
    }
  }, []);

  const removeSkill = useCallback(async (skillId: string) => {
    try {
      await removeSkillFromMember(skillId);
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error removing skill');
      throw e;
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  return { skills, loading, error, addSkill, updateLevel, removeSkill, refetch: fetchSkills };
}
