// ===== SMART WORKSPACE MESSAGING ENGINE (SWME) - TYPE DEFINITIONS =====

export type UserRole = 'admin' | 'manager' | 'designer' | 'media-buyer' | 'client';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
}

export interface Workspace {
  id: string;
  clientId?: string;
  clientName: string;
  clientLogo?: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimestamp?: string; // ISO timestamp for accurate sorting
  unreadCount: number;
  pinned: boolean;
  status: 'active' | 'paused' | 'at-risk' | 'churning';
  healthScore: number; // 0-100
  packageUsage: number; // percentage
  members: User[];
  channels: Channel[];
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  type: 'general' | 'deliverables' | 'boost-requests' | 'billing' | 'internal' | 'custom';
  icon: string;
  unreadCount: number;
  isHidden?: boolean; // internal channels hidden from clients
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: string; // ISO timestamp for accurate sorting
  description?: string;
  isPrivate?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'voice' | 'image' | 'video' | 'file' | 'system';

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface MessageFile {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'voice';
  url: string;
  size: string;
  thumbnail?: string;
  mimeType?: string;
}

export interface DeliverableTag {
  id: string;
  type: 'design' | 'video' | 'content' | 'seo' | 'ads' | 'social';
  label: string;
  status: 'pending' | 'in-progress' | 'review' | 'approved' | 'delivered';
  packageDeducted: boolean;
}

export interface BoostTag {
  id: string;
  platform: string;
  budget: number;
  duration: string;
  status: 'requested' | 'approved' | 'live' | 'completed' | 'rejected';
}

export interface Message {
  id: string;
  channelId: string;
  sender: User;
  content: string;
  timestamp: string;
  status: MessageStatus;
  reactions: MessageReaction[];
  files: MessageFile[];
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  isSystemMessage?: boolean;
  deliverableTag?: DeliverableTag;
  boostTag?: BoostTag;
  isPinned?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  threadCount?: number;
  messageType?: MessageType;
  voiceUrl?: string;
  voiceDuration?: number;
  forwardedFrom?: {
    id: string;
    channelName: string;
  };
  isSaved?: boolean;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  joinedAt: string;
  isMuted: boolean;
  notificationPref: 'all' | 'mentions' | 'none';
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category: string;
  usageCount: number;
}

export interface PackageUsage {
  category: string;
  used: number;
  total: number;
  color: string;
}

export interface BoostSummary {
  totalBudget: number;
  spent: number;
  activeCampaigns: number;
  platforms: { name: string; spend: number; status: string }[];
}

export interface WorkspaceInsights {
  packageUsage: PackageUsage[];
  boostSummary: BoostSummary;
  walletBalance: number;
  deliverables: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  healthScore: number;
  responseTime: string;
  satisfaction: number;
}

export interface BoostWizardData {
  platform: string;
  budget: number;
  duration: string;
  goal: string;
  targetAudience?: string;
  creativeReady: boolean;
}

export type QuickActionType = 'design' | 'video' | 'boost' | 'approval';

// Message context menu action types
export type MessageAction = 
  | 'reply'
  | 'edit'
  | 'delete'
  | 'delete-for-everyone'
  | 'pin'
  | 'unpin'
  | 'forward'
  | 'copy'
  | 'save'
  | 'unsave'
  | 'create-task';
