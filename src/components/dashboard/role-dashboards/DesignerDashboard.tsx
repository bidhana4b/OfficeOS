import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileImage,
  Video,
  PenTool,
  Calendar,
  Eye,
  RotateCcw,
  Plus,
  Upload,
  Send,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useDesignerDashboard } from '@/hooks/useDashboard';

export default function DesignerDashboard() {
  const { user } = useAuth();
  const { deliverables, loading, error, refetch } = useDesignerDashboard();
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'review' | 'completed'>('all');

  const pendingDeliverables = deliverables.filter(d => d.status === 'in_progress' || d.status === 'pending');
  const reviewDeliverables = deliverables.filter(d => d.status === 'review');
  const completedDeliverables = deliverables.filter(d => d.status === 'completed' || d.status === 'delivered');
  const overdueDeliverables = deliverables.filter(d => {
    if (!d.due_date) return false;
    return new Date(d.due_date) < new Date() && d.status !== 'completed' && d.status !== 'delivered';
  });

  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);
  const completedThisWeek = completedDeliverables.filter(d =>
    new Date(d.created_at) >= thisWeek
  ).length;

  const filteredDeliverables = activeTab === 'all' ? deliverables :
    activeTab === 'in_progress' ? pendingDeliverables :
    activeTab === 'review' ? reviewDeliverables : completedDeliverables;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'photo_graphics': return <FileImage className="w-4 h-4" />;
      case 'video_edit': return <Video className="w-4 h-4" />;
      case 'copywriting': return <PenTool className="w-4 h-4" />;
      default: return <Palette className="w-4 h-4" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'in_progress': return 'bg-titan-cyan/20 text-titan-cyan border-titan-cyan/30';
      case 'review': return 'bg-titan-purple/20 text-titan-purple border-titan-purple/30';
      case 'completed': case 'delivered': return 'bg-titan-lime/20 text-titan-lime border-titan-lime/30';
      case 'revision': return 'bg-titan-magenta/20 text-titan-magenta border-titan-magenta/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const priorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-titan-cyan';
      case 'low': return 'bg-white/30';
      default: return 'bg-white/20';
    }
  };

  const stats = [
    { label: 'In Progress', value: pendingDeliverables.length, icon: Clock, color: 'titan-cyan', bg: 'from-titan-cyan/15 to-titan-cyan/5' },
    { label: 'In Review', value: reviewDeliverables.length, icon: Eye, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5' },
    { label: 'Completed', value: completedDeliverables.length, icon: CheckCircle2, color: 'titan-lime', bg: 'from-titan-lime/15 to-titan-lime/5' },
    { label: 'Overdue', value: overdueDeliverables.length, icon: AlertTriangle, color: 'titan-magenta', bg: 'from-titan-magenta/15 to-titan-magenta/5' },
  ];

  const quickActions = [
    { label: 'New Deliverable', icon: Plus, color: 'titan-cyan' },
    { label: 'Upload Design', icon: Upload, color: 'titan-purple' },
    { label: 'Request Review', icon: Send, color: 'titan-lime' },
    { label: 'Mark Complete', icon: CheckCircle2, color: 'yellow-400' },
  ];

  const typeBreakdown = deliverables.reduce((acc, d) => {
    const t = d.type || 'other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-titan-purple/30 border-t-titan-purple rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono-data text-[11px] text-white/30">Loading your deliverables…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-titan-magenta mx-auto mb-3 opacity-60" />
          <h2 className="font-display font-bold text-lg text-white mb-2">Failed to Load Dashboard</h2>
          <p className="font-mono-data text-xs text-white/40 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-titan-purple/20 border border-titan-purple/30 hover:bg-titan-purple/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-titan-purple" />
            <span className="font-mono text-xs text-titan-purple">Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-purple/20 to-titan-cyan/10 border border-titan-purple/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-titan-purple" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl text-white">
                Designer <span className="text-gradient-cyan">Workspace</span>
              </h1>
              <p className="font-mono-data text-xs text-white/30">
                {user?.display_name || 'Designer'} — My Deliverables & Tasks
              </p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
            <span className="font-mono-data text-[10px] text-white/30">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={cn(
                'relative rounded-xl border border-white/[0.06] p-4',
                'bg-gradient-to-br', stat.bg,
                'hover:border-white/[0.12] transition-all duration-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn('w-5 h-5', `text-${stat.color}`)} />
                <span className={cn('font-display font-extrabold text-2xl', `text-${stat.color}`)}>
                  {stat.value}
                </span>
              </div>
              <p className="font-mono-data text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-3"
      >
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                'bg-white/[0.03] border border-white/[0.06]',
                'hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200',
                'group'
              )}
            >
              <Icon className={cn('w-4 h-4', `text-${action.color}`, 'group-hover:scale-110 transition-transform')} />
              <span className="font-mono text-xs text-white/60 group-hover:text-white/80 transition-colors">
                {action.label}
              </span>
            </button>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Deliverables with tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white">My Deliverables</h2>
            <span className="font-mono-data text-[10px] text-white/30">{deliverables.length} total</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
            {([
              { key: 'all' as const, label: 'All', count: deliverables.length },
              { key: 'in_progress' as const, label: 'Active', count: pendingDeliverables.length },
              { key: 'review' as const, label: 'Review', count: reviewDeliverables.length },
              { key: 'completed' as const, label: 'Done', count: completedDeliverables.length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all',
                  activeTab === tab.key
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full',
                  activeTab === tab.key ? 'bg-titan-cyan/20 text-titan-cyan' : 'bg-white/5 text-white/30'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {filteredDeliverables.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No deliverables in this category</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {filteredDeliverables.slice(0, 15).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all group"
                >
                  <div className={cn('w-2 h-2 rounded-full shrink-0', priorityDot(d.priority))} />
                  <div className="text-white/40">{typeIcon(d.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-white truncate">{d.title}</p>
                    <p className="font-mono-data text-[10px] text-white/30">{d.client_name}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono border', statusColor(d.status))}>
                    {d.status.replace('_', ' ')}
                  </span>
                  {d.due_date && (
                    <span className="font-mono-data text-[10px] text-white/30 hidden sm:block">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(d.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Weekly Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-titan-cyan" /> Weekly Summary
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-titan-lime/5 border border-titan-lime/10">
                <Zap className="w-4 h-4 text-titan-lime mx-auto mb-1" />
                <p className="font-display font-bold text-lg text-titan-lime">{completedThisWeek}</p>
                <p className="font-mono-data text-[9px] text-white/30">Done This Week</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-titan-cyan/5 border border-titan-cyan/10">
                <Target className="w-4 h-4 text-titan-cyan mx-auto mb-1" />
                <p className="font-display font-bold text-lg text-titan-cyan">{pendingDeliverables.length}</p>
                <p className="font-mono-data text-[9px] text-white/30">In Queue</p>
              </div>
            </div>

            {/* Type breakdown */}
            <div className="space-y-2">
              <p className="font-mono-data text-[10px] text-white/30 uppercase tracking-wider">By Type</p>
              {Object.entries(typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="text-white/30">{typeIcon(type)}</div>
                  <span className="font-mono text-[11px] text-white/60 flex-1 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <span className="font-mono-data text-[11px] text-titan-cyan">{count}</span>
                </div>
              ))}
              {Object.keys(typeBreakdown).length === 0 && (
                <p className="font-mono text-[10px] text-white/20 text-center py-2">No data</p>
              )}
            </div>
          </motion.div>

          {/* Empty state message for no assignments */}
          {deliverables.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-titan-purple/5 border border-titan-purple/20 p-5 text-center"
            >
              <Palette className="w-8 h-8 text-titan-purple/40 mx-auto mb-3" />
              <h3 className="font-display font-bold text-sm text-white/70 mb-1">No Assigned Deliverables</h3>
              <p className="font-mono-data text-[10px] text-white/30">
                You don't have any deliverables assigned yet. Contact your account manager to get started.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueDeliverables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-titan-magenta/5 border border-titan-magenta/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-titan-magenta" />
            <h3 className="font-display font-bold text-sm text-titan-magenta">
              Overdue Deliverables ({overdueDeliverables.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {overdueDeliverables.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-titan-magenta/5 border border-titan-magenta/10">
                <RotateCcw className="w-3 h-3 text-titan-magenta shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-white truncate">{d.title}</p>
                  <p className="font-mono-data text-[9px] text-white/30">{d.client_name}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
