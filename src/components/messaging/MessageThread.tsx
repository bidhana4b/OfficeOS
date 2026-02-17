import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Reply,
  Pin,
  FileText,
  Check,
  CheckCheck,
  Clock,
  Palette,
  Video,
  Rocket,
  ShieldCheck,
  X,
  Search,
  Phone,
  VideoIcon,
  Sparkles,
  Package,
  Zap,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Channel, Workspace, User, DeliverableTag, BoostTag } from './types';

interface MessageThreadProps {
  messages: Message[];
  channel: Channel;
  workspace: Workspace;
  currentUser: User;
  onSendMessage: (content: string, files?: File[]) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onOpenBoostWizard: () => void;
  onCreateDeliverable: (type: string) => void;
}

const statusIcons: Record<string, React.ElementType> = {
  sending: Clock,
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: X,
};

const deliverableColors: Record<string, string> = {
  design: 'from-titan-cyan/20 to-titan-cyan/5 border-titan-cyan/30',
  video: 'from-titan-purple/20 to-titan-purple/5 border-titan-purple/30',
  content: 'from-titan-lime/20 to-titan-lime/5 border-titan-lime/30',
  seo: 'from-yellow-400/20 to-yellow-400/5 border-yellow-400/30',
  ads: 'from-titan-magenta/20 to-titan-magenta/5 border-titan-magenta/30',
  social: 'from-pink-400/20 to-pink-400/5 border-pink-400/30',
};

