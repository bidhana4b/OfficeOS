import { Database, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSourceIndicatorProps {
  isRealData: boolean;
  className?: string;
}

export function DataSourceIndicator({ isRealData, className }: DataSourceIndicatorProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono',
      isRealData
        ? 'bg-titan-lime/10 text-titan-lime/60 border border-titan-lime/20'
        : 'bg-yellow-500/10 text-yellow-500/60 border border-yellow-500/20',
      className
    )}>
      {isRealData ? (
        <>
          <Database className="w-2.5 h-2.5" />
          <span>Live</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-2.5 h-2.5" />
          <span>Demo</span>
        </>
      )}
    </div>
  );
}
