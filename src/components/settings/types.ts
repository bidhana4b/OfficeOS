// Master System Control Center Types

export type SettingsSection =
  | 'organization'
  | 'users-roles'
  | 'teams'
  | 'clients'
  | 'packages'
  | 'messaging'
  | 'media-buying'
  | 'finance'
  | 'ai-automation'
  | 'appearance'
  | 'monitoring'
  | 'security';

export interface SettingsSectionConfig {
  id: SettingsSection;
  label: string;
  icon: string;
  description: string;
  badge?: string;
}

// Organization
export interface CompanyProfile {
  name: string;
  logo: string;
  brandColor: string;
  address: string;
  taxInfo: string;
  invoiceFooter: string;
  legalInfo: string;
  paymentMethods: string[];
}

export interface Branch {
  id: string;
  name: string;
  manager: string;
  clientCount: number;
  status: 'active' | 'inactive';
  location: string;
}

// Users & Roles
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
  userCount: number;
  isSystem: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  twoFactorEnabled: boolean;
  ipRestricted: boolean;
}

// Team Control
export interface TeamConfig {
  id: string;
  category: string;
  lead: string;
  maxWorkloadPercent: number;
  memberCount: number;
  crossTeamAllowed: boolean;
  overloadWarningPercent: number;
  autoRedistribute: boolean;
}

// Client Control
export interface ClientRules {
  maxClientsPerManager: number;
  autoAssignManager: boolean;
  clientPortalEnabled: boolean;
  healthScoreWeights: {
    engagement: number;
    paymentDelay: number;
    usageOverLimit: number;
  };
}

// Package Engine
export interface PackageTemplate {
  id: string;
  name: string;
  tier: 'starter' | 'growth' | 'advanced' | 'custom';
  monthlyFee: number;
  deliverables: Record<string, number>;
  isActive: boolean;
}

export interface PackageBehavior {
  autoDeduction: boolean;
  warningThresholdPercent: number;
  graceUsageLimitPercent: number;
  autoUpgradeSuggestion: boolean;
  customCreditEnabled: boolean;
}

export interface DeliverableMapping {
  type: string;
  unitCost: number;
  label: string;
}

// Messaging
export interface MessagingRules {
  autoCreateChannels: boolean;
  clientCanCreateChannels: boolean;
  internalChannelVisibility: 'all' | 'team' | 'admin';
  editTimeLimit: number;
  deletePermission: 'admin' | 'author' | 'none';
  fileSizeLimit: number;
  allowedFileTypes: string[];
  deliverableFromMessage: boolean;
  autoDeductOnCreate: boolean;
  boostAutoCreate: boolean;
  aiReplySuggestion: boolean;
  autoWeeklySummary: boolean;
  sentimentDetection: boolean;
}

// Media Buying
export interface MediaBuyingRules {
  allowManualBudgetOverride: boolean;
  minimumBudget: number;
  autoWalletDeduction: boolean;
  allowNegativeBalance: boolean;
  autoAlertThreshold: number;
  vendorPaymentDelayAlert: number;
  metaApiStatus: 'connected' | 'disconnected' | 'error';
  googleAdsApiStatus: 'connected' | 'disconnected' | 'error';
}

// Finance
export interface FinanceRules {
  defaultTemplate: string;
  autoInvoiceGeneration: boolean;
  recurringBillingCycle: 'monthly' | 'quarterly' | 'annually';
  paymentReminderDays: number[];
  manualEditPermission: boolean;
  backdatedEntryLimit: number;
  approvalRequired: boolean;
  monthlyClosingDay: number;
  autoFinancialReport: boolean;
}

// AI & Automation
export interface AIConfig {
  model: 'openai' | 'gemini' | 'hybrid';
  monthlyUsageCap: number;
  perClientLimit: number;
  autoOverdueReminder: boolean;
  autoCampaignPauseOnLowWallet: boolean;
  autoReportSchedule: 'daily' | 'weekly' | 'monthly' | 'off';
}

// Appearance
export interface ThemeConfig {
  activePreset: string;
  globalOverride: boolean;
  perUserThemeAllowed: boolean;
  dashboardLayout: 'compact' | 'extended' | 'client-simplified';
}

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

// Monitoring
export interface SystemHealth {
  activeUsers: number;
  messagesPerMinute: number;
  taskCreationRate: number;
  aiUsageRate: number;
  dbPerformance: number; // percentage
  uptime: number; // percentage
}

export interface ErrorLog {
  id: string;
  type: 'api' | 'messaging' | 'payment';
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  resolved: boolean;
}

// Security
export interface BackupConfig {
  recycleBinRetention: number; // days
  permanentDeleteRule: 'admin-only' | 'after-retention';
  dailyDbSnapshot: boolean;
  lastBackup: string;
}

export interface EmergencyControls {
  maintenanceMode: boolean;
  messagingDisabled: boolean;
  boostDisabled: boolean;
  deliverableCreationDisabled: boolean;
}

// Change History
export interface ChangeLogEntry {
  id: string;
  section: SettingsSection;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  timestamp: string;
}
