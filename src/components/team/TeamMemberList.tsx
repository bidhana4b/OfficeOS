import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ArrowLeft,
  ChevronRight,
  Star,
  Clock,
  Package,
  Megaphone,
  AlertTriangle,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMember, TeamCategory } from './types';
import { teamCategoryLabels } from './types';

interface TeamMemberListProps {
  members: TeamMember[];
  teamCategory: TeamCategory;
  onBack: () => void;
  onSelectMember: (member: TeamMember) => void;
}

type SortKey = 'name' | 'load' | 'tasks' | 'rating';
type FilterStatus = 'all' | 'online' | 'busy' | 'away' | 'offline';

export default function TeamMemberList({ members, teamCategory, onBack, onSelectMember }: TeamMemberListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...members];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.primaryRole.toLowerCase().includes(q) ||
          m.skillTags.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((m) => m.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'load':
          return b.currentLoad - a.currentLoad;
        case 'tasks':
          return b.tasksCompletedThisMonth - a.tasksCompletedThisMonth;
        case 'rating':
          return b.clientRating - a.clientRating;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [members, search, sortBy, filterStatus]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-titan-lime';
      case 'busy': return 'bg-titan-magenta';
      case 'away': return 'bg-yellow-400';
      default: return 'bg-white/20';
    }
  };

  const loadColor = (load: number) => {
    if (load >= 85) return 'text-titan-magenta';
    if (load >= 65) return 'text-yellow-400';
    return 'text-titan-lime';
  };

  const loadBarColor = (load: number) => {
    if (load >= 85) return 'bg-titan-magenta';
    if (load >= 65) return 'bg-yellow-400';
    return 'bg-titan-lime';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h2 className="font-display font-bold text-lg text-white">
            {teamCategoryLabels[teamCategory] || 'Team'}
          </h2>
          <p className="font-mono-data text-[10px] text-white/30">
            {members.length} members · {filtered.length} showing
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search members, roles, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-lg border transition-colors',
            showFilters
              ? 'bg-titan-cyan/10 border-titan-cyan/30 text-titan-cyan'
              : 'bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white/70'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="font-mono-data text-[10px]">Filter</span>
        </button>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono-data text-[9px] text-white/30 mr-1">Status:</span>
                {(['all', 'online', 'busy', 'away', 'offline'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      'px-2 py-0.5 rounded-full font-mono-data text-[10px] transition-colors capitalize',
                      filterStatus === s
                        ? 'bg-titan-cyan/15 text-titan-cyan border border-titan-cyan/30'
                        : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-transparent'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="font-mono-data text-[9px] text-white/30 mr-1">Sort:</span>
                {([
                  { key: 'name', label: 'Name' },
                  { key: 'load', label: 'Load' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'rating', label: 'Rating' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={cn(
                      'px-2 py-0.5 rounded-full font-mono-data text-[10px] transition-colors',
                      sortBy === opt.key
                        ? 'bg-titan-purple/15 text-titan-purple border border-titan-purple/30'
                        : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-transparent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member List */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-1">
        <AnimatePresence mode="popLayout">
          {filtered.map((member, index) => (
            <motion.button
              key={member.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.02, duration: 0.25 }}
              onClick={() => onSelectMember(member)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 group"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/[0.06]"
                />
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-titan-bg',
                  statusColor(member.status)
                )} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white truncate">{member.name}</span>
                  {member.currentLoad >= 85 && (
                    <AlertTriangle className="w-3 h-3 text-titan-magenta shrink-0" />
                  )}
                </div>
                <p className="font-mono-data text-[10px] text-white/40 truncate">{member.primaryRole}</p>
                {/* Skill tags */}
                <div className="flex items-center gap-1 mt-1 overflow-hidden">
                  {member.skillTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono-data bg-white/[0.04] text-white/30 whitespace-nowrap"
                    >
                      {tag}
                    </span>
                  ))}
                  {member.skillTags.length > 3 && (
                    <span className="text-[8px] font-mono-data text-white/20">+{member.skillTags.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Load & Stats */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn('font-mono-data text-xs font-bold', loadColor(member.currentLoad))}>
                  {member.currentLoad}%
                </span>
                <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', loadBarColor(member.currentLoad))}
                    style={{ width: `${member.currentLoad}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    <Package className="w-2.5 h-2.5 text-white/20" />
                    <span className="font-mono-data text-[9px] text-white/30">{member.activeDeliverables}</span>
                  </div>
                  {member.boostCampaigns > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Megaphone className="w-2.5 h-2.5 text-white/20" />
                      <span className="font-mono-data text-[9px] text-white/30">{member.boostCampaigns}</span>
                    </div>
                  )}
                  {member.clientRating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400/60" />
                      <span className="font-mono-data text-[9px] text-white/30">{member.clientRating}</span>
                    </div>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
            </motion.button>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CircleDot className="w-8 h-8 text-white/10 mb-3" />
            <p className="font-mono-data text-xs text-white/30">No members found</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
