// ===== TEAM MODULE — TYPE DEFINITIONS =====

export type TeamCategory =
  | 'creative'
  | 'video-production'
  | 'media-buying'
  | 'content-copy'
  | 'client-management'
  | 'strategy-research'
  | 'hr-admin'
  | 'accounts-finance'
  | 'automation-ai'
  | 'tech-development';

export interface TeamInfo {
  id: string;
  name: string;
  category: TeamCategory;
  description: string;
  color: 'cyan' | 'magenta' | 'lime' | 'purple';
  totalMembers: number;
  activeTasks: number;
  overloadedMembers: number;
  efficiencyScore: number; // 0-100
  icon: string;
}

export type SkillTag =
  | 'Photoshop'
  | 'Illustrator'
  | 'Figma'
  | 'After Effects'
  | 'Premiere Pro'
  | 'DaVinci Resolve'
  | 'Meta Ads'
  | 'Google Ads'
  | 'TikTok Ads'
  | 'Copywriting'
  | 'SEO'
  | 'Analytics'
  | 'React'
  | 'Node.js'
  | 'Python'
  | 'AI/ML'
  | 'Excel'
  | 'Accounting'
  | 'Project Management'
  | 'Client Relations'
  | 'Strategy'
  | 'Research'
  | 'Content Planning'
  | 'Social Media'
  | 'Video Editing'
  | 'Motion Graphics'
  | 'Snapchat Ads'
  | 'LinkedIn Ads'
  | 'HR Management'
  | 'Recruitment'
  | 'TypeScript'
  | 'Automation';

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  primaryRole: string;
  secondaryRoles: string[];
  skillTags: SkillTag[];
  workCapacityHours: number; // hours per day
  currentLoad: number; // percentage 0-100
  status: 'online' | 'away' | 'offline' | 'busy';
  belongsToTeams: TeamCategory[];
  // Assignment Panel
  assignedClients: string[];
  assignedPackages: string[];
  activeDeliverables: number;
  boostCampaigns: number;
  // Performance Metrics
  tasksCompletedThisMonth: number;
  avgDeliveryTime: string; // e.g. "2.3 days"
  revisionCount: number;
  clientRating: number; // 0-5
  joinDate: string;
  email: string;
}

export interface TeamDashboardSummary {
  totalActiveClients: number;
  totalActiveDeliverables: number;
  pendingApprovals: number;
  runningCampaigns: number;
  overdueTasks: number;
  lowPackageClients: number;
}

export type TeamViewMode = 'grid' | 'list' | 'member-detail';

// Team category display labels
export const teamCategoryLabels: Record<string, string> = {
  creative: 'Creative Team',
  'video-production': 'Video Production',
  'media-buying': 'Media Buying',
  'content-copy': 'Content & Copy',
  'client-management': 'Client Management',
  'strategy-research': 'Strategy & Research',
  'hr-admin': 'HR & Admin',
  'accounts-finance': 'Accounts & Finance',
  'automation-ai': 'Automation / AI',
  'tech-development': 'Tech & Development',
};
