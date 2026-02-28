import { Database, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSourceIndicatorProps {
  isRealData: boolean;
  className?: string;
  label?: string;
  showPulse?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export function DataSourceIndicator({ isRealData, className, label, showPulse = true, size = 'xs' }: DataSourceIndicatorProps) {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[9px] gap-1',
    sm: 'px-2.5 py-1 text-[10px] gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
  };

  const iconSize = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <div className={cn(
      'inline-flex items-center rounded-full font-mono',
      sizeClasses[size],
      isRealData
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
      className
    )}>
      {showPulse && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          isRealData ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-500'
        )} />
      )}
      {isRealData ? (
        <>
          <Wifi className={iconSize[size]} />
          <span>{label || 'Live Data'}</span>
        </>
      ) : (
        <>
          <WifiOff className={iconSize[size]} />
          <span>{label || 'Demo Data'}</span>
        </>
      )}
    </div>
  );
}

interface SystemModeBannerProps {
  isLive: boolean;
  className?: string;
}

export function SystemModeBanner({ isLive, className }: SystemModeBannerProps) {
  if (isLive) return null;

  return (
    <div className={cn(
      'flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-mono',
      'bg-yellow-500/5 text-yellow-500/70 border-b border-yellow-500/10',
      className
    )}>
      <AlertCircle className="w-3.5 h-3.5" />
      <span>Demo Mode — Showing sample data. Create real data to see live updates.</span>
      <Database className="w-3.5 h-3.5" />
    </div>
  );
}
