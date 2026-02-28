import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, SortAsc, SortDesc, Search, LayoutGrid, List,
  TrendingUp, Clock, CheckCircle, RotateCcw, Loader2,
  AlertCircle, Inbox, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeliverablePosts, usePostStats } from '@/hooks/useDeliverablePosts';
import { PostCard } from './PostCard';
import CreatePostForm from './CreatePostForm';
import { DataSourceIndicator } from '@/components/ui/data-source-indicator';
import type { PostStatus, PostPriority, ReactionType } from './types';
import { STATUS_CONFIG } from './types';

interface DeliverableFeedProps {
  clientId?: string;
  workspaceId?: string;
  channelId?: string;
  assignedTo?: string;
  currentUserId: string;
  currentUserType: 'team' | 'client';
  currentUserName: string;
  teamMembers?: Array<{ id: string; name: string; avatar?: string; role?: string }>;
  showCreateForm?: boolean;
  compact?: boolean;
  title?: string;
}

export default function DeliverableFeed({
  clientId,
  workspaceId,
  channelId,
  assignedTo,
  currentUserId,
  currentUserType,
  currentUserName,
  teamMembers = [],
  showCreateForm = true,
  compact = false,
  title = 'Deliverable Feed',
}: DeliverableFeedProps) {
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PostPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateExpanded, setShowCreateExpanded] = useState(false);

  const filters = useMemo(() => ({
    client_id: clientId,
    workspace_id: workspaceId,
    channel_id: channelId,
    assigned_to: assignedTo,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
  }), [clientId, workspaceId, channelId, assignedTo, statusFilter, priorityFilter]);

  const {
    posts,
    loading,
    error,
    reload,
    create,
    approve,
    revisionRequest,
    addComment,
    react,
    uploadFile,
  } = useDeliverablePosts(filters);

  const stats = usePostStats({ client_id: clientId, assigned_to: assignedTo });

  // Client-side filtering & sorting
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      // Priority: urgent > high > medium > low
      const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

    return result;
  }, [posts, searchQuery, sortOrder]);

  const handleCreatePost = async (data: {
    title: string;
    description: string;
    priority: PostPriority;
    due_date?: string;
    assigned_to?: string;
    files?: File[];
  }) => {
    try {
      const newPost = await create({
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date,
        assigned_to: data.assigned_to,
        client_id: clientId,
        workspace_id: workspaceId,
        channel_id: channelId,
        created_by: currentUserId,
        status: 'draft',
      });

      // Upload files as v1
      if (data.files && data.files.length > 0) {
        for (let i = 0; i < data.files.length; i++) {
          await uploadFile(newPost.id, data.files[i], 1, currentUserId);
        }
      }

      setShowCreateExpanded(false);
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleApprove = async (postId: string) => {
    await approve(postId, currentUserId, currentUserType, currentUserName, 'Approved!');
  };

  const handleRequestRevision = async (postId: string, feedback: string) => {
    const result = await revisionRequest(postId, currentUserId, currentUserType, currentUserName, feedback);
    if (result.isBillable) {
      // Could show a toast/notification about extra charges
      console.log(`Revision ${result.revisionCount}/${result.maxRevisions} — billable!`);
    }
  };

  const handleReact = async (postId: string, reactionType: ReactionType) => {
    await react(postId, currentUserId, currentUserType, currentUserName, reactionType);
  };

  const handleAddComment = async (postId: string, content: string, isRevisionRequest: boolean, files?: File[]) => {
    const comment = await addComment({
      post_id: postId,
      author_id: currentUserId,
      author_type: currentUserType,
      author_name: currentUserName,
      content,
      is_revision_request: isRevisionRequest,
    });
    // TODO: upload comment files
  };

  const handleUploadVersion = async (postId: string, file: File) => {
    const post = posts.find(p => p.id === postId);
    const nextVersion = (post?.versions?.length || 0) + 1;
    await uploadFile(postId, file, nextVersion, currentUserId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER & STATS */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-bold text-lg text-white">{title}</h2>
            <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">
              {stats.total} total
            </Badge>
            <DataSourceIndicator isRealData={posts.length > 0} size="xs" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white/40 hover:text-white gap-1"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/40 hover:text-white"
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'priority' : 'newest')}
              title={`Sort: ${sortOrder}`}
            >
              {sortOrder === 'newest' ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Quick Stats Chips */}
        <div className="flex gap-2 flex-wrap mb-3">
          <StatsChip
            label="In Progress"
            count={stats.in_progress}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            active={statusFilter === 'in_progress'}
            onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          />
          <StatsChip
            label="Review"
            count={stats.review}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
            active={statusFilter === 'client_review'}
            onClick={() => setStatusFilter(statusFilter === 'client_review' ? 'all' : 'client_review')}
          />
          <StatsChip
            label="Revision"
            count={stats.revision}
            color="text-orange-400"
            bgColor="bg-orange-500/10"
            active={statusFilter === 'revision'}
            onClick={() => setStatusFilter(statusFilter === 'revision' ? 'all' : 'revision')}
          />
          <StatsChip
            label="Approved"
            count={stats.approved}
            color="text-green-400"
            bgColor="bg-green-500/10"
            active={statusFilter === 'approved'}
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          />
          <StatsChip
            label="Delivered"
            count={stats.delivered}
            color="text-cyan-400"
            bgColor="bg-cyan-500/10"
            active={statusFilter === 'delivered'}
            onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
          />
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full h-8 bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/30"
                  />
                </div>
                {statusFilter !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] border-white/10 text-white/50"
                    onClick={() => setStatusFilter('all')}
                  >
                    Clear filter ×
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FEED CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Create Post Form */}
        {showCreateForm && (
          <CreatePostForm
            onSubmit={handleCreatePost}
            teamMembers={teamMembers}
            isExpanded={showCreateExpanded}
            onToggleExpand={() => setShowCreateExpanded(!showCreateExpanded)}
          />
        )}

        {/* Loading */}
        {loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400/40 animate-spin mb-3" />
            <p className="font-mono text-xs text-white/30">Loading deliverable posts...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card p-4 border-red-500/20">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="font-mono text-xs">{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs text-cyan-400"
              onClick={reload}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="font-display font-bold text-sm text-white/40 mb-1">No Deliverable Posts Yet</h3>
            <p className="font-mono text-[11px] text-white/20 text-center max-w-xs">
              {searchQuery ? 'No posts match your search.' : 'Create your first deliverable post to start tracking work.'}
            </p>
          </div>
        )}

        {/* Post Cards */}
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            currentUserType={currentUserType}
            currentUserName={currentUserName}
            onApprove={handleApprove}
            onRequestRevision={handleRequestRevision}
            onReact={handleReact}
            onAddComment={handleAddComment}
            onUploadVersion={handleUploadVersion}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

// Stats Chip component
function StatsChip({
  label,
  count,
  color,
  bgColor,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono transition-all border',
        active
          ? `${bgColor} ${color} border-current/30`
          : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'
      )}
    >
      <span>{label}</span>
      <span className={cn('font-bold', active ? color : 'text-white/30')}>{count}</span>
    </button>
  );
}
