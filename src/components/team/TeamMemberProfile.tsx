import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Calendar,
  Star,
  Package,
  Megaphone,
  Users,
  CheckCircle2,
  RotateCcw,
  Timer,
  Layers,
  Shield,
  Plus,
  X,
  Pencil,
  Trash2,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMember } from './types';
import { teamCategoryLabels } from './types';
import { useWorkload, useSkillManagement } from '@/hooks/useTeam';
import { updateTeamMember, deleteTeamMember } from '@/lib/data-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface TeamMemberProfileProps {
  member: TeamMember;
  onBack: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
}

export default function TeamMemberProfile({ member, onBack, onRefresh, onDelete }: TeamMemberProfileProps) {
  const workload = useWorkload(member.id);
  const skillMgmt = useSkillManagement(member.id);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(3);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState(3);

  // Edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: member.name,
    email: member.email,
    primary_role: member.primaryRole,
    status: member.status,
    work_capacity_hours: member.workCapacityHours || 8,
  });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleSaveEdit = useCallback(async () => {
    setEditSaving(true);
    try {
      await updateTeamMember(member.id, editForm);
      setShowEditDialog(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update team member:', err);
    } finally {
      setEditSaving(false);
    }
  }, [member.id, editForm, onRefresh]);

  const handleDeleteMember = useCallback(async () => {
    if (deleteConfirmText !== member.name) return;
    setDeleting(true);
    try {
      await deleteTeamMember(member.id);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (err) {
      console.error('Failed to delete team member:', err);
    } finally {
      setDeleting(false);
    }
  }, [member.id, member.name, deleteConfirmText, onDelete]);

  const handleAddSkill = useCallback(async () => {
    if (!newSkillName.trim()) return;
    try {
      await skillMgmt.addSkill(newSkillName.trim(), newSkillLevel);
      setNewSkillName('');
      setNewSkillLevel(3);
      setShowAddSkill(false);
    } catch {
      // Error already set in hook
    }
  }, [newSkillName, newSkillLevel, skillMgmt]);

  const handleUpdateSkill = useCallback(async (skillId: string) => {
    try {
      await skillMgmt.updateLevel(skillId, editingLevel);
      setEditingSkillId(null);
    } catch {
      // Error already set in hook
    }
  }, [editingLevel, skillMgmt]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-titan-lime';
      case 'busy': return 'bg-titan-magenta';
      case 'away': return 'bg-yellow-400';
      default: return 'bg-white/20';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'busy': return 'Busy';
      case 'away': return 'Away';
      default: return 'Offline';
    }
  };

  const loadColor = (load: number) => {
    if (load >= 85) return { text: 'text-titan-magenta', bar: 'bg-titan-magenta', glow: 'shadow-titan-magenta/30' };
    if (load >= 65) return { text: 'text-yellow-400', bar: 'bg-yellow-400', glow: 'shadow-yellow-400/30' };
    return { text: 'text-titan-lime', bar: 'bg-titan-lime', glow: 'shadow-titan-lime/30' };
  };

  // Use real workload data if available, fallback to member data
  const realLoad = workload.data?.loadPercentage ?? member.currentLoad;
  const lc = loadColor(realLoad);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full overflow-y-auto scrollbar-hide pb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <h2 className="font-display font-bold text-lg text-white flex-1">Member Profile</h2>
        <button
          onClick={() => {
            setEditForm({
              name: member.name,
              email: member.email,
              primary_role: member.primaryRole,
              status: member.status,
              work_capacity_hours: member.workCapacityHours || 8,
            });
            setShowEditDialog(true);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-[#00D9FF]/20 hover:border-[#00D9FF]/30 text-white/40 hover:text-[#00D9FF] transition-all"
          title="Edit Member"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-red-500/20 hover:border-red-500/30 text-white/40 hover:text-red-400 transition-all"
          title="Delete Member"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative p-5 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] backdrop-blur-[24px] mb-4"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-16 h-16 rounded-xl object-cover border-2 border-white/[0.08]"
            />
            <div className={cn(
              'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-titan-bg',
              statusColor(member.status)
            )} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-extrabold text-xl text-white">{member.name}</h3>
            <p className="font-mono-data text-xs text-titan-cyan mt-0.5">{member.primaryRole}</p>
            {member.secondaryRoles.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {member.secondaryRoles.map((role) => (
                  <span
                    key={role}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono-data bg-titan-purple/10 text-titan-purple border border-titan-purple/20"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', statusColor(member.status))} />
                <span className="font-mono-data text-[10px] text-white/40">{statusLabel(member.status)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-white/20" />
                <span className="font-mono-data text-[10px] text-white/30">{member.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-white/20" />
                <span className="font-mono-data text-[10px] text-white/30">
                  Joined {new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Skill Tags — now CRUD-able */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-data text-[9px] text-white/30 uppercase tracking-wider">Skills</span>
            <button
              onClick={() => setShowAddSkill((v) => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono-data bg-titan-cyan/10 text-titan-cyan hover:bg-titan-cyan/20 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Skill
            </button>
          </div>

          {/* Add Skill Form */}
          <AnimatePresence>
            {showAddSkill && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex items-center gap-2 overflow-hidden"
              >
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill name..."
                  className="flex-1 h-7 px-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 font-mono-data text-[10px] focus:outline-none focus:border-titan-cyan/30"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                  className="h-7 px-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/90 font-mono-data text-[10px] focus:outline-none focus:border-titan-cyan/30 appearance-none"
                >
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l} className="bg-[#1A1D2E]">Lv{l}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddSkill}
                  className="h-7 px-2 rounded-md bg-titan-cyan/20 text-titan-cyan text-[10px] font-mono-data hover:bg-titan-cyan/30 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowAddSkill(false)}
                  className="h-7 px-2 rounded-md bg-white/[0.04] text-white/40 text-[10px] font-mono-data hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skill List */}
          <div className="flex flex-wrap gap-1.5">
            {skillMgmt.skills.length > 0 ? (
              skillMgmt.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-data bg-white/[0.04] text-white/40 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                >
                  {editingSkillId === skill.id ? (
                    <>
                      <span>{skill.skill_name}</span>
                      <select
                        value={editingLevel}
                        onChange={(e) => setEditingLevel(Number(e.target.value))}
                        className="h-4 px-0.5 rounded bg-white/[0.06] text-white/60 text-[9px] focus:outline-none appearance-none"
                      >
                        {[1, 2, 3, 4, 5].map((l) => (
                          <option key={l} value={l} className="bg-[#1A1D2E]">{l}</option>
                        ))}
                      </select>
                      <button onClick={() => handleUpdateSkill(skill.id)} className="text-titan-lime hover:text-titan-lime/80">
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingSkillId(null)} className="text-white/30 hover:text-white/50">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{skill.skill_name}</span>
                      <span className="text-titan-cyan/50">Lv{skill.skill_level}</span>
                      <button
                        onClick={() => { setEditingSkillId(skill.id); setEditingLevel(skill.skill_level); }}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 transition-opacity"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => skillMgmt.removeSkill(skill.id)}
                        className="opacity-0 group-hover:opacity-100 text-titan-magenta/50 hover:text-titan-magenta transition-opacity"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            ) : member.skillTags.length > 0 ? (
              // Fallback to member skillTags if no DB skills loaded
              member.skillTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono-data bg-white/[0.04] text-white/40 border border-white/[0.06]"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="font-mono-data text-[10px] text-white/20">No skills — click "Add Skill" to start</span>
            )}
          </div>
        </div>

        {/* Real Workload Calculation Panel */}
        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-white/30" />
              <span className="font-mono-data text-[10px] text-white/40">
                Real Workload · {member.workCapacityHours}h/day · {member.workCapacityHours * 22}h/month
              </span>
            </div>
            <div className="flex items-center gap-2">
              {workload.loading && <Loader2 className="w-3 h-3 text-white/30 animate-spin" />}
              <button
                onClick={workload.refetch}
                className="text-white/30 hover:text-white/60 transition-colors"
                title="Recalculate workload"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <span className={cn('font-mono-data text-sm font-bold', lc.text)}>
                {realLoad}% Load
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${realLoad}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className={cn('h-full rounded-full', lc.bar)}
            />
          </div>

          {/* Workload breakdown */}
          {workload.data && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-4 font-mono-data text-[9px] text-white/40">
                <span>📦 {workload.data.assignedDeliverables} deliverables</span>
                <span>⏱ {workload.data.estimatedHours}h estimated</span>
                <span>🔄 {workload.data.inProgressCount} in-progress</span>
                <span>👁 {workload.data.reviewCount} review</span>
                <span>⏳ {workload.data.pendingCount} pending</span>
              </div>
              {workload.data.deliverableBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {workload.data.deliverableBreakdown.map((b) => (
                    <span
                      key={b.type}
                      className="px-2 py-0.5 rounded text-[9px] font-mono-data bg-titan-cyan/5 text-titan-cyan/60 border border-titan-cyan/10"
                    >
                      {b.type}: {b.count} ({b.hours}h)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {realLoad >= 85 && (
            <p className="font-mono-data text-[9px] text-titan-magenta mt-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              ⚠️ Overloaded — Consider redistributing tasks
            </p>
          )}
        </div>
      </motion.div>

      {/* Multi-Team Assignment */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-4 rounded-xl bg-gradient-to-br from-titan-purple/8 to-transparent border border-titan-purple/15 backdrop-blur-[24px] mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-titan-purple" />
          <h4 className="font-display font-bold text-sm text-white">Belongs To Teams</h4>
          <span className="ml-auto font-mono-data text-[10px] text-titan-purple bg-titan-purple/10 px-2 py-0.5 rounded-full">
            {member.belongsToTeams.length} teams
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {member.belongsToTeams.map((team) => (
            <span
              key={team}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono-data bg-white/[0.04] text-white/60 border border-white/[0.06]"
            >
              <Users className="w-3 h-3 text-titan-cyan/60" />
              {teamCategoryLabels[team]}
            </span>
          ))}
        </div>
        {member.belongsToTeams.length > 1 && (
          <p className="font-mono-data text-[9px] text-white/25 mt-2">
            Cross-team member — workload is calculated across all assigned teams
          </p>
        )}
      </motion.div>

      {/* Assignment Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl bg-gradient-to-br from-titan-cyan/8 to-transparent border border-titan-cyan/15 backdrop-blur-[24px] mb-4"
      >
        <h4 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-titan-cyan" />
          Assignment Panel
        </h4>

        {/* Assigned Clients */}
        <div className="mb-3">
          <p className="font-mono-data text-[9px] text-white/30 mb-1.5 uppercase tracking-wider">Assigned Clients</p>
          {member.assignedClients.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {member.assignedClients.map((client, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-md text-[10px] font-mono-data bg-white/[0.04] text-white/50 border border-white/[0.06]"
                >
                  {client}
                  {member.assignedPackages[i] && (
                    <span className="ml-1 text-titan-cyan/50">({member.assignedPackages[i]})</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <span className="font-mono-data text-[10px] text-white/20">No clients assigned (internal role)</span>
          )}
        </div>

        {/* Deliverables & Campaigns */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <p className="font-mono-data text-[9px] text-white/30 mb-1">Active Deliverables</p>
            <span className="font-display font-bold text-lg text-white">{member.activeDeliverables}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1 mb-1">
              <Megaphone className="w-3 h-3 text-white/20" />
              <p className="font-mono-data text-[9px] text-white/30">Boost Campaigns</p>
            </div>
            <span className="font-display font-bold text-lg text-white">{member.boostCampaigns}</span>
          </div>
        </div>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-4 rounded-xl bg-gradient-to-br from-titan-lime/8 to-transparent border border-titan-lime/15 backdrop-blur-[24px]"
      >
        <h4 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-titan-lime" />
          Performance Metrics
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3 h-3 text-titan-lime/60" />
              <p className="font-mono-data text-[9px] text-white/30">Tasks This Month</p>
            </div>
            <span className="font-display font-bold text-xl text-white">{member.tasksCompletedThisMonth}</span>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <Timer className="w-3 h-3 text-titan-cyan/60" />
              <p className="font-mono-data text-[9px] text-white/30">Avg Delivery</p>
            </div>
            <span className="font-display font-bold text-xl text-white">{member.avgDeliveryTime}</span>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <RotateCcw className="w-3 h-3 text-titan-purple/60" />
              <p className="font-mono-data text-[9px] text-white/30">Revisions</p>
            </div>
            <span className="font-display font-bold text-xl text-white">{member.revisionCount}</span>
            {member.revisionCount > 4 && (
              <p className="font-mono-data text-[8px] text-titan-magenta/70 mt-0.5">Above average</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="w-3 h-3 text-yellow-400/60" />
              <p className="font-mono-data text-[9px] text-white/30">Client Rating</p>
            </div>
            {member.clientRating > 0 ? (
              <div className="flex items-center gap-1">
                <span className="font-display font-bold text-xl text-white">{member.clientRating}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        'w-3 h-3',
                        s <= Math.round(member.clientRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white/10'
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span className="font-mono-data text-[10px] text-white/20">N/A</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#1A1D2E] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#00D9FF]" />
              Edit Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Primary Role</Label>
              <select
                value={editForm.primary_role}
                onChange={(e) => setEditForm(f => ({ ...f, primary_role: e.target.value }))}
                className="w-full mt-1 h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#00D9FF]/50"
              >
                <option value="Graphic Designer" className="bg-[#1A1D2E]">Graphic Designer</option>
                <option value="Video Editor" className="bg-[#1A1D2E]">Video Editor</option>
                <option value="Media Buyer" className="bg-[#1A1D2E]">Media Buyer</option>
                <option value="Copywriter" className="bg-[#1A1D2E]">Copywriter</option>
                <option value="Account Manager" className="bg-[#1A1D2E]">Account Manager</option>
                <option value="SEO Specialist" className="bg-[#1A1D2E]">SEO Specialist</option>
                <option value="Social Media Manager" className="bg-[#1A1D2E]">Social Media Manager</option>
                <option value="Developer" className="bg-[#1A1D2E]">Developer</option>
                <option value="Finance Manager" className="bg-[#1A1D2E]">Finance Manager</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/60 text-xs">Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#00D9FF]/50"
                >
                  <option value="online" className="bg-[#1A1D2E]">Online</option>
                  <option value="busy" className="bg-[#1A1D2E]">Busy</option>
                  <option value="away" className="bg-[#1A1D2E]">Away</option>
                  <option value="offline" className="bg-[#1A1D2E]">Offline</option>
                </select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Capacity (hrs/day)</Label>
                <Input
                  type="number"
                  value={editForm.work_capacity_hours}
                  onChange={(e) => setEditForm(f => ({ ...f, work_capacity_hours: Number(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  min={1}
                  max={24}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editSaving || !editForm.name || !editForm.email}
              className="bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] border border-[#00D9FF]/30"
            >
              {editSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#1A1D2E] border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              This will permanently delete <strong className="text-red-400">{member.name}</strong> and:
            </p>
            <ul className="text-xs text-white/50 space-y-1 list-disc list-inside">
              <li>Remove their login credentials</li>
              <li>Remove from all workspaces and channels</li>
              <li>Delete all skill records</li>
              <li>Unassign all deliverables (deliverables won't be deleted)</li>
              <li>Delete user profile</li>
            </ul>
            <div>
              <Label className="text-white/60 text-xs mb-1 block">
                Type <strong className="text-red-400">{member.name}</strong> to confirm
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={member.name}
                className="bg-white/5 border-red-500/30 text-white focus:border-red-500/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteMember}
              disabled={deleting || deleteConfirmText !== member.name}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 disabled:opacity-30"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Permanently Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
