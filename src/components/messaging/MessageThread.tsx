import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Reply,
  Pin,
  PinOff,
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
  Edit3,
  Trash2,
  Copy,
  Forward,
  Bookmark,
  BookmarkCheck,
  Users,
  UserPlus,
  AtSign,
  RotateCcw,
  MessageCircle,
  ArrowLeft,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Message, Channel, Workspace, User, DeliverableTag, BoostTag, MessageAction } from './types';

interface MessageThreadProps {
  messages: Message[];
  channel: Channel;
  workspace: Workspace;
  currentUser: User;
  onSendMessage: (content: string, files?: File[], replyTo?: Message, voiceBlob?: Blob) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onOpenBoostWizard: () => void;
  onCreateDeliverable: (type: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string, forEveryone: boolean) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onForwardMessage?: (messageId: string, targetChannelId: string) => void;
  onSaveMessage?: (messageId: string) => void;
  onUnsaveMessage?: (messageId: string) => void;
  onRetrySendMessage?: (messageId: string) => void;
  lastReadMessageId?: string; // For unread divider
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

// Emoji data for picker
const emojiCategories = [
  { name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔'] },
  { name: 'Gestures', emojis: ['👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤏','✊','👊','🤛','🤜','👏','🫶','🙌','🤝','🙏'] },
  { name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝'] },
  { name: 'Objects', emojis: ['🔥','✅','❌','⭐','🌟','💡','💰','🎯','🏆','🎉','🎊','🚀','💎','🔔','📌','📎','✏️','📝','📊','📈','📉','💻','📱','⚡','🔑','🔒','💬','⏰'] },
];

// ===== Context Menu =====
function MessageContextMenu({
  message,
  isOwn,
  position,
  onAction,
  onClose,
}: {
  message: Message;
  isOwn: boolean;
  position: { x: number; y: number };
  onAction: (action: MessageAction) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const adjustedY = Math.min(position.y, window.innerHeight - 380);
  const adjustedX = Math.min(position.x, window.innerWidth - 210);

  const actions: { action: MessageAction; icon: React.ElementType; label: string; color?: string; show: boolean }[] = [
    { action: 'reply', icon: Reply, label: 'Reply', show: true },
    { action: 'edit', icon: Edit3, label: 'Edit Message', show: isOwn },
    { action: 'copy', icon: Copy, label: 'Copy Text', show: true },
    { action: message.isPinned ? 'unpin' : 'pin', icon: message.isPinned ? PinOff : Pin, label: message.isPinned ? 'Unpin' : 'Pin Message', show: true },
    { action: 'forward', icon: Forward, label: 'Forward', show: true },
    { action: message.isSaved ? 'unsave' : 'save', icon: message.isSaved ? BookmarkCheck : Bookmark, label: message.isSaved ? 'Remove Bookmark' : 'Bookmark', show: true },
    { action: 'create-task', icon: Package, label: 'Create Task', show: true },
    { action: 'delete', icon: Trash2, label: 'Delete for Me', color: 'text-red-400', show: isOwn },
    { action: 'delete-for-everyone', icon: Trash2, label: 'Delete for Everyone', color: 'text-red-400', show: isOwn },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 py-1.5 w-[200px] glass-card rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {actions.filter(a => a.show).map((item) => (
        <React.Fragment key={item.action}>
          {item.action === 'delete' && <div className="border-t border-white/[0.06] my-1" />}
          <button
            onClick={() => { onAction(item.action); onClose(); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/[0.06]',
              item.color || 'text-white/60 hover:text-white/80'
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span className="font-mono-data text-[11px]">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </motion.div>
  );
}

// ===== Emoji Picker =====
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search
    ? emojiCategories.flatMap(c => c.emojis)
    : emojiCategories[activeCategory].emojis;

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full right-0 mb-2 w-[320px] glass-card rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden z-50"
    >
      <div className="p-2 border-b border-white/[0.06]">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emoji..."
          className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-[11px] focus:outline-none focus:border-titan-cyan/30" />
      </div>
      {!search && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.06]">
          {emojiCategories.map((cat, i) => (
            <button key={cat.name} onClick={() => setActiveCategory(i)}
              className={cn('px-2 py-1 rounded-md font-mono-data text-[9px] transition-all',
                activeCategory === i ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]')}>
              {cat.name}
            </button>
          ))}
        </div>
      )}
      <div className="p-2 max-h-[200px] overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map(emoji => (
            <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/[0.08] text-lg transition-all hover:scale-110">
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ===== Voice Recorder =====
function VoiceRecorder({ onRecorded, onCancel }: { onRecorded: (blob: Blob, duration: number) => void; onCancel: () => void }) {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mr;
        chunksRef.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => stream.getTracks().forEach(t => t.stop());
        mr.start();
        timerRef.current = setInterval(() => setDuration(p => p + 1), 1000);
      } catch { onCancel(); }
    })();
    return () => { cancelled = true; if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const stopAndSend = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      const d = duration;
      mr.onstop = () => {
        mr.stream.getTracks().forEach(t => t.stop());
        onRecorded(new Blob(chunksRef.current, { type: 'audio/webm' }), d);
      };
      mr.stop();
    }
  };

  const cancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => mr.stream.getTracks().forEach(t => t.stop());
      mr.stop();
    }
    onCancel();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex items-center gap-3 flex-1">
      <button onClick={cancel} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
      <div className="flex items-center gap-2 flex-1">
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-3 h-3 rounded-full bg-red-500" />
        <span className="font-mono-data text-sm text-white/70">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
        <div className="flex items-center gap-0.5 flex-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div key={i} animate={{ height: [4, Math.random() * 20 + 4, 4] }}
              transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5, delay: i * 0.05 }}
              className="w-1 rounded-full bg-titan-cyan/40" style={{ minHeight: 4 }} />
          ))}
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={stopAndSend}
        className="p-2.5 rounded-xl bg-gradient-to-br from-titan-cyan to-titan-cyan/80 text-titan-bg hover:shadow-lg hover:shadow-titan-cyan/20 transition-all">
        <Send className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}

