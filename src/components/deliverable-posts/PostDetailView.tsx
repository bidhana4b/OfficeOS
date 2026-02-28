import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Download, ChevronLeft, ChevronRight, Clock,
  User, Calendar, RotateCcw, Flag, CheckCircle, Edit3,
  Send, Paperclip, X, MessageCircle, History, FileText,
  Eye, Image as ImageIcon, Video, AlertTriangle, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePostDetail } from '@/hooks/useDeliverablePosts';
import type {
  DeliverablePost, PostVersion, PostComment,
  PostStatus, ReactionType,
} from './types';
import { STATUS_CONFIG, PRIORITY_CONFIG, REACTION_CONFIG } from './types';

interface PostDetailViewProps {
  postId: string;
  currentUserId: string;
  currentUserType: 'team' | 'client';
  currentUserName: string;
  onBack?: () => void;
  onApprove?: (postId: string, notes?: string) => void;
  onRequestRevision?: (postId: string, feedback: string) => void;
  onAddComment?: (postId: string, content: string, isRevisionRequest: boolean) => void;
  onStatusChange?: (postId: string, status: PostStatus) => void;
}

export default function PostDetailView({
  postId,
  currentUserId,
  currentUserType,
  currentUserName,
  onBack,
  onApprove,
  onRequestRevision,
  onAddComment,
  onStatusChange,
}: PostDetailViewProps) {
  const { post, comments, loading, reload } = usePostDetail(postId);
  const [activeTab, setActiveTab] = useState<'comments' | 'versions' | 'activity'>('comments');
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(-1); // -1 = latest
  const [commentText, setCommentText] = useState('');
  const [revisionMode, setRevisionMode] = useState(false);

  if (loading || !post) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="font-mono text-xs text-white/30">Loading post...</p>
        </div>
      </div>
    );
  }

  const versions = post.versions || [];
  const currentVersion = selectedVersionIdx >= 0 ? versions[selectedVersionIdx] : versions[versions.length - 1];
  const statusConfig = STATUS_CONFIG[post.status];
  const priorityConfig = PRIORITY_CONFIG[post.priority];
  const isOverdue = post.due_date && new Date(post.due_date) < new Date() && !['approved', 'delivered', 'cancelled'].includes(post.status);
  const revisionWarning = post.revision_count >= post.max_revisions;

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onAddComment?.(post.id, commentText, revisionMode);
    setCommentText('');
    setRevisionMode(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/40" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="font-display font-bold text-base text-white">{post.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={cn('text-[10px] py-0.5 px-2 border', statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.icon} {statusConfig.label}
              </Badge>
              <Badge className={cn('text-[10px] py-0.5 px-2 border', priorityConfig.bgColor, priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
              {isOverdue && (
                <Badge className="text-[10px] py-0.5 px-2 bg-red-500/10 text-red-400 border-red-500/20">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Change (team only) */}
          {currentUserType === 'team' && onStatusChange && (
            <select
              value={post.status}
              onChange={(e) => onStatusChange(post.id, e.target.value as PostStatus)}
              className="h-8 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 text-white focus:outline-none focus:border-cyan-500/30"
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key} className="bg-gray-900">{config.label}</option>
              ))}
            </select>
          )}

          {/* Approve / Request Edit */}
          {['client_review', 'internal_review'].includes(post.status) && (
            <>
              <Button
                size="sm"
                className="h-8 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 gap-1"
                onClick={() => onApprove?.(post.id)}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30 gap-1"
                onClick={() => setRevisionMode(true)}
              >
                <Edit3 className="w-3.5 h-3.5" /> Request Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Media Preview */}
        <div className="flex-1 flex flex-col bg-black/20 border-r border-white/5">
          {currentVersion?.file_url ? (
            <>
              <div className="flex-1 flex items-center justify-center p-4 relative">
                {currentVersion.file_type === 'image' ? (
                  <img
                    src={currentVersion.file_url}
                    alt={currentVersion.file_name || 'Deliverable'}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : currentVersion.file_type === 'video' ? (
                  <video
                    src={currentVersion.file_url}
                    controls
                    className="max-w-full max-h-full rounded-lg"
                  />
                ) : (
                  <div className="glass-card p-8 flex flex-col items-center gap-4">
                    <FileText className="w-16 h-16 text-cyan-400/40" />
                    <p className="font-mono text-sm text-white">{currentVersion.file_name || 'File'}</p>
                    <a href={currentVersion.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-1">
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              {/* Version Selector */}
              {versions.length > 1 && (
                <div className="p-3 border-t border-white/5 flex items-center justify-center gap-2">
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0"
                    disabled={selectedVersionIdx === 0}
                    onClick={() => setSelectedVersionIdx(prev => Math.max(0, (prev < 0 ? versions.length - 1 : prev) - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {versions.map((v, i) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionIdx(i)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-[10px] font-mono border transition-all flex items-center justify-center',
                          (selectedVersionIdx < 0 ? i === versions.length - 1 : i === selectedVersionIdx)
                            ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        )}
                      >
                        v{v.version_number}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0"
                    disabled={selectedVersionIdx >= versions.length - 1 || selectedVersionIdx < 0}
                    onClick={() => setSelectedVersionIdx(prev => Math.min(versions.length - 1, (prev < 0 ? versions.length - 1 : prev) + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-white/5 mx-auto mb-3" />
                <p className="font-mono text-xs text-white/20">No media uploaded yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Details & Comments */}
        <div className="w-[400px] flex flex-col">
          {/* Post Info */}
          <div className="p-4 border-b border-white/5 space-y-3">
            {post.description && (
              <p className="font-mono text-xs text-white/60 leading-relaxed">{post.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-white/40">
                <User className="w-3 h-3" />
                <span>Assigned: {post.assigned_member?.name || 'Unassigned'}</span>
              </div>
              {post.due_date && (
                <div className={cn('flex items-center gap-1.5', isOverdue ? 'text-red-400' : 'text-white/40')}>
                  <Calendar className="w-3 h-3" />
                  <span>Due: {new Date(post.due_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className={cn('flex items-center gap-1.5', revisionWarning ? 'text-orange-400' : 'text-white/40')}>
                <RotateCcw className="w-3 h-3" />
                <span>Revisions: {post.revision_count}/{post.max_revisions}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/40">
                <Clock className="w-3 h-3" />
                <span>Created: {formatDate(post.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {[
              { key: 'comments', label: 'Comments', icon: MessageCircle, count: comments.length },
              { key: 'versions', label: 'Versions', icon: History, count: versions.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-display transition-colors border-b-2',
                  activeTab === tab.key
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-white/40 border-transparent hover:text-white/60'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-white/10 ml-1">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'comments' && (
              <div className="p-4 space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="font-mono text-[11px] text-white/30">No comments yet</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'flex gap-2 p-2 rounded-lg',
                        c.is_revision_request && 'bg-orange-500/5 border border-orange-500/10'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        c.author_type === 'client'
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                          : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                      )}>
                        {(c.author_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-semibold text-[11px] text-white">{c.author_name}</span>
                          <span className="font-mono text-[9px] text-white/30">{formatDate(c.created_at)}</span>
                          {c.is_revision_request && (
                            <Badge className="text-[8px] py-0 px-1 bg-orange-500/10 text-orange-400 border-orange-500/20">
                              Edit Request
                            </Badge>
                          )}
                        </div>
                        {c.content && <p className="font-mono text-[11px] text-white/70 mt-0.5">{c.content}</p>}
                        {c.voice_url && <audio controls src={c.voice_url} className="mt-1 h-7 w-full" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="p-4 space-y-2">
                {versions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="font-mono text-[11px] text-white/30">No versions uploaded</p>
                  </div>
                ) : (
                  versions.map((v, i) => (
                    <div
                      key={v.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                        i === versions.length - 1
                          ? 'bg-cyan-500/5 border-cyan-500/20'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      )}
                      onClick={() => setSelectedVersionIdx(i)}
                    >
                      <Badge variant="outline" className="text-[10px] py-0.5 px-2 border-white/20">
                        v{v.version_number}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-white truncate">{v.file_name || 'File'}</p>
                        <p className="font-mono text-[9px] text-white/30">{formatDate(v.created_at)}</p>
                      </div>
                      {i === versions.length - 1 && (
                        <Badge className="text-[8px] py-0 px-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                          Latest
                        </Badge>
                      )}
                      {v.file_url && (
                        <a href={v.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <Download className="w-3.5 h-3.5 text-white/30 hover:text-cyan-400" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="p-3 border-t border-white/5">
            {revisionMode && (
              <div className="flex items-center gap-2 mb-2 px-2">
                <Badge className="text-[9px] py-0 px-1.5 bg-orange-500/10 text-orange-400 border-orange-500/20">
                  ✏️ Revision Request Mode
                </Badge>
                <button onClick={() => setRevisionMode(false)} className="text-white/30 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder={revisionMode ? 'Describe the changes needed...' : 'Write a comment...'}
                className={cn(
                  'flex-1 bg-white/5 border rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none resize-none min-h-[36px] max-h-[100px]',
                  revisionMode ? 'border-orange-500/30 focus:border-orange-500/50' : 'border-white/10 focus:border-cyan-500/30'
                )}
                rows={1}
              />
              <Button
                size="sm"
                className={cn(
                  'h-9 px-3 gap-1',
                  revisionMode
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                )}
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
