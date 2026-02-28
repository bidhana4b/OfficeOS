import { motion } from 'framer-motion';
import {
  Users,
  Package,
  Clock,
  Megaphone,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamDashboardSummary } from './types';

interface TeamDashboardCardsProps {
  summary?: TeamDashboardSummary | null;
  loading?: boolean;
}

function buildSummaryCards(summary: TeamDashboardSummary) {
  return [
    {
      label: 'Active Clients',
      value: summary.totalActiveClients,
      icon: Users,
      color: 'cyan' as const,
      change: summary.totalActiveClients > 0 ? `${summary.totalActiveClients} active` : 'No clients',
      changeType: summary.totalActiveClients > 0 ? 'positive' as const : 'negative' as const,
    },
    {
      label: 'Active Deliverables',
      value: summary.totalActiveDeliverables,
      icon: Package,
      color: 'purple' as const,
      change: summary.totalActiveDeliverables > 0 ? `${summary.totalActiveDeliverables} tracked` : 'No deliverables',
      changeType: summary.totalActiveDeliverables > 0 ? 'positive' as const : 'negative' as const,
    },
    {
      label: 'Pending Approvals',
      value: summary.pendingApprovals,
      icon: Clock,
      color: 'magenta' as const,
      change: summary.pendingApprovals > 0 ? `${summary.pendingApprovals} awaiting review` : 'All clear',
      changeType: summary.pendingApprovals > 0 ? 'negative' as const : 'positive' as const,
    },
    {
      label: 'Running Campaigns',
      value: summary.runningCampaigns,
      icon: Megaphone,
      color: 'lime' as const,
      change: summary.runningCampaigns > 0 ? `${summary.runningCampaigns} live` : 'No campaigns',
      changeType: summary.runningCampaigns > 0 ? 'positive' as const : 'negative' as const,
    },
    {
      label: 'Overdue Tasks',
      value: summary.overdueTasks,
      icon: AlertTriangle,
      color: 'magenta' as const,
      change: summary.overdueTasks > 0 ? 'Needs attention' : 'All caught up',
      changeType: summary.overdueTasks > 0 ? 'negative' as const : 'positive' as const,
    },
    {
      label: 'Overloaded Members',
      value: summary.lowPackageClients,
      icon: AlertOctagon,
      color: 'magenta' as const,
      change: summary.lowPackageClients > 0 ? 'Redistribute tasks' : 'Balanced',
      changeType: summary.lowPackageClients > 0 ? 'negative' as const : 'positive' as const,
    },
  ];
}

const colorConfig = {
  cyan: {
    bg: 'from-titan-cyan/15 to-titan-cyan/5',
    border: 'border-titan-cyan/20',
    iconBg: 'bg-titan-cyan/10',
    iconText: 'text-titan-cyan',
  },
  purple: {
    bg: 'from-titan-purple/15 to-titan-purple/5',
    border: 'border-titan-purple/20',
    iconBg: 'bg-titan-purple/10',
    iconText: 'text-titan-purple',
  },
  magenta: {
    bg: 'from-titan-magenta/15 to-titan-magenta/5',
    border: 'border-titan-magenta/20',
    iconBg: 'bg-titan-magenta/10',
    iconText: 'text-titan-magenta',
  },
  lime: {
    bg: 'from-titan-lime/15 to-titan-lime/5',
    border: 'border-titan-lime/20',
    iconBg: 'bg-titan-lime/10',
    iconText: 'text-titan-lime',
  },
};

export default function TeamDashboardCards({ summary, loading }: TeamDashboardCardsProps) {
  const data = summary || { totalActiveClients: 0, totalActiveDeliverables: 0, pendingApprovals: 0, runningCampaigns: 0, overdueTasks: 0, lowPackageClients: 0 };
  const summaryCards = buildSummaryCards(data);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {summaryCards.map((card, index) => {
        const Icon = card.icon;
        const colors = colorConfig[card.color];
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            className={cn(
              'relative p-4 rounded-xl border backdrop-blur-[24px] bg-gradient-to-br transition-all duration-300',
              'hover:shadow-lg cursor-default group',
              colors.bg,
              colors.border
            )}
          >
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg mb-3', colors.iconBg)}>
              <Icon className={cn('w-4 h-4', colors.iconText)} />
            </div>
            <p className="font-mono-data text-[10px] text-white/40 tracking-wide mb-1 uppercase">
              {card.label}
            </p>
            <h3 className="font-display font-extrabold text-xl text-white">{card.value}</h3>
            <div className={cn(
              'flex items-center gap-1 mt-2 text-[10px] font-mono-data',
              card.changeType === 'positive' ? 'text-titan-lime/70' : 'text-titan-magenta/70'
            )}>
              {card.changeType === 'positive' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {card.change}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
