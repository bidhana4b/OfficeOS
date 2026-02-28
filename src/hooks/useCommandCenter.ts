import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface ClientStatusCard {
  id: string;
  businessName: string;
  category: string;
  status: string;
  healthScore: number;
  accountManager: { id: string; name: string; avatar: string } | null;
  packageName: string;
  packageTier: string;
  // Usage stats
  totalUsed: number;
  totalAllocated: number;
  usagePercent: number;
  // Deliverables
  pendingDeliverables: number;
  totalDeliverables: number;
  // Messaging
  unreadMessages: number;
  lastMessageAt: string | null;
  // Wallet
  walletBalance: number;
  walletCurrency: string;
}

export interface TeamMemberWorkload {
  id: string;
  name: string;
  avatar: string;
  primaryRole: string;
  status: string;
  currentLoad: number;
  activeDeliverables: number;
  tasksCompletedThisMonth: number;
  assignedClientsCount: number;
  // Computed
  loadCategory: 'normal' | 'busy' | 'overloaded';
}

export interface WorkspaceQuickAccess {
  workspaceId: string;
  workspaceName: string;
  clientId: string | null;
  channelCount: number;
  unreadCount: number;
  lastActivityAt: string | null;
}

export interface CommandCenterMetrics {
  totalClients: number;
  activeClients: number;
  totalTeamMembers: number;
  onlineMembers: number;
  overloadedMembers: number;
  pendingDeliverables: number;
  deliveredThisMonth: number;
  totalUnreadMessages: number;
  totalRevenue: number;
  lowPackageClients: number; // clients near or over package limit
}

export interface FinancialDataPoint {
  day: string;
  revenue: number;
  expenses: number;
}

export interface CommandCenterData {
  metrics: CommandCenterMetrics;
  clients: ClientStatusCard[];
  team: TeamMemberWorkload[];
  workspaces: WorkspaceQuickAccess[];
  financialData: FinancialDataPoint[];
}

// ============================================
// Hook
// ============================================

