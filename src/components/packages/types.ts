// ===== PACKAGE MODULE — TYPE DEFINITIONS =====

export type PackageCategory = 'Motorcycle Dealer' | 'Restaurant' | 'Corporate' | 'Custom';

export type PricingTier = 'Starter' | 'Growth' | 'Advanced' | 'Premium';

export type PackagePlanType = 'Category-Based' | 'Infinity Plan' | 'Eco Lite';

export type DeliverableType =
  | 'photo_graphics'
  | 'video_edit'
  | 'motion_graphics'
  | 'reels'
  | 'copywriting'
  | 'customer_frames'
  | 'service_frames'
  | 'boost_campaign'
  | 'ads_management'
  | 'influencer_marketing'
  | 'seo'
  | 'social_media_posts';

export interface DeliverableConfig {
  type: DeliverableType;
  label: string;
  icon: string; // lucide icon name
  totalAllocated: number;
  used: number;
  remaining: number;
  warningThreshold: number; // percentage below which warning shows
  autoDeduction: boolean;
  unitLabel: string; // "designs", "videos", etc.
}

export interface PackageTemplate {
  id: string;
  name: string;
  planType: PackagePlanType;
  category: PackageCategory | null; // null for universal plans
  tier: PricingTier;
  monthlyFee: number;
  currency: string;
  platformCount: number;
  deliverables: DeliverableConfig[];
  correctionLimit: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export interface PackageAssignment {
  id: string;
  packageTemplateId: string;
  clientId: string;
  clientName: string;
  assignedTeamMembers: TeamSuggestion[];
  startDate: string;
  renewalDate: string;
  status: 'active' | 'paused' | 'expired';
  deliverables: DeliverableConfig[];
}

export interface TeamSuggestion {
  role: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  currentLoad: number;
  recommended: boolean;
}

export interface WorkloadUnit {
  category: string;
  deliverableType: DeliverableType;
  quantity: number;
  hoursPerUnit: number;
  totalHours: number;
}

export interface PackageWorkload {
  packageId: string;
  packageName: string;
  totalCreativeUnits: number;
  totalHoursRequired: number;
  workloadBreakdown: WorkloadUnit[];
  teamCapacityRequired: number; // hours
  teamUtilization: number; // percentage
}

export interface UsageDeductionEvent {
  id: string;
  packageAssignmentId: string;
  deliverableType: DeliverableType;
  deliverableName: string;
  quantity: number;
  timestamp: string;
  confirmedBy: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export type PackageViewMode = 'list' | 'comparison' | 'builder' | 'workload';
