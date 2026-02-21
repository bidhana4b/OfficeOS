// ===== SETTINGS MODULE — DEFAULT CONFIGURATION VALUES =====
// These are initial/default values used when no database settings exist yet.

import type {
  CompanyProfile,
  Branch,
  Role,
  UserAccount,
  TeamConfig,
  ClientRules,
  PackageTemplate,
  PackageBehavior,
  DeliverableMapping,
  MessagingRules,
  MediaBuyingRules,
  FinanceRules,
  AIConfig,
  ThemeConfig,
  ThemePreset,
  SystemHealth,
  ErrorLog,
  BackupConfig,
  EmergencyControls,
  ChangeLogEntry,
} from './types';

export const companyProfile: CompanyProfile = {
  name: 'TITAN DEV AI Agency',
  logo: '/logo.png',
  brandColor: '#00D9FF',
  address: '42 Innovation Drive, Tech District, Dubai, UAE',
  taxInfo: 'VAT# AE-100-2847293',
  invoiceFooter: 'Payment due within 30 days. Late fees of 2% apply.',
  legalInfo: 'TITAN DEV AI LLC. Registered in UAE Free Zone.',
  paymentMethods: ['Bank Transfer', 'Credit Card', 'PayPal', 'Crypto (USDT)'],
};

export const branches: Branch[] = [];

