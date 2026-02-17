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

export const branches: Branch[] = [
  { id: 'b1', name: 'Dubai HQ', manager: 'Ahmed Al-Rashid', clientCount: 45, status: 'active', location: 'Dubai, UAE' },
  { id: 'b2', name: 'Cairo Branch', manager: 'Fatima Hassan', clientCount: 32, status: 'active', location: 'Cairo, Egypt' },
  { id: 'b3', name: 'Riyadh Office', manager: 'Omar Khalid', clientCount: 18, status: 'active', location: 'Riyadh, KSA' },
  { id: 'b4', name: 'Lagos Outpost', manager: 'Adeola Bakare', clientCount: 12, status: 'inactive', location: 'Lagos, Nigeria' },
];

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

export const users: UserAccount[] = [
  { id: 'u1', name: 'Ahmed Al-Rashid', email: 'ahmed@titandev.ai', avatar: 'AR', role: 'Super Admin', status: 'active', lastLogin: '2 min ago', twoFactorEnabled: true, ipRestricted: false },
  { id: 'u2', name: 'Fatima Hassan', email: 'fatima@titandev.ai', avatar: 'FH', role: 'Account Manager', status: 'active', lastLogin: '15 min ago', twoFactorEnabled: true, ipRestricted: false },
  { id: 'u3', name: 'Omar Khalid', email: 'omar@titandev.ai', avatar: 'OK', role: 'Creative Lead', status: 'active', lastLogin: '1 hr ago', twoFactorEnabled: false, ipRestricted: false },
  { id: 'u4', name: 'Sarah Chen', email: 'sarah@titandev.ai', avatar: 'SC', role: 'Finance Officer', status: 'active', lastLogin: '3 hr ago', twoFactorEnabled: true, ipRestricted: true },
  { id: 'u5', name: 'Adeola Bakare', email: 'adeola@titandev.ai', avatar: 'AB', role: 'Media Buyer', status: 'inactive', lastLogin: '5 days ago', twoFactorEnabled: false, ipRestricted: false },
  { id: 'u6', name: 'Raj Patel', email: 'raj@titandev.ai', avatar: 'RP', role: 'Account Manager', status: 'suspended', lastLogin: '12 days ago', twoFactorEnabled: false, ipRestricted: true },
];

export const teamConfigs: TeamConfig[] = [
  { id: 't1', category: 'Creative', lead: 'Omar Khalid', maxWorkloadPercent: 85, memberCount: 12, crossTeamAllowed: true, overloadWarningPercent: 80, autoRedistribute: true },
  { id: 't2', category: 'Media Buying', lead: 'Adeola Bakare', maxWorkloadPercent: 90, memberCount: 6, crossTeamAllowed: false, overloadWarningPercent: 85, autoRedistribute: false },
  { id: 't3', category: 'Account Management', lead: 'Fatima Hassan', maxWorkloadPercent: 80, memberCount: 8, crossTeamAllowed: true, overloadWarningPercent: 75, autoRedistribute: true },
  { id: 't4', category: 'Finance', lead: 'Sarah Chen', maxWorkloadPercent: 70, memberCount: 4, crossTeamAllowed: false, overloadWarningPercent: 65, autoRedistribute: false },
];

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

export const packageTemplates: PackageTemplate[] = [
  {
    id: 'pkg1', name: 'Infinity Plan', tier: 'advanced', monthlyFee: 4500, isActive: true,
    deliverables: { posts: 30, reels: 15, stories: 60, frames: 20, motionGraphics: 8, reviews: 4 },
  },
  {
    id: 'pkg2', name: 'Eco Lite', tier: 'starter', monthlyFee: 1200, isActive: true,
    deliverables: { posts: 12, reels: 4, stories: 20, frames: 8, motionGraphics: 2, reviews: 1 },
  },
  {
    id: 'pkg3', name: 'Royal Dominance', tier: 'custom', monthlyFee: 8500, isActive: true,
    deliverables: { posts: 60, reels: 30, stories: 120, frames: 40, motionGraphics: 15, reviews: 8, adSpend: 5000 },
  },
  {
    id: 'pkg4', name: 'Growth Pro', tier: 'growth', monthlyFee: 2800, isActive: false,
    deliverables: { posts: 20, reels: 8, stories: 40, frames: 12, motionGraphics: 5, reviews: 2 },
  },
];

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
  activeUsers: 24,
  messagesPerMinute: 142,
  taskCreationRate: 18,
  aiUsageRate: 67,
  dbPerformance: 94,
  uptime: 99.97,
};

export const errorLogs: ErrorLog[] = [
  { id: 'e1', type: 'api', message: 'Meta API rate limit exceeded on ad account ACT_8472', timestamp: '2 min ago', severity: 'warning', resolved: false },
  { id: 'e2', type: 'payment', message: 'Stripe webhook timeout for invoice INV-0847', timestamp: '15 min ago', severity: 'critical', resolved: false },
  { id: 'e3', type: 'messaging', message: 'WebSocket reconnection failed for 3 clients', timestamp: '1 hr ago', severity: 'warning', resolved: true },
  { id: 'e4', type: 'api', message: 'Google Ads API authentication token expired', timestamp: '3 hr ago', severity: 'critical', resolved: false },
  { id: 'e5', type: 'payment', message: 'Currency conversion error on Egyptian Pound transaction', timestamp: '5 hr ago', severity: 'info', resolved: true },
  { id: 'e6', type: 'messaging', message: 'File upload exceeded size limit (client: Imperial Motors)', timestamp: '8 hr ago', severity: 'info', resolved: true },
];

export const backupConfig: BackupConfig = {
  recycleBinRetention: 30,
  permanentDeleteRule: 'admin-only',
  dailyDbSnapshot: true,
  lastBackup: '2024-01-15T03:00:00Z',
};

export const emergencyControls: EmergencyControls = {
  maintenanceMode: false,
  messagingDisabled: false,
  boostDisabled: false,
  deliverableCreationDisabled: false,
};

export const changeLog: ChangeLogEntry[] = [
  { id: 'cl1', section: 'packages', field: 'autoDeduction', oldValue: 'false', newValue: 'true', changedBy: 'Ahmed Al-Rashid', timestamp: '10 min ago' },
  { id: 'cl2', section: 'messaging', field: 'editTimeLimit', oldValue: '30', newValue: '15', changedBy: 'Ahmed Al-Rashid', timestamp: '1 hr ago' },
  { id: 'cl3', section: 'clients', field: 'maxClientsPerManager', oldValue: '12', newValue: '15', changedBy: 'Ahmed Al-Rashid', timestamp: '3 hr ago' },
  { id: 'cl4', section: 'ai-automation', field: 'model', oldValue: 'openai', newValue: 'hybrid', changedBy: 'Ahmed Al-Rashid', timestamp: '1 day ago' },
  { id: 'cl5', section: 'security', field: 'maintenanceMode', oldValue: 'true', newValue: 'false', changedBy: 'Ahmed Al-Rashid', timestamp: '2 days ago' },
  { id: 'cl6', section: 'finance', field: 'autoInvoiceGeneration', oldValue: 'false', newValue: 'true', changedBy: 'Sarah Chen', timestamp: '3 days ago' },
];
