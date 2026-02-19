import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileImage,
  Video,
  PenTool,
  Calendar,
  Users,
  TrendingUp,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Deliverable {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  due_date: string | null;
  client_id: string;
  client_name?: string;
  created_at: string;
}

interface ClientInfo {
  id: string;
  business_name: string;
  health_score: number;
  status: string;
}

export default function DesignerDashboard() {
  const { user } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch deliverables assigned to this designer (via team_members)
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('role', 'designer')
        .limit(1)
        .maybeSingle();

      if (teamMember) {
        const { data: delData } = await supabase
          .from('deliverables')
          .select('*, clients(business_name)')
          .eq('assigned_to', teamMember.id)
          .eq('tenant_id', DEMO_TENANT_ID)
          .order('created_at', { ascending: false })
          .limit(20);

        if (delData) {
          setDeliverables(delData.map((d: any) => ({
            ...d,
            client_name: d.clients?.business_name || 'Unknown',
          })));
        }
      }

      // Fetch assigned clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, business_name, health_score, status')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('status', 'active')
        .order('business_name');

      if (clientsData) setClients(clientsData);
    } catch (e) {
      console.error('DesignerDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingDeliverables = deliverables.filter(d => d.status === 'in_progress' || d.status === 'pending');
  const reviewDeliverables = deliverables.filter(d => d.status === 'review');
  const completedDeliverables = deliverables.filter(d => d.status === 'completed' || d.status === 'delivered');
  const overdueDeliverables = deliverables.filter(d => {
    if (!d.due_date) return false;
    return new Date(d.due_date) < new Date() && d.status !== 'completed' && d.status !== 'delivered';
  });

  const typeIcon = (type: string) => {
    switch (type) {
      case 'photo_graphics': return <FileImage className="w-4 h-4" />;
      case 'video_edit': return <Video className="w-4 h-4" />;
      case 'copywriting': return <PenTool className="w-4 h-4" />;
      default: return <Palette className="w-4 h-4" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'in_progress': return 'bg-titan-cyan/20 text-titan-cyan border-titan-cyan/30';
      case 'review': return 'bg-titan-purple/20 text-titan-purple border-titan-purple/30';
      case 'completed': case 'delivered': return 'bg-titan-lime/20 text-titan-lime border-titan-lime/30';
      case 'revision': return 'bg-titan-magenta/20 text-titan-magenta border-titan-magenta/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const priorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-titan-cyan';
      case 'low': return 'bg-white/30';
      default: return 'bg-white/20';
    }
  };

  const stats = [
    { label: 'In Progress', value: pendingDeliverables.length, icon: Clock, color: 'titan-cyan', bg: 'from-titan-cyan/15 to-titan-cyan/5' },
    { label: 'In Review', value: reviewDeliverables.length, icon: Eye, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5' },
    { label: 'Completed', value: completedDeliverables.length, icon: CheckCircle2, color: 'titan-lime', bg: 'from-titan-lime/15 to-titan-lime/5' },
    { label: 'Overdue', value: overdueDeliverables.length, icon: AlertTriangle, color: 'titan-magenta', bg: 'from-titan-magenta/15 to-titan-magenta/5' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-titan-purple/30 border-t-titan-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-purple/20 to-titan-cyan/10 border border-titan-purple/30 flex items-center justify-center">
            <Palette className="w-5 h-5 text-titan-purple" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white">
              Designer <span className="text-gradient-cyan">Workspace</span>
            </h1>
            <p className="font-mono-data text-xs text-white/30">
              {user?.display_name || 'Designer'} — My Deliverables & Tasks
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
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
        {/* Active Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white">My Deliverables</h2>
            <span className="font-mono-data text-[10px] text-white/30">{deliverables.length} total</span>
          </div>

          {deliverables.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No deliverables assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {deliverables.slice(0, 15).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all group"
                >
                  <div className={cn('w-2 h-2 rounded-full shrink-0', priorityDot(d.priority))} />
                  <div className="text-white/40">{typeIcon(d.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-white truncate">{d.title}</p>
                    <p className="font-mono-data text-[10px] text-white/30">{d.client_name}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono border', statusColor(d.status))}>
                    {d.status.replace('_', ' ')}
                  </span>
                  {d.due_date && (
                    <span className="font-mono-data text-[10px] text-white/30 hidden sm:block">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(d.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Client List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white">Active Clients</h2>
            <Users className="w-4 h-4 text-white/30" />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
            {clients.length === 0 ? (
              <div className="text-center py-8 text-white/20">
                <Users className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="font-mono text-xs">No clients found</p>
              </div>
            ) : (
              clients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-titan-purple/20 to-titan-cyan/10 border border-white/[0.06] flex items-center justify-center">
                    <span className="font-display font-bold text-xs text-white/60">
                      {c.business_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xs text-white truncate">{c.business_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-titan-lime" />
                      <span className="font-mono-data text-[10px] text-white/30">
                        Health: {c.health_score || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Overdue Alert */}
      {overdueDeliverables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-titan-magenta/5 border border-titan-magenta/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-titan-magenta" />
            <h3 className="font-display font-bold text-sm text-titan-magenta">
              Overdue Deliverables ({overdueDeliverables.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {overdueDeliverables.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-titan-magenta/5 border border-titan-magenta/10">
                <RotateCcw className="w-3 h-3 text-titan-magenta shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-white truncate">{d.title}</p>
                  <p className="font-mono-data text-[9px] text-white/30">{d.client_name}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
