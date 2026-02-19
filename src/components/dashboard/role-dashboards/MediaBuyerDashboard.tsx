import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Wallet,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spent: number;
  goal: string;
  client_name?: string;
  start_date: string | null;
  end_date: string | null;
}

interface WalletSummary {
  total_balance: number;
  client_count: number;
}

export default function MediaBuyerDashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary>({ total_balance: 0, client_count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch campaigns
      const { data: campData } = await supabase
        .from('campaigns')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(30);

      if (campData) {
        setCampaigns(campData.map((c: any) => ({
          ...c,
          client_name: c.clients?.business_name || 'Unknown',
        })));
      }

      // Fetch wallet summary
      const { data: wallets } = await supabase
        .from('client_wallets')
        .select('balance');

      if (wallets) {
        setWalletSummary({
          total_balance: wallets.reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0),
          client_count: wallets.length,
        });
      }
    } catch (e) {
      console.error('MediaBuyerDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + Number(c.spent || 0), 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

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
    { label: 'Wallet Funds', value: `$${(walletSummary.total_balance / 1000).toFixed(1)}K`, icon: Wallet, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-titan-magenta/30 border-t-titan-magenta rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Campaigns */}
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

          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No campaigns yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-hide">
              {campaigns.map((c) => {
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
                  platforms.map(([platform, data]) => (
                    <div key={platform} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{platformEmoji(platform)}</span>
                        <span className="font-display text-xs text-white capitalize">{platform}</span>
                        <span className="font-mono-data text-[10px] text-white/30 ml-auto">{data.count} campaigns</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono-data text-[10px] text-titan-cyan">
                          Spent: ${data.spent.toLocaleString()}
                        </span>
                        <span className="font-mono-data text-[10px] text-white/30">
                          Budget: ${data.budget.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* Campaigns needing attention */}
      {campaigns.filter(c => {
        const pct = Number(c.budget || 0) > 0 ? (Number(c.spent || 0) / Number(c.budget || 0)) * 100 : 0;
        return pct > 85 && c.status === 'active';
      }).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-display font-bold text-sm text-yellow-400">
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
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <span>{platformEmoji(c.platform)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-white truncate">{c.name}</p>
                    <p className="font-mono-data text-[9px] text-white/30">{c.client_name}</p>
                  </div>
                  <span className="font-mono-data text-[10px] text-yellow-400 shrink-0">
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
