import { motion } from 'framer-motion';
import { Gauge, Clock, Users, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { calculateWorkload } from './utils';
import type { PackageAssignment, PackageWorkload } from './types';

interface WorkloadEngineProps {
  assignments?: PackageAssignment[];
}

export function WorkloadEngine({ assignments }: WorkloadEngineProps) {
  const activeAssignments = assignments && assignments.length > 0 ? assignments : [];
  const workloads: PackageWorkload[] = activeAssignments.map(calculateWorkload);
  const totalHours = workloads.reduce((s, w) => s + w.totalHoursRequired, 0);
  const totalUnits = workloads.reduce((s, w) => s + w.totalCreativeUnits, 0);
  const avgUtilization = workloads.length > 0 ? Math.round(workloads.reduce((s, w) => s + w.teamUtilization, 0) / workloads.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base">Internal Workload Engine</h3>
          <p className="font-mono text-[11px] text-white/40">Auto-calculated from all active packages</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <Gauge className="w-3.5 h-3.5 text-[#00D9FF]" />
          <span className="font-mono text-[10px] text-white/40">Real-time Calculation</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Creative Units',
            value: totalUnits,
            suffix: 'units',
            icon: <Zap className="w-5 h-5" />,
            color: '#00D9FF',
          },
          {
            label: 'Total Hours Required',
            value: `${totalHours.toFixed(0)}h`,
            suffix: '/month',
            icon: <Clock className="w-5 h-5" />,
            color: '#7B61FF',
          },
          {
            label: 'Active Packages',
            value: activeAssignments.length,
            suffix: 'packages',
            icon: <TrendingUp className="w-5 h-5" />,
            color: '#39FF14',
          },
          {
            label: 'Avg Utilization',
            value: `${avgUtilization}%`,
            suffix: '',
            icon: <Users className="w-5 h-5" />,
            color: avgUtilization > 80 ? '#FF006E' : avgUtilization > 60 ? '#FFB800' : '#39FF14',
          },
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                {card.icon}
              </div>
              <span className="font-mono text-[10px] text-white/40">{card.label}</span>
            </div>
            <p className="font-display font-extrabold text-2xl text-white">
              {card.value}
              <span className="font-mono text-[10px] text-white/30 ml-1">{card.suffix}</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* Per-Package Workload */}
      <div className="space-y-3">
        <h4 className="font-display font-bold text-white text-sm">Per-Package Breakdown</h4>
        {workloads.map((wl, idx) => {
          const utilColor = wl.teamUtilization > 80 ? '#FF006E' : wl.teamUtilization > 60 ? '#FFB800' : '#39FF14';
          const assignment = activeAssignments[idx];

          return (
            <motion.div
              key={wl.packageId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden"
            >
              {/* Package Header */}
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF]/20 to-[#7B61FF]/20 border border-white/10 flex items-center justify-center">
                      <span className="font-display font-bold text-white text-sm">{wl.packageName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-display font-bold text-white text-sm">{wl.packageName}</p>
                      <p className="font-mono text-[10px] text-white/40">{assignment.assignedTeamMembers.length} team members</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-white/30">Team Utilization</span>
                      {wl.teamUtilization > 80 && <AlertTriangle className="w-3.5 h-3.5 text-[#FF006E]" />}
                    </div>
                    <p className="font-display font-bold text-xl" style={{ color: utilColor }}>
                      {wl.teamUtilization}%
                    </p>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${wl.teamUtilization}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: utilColor }}
                  />
                </div>

                {/* Quick Stats */}
                <div className="mt-3 flex items-center gap-4">
                  <span className="font-mono text-[10px] text-white/40">
                    <span className="text-[#00D9FF] font-bold">{wl.totalCreativeUnits}</span> creative units
                  </span>
                  <span className="font-mono text-[10px] text-white/40">
                    <span className="text-[#7B61FF] font-bold">{wl.totalHoursRequired.toFixed(0)}h</span> required
                  </span>
                  <span className="font-mono text-[10px] text-white/40">
                    <span className="text-white font-bold">{(assignment.assignedTeamMembers.length * 160).toFixed(0)}h</span> capacity
                  </span>
                </div>
              </div>

              {/* Workload Breakdown */}
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {wl.workloadBreakdown.map((unit) => (
                    <div
                      key={unit.deliverableType}
                      className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                    >
                      <p className="font-mono text-[9px] text-white/30 truncate">{unit.category}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-display font-bold text-sm text-white">{unit.quantity}</span>
                        <span className="font-mono text-[9px] text-white/20">× {unit.hoursPerUnit}h</span>
                      </div>
                      <p className="font-mono text-[10px] text-[#00D9FF]">{unit.totalHours}h total</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Global Team Capacity Dashboard */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-[#00D9FF]/[0.06] via-[#7B61FF]/[0.06] to-[#FF006E]/[0.06] border border-white/[0.08]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF]">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-sm">Global Creative Team Capacity</h4>
            <p className="font-mono text-[10px] text-white/40">Across all active packages</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="font-mono text-[10px] text-white/30">Total Demand</p>
            <p className="font-display font-extrabold text-2xl text-[#00D9FF]">{totalHours.toFixed(0)}h</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-[10px] text-white/30">Available Capacity</p>
            <p className="font-display font-extrabold text-2xl text-[#39FF14]">
              {(activeAssignments.reduce((s, a) => s + a.assignedTeamMembers.length, 0) * 160).toFixed(0)}h
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-[10px] text-white/30">Overall Utilization</p>
            <p
              className="font-display font-extrabold text-2xl"
              style={{
                color: avgUtilization > 80 ? '#FF006E' : avgUtilization > 60 ? '#FFB800' : '#39FF14',
              }}
            >
              {avgUtilization}%
            </p>
          </div>
        </div>

        {/* Global bar */}
        <div className="mt-4 h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${avgUtilization}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full bg-gradient-to-r from-[#39FF14] via-[#FFB800] to-[#FF006E]"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[9px] text-white/20">0%</span>
          <span className="font-mono text-[9px] text-white/20">50%</span>
          <span className="font-mono text-[9px] text-white/20">100%</span>
        </div>
      </div>
    </div>
  );
}