export function useCommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!supabase || fetchingRef.current) return;
    fetchingRef.current = true;
    setError(null);

    try {
      // Parallel fetch all data
      const [
        clientsRes,
        teamRes,
        workspacesRes,
        deliverablesRes,
        messagesRes,
        walletRes,
        usageRes,
        invoicesRes,
        walletTxRes,
      ] = await Promise.all([
        // Clients with their packages and account managers
        supabase
          .from('clients')
          .select(`
            id, business_name, category, status, health_score,
            account_manager:team_members!clients_account_manager_id_fkey(id, name, avatar),
            client_packages(
              id, status,
              package:packages(name, tier),
              package_usage(deliverable_type, used, total)
            )
          `)
          .eq('tenant_id', DEMO_TENANT_ID)
          .order('business_name'),

        // Team members
        supabase
          .from('team_members')
          .select('id, name, avatar, primary_role, status, current_load, active_deliverables, tasks_completed_this_month, assigned_clients')
          .eq('tenant_id', DEMO_TENANT_ID)
          .order('current_load', { ascending: false }),

        // Workspaces with channels
        supabase
          .from('workspaces')
          .select('id, name, client_id, channels(id)')
          .eq('tenant_id', DEMO_TENANT_ID),

        // Deliverables counts
        supabase
          .from('deliverable_posts')
          .select('id, status, client_id')
          .eq('tenant_id', DEMO_TENANT_ID),

        // Recent messages per workspace (last 30 days)
        supabase
          .from('messages')
          .select('id, workspace_id, channel_id, created_at, is_read')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),

        // Client wallets
        supabase
          .from('client_wallets')
          .select('client_id, balance, currency'),

        // Package usage aggregated
        supabase
          .from('package_usage')
          .select('client_package_id, deliverable_type, used, total'),

        // Invoices (last 6 months)
        supabase
          .from('invoices')
          .select('id, total_amount, status, created_at, paid_at')
          .eq('tenant_id', DEMO_TENANT_ID)
          .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true }),

        // Wallet transactions (last 6 months)
        supabase
          .from('wallet_transactions')
          .select('id, amount, type, category, created_at')
          .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true }),
      ]);

      // Process clients
      const rawClients = clientsRes.data || [];
      const rawDeliverables = deliverablesRes.data || [];
      const rawWallets = walletRes.data || [];
      const rawMessages = messagesRes.data || [];

      // Build wallet map
      const walletMap: Record<string, { balance: number; currency: string }> = {};
      rawWallets.forEach((w: any) => {
        walletMap[w.client_id] = { balance: Number(w.balance) || 0, currency: w.currency || 'BDT' };
      });

      // Build messages map per workspace
      const messagesByWorkspace: Record<string, { unread: number; lastAt: string | null }> = {};
      rawMessages.forEach((msg: any) => {
        if (!msg.workspace_id) return;
        if (!messagesByWorkspace[msg.workspace_id]) {
          messagesByWorkspace[msg.workspace_id] = { unread: 0, lastAt: null };
        }
        if (!msg.is_read) {
          messagesByWorkspace[msg.workspace_id].unread++;
        }
        if (!messagesByWorkspace[msg.workspace_id].lastAt || msg.created_at > messagesByWorkspace[msg.workspace_id].lastAt) {
          messagesByWorkspace[msg.workspace_id].lastAt = msg.created_at;
        }
      });

      // Build workspace → client mapping
      const rawWorkspaces = workspacesRes.data || [];
      const workspaceToClient: Record<string, string> = {};
      rawWorkspaces.forEach((ws: any) => {
        if (ws.client_id) {
          workspaceToClient[ws.id] = ws.client_id;
        }
      });

      // Build messages per client (via workspace)
      const unreadByClient: Record<string, number> = {};
      const lastMessageByClient: Record<string, string | null> = {};
      Object.entries(messagesByWorkspace).forEach(([wsId, wsData]) => {
        const clientId = workspaceToClient[wsId];
        if (clientId) {
          unreadByClient[clientId] = (unreadByClient[clientId] || 0) + wsData.unread;
          if (!lastMessageByClient[clientId] || (wsData.lastAt && wsData.lastAt > (lastMessageByClient[clientId] || ''))) {
            lastMessageByClient[clientId] = wsData.lastAt;
          }
        }
      });

      // Build deliverables map per client
      const deliverablesByClient: Record<string, { pending: number; total: number }> = {};
      rawDeliverables.forEach((d: any) => {
        if (!d.client_id) return;
        if (!deliverablesByClient[d.client_id]) {
          deliverablesByClient[d.client_id] = { pending: 0, total: 0 };
        }
        deliverablesByClient[d.client_id].total++;
        if (['draft', 'in_progress', 'client_review', 'revision'].includes(d.status)) {
          deliverablesByClient[d.client_id].pending++;
        }
      });

      const clients: ClientStatusCard[] = rawClients.map((c: any) => {
        const mgr = c.account_manager;
        const activePkg = (c.client_packages || []).find((cp: any) => cp.status === 'active');
        const pkg = activePkg?.package;
        const usageRows = activePkg?.package_usage || [];

        let totalUsed = 0;
        let totalAllocated = 0;
        usageRows.forEach((u: any) => {
          totalUsed += Number(u.used) || 0;
          totalAllocated += Number(u.total) || 0;
        });
        const usagePercent = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

        const clientDels = deliverablesByClient[c.id] || { pending: 0, total: 0 };
        const wallet = walletMap[c.id] || { balance: 0, currency: 'BDT' };

        return {
          id: c.id,
          businessName: c.business_name,
          category: c.category || 'Other',
          status: c.status || 'active',
          healthScore: c.health_score || 0,
          accountManager: mgr ? { id: mgr.id, name: mgr.name, avatar: mgr.avatar || '' } : null,
          packageName: pkg?.name || 'No Package',
          packageTier: pkg?.tier || 'Starter',
          totalUsed,
          totalAllocated,
          usagePercent,
          pendingDeliverables: clientDels.pending,
          totalDeliverables: clientDels.total,
          unreadMessages: unreadByClient[c.id] || 0,
          lastMessageAt: lastMessageByClient[c.id] || null,
          walletBalance: wallet.balance,
          walletCurrency: wallet.currency,
        };
      });

      // Process team
      const rawTeam = teamRes.data || [];
      const team: TeamMemberWorkload[] = rawTeam.map((t: any) => ({
        id: t.id,
        name: t.name,
        avatar: t.avatar || '',
        primaryRole: t.primary_role || '',
        status: t.status || 'offline',
        currentLoad: t.current_load || 0,
        activeDeliverables: t.active_deliverables || 0,
        tasksCompletedThisMonth: t.tasks_completed_this_month || 0,
        assignedClientsCount: (t.assigned_clients || []).length,
        loadCategory: (t.current_load || 0) >= 85 ? 'overloaded' : (t.current_load || 0) >= 65 ? 'busy' : 'normal',
      }));

      // Process workspaces (already fetched above)
      const workspaces: WorkspaceQuickAccess[] = rawWorkspaces.map((ws: any) => {
        const wsMessages = messagesByWorkspace[ws.id] || { unread: 0, lastAt: null };
        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          clientId: ws.client_id,
          channelCount: (ws.channels || []).length,
          unreadCount: wsMessages.unread,
          lastActivityAt: wsMessages.lastAt,
        };
      });

      // Calculate metrics
      const metrics: CommandCenterMetrics = {
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === 'active').length,
        totalTeamMembers: team.length,
        onlineMembers: team.filter(t => t.status === 'online').length,
        overloadedMembers: team.filter(t => t.loadCategory === 'overloaded').length,
        pendingDeliverables: rawDeliverables.filter((d: any) => ['draft', 'in_progress', 'client_review', 'revision'].includes(d.status)).length,
        deliveredThisMonth: rawDeliverables.filter((d: any) => d.status === 'delivered' || d.status === 'approved').length,
        totalUnreadMessages: rawMessages.filter((m: any) => !m.is_read).length,
        totalRevenue: clients.reduce((sum, c) => sum + c.walletBalance, 0),
        lowPackageClients: clients.filter(c => c.usagePercent >= 80).length,
      };

      // Process financial data — aggregate by month
      const rawInvoices = invoicesRes.data || [];
      const rawWalletTx = walletTxRes.data || [];

      const monthlyFinancial: Record<string, { revenue: number; expenses: number }> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Process invoices as revenue
      rawInvoices.forEach((inv: any) => {
        const d = new Date(inv.created_at);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthlyFinancial[key]) monthlyFinancial[key] = { revenue: 0, expenses: 0 };
        if (inv.status === 'paid') {
          monthlyFinancial[key].revenue += Number(inv.total_amount) || 0;
        }
      });

      // Process wallet transactions
      rawWalletTx.forEach((tx: any) => {
        const d = new Date(tx.created_at);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthlyFinancial[key]) monthlyFinancial[key] = { revenue: 0, expenses: 0 };
        if (tx.type === 'credit' || tx.type === 'topup') {
          monthlyFinancial[key].revenue += Math.abs(Number(tx.amount) || 0);
        } else if (tx.type === 'debit' || tx.type === 'deduction') {
          monthlyFinancial[key].expenses += Math.abs(Number(tx.amount) || 0);
        }
      });

      // Convert to array sorted by date
      const financialData: FinancialDataPoint[] = Object.entries(monthlyFinancial)
        .map(([day, vals]) => ({ day, revenue: vals.revenue, expenses: vals.expenses }))
        .slice(-6); // Last 6 months

      setData({ metrics, clients, team, workspaces, financialData });
    } catch (e: any) {
      console.error('[useCommandCenter] Error:', e);
      setError(e?.message || 'Failed to load command center data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial fetch + realtime subscriptions
  useEffect(() => {
    fetchData();

    if (!supabase) return;

    const channel = supabase
      .channel('command-center-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverable_posts', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