// ===== File Preview =====
function FilePreview({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {files.map((file, i) => {
        const isImage = file.type.startsWith('image/');
        return (
          <div key={i} className="relative group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            {isImage ? (
              <div className="w-10 h-10 rounded overflow-hidden">
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
              </div>
            ) : <FileText className="w-4 h-4 text-white/40" />}
            <div className="max-w-[120px]">
              <p className="font-mono-data text-[10px] text-white/60 truncate">{file.name}</p>
              <p className="font-mono-data text-[8px] text-white/30">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ===== Search Panel =====
function SearchPanel({ messages, onClose, onJumpTo }: { messages: Message[]; onClose: () => void; onJumpTo: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const results = query.trim() ? messages.filter(m => m.content.toLowerCase().includes(query.toLowerCase()) || m.sender.name.toLowerCase().includes(query.toLowerCase())) : [];
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="absolute top-[52px] left-0 right-0 z-30 glass-card border-b border-white/[0.06] bg-[#0D1029]/95 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 py-2">
        <Search className="w-4 h-4 text-white/30" />
        <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages..."
          className="flex-1 bg-transparent text-white/80 placeholder:text-white/20 font-mono-data text-xs focus:outline-none" />
        <span className="font-mono-data text-[9px] text-white/20">{results.length} results</span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/[0.06] text-white/30"><X className="w-3.5 h-3.5" /></button>
      </div>
      {results.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto scrollbar-hide border-t border-white/[0.04]">
          {results.slice(0, 20).map(msg => (
            <button key={msg.id} onClick={() => { onJumpTo(msg.id); onClose(); }}
              className="w-full flex items-start gap-2 px-4 py-2 hover:bg-white/[0.04] transition-all text-left">
              <div className="w-6 h-6 rounded-md bg-titan-cyan/10 flex items-center justify-center text-[8px] font-bold text-titan-cyan shrink-0 mt-0.5">{msg.sender.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-[10px] text-white/50 font-semibold">{msg.sender.name}</span>
                  <span className="font-mono-data text-[8px] text-white/20">{msg.timestamp}</span>
                </div>
                <p className="font-mono-data text-[10px] text-white/40 truncate">{msg.content}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ===== Forward Modal =====
function ForwardModal({ channels, onForward, onClose }: { channels: { id: string; name: string }[]; onForward: (channelId: string) => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()} className="w-[320px] glass-card rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="font-display font-bold text-sm text-white">Forward Message</h3>
          <p className="font-mono-data text-[10px] text-white/30 mt-0.5">Select a channel</p>
        </div>
        <div className="max-h-[300px] overflow-y-auto scrollbar-hide p-2">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => { onForward(ch.id); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-all">
              <span className="text-white/30 font-mono-data text-sm">#</span>
              <span className="font-mono-data text-[11px] text-white/60">{ch.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== Pinned Messages =====
function PinnedMessagesPanel({ messages, onClose, onJumpTo }: { messages: Message[]; onClose: () => void; onJumpTo: (id: string) => void }) {
  const pinned = messages.filter(m => m.isPinned);
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="absolute top-[52px] right-0 z-30 w-[320px] glass-card border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5"><Pin className="w-3.5 h-3.5 text-titan-cyan" /><span className="font-display font-bold text-xs text-white">Pinned Messages</span></div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/[0.06] text-white/30"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="max-h-[300px] overflow-y-auto scrollbar-hide p-2">
        {pinned.length === 0 ? (
          <div className="py-8 text-center"><Pin className="w-6 h-6 text-white/10 mx-auto mb-2" /><p className="font-mono-data text-[10px] text-white/20">No pinned messages</p></div>
        ) : pinned.map(msg => (
          <button key={msg.id} onClick={() => { onJumpTo(msg.id); onClose(); }}
            className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all text-left mb-1">
            <div className="w-6 h-6 rounded-md bg-titan-cyan/10 flex items-center justify-center text-[8px] font-bold text-titan-cyan shrink-0">{msg.sender.avatar}</div>
            <div className="min-w-0 flex-1">
              <span className="font-mono-data text-[10px] text-white/50 font-semibold">{msg.sender.name}</span>
              <p className="font-mono-data text-[10px] text-white/40 line-clamp-2">{msg.content}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ===== Mention Dropdown =====
function MentionDropdown({
  members,
  query,
  onSelect,
  position,
}: {
  members: User[];
  query: string;
  onSelect: (member: User) => void;
  position: { top: number; left: number };
}) {
  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(query.toLowerCase()) || m.role.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute z-50 w-[220px] glass-card rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden"
      style={{ bottom: '100%', left: position.left, marginBottom: 8 }}
    >
      <div className="px-3 py-1.5 border-b border-white/[0.06]">
        <span className="font-mono-data text-[9px] text-white/30 uppercase tracking-wider">Mention someone</span>
      </div>
      <div className="max-h-[180px] overflow-y-auto scrollbar-hide p-1">
        {filtered.slice(0, 8).map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all text-left"
          >
            <div
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold',
                member.role === 'client'
                  ? 'bg-titan-purple/20 text-titan-purple'
                  : 'bg-titan-cyan/20 text-titan-cyan'
              )}
            >
              {member.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono-data text-[10px] text-white/60 truncate">{member.name}</p>
              <p className="font-mono-data text-[8px] text-white/20 capitalize">{member.role}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ===== Unread Divider =====
function UnreadDivider({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 my-3 px-2">
      <div className="flex-1 h-px bg-titan-magenta/30" />
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-titan-magenta/10 border border-titan-magenta/20">
        <ChevronDown className="w-3 h-3 text-titan-magenta" />
        <span className="font-mono-data text-[10px] text-titan-magenta font-semibold">
          {count} new message{count > 1 ? 's' : ''}
        </span>
      </span>
      <div className="flex-1 h-px bg-titan-magenta/30" />
    </div>
  );
}

// ===== Thread View =====
function ThreadView({
  parentMessage,
  replies,
  currentUser,
  onClose,
  onSendReply,
  onReaction,
}: {
  parentMessage: Message;
  replies: Message[];
  currentUser: User;
  onClose: () => void;
  onSendReply: (content: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
}) {
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [replies]);

  const handleSend = () => {
    if (!replyText.trim()) return;
    onSendReply(replyText.trim());
    setReplyText('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-0 right-0 bottom-0 z-30 w-[360px] flex flex-col glass-card border-l border-white/[0.06] bg-[#0D1029]/98 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <MessageCircle className="w-3.5 h-3.5 text-titan-cyan" />
        <span className="font-display font-bold text-xs text-white">Thread</span>
        <span className="font-mono-data text-[9px] text-white/20 ml-auto">{replies.length} replies</span>
      </div>

      {/* Parent Message */}
      <div className="px-3 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-start gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0',
              parentMessage.sender.role === 'client'
                ? 'bg-titan-purple/20 text-titan-purple border border-titan-purple/20'
                : 'bg-titan-cyan/20 text-titan-cyan border border-titan-cyan/20'
            )}
          >
            {parentMessage.sender.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-mono-data text-[10px] text-white/50 font-semibold">{parentMessage.sender.name}</span>
              <span className="font-mono-data text-[8px] text-white/20">{parentMessage.timestamp}</span>
            </div>
            <p className="font-mono-data text-[11px] text-white/70 leading-relaxed">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* Thread Replies */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-2">
        {replies.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="w-6 h-6 text-white/10 mx-auto mb-2" />
            <p className="font-mono-data text-[10px] text-white/20">No replies yet. Start the conversation!</p>
          </div>
        ) : (
          replies.map((reply) => {
            const isOwn = reply.sender.id === currentUser.id;
            return (
              <div key={reply.id} className="flex items-start gap-2">
                <div
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold shrink-0',
                    reply.sender.role === 'client'
                      ? 'bg-titan-purple/20 text-titan-purple'
                      : 'bg-titan-cyan/20 text-titan-cyan'
                  )}
                >
                  {reply.sender.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono-data text-[10px] text-white/50 font-semibold">{reply.sender.name}</span>
                    <span className="font-mono-data text-[8px] text-white/20">{reply.timestamp}</span>
                  </div>
                  <div className={cn('px-3 py-2 rounded-xl text-left', isOwn ? 'bg-titan-cyan/10 border border-titan-cyan/15' : 'bg-white/[0.04] border border-white/[0.06]')}>
                    <p className="font-mono-data text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                  </div>
                  {/* Reactions */}
                  {reply.reactions && reply.reactions.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {reply.reactions.map((reaction, i) => (
                        <button
                          key={i}
                          onClick={() => onReaction(reply.id, reaction.emoji)}
                          className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] hover:border-titan-cyan/20 transition-all"
                        >
                          <span className="text-[10px]">{reaction.emoji}</span>
                          <span className="font-mono-data text-[8px] text-white/30">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Input */}
      <div className="px-3 py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Reply in thread..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-[11px] focus:outline-none focus:border-titan-cyan/30 transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!replyText.trim()}
            className={cn(
              'p-2 rounded-lg transition-all',
              replyText.trim() ? 'bg-titan-cyan/20 text-titan-cyan hover:bg-titan-cyan/30' : 'text-white/10'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ===== Saved Messages Panel =====
function SavedMessagesPanel({
  messages,
  onClose,
  onJumpTo,
  onUnsave,
}: {
  messages: Message[];
  onClose: () => void;
  onJumpTo: (id: string) => void;
  onUnsave: (id: string) => void;
}) {
  const saved = messages.filter((m) => m.isSaved);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-[52px] right-0 z-30 w-[340px] glass-card border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-titan-cyan" />
          <span className="font-display font-bold text-xs text-white">Saved Messages</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/[0.06] text-white/30">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-[350px] overflow-y-auto scrollbar-hide p-2">
        {saved.length === 0 ? (
          <div className="py-8 text-center">
            <Bookmark className="w-6 h-6 text-white/10 mx-auto mb-2" />
            <p className="font-mono-data text-[10px] text-white/20">No saved messages</p>
          </div>
        ) : (
          saved.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all mb-1 group"
            >
              <button onClick={() => { onJumpTo(msg.id); onClose(); }} className="flex items-start gap-2 flex-1 text-left min-w-0">
                <div className="w-6 h-6 rounded-md bg-titan-cyan/10 flex items-center justify-center text-[8px] font-bold text-titan-cyan shrink-0">
                  {msg.sender.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-[10px] text-white/50 font-semibold">{msg.sender.name}</span>
                    <span className="font-mono-data text-[8px] text-white/20">{msg.timestamp}</span>
                  </div>
                  <p className="font-mono-data text-[10px] text-white/40 line-clamp-2">{msg.content}</p>
                </div>
              </button>
              <button
                onClick={() => onUnsave(msg.id)}
                className="p-1 rounded-md hover:bg-red-500/10 text-white/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                title="Remove bookmark"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({
  message,
  isOwn,
  onReaction,
  onContextMenu,
  onReplyClick,
  onRetry,
  onOpenThread,
  highlighted,
}: {
  message: Message;
  isOwn: boolean;
  onReaction: (emoji: string) => void;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
  onReplyClick?: (message: Message) => void;
  onRetry?: (message: Message) => void;
  onOpenThread?: (message: Message) => void;
  highlighted?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const StatusIcon = statusIcons[message.status] || Clock;
  const quickReactions = ['👍', '❤️', '🔥', '🚀', '✅', '😂'];

  // Deleted message
  if (message.isDeleted && message.deletedForEveryone) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={cn('flex gap-2.5 mb-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
        <div className={cn('max-w-[70%] min-w-[140px]', isOwn ? 'items-end' : 'items-start')}>
          <div className={cn('px-3.5 py-2 rounded-2xl border border-white/[0.05] bg-white/[0.02]', isOwn ? 'rounded-tr-md' : 'rounded-tl-md')}>
            <p className="font-mono-data text-[11px] text-white/20 italic flex items-center gap-1.5">
              <Trash2 className="w-3 h-3" /> This message was deleted
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.isSystemMessage) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center my-3">
        <div className="max-w-md">
          <div className="glass-card px-4 py-2.5 rounded-xl border border-titan-cyan/10 bg-titan-cyan/[0.03]">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-titan-cyan" />
              </div>
              <div>
                <p className="font-mono-data text-[11px] text-white/70 leading-relaxed">{message.content}</p>
                {message.deliverableTag && <DeliverableCard tag={message.deliverableTag} />}
                {message.boostTag && <BoostCard tag={message.boostTag} />}
                <span className="font-mono-data text-[9px] text-white/20 mt-1 block">{message.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: highlighted ? 0.8 : 1, y: 0, backgroundColor: highlighted ? 'rgba(0,217,255,0.05)' : 'transparent' }}
      className={cn('flex gap-2.5 mb-1 group relative', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, message); }}
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

        {/* Forwarded indicator */}
        {message.forwardedFrom && (
          <div className="flex items-center gap-1 px-2 mb-0.5">
            <Forward className="w-2.5 h-2.5 text-white/20" />
            <span className="font-mono-data text-[9px] text-white/20">Forwarded from #{message.forwardedFrom.channelName}</span>
          </div>
        )}

        {/* Reply Context */}
        {message.replyTo && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 mb-0.5 rounded-t-lg border-l-2 cursor-pointer hover:bg-white/[0.02]',
              isOwn
                ? 'bg-titan-cyan/[0.06] border-titan-cyan/30'
                : 'bg-white/[0.03] border-white/20'
            )}
            onClick={() => {
              const el = document.getElementById(`msg-${message.replyTo?.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
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

          {/* Voice message */}
          {message.messageType === 'voice' && message.voiceUrl ? (
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-titan-cyan/20 flex items-center justify-center text-titan-cyan hover:bg-titan-cyan/30 transition-all">
                <Mic className="w-3.5 h-3.5" />
              </button>
              <audio src={message.voiceUrl} controls className="h-8 flex-1" style={{ maxWidth: 200 }} />
              {message.voiceDuration != null && (
                <span className="font-mono-data text-[9px] text-white/30">
                  {Math.floor(message.voiceDuration / 60)}:{(message.voiceDuration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          ) : (
            <p className="font-mono-data text-[12px] text-white/80 leading-relaxed whitespace-pre-wrap">
              {message.content.split(/(@[\w\s]+?)(?=\s@|\s|$)/g).map((part, i) => {
                if (part.startsWith('@')) {
                  return (
                    <span key={i} className="font-semibold text-titan-cyan bg-titan-cyan/10 rounded px-0.5">
                      {part}
                    </span>
                  );
                }
                return part;
              })}
            </p>
          )}

          {/* Files */}
          {message.files && message.files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.files.map((file) => (
                <div key={file.id}>
                  {file.type === 'image' ? (
                    <div className="rounded-lg overflow-hidden border border-white/[0.1] mt-1">
                      <img
                        src={file.thumbnail || file.url}
                        alt={file.name}
                        className="w-full max-w-[280px] h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                        onClick={() => window.open(file.url, '_blank')}
                      />
                      <div className="flex items-center justify-between px-2 py-1.5 bg-black/20">
                        <span className="font-mono-data text-[9px] text-white/40 truncate">{file.name}</span>
                        <span className="font-mono-data text-[9px] text-white/30">{file.size}</span>
                      </div>
                    </div>
                  ) : file.type === 'video' || file.url?.includes('.mp4') || file.url?.includes('.webm') || file.url?.includes('.mov') ? (
                    <div className="rounded-lg overflow-hidden border border-white/[0.1] mt-1">
                      <video 
                        src={file.url} 
                        controls 
                        className="w-full max-w-[280px] h-auto bg-black/40"
                        preload="metadata"
                      />
                      <div className="flex items-center justify-between px-2 py-1.5 bg-black/20">
                        <span className="font-mono-data text-[9px] text-white/40 truncate">{file.name}</span>
                        <span className="font-mono-data text-[9px] text-white/30">{file.size}</span>
                      </div>
                    </div>
                  ) : file.type === 'voice' ? (
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      <Mic className="w-4 h-4 text-titan-cyan" />
                      <audio src={file.url} controls className="h-7 flex-1" />
                    </div>
                  ) : (
                    <a href={file.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all">
                      <FileText className="w-4 h-4 text-white/40" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono-data text-[10px] text-white/60 truncate">{file.name}</p>
                        <p className="font-mono-data text-[9px] text-white/30">{file.size}</p>
                      </div>
                    </a>
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
            {message.isSaved && (
              <BookmarkCheck className="w-2.5 h-2.5 text-titan-cyan/40" />
            )}
            {isOwn && message.status === 'failed' ? (
              <button
                onClick={() => onRetry?.(message)}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-all"
                title="Retry sending"
              >
                <AlertTriangle className="w-3 h-3" />
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            ) : isOwn ? (
              <StatusIcon
                className={cn(
                  'w-3 h-3',
                  message.status === 'read' ? 'text-titan-cyan' :
                  'text-white/30'
                )}
              />
            ) : null}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex items-center gap-1 mt-1 px-1 flex-wrap">
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
            <button onClick={() => setShowReactions(!showReactions)}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-white/[0.06] text-white/20 hover:text-white/40 transition-all">
              <span className="text-[10px]">+</span>
            </button>
          </div>
        )}

        {/* Thread Count */}
        {message.threadCount && message.threadCount > 0 && (
          <button
            onClick={() => onOpenThread?.(message)}
            className="flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg text-titan-cyan/60 hover:text-titan-cyan hover:bg-titan-cyan/[0.04] transition-all"
          >
            <MessageCircle className="w-3 h-3" />
            <span className="font-mono-data text-[10px] font-semibold">
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
            <button onClick={() => setShowReactions(!showReactions)}
              className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all" title="React">
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onReplyClick?.(message)}
              className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all" title="Reply">
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => onContextMenu(e, message)}
              className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all" title="More">
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
            style={{ top: -8, left: isOwn ? undefined : 40, right: isOwn ? 40 : undefined }}
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
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onForwardMessage,
  onSaveMessage,
  onUnsaveMessage,
  onRetrySendMessage,
  lastReadMessageId,
}: MessageThreadProps) {
  const [inputValue, setInputValue] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: Message; x: number; y: number } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [messages.length]);

  useEffect(() => {
    setReplyingTo(null); setEditingMessage(null); setContextMenu(null);
    setShowSearch(false); setShowPinned(false); setShowSaved(false); setPendingFiles([]);
    setIsRecording(false); setActiveThread(null); setShowMentionDropdown(false);
  }, [channel.id]);

  const handleSend = () => {
    if (editingMessage) {
      if (inputValue.trim() && onEditMessage) onEditMessage(editingMessage.id, inputValue.trim());
      setEditingMessage(null); setInputValue(''); return;
    }
    if (!inputValue.trim() && pendingFiles.length === 0) return;
    onSendMessage(inputValue.trim(), pendingFiles.length > 0 ? pendingFiles : undefined, replyingTo || undefined);
    setInputValue(''); setReplyingTo(null); setPendingFiles([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') {
      if (editingMessage) { setEditingMessage(null); setInputValue(''); }
      if (replyingTo) setReplyingTo(null);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    // Detect @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleMentionSelect = (member: User) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const afterCursor = inputValue.slice(cursorPos);
      const newValue = `${beforeMention}@${member.name} ${afterCursor}`;
      setInputValue(newValue);
      setShowMentionDropdown(false);
      inputRef.current?.focus();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) setPendingFiles(prev => [...prev, file]);
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setPendingFiles(prev => [...prev, ...files]);
  }, []);

  const handleContextMenuAction = (action: MessageAction) => {
    if (!contextMenu) return;
    const msg = contextMenu.message;
    switch (action) {
      case 'reply': setReplyingTo(msg); inputRef.current?.focus(); break;
      case 'edit': setEditingMessage(msg); setInputValue(msg.content); inputRef.current?.focus(); break;
      case 'delete': onDeleteMessage?.(msg.id, false); break;
      case 'delete-for-everyone': onDeleteMessage?.(msg.id, true); break;
      case 'pin': onPinMessage?.(msg.id); break;
      case 'unpin': onUnpinMessage?.(msg.id); break;
      case 'forward': setForwardingMessage(msg); break;
      case 'copy': navigator.clipboard.writeText(msg.content); break;
      case 'save': onSaveMessage?.(msg.id); break;
      case 'unsave': onUnsaveMessage?.(msg.id); break;
      case 'create-task': onCreateDeliverable('design'); break;
    }
    setContextMenu(null);
  };

  const handleVoiceRecorded = (blob: Blob, duration: number) => {
    setIsRecording(false);
    onSendMessage('🎤 Voice message', undefined, replyingTo || undefined, blob);
    setReplyingTo(null);
  };

  const jumpToMessage = (msgId: string) => {
    setHighlightedMsgId(msgId);
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedMsgId(null), 2000);
  };

  // Thread replies mock (in real app, fetch from DB)
  const threadReplies = useMemo(() => {
    if (!activeThread) return [];
    // Return messages that are replies to this thread parent
    return messages.filter(
      (m) => m.replyTo?.id === activeThread.id && !m.isSystemMessage
    );
  }, [activeThread, messages]);

  const handleSendThreadReply = (content: string) => {
    if (!activeThread) return;
    onSendMessage(content, undefined, activeThread);
  };

  const handleOpenAddMember = async () => {
    setShowAddMemberDialog(true);
    setLoadingUsers(true);
    try {
      const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, avatar_url, role, email')
        .eq('tenant_id', DEMO_TENANT_ID);
      
      if (error) throw error;
      
      // Filter out users already in workspace
      const existingMemberIds = workspace.members.map(m => m.id);
      const available = (data || [])
        .filter(u => !existingMemberIds.includes(u.id))
        .map(u => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar_url || '👤',
          status: 'offline' as const,
          role: u.role || 'member',
          email: u.email,
        }));
      
      setAvailableUsers(available);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async (user: User) => {
    try {
      // Import addChannelMember from data-service
      const { addChannelMember } = await import('@/lib/data-service');
      await addChannelMember(channel.id, user.id, user.name, user.avatar, user.role);
      
      // Update workspace members locally (optimistic update)
      workspace.members.push(user);
      
      setShowAddMemberDialog(false);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRetryMessage = (message: Message) => {
    if (onRetrySendMessage) {
      onRetrySendMessage(message.id);
    } else {
      // Fallback: resend with same content
      onSendMessage(message.content);
    }
  };

  // Compute unread divider position
  const unreadDividerIndex = useMemo(() => {
    if (!lastReadMessageId) return -1;
    const idx = messages.findIndex((m) => m.id === lastReadMessageId);
    if (idx === -1 || idx >= messages.length - 1) return -1;
    return idx + 1; // Show divider after the last read message
  }, [messages, lastReadMessageId]);

  const unreadCount = unreadDividerIndex >= 0 ? messages.length - unreadDividerIndex : 0;

  const quickActions = [
    { icon: Palette, label: 'Design', color: 'text-titan-cyan', action: () => onCreateDeliverable('design') },
    { icon: Video, label: 'Video', color: 'text-titan-purple', action: () => onCreateDeliverable('video') },
    { icon: Rocket, label: 'Boost', color: 'text-titan-magenta', action: () => onOpenBoostWizard() },
    { icon: ShieldCheck, label: 'Approval', color: 'text-titan-lime', action: () => onCreateDeliverable('approval') },
  ];

  const visibleMessages = messages.filter(m => !m.isDeleted || m.deletedForEveryone);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 relative" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {/* Channel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0D1029]/60 backdrop-blur-xl z-20">
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
          <span className="font-mono-data text-[10px] text-white/30">{workspace.members.length} members</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all" title="Audio Call"><Phone className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all" title="Video Call"><VideoIcon className="w-4 h-4" /></button>
          <button onClick={() => { setShowSearch(!showSearch); setShowPinned(false); }}
            className={cn('p-2 rounded-lg transition-all', showSearch ? 'bg-titan-cyan/10 text-titan-cyan' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60')} title="Search">
            <Search className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowPinned(!showPinned); setShowSearch(false); setShowSaved(false); }}
            className={cn('p-2 rounded-lg transition-all', showPinned ? 'bg-titan-cyan/10 text-titan-cyan' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60')} title="Pinned">
            <Pin className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowSaved(!showSaved); setShowPinned(false); setShowSearch(false); }}
            className={cn('p-2 rounded-lg transition-all', showSaved ? 'bg-titan-cyan/10 text-titan-cyan' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60')} title="Saved">
            <Bookmark className="w-4 h-4" />
          </button>
          <button onClick={() => setShowMembers(!showMembers)}
            className={cn('p-2 rounded-lg transition-all', showMembers ? 'bg-titan-cyan/10 text-titan-cyan' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60')} title="Members">
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && <SearchPanel messages={messages} onClose={() => setShowSearch(false)} onJumpTo={jumpToMessage} />}
      </AnimatePresence>

      {/* Pinned Messages */}
      <AnimatePresence>
        {showPinned && <PinnedMessagesPanel messages={messages} onClose={() => setShowPinned(false)} onJumpTo={jumpToMessage} />}
      </AnimatePresence>

      {/* Saved Messages */}
      <AnimatePresence>
        {showSaved && (
          <SavedMessagesPanel
            messages={messages}
            onClose={() => setShowSaved(false)}
            onJumpTo={jumpToMessage}
            onUnsave={(id) => onUnsaveMessage?.(id)}
          />
        )}
      </AnimatePresence>

      {/* Members Panel */}
      <AnimatePresence>
        {showMembers && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="absolute top-[52px] right-0 bottom-0 z-20 w-[240px] glass-card border-l border-white/[0.06] bg-[#0D1029]/95 backdrop-blur-xl overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-titan-cyan" /><span className="font-display font-bold text-xs text-white">Members</span></div>
              <button onClick={() => setShowMembers(false)} className="p-1 rounded-md hover:bg-white/[0.06] text-white/30"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-2">
              <button 
                onClick={handleOpenAddMember}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-titan-cyan/60 hover:text-titan-cyan transition-all mb-2"
              >
                <UserPlus className="w-3.5 h-3.5" /><span className="font-mono-data text-[11px]">Add Member</span>
              </button>
              <div className="mb-3">
                <span className="font-mono-data text-[9px] text-white/20 uppercase tracking-wider px-2 mb-1 block">
                  Online — {workspace.members.filter(m => m.status === 'online').length}
                </span>
                {workspace.members.filter(m => m.status === 'online').map(member => (
                  <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all">
                    <div className="relative">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold',
                        member.role === 'client' ? 'bg-titan-purple/20 text-titan-purple' : 'bg-titan-cyan/20 text-titan-cyan')}>
                        {member.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-titan-lime border-2 border-[#0D1029]" />
                    </div>
                    <div><p className="font-mono-data text-[10px] text-white/60">{member.name}</p><p className="font-mono-data text-[8px] text-white/20 capitalize">{member.role}</p></div>
                  </div>
                ))}
              </div>
              {workspace.members.filter(m => m.status !== 'online').length > 0 && (
                <div>
                  <span className="font-mono-data text-[9px] text-white/20 uppercase tracking-wider px-2 mb-1 block">Offline</span>
                  {workspace.members.filter(m => m.status !== 'online').map(member => (
                    <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all opacity-50">
                      <div className="relative">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold',
                          member.role === 'client' ? 'bg-titan-purple/20 text-titan-purple' : 'bg-titan-cyan/20 text-titan-cyan')}>
                          {member.avatar}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white/20 border-2 border-[#0D1029]" />
                      </div>
                      <div><p className="font-mono-data text-[10px] text-white/60">{member.name}</p><p className="font-mono-data text-[8px] text-white/20 capitalize">{member.role}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <MessageContextMenu message={contextMenu.message} isOwn={contextMenu.message.sender.id === currentUser.id}
            position={{ x: contextMenu.x, y: contextMenu.y }} onAction={handleContextMenuAction} onClose={() => setContextMenu(null)} />
        )}
      </AnimatePresence>

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardingMessage && (
          <ForwardModal channels={workspace.channels.map(ch => ({ id: ch.id, name: ch.name }))}
            onForward={(chId) => { onForwardMessage?.(forwardingMessage.id, chId); setForwardingMessage(null); }}
            onClose={() => setForwardingMessage(null)} />
        )}
      </AnimatePresence>

      {/* Thread View */}
      <AnimatePresence>
        {activeThread && (
          <ThreadView
            parentMessage={activeThread}
            replies={threadReplies}
            currentUser={currentUser}
            onClose={() => setActiveThread(null)}
            onSendReply={handleSendThreadReply}
            onReaction={onReaction}
          />
        )}
      </AnimatePresence>

      {/* Add Member Dialog */}
      <AnimatePresence>
        {showAddMemberDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddMemberDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card border border-white/[0.08] rounded-xl p-4 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-titan-cyan" />
                  <h3 className="font-display font-bold text-sm text-white">Add Member to {channel.name}</h3>
                </div>
                <button
                  onClick={() => setShowAddMemberDialog(false)}
                  className="p-1 rounded-md hover:bg-white/[0.06] text-white/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-8 text-white/40 font-mono-data text-xs">
                  No available users to add
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.06] transition-all group"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold',
                        user.role === 'client' ? 'bg-titan-purple/20 text-titan-purple' : 'bg-titan-cyan/20 text-titan-cyan'
                      )}>
                        {user.avatar}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-mono-data text-xs text-white/80 group-hover:text-white">{user.name}</p>
                        <p className="font-mono-data text-[10px] text-white/30 capitalize">{user.role}</p>
                      </div>
                      <UserPlus className="w-4 h-4 text-white/20 group-hover:text-titan-cyan" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-2">
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="font-mono-data text-[10px] text-white/20">Today</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {visibleMessages.map((msg, idx) => (
          <React.Fragment key={msg.id}>
            {/* Unread Divider */}
            {unreadDividerIndex >= 0 && idx === unreadDividerIndex && (
              <UnreadDivider count={unreadCount} />
            )}
            <MessageBubble
              message={msg}
              isOwn={msg.sender.id === currentUser.id}
              onReaction={(emoji) => onReaction(msg.id, emoji)}
              onContextMenu={(e, m) => setContextMenu({ message: m, x: e.clientX, y: e.clientY })}
              onReplyClick={(m) => { setReplyingTo(m); inputRef.current?.focus(); }}
              onRetry={handleRetryMessage}
              onOpenThread={(m) => setActiveThread(m)}
              highlighted={highlightedMsgId === msg.id}
            />
          </React.Fragment>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-lg bg-titan-purple/20 flex items-center justify-center text-[8px] font-bold text-titan-purple border border-titan-purple/20">JW</div>
              <div className="px-3 py-2 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.06]">
                <div className="flex items-center gap-1">
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-white/40" />
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button key={action.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={action.action}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card border border-white/[0.08] hover:border-white/[0.15] transition-all', action.color)}>
                  <Icon className="w-3.5 h-3.5" /><span className="font-mono-data text-[10px]">{action.label}</span>
                </motion.button>
              );
            })}
            <button onClick={() => setShowQuickActions(false)} className="ml-auto p-1 rounded-md hover:bg-white/[0.06] text-white/30"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply/Edit Bar */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 bg-[#0D1029]/60">
            <div className="w-0.5 h-8 rounded-full bg-titan-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-mono-data text-[10px] text-titan-cyan font-semibold flex items-center gap-1">
                {editingMessage ? <><Edit3 className="w-3 h-3" /> Editing message</> : <><Reply className="w-3 h-3" /> Replying to {replyingTo?.sender.name}</>}
              </span>
              <p className="font-mono-data text-[10px] text-white/30 truncate">{(editingMessage || replyingTo)?.content}</p>
            </div>
            <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setInputValue(''); }}
              className="p-1 rounded-md hover:bg-white/[0.06] text-white/30"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="px-4 py-2 border-t border-white/[0.06]">
            <FilePreview files={pendingFiles} onRemove={(i) => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0D1029]/40 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <button onClick={() => setShowQuickActions(!showQuickActions)}
            className={cn('p-2 rounded-lg transition-all shrink-0',
              showQuickActions ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60 border border-transparent')}
            title="Quick Actions"><Zap className="w-4 h-4" /></button>

          <button onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all shrink-0" title="Attach Files">
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />

          {isRecording ? (
            <VoiceRecorder onRecorded={handleVoiceRecorded} onCancel={() => setIsRecording(false)} />
          ) : (
            <>
              <div className="flex-1 relative">
                {/* Mention Dropdown */}
                <AnimatePresence>
                  {showMentionDropdown && (
                    <MentionDropdown
                      members={workspace.members}
                      query={mentionQuery}
                      onSelect={handleMentionSelect}
                      position={{ top: 0, left: 16 }}
                    />
                  )}
                </AnimatePresence>
                <textarea ref={inputRef} value={inputValue} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={editingMessage ? 'Edit your message...' : `Message #${channel.name}... (@ to mention)`}
                  rows={1}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-xs leading-relaxed focus:outline-none focus:border-titan-cyan/30 focus:bg-white/[0.06] transition-all resize-none max-h-[120px]" />
              </div>

              {/* @ Mention Button */}
              <button
                onClick={() => {
                  setInputValue(prev => prev + '@');
                  setShowMentionDropdown(true);
                  setMentionQuery('');
                  inputRef.current?.focus();
                }}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all shrink-0"
                title="Mention someone"
              >
                <AtSign className="w-4 h-4" />
              </button>

              <div className="relative">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn('p-2 rounded-lg transition-all shrink-0',
                    showEmojiPicker ? 'bg-titan-cyan/10 text-titan-cyan' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60')} title="Emoji">
                  <Smile className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <EmojiPicker onSelect={(emoji) => { setInputValue(prev => prev + emoji); inputRef.current?.focus(); }} onClose={() => setShowEmojiPicker(false)} />
                  )}
                </AnimatePresence>
              </div>

              {inputValue.trim() || pendingFiles.length > 0 ? (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSend}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-titan-cyan to-titan-cyan/80 text-titan-bg hover:shadow-lg hover:shadow-titan-cyan/20 transition-all shrink-0"
                  title={editingMessage ? 'Save Edit' : 'Send'}>
                  {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </motion.button>
              ) : (
                <button onClick={() => setIsRecording(true)}
                  className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all shrink-0" title="Voice Message">
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
