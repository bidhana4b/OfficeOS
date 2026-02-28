// ===== PACKAGES MODULE — UTILITY FUNCTIONS =====
import type { PackageAssignment, PackageWorkload } from './types';

// Hours required per unit of each deliverable type
export const hoursPerUnit: Record<string, number> = {
  photo_graphics: 1.5,
  video_edit: 4,
  motion_graphics: 6,
  reels: 3,
  copywriting: 0.5,
  customer_frames: 0.75,
  service_frames: 0.75,
  boost_campaign: 4,
  ads_management: 8,
  influencer_marketing: 12,
  seo: 10,
  social_media_posts: 0.5,
};

export function calculateWorkload(assignment: PackageAssignment): PackageWorkload {
  const workloadBreakdown = assignment.deliverables.map((d) => ({
    category: d.label,
    deliverableType: d.type,
    quantity: d.remaining > 0 ? d.remaining : d.totalAllocated,
    hoursPerUnit: hoursPerUnit[d.type] || 1,
    totalHours: (d.remaining > 0 ? d.remaining : d.totalAllocated) * (hoursPerUnit[d.type] || 1),
  }));

  const totalUnits = workloadBreakdown.reduce((sum, b) => sum + b.quantity, 0);
  const totalHours = workloadBreakdown.reduce((sum, b) => sum + b.totalHours, 0);
  const teamCapacity = Math.max(assignment.assignedTeamMembers.length * 160, 160);

  return {
    packageId: assignment.id,
    packageName: assignment.clientName,
    totalCreativeUnits: totalUnits,
    totalHoursRequired: Math.round(totalHours * 10) / 10,
    workloadBreakdown,
    teamCapacityRequired: teamCapacity,
    teamUtilization: Math.min(100, Math.round((totalHours / teamCapacity) * 100)),
  };
}
