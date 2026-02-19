import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

interface SystemStatus {
  connected: boolean;
  hasClients: boolean;
  hasTeamMembers: boolean;
  hasDemoUsers: boolean;
  hasActivities: boolean;
  tablesCounted: number;
}

export default function SystemStatusBanner() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!supabase) {
      setStatus({ connected: false, hasClients: false, hasTeamMembers: false, hasDemoUsers: false, hasActivities: false, tablesCounted: 0 });
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const [clientsRes, teamRes, usersRes, activitiesRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('demo_users').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
      ]);

      const tables = [clientsRes, teamRes, usersRes, activitiesRes];
      const counted = tables.filter(r => !r.error).length;

      setStatus({
        connected: counted > 0,
        hasClients: (clientsRes.count || 0) > 0,
        hasTeamMembers: (teamRes.count || 0) > 0,
        hasDemoUsers: (usersRes.count || 0) > 0,
        hasActivities: (activitiesRes.count || 0) > 0,
        tablesCounted: counted,
      });
    } catch {
      setStatus({ connected: false, hasClients: false, hasTeamMembers: false, hasDemoUsers: false, hasActivities: false, tablesCounted: 0 });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  if (dismissed || checking) return null;
  if (!status) return null;

  // If everything looks good, show a brief success indicator
  const allGood = status.connected && status.hasClients && status.hasTeamMembers && status.hasDemoUsers;

  if (allGood) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="px-4 py-1.5 bg-titan-lime/[0.06] border-b border-titan-lime/10 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-titan-lime/60" />
          <span className="text-[10px] font-mono text-titan-lime/50">
            System connected — live data active
          </span>
          <Wifi className="w-3 h-3 text-titan-lime/40" />
        </div>
        <button onClick={() => setDismissed(true)} className="p-0.5 hover:bg-white/5 rounded">
          <X className="w-3 h-3 text-white/20" />
        </button>
      </motion.div>
    );
  }

  // Show warning banner
  const issues: string[] = [];
  if (!status.connected) issues.push('Database disconnected');
  if (!status.hasClients) issues.push('No clients in DB');
  if (!status.hasTeamMembers) issues.push('No team members in DB');
  if (!status.hasDemoUsers) issues.push('No login accounts');
  if (!status.hasActivities) issues.push('No activity data');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="px-4 py-2 bg-yellow-500/[0.06] border-b border-yellow-500/10 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {status.connected ? (
              <Database className="w-3.5 h-3.5 text-yellow-500/60" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400/60" />
            )}
            <span className="text-[10px] font-mono text-yellow-500/70 font-medium">
              {status.connected ? 'DB connected but incomplete' : 'DB not connected'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {issues.map((issue, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-[9px] font-mono text-yellow-500/50">
                {issue}
              </span>
            ))}
          </div>
          <span className="text-[9px] font-mono text-white/20">
            Some components showing demo data
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={checkStatus}
            className="p-1 hover:bg-white/5 rounded transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={cn('w-3 h-3 text-white/20', checking && 'animate-spin')} />
          </button>
          <button onClick={() => setDismissed(true)} className="p-0.5 hover:bg-white/5 rounded">
            <X className="w-3 h-3 text-white/20" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
