import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp, Heart, PartyPopper, Flame, Eye,
  MessageCircle, CheckCircle, Edit3, RotateCcw,
  Clock, User, Calendar, AlertTriangle, ChevronDown,
  ChevronUp, Paperclip, MoreHorizontal, Download,
  Pin, Flag, Trash2, ExternalLink, Image as ImageIcon,
  Video, FileText, Mic, Send, X, ArrowRight,
  CheckCheck, Share2, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type {
  DeliverablePost,
  PostComment,
  PostVersion,
  PostReaction,
  PostStatus,
  ReactionType,
} from './types';
import { STATUS_CONFIG, PRIORITY_CONFIG, REACTION_CONFIG } from './types';

// ============================================
// POST CARD - Main Facebook-like Post Component
// ============================================

interface PostCardProps {
  post: DeliverablePost;
  currentUserId: string;
  currentUserType: 'team' | 'client';
  currentUserName: string;
  onApprove?: (postId: string) => void;
  onRequestRevision?: (postId: string, feedback: string) => void;
  onReact?: (postId: string, reactionType: ReactionType) => void;
  onAddComment?: (postId: string, content: string, isRevisionRequest: boolean, files?: File[]) => void;
  onStatusChange?: (postId: string, status: PostStatus) => void;
  onViewDetail?: (postId: string) => void;
  onUploadVersion?: (postId: string, file: File) => void;
  compact?: boolean;
}

