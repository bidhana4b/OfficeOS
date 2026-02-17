import { motion } from 'framer-motion';
import {
  Heart,
  Clock,
  Wallet,
  TrendingUp,
  Package,
  Rocket,
  BarChart3,
  Star,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceInsights, Workspace } from './types';

interface WorkspaceInsightPanelProps {
  workspace: Workspace;
  insights: WorkspaceInsights;
  onClose?: () => void;
}

export default function WorkspaceInsightPanel({
  workspace,
  insights,
  onClose,
}: WorkspaceInsightPanelProps) {
  const healthColor =
    insights.healthScore > 80
      ? 'text-titan-lime'
      : insights.healthScore > 50
        ? 'text-yellow-400'
        : 'text-titan-magenta';

  const healthBg =
    insights.healthScore > 80
      ? 'from-titan-lime/20 to-titan-lime/5'
      : insights.healthScore > 50
        ? 'from-yellow-400/20 to-yellow-400/5'
        : 'from-titan-magenta/20 to-titan-magenta/5';

  return (
    <div className="h-full flex flex-col w-[300px] bg-[#0D1029]/80 backdrop-blur-xl border-l border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-sm text-white">Workspace Insights</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 flex items-center justify-center text-xs font-display font-bold text-titan-cyan border border-titan-cyan/20">
            {workspace.clientLogo}
          </div>
          <div>
            <p className="font-display text-xs text-white font-semibold">{workspace.clientName}</p>
            <p className="font-mono-data text-[9px] text-white/30">Workspace ID: {workspace.id}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-4">
        {/* Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('p-3 rounded-xl bg-gradient-to-r border border-white/[0.06]', healthBg)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Heart className={cn('w-3.5 h-3.5', healthColor)} />
              <span className="font-mono-data text-[10px] text-white/50">Client Health Score</span>
            </div>
            <span className={cn('font-display font-bold text-lg', healthColor)}>
              {insights.healthScore}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${insights.healthScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                insights.healthScore > 80
                  ? 'bg-titan-lime'
                  : insights.healthScore > 50
                    ? 'bg-yellow-400'
                    : 'bg-titan-magenta'
              )}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/30" />
              <span className="font-mono-data text-[9px] text-white/30">
                Avg Response: {insights.responseTime}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="font-mono-data text-[9px] text-white/40">
                {insights.satisfaction}/5
              </span>
            </div>
          </div>
        </motion.div>

        {/* Package Usage */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-3 rounded-xl"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Package className="w-3.5 h-3.5 text-titan-cyan" />
            <span className="font-display font-semibold text-xs text-white">Package Usage</span>
          </div>
          <div className="space-y-3">
            {insights.packageUsage.map((pkg) => {
              const percentage = Math.round((pkg.used / pkg.total) * 100);
              const isWarning = percentage > 80;
              return (
                <div key={pkg.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-data text-[10px] text-white/50">{pkg.category}</span>
                    <div className="flex items-center gap-1.5">
                      {isWarning && <AlertTriangle className="w-2.5 h-2.5 text-titan-magenta" />}
                      <span
                        className={cn(
                          'font-mono-data text-[10px] font-bold',
                          isWarning ? 'text-titan-magenta' : 'text-white/60'
                        )}
                      >
                        {pkg.used}/{pkg.total}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: isWarning ? '#FF006E' : pkg.color,
                        boxShadow: `0 0 8px ${isWarning ? 'rgba(255,0,110,0.3)' : `${pkg.color}33`}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Boost Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-3 rounded-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-titan-magenta" />
              <span className="font-display font-semibold text-xs text-white">Boost Summary</span>
            </div>
            <span className="font-mono-data text-[9px] text-titan-cyan bg-titan-cyan/10 px-1.5 py-0.5 rounded-full">
              {insights.boostSummary.activeCampaigns} active
            </span>
          </div>

          {/* Budget Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono-data text-[9px] text-white/30">Budget</span>
              <span className="font-mono-data text-[10px] text-white/50">
                ${insights.boostSummary.spent.toLocaleString()} / ${insights.boostSummary.totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(insights.boostSummary.spent / insights.boostSummary.totalBudget) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-titan-magenta/80 to-titan-magenta"
              />
            </div>
          </div>

          {/* Platforms */}
          <div className="space-y-1.5">
            {insights.boostSummary.platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.03]"
              >
                <span className="font-mono-data text-[10px] text-white/50">{platform.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-[10px] text-white/60 font-semibold">
                    ${platform.spend.toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      'font-mono-data text-[8px] px-1.5 py-0.5 rounded-full',
                      platform.status === 'active'
                        ? 'bg-titan-lime/10 text-titan-lime'
                        : 'bg-white/[0.06] text-white/30'
                    )}
                  >
                    {platform.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Wallet Balance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-3 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-titan-lime" />
              <span className="font-mono-data text-[10px] text-white/50">Wallet Balance</span>
            </div>
            <span className="font-display font-bold text-base text-titan-lime">
              ${insights.walletBalance.toLocaleString()}
            </span>
          </div>
        </motion.div>

        {/* Deliverables Status */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-3 rounded-xl"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-titan-purple" />
            <span className="font-display font-semibold text-xs text-white">Deliverables</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: 'Pending',
                value: insights.deliverables.pending,
                icon: Clock,
                color: 'text-yellow-400',
                bg: 'bg-yellow-400/10',
              },
              {
                label: 'In Progress',
                value: insights.deliverables.inProgress,
                icon: Loader2,
                color: 'text-titan-cyan',
                bg: 'bg-titan-cyan/10',
              },
              {
                label: 'Completed',
                value: insights.deliverables.completed,
                icon: CheckCircle2,
                color: 'text-titan-lime',
                bg: 'bg-titan-lime/10',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={cn('p-2 rounded-lg text-center', item.bg)}>
                  <Icon className={cn('w-3.5 h-3.5 mx-auto mb-1', item.color)} />
                  <div className={cn('font-display font-bold text-sm', item.color)}>
                    {item.value}
                  </div>
                  <span className="font-mono-data text-[8px] text-white/30">{item.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-3 rounded-xl bg-gradient-to-r from-titan-purple/10 to-titan-cyan/10 border border-titan-purple/20"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-titan-purple" />
            <span className="font-display font-semibold text-xs text-white">AI Summary</span>
          </div>
          <p className="font-mono-data text-[10px] text-white/50 leading-relaxed">
            Client engagement is{' '}
            {insights.healthScore > 80 ? (
              <span className="text-titan-lime">strong</span>
            ) : insights.healthScore > 50 ? (
              <span className="text-yellow-400">moderate</span>
            ) : (
              <span className="text-titan-magenta">declining</span>
            )}
            . Package usage at{' '}
            {Math.round(
              insights.packageUsage.reduce((acc, p) => acc + (p.used / p.total) * 100, 0) /
                insights.packageUsage.length
            )}
            % average.{' '}
            {insights.boostSummary.activeCampaigns > 0
              ? `${insights.boostSummary.activeCampaigns} boost campaigns running.`
              : 'No active boost campaigns.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
