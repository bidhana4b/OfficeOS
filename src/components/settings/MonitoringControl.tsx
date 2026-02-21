import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  MessageSquare,
  CheckSquare,
  Brain,
  Database,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
  Check,
  RefreshCw,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { systemHealth, errorLogs as mockErrorLogs } from './defaults';
import { useErrorLogs } from '@/hooks/useSettings';

export default function MonitoringControl() {
  const [health] = useState(systemHealth);
  const errorLogsQuery = useErrorLogs();
  const [filterType, setFilterType] = useState<'all' | 'api' | 'messaging' | 'payment'>('all');

  const logs = errorLogsQuery.data.length > 0
    ? errorLogsQuery.data.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        type: (e.type as string) || 'api',
        message: (e.message as string) || '',
        timestamp: e.created_at ? new Date(e.created_at as string).toLocaleString() : '',
        severity: (e.severity as 'critical' | 'warning' | 'info') || 'info',
        resolved: (e.resolved as boolean) || false,
      }))
    : [];

  const filteredLogs = filterType === 'all' ? logs : logs.filter((l) => l.type === filterType);

  const severityConfig = {
    critical: { icon: XCircle, color: 'text-titan-magenta', bg: 'bg-titan-magenta/10', border: 'border-titan-magenta/30' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-titan-cyan/10 border border-titan-cyan/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-titan-cyan" />
          </div>
          System Monitoring
        </h2>
        <p className="font-mono text-xs text-white/30 mt-1">Live system health, performance metrics, and error logs</p>
      </div>

      {/* Live System Health */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
            <Server className="w-4 h-4 text-titan-cyan/60" />
            Live System Health
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-titan-lime animate-pulse" />
            <span className="font-mono text-[10px] text-titan-lime">All Systems Operational</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <HealthMetric
            icon={Users}
            label="Active Users"
            value={health.activeUsers.toString()}
            suffix="online"
            color="cyan"
          />
          <HealthMetric
            icon={MessageSquare}
            label="Messages / min"
            value={health.messagesPerMinute.toString()}
            suffix="msg/min"
            color="purple"
          />
          <HealthMetric
            icon={CheckSquare}
            label="Task Creation Rate"
            value={health.taskCreationRate.toString()}
            suffix="tasks/hr"
            color="lime"
          />
          <HealthMetric
            icon={Brain}
            label="AI Usage Rate"
            value={`${health.aiUsageRate}%`}
            color={health.aiUsageRate > 80 ? 'magenta' : 'cyan'}
            progress={health.aiUsageRate}
          />
          <HealthMetric
            icon={Database}
            label="DB Performance"
            value={`${health.dbPerformance}%`}
            color={health.dbPerformance > 90 ? 'lime' : 'magenta'}
            progress={health.dbPerformance}
          />
          <HealthMetric
            icon={Clock}
            label="Uptime"
            value={`${health.uptime}%`}
            color="lime"
            progress={health.uptime}
          />
        </div>
      </motion.div>

      {/* Error Logs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400/60" />
            Error Logs
          </h3>
          <div className="flex gap-1">
            {(['all', 'api', 'messaging', 'payment'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-mono text-[10px] transition-all',
                  filterType === type
                    ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/30'
                    : 'text-white/30 hover:text-white/50 border border-transparent'
                )}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const config = severityConfig[log.severity];
            const SeverityIcon = config.icon;
            return (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all',
                  log.resolved ? 'bg-white/[0.01] border-white/[0.03] opacity-50' : `${config.bg} ${config.border}`
                )}
              >
                <SeverityIcon className={cn('w-4 h-4 mt-0.5 shrink-0', log.resolved ? 'text-white/20' : config.color)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('font-mono text-xs', log.resolved ? 'text-white/30 line-through' : 'text-white/70')}>
                    {log.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-white/[0.04] text-white/30 uppercase">
                      {log.type}
                    </span>
                    <span className="font-mono text-[10px] text-white/20">{log.timestamp}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {log.resolved ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-titan-lime/50">
                      <Check className="w-3 h-3" /> Resolved
                    </span>
                  ) : (
                    <button className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/[0.04] text-white/40 hover:text-white/60 border border-white/10 hover:border-white/20 transition-all">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-white/[0.06] text-white/30 hover:text-white/50 font-mono text-[10px] transition-all">
          <RefreshCw className="w-3 h-3" />
          Refresh Logs
        </button>
      </motion.div>
    </div>
  );
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  progress,
}: {
  icon: any;
  label: string;
  value: string;
  suffix?: string;
  color: 'cyan' | 'purple' | 'lime' | 'magenta';
  progress?: number;
}) {
  const colorMap = {
    cyan: { text: 'text-titan-cyan', glow: 'shadow-titan-cyan/20', bar: 'bg-titan-cyan' },
    purple: { text: 'text-titan-purple', glow: 'shadow-titan-purple/20', bar: 'bg-titan-purple' },
    lime: { text: 'text-titan-lime', glow: 'shadow-titan-lime/20', bar: 'bg-titan-lime' },
    magenta: { text: 'text-titan-magenta', glow: 'shadow-titan-magenta/20', bar: 'bg-titan-magenta' },
  };
  const c = colorMap[color];

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-3.5 h-3.5', c.text)} />
        <span className="font-mono text-[10px] text-white/40">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('font-display font-extrabold text-xl', c.text)}>{value}</span>
        {suffix && <span className="font-mono text-[10px] text-white/20">{suffix}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn('h-full rounded-full', c.bar)}
          />
        </div>
      )}
    </div>
  );
}
