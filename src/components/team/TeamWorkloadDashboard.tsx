/**
 * TeamWorkloadDashboard — Full workload overview for all team members.
 *
 * Features:
 * - Visual heatmap of team capacity
 * - Per-member task breakdown (pending / in-progress / completed)
 * - Color-coded load indicators (🟢 Normal | 🟡 Busy | 🔴 Overloaded)
 * - Click to expand member's assigned deliverables
 * - Real-time updates via Supabase subscriptions
 * - Smart assignment suggestion (least-busy member)
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  BarChart3,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileImage,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Target,
  Calendar,
  Star,
  TrendingUp,
  User2,
  Zap,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

// ============================================
// Types
// ============================================

interface MemberDeliverable {
  id: string;
  title: string;
  clientName: string;
  status: string;
  priority: string;
  dueDate: string | null;
  deliverableType: string;
  createdAt: string;
}

interface TeamMemberDetail {
  id: string;
  name: string;
  avatar: string;
  email: string;
  primaryRole: string;
  status: string;
  // Computed workload
  currentLoad: number;
  loadCategory: 'normal' | 'busy' | 'overloaded';
  // Task counts
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalTasks: number;
  // Assignment info
  assignedClients: number;
  avgResponseTime: string;
  // Deliverables list (loaded on expand)
  deliverables?: MemberDeliverable[];
}

interface WorkloadSummary {
  totalMembers: number;
  normalCount: number;
  busyCount: number;
  overloadedCount: number;
  averageLoad: number;
  totalActiveTasks: number;
  totalCompletedThisMonth: number;
  suggestedAssignee: { id: string; name: string; load: number } | null;
}

// ============================================
// Hook: useTeamWorkload
// ============================================

function useTeamWorkload() {
  const [members, setMembers] = useState<TeamMemberDetail[]>([]);
  const [summary, setSummary] = useState<WorkloadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setError(null);

    try {
      // Parallel fetch: team members + deliverables + client assignments
      const [teamRes, deliverablesRes, assignmentsRes] = await Promise.allSettled([
        supabase
          .from('team_members')
          .select('id, name, avatar, email, primary_role, status, current_load, active_deliverables, tasks_completed_this_month, assigned_clients')
          .eq('tenant_id', DEMO_TENANT_ID)
          .order('name'),

        supabase
          .from('deliverable_posts')
          .select('id, title, status, priority, due_date, assigned_to, client_id, deliverable_type_id, created_at')
          .eq('tenant_id', DEMO_TENANT_ID),

        supabase
          .from('client_assignments')
          .select('team_member_id, client_id, clients(business_name)')
          .eq('tenant_id', DEMO_TENANT_ID),
      ]);

      const rawTeam = teamRes.status === 'fulfilled' ? teamRes.value.data || [] : [];
      const rawDeliverables = deliverablesRes.status === 'fulfilled' ? deliverablesRes.value.data || [] : [];
      const rawAssignments = assignmentsRes.status === 'fulfilled' ? assignmentsRes.value.data || [] : [];

      // Build client name map from assignments
      const clientNameMap: Record<string, string> = {};
      rawAssignments.forEach((a: any) => {
        if (a.client_id && (a.clients as any)?.business_name) {
          clientNameMap[a.client_id] = (a.clients as any).business_name;
        }
      });

      // Build deliverables per team member
      const deliverablesByMember: Record<string, MemberDeliverable[]> = {};
      rawDeliverables.forEach((d: any) => {
        if (!d.assigned_to) return;
        if (!deliverablesByMember[d.assigned_to]) {
          deliverablesByMember[d.assigned_to] = [];
        }
        deliverablesByMember[d.assigned_to].push({
          id: d.id,
          title: d.title || 'Untitled',
          clientName: clientNameMap[d.client_id] || 'Unknown Client',
          status: d.status || 'draft',
          priority: d.priority || 'medium',
          dueDate: d.due_date,
          deliverableType: d.deliverable_type_id || '',
          createdAt: d.created_at,
        });
      });

      // Build assignments count per member
      const assignmentCountByMember: Record<string, number> = {};
      rawAssignments.forEach((a: any) => {
        if (!a.team_member_id) return;
        assignmentCountByMember[a.team_member_id] = (assignmentCountByMember[a.team_member_id] || 0) + 1;
      });

      // Process team members
      const processed: TeamMemberDetail[] = rawTeam.map((t: any) => {
        const memberDels = deliverablesByMember[t.id] || [];
        const pendingTasks = memberDels.filter(d => ['draft', 'revision'].includes(d.status)).length;
        const inProgressTasks = memberDels.filter(d => ['in_progress', 'internal_review', 'client_review'].includes(d.status)).length;
        const completedTasks = memberDels.filter(d => ['approved', 'delivered'].includes(d.status)).length;
        const totalTasks = memberDels.length;

        // Calculate actual load from task distribution
        const activeTaskCount = pendingTasks + inProgressTasks;
        const dbLoad = t.current_load || 0;
        const computedLoad = Math.max(dbLoad, Math.min(100, activeTaskCount * 10));

        const loadCategory: 'normal' | 'busy' | 'overloaded' =
          computedLoad >= 85 ? 'overloaded' : computedLoad >= 60 ? 'busy' : 'normal';

        return {
          id: t.id,
          name: t.name,
          avatar: t.avatar || '',
          email: t.email || '',
          primaryRole: t.primary_role || 'Team Member',
          status: t.status || 'offline',
          currentLoad: computedLoad,
          loadCategory,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          totalTasks,
          assignedClients: assignmentCountByMember[t.id] || (t.assigned_clients || []).length,
          avgResponseTime: '< 2h',
          deliverables: memberDels,
        };
      });

      // Sort by load descending (overloaded first)
      processed.sort((a, b) => b.currentLoad - a.currentLoad);

      // Build summary
      const normalCount = processed.filter(m => m.loadCategory === 'normal').length;
      const busyCount = processed.filter(m => m.loadCategory === 'busy').length;
      const overloadedCount = processed.filter(m => m.loadCategory === 'overloaded').length;
      const avgLoad = processed.length > 0
        ? Math.round(processed.reduce((s, m) => s + m.currentLoad, 0) / processed.length)
        : 0;
      const totalActive = processed.reduce((s, m) => s + m.pendingTasks + m.inProgressTasks, 0);
      const totalCompleted = processed.reduce((s, m) => s + m.completedTasks, 0);

      // Suggest least-busy active member
      const activeSorted = [...processed]
        .filter(m => m.status !== 'offline')
        .sort((a, b) => a.currentLoad - b.currentLoad);
      const suggested = activeSorted.length > 0
        ? { id: activeSorted[0].id, name: activeSorted[0].name, load: activeSorted[0].currentLoad }
        : null;

      setMembers(processed);
      setSummary({
        totalMembers: processed.length,
        normalCount,
        busyCount,
        overloadedCount,
        averageLoad: avgLoad,
        totalActiveTasks: totalActive,
        totalCompletedThisMonth: totalCompleted,
        suggestedAssignee: suggested,
      });
    } catch (e: any) {
      console.error('[useTeamWorkload] Error:', e);
      setError(e?.message || 'Failed to load workload data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (!supabase) return;

    const channel = supabase
      .channel('team-workload-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverable_posts', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_assignments', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { members, summary, loading, error, refetch: fetchData };
}

// ============================================
// Main Component
// ============================================

export default function TeamWorkloadDashboard() {
  const { members, summary, loading, error, refetch } = useTeamWorkload();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loadFilter, setLoadFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Unique roles for filter
  const roles = useMemo(() => {
    const set = new Set(members.map(m => m.primaryRole));
    return ['all', ...Array.from(set)];
  }, [members]);

  // Filtered members
  const filtered = useMemo(() => {
    let result = members;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        m => m.name.toLowerCase().includes(q) ||
          m.primaryRole.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(m => m.primaryRole === roleFilter);
    }

    if (loadFilter !== 'all') {
      result = result.filter(m => m.loadCategory === loadFilter);
    }

    return result;
  }, [members, search, roleFilter, loadFilter]);

  if (loading && members.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
          <p className="font-mono-data text-xs text-white/30">Loading Team Workload...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 scrollbar-hide">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-titan-purple" />
            <h1 className="font-display font-extrabold text-xl text-white">Team Workload</h1>
          </div>
          <p className="font-mono-data text-xs text-white/30 mt-1">
            Monitor team capacity, assign tasks efficiently, and prevent burnout
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-white/40', refreshing && 'animate-spin')} />
          <span className="font-mono-data text-[11px] text-white/40">Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-mono-data text-xs text-red-300">{error}</span>
          <button onClick={refetch} className="ml-auto px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20">
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <SummaryCard
            label="Total Members"
            value={summary.totalMembers}
            icon={Users}
            color="cyan"
          />
          <SummaryCard
            label="Avg Load"
            value={`${summary.averageLoad}%`}
            icon={TrendingUp}
            color={summary.averageLoad >= 75 ? 'magenta' : summary.averageLoad >= 50 ? 'yellow' : 'lime'}
          />
          <SummaryCard
            label="Normal"
            value={summary.normalCount}
            icon={CheckCircle2}
            color="lime"
            emoji="🟢"
          />
          <SummaryCard
            label="Busy"
            value={summary.busyCount}
            icon={Clock}
            color="yellow"
            emoji="🟡"
          />
          <SummaryCard
            label="Overloaded"
            value={summary.overloadedCount}
            icon={AlertTriangle}
            color="magenta"
            emoji="🔴"
            alert={summary.overloadedCount > 0}
          />
          <SummaryCard
            label="Active Tasks"
            value={summary.totalActiveTasks}
            icon={FileImage}
            color="purple"
          />
          <SummaryCard
            label="Completed"
            value={summary.totalCompletedThisMonth}
            icon={Star}
            color="cyan"
          />
        </div>
      )}

      {/* Smart Assignment Suggestion */}
      {summary?.suggestedAssignee && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-titan-cyan/5 to-titan-purple/5 border border-titan-cyan/15"
        >
          <Zap className="w-4 h-4 text-titan-cyan shrink-0" />
          <span className="font-mono-data text-[11px] text-white/60 flex-1">
            <strong className="text-titan-cyan">Smart Suggestion:</strong> Next task should be assigned to{' '}
            <strong className="text-white">{summary.suggestedAssignee.name}</strong>{' '}
            (current load: {summary.suggestedAssignee.load}%)
          </span>
          <div className="px-2 py-0.5 rounded bg-titan-cyan/10 border border-titan-cyan/20">
            <span className="font-mono-data text-[10px] text-titan-cyan font-bold">
              Least Busy
            </span>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team members..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] font-mono-data text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-white/30" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/20" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono-data text-[11px] text-white/60 focus:outline-none focus:border-titan-cyan/30"
          >
            {roles.map(r => (
              <option key={r} value={r} className="bg-[#0d0f1a]">
                {r === 'all' ? 'All Roles' : r}
              </option>
            ))}
          </select>

          <select
            value={loadFilter}
            onChange={e => setLoadFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono-data text-[11px] text-white/60 focus:outline-none focus:border-titan-cyan/30"
          >
            <option value="all" className="bg-[#0d0f1a]">All Loads</option>
            <option value="normal" className="bg-[#0d0f1a]">🟢 Normal</option>
            <option value="busy" className="bg-[#0d0f1a]">🟡 Busy</option>
            <option value="overloaded" className="bg-[#0d0f1a]">🔴 Overloaded</option>
          </select>
        </div>
      </div>

      {/* Capacity Heatmap Bar */}
      {members.length > 0 && (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-3 rounded-full bg-titan-purple" />
            <h3 className="font-display font-bold text-xs text-white">Capacity Heatmap</h3>
          </div>
          <div className="flex gap-1 items-end h-16">
            {members.map(m => (
              <div
                key={m.id}
                className="flex-1 relative group cursor-pointer"
                onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
              >
                <div
                  className={cn(
                    'rounded-t-sm transition-all',
                    m.loadCategory === 'overloaded' ? 'bg-titan-magenta/60' :
                      m.loadCategory === 'busy' ? 'bg-yellow-400/50' : 'bg-titan-lime/40',
                    expandedMember === m.id && 'ring-1 ring-titan-cyan/40',
                  )}
                  style={{ height: `${Math.max(m.currentLoad, 5)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-[#1a1d2e] border border-white/[0.1] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <span className="font-mono-data text-[9px] text-white">{m.name}: {m.currentLoad}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono-data text-[8px] text-white/20">Team Members</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-titan-lime/40" /><span className="font-mono-data text-[8px] text-white/20">Normal</span></span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400/50" /><span className="font-mono-data text-[8px] text-white/20">Busy</span></span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-titan-magenta/60" /><span className="font-mono-data text-[8px] text-white/20">Overloaded</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Team Member List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="font-mono-data text-xs text-white/20">
              {members.length === 0 ? 'No team members found' : 'No members match the current filters'}
            </p>
          </div>
        ) : (
          filtered.map((member, i) => (
            <MemberCard
              key={member.id}
              member={member}
              index={i}
              expanded={expandedMember === member.id}
              onToggle={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  emoji,
  alert,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  color: 'cyan' | 'lime' | 'yellow' | 'magenta' | 'purple';
  emoji?: string;
  alert?: boolean;
}) {
  const colorMap = {
    cyan: 'from-titan-cyan/10 to-titan-cyan/5 border-titan-cyan/15 text-titan-cyan',
    lime: 'from-titan-lime/10 to-titan-lime/5 border-titan-lime/15 text-titan-lime',
    yellow: 'from-yellow-400/10 to-yellow-400/5 border-yellow-400/15 text-yellow-400',
    magenta: 'from-titan-magenta/10 to-titan-magenta/5 border-titan-magenta/15 text-titan-magenta',
    purple: 'from-titan-purple/10 to-titan-purple/5 border-titan-purple/15 text-titan-purple',
  };

  return (
    <div className={cn(
      'flex flex-col gap-1 p-3 rounded-xl bg-gradient-to-br border backdrop-blur-sm',
      colorMap[color],
      alert && 'animate-pulse'
    )}>
      <div className="flex items-center justify-between">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        {emoji && <span className="text-xs">{emoji}</span>}
      </div>
      <span className="font-display font-extrabold text-lg">{value}</span>
      <span className="font-mono-data text-[10px] opacity-60">{label}</span>
    </div>
  );
}

function MemberCard({
  member,
  index,
  expanded,
  onToggle,
}: {
  member: TeamMemberDetail;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const loadColor = member.loadCategory === 'overloaded'
    ? { bg: 'bg-titan-magenta', text: 'text-titan-magenta', label: 'bg-titan-magenta/10 text-titan-magenta', bar: 'bg-titan-magenta' }
    : member.loadCategory === 'busy'
      ? { bg: 'bg-yellow-400', text: 'text-yellow-400', label: 'bg-yellow-400/10 text-yellow-400', bar: 'bg-yellow-400' }
      : { bg: 'bg-titan-lime', text: 'text-titan-lime', label: 'bg-titan-lime/10 text-titan-lime', bar: 'bg-titan-lime' };

  const statusDot = member.status === 'online' ? 'bg-titan-lime' :
    member.status === 'busy' ? 'bg-yellow-400' : 'bg-white/20';

  const emoji = member.loadCategory === 'overloaded' ? '🔴' :
    member.loadCategory === 'busy' ? '🟡' : '🟢';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'rounded-xl bg-white/[0.02] border transition-all overflow-hidden',
        expanded ? 'border-titan-cyan/20 bg-white/[0.03]' : 'border-white/[0.05] hover:bg-white/[0.03]',
      )}
    >
      {/* Main Row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white/50 overflow-hidden">
            {member.avatar && member.avatar.length > 2 ? (
              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              member.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0f1a]', statusDot)} />
        </div>

        {/* Name & Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-white truncate">{member.name}</span>
            <span className={cn('shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold', loadColor.label)}>
              {emoji} {member.loadCategory}
            </span>
          </div>
          <span className="font-mono-data text-[10px] text-white/30">{member.primaryRole}</span>
        </div>

        {/* Load Bar (Desktop) */}
        <div className="hidden sm:flex flex-col items-end gap-1 w-28 shrink-0">
          <span className={cn('font-mono-data text-sm font-bold', loadColor.text)}>
            {member.currentLoad}%
          </span>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', loadColor.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(member.currentLoad, 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Task Count Badges (Desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-center">
            <span className="font-mono-data text-sm font-bold text-yellow-400">{member.pendingTasks}</span>
            <span className="font-mono-data text-[8px] text-white/30">pending</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono-data text-sm font-bold text-titan-cyan">{member.inProgressTasks}</span>
            <span className="font-mono-data text-[8px] text-white/30">active</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono-data text-sm font-bold text-titan-lime">{member.completedTasks}</span>
            <span className="font-mono-data text-[8px] text-white/30">done</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono-data text-sm font-bold text-white/40">{member.assignedClients}</span>
            <span className="font-mono-data text-[8px] text-white/30">clients</span>
          </div>
        </div>

        {/* Expand Icon */}
        <div className="shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-titan-cyan/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/20" />
          )}
        </div>
      </button>

      {/* Mobile Stats (visible on small screens) */}
      <div className="sm:hidden flex items-center gap-4 px-3 pb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('font-mono-data text-xs font-bold', loadColor.text)}>
              {member.currentLoad}% load
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className={cn('h-full rounded-full', loadColor.bar)} style={{ width: `${Math.min(member.currentLoad, 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/40 font-mono-data text-[10px]">
          <span>{member.pendingTasks}p</span>
          <span>{member.inProgressTasks}a</span>
          <span>{member.completedTasks}d</span>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] p-3 space-y-3">
              {/* Overloaded Warning */}
              {member.loadCategory === 'overloaded' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-titan-magenta/5 border border-titan-magenta/15">
                  <AlertTriangle className="w-3.5 h-3.5 text-titan-magenta shrink-0" />
                  <span className="font-mono-data text-[11px] text-titan-magenta/80">
                    ⚠️ This member is overloaded! Consider redistributing {member.pendingTasks + member.inProgressTasks} active tasks.
                  </span>
                </div>
              )}

              {/* Task Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MiniStat label="Pending" value={member.pendingTasks} color="text-yellow-400" icon={Clock} />
                <MiniStat label="In Progress" value={member.inProgressTasks} color="text-titan-cyan" icon={Target} />
                <MiniStat label="Completed" value={member.completedTasks} color="text-titan-lime" icon={CheckCircle2} />
                <MiniStat label="Clients" value={member.assignedClients} color="text-titan-purple" icon={User2} />
              </div>

              {/* Deliverables List */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileImage className="w-3 h-3 text-white/30" />
                  <h4 className="font-display font-bold text-[11px] text-white/60">
                    Active Deliverables ({(member.deliverables || []).filter(d => !['approved', 'delivered', 'cancelled'].includes(d.status)).length})
                  </h4>
                </div>

                {(member.deliverables || [])
                  .filter(d => !['approved', 'delivered', 'cancelled'].includes(d.status))
                  .length === 0 ? (
                    <p className="font-mono-data text-[11px] text-white/20 italic pl-5">No active deliverables</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                      {(member.deliverables || [])
                        .filter(d => !['approved', 'delivered', 'cancelled'].includes(d.status))
                        .sort((a, b) => {
                          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                          return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
                        })
                        .map(del => (
                          <DeliverableRow key={del.id} deliverable={del} />
                        ))}
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof Clock;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <Icon className={cn('w-3.5 h-3.5', color)} />
      <div>
        <span className={cn('font-mono-data text-sm font-bold block', color)}>{value}</span>
        <span className="font-mono-data text-[8px] text-white/30">{label}</span>
      </div>
    </div>
  );
}

function DeliverableRow({ deliverable }: { deliverable: MemberDeliverable }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-white/[0.08] text-white/50',
    in_progress: 'bg-titan-cyan/10 text-titan-cyan',
    internal_review: 'bg-titan-purple/10 text-titan-purple',
    client_review: 'bg-yellow-400/10 text-yellow-400',
    revision: 'bg-orange-400/10 text-orange-400',
    approved: 'bg-titan-lime/10 text-titan-lime',
    delivered: 'bg-titan-cyan/10 text-titan-cyan',
    cancelled: 'bg-white/[0.04] text-white/30',
  };

  const priorityColors: Record<string, string> = {
    urgent: 'text-titan-magenta',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-white/30',
  };

  const isOverdue = deliverable.dueDate && new Date(deliverable.dueDate) < new Date();

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
      {/* Priority Dot */}
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
        deliverable.priority === 'urgent' ? 'bg-titan-magenta' :
          deliverable.priority === 'high' ? 'bg-orange-400' :
            deliverable.priority === 'medium' ? 'bg-yellow-400' : 'bg-white/20'
      )} />

      {/* Title */}
      <span className="font-mono-data text-[11px] text-white/70 flex-1 truncate">
        {deliverable.title}
      </span>

      {/* Client */}
      <span className="font-mono-data text-[10px] text-white/30 hidden md:block truncate max-w-[120px]">
        {deliverable.clientName}
      </span>

      {/* Status Badge */}
      <span className={cn(
        'px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0',
        statusColors[deliverable.status] || 'bg-white/[0.04] text-white/30'
      )}>
        {deliverable.status.replace(/_/g, ' ')}
      </span>

      {/* Due Date */}
      {deliverable.dueDate && (
        <span className={cn(
          'font-mono-data text-[9px] shrink-0',
          isOverdue ? 'text-titan-magenta font-bold' : 'text-white/30'
        )}>
          {isOverdue ? '⚠️ ' : ''}
          {new Date(deliverable.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}
