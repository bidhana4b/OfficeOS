// Client Module Types

export type ClientCategory = 
  | 'Motorcycle Dealer'
  | 'Restaurant'
  | 'Corporate'
  | 'Retail'
  | 'Healthcare'
  | 'Real Estate'
  | 'Education'
  | 'Other';

export type PackageTier = 'Starter' | 'Growth' | 'Advanced';

export type PackageType = 'Infinity' | 'Eco Lite' | 'Royal Dominance';

export interface PackageUsageItem {
  deliverable_type: string;
  label: string;
  icon: string;
  used: number;
  total: number;
  unit_label: string;
  warning_threshold: number;
}

export interface PackageUsage {
  design: { used: number; total: number };
  video: { used: number; total: number };
  copywriting: { used: number; total: number };
  boost: { used: number; total: number };
}

export interface PackageFeatureInfo {
  deliverable_type: string;
  label: string;
  icon: string;
  total_allocated: number;
  unit_label: string;
  warning_threshold: number;
  auto_deduction: boolean;
}

export interface Client {
  id: string;
  businessName: string;
  category: ClientCategory;
  location: string;
  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };
  accountManager: {
    id: string;
    name: string;
    avatar: string;
  };
  package: {
    name: string;
    tier: PackageTier;
    type: PackageType;
    startDate: string;
    renewalDate: string;
    monthlyFee: number;
    currency: string;
    description?: string;
    features?: string[];
    platformCount?: number;
    correctionLimit?: number;
  };
  packageFeatures: PackageFeatureInfo[];
  usage: PackageUsage;
  usageItems: PackageUsageItem[];
  status: 'active' | 'at-risk' | 'churning' | 'paused';
  healthScore: number;
  wallet: {
    balance: number;
    currency: string;
  };
  clientPackageId?: string;
  customMonthlyFee?: number;
  notes?: string;
}

export type ActivityType = 
  | 'deliverable_created'
  | 'boost_launched'
  | 'invoice_generated'
  | 'payment_received'
  | 'revision_requested'
  | 'approval_given'
  | 'package_renewed'
  | 'client_onboarded';

export interface Activity {
  id: string;
  clientId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    amount?: number;
    currency?: string;
    deliverableType?: string;
    platform?: string;
    status?: string;
  };
}

export interface ClientPerformance {
  clientId: string;
  postsPublished: number;
  reelsPublished: number;
  customerFramesDelivered: number;
  reviewVideosDelivered: number;
  adSpendThisMonth: number;
  leadsGenerated: number;
  testRideBookings: number;
  period: {
    start: string;
    end: string;
  };
}