const boostStatusColors: Record<string, string> = {
  requested: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  approved: 'bg-titan-cyan/10 text-titan-cyan border-titan-cyan/20',
  live: 'bg-titan-lime/10 text-titan-lime border-titan-lime/20',
  completed: 'bg-white/[0.06] text-white/50 border-white/[0.1]',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function MessageBubble({
  message,
  isOwn,
  onReaction,
}: {
  message: Message;
  isOwn: boolean;
  onReaction: (emoji: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const StatusIcon = statusIcons[message.status] || Clock;
  const quickReactions = ['👍', '❤️', '🔥', '🚀', '✅', '😂'];

  if (message.isSystemMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-3"
      >
        <div className="max-w-md">
          <div className="glass-card px-4 py-2.5 rounded-xl border border-titan-cyan/10 bg-titan-cyan/[0.03]">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-titan-cyan" />
              </div>
              <div>
                <p className="font-mono-data text-[11px] text-white/70 leading-relaxed">
                  {message.content}
                </p>
                {message.deliverableTag && (
                  <DeliverableCard tag={message.deliverableTag} />
                )}
                {message.boostTag && <BoostCard tag={message.boostTag} />}
                <span className="font-mono-data text-[9px] text-white/20 mt-1 block">
                  {message.timestamp}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5 mb-1 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Avatar */}
      {!isOwn && (
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0',
            message.sender.role === 'client'
              ? 'bg-titan-purple/20 text-titan-purple border border-titan-purple/20'
              : 'bg-titan-cyan/20 text-titan-cyan border border-titan-cyan/20'
          )}
        >
          {message.sender.avatar}
        </div>
      )}

      <div className={cn('max-w-[70%] min-w-[180px]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender Name */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-0.5 px-1">
            <span className="font-mono-data text-[10px] text-white/50 font-semibold">
              {message.sender.name}
            </span>
            {message.sender.role === 'client' && (
              <span className="font-mono-data text-[8px] text-titan-purple/70 bg-titan-purple/10 px-1.5 py-0.5 rounded-full">
                CLIENT
              </span>
            )}
          </div>
        )}

        {/* Reply Context */}
        {message.replyTo && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 mb-0.5 rounded-t-lg border-l-2',
              isOwn
                ? 'bg-titan-cyan/[0.06] border-titan-cyan/30'
                : 'bg-white/[0.03] border-white/20'
            )}
          >
            <Reply className="w-3 h-3 text-white/30 rotate-180" />
            <div>
              <span className="font-mono-data text-[9px] text-titan-cyan/70 font-semibold">
                {message.replyTo.senderName}
              </span>
              <p className="font-mono-data text-[10px] text-white/30 truncate max-w-[200px]">
                {message.replyTo.content}
              </p>
            </div>
          </div>
        )}

        {/* Message Content */}
        <div
          className={cn(
            'relative px-3.5 py-2.5 rounded-2xl transition-all',
            isOwn
              ? 'bg-gradient-to-br from-titan-cyan/20 to-titan-cyan/10 border border-titan-cyan/20 rounded-tr-md'
              : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-md',
            message.replyTo && 'rounded-t-none'
          )}
        >
          {message.isPinned && (
            <Pin className="absolute -top-1 -right-1 w-3 h-3 text-titan-cyan fill-titan-cyan" />
          )}

          <p className="font-mono-data text-[12px] text-white/80 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Files */}
          {message.files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.files.map((file) => (
                <div key={file.id}>
                  {file.type === 'image' ? (
                    <div className="rounded-lg overflow-hidden border border-white/[0.1] mt-1">
                      <img
                        src={file.thumbnail || file.url}
                        alt={file.name}
                        className="w-full max-w-[280px] h-auto object-cover"
                        loading="lazy"
                      />
                      <div className="flex items-center justify-between px-2 py-1.5 bg-black/20">
                        <span className="font-mono-data text-[9px] text-white/40 truncate">
                          {file.name}
                        </span>
                        <span className="font-mono-data text-[9px] text-white/30">{file.size}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      <FileText className="w-4 h-4 text-white/40" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono-data text-[10px] text-white/60 truncate">
                          {file.name}
                        </p>
                        <p className="font-mono-data text-[9px] text-white/30">{file.size}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Deliverable Tag */}
          {message.deliverableTag && <DeliverableCard tag={message.deliverableTag} />}

          {/* Boost Tag */}
          {message.boostTag && <BoostCard tag={message.boostTag} />}

          {/* Timestamp & Status */}
          <div
            className={cn(
              'flex items-center gap-1.5 mt-1.5',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            <span className="font-mono-data text-[9px] text-white/20">{message.timestamp}</span>
            {message.isEdited && (
              <span className="font-mono-data text-[8px] text-white/15">edited</span>
            )}
            {isOwn && (
              <StatusIcon
                className={cn(
                  'w-3 h-3',
                  message.status === 'read' ? 'text-titan-cyan' :
                  message.status === 'failed' ? 'text-red-500' :
                  'text-white/30'
                )}
              />
            )}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex items-center gap-1 mt-1 px-1">
            {message.reactions.map((reaction, i) => (
              <button
                key={i}
                onClick={() => onReaction(reaction.emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] hover:border-titan-cyan/20 hover:bg-titan-cyan/[0.06] transition-all"
              >
                <span className="text-[11px]">{reaction.emoji}</span>
                <span className="font-mono-data text-[9px] text-white/40">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread Count */}
        {message.threadCount && message.threadCount > 0 && (
          <button className="flex items-center gap-1 mt-1 px-2 py-0.5 text-titan-cyan/60 hover:text-titan-cyan transition-all">
            <span className="font-mono-data text-[10px]">
              {message.threadCount} replies
            </span>
          </button>
        )}
      </div>

      {/* Hover Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-0.5 self-start mt-1"
          >
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all">
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Reactions Popup */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-10 glass-card px-2 py-1.5 rounded-lg flex items-center gap-1 border border-white/[0.1] shadow-xl"
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReaction(emoji);
                  setShowReactions(false);
                }}
                className="hover:scale-125 transition-transform p-0.5 text-sm"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DeliverableCard({ tag }: { tag: DeliverableTag }) {
  const colorClass = deliverableColors[tag.type] || deliverableColors.design;
  const statusLabels: Record<string, string> = {
    pending: '⏳ Pending',
    'in-progress': '🔄 In Progress',
    review: '👁️ In Review',
    approved: '✅ Approved',
    delivered: '📦 Delivered',
  };

  return (
    <div
      className={cn(
        'mt-2 px-3 py-2 rounded-lg bg-gradient-to-r border',
        colorClass
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="w-3 h-3 text-white/50" />
          <span className="font-mono-data text-[10px] text-white/70 font-semibold">{tag.label}</span>
        </div>
        <span className="font-mono-data text-[9px] text-white/50">
          {statusLabels[tag.status]}
        </span>
      </div>
      {tag.packageDeducted && (
        <span className="font-mono-data text-[8px] text-white/30 mt-1 block">
          ✓ Package deducted
        </span>
      )}
    </div>
  );
}

function BoostCard({ tag }: { tag: BoostTag }) {
  const colorClass = boostStatusColors[tag.status] || boostStatusColors.requested;

  return (
    <div className={cn('mt-2 px-3 py-2 rounded-lg border', colorClass)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Rocket className="w-3 h-3" />
          <span className="font-mono-data text-[10px] font-semibold">{tag.platform}</span>
        </div>
        <span className="font-mono-data text-[9px] uppercase tracking-wider">{tag.status}</span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="font-mono-data text-[9px] opacity-70">${tag.budget}/day</span>
        <span className="font-mono-data text-[9px] opacity-70">{tag.duration}</span>
      </div>
    </div>
  );
}

export default function MessageThread({
  messages,
  channel,
  workspace,
  currentUser,
  onSendMessage,
  onReaction,
  onOpenBoostWizard,
  onCreateDeliverable,
}: MessageThreadProps) {
  const [inputValue, setInputValue] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const quickActions = [
    { icon: Palette, label: 'Design', color: 'text-titan-cyan', action: () => onCreateDeliverable('design') },
    { icon: Video, label: 'Video', color: 'text-titan-purple', action: () => onCreateDeliverable('video') },
    { icon: Rocket, label: 'Boost', color: 'text-titan-magenta', action: () => onOpenBoostWizard() },
    { icon: ShieldCheck, label: 'Approval', color: 'text-titan-lime', action: () => onCreateDeliverable('approval') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Channel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0D1029]/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-white/30 font-mono-data text-sm">#</span>
            <h3 className="font-display font-bold text-sm text-white">{channel.name}</h3>
          </div>
          {channel.type === 'internal' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20">
              <Lock className="w-2.5 h-2.5 text-yellow-400" />
              <span className="font-mono-data text-[9px] text-yellow-400">Internal Only</span>
            </span>
          )}
          <span className="font-mono-data text-[10px] text-white/30">
            {workspace.members.length} members
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
            <VideoIcon className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
            <Pin className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-2">
        {/* Date Separator */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="font-mono-data text-[10px] text-white/20">Today</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender.id === currentUser.id}
            onReaction={(emoji) => onReaction(msg.id, emoji)}
          />
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 px-1"
            >
              <div className="w-6 h-6 rounded-lg bg-titan-purple/20 flex items-center justify-center text-[8px] font-bold text-titan-purple border border-titan-purple/20">
                JW
              </div>
              <div className="px-3 py-2 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.06]">
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-white/40"
                  />
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-white/40"
                  />
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                    className="w-1.5 h-1.5 rounded-full bg-white/40"
                  />
                </div>
              </div>
              <span className="font-mono-data text-[9px] text-white/20">James is typing...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions Bar */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.action}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card border border-white/[0.08] hover:border-white/[0.15] transition-all',
                    action.color
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-mono-data text-[10px]">{action.label}</span>
                </motion.button>
              );
            })}
            <button
              onClick={() => setShowQuickActions(false)}
              className="ml-auto p-1 rounded-md hover:bg-white/[0.06] text-white/30"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0D1029]/40 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          {/* Quick Actions Toggle */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={cn(
              'p-2 rounded-lg transition-all shrink-0',
              showQuickActions
                ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20'
                : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60 border border-transparent'
            )}
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Attachment */}
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all shrink-0">
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channel.name}...`}
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-xs leading-relaxed focus:outline-none focus:border-titan-cyan/30 focus:bg-white/[0.06] transition-all resize-none max-h-[120px]"
            />
          </div>

          {/* Emoji */}
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all shrink-0">
            <Smile className="w-4 h-4" />
          </button>

          {/* Voice / Send */}
          {inputValue.trim() ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              className="p-2.5 rounded-xl bg-gradient-to-br from-titan-cyan to-titan-cyan/80 text-titan-bg hover:shadow-lg hover:shadow-titan-cyan/20 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          ) : (
            <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all shrink-0">
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
