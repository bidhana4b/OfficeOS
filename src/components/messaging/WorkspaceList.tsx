import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Pin,
  Filter,
  Plus,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workspace } from './types';

interface WorkspaceListProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelect: (workspace: Workspace) => void;
}

const statusConfig = {
  active: { icon: CheckCircle, color: 'text-titan-lime', bg: 'bg-titan-lime/10', label: 'Active' },
  paused: { icon: PauseCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Paused' },
  'at-risk': { icon: AlertTriangle, color: 'text-titan-magenta', bg: 'bg-titan-magenta/10', label: 'At Risk' },
  churning: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Churning' },
};

type FilterType = 'all' | 'active' | 'at-risk' | 'churning' | 'paused' | 'pinned';

export default function WorkspaceList({ workspaces, activeWorkspaceId, onSelect }: WorkspaceListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    let list = [...workspaces];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (ws) =>
          ws.clientName.toLowerCase().includes(q) ||
          ws.lastMessage.toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter === 'pinned') {
      list = list.filter((ws) => ws.pinned);
    } else if (filter !== 'all') {
      list = list.filter((ws) => ws.status === filter);
    }

    // Sort: pinned first, then by unread count, then by time
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return 0;
    });

    return list;
  }, [workspaces, search, filter]);

  const filterOptions: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All Workspaces', count: workspaces.length },
    { value: 'active', label: 'Active', count: workspaces.filter((w) => w.status === 'active').length },
    { value: 'at-risk', label: 'At Risk', count: workspaces.filter((w) => w.status === 'at-risk').length },
    { value: 'churning', label: 'Churning', count: workspaces.filter((w) => w.status === 'churning').length },
    { value: 'paused', label: 'Paused', count: workspaces.filter((w) => w.status === 'paused').length },
    { value: 'pinned', label: 'Pinned', count: workspaces.filter((w) => w.pinned).length },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0D1029]/95 backdrop-blur-xl border-r border-white/[0.06]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base text-white">Workspaces</h2>
          <div className="flex items-center gap-1.5">
            <span className="font-mono-data text-[10px] text-titan-cyan px-2 py-0.5 rounded-full bg-titan-cyan/10 border border-titan-cyan/20">
              {workspaces.length} clients
            </span>
            <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-titan-cyan transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* Filter Row */}
        <div className="relative mt-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 hover:border-white/[0.12] transition-all text-[11px] font-mono-data"
          >
            <Filter className="w-3 h-3" />
            {filterOptions.find((f) => f.value === filter)?.label}
            <ChevronDown className={cn('w-3 h-3 transition-transform', showFilter && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 z-50 w-48 p-1 rounded-lg glass-card border border-white/[0.1] shadow-xl"
              >
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setFilter(opt.value);
                      setShowFilter(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-mono-data transition-all',
                      filter === opt.value
                        ? 'bg-titan-cyan/10 text-titan-cyan'
                        : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                    )}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] text-white/30">{opt.count}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-1 space-y-0.5">
        <AnimatePresence>
          {filtered.map((ws, i) => {
            const isActive = activeWorkspaceId === ws.id;
            const statusCfg = statusConfig[ws.status];
            const StatusIcon = statusCfg.icon;

            return (
              <motion.button
                key={ws.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onSelect(ws)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left group relative',
                  isActive
                    ? 'bg-titan-cyan/[0.08] border border-titan-cyan/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                )}
              >
                {/* Client Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-display font-bold border transition-all',
                      isActive
                        ? 'bg-titan-cyan/20 border-titan-cyan/30 text-titan-cyan'
                        : 'bg-white/[0.06] border-white/[0.1] text-white/60 group-hover:border-white/[0.2]'
                    )}
                  >
                    {ws.clientLogo}
                  </div>
                  {/* Health indicator dot */}
                  <div
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0D1029]',
                      ws.healthScore > 80
                        ? 'bg-titan-lime'
                        : ws.healthScore > 50
                          ? 'bg-yellow-400'
                          : 'bg-titan-magenta'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      {ws.pinned && <Pin className="w-2.5 h-2.5 text-titan-cyan/60 fill-titan-cyan/60" />}
                      <span
                        className={cn(
                          'font-display text-sm font-semibold truncate',
                          isActive ? 'text-white' : 'text-white/80'
                        )}
                      >
                        {ws.clientName}
                      </span>
                    </div>
                    <span className="font-mono-data text-[10px] text-white/30 shrink-0 ml-2">
                      {ws.lastMessageTime}
                    </span>
                  </div>

                  <p className="font-mono-data text-[11px] text-white/40 truncate leading-relaxed">
                    {ws.lastMessage}
                  </p>

                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn('w-3 h-3', statusCfg.color)} />
                      <span className={cn('font-mono-data text-[9px]', statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                      <div className="w-px h-3 bg-white/10" />
                      <span className="font-mono-data text-[9px] text-white/30">
                        {ws.packageUsage}% used
                      </span>
                    </div>

                    {ws.unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-titan-cyan text-titan-bg font-mono-data text-[10px] font-bold px-1"
                      >
                        {ws.unreadCount}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="font-mono-data text-xs">No workspaces found</p>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Active', value: workspaces.filter((w) => w.status === 'active').length, color: 'text-titan-lime' },
            { label: 'At Risk', value: workspaces.filter((w) => w.status === 'at-risk').length, color: 'text-titan-magenta' },
            { label: 'Unread', value: workspaces.reduce((acc, w) => acc + w.unreadCount, 0), color: 'text-titan-cyan' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={cn('font-display font-bold text-sm', stat.color)}>{stat.value}</div>
              <div className="font-mono-data text-[9px] text-white/30">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