export const roles: Role[] = [
  {
    id: 'r1', name: 'Super Admin', description: 'Full system access with override capabilities', userCount: 2, isSystem: true,
    permissions: {
      clients: { create: true, read: true, update: true, delete: true },
      projects: { create: true, read: true, update: true, delete: true },
      finance: { create: true, read: true, update: true, delete: true },
      media: { create: true, read: true, update: true, delete: true },
      team: { create: true, read: true, update: true, delete: true },
      settings: { create: true, read: true, update: true, delete: true },
    },
  },
  {
    id: 'r2', name: 'Account Manager', description: 'Client management and project oversight', userCount: 8, isSystem: true,
    permissions: {
      clients: { create: true, read: true, update: true, delete: false },
      projects: { create: true, read: true, update: true, delete: false },
      finance: { create: false, read: true, update: false, delete: false },
      media: { create: true, read: true, update: true, delete: false },
      team: { create: false, read: true, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    },
  },
  {
    id: 'r3', name: 'Creative Lead', description: 'Content creation and deliverable management', userCount: 5, isSystem: true,
    permissions: {
      clients: { create: false, read: true, update: false, delete: false },
      projects: { create: true, read: true, update: true, delete: false },
      finance: { create: false, read: false, update: false, delete: false },
      media: { create: false, read: true, update: false, delete: false },
      team: { create: false, read: true, update: true, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    },
  },
  {
    id: 'r4', name: 'Finance Officer', description: 'Financial operations and reporting', userCount: 3, isSystem: false,
    permissions: {
      clients: { create: false, read: true, update: false, delete: false },
      projects: { create: false, read: true, update: false, delete: false },
      finance: { create: true, read: true, update: true, delete: true },
      media: { create: false, read: true, update: false, delete: false },
      team: { create: false, read: false, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    },
  },
  {
    id: 'r5', name: 'Media Buyer', description: 'Ad campaign management and optimization', userCount: 4, isSystem: false,
    permissions: {
      clients: { create: false, read: true, update: false, delete: false },
      projects: { create: false, read: true, update: false, delete: false },
      finance: { create: false, read: true, update: false, delete: false },
      media: { create: true, read: true, update: true, delete: true },
      team: { create: false, read: false, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    },
  },
];

export const users: UserAccount[] = [];

export const teamConfigs: TeamConfig[] = [];

export const clientRules: ClientRules = {
  maxClientsPerManager: 15,
  autoAssignManager: true,
  clientPortalEnabled: true,
  healthScoreWeights: {
    engagement: 40,
    paymentDelay: 35,
    usageOverLimit: 25,
  },
};

export const packageTemplates: PackageTemplate[] = [];

export const packageBehavior: PackageBehavior = {
  autoDeduction: true,
  warningThresholdPercent: 20,
  graceUsageLimitPercent: 10,
  autoUpgradeSuggestion: true,
  customCreditEnabled: false,
};

export const deliverableMappings: DeliverableMapping[] = [
  { type: 'post', unitCost: 1.0, label: 'Social Post' },
  { type: 'reel', unitCost: 1.0, label: 'Reel / Short Video' },
  { type: 'story', unitCost: 0.5, label: 'Story' },
  { type: 'frame', unitCost: 0.2, label: 'Customer Frame' },
  { type: 'motion_graphic', unitCost: 1.5, label: 'Motion Graphic' },
  { type: 'review_video', unitCost: 2.0, label: 'Review Video' },
  { type: 'blog_article', unitCost: 3.0, label: 'Blog Article' },
  { type: 'ad_creative', unitCost: 1.5, label: 'Ad Creative' },
];

export const messagingRules: MessagingRules = {
  autoCreateChannels: true,
  clientCanCreateChannels: false,
  internalChannelVisibility: 'team',
  editTimeLimit: 15,
  deletePermission: 'author',
  fileSizeLimit: 25,
  allowedFileTypes: ['image/*', 'video/*', '.pdf', '.doc', '.docx', '.xlsx', '.pptx'],
  deliverableFromMessage: true,
  autoDeductOnCreate: true,
  boostAutoCreate: false,
  aiReplySuggestion: true,
  autoWeeklySummary: true,
  sentimentDetection: false,
};

export const mediaBuyingRules: MediaBuyingRules = {
  allowManualBudgetOverride: true,
  minimumBudget: 100,
  autoWalletDeduction: true,
  allowNegativeBalance: false,
  autoAlertThreshold: 500,
  vendorPaymentDelayAlert: 3,
  metaApiStatus: 'connected',
  googleAdsApiStatus: 'disconnected',
};

export const financeRules: FinanceRules = {
  defaultTemplate: 'Modern Dark',
  autoInvoiceGeneration: true,
  recurringBillingCycle: 'monthly',
  paymentReminderDays: [3, 7, 14, 30],
  manualEditPermission: false,
  backdatedEntryLimit: 7,
  approvalRequired: true,
  monthlyClosingDay: 25,
  autoFinancialReport: true,
};

export const aiConfig: AIConfig = {
  model: 'hybrid',
  monthlyUsageCap: 10000,
  perClientLimit: 500,
  autoOverdueReminder: true,
  autoCampaignPauseOnLowWallet: true,
  autoReportSchedule: 'weekly',
};

export const themeConfig: ThemeConfig = {
  activePreset: 'cyber-midnight',
  globalOverride: false,
  perUserThemeAllowed: true,
  dashboardLayout: 'extended',
};

export const themePresets: ThemePreset[] = [
  { id: 'cyber-midnight', name: 'Cyber Midnight', primary: '#00D9FF', secondary: '#7B61FF', accent: '#FF006E', background: '#0A0E27' },
  { id: 'neon-abyss', name: 'Neon Abyss', primary: '#39FF14', secondary: '#FF006E', accent: '#FFD700', background: '#0B0F1A' },
  { id: 'arctic-storm', name: 'Arctic Storm', primary: '#60A5FA', secondary: '#A78BFA', accent: '#34D399', background: '#0F172A' },
  { id: 'solar-flare', name: 'Solar Flare', primary: '#F59E0B', secondary: '#EF4444', accent: '#F97316', background: '#1C1917' },
  { id: 'phantom-glass', name: 'Phantom Glass', primary: '#E2E8F0', secondary: '#94A3B8', accent: '#22D3EE', background: '#020617' },
  { id: 'crimson-ops', name: 'Crimson Ops', primary: '#FF006E', secondary: '#DC2626', accent: '#FF4500', background: '#180A0A' },
  { id: 'emerald-matrix', name: 'Emerald Matrix', primary: '#10B981', secondary: '#059669', accent: '#34D399', background: '#0A1A14' },
  { id: 'royal-amethyst', name: 'Royal Amethyst', primary: '#A855F7', secondary: '#7C3AED', accent: '#C084FC', background: '#1A0A2E' },
  { id: 'titan-default', name: 'TITAN Default', primary: '#00D9FF', secondary: '#FF006E', accent: '#39FF14', background: '#0A0E27' },
];

export const systemHealth: SystemHealth = {
  activeUsers: 0,
  messagesPerMinute: 0,
  taskCreationRate: 0,
  aiUsageRate: 0,
  dbPerformance: 0,
  uptime: 0,
};

export const errorLogs: ErrorLog[] = [];

export const backupConfig: BackupConfig = {
  recycleBinRetention: 30,
  permanentDeleteRule: 'admin-only',
  dailyDbSnapshot: true,
  lastBackup: new Date().toISOString(),
};

export const emergencyControls: EmergencyControls = {
  maintenanceMode: false,
  messagingDisabled: false,
  boostDisabled: false,
  deliverableCreationDisabled: false,
};

export const changeLog: ChangeLogEntry[] = [];
