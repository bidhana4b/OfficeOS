import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  Users,
  Heart,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  Calendar,
  FileText,
  Package,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface ClientData {
  id: string;
  business_name: string;
  health_score: number;
  status: string;
  category: string;
  contact_email: string;
  package_name?: string;
  pending_deliverables?: number;
}

interface PendingTask {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  client_name: string;
  due_date: string | null;
}

interface InvoiceAlert {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  client_name: string;
  due_date: string | null;
}

export default function AccountManagerDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [invoiceAlerts, setInvoiceAlerts] = useState<InvoiceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch clients with package info
      const { data: clientsData } = await supabase
        .from('clients')
        .select(`
          id, business_name, health_score, status, category, contact_email,
          client_packages(
            package:packages(name),
            is_active
          )
        `)
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('health_score', { ascending: true });

      if (clientsData) {
        setClients(clientsData.map((c: any) => {
          const activePkg = c.client_packages?.find((cp: any) => cp.is_active);
          return {
            ...c,
            package_name: activePkg?.package?.name || 'No Package',
          };
        }));
      }

      // Fetch pending deliverables
      const { data: delData } = await supabase
        .from('deliverables')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .in('status', ['pending', 'in_progress', 'review', 'revision'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (delData) {
        setTasks(delData.map((d: any) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          status: d.status,
          priority: d.priority || 'normal',
          client_name: d.clients?.business_name || 'Unknown',
          due_date: d.due_date,
        })));
      }

      // Fetch overdue/pending invoices
      const { data: invData } = await supabase
        .from('invoices')
        .select('*, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(10);

      if (invData) {
        setInvoiceAlerts(invData.map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.amount,
          status: inv.status,
          client_name: inv.clients?.business_name || 'Unknown',
          due_date: inv.due_date,
        })));
      }
    } catch (e) {
      console.error('AccountManagerDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeClients = clients.filter(c => c.status === 'active');
  const atRiskClients = clients.filter(c => c.health_score < 50 && c.status === 'active');
  const overdueInvoices = invoiceAlerts.filter(i => i.status === 'overdue');
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');

  const healthColor = (score: number) => {
    if (score >= 80) return 'text-titan-lime';
    if (score >= 50) return 'text-yellow-400';
    return 'text-titan-magenta';
  };

  const healthBg = (score: number) => {
    if (score >= 80) return 'bg-titan-lime';
    if (score >= 50) return 'bg-yellow-400';
    return 'bg-titan-magenta';
  };

  const stats = [
    { label: 'Active Clients', value: activeClients.length, icon: Users, color: 'titan-cyan', bg: 'from-titan-cyan/15 to-titan-cyan/5' },
    { label: 'At Risk', value: atRiskClients.length, icon: AlertTriangle, color: 'titan-magenta', bg: 'from-titan-magenta/15 to-titan-magenta/5' },
    { label: 'Pending Tasks', value: tasks.length, icon: Clock, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5' },
    { label: 'Overdue Invoices', value: overdueInvoices.length, icon: FileText, color: 'yellow-400', bg: 'from-yellow-500/15 to-yellow-500/5' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-titan-lime/30 border-t-titan-lime rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-lime/20 to-titan-cyan/10 border border-titan-lime/30 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-titan-lime" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white">
              Account <span className="text-gradient-cyan">Manager</span>
            </h1>
            <p className="font-mono-data text-xs text-white/30">
              {user?.display_name || 'Account Manager'} — Client Health & Tasks
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={cn(
                'relative rounded-xl border border-white/[0.06] p-4',
                'bg-gradient-to-br', stat.bg,
                'hover:border-white/[0.12] transition-all duration-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn('w-5 h-5', `text-${stat.color}`)} />
                <span className={cn('font-display font-extrabold text-2xl', `text-${stat.color}`)}>
                  {stat.value}
                </span>
              </div>
              <p className="font-mono-data text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Client Health Scores */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-titan-magenta" /> Client Health Scores
            </h2>
            <span className="font-mono-data text-[10px] text-white/30">{clients.length} clients</span>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No clients found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-hide">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-titan-cyan/10 to-titan-purple/10 border border-white/[0.06] flex items-center justify-center">
                    <span className="font-display font-bold text-xs text-white/60">
                      {c.business_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm text-white truncate">{c.business_name}</p>
                      {c.health_score < 50 && <AlertTriangle className="w-3 h-3 text-titan-magenta shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono-data text-[10px] text-white/30">{c.package_name}</span>
                      <span className="text-white/10">•</span>
                      <span className="font-mono-data text-[10px] text-white/30 capitalize">{c.category || 'General'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06]">
                        <div
                          className={cn('h-full rounded-full', healthBg(c.health_score))}
                          style={{ width: `${c.health_score}%` }}
                        />
                      </div>
                      <span className={cn('font-mono-data text-xs font-bold', healthColor(c.health_score))}>
                        {c.health_score}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Pending Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-titan-purple" /> Pending Tasks
            </h2>
            <span className="font-mono-data text-[10px] text-white/30">{tasks.length}</span>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-hide">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-white/20">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="font-mono text-xs">All caught up!</p>
              </div>
            ) : (
              tasks.slice(0, 12).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    t.priority === 'urgent' ? 'bg-red-500' :
                    t.priority === 'high' ? 'bg-orange-500' : 'bg-titan-cyan'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xs text-white truncate">{t.title}</p>
                    <p className="font-mono-data text-[9px] text-white/30">{t.client_name}</p>
                  </div>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-mono',
                    t.status === 'review' ? 'bg-titan-purple/20 text-titan-purple' :
                    t.status === 'revision' ? 'bg-titan-magenta/20 text-titan-magenta' :
                    'bg-white/10 text-white/40'
                  )}>
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Invoice Alerts */}
      {invoiceAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(
            'rounded-xl p-4',
            overdueInvoices.length > 0
              ? 'bg-titan-magenta/5 border border-titan-magenta/20'
              : 'bg-yellow-500/5 border border-yellow-500/20'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className={cn('w-5 h-5', overdueInvoices.length > 0 ? 'text-titan-magenta' : 'text-yellow-400')} />
            <h3 className={cn('font-display font-bold text-sm', overdueInvoices.length > 0 ? 'text-titan-magenta' : 'text-yellow-400')}>
              Billing Alerts ({invoiceAlerts.length} invoices pending)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {invoiceAlerts.map((inv) => (
              <div
                key={inv.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg border',
                  inv.status === 'overdue'
                    ? 'bg-titan-magenta/5 border-titan-magenta/10'
                    : 'bg-yellow-500/5 border-yellow-500/10'
                )}
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-white">{inv.invoice_number}</p>
                  <p className="font-mono-data text-[9px] text-white/30">{inv.client_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-data text-xs text-white font-bold">${Number(inv.amount).toLocaleString()}</p>
                  <p className={cn(
                    'font-mono-data text-[9px]',
                    inv.status === 'overdue' ? 'text-titan-magenta' : 'text-yellow-400'
                  )}>
                    {inv.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
