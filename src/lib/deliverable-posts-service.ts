/**
 * Deliverable Posts Data Service
 * CRUD operations for the Facebook-like deliverable post system
 */

import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type {
  DeliverablePost,
  PostVersion,
  PostComment,
  PostReaction,
  ApprovalLogEntry,
  PostStatus,
  PostPriority,
  ReactionType,
  ApprovalAction,
  ApprovalStage,
} from '@/components/deliverable-posts/types';

// ============================================
// DELIVERABLE POSTS CRUD
// ============================================

export interface CreatePostInput {
  client_id?: string;
  workspace_id?: string;
  channel_id?: string;
  deliverable_type_id?: string;
  assigned_to?: string;
  title: string;
  description?: string;
  status?: PostStatus;
  priority?: PostPriority;
  due_date?: string;
  max_revisions?: number;
  created_by?: string;
}

export async function createDeliverablePost(input: CreatePostInput): Promise<DeliverablePost> {
  const { data, error } = await supabase
    .from('deliverable_posts')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      client_id: input.client_id || null,
      workspace_id: input.workspace_id || null,
      channel_id: input.channel_id || null,
      deliverable_type_id: input.deliverable_type_id || null,
      assigned_to: input.assigned_to || null,
      title: input.title,
      description: input.description || null,
      status: input.status || 'draft',
      priority: input.priority || 'medium',
      due_date: input.due_date || null,
      max_revisions: input.max_revisions || 3,
      created_by: input.created_by || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DeliverablePost;
}

export async function fetchDeliverablePosts(filters?: {
  client_id?: string;
  workspace_id?: string;
  channel_id?: string;
  assigned_to?: string;
  status?: PostStatus | PostStatus[];
  priority?: PostPriority;
  limit?: number;
  offset?: number;
}): Promise<DeliverablePost[]> {
  let query = supabase
    .from('deliverable_posts')
    .select(`
      *,
      post_versions:post_versions(*),
      post_comments:post_comments(*, comment_attachments:comment_attachments(*)),
      post_reactions:post_reactions(*)
    `)
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (filters?.client_id) query = query.eq('client_id', filters.client_id);
  if (filters?.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters?.channel_id) query = query.eq('channel_id', filters.channel_id);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.priority) query = query.eq('priority', filters.priority);

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DeliverablePost[];
}

export async function fetchDeliverablePostById(postId: string): Promise<DeliverablePost | null> {
  const { data, error } = await supabase
    .from('deliverable_posts')
    .select(`
      *,
      post_versions:post_versions(*),
      post_comments:post_comments(*, comment_attachments:comment_attachments(*)),
      post_reactions:post_reactions(*)
    `)
    .eq('id', postId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as DeliverablePost;
}

export async function updateDeliverablePost(
  postId: string,
  updates: Partial<Pick<DeliverablePost, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'assigned_to' | 'revision_count' | 'is_billable'>>
): Promise<DeliverablePost> {
  const { data, error } = await supabase
    .from('deliverable_posts')
    .update(updates)
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data as DeliverablePost;
}

export async function deleteDeliverablePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('deliverable_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}

// ============================================
// POST VERSIONS
// ============================================

export async function addPostVersion(input: {
  post_id: string;
  version_number: number;
  file_url: string;
  file_type: string;
  file_name?: string;
  file_size?: number;
  thumbnail_url?: string;
  uploaded_by?: string;
  notes?: string;
}): Promise<PostVersion> {
  const { data, error } = await supabase
    .from('post_versions')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as PostVersion;
}

export async function fetchPostVersions(postId: string): Promise<PostVersion[]> {
  const { data, error } = await supabase
    .from('post_versions')
    .select('*')
    .eq('post_id', postId)
    .order('version_number', { ascending: true });

  if (error) throw error;
  return (data || []) as PostVersion[];
}

// ============================================
// POST COMMENTS
// ============================================

export async function addPostComment(input: {
  post_id: string;
  author_id: string;
  author_type: 'team' | 'client';
  author_name?: string;
  author_avatar?: string;
  content?: string;
  voice_url?: string;
  voice_duration?: number;
  is_revision_request?: boolean;
  parent_comment_id?: string;
}): Promise<PostComment> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert(input)
    .select('*, comment_attachments:comment_attachments(*)')
    .single();

  if (error) throw error;

  // If it's a revision request, increment the revision count on the post
  if (input.is_revision_request) {
    await supabase.rpc('increment_revision_count', { p_post_id: input.post_id }).catch(() => {
      // Fallback: manual increment
      supabase
        .from('deliverable_posts')
        .select('revision_count')
        .eq('id', input.post_id)
        .single()
        .then(({ data: post }) => {
          if (post) {
            supabase
              .from('deliverable_posts')
              .update({
                revision_count: (post.revision_count || 0) + 1,
                status: 'revision' as PostStatus,
              })
              .eq('id', input.post_id)
              .then(() => {});
          }
        });
    });
  }

  return data as PostComment;
}

export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, comment_attachments:comment_attachments(*)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as PostComment[];
}

