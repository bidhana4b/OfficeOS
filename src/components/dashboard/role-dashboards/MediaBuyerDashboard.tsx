import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  DollarSign,
  BarChart3,
  Target,
  Wallet,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Plus,
  ArrowUpRight,
  Zap,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useMediaBuyerDashboard } from '@/hooks/useDashboard';

export default function MediaBuyerDashboard() {
  const { user } = useAuth();
  const { campaigns, wallets, loading, error, refetch } = useMediaBuyerDashboard();
  const [campFilter, setCampFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + Number(c.spent || 0), 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const lowBalanceWallets = wallets.filter(w => w.balance < 5000 && w.balance > 0);

  const filteredCampaigns = campFilter === 'all' ? campaigns :
    campaigns.filter(c => c.status === campFilter);

  const platformEmoji = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'facebook': return '📘';
      case 'instagram': return '📸';
      case 'google': return '🔍';
      case 'tiktok': return '🎵';
      case 'youtube': return '🎬';
      case 'linkedin': return '💼';
      case 'twitter': return '🐦';
      default: return '🌐';
    }
  };

  const statusConfig: Record<string, { color: string; icon: typeof PlayCircle }> = {
    active: { color: 'text-titan-lime', icon: PlayCircle },
    paused: { color: 'text-yellow-400', icon: PauseCircle },
    completed: { color: 'text-titan-cyan', icon: CheckCircle2 },
    requested: { color: 'text-titan-purple', icon: Target },
  };

  const stats = [
    { label: 'Active Campaigns', value: activeCampaigns.length, icon: Megaphone, color: 'titan-lime', bg: 'from-titan-lime/15 to-titan-lime/5' },
    { label: 'Total Budget', value: `$${(totalBudget / 1000).toFixed(1)}K`, icon: DollarSign, color: 'titan-cyan', bg: 'from-titan-cyan/15 to-titan-cyan/5' },
    { label: 'Total Spent', value: `$${(totalSpent / 1000).toFixed(1)}K`, icon: BarChart3, color: 'titan-magenta', bg: 'from-titan-magenta/15 to-titan-magenta/5' },
    { label: 'Wallet Funds', value: `$${(totalWalletBalance / 1000).toFixed(1)}K`, icon: Wallet, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5' },
  ];

  const quickActions = [
    { label: 'Create Campaign', icon: Plus, color: 'titan-lime' },
    { label: 'Request Budget', icon: ArrowUpRight, color: 'titan-cyan' },
    { label: 'Boost Client', icon: Zap, color: 'titan-magenta' },
    { label: 'View Reports', icon: Eye, color: 'titan-purple' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-titan-magenta/30 border-t-titan-magenta rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono-data text-[11px] text-white/30">Loading campaigns…</p>
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
          <button onClick={refetch} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-titan-magenta/20 border border-titan-magenta/30 hover:bg-titan-magenta/30 transition-colors">
            <RefreshCw className="w-4 h-4 text-titan-magenta" />
            <span className="font-mono text-xs text-titan-magenta">Retry</span>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-magenta/20 to-titan-purple/10 border border-titan-magenta/30 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-titan-magenta" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl text-white">
                Media Buying <span className="text-gradient-cyan">Command</span>
              </h1>
              <p className="font-mono-data text-xs text-white/30">
                {user?.display_name || 'Media Buyer'} — Campaigns & Performance
              </p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white/40" />
            <span className="font-mono-data text-[10px] text-white/40">Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stats */}
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
        transition={{ delay: 0.12 }}
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

      {/* Budget Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-sm text-white">Budget Overview</h2>
          <span className="font-mono-data text-[10px] text-white/30">
            {budgetUtilization.toFixed(1)}% utilized
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              budgetUtilization > 90 ? 'bg-gradient-to-r from-titan-magenta to-red-500' :
              budgetUtilization > 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              'bg-gradient-to-r from-titan-cyan to-titan-lime'
            )}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <span className="font-mono-data text-[10px] text-white/30">
              Spent: <span className="text-titan-magenta">${totalSpent.toLocaleString()}</span>
            </span>
            <span className="font-mono-data text-[10px] text-white/30">
              Remaining: <span className="text-titan-lime">${remainingBudget.toLocaleString()}</span>
            </span>
          </div>
          <span className="font-mono-data text-[10px] text-white/30">
            Total: ${totalBudget.toLocaleString()}
          </span>
        </div>
      </motion.div>

      {/* Campaign Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="text-center p-4 rounded-xl bg-titan-lime/5 border border-titan-lime/10">
          <PlayCircle className="w-5 h-5 text-titan-lime mx-auto mb-1" />
          <p className="font-display font-bold text-xl text-titan-lime">{activeCampaigns.length}</p>
          <p className="font-mono-data text-[10px] text-white/30">Active</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
          <PauseCircle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="font-display font-bold text-xl text-yellow-400">{pausedCampaigns.length}</p>
          <p className="font-mono-data text-[10px] text-white/30">Paused</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-titan-cyan/5 border border-titan-cyan/10">
          <CheckCircle2 className="w-5 h-5 text-titan-cyan mx-auto mb-1" />
          <p className="font-display font-bold text-xl text-titan-cyan">{completedCampaigns.length}</p>
          <p className="font-mono-data text-[10px] text-white/30">Completed</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Campaign list with filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white">Campaigns</h2>
            <span className="font-mono-data text-[10px] text-white/30">{campaigns.length} total</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
            {([
              { key: 'all' as const, label: 'All', count: campaigns.length },
              { key: 'active' as const, label: 'Active', count: activeCampaigns.length },
              { key: 'paused' as const, label: 'Paused', count: pausedCampaigns.length },
              { key: 'completed' as const, label: 'Done', count: completedCampaigns.length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setCampFilter(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all',
                  campFilter === tab.key
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full',
                  campFilter === tab.key ? 'bg-titan-magenta/20 text-titan-magenta' : 'bg-white/5 text-white/30'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No campaigns in this category</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-hide">
              {filteredCampaigns.map((c) => {
                const spent = Number(c.spent || 0);
                const budget = Number(c.budget || 0);
                const pct = budget > 0 ? (spent / budget) * 100 : 0;
                const cfg = statusConfig[c.status] || statusConfig.active;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all"
                  >
                    <span className="text-lg">{platformEmoji(c.platform)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm text-white truncate">{c.name}</p>
                        <StatusIcon className={cn('w-3.5 h-3.5 shrink-0', cfg.color)} />
                      </div>
                      <p className="font-mono-data text-[10px] text-white/30">{c.client_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono-data text-xs text-white">
                        ${spent.toLocaleString()} <span className="text-white/30">/ ${budget.toLocaleString()}</span>
                      </p>
                      <div className="w-20 h-1.5 rounded-full bg-white/[0.06] mt-1">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            pct > 90 ? 'bg-titan-magenta' : pct > 70 ? 'bg-yellow-500' : 'bg-titan-cyan'
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Platform Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm text-white">Platform Breakdown</h2>
              <Globe className="w-4 h-4 text-white/30" />
            </div>

            {(() => {
              const platformMap: Record<string, { count: number; spent: number; budget: number }> = {};
              campaigns.forEach(c => {
                const p = c.platform || 'other';
                if (!platformMap[p]) platformMap[p] = { count: 0, spent: 0, budget: 0 };
                platformMap[p].count++;
                platformMap[p].spent += Number(c.spent || 0);
                platformMap[p].budget += Number(c.budget || 0);
              });

              const platforms = Object.entries(platformMap).sort((a, b) => b[1].spent - a[1].spent);

              return (
                <div className="space-y-3">
                  {platforms.length === 0 ? (
                    <p className="text-center text-white/20 font-mono text-xs py-8">No platform data</p>
                  ) : (
                    platforms.map(([platform, data]) => {
                      const pctUsed = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
                      return (
                        <div key={platform} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span>{platformEmoji(platform)}</span>
                            <span className="font-display text-xs text-white capitalize">{platform}</span>
                            <span className="font-mono-data text-[10px] text-white/30 ml-auto">{data.count}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] mb-1.5">
                            <div
                              className={cn('h-full rounded-full', pctUsed > 80 ? 'bg-titan-magenta' : 'bg-titan-cyan')}
                              style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono-data text-[10px] text-titan-cyan">
                              ${data.spent.toLocaleString()}
                            </span>
                            <span className="font-mono-data text-[10px] text-white/20">
                              / ${data.budget.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </motion.div>

          {/* Low Balance Wallet Alerts */}
          {lowBalanceWallets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-yellow-400" />
                <h2 className="font-display font-bold text-sm text-yellow-400">Low Balance Wallets</h2>
              </div>
              <div className="space-y-2">
                {lowBalanceWallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10"
                  >
                    <span className="font-mono text-[11px] text-white truncate">{w.client_name}</span>
                    <span className="font-mono-data text-[11px] text-yellow-400 font-bold">
                      ${w.balance.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Budget Alert — High Spend Campaigns */}
      {campaigns.filter(c => {
        const pct = Number(c.budget || 0) > 0 ? (Number(c.spent || 0) / Number(c.budget || 0)) * 100 : 0;
        return pct > 85 && c.status === 'active';
      }).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-titan-magenta/5 border border-titan-magenta/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-titan-magenta" />
            <h3 className="font-display font-bold text-sm text-titan-magenta">
              Budget Alert — High Spend Campaigns
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {campaigns
              .filter(c => {
                const pct = Number(c.budget || 0) > 0 ? (Number(c.spent || 0) / Number(c.budget || 0)) * 100 : 0;
                return pct > 85 && c.status === 'active';
              })
              .map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-titan-magenta/5 border border-titan-magenta/10">
                  <span>{platformEmoji(c.platform)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-white truncate">{c.name}</p>
                    <p className="font-mono-data text-[9px] text-white/30">{c.client_name}</p>
                  </div>
                  <span className="font-mono-data text-[10px] text-titan-magenta shrink-0">
                    {Number(c.budget || 0) > 0 ? ((Number(c.spent || 0) / Number(c.budget || 0)) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
