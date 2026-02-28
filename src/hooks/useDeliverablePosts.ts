import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  fetchDeliverablePosts,
  fetchDeliverablePostById,
  createDeliverablePost,
  updateDeliverablePost,
  deleteDeliverablePost,
  addPostComment,
  togglePostReaction,
  approvePost,
  requestRevision,
  uploadPostFile,
  fetchPostComments,
  getPostStats,
} from '@/lib/deliverable-posts-service';
import type {
  DeliverablePost,
  PostComment,
  PostStatus,
  PostPriority,
  ReactionType,
} from '@/components/deliverable-posts/types';
import type { CreatePostInput } from '@/lib/deliverable-posts-service';

export function useDeliverablePosts(filters?: {
  client_id?: string;
  workspace_id?: string;
  channel_id?: string;
  assigned_to?: string;
  status?: PostStatus | PostStatus[];
  priority?: PostPriority;
}) {
  const [posts, setPosts] = useState<DeliverablePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeliverablePosts(filters);
      setPosts(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load posts';
      setError(msg);
      console.error('[useDeliverablePosts]', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('deliverable_posts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliverable_posts', filter: `tenant_id=eq.${DEMO_TENANT_ID}` },
        () => {
          loadPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        () => {
          loadPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions' },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  const create = useCallback(async (input: CreatePostInput) => {
    const newPost = await createDeliverablePost(input);
    setPosts(prev => [newPost, ...prev]);
    return newPost;
  }, []);

  const update = useCallback(async (postId: string, updates: Partial<DeliverablePost>) => {
    const updated = await updateDeliverablePost(postId, updates);
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...updated } : p)));
    return updated;
  }, []);

  const remove = useCallback(async (postId: string) => {
    await deleteDeliverablePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const approve = useCallback(
    async (postId: string, userId: string, userType: 'team' | 'client', userName: string, notes?: string) => {
      await approvePost(postId, userId, userType, userName, notes);
      await loadPosts();
    },
    [loadPosts]
  );

  const revisionRequest = useCallback(
    async (postId: string, userId: string, userType: 'team' | 'client', userName: string, feedback: string) => {
      const result = await requestRevision(postId, userId, userType, userName, feedback);
      await loadPosts();
      return result;
    },
    [loadPosts]
  );

  const addComment = useCallback(
    async (input: Parameters<typeof addPostComment>[0]) => {
      const comment = await addPostComment(input);
      await loadPosts();
      return comment;
    },
    [loadPosts]
  );

  const react = useCallback(
    async (postId: string, userId: string, userType: 'team' | 'client', userName: string, reactionType: ReactionType) => {
      await togglePostReaction({
        post_id: postId,
        user_id: userId,
        user_type: userType,
        user_name: userName,
        reaction_type: reactionType,
      });
      await loadPosts();
    },
    [loadPosts]
  );

  const uploadFile = useCallback(
    async (postId: string, file: File, versionNumber: number, uploadedBy?: string) => {
      const version = await uploadPostFile(postId, file, versionNumber, uploadedBy);
      await loadPosts();
      return version;
    },
    [loadPosts]
  );

  return {
    posts,
    loading,
    error,
    reload: loadPosts,
    create,
    update,
    remove,
    approve,
    revisionRequest,
    addComment,
    react,
    uploadFile,
  };
}

export function usePostDetail(postId: string | null) {
  const [post, setPost] = useState<DeliverablePost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await fetchDeliverablePostById(postId);
      setPost(data);
      if (data) {
        const cmts = await fetchPostComments(postId);
        setComments(cmts);
      }
    } catch (err) {
      console.error('[usePostDetail]', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  return { post, comments, loading, reload: loadPost };
}

export function usePostStats(filters?: { client_id?: string; assigned_to?: string }) {
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    in_progress: 0,
    review: 0,
    revision: 0,
    approved: 0,
    delivered: 0,
  });

  useEffect(() => {
    getPostStats(filters).then(setStats).catch(console.error);
  }, [JSON.stringify(filters)]);

  return stats;
}
