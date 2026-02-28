/**
 * TITAN DEV AI — AI Insights Full Page View
 * Shows AI-generated insights, alerts, and recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Zap,
  Target,
  BarChart3,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface InsightData {
  totalClients: number;
  activeClients: number;
  pendingDeliverables: number;
  overdueInvoices: number;
  activeCompaigns: number;
  totalRevenue: number;
  recentActivities: number;
}

interface InsightCard {
  id: string;
  type: 'warning' | 'prediction' | 'opportunity' | 'metric';
  title: string;
  description: string;
  metric?: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    color: 'text-titan-magenta',
    bg: 'bg-titan-magenta/10',
    border: 'border-titan-magenta/20',
    glow: 'shadow-titan-magenta/10',
  },
  prediction: {
    icon: TrendingUp,
    color: 'text-titan-cyan',
    bg: 'bg-titan-cyan/10',
    border: 'border-titan-cyan/20',
    glow: 'shadow-titan-cyan/10',
  },
  opportunity: {
    icon: Lightbulb,
    color: 'text-titan-lime',
    bg: 'bg-titan-lime/10',
    border: 'border-titan-lime/20',
    glow: 'shadow-titan-lime/10',
  },
  metric: {
    icon: BarChart3,
    color: 'text-titan-purple',
    bg: 'bg-titan-purple/10',
    border: 'border-titan-purple/20',
    glow: 'shadow-titan-purple/10',
  },
};

function generateInsights(data: InsightData): InsightCard[] {
  const insights: InsightCard[] = [];

  // Active clients metric
  insights.push({
    id: 'client-health',
    type: 'metric',
    title: 'Client Portfolio Overview',
    description: `You have ${data.activeClients} active clients out of ${data.totalClients} total. ${
      data.activeClients < data.totalClients
        ? `${data.totalClients - data.activeClients} clients are inactive — consider re-engagement campaigns.`
        : 'All clients are active — great health score!'
    }`,
    metric: `${data.totalClients > 0 ? Math.round((data.activeClients / data.totalClients) * 100) : 0}% active rate`,
    priority: data.activeClients < data.totalClients * 0.7 ? 'high' : 'low',
  });

  // Pending deliverables warning
  if (data.pendingDeliverables > 5) {
    insights.push({
      id: 'deliverable-backlog',
      type: 'warning',
      title: 'Deliverable Backlog Alert',
      description: `${data.pendingDeliverables} deliverables are pending or in review. Consider redistributing workload across team members to prevent bottlenecks.`,
      metric: `${data.pendingDeliverables} pending items`,
      action: 'Review Deliverables',
      priority: 'high',
    });
  } else if (data.pendingDeliverables > 0) {
    insights.push({
      id: 'deliverable-status',
      type: 'prediction',
      title: 'Deliverable Pipeline',
      description: `${data.pendingDeliverables} deliverables in progress. On track for timely completion if current velocity is maintained.`,
      metric: `${data.pendingDeliverables} in pipeline`,
      priority: 'low',
    });
  }

  // Overdue invoices
  if (data.overdueInvoices > 0) {
    insights.push({
      id: 'invoice-overdue',
      type: 'warning',
      title: 'Overdue Invoice Alert',
      description: `${data.overdueInvoices} invoices are overdue. Send payment reminders immediately to maintain cash flow. Consider implementing automated reminders.`,
      metric: `${data.overdueInvoices} overdue`,
      action: 'View Invoices',
      priority: 'high',
    });
  }

  // Campaign performance
  if (data.activeCompaigns > 0) {
    insights.push({
      id: 'campaign-active',
      type: 'prediction',
      title: 'Active Campaign Insights',
      description: `${data.activeCompaigns} campaigns are currently running. Monitor performance metrics closely and reallocate budget to top-performing campaigns for better ROI.`,
      metric: `${data.activeCompaigns} active campaigns`,
      priority: 'medium',
    });
  }

  // Revenue insights
  insights.push({
    id: 'revenue-trend',
    type: 'opportunity',
    title: 'Revenue Optimization',
    description: data.totalRevenue > 0
      ? `Current revenue pipeline: ৳${data.totalRevenue.toLocaleString()}. Consider upselling premium packages to high-value clients for 20-30% growth potential.`
      : 'No revenue data yet. Start by creating invoices for your active clients to begin tracking financials.',
    metric: data.totalRevenue > 0 ? `৳${data.totalRevenue.toLocaleString()}` : 'Setup needed',
    action: data.totalRevenue === 0 ? 'Create Invoice' : undefined,
    priority: data.totalRevenue === 0 ? 'medium' : 'low',
  });

  // Activity trends
  if (data.recentActivities > 20) {
    insights.push({
      id: 'activity-high',
      type: 'metric',
      title: 'High Activity Period',
      description: `${data.recentActivities} activities logged in the last 24 hours. Your team is highly engaged! Peak productivity detected.`,
      metric: `${data.recentActivities} activities/24h`,
      priority: 'low',
    });
  }

  // General recommendations
  insights.push({
    id: 'general-tip',
    type: 'opportunity',
    title: 'Growth Strategy Suggestion',
    description: 'Consider setting up automated client health score calculations and package renewal reminders to reduce manual overhead and improve client retention by up to 35%.',
    action: 'Configure Automations',
    priority: 'medium',
  });

  return insights.sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    return pOrder[a.priority] - pOrder[b.priority];
  });
}

export default function AIInsightsView() {
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [
        clientsRes,
        activeClientsRes,
        deliverablesRes,
        overdueInvoicesRes,
        campaignsRes,
        revenueRes,
        activitiesRes,
      ] = await Promise.allSettled([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('deliverables').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress', 'review', 'revision']),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).in('status', ['active', 'pending']),
        supabase.from('invoices').select('total_amount').eq('status', 'paid'),
        supabase.from('activities').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const getCount = (r: PromiseSettledResult<{ count: number | null }>) =>
        r.status === 'fulfilled' ? (r.value?.count ?? 0) : 0;
      const getRevenue = (r: PromiseSettledResult<{ data: { total_amount: number }[] | null }>) => {
        if (r.status !== 'fulfilled' || !r.value?.data) return 0;
        return r.value.data.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);
      };

      const data: InsightData = {
        totalClients: getCount(clientsRes as PromiseSettledResult<{ count: number | null }>),
        activeClients: getCount(activeClientsRes as PromiseSettledResult<{ count: number | null }>),
        pendingDeliverables: getCount(deliverablesRes as PromiseSettledResult<{ count: number | null }>),
        overdueInvoices: getCount(overdueInvoicesRes as PromiseSettledResult<{ count: number | null }>),
        activeCompaigns: getCount(campaignsRes as PromiseSettledResult<{ count: number | null }>),
        totalRevenue: getRevenue(revenueRes as PromiseSettledResult<{ data: { total_amount: number }[] | null }>),
        recentActivities: getCount(activitiesRes as PromiseSettledResult<{ count: number | null }>),
      };

      setInsights(generateInsights(data));
    } catch (error) {
      console.error('[AIInsights] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = insights.filter((i) => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-titan-purple/30 to-titan-cyan/20 border border-titan-purple/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-titan-purple" />
              <div className="absolute inset-0 rounded-xl animate-glow-pulse opacity-30" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
                AI Insights
                <Sparkles className="w-4 h-4 text-titan-purple" />
              </h1>
              <p className="font-mono-data text-[10px] text-white/30">
                {insights.length} insights generated • {insights.filter((i) => i.priority === 'high').length} high priority
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            Regenerate
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Search insights..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 text-xs h-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            {[
              { key: 'all', label: 'All', icon: Zap },
              { key: 'warning', label: 'Warnings', icon: AlertTriangle },
              { key: 'prediction', label: 'Predictions', icon: TrendingUp },
              { key: 'opportunity', label: 'Opportunities', icon: Lightbulb },
              { key: 'metric', label: 'Metrics', icon: BarChart3 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-[10px] font-mono-data transition-colors border flex items-center gap-1',
                  filterType === key
                    ? 'bg-titan-cyan/15 text-titan-cyan border-titan-cyan/30'
                    : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/60'
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Brain className="w-10 h-10 text-titan-purple/40 animate-pulse" />
                <Sparkles className="w-4 h-4 text-titan-cyan absolute -top-1 -right-1 animate-bounce" />
              </div>
              <p className="font-mono-data text-xs text-white/30">Analyzing your data...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Brain className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="font-display font-bold text-sm text-white/30">No insights found</p>
              <p className="font-mono-data text-[10px] text-white/20 mt-1">Try changing your filters</p>
            </div>
          </div>
        ) : (
          <div className="p-4 lg:p-6 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Insights', value: insights.length, icon: Brain, color: 'titan-purple' },
                { label: 'High Priority', value: insights.filter((i) => i.priority === 'high').length, icon: AlertTriangle, color: 'titan-magenta' },
                { label: 'Opportunities', value: insights.filter((i) => i.type === 'opportunity').length, icon: Lightbulb, color: 'titan-lime' },
                { label: 'Predictions', value: insights.filter((i) => i.type === 'prediction').length, icon: TrendingUp, color: 'titan-cyan' },
              ].map((card) => (
                <div
                  key={card.label}
                  className={cn(
                    'p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors'
                  )}
                >
                  <card.icon className={cn('w-5 h-5 mb-2', `text-${card.color}`)} />
                  <p className="font-display font-extrabold text-2xl text-white">{card.value}</p>
                  <p className="font-mono-data text-[10px] text-white/30 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Insights Cards */}
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((insight, index) => {
                  const config = typeConfig[insight.type];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer',
                        config.border,
                        'bg-gradient-to-r from-white/[0.02] to-transparent',
                        `hover:${config.glow}`
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
                          <Icon className={cn('w-4.5 h-4.5', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-sm text-white/90">{insight.title}</h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] shrink-0',
                                insight.priority === 'high'
                                  ? 'border-red-500/30 text-red-400 bg-red-500/10'
                                  : insight.priority === 'medium'
                                    ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                                    : 'border-green-500/30 text-green-400 bg-green-500/10'
                              )}
                            >
                              {insight.priority}
                            </Badge>
                          </div>
                          <p className="font-mono-data text-[11px] text-white/50 leading-relaxed">
                            {insight.description}
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            {insight.metric && (
                              <span className={cn('font-mono-data text-xs font-bold', config.color)}>
                                {insight.metric}
                              </span>
                            )}
                            {insight.action && (
                              <button className="flex items-center gap-1 text-[10px] font-mono-data text-titan-cyan hover:text-titan-cyan/80 transition-colors">
                                {insight.action}
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
