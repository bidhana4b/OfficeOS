import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Package,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ChevronRight,
  Zap,
  Activity,
  FileImage,
  Wallet,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandCenter, type ClientStatusCard, type TeamMemberWorkload, type WorkspaceQuickAccess } from '@/hooks/useCommandCenter';
import { DataSourceIndicator } from '@/components/ui/data-source-indicator';
import FinancialPulseChart from './FinancialPulseChart';

interface AgencyCommandCenterProps {
  onNavigate?: (section: string) => void;
}

export default function AgencyCommandCenter({ onNavigate }: AgencyCommandCenterProps) {
  const { data, loading, error, refetch } = useCommandCenter();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<'all' | 'active' | 'at-risk' | 'overdue' | 'low-balance'>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | 'online' | 'busy' | 'overloaded' | 'idle'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!data) return [];
    let clients = data.clients;

    if (search) {
      const q = search.toLowerCase();
      clients = clients.filter(
        c =>
          c.businessName.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.accountManager?.name.toLowerCase().includes(q)
      );
    }

    switch (clientFilter) {
      case 'active':
        return clients.filter(c => c.status === 'active');
      case 'at-risk':
        return clients.filter(c => c.usagePercent >= 80 || c.healthScore < 50);
      case 'overdue':
        return clients.filter(c => c.pendingDeliverables > 3);
      case 'low-balance':
        return clients.filter(c => c.walletBalance < 1000);
      default:
        return clients;
    }
  }, [data, search, clientFilter]);

  // Filtered team
  const filteredTeam = useMemo(() => {
    if (!data) return [];
    switch (teamFilter) {
      case 'online':
        return data.team.filter(t => t.status === 'online');
      case 'busy':
        return data.team.filter(t => t.loadCategory === 'busy');
      case 'overloaded':
        return data.team.filter(t => t.loadCategory === 'overloaded');
      case 'idle':
        return data.team.filter(t => t.currentLoad < 30);
      default:
        return data.team;
    }
  }, [data, teamFilter]);

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
          <p className="font-mono-data text-xs text-white/30">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  const m = data?.metrics;
  const hasData = m && (m.totalClients > 0 || m.totalTeamMembers > 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 scrollbar-hide">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-titan-cyan/20 to-titan-purple/10 border border-titan-cyan/20">
              <Zap className="w-5 h-5 text-titan-cyan" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl text-white">
                Agency <span className="text-gradient-cyan">Command Center</span>
              </h1>
              <p className="font-mono-data text-[10px] text-white/30">
                Real-time agency operations overview
              </p>
            </div>
            <DataSourceIndicator 
              isRealData={!!data && data.clients.length > 0} 
              size="sm" 
            />
          </div>
        </motion.div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-white/40", refreshing && "animate-spin")} />
            <span className="font-mono-data text-[10px] text-white/40">Refresh</span>
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
            <span className="font-mono-data text-[10px] text-white/30">Live</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-titan-magenta/5 border border-titan-magenta/20"
        >
          <AlertTriangle className="w-4 h-4 text-titan-magenta shrink-0" />
          <p className="font-mono-data text-[11px] text-titan-magenta/80 flex-1">{error}</p>
          <button onClick={handleRefresh} className="flex items-center gap-1 px-2 py-1 rounded-md bg-titan-magenta/10 hover:bg-titan-magenta/20 transition-colors">
            <RefreshCw className="w-3 h-3 text-titan-magenta" />
            <span className="font-mono-data text-[10px] text-titan-magenta">Retry</span>
          </button>
        </motion.div>
      )}

      {/* Setup Guide (shown when no data) */}
      {!hasData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl border border-titan-cyan/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-titan-cyan/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-titan-cyan" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">Getting Started</h3>
              <p className="font-mono-data text-[10px] text-white/30">Set up your agency in 3 easy steps</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Add Team Members', desc: 'Go to Team Hub and add your team (designers, media buyers, etc.)', nav: 'team' },
              { step: '2', title: 'Create Clients', desc: 'Use the Client Hub to onboard your clients with their details', nav: 'clients' },
              { step: '3', title: 'Set Up Packages', desc: 'Define service packages and assign them to clients', nav: 'packages' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => onNavigate?.(item.nav)}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all text-left"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20 text-titan-cyan font-display font-bold text-xs shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-display font-bold text-xs text-white mb-0.5">{item.title}</p>
                  <p className="font-mono-data text-[10px] text-white/30 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* === SECTION 1: Key Metrics === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <MetricTile icon={Users} label="Active Clients" value={m?.activeClients || 0} total={m?.totalClients} color="cyan" />
        <MetricTile icon={UserCheck} label="Team Online" value={m?.onlineMembers || 0} total={m?.totalTeamMembers} color="lime" />
        <MetricTile icon={Clock} label="Pending Tasks" value={m?.pendingDeliverables || 0} color="yellow" alert={m && m.pendingDeliverables > 10} />
        <MetricTile icon={CheckCircle2} label="Delivered (Month)" value={m?.deliveredThisMonth || 0} color="lime" />
        <MetricTile icon={DollarSign} label="Revenue" value={m?.totalRevenue || 0} color="cyan" isCurrency className="hidden md:flex" />
        <MetricTile icon={MessageSquare} label="Unread Msgs" value={m?.totalUnreadMessages || 0} color="purple" alert={m && m.totalUnreadMessages > 10} className="hidden lg:flex" />
      </motion.div>

      {/* === SECTION 2: Live Client Status Grid === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-titan-cyan" />
            <h2 className="font-display font-bold text-sm text-white">Live Client Status</h2>
            <span className="font-mono-data text-[10px] text-white/30">({filteredClients.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-40 h-7 pl-8 pr-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 placeholder:text-white/15 font-mono-data text-[10px] focus:outline-none focus:border-titan-cyan/20 transition-colors"
              />
            </div>
            {/* Filters */}
            <div className="flex items-center gap-1">
              {(['all', 'active', 'at-risk', 'overdue', 'low-balance'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setClientFilter(f)}
                  className={cn(
                    'px-2 py-1 rounded-md font-mono-data text-[10px] transition-all',
                    clientFilter === f
                      ? 'bg-titan-cyan/15 text-titan-cyan border border-titan-cyan/20'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
                  )}
                >
                  {f === 'at-risk' ? 'At Risk' : f === 'low-balance' ? 'Low Balance' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredClients.length === 0 ? (
            <div className="col-span-full text-center py-8 text-white/20 font-mono-data text-xs">
              No clients match the current filter
            </div>
          ) : (
            filteredClients.slice(0, 12).map((client, i) => (
              <ClientCard
                key={client.id}
                client={client}
                index={i}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>

        {filteredClients.length > 12 && (
          <button
            onClick={() => onNavigate?.('clients')}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
          >
            <span className="font-mono-data text-[10px] text-white/40">View all {filteredClients.length} clients</span>
            <ChevronRight className="w-3 h-3 text-white/40" />
          </button>
        )}
      </motion.div>

      {/* === SECTION 3: Two-Column Layout — Team Workload + Messaging === */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Team Workload Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-titan-purple" />
              <h2 className="font-display font-bold text-sm text-white">Team Workload</h2>
              <span className="font-mono-data text-[10px] text-white/30">({filteredTeam.length} members)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {(['all', 'online', 'busy', 'overloaded', 'idle'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTeamFilter(f)}
                    className={cn(
                      'px-1.5 py-0.5 rounded-md font-mono-data text-[9px] transition-all',
                      teamFilter === f
                        ? 'bg-titan-purple/15 text-titan-purple border border-titan-purple/20'
                        : 'text-white/25 hover:text-white/40 hover:bg-white/[0.03]'
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onNavigate?.('team')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors"
              >
                <span className="font-mono-data text-[10px] text-white/30">View All</span>
                <ChevronRight className="w-3 h-3 text-white/30" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredTeam.length === 0 ? (
              <div className="text-center py-8 text-white/20 font-mono-data text-xs rounded-xl bg-white/[0.02] border border-white/[0.04]">
                {teamFilter === 'all' ? 'No team members found' : `No ${teamFilter} team members`}
              </div>
            ) : (
              filteredTeam.slice(0, 8).map((member, i) => (
                <TeamMemberRow key={member.id} member={member} index={i} />
              ))
            )}
          </div>
        </motion.div>

        {/* Messaging Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-titan-lime" />
              <h2 className="font-display font-bold text-sm text-white">Messaging</h2>
            </div>
            <button
              onClick={() => onNavigate?.('messaging')}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors"
            >
              <span className="font-mono-data text-[10px] text-white/30">Open Hub</span>
              <ChevronRight className="w-3 h-3 text-white/30" />
            </button>
          </div>

          <div className="space-y-2">
            {(data?.workspaces || []).length === 0 ? (
              <div className="text-center py-8 text-white/20 font-mono-data text-xs rounded-xl bg-white/[0.02] border border-white/[0.04]">
                No workspaces found
              </div>
            ) : (
              (data?.workspaces || []).slice(0, 10).map((ws, i) => (
                <WorkspaceRow
                  key={ws.workspaceId}
                  workspace={ws}
                  index={i}
                  onNavigate={onNavigate}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* === SECTION 4: Financial Pulse === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <FinancialPulseChart
          data={data?.financialData}
          loading={loading}
        />
      </motion.div>

      {/* === SECTION 5: Quick Action Alerts === */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <QuickAlerts data={data} onNavigate={onNavigate} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function MetricTile({
  icon: Icon,
  label,
  value,
  total,
  color,
  alert,
  className,
  isCurrency,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  total?: number;
  color: 'cyan' | 'lime' | 'yellow' | 'magenta' | 'purple';
  alert?: boolean;
  className?: string;
  isCurrency?: boolean;
}) {
  const colorMap = {
    cyan: { bg: 'from-titan-cyan/10 to-titan-cyan/5', border: 'border-titan-cyan/15', text: 'text-titan-cyan', glow: 'shadow-titan-cyan/5' },
    lime: { bg: 'from-titan-lime/10 to-titan-lime/5', border: 'border-titan-lime/15', text: 'text-titan-lime', glow: 'shadow-titan-lime/5' },
    yellow: { bg: 'from-yellow-400/10 to-yellow-400/5', border: 'border-yellow-400/15', text: 'text-yellow-400', glow: 'shadow-yellow-400/5' },
    magenta: { bg: 'from-titan-magenta/10 to-titan-magenta/5', border: 'border-titan-magenta/15', text: 'text-titan-magenta', glow: 'shadow-titan-magenta/5' },
    purple: { bg: 'from-titan-purple/10 to-titan-purple/5', border: 'border-titan-purple/15', text: 'text-titan-purple', glow: 'shadow-titan-purple/5' },
  };
  const c = colorMap[color];

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br border backdrop-blur-sm transition-all',
        c.bg, c.border,
        alert && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Icon className={cn('w-4 h-4', c.text)} />
        {alert && <div className="w-2 h-2 rounded-full bg-titan-magenta animate-ping" />}
      </div>
      <div>
        <span className={cn('font-display font-extrabold', isCurrency ? 'text-base' : 'text-xl', c.text)}>
          {isCurrency ? `$${value.toLocaleString()}` : value}
        </span>
        {total !== undefined && (
          <span className="font-mono-data text-[10px] text-white/30 ml-1">/ {total}</span>
        )}
      </div>
      <span className="font-mono-data text-[10px] text-white/40">{label}</span>
    </div>
  );
}

function ClientCard({
  client,
  index,
  onNavigate,
}: {
  client: ClientStatusCard;
  index: number;
  onNavigate?: (section: string) => void;
}) {
  const usageColor = client.usagePercent >= 90 ? 'bg-titan-magenta' :
    client.usagePercent >= 70 ? 'bg-yellow-400' : 'bg-titan-lime';

  const healthColor = client.healthScore >= 70 ? 'text-titan-lime' :
    client.healthScore >= 40 ? 'text-yellow-400' : 'text-titan-magenta';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
      onClick={() => onNavigate?.('clients')}
    >
      {/* Top Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-white truncate">{client.businessName}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono-data text-[10px] text-white/30">{client.category}</span>
            <span className="text-white/10">·</span>
            <span className={cn('font-mono-data text-[10px] font-bold', healthColor)}>
              {client.healthScore}% health
            </span>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono-data text-[9px] font-bold',
          client.status === 'active' ? 'bg-titan-lime/10 text-titan-lime' : 'bg-white/[0.06] text-white/30'
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full', client.status === 'active' ? 'bg-titan-lime' : 'bg-white/20')} />
          {client.status}
        </div>
      </div>

      {/* Package + Usage */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono-data text-[10px] text-white/40 flex items-center gap-1">
            <Package className="w-3 h-3" /> {client.packageName}
          </span>
          <span className="font-mono-data text-[10px] text-white/50 font-bold">
            {client.totalUsed}/{client.totalAllocated}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', usageColor)}
            style={{ width: `${Math.min(client.usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 text-white/30">
        <div className="flex items-center gap-1">
          <FileImage className="w-3 h-3" />
          <span className="font-mono-data text-[10px]">
            {client.pendingDeliverables} pending
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Wallet className="w-3 h-3" />
          <span className="font-mono-data text-[10px]">
            {client.walletCurrency} {client.walletBalance.toLocaleString()}
          </span>
        </div>
        {client.unreadMessages > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-titan-cyan" />
            <span className="font-mono-data text-[10px] text-titan-cyan font-bold">
              {client.unreadMessages}
            </span>
          </div>
        )}
        {client.accountManager && (
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[8px] font-bold text-white/50">
              {client.accountManager.name.charAt(0)}
            </div>
          </div>
        )}
      </div>

      {/* Last interaction */}
      {client.lastMessageAt && (
        <div className="mt-1.5 font-mono-data text-[9px] text-white/20">
          Last activity: {formatTimeAgo(client.lastMessageAt)}
        </div>
      )}
    </motion.div>
  );
}

function TeamMemberRow({ member, index }: { member: TeamMemberWorkload; index: number }) {
  const loadColor = member.loadCategory === 'overloaded' ? 'bg-titan-magenta' :
    member.loadCategory === 'busy' ? 'bg-yellow-400' : 'bg-titan-lime';

  const loadTextColor = member.loadCategory === 'overloaded' ? 'text-titan-magenta' :
    member.loadCategory === 'busy' ? 'text-yellow-400' : 'text-titan-lime';

  const statusDot = member.status === 'online' ? 'bg-titan-lime' :
    member.status === 'busy' ? 'bg-yellow-400' : 'bg-white/20';

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white/50 overflow-hidden">
          {member.avatar && member.avatar.length > 2 ? (
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            member.name.substring(0, 2).toUpperCase()
          )}
        </div>
        <div className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0f1a]', statusDot)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-xs text-white truncate">{member.name}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider',
            member.loadCategory === 'overloaded' ? 'bg-titan-magenta/10 text-titan-magenta' :
              member.loadCategory === 'busy' ? 'bg-yellow-400/10 text-yellow-400' :
                'bg-titan-lime/10 text-titan-lime'
          )}>
            {member.loadCategory === 'overloaded' ? '🔴' : member.loadCategory === 'busy' ? '🟡' : '🟢'} {member.loadCategory}
          </span>
        </div>
        <span className="font-mono-data text-[10px] text-white/30">{member.primaryRole}</span>
      </div>

      {/* Load Bar */}
      <div className="hidden sm:flex flex-col items-end gap-1 w-24">
        <span className={cn('font-mono-data text-xs font-bold', loadTextColor)}>
          {member.currentLoad}%
        </span>
        <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', loadColor)}
            style={{ width: `${Math.min(member.currentLoad, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-3 text-white/30 shrink-0">
        <div className="flex flex-col items-center">
          <span className="font-mono-data text-xs font-bold text-white/60">{member.activeDeliverables}</span>
          <span className="font-mono-data text-[8px]">active</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono-data text-xs font-bold text-white/60">{member.tasksCompletedThisMonth}</span>
          <span className="font-mono-data text-[8px]">done</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono-data text-xs font-bold text-white/60">{member.assignedClientsCount}</span>
          <span className="font-mono-data text-[8px]">clients</span>
        </div>
      </div>
    </motion.div>
  );
}

function WorkspaceRow({
  workspace,
  index,
  onNavigate,
}: {
  workspace: WorkspaceQuickAccess;
  index: number;
  onNavigate?: (section: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onNavigate?.('messaging')}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-titan-cyan/10 to-titan-purple/10 border border-white/[0.08] flex items-center justify-center">
        <MessageSquare className="w-3.5 h-3.5 text-titan-cyan/60" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-display font-bold text-xs text-white truncate block">{workspace.workspaceName}</span>
        <span className="font-mono-data text-[10px] text-white/30">{workspace.channelCount} channels</span>
      </div>
      {workspace.unreadCount > 0 && (
        <div className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-titan-cyan/20 border border-titan-cyan/30">
          <span className="font-mono-data text-[10px] font-bold text-titan-cyan">{workspace.unreadCount}</span>
        </div>
      )}
      <ChevronRight className="w-3 h-3 text-white/20" />
    </motion.button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function QuickAlerts({ data, onNavigate }: { data: NonNullable<ReturnType<typeof useCommandCenter>['data']>; onNavigate?: (s: string) => void }) {
  const alerts: { type: 'warning' | 'info' | 'success'; message: string; action?: string; nav?: string }[] = [];

  if (data.metrics.overloadedMembers > 0) {
    alerts.push({
      type: 'warning',
      message: `${data.metrics.overloadedMembers} team member(s) are overloaded (85%+ capacity)`,
      action: 'View Team',
      nav: 'team',
    });
  }

  if (data.metrics.lowPackageClients > 0) {
    alerts.push({
      type: 'warning',
      message: `${data.metrics.lowPackageClients} client(s) have used 80%+ of their package`,
      action: 'View Clients',
      nav: 'clients',
    });
  }

  if (data.metrics.pendingDeliverables > 5) {
    alerts.push({
      type: 'info',
      message: `${data.metrics.pendingDeliverables} deliverables are pending across all clients`,
      action: 'View Deliverables',
      nav: 'deliverables-feed',
    });
  }

  const clientsWithoutManager = data.clients.filter(c => !c.accountManager);
  if (clientsWithoutManager.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${clientsWithoutManager.length} client(s) have no account manager assigned`,
      action: 'Assign',
      nav: 'assignments',
    });
  }

  const lowBalanceClients = data.clients.filter(c => c.walletBalance < 500 && c.status === 'active');
  if (lowBalanceClients.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${lowBalanceClients.length} active client(s) have low wallet balance (<$500)`,
      action: 'View Finance',
      nav: 'finance',
    });
  }

  if (data.metrics.deliveredThisMonth > 0) {
    alerts.push({
      type: 'success',
      message: `${data.metrics.deliveredThisMonth} deliverables completed this month — great work!`,
    });
  }

  if (data.metrics.totalUnreadMessages > 0) {
    alerts.push({
      type: 'info',
      message: `${data.metrics.totalUnreadMessages} unread message(s) across workspaces`,
      action: 'Open Messages',
      nav: 'messaging',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      message: 'All systems running smoothly! No alerts at this time.',
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-4 rounded-full bg-yellow-400" />
        <h2 className="font-display font-bold text-sm text-white">Action Alerts</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.map((alert, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-all',
              alert.type === 'warning'
                ? 'bg-yellow-400/5 border-yellow-400/15'
                : alert.type === 'success'
                  ? 'bg-titan-lime/5 border-titan-lime/15'
                  : 'bg-titan-cyan/5 border-titan-cyan/15'
            )}
          >
            {alert.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            ) : alert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-titan-lime shrink-0" />
            ) : (
              <Activity className="w-4 h-4 text-titan-cyan shrink-0" />
            )}
            <span className="font-mono-data text-[11px] text-white/60 flex-1">{alert.message}</span>
            {alert.action && alert.nav && (
              <button
                onClick={() => onNavigate?.(alert.nav!)}
                className={cn(
                  'px-2 py-1 rounded-md font-mono-data text-[10px] font-medium transition-colors shrink-0',
                  alert.type === 'warning'
                    ? 'bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20'
                    : 'bg-titan-cyan/10 text-titan-cyan hover:bg-titan-cyan/20'
                )}
              >
                {alert.action}
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
