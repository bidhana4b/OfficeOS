import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'spinner' | 'skeleton' | 'pulse';
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md', 
  className,
  variant = 'spinner',
}: LoadingStateProps) {
  const sizeConfig = {
    sm: { spinner: 'w-5 h-5', text: 'text-[10px]' },
    md: { spinner: 'w-8 h-8', text: 'text-xs' },
    lg: { spinner: 'w-12 h-12', text: 'text-sm' },
  };

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3 animate-pulse', className)}>
        <div className="h-4 bg-white/[0.06] rounded-lg w-3/4" />
        <div className="h-4 bg-white/[0.06] rounded-lg w-1/2" />
        <div className="h-4 bg-white/[0.06] rounded-lg w-5/6" />
        <div className="h-4 bg-white/[0.06] rounded-lg w-2/3" />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-titan-cyan/60 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className={cn('font-mono text-white/30', sizeConfig[size].text)}>{message}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}>
      <Loader2 className={cn(
        sizeConfig[size].spinner,
        'text-titan-cyan animate-spin'
      )} />
      <p className={cn('font-mono text-white/30', sizeConfig[size].text)}>{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon, 
  title = 'No data', 
  description = 'Nothing to show here yet',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-3 text-white/20">{icon}</div>}
      <h4 className="font-display font-bold text-sm text-white/40 mb-1">{title}</h4>
      <p className="font-mono text-xs text-white/20 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface DataErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function DataError({ error, onRetry, className }: DataErrorProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
      <div className="w-10 h-10 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-titan-magenta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="font-mono text-xs text-white/40 mb-3 max-w-xs">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default LoadingState;
