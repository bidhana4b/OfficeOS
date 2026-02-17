import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  getClientAssignments,
  getAvailableTeamMembers,
  getDefaultAssignmentRules,
  assignTeamToClient,
  removeClientAssignment,
} from '@/lib/data-service';

export interface ClientAssignment {
  id: string;
  client_id: string;
  team_member_id: string;
  role_type: string;
  status: string;
  assigned_at: string;
  notes?: string;
  team_members?: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    primary_role: string;
    current_load: number;
    status: string;
  };
}

export interface AvailableTeamMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  primary_role: string;
  secondary_roles: string[];
  current_load: number;
  status: string;
  work_capacity_hours: number;
  active_deliverables: number;
  tasks_completed_this_month: number;
  client_rating: number;
  user_skills: { skill_name: string; skill_level: number }[];
  team_member_teams: {
    team_id: string;
    teams: { id: string; name: string; category: string; color: string };
  }[];
}

export interface AssignmentRule {
  id: string;
  industry_category: string;
  default_roles: Record<string, number>;
  min_team_size: number;
}

export function useClientAssignments(clientId: string | null) {
  const [data, setData] = useState<ClientAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getClientAssignments(clientId);
      setData(result as ClientAssignment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading assignments');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId || !supabase) return;

    const channel = supabase
      .channel(`assignments-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_assignments',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAvailableTeamMembers() {
  const [data, setData] = useState<AvailableTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAvailableTeamMembers();
      setData(result as AvailableTeamMember[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAssignmentRules(category: string) {
  const [data, setData] = useState<AssignmentRule | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const result = await getDefaultAssignmentRules(category);
      setData(result as AssignmentRule | null);
    } catch {
      // fallback to null
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading };
}

export function useAssignmentActions() {
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);

  const assign = useCallback(
    async (input: {
      client_id: string;
      team_member_id: string;
      role_type: string;
      assigned_by?: string;
      notes?: string;
    }) => {
      setAssigning(true);
      try {
        const result = await assignTeamToClient(input);
        return result;
      } catch (e) {
        throw e;
      } finally {
        setAssigning(false);
      }
    },
    []
  );

  const remove = useCallback(async (assignmentId: string) => {
    setRemoving(true);
    try {
      await removeClientAssignment(assignmentId);
    } catch (e) {
      throw e;
    } finally {
      setRemoving(false);
    }
  }, []);

  return { assign, remove, assigning, removing };
}
