import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Rocket,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetricCard } from './types';

interface HeroMetricsProps {
  data?: MetricCard[];
  loading?: boolean;
}

const iconMap: Record<string, typeof DollarSign> = {
  'dollar-sign': DollarSign,
  'rocket': Rocket,
  'package': Package,
  'users': Users,
};

const colorConfig = {
  cyan: {
    bg: 'from-titan-cyan/15 to-titan-cyan/5',
    border: 'border-titan-cyan/20 hover:border-titan-cyan/40',
    glow: 'hover:shadow-[0_0_30px_rgba(0,217,255,0.15)]',
    iconBg: 'bg-titan-cyan/10',
    iconText: 'text-titan-cyan',
    accent: 'text-titan-cyan',
  },
  purple: {
    bg: 'from-titan-purple/15 to-titan-purple/5',
    border: 'border-titan-purple/20 hover:border-titan-purple/40',
    glow: 'hover:shadow-[0_0_30px_rgba(123,97,255,0.15)]',
    iconBg: 'bg-titan-purple/10',
    iconText: 'text-titan-purple',
    accent: 'text-titan-purple',
  },
  magenta: {
    bg: 'from-titan-magenta/15 to-titan-magenta/5',
    border: 'border-titan-magenta/20 hover:border-titan-magenta/40',
    glow: 'hover:shadow-[0_0_30px_rgba(255,0,110,0.15)]',
    iconBg: 'bg-titan-magenta/10',
    iconText: 'text-titan-magenta',
    accent: 'text-titan-magenta',
  },
  lime: {
    bg: 'from-titan-lime/15 to-titan-lime/5',
    border: 'border-titan-lime/20 hover:border-titan-lime/40',
    glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)]',
    iconBg: 'bg-titan-lime/10',
    iconText: 'text-titan-lime',
    accent: 'text-titan-lime',
  },
};

export default function HeroMetrics({ data, loading }: HeroMetricsProps) {
  const metricsData = data && data.length > 0 ? data : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-[120px] rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (metricsData.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {[
          { label: 'Revenue', color: 'cyan' },
          { label: 'Active Clients', color: 'purple' },
          { label: 'Deliverables', color: 'magenta' },
          { label: 'Team Load', color: 'lime' },
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <span className="font-mono-data text-[10px] text-white/30 uppercase tracking-wider">{item.label}</span>
            <p className="font-display font-bold text-2xl text-white/20 mt-2">—</p>
            <span className="font-mono-data text-[10px] text-white/20">No data yet</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
      {metricsData.map((metric, index) => {
        const Icon = iconMap[metric.icon] || DollarSign;
        const colors = colorConfig[metric.color];
        
        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
          >
            <button
              className={cn(
                'w-full text-left p-3 sm:p-4 lg:p-5 rounded-xl border backdrop-blur-[24px] transition-all duration-300 group cursor-pointer',
                'bg-gradient-to-br',
                colors.bg,
                colors.border,
                colors.glow,
                'active:scale-[0.98]'
              )}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div className={cn('flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg', colors.iconBg)}>
                  <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', colors.iconText)} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
              
              <p className="font-mono-data text-[9px] sm:text-[11px] text-white/40 tracking-wide mb-0.5 sm:mb-1 truncate">{metric.title}</p>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                <h3 className="font-display font-extrabold text-lg sm:text-xl lg:text-2xl text-white">{metric.value}</h3>
                <div className={cn(
                  'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono-data w-fit',
                  metric.changeType === 'positive' ? 'bg-titan-lime/10 text-titan-lime' :
                  metric.changeType === 'negative' ? 'bg-titan-magenta/10 text-titan-magenta' :
                  'bg-white/[0.06] text-white/40'
                )}>
                  {metric.changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> :
                   metric.changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> :
                   <Minus className="w-3 h-3" />}
                  {metric.change}
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 mt-3">
                <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', 
                  metric.color === 'cyan' ? 'bg-titan-cyan' :
                  metric.color === 'purple' ? 'bg-titan-purple' :
                  metric.color === 'magenta' ? 'bg-titan-magenta' : 'bg-titan-lime'
                )} />
                <span className="font-mono-data text-[9px] text-white/20">Live</span>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