export function PostCard({
  post,
  currentUserId,
  currentUserType,
  currentUserName,
  onApprove,
  onRequestRevision,
  onReact,
  onAddComment,
  onStatusChange,
  onViewDetail,
  onUploadVersion,
  compact = false,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

  const statusConfig = STATUS_CONFIG[post.status];
  const priorityConfig = PRIORITY_CONFIG[post.priority];
  const versions = (post as any).post_versions || post.versions || [];
  const comments = ((post as any).post_comments || post.comments || []).filter((c: PostComment) => !c.parent_comment_id);
  const reactions = (post as any).post_reactions || post.reactions || [];
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;

  // Group reactions by type
  const groupedReactions = reactions.reduce<Record<string, { count: number; users: string[]; hasCurrentUser: boolean }>>((acc, r) => {
    const rt = r.reaction_type;
    if (!acc[rt]) acc[rt] = { count: 0, users: [], hasCurrentUser: false };
    acc[rt].count++;
    if (r.user_name) acc[rt].users.push(r.user_name);
    if (r.user_id === currentUserId) acc[rt].hasCurrentUser = true;
    return acc;
  }, {});

  const isOverdue = post.due_date && new Date(post.due_date) < new Date() && !['approved', 'delivered', 'cancelled'].includes(post.status);
  const revisionWarning = post.revision_count >= post.max_revisions;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() && commentFiles.length === 0) return;
    onAddComment?.(post.id, commentText, false, commentFiles);
    setCommentText('');
    setCommentFiles([]);
  };

  const handleSubmitRevision = () => {
    if (!revisionFeedback.trim()) return;
    onRequestRevision?.(post.id, revisionFeedback);
    setRevisionFeedback('');
    setShowRevisionForm(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadVersion) {
      onUploadVersion(post.id, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommentFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCommentFiles(prev => [...prev, ...files]);
    if (commentFileRef.current) commentFileRef.current.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card overflow-hidden transition-all duration-200 hover:border-white/20',
        isOverdue && 'border-red-500/30',
        post.status === 'approved' && 'border-green-500/20'
      )}
    >
      {/* POST HEADER */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {post.assigned_member?.avatar
                ? <img src={post.assigned_member.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                : (post.assigned_member?.name || 'U').charAt(0).toUpperCase()
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-sm text-white truncate">
                  {post.assigned_member?.name || 'Unassigned'}
                </span>
                <ArrowRight className="w-3 h-3 text-white/30" />
                <span className="font-display text-sm text-cyan-400 truncate">
                  {post.client_name || 'Client'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-[10px] text-white/40">{formatDate(post.created_at)}</span>
                {post.deliverable_type_name && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-white/10 text-white/50">
                    {post.deliverable_type_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Priority Badge */}
            <Badge className={cn('text-[10px] py-0.5 px-2 border', priorityConfig.bgColor, priorityConfig.color, 'border-current/20')}>
              {priorityConfig.label}
            </Badge>

            {/* Status Badge */}
            <Badge className={cn('text-[10px] py-0.5 px-2 border', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.icon} {statusConfig.label}
            </Badge>

            {/* More Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/40 hover:text-white"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 z-50 w-48 glass-card p-1 shadow-xl"
                  >
                    {onViewDetail && (
                      <button
                        onClick={() => { onViewDetail(post.id); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Detail
                      </button>
                    )}
                    {currentUserType === 'team' && (
                      <button
                        onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Upload New Version
                      </button>
                    )}
                    <button
                      onClick={() => { setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5" /> Pin Post
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:bg-red-500/5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div className="mt-3">
          <h3 className="font-display font-bold text-base text-white leading-snug">{post.title}</h3>
          {post.description && (
            <p className="mt-1 font-mono text-xs text-white/60 leading-relaxed line-clamp-3">{post.description}</p>
          )}
        </div>

        {/* Meta row: Due date, Revisions, Package */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {post.due_date && (
            <div className={cn(
              'flex items-center gap-1 text-[10px] font-mono',
              isOverdue ? 'text-red-400' : 'text-white/40'
            )}>
              <Calendar className="w-3 h-3" />
              <span>Due: {new Date(post.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {isOverdue && <AlertTriangle className="w-3 h-3 ml-1" />}
            </div>
          )}

          <div className={cn(
            'flex items-center gap-1 text-[10px] font-mono',
            revisionWarning ? 'text-orange-400' : 'text-white/40'
          )}>
            <RotateCcw className="w-3 h-3" />
            <span>Revisions: {post.revision_count}/{post.max_revisions}</span>
            {revisionWarning && (
              <Badge className="ml-1 text-[9px] py-0 px-1 bg-orange-500/10 text-orange-400 border-orange-500/20">
                Extra $
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* MEDIA PREVIEW (Latest Version) */}
      {latestVersion && latestVersion.file_url && (
        <div className="relative group">
          {latestVersion.file_type === 'image' ? (
            <div
              className="relative cursor-pointer"
              onClick={() => setImagePreview(latestVersion.file_url)}
            >
              <img
                src={latestVersion.file_url}
                alt={latestVersion.file_name || 'Deliverable'}
                className="w-full max-h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Version Badge */}
              <div className="absolute top-3 left-3">
                <Badge className="bg-black/60 backdrop-blur-sm text-white text-[10px] border-0">
                  v{latestVersion.version_number}
                </Badge>
              </div>
            </div>
          ) : latestVersion.file_type === 'video' ? (
            <div className="relative">
              <video
                src={latestVersion.file_url}
                controls
                className="w-full max-h-[400px]"
              />
              <div className="absolute top-3 left-3">
                <Badge className="bg-black/60 backdrop-blur-sm text-white text-[10px] border-0">
                  v{latestVersion.version_number}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="mx-4 mb-3 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-400" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-white truncate">{latestVersion.file_name || 'File'}</p>
                <p className="font-mono text-[10px] text-white/40">v{latestVersion.version_number}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-cyan-400 text-[10px]">
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>
          )}
        </div>
      )}

      {/* VERSION HISTORY (Collapsed) */}
      {versions.length > 1 && (
        <div className="mx-4 mb-2">
          <button
            onClick={() => setShowAllVersions(!showAllVersions)}
            className="flex items-center gap-1 text-[10px] font-mono text-cyan-400/70 hover:text-cyan-400 transition-colors"
          >
            {showAllVersions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {versions.length} versions
          </button>
          <AnimatePresence>
            {showAllVersions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1">
                  {versions.map((v, i) => (
                    <div
                      key={v.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg text-[11px] font-mono',
                        i === versions.length - 1 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'
                      )}
                    >
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-white/20">
                        v{v.version_number}
                      </Badge>
                      <span className="text-white/60 truncate flex-1">{v.file_name || 'File'}</span>
                      <span className="text-white/30">{formatDate(v.created_at)}</span>
                      {v.file_url && (
                        <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                          <Download className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ACTION BAR (Approve / Edit Request / Comment / Reactions) */}
      <div className="px-4 py-2.5 border-t border-white/5">
        <div className="flex items-center justify-between">
          {/* Reactions Summary */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(groupedReactions).map(([type, data]) => (
              <button
                key={type}
                onClick={() => onReact?.(post.id, type as ReactionType)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all border',
                  data.hasCurrentUser
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                )}
              >
                <span>{REACTION_CONFIG[type as ReactionType]?.emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>

          {/* Comments Count */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-[11px] font-mono text-white/40 hover:text-white/60 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{comments.length} comments</span>
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="mt-2.5 flex items-center gap-1 border-t border-white/5 pt-2.5">
          {/* React Button */}
          <div className="relative flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-white/50 hover:text-white hover:bg-white/5 gap-1.5"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> React
            </Button>
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 glass-card p-2 flex gap-1 z-50"
                >
                  {Object.entries(REACTION_CONFIG).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => {
                        onReact?.(post.id, type as ReactionType);
                        setShowReactionPicker(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
                      title={config.label}
                    >
                      {config.emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comment Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs text-white/50 hover:text-white hover:bg-white/5 gap-1.5"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-3.5 h-3.5" /> Comment
          </Button>

          {/* Approve Button (visible for review statuses) */}
          {['client_review', 'internal_review'].includes(post.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs text-green-400/70 hover:text-green-400 hover:bg-green-500/10 gap-1.5"
              onClick={() => onApprove?.(post.id)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
          )}

          {/* Request Edit Button */}
          {!['approved', 'delivered', 'cancelled', 'draft'].includes(post.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10 gap-1.5"
              onClick={() => setShowRevisionForm(!showRevisionForm)}
            >
              <Edit3 className="w-3.5 h-3.5" /> Request Edit
            </Button>
          )}
        </div>
      </div>

      {/* REVISION REQUEST FORM */}
      <AnimatePresence>
        {showRevisionForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-orange-500/10"
          >
            <div className="p-4 bg-orange-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Edit3 className="w-4 h-4 text-orange-400" />
                <span className="font-display font-semibold text-xs text-orange-400">Request Edit / Revision</span>
                {revisionWarning && (
                  <Badge className="text-[9px] py-0 px-1.5 bg-red-500/10 text-red-400 border-red-500/20">
                    ⚠️ Over limit — extra charge may apply
                  </Badge>
                )}
              </div>
              <textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="Describe what changes you need..."
                className="w-full bg-black/20 border border-orange-500/20 rounded-lg p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-500/40 resize-none min-h-[80px]"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-white/40"
                  onClick={() => setShowRevisionForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30"
                  onClick={handleSubmitRevision}
                  disabled={!revisionFeedback.trim()}
                >
                  <Send className="w-3 h-3 mr-1" /> Submit Revision Request
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMMENTS SECTION */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-4 space-y-3">
              {/* Comment List */}
              {comments.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} formatDate={formatDate} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <MessageCircle className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="font-mono text-[11px] text-white/30">No comments yet. Be the first!</p>
                </div>
              )}

              {/* Comment Input */}
              <div className="border-t border-white/5 pt-3">
                {/* Attached Files Preview */}
                {commentFiles.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {commentFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 text-[10px] text-white/60">
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-white/30 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                    {currentUserName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                      placeholder="Write a comment..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/30 resize-none min-h-[36px] max-h-[100px]"
                      rows={1}
                    />
                    <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                      <button
                        onClick={() => commentFileRef.current?.click()}
                        className="p-1 text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() && commentFiles.length === 0}
                        className={cn(
                          'p-1 transition-colors',
                          (commentText.trim() || commentFiles.length > 0) ? 'text-cyan-400 hover:text-cyan-300' : 'text-white/20'
                        )}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Inputs */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx,.psd,.ai" />
      <input ref={commentFileRef} type="file" className="hidden" onChange={handleCommentFiles} multiple />

      {/* Image Preview Modal */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setImagePreview(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white"
              onClick={() => setImagePreview(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// COMMENT ITEM
// ============================================

function CommentItem({ comment, formatDate }: { comment: PostComment; formatDate: (d: string) => string }) {
  return (
    <div className={cn(
      'flex gap-2',
      comment.is_revision_request && 'bg-orange-500/5 -mx-2 px-2 py-1.5 rounded-lg border border-orange-500/10'
    )}>
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
        comment.author_type === 'client'
          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
          : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
      )}>
        {comment.author_avatar
          ? <img src={comment.author_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          : (comment.author_name || 'U').charAt(0).toUpperCase()
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-[11px] text-white">
            {comment.author_name || 'Unknown'}
          </span>
          <span className="font-mono text-[9px] text-white/30">{formatDate(comment.created_at)}</span>
          {comment.is_revision_request && (
            <Badge className="text-[8px] py-0 px-1 bg-orange-500/10 text-orange-400 border-orange-500/20">
              Revision Request
            </Badge>
          )}
          {comment.is_resolved && (
            <Badge className="text-[8px] py-0 px-1 bg-green-500/10 text-green-400 border-green-500/20">
              ✓ Resolved
            </Badge>
          )}
        </div>
        {comment.content && (
          <p className="font-mono text-[11px] text-white/70 mt-0.5 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        )}
        {comment.voice_url && (
          <div className="mt-1.5">
            <audio controls src={comment.voice_url} className="h-7 w-full max-w-[250px]" />
          </div>
        )}
        {/* Comment Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="mt-1.5 flex gap-2 flex-wrap">
            {comment.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/20 transition-colors"
              >
                {att.file_type?.startsWith('image') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                <span className="max-w-[100px] truncate">{att.file_name || 'File'}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PostCard;
