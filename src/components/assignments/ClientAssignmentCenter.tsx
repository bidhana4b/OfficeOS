import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useClientAssignments,
  useAvailableTeamMembers,
  useAssignmentRules,
  useAssignmentActions,
  type ClientAssignment,
  type AvailableTeamMember,
} from '@/hooks/useAssignments';
import { useClients } from '@/hooks/useClients';
import { subscribeToTable } from '@/lib/data-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Users, UserPlus, UserMinus, Search, Briefcase, Building2, Star, Zap,
  ChevronRight, CircleDot, Palette, Video, Megaphone, PenTool, Code,
  Target, Brain, X, Check, AlertTriangle, Loader2, Shield, Clock,
  TrendingUp, MessageSquare,
} from 'lucide-react';
import type { Client } from '@/components/clients/types';

// Role type to icon mapping
const roleIcons: Record<string, React.ReactNode> = {
  designer: <Palette className="w-3.5 h-3.5" />,
  media_buyer: <Megaphone className="w-3.5 h-3.5" />,
  account_manager: <Briefcase className="w-3.5 h-3.5" />,
  video_editor: <Video className="w-3.5 h-3.5" />,
  content_writer: <PenTool className="w-3.5 h-3.5" />,
  strategist: <Target className="w-3.5 h-3.5" />,
  developer: <Code className="w-3.5 h-3.5" />,
};

const roleLabels: Record<string, string> = {
  designer: 'Designer',
  media_buyer: 'Media Buyer',
  account_manager: 'Account Manager',
  video_editor: 'Video Editor',
  content_writer: 'Content Writer',
  strategist: 'Strategist',
  developer: 'Developer',
};

const roleColors: Record<string, string> = {
  designer: 'cyan',
  media_buyer: 'magenta',
  account_manager: 'lime',
  video_editor: 'purple',
  content_writer: 'cyan',
  strategist: 'purple',
  developer: 'lime',
};

function getWorkloadColor(load: number): string {
  if (load >= 85) return 'text-red-400';
  if (load >= 65) return 'text-yellow-400';
  return 'text-emerald-400';
}

function getWorkloadIndicator(load: number): string {
  if (load >= 85) return 'bg-red-400';
  if (load >= 65) return 'bg-yellow-400';
  return 'bg-emerald-400';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-emerald-400';
    case 'busy': return 'bg-red-400';
    case 'away': return 'bg-yellow-400';
    default: return 'bg-white/20';
  }
}

// Department mapping from team_member_teams
function getDepartment(member: AvailableTeamMember): string {
  if (member.team_member_teams?.length > 0) {
    return member.team_member_teams[0]?.teams?.name || 'Unassigned';
  }
  return 'Unassigned';
}

function getDepartmentColor(member: AvailableTeamMember): string {
  if (member.team_member_teams?.length > 0) {
    return member.team_member_teams[0]?.teams?.color || 'cyan';
  }
  return 'cyan';
}

// Infer best role_type from team_member primary_role
function inferRoleType(primaryRole: string): string {
  const lower = primaryRole.toLowerCase();
  if (lower.includes('design') || lower.includes('ui') || lower.includes('brand')) return 'designer';
  if (lower.includes('media') || lower.includes('ads') || lower.includes('ad ')) return 'media_buyer';
  if (lower.includes('account') || lower.includes('manager') || lower.includes('client')) return 'account_manager';
  if (lower.includes('video') || lower.includes('motion')) return 'video_editor';
  if (lower.includes('content') || lower.includes('copy') || lower.includes('write')) return 'content_writer';
  if (lower.includes('strat') || lower.includes('research')) return 'strategist';
  if (lower.includes('dev') || lower.includes('code') || lower.includes('tech')) return 'developer';
  return 'designer';
}

