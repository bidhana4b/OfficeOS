export interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: 'cyan' | 'magenta' | 'lime' | 'purple';
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'task' | 'payment' | 'campaign' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  avatar?: string;
  client?: string;
}

export interface ProjectCard {
  id: string;
  title: string;
  client: string;
  clientLogo?: string;
  status: 'briefing' | 'in-progress' | 'review' | 'delivered';
  deadline: string;
  daysLeft: number;
  team: { name: string; avatar: string }[];
  progress: number;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  action: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface NotificationItem {
  id: string;
  category: 'urgent' | 'financial' | 'client' | 'team';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionType?: string | null;
  relatedClientId?: string | null;
  metadata?: Record<string, unknown> | null;
}
