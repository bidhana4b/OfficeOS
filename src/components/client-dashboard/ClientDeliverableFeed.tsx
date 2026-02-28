/**
 * ClientDeliverableFeed — Mobile-first deliverable posts feed for the Client Portal.
 *
 * This replaces the old task-list view with the new Facebook-like post feed system.
 * Clients can:
 * - See all their deliverable posts in a rich feed
 * - Approve / Request revision on posts in "client_review" status
 * - React to posts (👍 ❤️ 🎉 🔥 👀)
 * - Comment on posts
 * - View file versions, download files
 * - Filter by status
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  useDeliverablePosts,
  usePostStats,
} from '@/hooks/useDeliverablePosts';
import { PostCard } from '@/components/deliverable-posts/PostCard';
import type {
  PostStatus,
  ReactionType,
} from '@/components/deliverable-posts/types';
import { STATUS_CONFIG } from '@/components/deliverable-posts/types';
import {
  ClipboardList,
  Loader2,
  Inbox,
  Search,
  Filter,
  SortDesc,
  SortAsc,
  Plus,
  CheckCircle,
  Clock,
  RotateCcw,
  Eye,
  Sparkles,
  X,
} from 'lucide-react';

// Status chips for the client view
const CLIENT_STATUS_FILTERS: Array<{
  id: PostStatus | 'all';
  label: string;
  color: string;
  icon: typeof Clock;
}> = [
  { id: 'all', label: 'All', color: '#ffffff', icon: ClipboardList },
  { id: 'client_review', label: 'Needs Review', color: '#FFB800', icon: Eye },
  { id: 'in_progress', label: 'In Progress', color: '#00D9FF', icon: Clock },
  { id: 'revision', label: 'Revision', color: '#FF6B00', icon: RotateCcw },
  { id: 'approved', label: 'Approved', color: '#39FF14', icon: CheckCircle },
  { id: 'delivered', label: 'Delivered', color: '#00D9FF', icon: Sparkles },
];

interface ClientDeliverableFeedProps {
  onNewRequest?: () => void;
}

export default function ClientDeliverableFeed({ onNewRequest }: ClientDeliverableFeedProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const clientId = user?.client_id || undefined;

  const filters = useMemo(() => ({
    client_id: clientId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  }), [clientId, statusFilter]);

  const {
    posts,
    loading,
    error,
    reload,
    approve,
    revisionRequest,
    addComment,
    react,
    uploadFile,
  } = useDeliverablePosts(filters);

  const stats = usePostStats({ client_id: clientId });

  // Client-side filtering & sorting
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return result;
  }, [posts, searchQuery, sortOrder]);

  // Handler functions
  const currentUserId = user?.id || '';
  const currentUserType = 'client' as const;
  const currentUserName = user?.display_name || 'Client';

  const handleApprove = async (postId: string) => {
    await approve(postId, currentUserId, currentUserType, currentUserName, 'Approved by client');
  };

  const handleRequestRevision = async (postId: string, feedback: string) => {
    const result = await revisionRequest(postId, currentUserId, currentUserType, currentUserName, feedback);
    if (result.isBillable) {
      console.log(`Revision ${result.revisionCount}/${result.maxRevisions} — extra charge may apply`);
    }
  };

  const handleReact = async (postId: string, reactionType: ReactionType) => {
    await react(postId, currentUserId, currentUserType, currentUserName, reactionType);
  };

  const handleAddComment = async (postId: string, content: string, isRevisionRequest: boolean) => {
    await addComment({
      post_id: postId,
      author_id: currentUserId,
      author_type: currentUserType,
      author_name: currentUserName,
      content,
      is_revision_request: isRevisionRequest,
    });
  };

  const handleUploadVersion = async (postId: string, file: File) => {
    const post = posts.find(p => p.id === postId);
    const nextVersion = ((post as any)?.post_versions?.length || post?.versions?.length || 0) + 1;
    await uploadFile(postId, file, nextVersion, currentUserId);
  };

  const needsReviewCount = stats.review;
  const activeCount = stats.in_progress + stats.review + stats.revision;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-titan-cyan" />
            Deliverables
            {loading && posts.length === 0 && <Loader2 className="w-3.5 h-3.5 text-titan-cyan/40 animate-spin" />}
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">
            {stats.total} total • {activeCount} active
            {needsReviewCount > 0 && (
              <span className="text-yellow-400 ml-1">• {needsReviewCount} need review</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-8 h-8 rounded-lg glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <Search className="w-3.5 h-3.5 text-white/40" />
          </button>
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="w-8 h-8 rounded-lg glass-card flex items-center justify-center active:scale-90 transition-transform"
            title={`Sort: ${sortOrder}`}
          >
            {sortOrder === 'newest'
              ? <SortDesc className="w-3.5 h-3.5 text-white/40" />
              : <SortAsc className="w-3.5 h-3.5 text-white/40" />
            }
          </button>
          {onNewRequest && (
            <button
              onClick={onNewRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/25 active:scale-95 transition-transform"
            >
              <Plus className="w-3 h-3 text-titan-cyan" />
              <span className="font-mono text-[10px] text-titan-cyan font-semibold">New</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4"
          >
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deliverables..."
                className="w-full h-9 bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Filter Pills */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CLIENT_STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            const Icon = filter.icon;
            const count = filter.id === 'all'
              ? stats.total
              : filter.id === 'client_review'
                ? stats.review
                : filter.id === 'in_progress'
                  ? stats.in_progress
                  : filter.id === 'revision'
                    ? stats.revision
                    : filter.id === 'approved'
                      ? stats.approved
                      : filter.id === 'delivered'
                        ? stats.delivered
                        : 0;

            return (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] border transition-all active:scale-95 whitespace-nowrap"
                style={{
                  background: isActive ? `${filter.color}15` : 'transparent',
                  borderColor: isActive ? `${filter.color}40` : 'rgba(255,255,255,0.06)',
                  color: isActive ? filter.color : 'rgba(255,255,255,0.4)',
                }}
              >
                <Icon className="w-3 h-3" />
                {filter.label}
                {count > 0 && (
                  <span
                    className="font-bold"
                    style={{ color: isActive ? filter.color : 'rgba(255,255,255,0.2)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-4">
        {/* Loading */}
        {loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-titan-cyan/40 animate-spin mb-3" />
            <p className="font-mono text-xs text-white/30">Loading deliverables...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card p-4 border-red-500/20">
            <p className="font-mono text-xs text-red-400">{error}</p>
            <button
              onClick={reload}
              className="mt-2 font-mono text-[10px] text-titan-cyan underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="font-display font-bold text-sm text-white/40 mb-1">
              {searchQuery ? 'No Results' : 'No Deliverables Yet'}
            </h3>
            <p className="font-mono text-[11px] text-white/20 text-center max-w-xs">
              {searchQuery
                ? 'Try adjusting your search or filter.'
                : 'Your deliverables will appear here when the team starts working on them.'}
            </p>
            {onNewRequest && !searchQuery && (
              <button
                onClick={onNewRequest}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-titan-cyan/10 border border-titan-cyan/25 active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5 text-titan-cyan" />
                <span className="font-mono text-[11px] text-titan-cyan font-semibold">Request Deliverable</span>
              </button>
            )}
          </div>
        )}

        {/* Needs Review Banner */}
        {!loading && needsReviewCount > 0 && statusFilter === 'all' && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setStatusFilter('client_review')}
            className="w-full glass-card p-3 border-yellow-500/20 bg-yellow-500/5 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display font-bold text-xs text-yellow-400">
                {needsReviewCount} deliverable{needsReviewCount > 1 ? 's' : ''} waiting for your review
              </p>
              <p className="font-mono text-[10px] text-white/30 mt-0.5">
                Tap to view and approve or request changes
              </p>
            </div>
            <div className="text-yellow-400/50">›</div>
          </motion.button>
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
            compact={false}
          />
        ))}
      </div>
    </div>
  );
}
