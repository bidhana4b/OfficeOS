import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  Star,
  Package,
  Megaphone,
  Users,
  CheckCircle2,
  RotateCcw,
  Timer,
  Layers,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMember } from './types';
import { teamCategoryLabels } from './mock-data';

interface TeamMemberProfileProps {
  member: TeamMember;
  onBack: () => void;
}

export default function TeamMemberProfile({ member, onBack }: TeamMemberProfileProps) {
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

  const lc = loadColor(member.currentLoad);

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
        <h2 className="font-display font-bold text-lg text-white">Member Profile</h2>
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

        {/* Skill Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {member.skillTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[10px] font-mono-data bg-white/[0.04] text-white/40 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Work Capacity & Load */}
        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <span className="font-mono-data text-[10px] text-white/40">
                Work Capacity: {member.workCapacityHours}h/day
              </span>
            </div>
            <span className={cn('font-mono-data text-sm font-bold', lc.text)}>
              {member.currentLoad}% Load
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${member.currentLoad}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className={cn('h-full rounded-full', lc.bar)}
            />
          </div>
          {member.currentLoad >= 85 && (
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
    </motion.div>
  );
}
