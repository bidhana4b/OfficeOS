import {
  MessageCircle,
  CheckCircle2,
  CreditCard,
  Rocket,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { activityData as mockActivityData } from './mock-data';
import type { ActivityItem } from './types';

interface ActivityFeedProps {
  data?: ActivityItem[];
  loading?: boolean;
}

const typeConfig = {
  message: {
    icon: MessageCircle,
    color: 'text-titan-cyan',
    bg: 'bg-titan-cyan/10',
    borderPulse: 'border-titan-cyan/20',
  },
  task: {
    icon: CheckCircle2,
    color: 'text-titan-lime',
    bg: 'bg-titan-lime/10',
    borderPulse: 'border-titan-lime/20',
  },
  payment: {
    icon: CreditCard,
    color: 'text-titan-purple',
    bg: 'bg-titan-purple/10',
    borderPulse: 'border-titan-purple/20',
  },
  campaign: {
    icon: Rocket,
    color: 'text-titan-cyan',
    bg: 'bg-titan-cyan/10',
    borderPulse: 'border-titan-cyan/20',
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-titan-magenta',
    bg: 'bg-titan-magenta/10',
    borderPulse: 'border-titan-magenta/20',
  },
};

export default function ActivityFeed({ data, loading }: ActivityFeedProps) {
  const activityData = data && data.length > 0 ? data : mockActivityData;

  return (
    <div className="glass-card border border-white/[0.06] rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-titan-cyan/60" />
          <h3 className="font-display font-bold text-sm text-white">Live Activity</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
          <span className="font-mono-data text-[10px] text-white/30">{loading ? 'Loading...' : 'Real-time'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activityData.map((item, index) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 px-5 py-3.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-300',
                config.bg,
                'group-hover:scale-105'
              )}>
                <Icon className={cn('w-4 h-4', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono-data text-xs text-white/80 truncate">{item.title}</p>
                </div>
                <p className="font-mono-data text-[10px] text-white/30 mt-0.5 truncate">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.client && (
                    <span className="font-mono-data text-[9px] text-titan-cyan/50 bg-titan-cyan/[0.06] px-1.5 py-0.5 rounded">
                      {item.client}
                    </span>
                  )}
                  <span className="font-mono-data text-[9px] text-white/20">{item.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
