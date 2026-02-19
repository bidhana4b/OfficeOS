import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  UserPlus,
  X,
  Loader2,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamDashboardCards from './TeamDashboardCards';
import TeamCards from './TeamCards';
import TeamMemberList from './TeamMemberList';
import TeamMemberProfile from './TeamMemberProfile';
import { teamsData as mockTeamsData, teamMembersData as mockTeamMembersData, getMembersForTeam } from './mock-data';
import type { TeamCategory, TeamMember, TeamViewMode } from './types';
import { useTeams, useTeamMembers, useTeamDashboardSummary } from '@/hooks/useTeam';
import { createFullUser, type CreateFullUserRole } from '@/lib/data-service';

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    primary_role: '',
    work_capacity_hours: 8,
  });

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

  const handleAddMember = useCallback(async () => {
    if (!addForm.name || !addForm.email || !addForm.primary_role) return;
    setAddingMember(true);
    try {
      // Find matching team IDs based on role
      const roleToTeamCategory: Record<string, string[]> = {
        'Graphic Designer': ['creative'],
        'Video Editor': ['video-production'],
        'Media Buyer': ['media-buying'],
        'Copywriter': ['content-copy'],
        'Account Manager': ['client-management'],
        'SEO Specialist': ['strategy-research'],
        'Social Media Manager': ['content-copy'],
        'Developer': ['tech-development'],
        'AI Engineer': ['automation-ai'],
        'Finance Manager': ['accounts-finance'],
        'HR Manager': ['hr-admin'],
      };
      const matchingCategories = roleToTeamCategory[addForm.primary_role] || [];
      const matchingTeamIds = teamsData
        .filter((t) => matchingCategories.includes(t.category))
        .map((t) => t.id);

      // Map primary role to login role
      const roleMapping: Record<string, CreateFullUserRole> = {
        'Graphic Designer': 'designer',
        'Video Editor': 'designer',
        'Media Buyer': 'media_buyer',
        'Copywriter': 'designer',
        'Account Manager': 'account_manager',
        'SEO Specialist': 'media_buyer',
        'Social Media Manager': 'media_buyer',
        'Developer': 'super_admin',
        'AI Engineer': 'super_admin',
        'Finance Manager': 'finance',
        'HR Manager': 'super_admin',
      };

      // Use createFullUser which creates demo_users + user_profiles + team_members
      await createFullUser({
        display_name: addForm.name,
        email: addForm.email,
        password: '123456',
        role: roleMapping[addForm.primary_role] || 'designer',
        primary_role_label: addForm.primary_role,
        team_ids: matchingTeamIds,
      });

      // Refresh data
      membersQuery.refetch();
      teamsQuery.refetch();

      // Reset form
      setAddForm({ name: '', email: '', primary_role: '', work_capacity_hours: 8 });
      setShowAddDialog(false);
    } catch (err) {
      console.error('Failed to add team member:', err);
    } finally {
      setAddingMember(false);
    }
  }, [addForm, teamsData, membersQuery, teamsQuery]);

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

  const isUsingRealData = membersQuery.data.length > 0;

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
                <div className="flex items-center gap-2">
                  <p className="font-mono-data text-[10px] text-white/30">
                    Internal operations engine · {totalMembers} members
                  </p>
                  <span className="text-white/10">·</span>
                  <div className="flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" style={{ color: isUsingRealData ? '#39FF14' : '#FFB800' }} />
                    <span className="font-mono-data text-[10px]" style={{ color: isUsingRealData ? '#39FF14' : '#FFB800' }}>
                      {isUsingRealData ? 'Live DB' : 'Mock'}
                    </span>
                  </div>
                </div>
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
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20 hover:bg-titan-cyan/20 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-titan-cyan" />
              <span className="font-mono-data text-[10px] text-titan-cyan font-medium">+ Add Member</span>
            </button>
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

      {/* Add Team Member Dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 rounded-2xl bg-[#1A1D2E]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20">
                    <UserPlus className="w-4 h-4 text-titan-cyan" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-white">Add Team Member</h3>
                    <p className="font-mono-data text-[10px] text-white/30">Register a new team member</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Dialog Body */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="block font-mono-data text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Rafiq Ahmed"
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono-data text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. rafiq@agency.com"
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono-data text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                    Primary Role *
                  </label>
                  <select
                    value={addForm.primary_role}
                    onChange={(e) => setAddForm((f) => ({ ...f, primary_role: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#1A1D2E]">Select role...</option>
                    <option value="Graphic Designer" className="bg-[#1A1D2E]">Graphic Designer</option>
                    <option value="Video Editor" className="bg-[#1A1D2E]">Video Editor</option>
                    <option value="Media Buyer" className="bg-[#1A1D2E]">Media Buyer</option>
                    <option value="Copywriter" className="bg-[#1A1D2E]">Copywriter</option>
                    <option value="Account Manager" className="bg-[#1A1D2E]">Account Manager</option>
                    <option value="SEO Specialist" className="bg-[#1A1D2E]">SEO Specialist</option>
                    <option value="Social Media Manager" className="bg-[#1A1D2E]">Social Media Manager</option>
                    <option value="Developer" className="bg-[#1A1D2E]">Developer</option>
                    <option value="AI Engineer" className="bg-[#1A1D2E]">AI Engineer</option>
                    <option value="Finance Manager" className="bg-[#1A1D2E]">Finance Manager</option>
                    <option value="HR Manager" className="bg-[#1A1D2E]">HR Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-data text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                    Work Capacity (hours/day)
                  </label>
                  <input
                    type="number"
                    value={addForm.work_capacity_hours}
                    onChange={(e) => setAddForm((f) => ({ ...f, work_capacity_hours: Number(e.target.value) || 8 }))}
                    min={1}
                    max={12}
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 transition-colors"
                  />
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="px-5 py-2.5 bg-titan-cyan/[0.03] border-t border-titan-cyan/10">
                <p className="font-mono-data text-[10px] text-titan-cyan/50 leading-relaxed">
                  ✨ Auto-creates: Login Account (password: 123456) · User Profile · Team Assignment · Workspace Membership
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 font-mono-data text-xs hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !addForm.name || !addForm.email || !addForm.primary_role}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-mono-data text-xs font-medium transition-all',
                    addingMember || !addForm.name || !addForm.email || !addForm.primary_role
                      ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                      : 'bg-titan-cyan/20 text-titan-cyan border border-titan-cyan/30 hover:bg-titan-cyan/30 shadow-[0_0_12px_rgba(0,217,255,0.1)]'
                  )}
                >
                  {addingMember ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
