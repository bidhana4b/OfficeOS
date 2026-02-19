import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { MetricCard, ActivityItem, ProjectCard, AIInsight, NotificationItem } from '@/components/dashboard/types';

export function useDashboardMetrics() {
  const [data, setData] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('dashboard_metrics')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID);

      if (err) throw err;

      const mapped: MetricCard[] = (result || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        value: r.value as string,
        change: (r.change as string) || '',
        changeType: (r.change_type as MetricCard['changeType']) || 'neutral',
        icon: (r.icon as string) || 'activity',
        color: (r.color as MetricCard['color']) || 'cyan',
      }));
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDashboardActivity() {
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('activities')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (err) throw err;

      const typeMap: Record<string, ActivityItem['type']> = {
        deliverable_created: 'task',
        boost_launched: 'campaign',
        payment_received: 'payment',
        approval_given: 'task',
        revision_requested: 'alert',
        invoice_generated: 'payment',
        client_onboarded: 'message',
        package_renewed: 'message',
      };

      const mapped: ActivityItem[] = (result || []).map((r: Record<string, unknown>) => {
        const clientData = r.clients as Record<string, unknown> | null;
        const ts = new Date(r.timestamp as string);
        const now = new Date();
        const diffMs = now.getTime() - ts.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeAgo = `${diffMins}m ago`;
        if (diffMins >= 60) {
          const hrs = Math.floor(diffMins / 60);
          timeAgo = hrs >= 24 ? `${Math.floor(hrs / 24)}d ago` : `${hrs}h ago`;
        }

        return {
          id: r.id as string,
          type: typeMap[r.type as string] || 'message',
          title: r.title as string,
          description: (r.description as string) || '',
          timestamp: timeAgo,
          client: clientData?.business_name as string | undefined,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDashboardProjects() {
  const [data, setData] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('projects')
        .select('*, project_team(*)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped: ProjectCard[] = (result || []).map((r: Record<string, unknown>) => {
        const team = (r.project_team as Record<string, unknown>[]) || [];
        const deadline = r.deadline ? new Date(r.deadline as string) : new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return {
          id: r.id as string,
          title: r.title as string,
          client: (r.client_name as string) || 'Unknown',
          clientLogo: r.client_logo as string | undefined,
          status: (r.status as ProjectCard['status']) || 'briefing',
          deadline: `${monthNames[deadline.getMonth()]} ${deadline.getDate()}`,
          daysLeft: (r.days_left as number) || 0,
          team: team.map((t) => ({
            name: (t.name as string) || '',
            avatar: (t.avatar as string) || (t.name as string || '').split(' ').map((n: string) => n[0]).join(''),
          })),
          progress: (r.progress as number) || 0,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDashboardAIInsights() {
  const [data, setData] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped: AIInsight[] = (result || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        type: (r.type as AIInsight['type']) || 'prediction',
        title: r.title as string,
        description: (r.description as string) || '',
        confidence: (r.confidence as number) || 50,
        action: (r.action as string) || '',
      }));
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading AI insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDashboardNotifications() {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped: NotificationItem[] = (result || []).map((r: Record<string, unknown>) => {
        const ts = new Date(r.created_at as string);
        const now = new Date();
        const diffMs = now.getTime() - ts.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeAgo = `${diffMins}m ago`;
        if (diffMins >= 60) {
          const hrs = Math.floor(diffMins / 60);
          timeAgo = hrs >= 24 ? `${Math.floor(hrs / 24)}d ago` : `${hrs}h ago`;
        }

        return {
          id: r.id as string,
          category: (r.category as NotificationItem['category']) || 'client',
          title: r.title as string,
          description: (r.description as string) || '',
          timestamp: timeAgo,
          read: (r.read as boolean) || false,
          actionType: (r.action_type as string) || null,
          relatedClientId: (r.related_client_id as string) || null,
          metadata: (r.metadata as Record<string, unknown>) || null,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useRevenueChartData() {
  const [data, setData] = useState<{ day: string; revenue: number; expenses: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('revenue_chart_data')
        .select('day, revenue, expenses')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('recorded_at', { ascending: true });

      if (err) throw err;

      setData((result || []).map((r: Record<string, unknown>) => ({
        day: r.day as string,
        revenue: Number(r.revenue) || 0,
        expenses: Number(r.expenses) || 0,
      })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading chart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
