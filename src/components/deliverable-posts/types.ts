// ===== DELIVERABLE POST SYSTEM - TYPE DEFINITIONS =====

export type PostStatus = 'draft' | 'in_progress' | 'internal_review' | 'client_review' | 'revision' | 'approved' | 'delivered' | 'cancelled';
export type PostPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReactionType = 'like' | 'love' | 'celebrate' | 'fire' | 'eyes';
export type ApprovalAction = 'approved' | 'rejected' | 'revision_requested' | 'status_changed';
export type ApprovalStage = 'internal' | 'client' | 'final';
export type AnnotationType = 'pin' | 'rectangle' | 'circle' | 'freehand';

export interface DeliverablePost {
  id: string;
  tenant_id: string;
  client_id: string | null;
  workspace_id: string | null;
  channel_id: string | null;
  deliverable_type_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: PostStatus;
  priority: PostPriority;
  due_date: string | null;
  revision_count: number;
  max_revisions: number;
  is_billable: boolean;
  extra_revision_cost: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  versions?: PostVersion[];
  comments?: PostComment[];
  reactions?: PostReaction[];
  assigned_member?: { name: string; avatar: string; role: string } | null;
  client_name?: string;
  deliverable_type_name?: string;
}

export interface PostVersion {
  id: string;
  post_id: string;
  version_number: number;
  file_url: string | null;
  file_type: string | null;
  thumbnail_url: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  author_type: 'team' | 'client';
  author_name: string | null;
  author_avatar: string | null;
  content: string | null;
  voice_url: string | null;
  voice_duration: number | null;
  is_revision_request: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  attachments?: CommentAttachment[];
  replies?: PostComment[];
}

export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface PostAnnotation {
  id: string;
  post_id: string;
  version_id: string | null;
  comment_id: string | null;
  x_position: number;
  y_position: number;
  width: number | null;
  height: number | null;
  annotation_type: AnnotationType;
  color: string;
  label: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  user_type: 'team' | 'client';
  user_name: string | null;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ApprovalLogEntry {
  id: string;
  post_id: string;
  action: ApprovalAction;
  from_status: string | null;
  to_status: string | null;
  by_user_id: string;
  by_user_type: 'team' | 'client';
  by_user_name: string | null;
  stage: ApprovalStage;
  notes: string | null;
  created_at: string;
}

// UI Helpers
export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  draft: { label: 'Draft', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/20', icon: '📝' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: '🔄' },
  internal_review: { label: 'Internal Review', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: '👁️' },
  client_review: { label: 'Client Review', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: '⏳' },
  revision: { label: 'Revision Needed', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', icon: '✏️' },
  approved: { label: 'Approved', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: '✅' },
  delivered: { label: 'Delivered', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20', icon: '🚀' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: '❌' },
};

export const PRIORITY_CONFIG: Record<PostPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  medium: { label: 'Medium', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  urgent: { label: 'Urgent', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

export const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: '👍', label: 'Like' },
  love: { emoji: '❤️', label: 'Love' },
  celebrate: { emoji: '🎉', label: 'Celebrate' },
  fire: { emoji: '🔥', label: 'Fire' },
  eyes: { emoji: '👀', label: 'Looking' },
};
