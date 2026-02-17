import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamDashboardCards from './TeamDashboardCards';
import TeamCards from './TeamCards';
import TeamMemberList from './TeamMemberList';
import TeamMemberProfile from './TeamMemberProfile';
import { teamsData as mockTeamsData, teamMembersData as mockTeamMembersData, getMembersForTeam } from './mock-data';
import type { TeamCategory, TeamMember, TeamViewMode } from './types';
import { useTeams, useTeamMembers, useTeamDashboardSummary } from '@/hooks/useTeam';

export default function TeamHub() {
  const teamsQuery = useTeams();
  const membersQuery = useTeamMembers();
  const summaryQuery = useTeamDashboardSummary();
  const teamsData = teamsQuery.data.length > 0 ? teamsQuery.data : mockTeamsData;
  const allTeamMembers = membersQuery.data.length > 0 ? membersQuery.data : mockTeamMembersData;

  const [selectedTeam, setSelectedTeam] = useState<TeamCategory | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [viewMode, setViewMode] = useState<TeamViewMode>('grid');
  const [globalSearch, setGlobalSearch] = useState('');

  const handleSelectTeam = useCallback((category: TeamCategory) => {
    setSelectedTeam(category);
    setSelectedMember(null);
    setViewMode('list');
  }, []);

  const handleBackToGrid = useCallback(() => {
    setSelectedTeam(null);
    setSelectedMember(null);
    setViewMode('grid');
  }, []);

  const handleSelectMember = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setViewMode('member-detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedMember(null);
    setViewMode('list');
  }, []);

  const teamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    if (membersQuery.data.length > 0) {
      return allTeamMembers.filter((m) => m.belongsToTeams.includes(selectedTeam as any));
    }
    return getMembersForTeam(selectedTeam);
  }, [selectedTeam, membersQuery.data, allTeamMembers]);

  // Global search across all members (from grid view)
  const globalSearchResults = useMemo(() => {
    if (!globalSearch) return [];
    const q = globalSearch.toLowerCase();
    return allTeamMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.primaryRole.toLowerCase().includes(q) ||
        m.skillTags.some((s) => s.toLowerCase().includes(q)) ||
        m.assignedClients.some((c) => c.toLowerCase().includes(q))
    );
  }, [globalSearch, allTeamMembers]);

  // Total stats
  const totalMembers = allTeamMembers.length;
  const onlineCount = allTeamMembers.filter((m) => m.status === 'online').length;
  const busyCount = allTeamMembers.filter((m) => m.status === 'busy').length;
  const overloadedCount = allTeamMembers.filter((m) => m.currentLoad >= 85).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-titan-cyan/20 to-titan-purple/10 border border-titan-cyan/20">
                <Users className="w-5 h-5 text-titan-cyan" />
              </div>
              <div>
                <h1 className="font-display font-extrabold text-xl text-white">
                  Team <span className="text-gradient-cyan">Operations</span>
                </h1>
                <p className="font-mono-data text-[10px] text-white/30">
                  Internal operations engine · {totalMembers} members
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:flex items-center gap-4"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-titan-lime animate-pulse" />
              <span className="font-mono-data text-[10px] text-white/40">{onlineCount} Online</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-titan-magenta" />
              <span className="font-mono-data text-[10px] text-white/40">{busyCount} Busy</span>
            </div>
            {overloadedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20">
                <span className="font-mono-data text-[10px] text-titan-magenta">⚠ {overloadedCount} Overloaded</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Search Bar (only in grid view) */}
        {viewMode === 'grid' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="relative max-w-md"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search all members, skills, clients..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 transition-colors"
            />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <AnimatePresence mode="wait">
          {/* Global Search Results */}
          {viewMode === 'grid' && globalSearch && globalSearchResults.length > 0 ? (
            <motion.div
              key="search-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <h3 className="font-display font-bold text-sm text-white mb-3">
                Search Results ({globalSearchResults.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {globalSearchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedMember(member);
                      setViewMode('member-detail');
                      setGlobalSearch('');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left"
                  >
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/[0.06]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-display font-bold text-sm text-white truncate block">{member.name}</span>
                      <span className="font-mono-data text-[10px] text-white/40 truncate block">{member.primaryRole}</span>
                    </div>
                    <span className={cn(
                      'font-mono-data text-xs font-bold',
                      member.currentLoad >= 85 ? 'text-titan-magenta' :
                      member.currentLoad >= 65 ? 'text-yellow-400' :
                      'text-titan-lime'
                    )}>
                      {member.currentLoad}%
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Dashboard Summary Cards */}
              <div>
                <h3 className="font-display font-bold text-sm text-white/60 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-titan-cyan" />
                  Team Dashboard
                </h3>
                <TeamDashboardCards summary={summaryQuery.data} loading={summaryQuery.loading} />
              </div>

              {/* Team Cards */}
              <div>
                <h3 className="font-display font-bold text-sm text-white/60 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-titan-purple" />
                  Team Categories
                </h3>
                <TeamCards
                  teams={teamsData}
                  onSelectTeam={handleSelectTeam}
                  selectedTeam={selectedTeam}
                />
              </div>
            </motion.div>
          )}

          {/* List View (Team Members) */}
          {viewMode === 'list' && selectedTeam && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <TeamMemberList
                members={teamMembers}
                teamCategory={selectedTeam}
                onBack={handleBackToGrid}
                onSelectMember={handleSelectMember}
              />
            </motion.div>
          )}

          {/* Member Detail View */}
          {viewMode === 'member-detail' && selectedMember && (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full max-w-2xl"
            >
              <TeamMemberProfile
                member={selectedMember}
                onBack={selectedTeam ? handleBackToList : handleBackToGrid}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