export async function resolveComment(commentId: string, resolvedBy: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .update({
      is_resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  if (error) throw error;
}

export async function addCommentAttachment(input: {
  comment_id: string;
  file_url: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
  thumbnail_url?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('comment_attachments')
    .insert(input);

  if (error) throw error;
}

// ============================================
// POST REACTIONS
// ============================================

export async function togglePostReaction(input: {
  post_id: string;
  user_id: string;
  user_type: 'team' | 'client';
  user_name?: string;
  reaction_type: ReactionType;
}): Promise<{ added: boolean }> {
  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', input.post_id)
    .eq('user_id', input.user_id)
    .eq('reaction_type', input.reaction_type)
    .single();

  if (existing) {
    // Remove reaction
    await supabase
      .from('post_reactions')
      .delete()
      .eq('id', existing.id);
    return { added: false };
  } else {
    // Add reaction
    await supabase
      .from('post_reactions')
      .insert(input);
    return { added: true };
  }
}

export async function fetchPostReactions(postId: string): Promise<PostReaction[]> {
  const { data, error } = await supabase
    .from('post_reactions')
    .select('*')
    .eq('post_id', postId);

  if (error) throw error;
  return (data || []) as PostReaction[];
}

// ============================================
// APPROVAL LOG
// ============================================

export async function addApprovalEntry(input: {
  post_id: string;
  action: ApprovalAction;
  from_status?: string;
  to_status?: string;
  by_user_id: string;
  by_user_type: 'team' | 'client';
  by_user_name?: string;
  stage?: ApprovalStage;
  notes?: string;
}): Promise<ApprovalLogEntry> {
  const { data, error } = await supabase
    .from('approval_log')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as ApprovalLogEntry;
}

export async function fetchApprovalLog(postId: string): Promise<ApprovalLogEntry[]> {
  const { data, error } = await supabase
    .from('approval_log')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ApprovalLogEntry[];
}

// ============================================
// COMPOSITE ACTIONS
// ============================================

/**
 * Approve a deliverable post:
 * - Update status to "approved"
 * - Add approval log entry
 */
export async function approvePost(
  postId: string,
  userId: string,
  userType: 'team' | 'client',
  userName: string,
  notes?: string
): Promise<void> {
  const post = await fetchDeliverablePostById(postId);
  if (!post) throw new Error('Post not found');

  await updateDeliverablePost(postId, { status: 'approved' });

  await addApprovalEntry({
    post_id: postId,
    action: 'approved',
    from_status: post.status,
    to_status: 'approved',
    by_user_id: userId,
    by_user_type: userType,
    by_user_name: userName,
    stage: userType === 'client' ? 'client' : 'internal',
    notes,
  });
}

/**
 * Request revision on a deliverable post:
 * - Update status to "revision"
 * - Increment revision count
 * - Add approval log entry
 * - Check if over max revisions (billable)
 */
export async function requestRevision(
  postId: string,
  userId: string,
  userType: 'team' | 'client',
  userName: string,
  feedback: string
): Promise<{ isBillable: boolean; revisionCount: number; maxRevisions: number }> {
  const post = await fetchDeliverablePostById(postId);
  if (!post) throw new Error('Post not found');

  const newRevisionCount = post.revision_count + 1;
  const isBillable = newRevisionCount > post.max_revisions;

  await updateDeliverablePost(postId, {
    status: 'revision',
    revision_count: newRevisionCount,
    is_billable: isBillable,
  });

  await addApprovalEntry({
    post_id: postId,
    action: 'revision_requested',
    from_status: post.status,
    to_status: 'revision',
    by_user_id: userId,
    by_user_type: userType,
    by_user_name: userName,
    stage: userType === 'client' ? 'client' : 'internal',
    notes: feedback,
  });

  // Add as a comment too
  await addPostComment({
    post_id: postId,
    author_id: userId,
    author_type: userType,
    author_name: userName,
    content: feedback,
    is_revision_request: true,
  });

  return { isBillable, revisionCount: newRevisionCount, maxRevisions: post.max_revisions };
}

/**
 * Upload a file for a post version
 */
export async function uploadPostFile(
  postId: string,
  file: File,
  versionNumber: number,
  uploadedBy?: string
): Promise<PostVersion> {
  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `deliverables/${postId}/v${versionNumber}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('deliverable-files')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('deliverable-files')
    .getPublicUrl(filePath);

  const fileType = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
    ? 'video'
    : file.type === 'application/pdf'
    ? 'pdf'
    : 'document';

  return addPostVersion({
    post_id: postId,
    version_number: versionNumber,
    file_url: urlData.publicUrl,
    file_type: fileType,
    file_name: file.name,
    file_size: file.size,
    uploaded_by: uploadedBy,
  });
}

/**
 * Upload a comment attachment
 */
export async function uploadCommentFile(
  commentId: string,
  file: File
): Promise<void> {
  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `comments/${commentId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('deliverable-files')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('deliverable-files')
    .getPublicUrl(filePath);

  await addCommentAttachment({
    comment_id: commentId,
    file_url: urlData.publicUrl,
    file_type: file.type,
    file_name: file.name,
    file_size: file.size,
  });
}

// ============================================
// STATS
// ============================================

export async function getPostStats(filters?: {
  client_id?: string;
  assigned_to?: string;
}): Promise<{
  total: number;
  draft: number;
  in_progress: number;
  review: number;
  revision: number;
  approved: number;
  delivered: number;
}> {
  let query = supabase
    .from('deliverable_posts')
    .select('status')
    .eq('tenant_id', DEMO_TENANT_ID);

  if (filters?.client_id) query = query.eq('client_id', filters.client_id);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

  const { data, error } = await query;
  if (error) throw error;

  const posts = data || [];
  return {
    total: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    in_progress: posts.filter(p => p.status === 'in_progress').length,
    review: posts.filter(p => ['internal_review', 'client_review'].includes(p.status)).length,
    revision: posts.filter(p => p.status === 'revision').length,
    approved: posts.filter(p => p.status === 'approved').length,
    delivered: posts.filter(p => p.status === 'delivered').length,
  };
}