// Team department groupings
const departmentGroups = [
  { key: 'creative', label: 'Creative Team', category: 'creative', icon: <Palette className="w-4 h-4" />, color: 'cyan' },
  { key: 'video', label: 'Video Production', category: 'video-production', icon: <Video className="w-4 h-4" />, color: 'purple' },
  { key: 'media', label: 'Media Buying', category: 'media-buying', icon: <Megaphone className="w-4 h-4" />, color: 'magenta' },
  { key: 'content', label: 'Content & Copy', category: 'content-copy', icon: <PenTool className="w-4 h-4" />, color: 'lime' },
  { key: 'client-mgmt', label: 'Client Management', category: 'client-management', icon: <Briefcase className="w-4 h-4" />, color: 'cyan' },
  { key: 'strategy', label: 'Strategy & Research', category: 'strategy-research', icon: <Target className="w-4 h-4" />, color: 'purple' },
  { key: 'tech', label: 'Tech & Development', category: 'tech-development', icon: <Code className="w-4 h-4" />, color: 'lime' },
  { key: 'automation', label: 'Automation / AI', category: 'automation-ai', icon: <Brain className="w-4 h-4" />, color: 'cyan' },
];

export default function ClientAssignmentCenter() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedDept, setExpandedDept] = useState<string | null>('creative');
  const [assignRoleOverride, setAssignRoleOverride] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    member: AvailableTeamMember | null;
    roleType: string;
  }>({ open: false, member: null, roleType: '' });
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    assignment: ClientAssignment | null;
  }>({ open: false, assignment: null });

  // Data hooks
  const clientsQuery = useClients();
  const assignments = useClientAssignments(selectedClientId);
  const teamMembers = useAvailableTeamMembers();
  const selectedClient = clientsQuery.data.find(c => c.id === selectedClientId);
  const rules = useAssignmentRules(selectedClient?.category || 'Other');
  const { assign, remove, assigning, removing } = useAssignmentActions();

  // Real-time subscription for assignments
  useEffect(() => {
    const unsub = subscribeToTable('client_assignments', () => {
      assignments.refetch();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments.refetch]);

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clientsQuery.data;
    const lower = searchTerm.toLowerCase();
    return clientsQuery.data.filter(c =>
      c.businessName.toLowerCase().includes(lower) ||
      c.category.toLowerCase().includes(lower)
    );
  }, [clientsQuery.data, searchTerm]);

  // Group team members by department
  const membersByDept = useMemo(() => {
    const map: Record<string, AvailableTeamMember[]> = {};
    departmentGroups.forEach(g => { map[g.category] = []; });
    map['other'] = [];

    teamMembers.data.forEach(member => {
      let placed = false;
      if (member.team_member_teams?.length > 0) {
        for (const tmt of member.team_member_teams) {
          const cat = tmt.teams?.category;
          if (cat && map[cat]) {
            map[cat].push(member);
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        map['other'].push(member);
      }
    });

    // Filter by search
    if (memberSearch) {
      const lower = memberSearch.toLowerCase();
      for (const key of Object.keys(map)) {
        map[key] = map[key].filter(m =>
          m.name.toLowerCase().includes(lower) ||
          m.primary_role.toLowerCase().includes(lower) ||
          m.email.toLowerCase().includes(lower)
        );
      }
    }

    return map;
  }, [teamMembers.data, memberSearch]);

  // Already assigned IDs for the selected client
  const assignedMemberIds = useMemo(() => {
    return new Set(assignments.data.map(a => a.team_member_id));
  }, [assignments.data]);

  // Suggested roles from rules
  const suggestedRoles = rules.data?.default_roles || {};
  const currentRoleCounts: Record<string, number> = {};
  assignments.data.forEach(a => {
    currentRoleCounts[a.role_type] = (currentRoleCounts[a.role_type] || 0) + 1;
  });

  const handleAssign = useCallback(async () => {
    if (!confirmDialog.member || !selectedClientId) return;
    try {
      await assign({
        client_id: selectedClientId,
        team_member_id: confirmDialog.member.id,
        role_type: confirmDialog.roleType,
      });
      setConfirmDialog({ open: false, member: null, roleType: '' });
    } catch (err) {
      console.error('Assignment failed:', err);
    }
  }, [confirmDialog, selectedClientId, assign]);

  const handleRemove = useCallback(async () => {
    if (!removeDialog.assignment) return;
    try {
      await remove(removeDialog.assignment.id);
      setRemoveDialog({ open: false, assignment: null });
    } catch (err) {
      console.error('Remove failed:', err);
    }
  }, [removeDialog, remove]);

  const openAssignDialog = useCallback((member: AvailableTeamMember) => {
    const roleType = assignRoleOverride || inferRoleType(member.primary_role);
    setConfirmDialog({ open: true, member, roleType });
  }, [assignRoleOverride]);

  return (
    <div className="flex h-full bg-[#0A0E27]">
      {/* LEFT: Client Selector */}
      <div className="w-72 border-r border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex flex-col">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-titan-cyan" />
            <span className="font-display font-bold text-sm text-white">Assignment Center</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 h-8 bg-white/5 border-white/10 text-white text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredClients.map(client => {
              const isSelected = selectedClientId === client.id;
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
                    isSelected
                      ? 'bg-titan-cyan/10 border border-titan-cyan/30'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0',
                    isSelected ? 'bg-titan-cyan/20 text-titan-cyan' : 'bg-white/10 text-white/60'
                  )}>
                    {client.businessName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs font-medium truncate',
                      isSelected ? 'text-white' : 'text-white/70'
                    )}>
                      {client.businessName}
                    </p>
                    <p className="text-[10px] text-white/40">{client.category}</p>
                  </div>
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    client.status === 'active' ? 'bg-emerald-400' :
                    client.status === 'at-risk' ? 'bg-yellow-400' : 'bg-red-400'
                  )} />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* CENTER: Department Team Members */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedClient ? (
          <>
            {/* Client Header */}
            <div className="h-14 border-b border-white/10 bg-[#0F1419]/60 backdrop-blur-xl flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-titan-cyan/15 border border-titan-cyan/30 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-titan-cyan" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">{selectedClient.businessName}</h3>
                  <p className="text-[10px] text-white/40 font-mono">{selectedClient.category} • {selectedClient.location}</p>
                </div>
              </div>

              {/* Suggestion Banner */}
              {rules.data && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-titan-purple/10 border border-titan-purple/20">
                  <Brain className="w-3.5 h-3.5 text-titan-purple" />
                  <span className="text-[10px] font-mono text-titan-purple">
                    AI Suggestion: {rules.data.min_team_size} members needed
                  </span>
                  {Object.entries(suggestedRoles).map(([role, count]) => {
                    const missing = (count as number) - (currentRoleCounts[role] || 0);
                    if (missing <= 0) return null;
                    return (
                      <Badge
                        key={role}
                        variant="outline"
                        className="text-[9px] h-5 border-titan-magenta/30 text-titan-magenta bg-titan-magenta/10"
                      >
                        {missing}× {roleLabels[role] || role}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search & Filter */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search team members..."
                  className="pl-8 h-8 bg-white/5 border-white/10 text-white text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/40 font-mono mr-1">Assign as:</span>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setAssignRoleOverride(assignRoleOverride === key ? null : key)}
                    className={cn(
                      'px-2 py-1 rounded text-[9px] font-mono transition-all',
                      assignRoleOverride === key
                        ? `bg-titan-${roleColors[key]}/20 text-titan-${roleColors[key]} border border-titan-${roleColors[key]}/30`
                        : 'bg-white/5 text-white/40 hover:text-white/60 border border-transparent'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Accordion */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {departmentGroups.map(dept => {
                  const members = membersByDept[dept.category] || [];
                  const isExpanded = expandedDept === dept.key;
                  const assignedInDept = members.filter(m => assignedMemberIds.has(m.id)).length;

                  return (
                    <div key={dept.key} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                      <button
                        onClick={() => setExpandedDept(isExpanded ? null : dept.key)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className={`text-titan-${dept.color}`}>{dept.icon}</div>
                        <span className="font-display font-bold text-xs text-white/80 flex-1 text-left">
                          {dept.label}
                        </span>
                        <span className="text-[10px] font-mono text-white/30">
                          {assignedInDept > 0 && (
                            <span className="text-titan-lime mr-2">{assignedInDept} assigned</span>
                          )}
                          {members.length} members
                        </span>
                        <ChevronRight className={cn(
                          'w-3.5 h-3.5 text-white/30 transition-transform',
                          isExpanded && 'rotate-90'
                        )} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-1">
                              {members.length === 0 ? (
                                <p className="text-[10px] text-white/20 text-center py-4 font-mono">No members in this department</p>
                              ) : (
                                members.map(member => {
                                  const isAssigned = assignedMemberIds.has(member.id);
                                  return (
                                    <div
                                      key={member.id}
                                      className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                        isAssigned
                                          ? 'bg-titan-cyan/5 border border-titan-cyan/15'
                                          : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                                      )}
                                    >
                                      {/* Avatar */}
                                      <div className="relative shrink-0">
                                        {member.avatar?.startsWith('http') ? (
                                          <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-lg object-cover" />
                                        ) : (
                                          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[11px] font-bold text-white/60">
                                            {member.name.substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                        <div className={cn(
                                          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0E27]',
                                          getStatusColor(member.status)
                                        )} />
                                      </div>

                                      {/* Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-medium text-white truncate">{member.name}</p>
                                          {isAssigned && (
                                            <Badge variant="outline" className="text-[8px] h-4 border-titan-cyan/30 text-titan-cyan bg-titan-cyan/10">
                                              Assigned
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-white/40 font-mono truncate">{member.primary_role}</p>
                                      </div>

                                      {/* Workload */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <div className={cn(
                                          'w-1.5 h-1.5 rounded-full',
                                          getWorkloadIndicator(member.current_load)
                                        )} />
                                        <span className={cn('text-[10px] font-mono', getWorkloadColor(member.current_load))}>
                                          {member.current_load}%
                                        </span>
                                      </div>

                                      {/* Rating */}
                                      {member.client_rating > 0 && (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                          <span className="text-[10px] font-mono text-white/50">{member.client_rating}</span>
                                        </div>
                                      )}

                                      {/* Skills */}
                                      <div className="hidden xl:flex items-center gap-1 shrink-0 max-w-[120px]">
                                        {member.user_skills?.slice(0, 2).map((skill) => (
                                          <span
                                            key={skill.skill_name}
                                            className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono truncate"
                                          >
                                            {skill.skill_name}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Action */}
                                      {!isAssigned ? (
                                        <Button
                                          size="sm"
                                          onClick={() => openAssignDialog(member)}
                                          className="h-7 px-3 text-[10px] bg-titan-cyan/15 hover:bg-titan-cyan/25 text-titan-cyan border border-titan-cyan/30"
                                        >
                                          <UserPlus className="w-3 h-3 mr-1" />
                                          Assign
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const a = assignments.data.find(a => a.team_member_id === member.id);
                                            if (a) setRemoveDialog({ open: true, assignment: a });
                                          }}
                                          className="h-7 px-3 text-[10px] text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                                        >
                                          <UserMinus className="w-3 h-3 mr-1" />
                                          Remove
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-titan-cyan/10 border border-titan-cyan/20 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-8 h-8 text-titan-cyan/60" />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-1">Client Assignment Center</h3>
              <p className="text-xs text-white/40 font-mono max-w-sm">
                Select a client from the left panel to view and manage team assignments.
                Auto-assign teams, manage roles, and control workspace access.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Assigned Team Summary */}
      {selectedClient && (
        <div className="w-72 border-l border-white/10 bg-[#0F1419]/60 backdrop-blur-xl flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-titan-lime" />
              <span className="font-display font-bold text-xs text-white">Assigned Team</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-extrabold text-titan-cyan">{assignments.data.length}</span>
              <span className="text-[10px] text-white/40 font-mono">members assigned</span>
            </div>
            {rules.data && (
              <div className="mt-2 flex items-center gap-1.5">
                {assignments.data.length >= rules.data.min_team_size ? (
                  <>
                    <Check className="w-3 h-3 text-titan-lime" />
                    <span className="text-[10px] font-mono text-titan-lime">Team requirement met</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] font-mono text-yellow-400">
                      Need {rules.data.min_team_size - assignments.data.length} more
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Role Fulfillment */}
          {rules.data && Object.keys(suggestedRoles).length > 0 && (
            <div className="p-3 border-b border-white/10 space-y-2">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Role Fulfillment</span>
              {Object.entries(suggestedRoles).map(([role, needed]) => {
                const current = currentRoleCounts[role] || 0;
                const fulfilled = current >= (needed as number);
                return (
                  <div key={role} className="flex items-center gap-2">
                    <div className={cn('w-5 h-5 rounded flex items-center justify-center', fulfilled ? 'bg-titan-lime/15' : 'bg-white/5')}>
                      {roleIcons[role] || <CircleDot className="w-3 h-3" />}
                    </div>
                    <span className="text-[10px] font-mono text-white/60 flex-1">{roleLabels[role]}</span>
                    <span className={cn(
                      'text-[10px] font-mono font-bold',
                      fulfilled ? 'text-titan-lime' : 'text-titan-magenta'
                    )}>
                      {current}/{needed as number}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assigned Members List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {assignments.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-titan-cyan animate-spin" />
                </div>
              ) : assignments.data.length === 0 ? (
                <p className="text-[10px] text-white/20 text-center py-8 font-mono">
                  No team members assigned yet
                </p>
              ) : (
                assignments.data.map(assignment => {
                  const member = assignment.team_members;
                  if (!member) return null;
                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/5"
                    >
                      <div className="relative shrink-0">
                        {member.avatar?.startsWith('http') ? (
                          <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F1419]',
                          getStatusColor(member.status)
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white truncate">{member.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {roleIcons[assignment.role_type] && (
                            <span className={`text-titan-${roleColors[assignment.role_type] || 'cyan'}`}>
                              {roleIcons[assignment.role_type]}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-white/40">
                            {roleLabels[assignment.role_type] || assignment.role_type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setRemoveDialog({ open: true, assignment })}
                        className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Quick Stats */}
          {assignments.data.length > 0 && (
            <div className="p-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                  <TrendingUp className="w-3 h-3 text-titan-cyan mx-auto mb-1" />
                  <p className="text-[10px] font-mono text-white/40">Avg Load</p>
                  <p className="text-xs font-display font-bold text-titan-cyan">
                    {Math.round(
                      assignments.data.reduce((sum, a) => sum + (a.team_members?.current_load || 0), 0) /
                        assignments.data.length
                    )}%
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                  <MessageSquare className="w-3 h-3 text-titan-lime mx-auto mb-1" />
                  <p className="text-[10px] font-mono text-white/40">Workspace</p>
                  <p className="text-xs font-display font-bold text-titan-lime">Active</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Assign Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, member: null, roleType: '' })}>
        <DialogContent className="bg-[#1A1D2E] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-titan-cyan flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Confirm Assignment
            </DialogTitle>
          </DialogHeader>
          {confirmDialog.member && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  {confirmDialog.member.avatar?.startsWith('http') ? (
                    <img src={confirmDialog.member.avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white/60">
                      {confirmDialog.member.name.substring(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white">{confirmDialog.member.name}</p>
                    <p className="text-[10px] text-white/40 font-mono">{confirmDialog.member.primary_role}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/60">
                <ChevronRight className="w-3.5 h-3.5 text-titan-cyan" />
                <span>Assigning to <strong className="text-white">{selectedClient?.businessName}</strong></span>
              </div>

              <div>
                <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-2">Assignment Role</label>
                <select
                  value={confirmDialog.roleType}
                  onChange={(e) => setConfirmDialog(prev => ({ ...prev, roleType: e.target.value }))}
                  className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white text-xs px-3 font-mono"
                >
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="text-[10px] text-white/30 font-mono p-2 rounded bg-titan-cyan/5 border border-titan-cyan/10">
                <Zap className="w-3 h-3 text-titan-cyan inline mr-1" />
                This will automatically add {confirmDialog.member.name} to the client's messaging workspace
                and send them a notification.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialog({ open: false, member: null, roleType: '' })} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning}
              className="bg-titan-cyan/20 hover:bg-titan-cyan/30 text-titan-cyan border border-titan-cyan/30"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1.5" />
                  Confirm Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => !open && setRemoveDialog({ open: false, assignment: null })}>
        <DialogContent className="bg-[#1A1D2E] border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-titan-magenta flex items-center gap-2">
              <UserMinus className="w-5 h-5" />
              Remove Assignment
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/60">
            This will remove the team member from this client's assignment and their messaging workspace access.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveDialog({ open: false, assignment: null })} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              disabled={removing}
              className="bg-titan-magenta/20 hover:bg-titan-magenta/30 text-titan-magenta border border-titan-magenta/30"
            >
              {removing ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <UserMinus className="w-3 h-3 mr-1.5" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
