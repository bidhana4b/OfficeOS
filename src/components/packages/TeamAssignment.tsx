import { motion } from 'framer-motion';
import { Users, Brain, UserCheck, AlertCircle, ChevronRight } from 'lucide-react';
import type { PackageAssignment } from './types';

interface TeamAssignmentProps {
  assignment?: PackageAssignment;
  assignments?: PackageAssignment[];
}

function LoadBar({ load }: { load: number }) {
  let color = 'bg-[#39FF14]';
  if (load > 85) color = 'bg-[#FF006E]';
  else if (load > 70) color = 'bg-amber-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${load}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`font-mono text-[10px] ${load > 85 ? 'text-[#FF006E]' : load > 70 ? 'text-amber-400' : 'text-[#39FF14]'}`}>
        {load}%
      </span>
    </div>
  );
}

export function TeamAssignment({ assignment, assignments }: TeamAssignmentProps) {
  // Use provided assignment, or first from list
  const allAssignments = assignments && assignments.length > 0 ? assignments : [];
  const activeAssignment = assignment || allAssignments[0];
  
  if (!activeAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="w-10 h-10 text-white/20 mb-3" />
        <p className="text-white/40 text-sm font-medium">No team assignments</p>
        <p className="text-white/20 text-xs mt-1">Assign team members to this package to get started</p>
      </div>
    );
  }
  
  const suggestedTeam = activeAssignment.assignedTeamMembers;

  return (
    <div className="space-y-6">
      {/* Connection Flow Header */}
      <div>
        <h3 className="font-display font-bold text-white text-base">Team + Client + Package Connection</h3>
        <p className="font-mono text-[11px] text-white/40">Auto-suggested team based on package workload</p>
      </div>

      {/* Connection Flow Visual */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[#00D9FF]/[0.06] via-[#7B61FF]/[0.06] to-[#39FF14]/[0.06] border border-white/[0.08]">
        {/* Client */}
        <div className="flex-1 p-3 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 text-center">
          <Users className="w-5 h-5 text-[#00D9FF] mx-auto mb-1" />
          <p className="font-mono text-[11px] text-[#00D9FF] font-bold">{activeAssignment.clientName}</p>
          <p className="font-mono text-[9px] text-white/30">Client</p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
        {/* Package */}
        <div className="flex-1 p-3 rounded-lg bg-[#7B61FF]/10 border border-[#7B61FF]/20 text-center">
          <Brain className="w-5 h-5 text-[#7B61FF] mx-auto mb-1" />
          <p className="font-mono text-[11px] text-[#7B61FF] font-bold">Royal Dominance</p>
          <p className="font-mono text-[9px] text-white/30">Package</p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
        {/* Team */}
        <div className="flex-1 p-3 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 text-center">
          <UserCheck className="w-5 h-5 text-[#39FF14] mx-auto mb-1" />
          <p className="font-mono text-[11px] text-[#39FF14] font-bold">{suggestedTeam.length} Members</p>
          <p className="font-mono text-[9px] text-white/30">Auto Assigned</p>
        </div>
      </div>

      {/* System Suggestion Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-[#7B61FF]/10 to-[#00D9FF]/10 border border-[#7B61FF]/20"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#7B61FF]/20 text-[#7B61FF] shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white mb-1">System Suggestion</p>
            <p className="font-mono text-[11px] text-white/60">
              "Based on package workload, assign minimum <span className="text-[#00D9FF] font-bold">{suggestedTeam.length} team members</span>. 
              Current configuration requires approximately <span className="text-[#39FF14] font-bold">160+ hours/month</span> of creative capacity."
            </p>
          </div>
        </div>
      </motion.div>

      {/* Assigned Team Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-bold text-white text-sm">Assigned Team</h4>
          <span className="font-mono text-[10px] text-white/30">{suggestedTeam.length} members</span>
        </div>
        <div className="space-y-2">
          {suggestedTeam.map((member, idx) => (
            <motion.div
              key={member.memberId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-all"
            >
              {/* Avatar */}
              <div className="relative">
                <img
                  src={member.memberAvatar}
                  alt={member.memberName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                />
                {member.recommended && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#39FF14] flex items-center justify-center">
                    <UserCheck className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white font-semibold truncate">{member.memberName}</span>
                  {member.recommended && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20">
                      AI Pick
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-white/40">{member.role}</span>
              </div>

              {/* Load */}
              <div className="w-24">
                <LoadBar load={member.currentLoad} />
              </div>

              {/* Overload warning */}
              {member.currentLoad > 85 && (
                <AlertCircle className="w-4 h-4 text-[#FF006E] shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Team Roles Required */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <h4 className="font-display font-bold text-white text-sm mb-3">Required Roles for Package</h4>
        <div className="flex flex-wrap gap-2">
          {['Designer', 'Video Editor', 'Media Buyer', 'Account Manager', 'Copywriter'].map((role) => {
            const assigned = suggestedTeam.find((m) => m.role === role);
            return (
              <div
                key={role}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[11px] ${
                  assigned
                    ? 'border-[#39FF14]/20 bg-[#39FF14]/[0.05] text-[#39FF14]'
                    : 'border-[#FF006E]/20 bg-[#FF006E]/[0.05] text-[#FF006E]'
                }`}
              >
                {assigned ? <UserCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {role}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
