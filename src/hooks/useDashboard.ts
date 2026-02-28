import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { MetricCard, ActivityItem, ProjectCard, AIInsight, NotificationItem } from '@/components/dashboard/types';

// ============================================
// Shared hook result type
// ============================================
interface HookResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================
// Realtime helper
// ============================================
function useRealtimeSubscription(
  table: string,
  onUpdate: () => void,
  filter?: string
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!supabase) return;

    const config: {
      event: '*';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table,
    };
    if (filter) config.filter = filter;

    const channel = supabase
      .channel(`dashboard-rt-${table}-${filter || 'all'}`)
      .on('postgres_changes', config, () => {
        callbackRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}

// ============================================
// DASHBOARD METRICS (Admin/Owner view — computed from live tables)
// ============================================
export function useDashboardMetrics(): HookResult<MetricCard[]> {
  const [data, setData] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not initialized'); return; }
    setLoading(true);
    setError(null);
    try {
      const [clientsRes, deliverablesRes, teamRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID).eq('status', 'active'),
        supabase.from('deliverables').select('id, status', { count: 'exact' }).eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('invoices').select('id, status, amount').eq('tenant_id', DEMO_TENANT_ID),
      ]);

      const activeClients = clientsRes.count || 0;
      const totalDeliverables = deliverablesRes.count || 0;
      const pendingDeliverables = (deliverablesRes.data || []).filter(d => d.status === 'in_progress' || d.status === 'pending').length;
      const teamCount = teamRes.count || 0;
      const paidInvoices = (invoicesRes.data || []).filter(i => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);

      const metrics: MetricCard[] = [
        {
          id: 'revenue',
          title: 'Revenue (Paid)',
          value: `$${(totalRevenue / 1000).toFixed(1)}K`,
          change: `${paidInvoices.length} invoices`,
          changeType: totalRevenue > 0 ? 'positive' : 'neutral',
          icon: 'dollar-sign',
          color: 'cyan',
        },
        {
          id: 'clients',
          title: 'Active Clients',
          value: String(activeClients),
          change: '',
          changeType: activeClients > 0 ? 'positive' : 'neutral',
          icon: 'users',
          color: 'purple',
        },
        {
          id: 'deliverables',
          title: 'Pending Deliverables',
          value: String(pendingDeliverables),
          change: `${totalDeliverables} total`,
          changeType: pendingDeliverables > 0 ? 'negative' : 'neutral',
          icon: 'package',
          color: 'magenta',
        },
        {
          id: 'team',
          title: 'Team Members',
          value: String(teamCount),
          change: '',
          changeType: 'neutral',
          icon: 'users',
          color: 'lime',
        },
      ];

      setData(metrics);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading metrics';
      setError(msg);
      console.error('useDashboardMetrics error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('deliverables', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);
  useRealtimeSubscription('invoices', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// ACTIVITY FEED (with realtime on activities table)
// ============================================
export function useDashboardActivity(): HookResult<ActivityItem[]> {
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not initialized'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase
        .from('activities')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(15);

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
          type: typeMap[r.type as string] || 'message',
          title: (r.title as string) || (r.action as string) || 'Activity',
          description: (r.description as string) || '',
          timestamp: timeAgo,
          client: clientData?.business_name as string | undefined,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading activities';
      setError(msg);
      console.error('useDashboardActivity error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('activities', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// PROJECTS (from deliverables, no mock fallback)
// ============================================
export function useDashboardProjects(): HookResult<ProjectCard[]> {
  const [data, setData] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not initialized'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase
        .from('deliverables')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(30);

      if (err) throw err;

      const statusMap: Record<string, ProjectCard['status']> = {
        pending: 'briefing',
        in_progress: 'in-progress',
        review: 'review',
        revision: 'review',
        completed: 'delivered',
        delivered: 'delivered',
      };

      const mapped: ProjectCard[] = (result || []).map((r: Record<string, unknown>) => {
        const clientData = r.clients as Record<string, unknown> | null;
        const dueDate = r.due_date ? new Date(r.due_date as string) : null;
        const now = new Date();
        const daysLeft = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        const status = statusMap[r.status as string] || 'briefing';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return {
          id: r.id as string,
          title: (r.title as string) || 'Untitled',
          client: (clientData?.business_name as string) || 'Unknown',
          status,
          deadline: dueDate ? `${monthNames[dueDate.getMonth()]} ${dueDate.getDate()}` : 'No deadline',
          daysLeft,
          team: [],
          progress: status === 'delivered' ? 100 : status === 'review' ? 80 : status === 'in-progress' ? 45 : 10,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading projects';
      setError(msg);
      console.error('useDashboardProjects error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('deliverables', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// AI INSIGHTS (from DB only, no mock fallback)
// ============================================
export function useDashboardAIInsights(): HookResult<AIInsight[]> {
  const [data, setData] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not initialized'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (err) {
        if (err.code === '42P01') { setData([]); return; }
        throw err;
      }

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
      const msg = e instanceof Error ? e.message : 'Error loading AI insights';
      setError(msg);
      console.error('useDashboardAIInsights error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// NOTIFICATIONS (with realtime)
// ============================================
export function useDashboardNotifications(): HookResult<NotificationItem[]> {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not initialized'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(20);

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
      const msg = e instanceof Error ? e.message : 'Error loading notifications';
      setError(msg);
      console.error('useDashboardNotifications error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('notifications', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// REVENUE CHART (from DB only, no mock fallback)
// ============================================
export function useRevenueChartData(): HookResult<{ day: string; revenue: number; expenses: number }[]> {
  const [data, setData] = useState<{ day: string; revenue: number; expenses: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not initialized'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase
        .from('revenue_chart_data')
        .select('day, revenue, expenses')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('recorded_at', { ascending: true });

      if (err) {
        if (err.code === '42P01') { setData([]); return; }
        throw err;
      }

      setData((result || []).map((r: Record<string, unknown>) => ({
        day: r.day as string,
        revenue: Number(r.revenue) || 0,
        expenses: Number(r.expenses) || 0,
      })));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading chart';
      setError(msg);
      console.error('useRevenueChartData error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// ROLE-SPECIFIC: Designer — Assigned deliverables ONLY
// ============================================
export function useDesignerDashboard() {
  const { user } = useAuth();
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('email', user.email)
        .maybeSingle();

      if (!teamMember) {
        setDeliverables([]);
        setLoading(false);
        return;
      }

      const { data: delData, error: delErr } = await supabase
        .from('deliverables')
        .select('*, clients(business_name)')
        .eq('assigned_to', teamMember.id)
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(30);

      if (delErr) throw delErr;

      setDeliverables((delData || []).map((d: any) => ({
        ...d,
        client_name: d.clients?.business_name || 'Unknown',
      })));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading designer data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('deliverables', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { deliverables, loading, error, refetch: fetchData };
}

// ============================================
// ROLE-SPECIFIC: Media Buyer — Campaigns + Wallets
// ============================================
export function useMediaBuyerDashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('email', user.email)
        .maybeSingle();

      let campQuery = supabase
        .from('campaigns')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(30);

      if (teamMember) {
        campQuery = campQuery.eq('managed_by', teamMember.id);
      }

      const { data: campData, error: campErr } = await campQuery;

      if (campErr) {
        if (campErr.message?.includes('managed_by')) {
          const { data: allCamp } = await supabase
            .from('campaigns')
            .select('*, clients(business_name)')
            .eq('tenant_id', DEMO_TENANT_ID)
            .order('created_at', { ascending: false })
            .limit(30);
          setCampaigns((allCamp || []).map((c: any) => ({ ...c, client_name: c.clients?.business_name || 'Unknown' })));
        } else {
          throw campErr;
        }
      } else {
        setCampaigns((campData || []).map((c: any) => ({ ...c, client_name: c.clients?.business_name || 'Unknown' })));
      }

      const { data: walletData } = await supabase
        .from('client_wallets')
        .select('id, balance, clients(business_name)');

      setWallets((walletData || []).map((w: any) => ({
        id: w.id,
        balance: Number(w.balance || 0),
        client_name: w.clients?.business_name || 'Unknown',
      })));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading media buyer data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('campaigns', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { campaigns, wallets, loading, error, refetch: fetchData };
}

// ============================================
// ROLE-SPECIFIC: Account Manager — Assigned clients ONLY
// ============================================
export function useAccountManagerDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoiceAlerts, setInvoiceAlerts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('email', user.email)
        .maybeSingle();

      let assignedClientIds: string[] = [];
      if (teamMember) {
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select('client_id')
          .eq('team_member_id', teamMember.id);
        assignedClientIds = (assignments || []).map(a => a.client_id);
      }

      if (assignedClientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, business_name, health_score, status, category, contact_email, client_packages(package:packages(name), is_active)')
          .eq('tenant_id', DEMO_TENANT_ID)
          .in('id', assignedClientIds)
          .order('health_score', { ascending: true });

        setClients((clientsData || []).map((c: any) => {
          const activePkg = c.client_packages?.find((cp: any) => cp.is_active);
          return { ...c, package_name: activePkg?.package?.name || 'No Package' };
        }));

        const { data: delData } = await supabase
          .from('deliverables')
          .select('*, clients(business_name)')
          .eq('tenant_id', DEMO_TENANT_ID)
          .in('client_id', assignedClientIds)
          .in('status', ['pending', 'in_progress', 'review', 'revision'])
          .order('created_at', { ascending: false })
          .limit(20);

        setTasks((delData || []).map((d: any) => ({
          id: d.id, title: d.title, type: d.type, status: d.status,
          priority: d.priority || 'normal', client_name: d.clients?.business_name || 'Unknown', due_date: d.due_date,
        })));

        const { data: invData } = await supabase
          .from('invoices')
          .select('*, clients(business_name)')
          .eq('tenant_id', DEMO_TENANT_ID)
          .in('client_id', assignedClientIds)
          .in('status', ['sent', 'overdue'])
          .order('due_date', { ascending: true })
          .limit(10);

        setInvoiceAlerts((invData || []).map((inv: any) => ({
          id: inv.id, invoice_number: inv.invoice_number, amount: inv.amount,
          status: inv.status, client_name: inv.clients?.business_name || 'Unknown', due_date: inv.due_date,
        })));
      } else {
        setClients([]);
        setTasks([]);
        setInvoiceAlerts([]);
      }

      const { data: actData } = await supabase
        .from('activities')
        .select('id, action, entity_type, entity_name, created_at, user_name')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(10);

      if (actData) setActivities(actData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading account manager data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('deliverables', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);
  useRealtimeSubscription('activities', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);

  return { clients, tasks, invoiceAlerts, activities, loading, error, refetch: fetchData };
}

// ============================================
// ROLE-SPECIFIC: Finance — Wallet + Invoices
// ============================================
export function useFinanceDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [walletOverview, setWalletOverview] = useState({ total_balance: 0, total_credits: 0, total_debits: 0, wallet_count: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [campaignSpends, setCampaignSpends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .select('id, status, amount, due_date, invoice_number, created_at, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (invErr) throw invErr;
      setInvoices((invData || []).map((i: any) => ({ ...i, client_name: i.clients?.business_name || 'Unknown' })));

      const { data: wallets } = await supabase.from('client_wallets').select('balance');
      const { data: allTxns } = await supabase.from('wallet_transactions').select('type, amount');

      const totalCredits = (allTxns || []).filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const totalDebits = (allTxns || []).filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      setWalletOverview({
        total_balance: (wallets || []).reduce((s: number, w: any) => s + Number(w.balance || 0), 0),
        total_credits: totalCredits,
        total_debits: totalDebits,
        wallet_count: (wallets || []).length,
      });

      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*, client_wallets(clients(business_name))')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTransactions((txns || []).map((t: any) => ({
        id: t.id, type: t.type, amount: t.amount, description: t.description || '',
        created_at: t.created_at, client_name: t.client_wallets?.clients?.business_name || 'Unknown',
      })));

      const { data: campData } = await supabase
        .from('campaigns')
        .select('platform, budget, spent')
        .eq('tenant_id', DEMO_TENANT_ID);

      if (campData) {
        const platformMap: Record<string, { platform: string; total_budget: number; total_spent: number; count: number }> = {};
        campData.forEach((c: any) => {
          const p = c.platform || 'other';
          if (!platformMap[p]) platformMap[p] = { platform: p, total_budget: 0, total_spent: 0, count: 0 };
          platformMap[p].total_budget += Number(c.budget || 0);
          platformMap[p].total_spent += Number(c.spent || 0);
          platformMap[p].count++;
        });
        setCampaignSpends(Object.values(platformMap).sort((a, b) => b.total_spent - a.total_spent));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading finance data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription('invoices', fetchData, `tenant_id=eq.${DEMO_TENANT_ID}`);
  useRealtimeSubscription('wallet_transactions', fetchData);

  return { invoices, walletOverview, recentTransactions, campaignSpends, loading, error, refetch: fetchData };
}
