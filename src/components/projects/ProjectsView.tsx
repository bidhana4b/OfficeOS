/**
 * TITAN DEV AI — Projects/Deliverables View
 * Full-page view for managing all deliverables across clients
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Calendar,
  User,
  Building2,
  ArrowUpRight,
  LayoutGrid,
  List,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { subscribeToTable, getDeliverablesForExport, bulkUpdateDeliverableStatus, bulkAssignDeliverables } from '@/lib/data-service';
import { exportCSV, deliverableExportColumns } from '@/lib/export-utils';
import { DataSourceIndicator } from '@/components/ui/data-source-indicator';

interface Deliverable {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: string;
  created_at: string;
  progress: number;
  client_id: string;
  assignee_id?: string;
  deliverable_type?: string;
  clients?: { business_name: string; status: string };
  team_members?: { name: string; role: string; avatar_url?: string };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-400', icon: Clock, bg: 'bg-yellow-400/10' },
  in_progress: { label: 'In Progress', color: 'text-titan-cyan', icon: ArrowUpRight, bg: 'bg-titan-cyan/10' },
  review: { label: 'Review', color: 'text-titan-magenta', icon: AlertTriangle, bg: 'bg-titan-magenta/10' },
  revision: { label: 'Revision', color: 'text-orange-400', icon: RefreshCw, bg: 'bg-orange-400/10' },
  completed: { label: 'Completed', color: 'text-titan-lime', icon: CheckCircle2, bg: 'bg-titan-lime/10' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', icon: XCircle, bg: 'bg-red-400/10' },
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

type ViewMode = 'kanban' | 'list' | 'grid';
type FilterStatus = 'all' | 'pending' | 'in_progress' | 'review' | 'revision' | 'completed';

export default function ProjectsView() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const fetchDeliverables = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from('deliverables')
        .select('*, clients(business_name, status), team_members(name, role, avatar_url)')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeliverables(data || []);
    } catch (error) {
      console.error('[ProjectsView] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchDeliverables();
    const unsub = subscribeToTable('deliverables', () => fetchDeliverables());
    return () => unsub();
  }, [fetchDeliverables]);

  const filtered = deliverables.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(q) ||
      d.clients?.business_name?.toLowerCase().includes(q) ||
      d.team_members?.name?.toLowerCase().includes(q) ||
      d.deliverable_type?.toLowerCase().includes(q)
    );
  });

  const statusCounts = deliverables.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const kanbanColumns = [
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'revision', label: 'Revision' },
    { id: 'completed', label: 'Completed' },
  ];

  const getDaysLeft = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-purple/20 to-titan-cyan/20 border border-titan-purple/30 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-titan-purple" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg text-white">
                Projects & Deliverables
              </h1>
              <div className="flex items-center gap-2">
                <p className="font-mono-data text-[10px] text-white/30">
                  {deliverables.length} total • {statusCounts['in_progress'] || 0} in progress • {statusCounts['review'] || 0} in review
                </p>
                <DataSourceIndicator isRealData={deliverables.length > 0} size="xs" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5">
              {([
                { mode: 'kanban' as ViewMode, icon: Layers, label: 'Kanban' },
                { mode: 'grid' as ViewMode, icon: LayoutGrid, label: 'Grid' },
                { mode: 'list' as ViewMode, icon: List, label: 'List' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-[10px] font-mono-data flex items-center gap-1.5 transition-colors',
                    viewMode === mode
                      ? 'bg-titan-cyan/15 text-titan-cyan'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const data = await getDeliverablesForExport();
                  exportCSV(data, deliverableExportColumns, 'titan_deliverables');
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }}
              className="bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"
              title="Export CSV"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDeliverables}
              className="bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Search deliverables, clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 text-xs h-9"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            {(['all', 'pending', 'in_progress', 'review', 'revision', 'completed'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-mono-data transition-colors border',
                  filterStatus === s
                    ? 'bg-titan-cyan/15 text-titan-cyan border-titan-cyan/30'
                    : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/60'
                )}
              >
                {s === 'all' ? 'All' : statusConfig[s]?.label || s}
                {s !== 'all' && statusCounts[s] ? ` (${statusCounts[s]})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
              <p className="font-mono-data text-xs text-white/30">Loading projects...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FolderKanban className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="font-display font-bold text-sm text-white/30">No deliverables found</p>
              <p className="font-mono-data text-[10px] text-white/20 mt-1">
                {search ? 'Try a different search term' : 'Create deliverables from the Packages hub'}
              </p>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban View */
          <div className="flex gap-4 p-4 lg:p-6 overflow-x-auto min-h-0">
            {kanbanColumns.map((col) => {
              const colItems = filtered.filter((d) => d.status === col.id);
              const config = statusConfig[col.id];
              return (
                <div key={col.id} className="flex-shrink-0 w-[280px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    {config && <config.icon className={cn('w-4 h-4', config.color)} />}
                    <span className="font-display font-bold text-xs text-white/70">{col.label}</span>
                    <span className="ml-auto font-mono-data text-[10px] text-white/30">
                      {colItems.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {colItems.map((d) => (
                        <DeliverableCard key={d.id} deliverable={d} getDaysLeft={getDaysLeft} />
                      ))}
                    </AnimatePresence>
                    {colItems.length === 0 && (
                      <div className="p-4 rounded-lg border border-dashed border-white/[0.06] text-center">
                        <p className="font-mono-data text-[10px] text-white/20">No items</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="p-4 lg:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} getDaysLeft={getDaysLeft} />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="p-4 lg:p-6 space-y-1.5">
            {/* List Header */}
            <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] font-mono-data text-white/30 uppercase tracking-wider">
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-2">Assignee</div>
              <div className="col-span-2">Deadline</div>
            </div>
            {filtered.map((d) => {
              const config = statusConfig[d.status] || statusConfig.pending;
              const daysLeft = getDaysLeft(d.deadline);
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-12 gap-3 px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all cursor-pointer items-center"
                >
                  <div className="col-span-4">
                    <p className="font-display font-semibold text-xs text-white/90 truncate">{d.title}</p>
                    {d.deliverable_type && (
                      <p className="font-mono-data text-[9px] text-white/30 mt-0.5">{d.deliverable_type}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="font-mono-data text-[10px] text-white/50 truncate block">
                      {d.clients?.business_name || '—'}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <Badge variant="outline" className={cn('text-[9px] border', config.bg, config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="col-span-1">
                    <Badge variant="outline" className={cn('text-[9px]', priorityColors[d.priority] || priorityColors.medium)}>
                      {d.priority}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="font-mono-data text-[10px] text-white/50 truncate block">
                      {d.team_members?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {d.deadline ? (
                      <span className={cn(
                        'font-mono-data text-[10px]',
                        daysLeft !== null && daysLeft < 0 ? 'text-red-400' :
                          daysLeft !== null && daysLeft <= 3 ? 'text-yellow-400' : 'text-white/40'
                      )}>
                        {new Date(d.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {daysLeft !== null && (
                          <span className="ml-1 opacity-60">
                            ({daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="font-mono-data text-[10px] text-white/20">No deadline</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function DeliverableCard({
  deliverable: d,
  getDaysLeft,
}: {
  deliverable: Deliverable;
  getDaysLeft: (deadline?: string) => number | null;
}) {
  const config = statusConfig[d.status] || statusConfig.pending;
  const daysLeft = getDaysLeft(d.deadline);
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer group"
    >
      {/* Top row: type + priority */}
      <div className="flex items-center justify-between mb-2">
        {d.deliverable_type && (
          <span className="font-mono-data text-[9px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">
            {d.deliverable_type}
          </span>
        )}
        <Badge
          variant="outline"
          className={cn('text-[9px] ml-auto', priorityColors[d.priority] || priorityColors.medium)}
        >
          {d.priority}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="font-display font-semibold text-xs text-white/90 mb-2 line-clamp-2">{d.title}</h4>

      {/* Progress bar */}
      {d.progress > 0 && (
        <div className="w-full h-1 rounded-full bg-white/[0.06] mb-2.5">
          <div
            className={cn('h-full rounded-full transition-all', config.color.replace('text-', 'bg-'))}
            style={{ width: `${Math.min(d.progress, 100)}%` }}
          />
        </div>
      )}

      {/* Client */}
      {d.clients?.business_name && (
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="w-3 h-3 text-white/20" />
          <span className="font-mono-data text-[10px] text-white/40 truncate">
            {d.clients.business_name}
          </span>
        </div>
      )}

      {/* Footer: assignee + deadline */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-white/20" />
          <span className="font-mono-data text-[10px] text-white/40">
            {d.team_members?.name || 'Unassigned'}
          </span>
        </div>
        {d.deadline ? (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-white/20" />
            <span
              className={cn(
                'font-mono-data text-[10px]',
                daysLeft !== null && daysLeft < 0
                  ? 'text-red-400'
                  : daysLeft !== null && daysLeft <= 3
                    ? 'text-yellow-400'
                    : 'text-white/30'
              )}
            >
              {daysLeft !== null
                ? daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : `${daysLeft}d left`
                : new Date(d.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ) : (
          <StatusIcon className={cn('w-3.5 h-3.5', config.color)} />
        )}
      </div>
    </motion.div>
  );
}
