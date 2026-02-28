import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { getClientAnalytics, logExport } from '@/lib/data-service';
import { downloadFile } from '@/lib/export-utils';
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Star,
  Wallet,
  Zap,
  Eye,
  MousePointer,
  Package,
  CheckCircle2,
  Clock,
  RefreshCw,
  Download,
} from 'lucide-react';

interface Analytics {
  totalDeliverables: number;
  approved: number;
  pending: number;
  avgRating: number;
  totalRatings: number;
  walletBalance: number;
  totalFunded: number;
  totalSpent: number;
  totalBoostSpend: number;
  totalImpressions: number;
  totalClicks: number;
  activeCampaigns: number;
  monthlyBreakdown: { month: string; deliverables: number; approved: number }[];
}

export default function ClientAnalytics({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const fetchData = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await getClientAnalytics(clientId);
      setAnalytics(data as Analytics);
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
      // Show empty state - no mock fallback
      setAnalytics({
        totalDeliverables: 0,
        approved: 0,
        pending: 0,
        avgRating: 0,
        totalRatings: 0,
        walletBalance: 0,
        totalFunded: 0,
        totalSpent: 0,
        totalBoostSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        activeCampaigns: 0,
        monthlyBreakdown: [],
      });
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (n: number) =>
    '৳' + n.toLocaleString('en-BD');

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
      </div>
    );
  }

  if (!analytics) return null;

  const maxDeliverables = Math.max(...analytics.monthlyBreakdown.map((m) => m.deliverables), 1);
  const ctr = analytics.totalImpressions > 0
    ? ((analytics.totalClicks / analytics.totalImpressions) * 100).toFixed(1)
    : '0.0';

  const handleExport = () => {
    const headers = 'Metric,Value';
    const rows = [
      `Total Deliverables,${analytics.totalDeliverables}`,
      `Approved,${analytics.approved}`,
      `Pending,${analytics.pending}`,
      `Average Rating,${analytics.avgRating}`,
      `Total Ratings,${analytics.totalRatings}`,
      `Wallet Balance,${analytics.walletBalance}`,
      `Total Funded,${analytics.totalFunded}`,
      `Total Spent,${analytics.totalSpent}`,
      `Boost Spend,${analytics.totalBoostSpend}`,
      `Total Impressions,${analytics.totalImpressions}`,
      `Total Clicks,${analytics.totalClicks}`,
      `CTR %,${ctr}`,
      `Active Campaigns,${analytics.activeCampaigns}`,
      '',
      'Month,Deliverables,Approved',
      ...analytics.monthlyBreakdown.map((m) => `${m.month},${m.deliverables},${m.approved}`),
    ];
    const csv = [headers, ...rows].join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(csv, `analytics_report_${timestamp}.csv`);
    if (user?.client_id) {
      logExport(user.client_id, 'analytics_csv', `analytics_report_${timestamp}.csv`, rows.length);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-titan-bg/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-sm text-white">Analytics & Reports</h1>
            <p className="font-mono text-[10px] text-white/30">Performance overview</p>
          </div>
          <button
            onClick={handleExport}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-titan-lime/60" />
          </button>
          <button
            onClick={fetchData}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <RefreshCw className="w-4 h-4 text-white/30" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Deliverables', value: analytics.totalDeliverables.toString(), icon: Package, color: '#00D9FF', sub: `${analytics.approved} approved` },
            { label: 'Avg Rating', value: analytics.avgRating.toFixed(1), icon: Star, color: '#FFB800', sub: `${analytics.totalRatings} ratings` },
            { label: 'Pending', value: analytics.pending.toString(), icon: Clock, color: '#7B61FF', sub: 'in progress' },
            { label: 'Campaigns', value: analytics.activeCampaigns.toString(), icon: Zap, color: '#FF006E', sub: 'active' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${card.color}12`, border: `1px solid ${card.color}20` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                  </div>
                  <span className="font-mono text-[10px] text-white/40">{card.label}</span>
                </div>
                <p className="font-display font-extrabold text-xl text-white">{card.value}</p>
                <p className="font-mono text-[9px] text-white/25 mt-0.5">{card.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Monthly Deliverables Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-titan-cyan" />
            <h3 className="font-display font-bold text-xs text-white">Monthly Deliverables</h3>
          </div>
          <div className="flex items-end gap-2 h-28">
            {analytics.monthlyBreakdown.map((m, i) => {
              const height = (m.deliverables / maxDeliverables) * 100;
              const approvedHeight = (m.approved / maxDeliverables) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="font-mono text-[8px] text-white/30">{m.deliverables}</span>
                  <div className="w-full relative" style={{ height: '80px' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                      className="absolute bottom-0 left-0 right-0 rounded-t-md bg-white/[0.06]"
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${approvedHeight}%` }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                      className="absolute bottom-0 left-0 right-0 rounded-t-md"
                      style={{ background: 'linear-gradient(to top, rgba(0,217,255,0.3), rgba(0,217,255,0.1))' }}
                    />
                  </div>
                  <span className="font-mono text-[7px] text-white/20">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-white/[0.06]" />
              <span className="font-mono text-[8px] text-white/25">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-titan-cyan/30" />
              <span className="font-mono text-[8px] text-white/25">Approved</span>
            </div>
          </div>
        </motion.div>

        {/* Financial Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-titan-lime" />
            <h3 className="font-display font-bold text-xs text-white">Financial Overview</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/40">Wallet Balance</span>
              <span className="font-display font-bold text-sm text-titan-lime">
                {formatCurrency(analytics.walletBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/40">Total Funded</span>
              <span className="font-mono text-xs text-white/60">{formatCurrency(analytics.totalFunded)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/40">Total Spent</span>
              <span className="font-mono text-xs text-white/60">{formatCurrency(analytics.totalSpent)}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/40">Boost Campaigns Spend</span>
              <span className="font-mono text-xs text-titan-magenta">{formatCurrency(analytics.totalBoostSpend)}</span>
            </div>
          </div>
        </motion.div>

        {/* Boost Campaign Performance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-titan-purple" />
            <h3 className="font-display font-bold text-xs text-white">Campaign Performance</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <Eye className="w-4 h-4 text-white/20 mx-auto mb-1" />
              <p className="font-display font-bold text-base text-white">
                {formatNumber(analytics.totalImpressions)}
              </p>
              <p className="font-mono text-[8px] text-white/25">Impressions</p>
            </div>
            <div className="text-center">
              <MousePointer className="w-4 h-4 text-white/20 mx-auto mb-1" />
              <p className="font-display font-bold text-base text-white">
                {formatNumber(analytics.totalClicks)}
              </p>
              <p className="font-mono text-[8px] text-white/25">Clicks</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-4 h-4 text-white/20 mx-auto mb-1" />
              <p className="font-display font-bold text-base text-white">{ctr}%</p>
              <p className="font-mono text-[8px] text-white/25">CTR</p>
            </div>
          </div>
        </motion.div>

        {/* Rating Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-titan-amber" />
            <h3 className="font-display font-bold text-xs text-white">Quality Score</h3>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="font-display font-extrabold text-3xl text-white">
                {analytics.avgRating.toFixed(1)}
              </p>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(analytics.avgRating)
                        ? 'text-titan-amber fill-titan-amber'
                        : 'text-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="font-mono text-[9px] text-white/25 mt-1">
                Based on {analytics.totalRatings} ratings
              </p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                // Simulated distribution
                const pct = star === 5 ? 60 : star === 4 ? 25 : star === 3 ? 10 : star === 2 ? 3 : 2;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="font-mono text-[8px] text-white/25 w-3">{star}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.7 + star * 0.05 }}
                        className="h-full rounded-full bg-titan-amber/40"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
