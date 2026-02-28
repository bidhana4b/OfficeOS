import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  sendMessage as sendMessageToDb,
  subscribeToMessages,
  uploadMessageFile,
  addMessageFile,
  addMessageReaction,
  removeMessageReaction,
  editMessage as editMessageDb,
  deleteMessage as deleteMessageDb,
  pinMessage as pinMessageDb,
  unpinMessage as unpinMessageDb,
  sendTypingIndicator,
  clearTypingIndicator,
  subscribeToTypingIndicators,
} from '@/lib/data-service';
import {
  MessageCircle,
  Send,
  Paperclip,
  Image,
  Mic,
  ChevronLeft,
  Check,
  CheckCheck,
  Smile,
  Tag,
  Loader2,
  Search,
  Pin,
  PinOff,
  Reply,
  Copy,
  X,
  FileText,
  Download,
  Users,
  Hash,
  RefreshCw,
  Wifi,
  WifiOff,
  Edit3,
  Trash2,
  Forward,
  ChevronDown,
  Clock,
  Video,
  Plus,
  MessageSquare,
  Filter,
} from 'lucide-react';
import VoiceRecorder from '@/components/messaging/VoiceRecorder';

// ===== Types =====
interface MessageFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: string;
  thumbnail?: string;
}

interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'client' | 'agency';
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  timestamp: string;
  rawTimestamp?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'file' | 'deliverable' | 'system' | 'voice';
  deliverableTag?: string;
  imageUrl?: string;
  files?: MessageFile[];
  replyTo?: { id?: string; senderName: string; text: string } | null;
  isPinned?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  isSaved?: boolean;
  reactions?: MessageReaction[];
  voiceUrl?: string;
  voiceDuration?: number;
  forwardedFrom?: { channelName: string };
}

interface ChatChannel {
  id: string;
  name: string;
  avatar: string;
  type: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isTyping: boolean;
  memberCount?: number;
  description?: string;
  isDemo?: boolean;
  isMuted?: boolean;
  isPrivate?: boolean;
}

// ===== Constants =====
const channelEmoji: Record<string, string> = {
  general: '💬',
  deliverables: '📦',
  'boost-requests': '🚀',
  billing: '💳',
  internal: '🔒',
  custom: '🏷️',
};

const channelDescriptions: Record<string, string> = {
  general: 'General discussions with your team',
  deliverables: 'Task updates & deliveries',
  'boost-requests': 'Ad campaigns & boost requests',
  billing: 'Invoices & payments',
  internal: 'Internal team chat',
  custom: 'Custom channel',
};

const emojiQuick = ['👍', '❤️', '😊', '🔥', '✅', '👏', '🎉', '💯'];
const emojiAll = [
  ...emojiQuick,
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😇', '🥰', '😍',
  '🤩', '😘', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤔', '🤯',
  '🥳', '🤠', '🥺', '😤', '😡', '🤮', '🥶', '🥵', '😈', '💀', '👻', '👽',
  '💩', '🤡', '🫠', '😎', '🤓', '😮', '😲', '🤝', '💪', '🙏', '🫡', '👌',
];

const channelTypePriority: Record<string, number> = {
  general: 0, deliverables: 1, 'boost-requests': 2, billing: 3, custom: 4, internal: 5,
};

// ===== Helper Components =====
function StatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-titan-cyan" />;
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-white/30" />;
  if (status === 'sent') return <Check className="w-3 h-3 text-white/20" />;
  if (status === 'sending') return <Clock className="w-3 h-3 text-white/15 animate-pulse" />;
  if (status === 'failed') return <X className="w-3 h-3 text-red-400" />;
  return <Check className="w-3 h-3 text-white/20" />;
}

function formatMessageDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-0.5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-titan-cyan/60"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ===== Main Component =====
export default function ClientMessages() {
  const { user } = useAuth();

  // Channel state
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [activeChannelDbId, setActiveChannelDbId] = useState<string | null>(null);

  // Message state
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // UI state
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [contextMenuMsg, setContextMenuMsg] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'files' | 'media'>('all');

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== Fetch Channels =====
  const fetchChannels = useCallback(async () => {
    setConnectionError(null);
    try {
      const clientId = user?.client_id;
      if (!clientId) {
        setChannels([]);
        setLoading(false);
        setConnectionStatus('disconnected');
        return;
      }

      const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('id, channels(*)')
        .eq('client_id', clientId)
        .single();

      if (error) {
        console.warn('Workspace fetch error:', error);
        setChannels([]);
        setConnectionError('Could not connect to messaging server');
        setConnectionStatus('disconnected');
        setLoading(false);
        return;
      }

      if (workspace) {
        const chs = (workspace.channels as Record<string, unknown>[]) || [];
        if (chs.length > 0) {
          const mapped: ChatChannel[] = chs
            .filter((ch) => !(ch.is_hidden as boolean) && (ch.type as string) !== 'internal')
            .map((ch) => {
              const lastMsgTime = ch.last_message_time ? new Date(ch.last_message_time as string) : null;
              let timeAgo = '';
              if (lastMsgTime) {
                const diffMs = Date.now() - lastMsgTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 1) timeAgo = 'just now';
                else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                else {
                  const hrs = Math.floor(diffMins / 60);
                  timeAgo = hrs >= 24 ? `${Math.floor(hrs / 24)}d ago` : `${hrs}h ago`;
                }
              }
              const chType = (ch.type as string) || 'general';
              return {
                id: ch.id as string,
                name: (ch.name as string) || 'General',
                avatar: channelEmoji[chType] || '💬',
                type: chType,
                lastMessage: (ch.last_message as string) || '',
                timestamp: timeAgo,
                unread: (ch.unread_count as number) || 0,
                isTyping: false,
                memberCount: (ch.member_count as number) || 0,
                description: channelDescriptions[chType] || (ch.description as string) || '',
                isDemo: false,
                isMuted: (ch.is_muted as boolean) || false,
                isPrivate: (ch.is_private as boolean) || false,
              };
            })
            .sort((a, b) => (channelTypePriority[a.type] ?? 99) - (channelTypePriority[b.type] ?? 99));
          setChannels(mapped);
          setConnectionStatus('connected');
        } else {
          setChannels([]);
        }
      } else {
        setChannels([]);
      }
    } catch (e) {
      console.error('Failed to fetch channels:', e);
      setChannels([]);
      setConnectionError('Connection error');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // ===== Fetch Messages =====
  const fetchMessages = useCallback(async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('messages')
        .select('*, message_files(*), message_reactions(*)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (err) throw err;

      if (result && result.length > 0) {
        const mapped: Message[] = result.map((r: Record<string, unknown>) => {
          const isClient = (r.sender_role as string) === 'client' || (r.sender_id as string) === user?.id;
          const files = (r.message_files as Record<string, unknown>[]) || [];
          const reactions = (r.message_reactions as Record<string, unknown>[]) || [];

          const reactionMap: Record<string, { emoji: string; users: string[]; count: number }> = {};
          reactions.forEach((rx) => {
            const emoji = rx.emoji as string;
            if (!reactionMap[emoji]) reactionMap[emoji] = { emoji, users: [], count: 0 };
            reactionMap[emoji].users.push(rx.user_id as string);
            reactionMap[emoji].count++;
          });

          const hasVoice = (r.message_type as string) === 'voice' || !!(r.voice_url as string);

          return {
            id: r.id as string,
            text: r.content as string,
            sender: isClient ? 'client' : 'agency',
            senderId: (r.sender_id as string) || '',
            senderName: isClient ? 'You' : (r.sender_name as string) || 'Team',
            senderAvatar: (r.sender_avatar as string) || ((r.sender_name as string) || 'T').substring(0, 2).toUpperCase(),
            senderRole: (r.sender_role as string) || undefined,
            timestamp: new Date(r.created_at as string).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
            }),
            rawTimestamp: r.created_at as string,
            status: (r.status as Message['status']) || 'sent',
            type: hasVoice ? 'voice' : (r.is_system_message as boolean) ? 'system' : files.length > 0 ? 'file' : 'text',
            deliverableTag: (r.is_system_message as boolean) ? (r.content as string).substring(0, 60) : undefined,
            isPinned: (r.is_pinned as boolean) || false,
            isEdited: (r.is_edited as boolean) || false,
            isDeleted: (r.is_deleted as boolean) || false,
            isSaved: false,
            voiceUrl: (r.voice_url as string) || undefined,
            voiceDuration: (r.voice_duration as number) || undefined,
            files: files.map((f: Record<string, unknown>) => ({
              id: f.id as string,
              name: (f.name as string) || (f.file_name as string) || 'file',
              url: (f.url as string) || (f.file_url as string) || '',
              type: (f.type as string) || (f.file_type as string) || 'document',
              size: f.size as string || undefined,
              thumbnail: (f.thumbnail as string) || undefined,
            })),
            reactions: Object.values(reactionMap),
            replyTo: r.reply_to_id ? {
              id: r.reply_to_id as string,
              senderName: (r.reply_to_sender as string) || 'Someone',
              text: (r.reply_to_content as string) || '',
            } : null,
          };
        });
        setMessages(mapped);
        setPinnedMessages(mapped.filter(m => m.isPinned));
      } else {
        setMessages([]);
        setPinnedMessages([]);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setMessagesLoading(false);
    }
  }, [user?.id]);

  // ===== Real-time message subscription =====
  useEffect(() => {
    if (!activeChannelDbId) return;

    const unsubscribe = subscribeToMessages(activeChannelDbId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new;
        const isClient = (newMsg.sender_role as string) === 'client' || (newMsg.sender_id as string) === user?.id;
        const hasVoice = (newMsg.message_type as string) === 'voice' || !!(newMsg.voice_url as string);
        const mapped: Message = {
          id: newMsg.id as string,
          text: newMsg.content as string,
          sender: isClient ? 'client' : 'agency',
          senderId: (newMsg.sender_id as string) || '',
          senderName: isClient ? 'You' : (newMsg.sender_name as string) || 'Team',
          senderAvatar: (newMsg.sender_avatar as string) || 'T',
          senderRole: (newMsg.sender_role as string) || undefined,
          timestamp: new Date(newMsg.created_at as string).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
          }),
          rawTimestamp: newMsg.created_at as string,
          status: (newMsg.status as Message['status']) || 'sent',
          type: hasVoice ? 'voice' : (newMsg.is_system_message as boolean) ? 'system' : 'text',
          files: [],
          reactions: [],
          isPinned: (newMsg.is_pinned as boolean) || false,
          voiceUrl: (newMsg.voice_url as string) || undefined,
          voiceDuration: (newMsg.voice_duration as number) || undefined,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
      }

      if (payload.eventType === 'UPDATE') {
        const upd = payload.new;
        setMessages((prev) => prev.map((m) => {
          if (m.id === (upd.id as string)) {
            return {
              ...m,
              text: (upd.content as string) || m.text,
              isPinned: (upd.is_pinned as boolean) || false,
              isEdited: (upd.is_edited as boolean) || m.isEdited,
              isDeleted: (upd.is_deleted as boolean) || false,
              voiceUrl: (upd.voice_url as string) || m.voiceUrl,
              voiceDuration: (upd.voice_duration as number) || m.voiceDuration,
            };
          }
          return m;
        }));
      }
    });

    return unsubscribe;
  }, [activeChannelDbId, user?.id]);

  // ===== Real-time file subscription =====
  useEffect(() => {
    if (!activeChannelDbId) return;
    const subscription = supabase
      .channel(`client-msg-files:${activeChannelDbId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_files', filter: `channel_id=eq.${activeChannelDbId}` }, (payload) => {
        const nf = payload.new;
        setMessages((prev) => prev.map((m) => {
          if (m.id === (nf.message_id as string)) {
            const newFile: MessageFile = {
              id: nf.id as string,
              name: (nf.name as string) || (nf.file_name as string) || 'file',
              url: (nf.url as string) || (nf.file_url as string) || '',
              type: (nf.type as string) || 'document',
              size: (nf.size as string) || undefined,
              thumbnail: (nf.thumbnail as string) || undefined,
            };
            return { ...m, files: [...(m.files || []), newFile], type: 'file' as const };
          }
          return m;
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [activeChannelDbId]);

  // ===== Typing indicators =====
  useEffect(() => {
    if (!activeChannelDbId) return;
    const unsub = subscribeToTypingIndicators(activeChannelDbId, (users) => {
      setTypingUsers(users.filter(u => u !== user?.id && u !== user?.display_name));
    });
    return unsub;
  }, [activeChannelDbId, user?.id, user?.display_name]);

  // ===== Auto-scroll =====
  useEffect(() => {
    if (scrollRef.current && !showScrollBottom) {
      setTimeout(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, 100);
    }
  }, [messages, activeChannel]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    setShowScrollBottom(false);
  }, []);

  // ===== Channel selection =====
  const handleSelectChannel = useCallback((channel: ChatChannel) => {
    setActiveChannel(channel);
    setActiveChannelDbId(channel.id);
    setShowSearch(false);
    setSearchQuery('');
    setSelectedMessage(null);
    setReplyTo(null);
    setEditingMessage(null);
    setShowPinnedMessages(false);
    setFilterType('all');
    fetchMessages(channel.id);
  }, [fetchMessages]);

  // ===== Send Message =====
  const handleSend = useCallback(async () => {
    if (!message.trim() || !activeChannelDbId) return;
    setSending(true);
    const optimisticId = `msg-${Date.now()}`;
    const newMsg: Message = {
      id: optimisticId,
      text: message,
      sender: 'client',
      senderId: user?.id || 'client',
      senderName: 'You',
      senderAvatar: user?.display_name?.split(' ').map(n => n[0]).join('') || 'U',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTimestamp: new Date().toISOString(),
      status: 'sending',
      type: 'text',
      replyTo: replyTo ? { senderName: replyTo.senderName, text: replyTo.text } : null,
      reactions: [],
      files: [],
    };
    setMessages((prev) => [...prev, newMsg]);
    const sentMessage = message;
    setMessage('');
    setReplyTo(null);
    setShowEmoji(false);

    if (user?.id && activeChannelDbId) {
      clearTypingIndicator(activeChannelDbId, user.id).catch(() => {});
    }

    try {
      const result = await sendMessageToDb({
        channel_id: activeChannelDbId,
        sender_id: user?.id || 'client',
        sender_name: user?.display_name || 'Client',
        sender_avatar: user?.avatar || user?.display_name?.split(' ').map(n => n[0]).join('') || 'C',
        sender_role: 'client',
        content: sentMessage,
      });
      setMessages((prev) => prev.map((m) =>
        m.id === optimisticId ? { ...m, id: result.id, status: 'delivered' as const } : m
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.map((m) =>
        m.id === optimisticId ? { ...m, status: 'failed' as const } : m
      ));
    } finally {
      setSending(false);
    }
  }, [message, activeChannelDbId, user, replyTo]);

  // ===== Typing handler =====
  const handleTyping = useCallback(() => {
    if (!activeChannelDbId || !user?.id) return;
    sendTypingIndicator(activeChannelDbId, user.id, '').catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingIndicator(activeChannelDbId, user.id).catch(() => {});
    }, 3000);
  }, [activeChannelDbId, user?.id]);

  // ===== File Upload =====
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChannelDbId) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await sendMessageToDb({
        channel_id: activeChannelDbId,
        sender_id: user?.id || 'client',
        sender_name: user?.display_name || 'Client',
        sender_avatar: user?.avatar || 'C',
        sender_role: 'client',
        content: `📎 Sent ${files.length} file(s)`,
      });
      let uploaded = 0;
      for (const file of Array.from(files)) {
        try {
          const uploadResult = await uploadMessageFile(file, activeChannelDbId);
          await addMessageFile(result.id, {
            name: uploadResult.name,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
            url: uploadResult.url,
            size: uploadResult.size,
          });
          uploaded++;
          setUploadProgress(Math.round((uploaded / files.length) * 100));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      await fetchMessages(activeChannelDbId);
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [activeChannelDbId, user, fetchMessages]);

  // ===== Voice Message =====
  const handleVoiceSend = useCallback(async (blob: Blob) => {
    if (!activeChannelDbId || !user) return;
    setSending(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const result = await sendMessageToDb({
        channel_id: activeChannelDbId,
        sender_id: user.id,
        sender_name: user.display_name || 'Client',
        sender_avatar: user.avatar || 'C',
        sender_role: 'client',
        content: '🎤 Voice message',
        message_type: 'voice',
      });
      const uploaded = await uploadMessageFile(file, activeChannelDbId);
      await addMessageFile(result.id, { name: file.name, type: 'voice', url: uploaded.url, size: uploaded.size });

      // Update message with voice URL and duration
      const duration = Math.floor(blob.size / 16000);
      await supabase
        .from('messages')
        .update({ voice_url: uploaded.url, voice_duration: duration })
        .eq('id', result.id);

      await fetchMessages(activeChannelDbId);
    } catch (err) {
      console.error('Voice send failed:', err);
    } finally {
      setSending(false);
      setShowVoiceRecorder(false);
    }
  }, [activeChannelDbId, user, fetchMessages]);

  // ===== Message Actions =====
  const handleReaction = useCallback(async (msgId: string, emoji: string) => {
    if (!user?.id) return;
    try {
      const msg = messages.find(m => m.id === msgId);
      const existing = msg?.reactions?.find(r => r.emoji === emoji && r.users.includes(user.id));
      if (existing) {
        await removeMessageReaction(msgId, emoji, user.id);
      } else {
        await addMessageReaction(msgId, emoji, user.id);
      }
      setMessages((prev) => prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex(r => r.emoji === emoji);
        if (existing) {
          if (idx >= 0) {
            reactions[idx] = { ...reactions[idx], users: reactions[idx].users.filter(u => u !== user.id), count: reactions[idx].count - 1 };
            if (reactions[idx].count <= 0) reactions.splice(idx, 1);
          }
        } else {
          if (idx >= 0) {
            reactions[idx] = { ...reactions[idx], users: [...reactions[idx].users, user.id], count: reactions[idx].count + 1 };
          } else {
            reactions.push({ emoji, users: [user.id], count: 1 });
          }
        }
        return { ...m, reactions };
      }));
    } catch (err) { console.error('Reaction failed:', err); }
    setSelectedMessage(null);
    setContextMenuMsg(null);
  }, [messages, user?.id]);

  const handleEditMessage = useCallback(async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      await editMessageDb(editingMessage.id, editText);
      setMessages((prev) => prev.map((m) => m.id === editingMessage.id ? { ...m, text: editText, isEdited: true } : m));
    } catch (err) { console.error('Edit failed:', err); }
    setEditingMessage(null);
    setEditText('');
  }, [editingMessage, editText]);

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    try {
      await deleteMessageDb(msgId, false);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isDeleted: true, text: 'This message was deleted' } : m));
    } catch (err) { console.error('Delete failed:', err); }
    setContextMenuMsg(null);
  }, []);

  const handlePinMessage = useCallback(async (msg: Message) => {
    try {
      if (msg.isPinned) {
        await unpinMessageDb(msg.id);
      } else {
        await pinMessageDb(msg.id, activeChannelDbId || '', user?.id || '');
      }
      setMessages((prev) => {
        const updated = prev.map((m) => m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m);
        setPinnedMessages(updated.filter(m => m.isPinned));
        return updated;
      });
    } catch (err) { console.error('Pin failed:', err); }
    setContextMenuMsg(null);
  }, [activeChannelDbId, user?.id]);

  const handleCopyMessage = useCallback((msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    setContextMenuMsg(null);
    setSelectedMessage(null);
  }, []);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    setContextMenuMsg(null);
    setSelectedMessage(null);
    inputRef.current?.focus();
  }, []);

  const startEditMessage = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setEditText(msg.text);
    setContextMenuMsg(null);
    setTimeout(() => editInputRef.current?.focus(), 100);
  }, []);

  // ===== Computed =====
  const filteredChannels = useMemo(() => channels.filter(ch => ch.name.toLowerCase().includes(channelSearch.toLowerCase())), [channels, channelSearch]);

  const displayMessages = useMemo(() => {
    let msgs = messages;
    if (searchQuery) msgs = msgs.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType === 'pinned') msgs = msgs.filter(m => m.isPinned);
    if (filterType === 'files') msgs = msgs.filter(m => m.files && m.files.length > 0);
    if (filterType === 'media') msgs = msgs.filter(m => m.type === 'image' || m.type === 'voice' || (m.files?.some(f => f.type === 'image' || f.type === 'video')));
    return msgs;
  }, [messages, searchQuery, filterType]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let lastDate = '';
    displayMessages.forEach((msg) => {
      const date = msg.rawTimestamp ? formatMessageDate(msg.rawTimestamp) : 'Today';
      if (date !== lastDate) { groups.push({ date, messages: [msg] }); lastDate = date; }
      else { groups[groups.length - 1].messages.push(msg); }
    });
    return groups;
  }, [displayMessages]);

  const totalUnread = useMemo(() => channels.reduce((s, c) => s + c.unread, 0), [channels]);

  // ======================================
  // CHANNEL LIST VIEW
  // ======================================
  if (!activeChannel) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-titan-bg to-titan-bg/95">
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 border border-titan-cyan/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-titan-cyan" />
                </div>
                Messages
              </h1>
              <p className="font-mono text-[10px] text-white/30 mt-0.5 ml-10">
                {totalUnread > 0 && <span className="text-titan-cyan">{totalUnread} unread</span>}
                {totalUnread > 0 && ' • '}
                {channels.length} channels
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono ${
                connectionStatus === 'connected' ? 'bg-titan-lime/10 text-titan-lime border border-titan-lime/20' :
                connectionStatus === 'connecting' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
                'bg-red-400/10 text-red-400 border border-red-400/20'
              }`}>
                {connectionStatus === 'connected' ? <Wifi className="w-2.5 h-2.5" /> :
                 connectionStatus === 'connecting' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> :
                 <WifiOff className="w-2.5 h-2.5" />}
                {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? '...' : 'Offline'}
              </div>
              <button
                onClick={() => { setLoading(true); fetchChannels(); }}
                className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform hover:bg-white/[0.06]"
              >
                <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {connectionError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <WifiOff className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
              <span className="font-mono text-[10px] text-red-400/70">{connectionError}</span>
              <button onClick={() => { setLoading(true); fetchChannels(); }} className="ml-auto text-[9px] text-titan-cyan font-mono">Retry</button>
            </motion.div>
          )}

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-2">
          {loading && channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-titan-cyan/40 animate-spin mb-3" />
              <p className="font-mono text-xs text-white/30">Loading channels...</p>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-white/15" />
              </div>
              <p className="text-white/40 text-sm font-display font-semibold">{channelSearch ? 'No matching channels' : 'No channels yet'}</p>
              <p className="text-white/20 text-xs mt-1 max-w-[200px]">{channelSearch ? 'Try a different search' : 'Your agency will set up messaging channels for you'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChannels.map((channel, i) => (
                <motion.button
                  key={channel.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleSelectChannel(channel)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] active:scale-[0.98] transition-all group"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-xl shrink-0 group-hover:border-titan-cyan/20 transition-colors">
                      {channel.avatar}
                    </div>
                    {channel.unread > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-titan-cyan text-titan-bg text-[9px] font-mono font-bold flex items-center justify-center px-1">
                        {channel.unread > 99 ? '99+' : channel.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-sm text-white flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-white/20" />
                        {channel.name}
                      </span>
                      <span className="font-mono text-[9px] text-white/25 shrink-0">{channel.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="font-mono text-[11px] text-white/40 truncate flex-1">
                        {channel.isTyping ? (
                          <span className="text-titan-cyan italic flex items-center gap-1">Someone typing <TypingDots /></span>
                        ) : (channel.lastMessage || channel.description)}
                      </p>
                    </div>
                    {channel.memberCount && channel.memberCount > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-2.5 h-2.5 text-white/15" />
                        <span className="font-mono text-[8px] text-white/15">{channel.memberCount} members</span>
                        <span className="font-mono text-[8px] text-white/10 capitalize">• {channel.type}</span>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======================================
  // CHAT VIEW (Full-Featured)
  // ======================================
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-titan-bg to-titan-bg/95">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.06] bg-titan-bg/95 backdrop-blur-xl">
        <button onClick={() => { setActiveChannel(null); setShowSearch(false); setShowPinnedMessages(false); setFilterType('all'); }} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0">
          <ChevronLeft className="w-5 h-5 text-white/50" />
        </button>
        <button onClick={() => { setShowChannelInfo(!showChannelInfo); setShowPinnedMessages(false); }} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-base">{activeChannel.avatar}</div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-display font-semibold text-sm text-white truncate flex items-center gap-1">
              <Hash className="w-3 h-3 text-white/20" />{activeChannel.name}
            </p>
            <p className="font-mono text-[10px] text-white/30">
              {activeChannel.memberCount ? `${activeChannel.memberCount} members` : ''}
              {typingUsers.length > 0 ? (
                <span className="text-titan-cyan ml-1 inline-flex items-center gap-1">{typingUsers.join(', ')} typing <TypingDots /></span>
              ) : (
                <span className="inline-flex items-center gap-1 ml-1"><span className="w-1.5 h-1.5 rounded-full bg-titan-lime inline-block" /> Online</span>
              )}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {pinnedMessages.length > 0 && (
            <button onClick={() => setShowPinnedMessages(!showPinnedMessages)} className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all relative ${showPinnedMessages ? 'bg-white/[0.06]' : ''}`}>
              <Pin className="w-4 h-4 text-white/30" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-titan-yellow text-titan-bg text-[7px] font-bold flex items-center justify-center">{pinnedMessages.length}</span>
            </button>
          )}
          <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }} className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all ${showSearch ? 'bg-white/[0.06]' : ''}`}>
            <Search className="w-4 h-4 text-white/30" />
          </button>
        </div>
      </div>

      {/* Search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 border-b border-white/[0.06] overflow-hidden">
            <div className="py-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." autoFocus className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-white/30" /></button>}
            </div>
            {searchQuery && <p className="font-mono text-[9px] text-white/20 pb-2">{displayMessages.length} result(s)</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04] overflow-x-auto scrollbar-hide">
        {([
          { key: 'all', label: 'All', icon: MessageSquare },
          { key: 'pinned', label: 'Pinned', icon: Pin },
          { key: 'files', label: 'Files', icon: FileText },
          { key: 'media', label: 'Media', icon: Image },
        ] as const).map((f) => (
          <button key={f.key} onClick={() => setFilterType(f.key)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono transition-all whitespace-nowrap ${filterType === f.key ? 'bg-titan-cyan/15 text-titan-cyan border border-titan-cyan/25' : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:bg-white/[0.06]'}`}>
            <f.icon className="w-2.5 h-2.5" />{f.label}
          </button>
        ))}
      </div>

      {/* Pinned Panel */}
      <AnimatePresence>
        {showPinnedMessages && pinnedMessages.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-white/[0.06] overflow-hidden max-h-[200px] overflow-y-auto">
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-titan-yellow flex items-center gap-1"><Pin className="w-3 h-3" /> {pinnedMessages.length} Pinned</span>
                <button onClick={() => setShowPinnedMessages(false)}><X className="w-3.5 h-3.5 text-white/30" /></button>
              </div>
              {pinnedMessages.map((pm) => (
                <div key={pm.id} className="px-2.5 py-2 rounded-lg bg-titan-yellow/5 border border-titan-yellow/10 mb-1">
                  <p className="font-mono text-[9px] text-titan-yellow/60">{pm.senderName}</p>
                  <p className="font-mono text-[10px] text-white/50 truncate">{pm.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel Info */}
      <AnimatePresence>
        {showChannelInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 py-3 border-b border-white/[0.06] overflow-hidden">
            <div className="glass-card p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{activeChannel.avatar}</div>
                <div>
                  <p className="font-display font-bold text-sm text-white"># {activeChannel.name}</p>
                  <p className="font-mono text-[10px] text-white/30">{activeChannel.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Users, value: activeChannel.memberCount || 0, label: 'Members', color: 'titan-cyan' },
                  { icon: Pin, value: pinnedMessages.length, label: 'Pinned', color: 'titan-yellow' },
                  { icon: FileText, value: messages.filter(m => m.files && m.files.length > 0).length, label: 'Files', color: 'titan-purple' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-white/[0.03]">
                    <s.icon className={`w-3.5 h-3.5 text-${s.color}/50`} />
                    <span className="font-mono text-[10px] text-white/40">{s.value}</span>
                    <span className="font-mono text-[7px] text-white/20">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 relative">
        {messagesLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin mb-2" />
            <p className="font-mono text-[10px] text-white/20">Loading messages...</p>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white/30 text-sm font-display font-semibold">{filterType !== 'all' ? `No ${filterType} messages` : 'No messages yet'}</p>
            <p className="text-white/15 text-[10px] font-mono mt-1">{filterType !== 'all' ? 'Try a different filter' : 'Start the conversation! 🎉'}</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="font-mono text-[9px] text-white/20 bg-titan-bg px-2">{group.date}</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const isClient = msg.sender === 'client';
                  const isSystem = msg.type === 'system' || msg.type === 'deliverable';
                  const isCtx = contextMenuMsg === msg.id;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                          <Tag className="w-3 h-3 text-titan-purple/50" />
                          <span className="font-mono text-[9px] text-white/30">{msg.text}</span>
                        </div>
                      </div>
                    );
                  }

                  if (msg.isDeleted) {
                    return (
                      <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                        <div className="px-3 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                          <p className="font-mono text-[11px] text-white/20 italic">🚫 This message was deleted</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isClient ? 'justify-end' : 'justify-start'} group relative`}>
                      {!isClient && (
                        <div className="w-7 h-7 rounded-full glass-card flex items-center justify-center text-[9px] font-bold text-white/40 mr-2 mt-5 shrink-0">
                          {msg.senderAvatar.substring(0, 2)}
                        </div>
                      )}
                      <div className="max-w-[78%] relative">
                        {!isClient && (
                          <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                            <p className="font-mono text-[9px] text-white/30">{msg.senderName}</p>
                            {msg.senderRole && msg.senderRole !== 'client' && (
                              <span className="font-mono text-[7px] px-1 py-0.5 rounded bg-titan-purple/10 text-titan-purple/50 border border-titan-purple/15">{msg.senderRole}</span>
                            )}
                          </div>
                        )}

                        {msg.forwardedFrom && (
                          <div className="flex items-center gap-1 mb-1 ml-1">
                            <Forward className="w-2.5 h-2.5 text-white/20" />
                            <span className="font-mono text-[8px] text-white/20">Forwarded from #{msg.forwardedFrom.channelName}</span>
                          </div>
                        )}

                        {msg.replyTo && (
                          <div className="mb-1 ml-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border-l-2 border-titan-cyan/30">
                            <Reply className="w-2.5 h-2.5 text-titan-cyan/40" />
                            <span className="font-mono text-[8px] text-titan-cyan/40">{msg.replyTo.senderName}:</span>
                            <span className="font-mono text-[8px] text-white/20 truncate">{msg.replyTo.text}</span>
                          </div>
                        )}

                        <button
                          onClick={() => setContextMenuMsg(isCtx ? null : msg.id)}
                          onDoubleClick={() => handleReaction(msg.id, '❤️')}
                          className={`rounded-2xl overflow-hidden text-left w-full transition-all ${isClient ? 'bg-gradient-to-br from-titan-cyan/15 to-titan-cyan/8 border border-titan-cyan/20 rounded-tr-md' : 'glass-card rounded-tl-md'} ${msg.isPinned ? 'ring-1 ring-titan-yellow/20' : ''} ${isCtx ? 'ring-1 ring-white/20' : ''}`}
                        >
                          {msg.isPinned && (
                            <div className="flex items-center gap-1 px-3 pt-1.5">
                              <Pin className="w-2.5 h-2.5 text-titan-yellow/50" />
                              <span className="font-mono text-[7px] text-titan-yellow/40">Pinned</span>
                            </div>
                          )}

                          {msg.type === 'voice' && msg.voiceUrl && (
                            <div className="px-3 pt-2">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                                <Mic className="w-4 h-4 text-titan-cyan/60" />
                                <audio controls src={msg.voiceUrl} className="h-8 flex-1" style={{ maxWidth: '200px' }} />
                                {msg.voiceDuration && <span className="font-mono text-[9px] text-white/30">{Math.round(msg.voiceDuration)}s</span>}
                              </div>
                            </div>
                          )}

                          {msg.type === 'image' && msg.imageUrl && (
                            <img src={msg.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-t-2xl" />
                          )}

                          {msg.files && msg.files.length > 0 && (
                            <div className="px-3 pt-2 space-y-1.5">
                              {msg.files.map((file) => (
                                <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors" onClick={(e) => e.stopPropagation()}>
                                  {(file.type === 'image' || file.type.startsWith('image')) ? <Image className="w-4 h-4 text-titan-cyan/60 shrink-0" /> :
                                   (file.type === 'video' || file.type.startsWith('video')) ? <Video className="w-4 h-4 text-titan-purple/60 shrink-0" /> :
                                   <FileText className="w-4 h-4 text-titan-purple/60 shrink-0" />}
                                  <span className="font-mono text-[10px] text-white/50 truncate flex-1">{file.name}</span>
                                  {file.size && <span className="font-mono text-[8px] text-white/20 shrink-0">{file.size}</span>}
                                  <Download className="w-3 h-3 text-white/20 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}

                          {msg.text && !(msg.type === 'file' && msg.text.startsWith('📎')) && !(msg.type === 'voice' && msg.text.startsWith('🎤')) && (
                            <p className="px-3 py-2 font-mono text-xs text-white/80 leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          )}

                          <div className={`flex items-center gap-1.5 px-3 pb-1.5 ${isClient ? 'justify-end' : 'justify-start'}`}>
                            <span className="font-mono text-[8px] text-white/20">{msg.timestamp}</span>
                            {msg.isEdited && <span className="font-mono text-[7px] text-white/15 italic">edited</span>}
                            {isClient && <StatusIcon status={msg.status} />}
                          </div>
                        </button>

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-1">
                            {msg.reactions.map((r) => (
                              <button key={r.emoji} onClick={() => handleReaction(msg.id, r.emoji)} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${r.users.includes(user?.id || '') ? 'bg-titan-cyan/15 border-titan-cyan/25' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'}`}>
                                <span>{r.emoji}</span>
                                <span className="font-mono text-[8px] text-white/40">{r.count}</span>
                              </button>
                            ))}
                            <button onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : msg.id)} className="w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06]">
                              <Plus className="w-2.5 h-2.5 text-white/20" />
                            </button>
                          </div>
                        )}

                        {/* Context Menu */}
                        <AnimatePresence>
                          {isCtx && (
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }} className={`absolute z-40 min-w-[180px] p-1.5 rounded-xl glass-card shadow-2xl border border-white/[0.1] ${isClient ? 'right-0' : 'left-0'} -bottom-2 translate-y-full`}>
                              <div className="flex items-center gap-0.5 px-1 pb-1.5 border-b border-white/[0.06] mb-1">
                                {emojiQuick.map((emoji) => (
                                  <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] active:scale-90 transition-all text-sm">{emoji}</button>
                                ))}
                              </div>
                              <button onClick={() => handleReply(msg)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                                <Reply className="w-3.5 h-3.5 text-white/40" /><span className="font-mono text-[10px] text-white/50">Reply</span>
                              </button>
                              <button onClick={() => handleCopyMessage(msg)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                                <Copy className="w-3.5 h-3.5 text-white/40" /><span className="font-mono text-[10px] text-white/50">Copy text</span>
                              </button>
                              <button onClick={() => handlePinMessage(msg)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                                {msg.isPinned ? <PinOff className="w-3.5 h-3.5 text-titan-yellow/50" /> : <Pin className="w-3.5 h-3.5 text-white/40" />}
                                <span className="font-mono text-[10px] text-white/50">{msg.isPinned ? 'Unpin' : 'Pin'}</span>
                              </button>
                              {isClient && (
                                <>
                                  <div className="h-px bg-white/[0.06] my-1" />
                                  <button onClick={() => startEditMessage(msg)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                                    <Edit3 className="w-3.5 h-3.5 text-white/40" /><span className="font-mono text-[10px] text-white/50">Edit</span>
                                  </button>
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-3.5 h-3.5 text-red-400/60" /><span className="font-mono text-[10px] text-red-400/60">Delete</span>
                                  </button>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Quick emoji picker */}
                        <AnimatePresence>
                          {selectedMessage === msg.id && !isCtx && (
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }} className={`absolute z-30 flex items-center gap-0.5 p-1 rounded-xl glass-card shadow-xl ${isClient ? 'right-0' : 'left-0'} -bottom-9`}>
                              {emojiQuick.map((emoji) => (
                                <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] active:scale-90 transition-all text-sm">{emoji}</button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {typingUsers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 ml-9 mt-2">
            <div className="px-3 py-2 rounded-2xl glass-card">
              <div className="flex items-center gap-1.5">
                <TypingDots />
                <span className="font-mono text-[10px] text-white/30">{typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.length} people typing...`}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={scrollToBottom} className="absolute bottom-28 right-4 w-9 h-9 rounded-full bg-titan-cyan/20 border border-titan-cyan/30 flex items-center justify-center shadow-lg z-20">
            <ChevronDown className="w-4 h-4 text-titan-cyan" />
          </motion.button>
        )}
      </AnimatePresence>

      {contextMenuMsg && <div className="fixed inset-0 z-30" onClick={() => setContextMenuMsg(null)} />}

      {/* Edit Bar */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 border-t border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 py-2">
              <div className="w-0.5 h-10 rounded-full bg-titan-cyan" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] text-titan-cyan flex items-center gap-1"><Edit3 className="w-2.5 h-2.5" /> Editing message</p>
                <input ref={editInputRef} value={editText} onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMessage(); } if (e.key === 'Escape') { setEditingMessage(null); setEditText(''); } }}
                  className="w-full bg-transparent font-mono text-xs text-white focus:outline-none" />
              </div>
              <button onClick={handleEditMessage} className="shrink-0 w-7 h-7 rounded-full bg-titan-cyan/20 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-titan-cyan" /></button>
              <button onClick={() => { setEditingMessage(null); setEditText(''); }} className="shrink-0"><X className="w-4 h-4 text-white/30" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Bar */}
      <AnimatePresence>
        {replyTo && !editingMessage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 border-t border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 py-2">
              <div className="w-0.5 h-8 rounded-full bg-titan-cyan" />
              <Reply className="w-3 h-3 text-titan-cyan/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] text-titan-cyan">{replyTo.senderName}</p>
                <p className="font-mono text-[10px] text-white/30 truncate">{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="shrink-0"><X className="w-4 h-4 text-white/30" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 border-t border-white/[0.06] overflow-hidden">
            <div className="py-2">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-3 h-3 text-titan-cyan animate-spin" />
                <span className="font-mono text-[10px] text-white/40">Uploading... {uploadProgress}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-titan-cyan" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 220, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.06] overflow-hidden">
            <div className="h-full overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-white/30">Emoji</span>
                <button onClick={() => setShowEmoji(false)}><X className="w-3.5 h-3.5 text-white/20" /></button>
              </div>
              <div className="flex flex-wrap gap-1">
                {emojiAll.map((emoji) => (
                  <button key={emoji} onClick={() => { setMessage((p) => p + emoji); inputRef.current?.focus(); }} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] active:scale-90 transition-all text-lg">{emoji}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recorder */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.06] overflow-hidden">
            <div className="p-3">
              <VoiceRecorder onSendVoice={(blob) => handleVoiceSend(blob)} onCancel={() => setShowVoiceRecorder(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      {!editingMessage && (
        <div className="px-3 py-2 border-t border-white/[0.06] bg-titan-bg/95 backdrop-blur-xl">
          <div className="flex items-center gap-1.5">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0" title="Attach file">
              {uploading ? <Loader2 className="w-4 h-4 text-titan-cyan/40 animate-spin" /> : <Paperclip className="w-4 h-4 text-white/30" />}
            </button>
            <button onClick={() => { setShowEmoji(!showEmoji); setShowVoiceRecorder(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0 ${showEmoji ? 'bg-white/[0.06]' : ''}`} title="Emoji">
              <Smile className={`w-4 h-4 ${showEmoji ? 'text-titan-cyan' : 'text-white/30'}`} />
            </button>
            <div className="flex-1 relative">
              <input ref={inputRef} value={message}
                onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={replyTo ? 'Type a reply...' : 'Type a message...'}
                className="w-full px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30 transition-colors"
              />
            </div>
            {message.trim() ? (
              <button onClick={handleSend} disabled={sending} className="w-9 h-9 rounded-full bg-gradient-to-r from-titan-cyan/30 to-titan-cyan/20 border border-titan-cyan/30 flex items-center justify-center active:scale-90 transition-transform shrink-0">
                {sending ? <Loader2 className="w-4 h-4 text-titan-cyan animate-spin" /> : <Send className="w-4 h-4 text-titan-cyan" />}
              </button>
            ) : (
              <button onClick={() => { setShowVoiceRecorder(!showVoiceRecorder); setShowEmoji(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0 ${showVoiceRecorder ? 'bg-red-500/10' : ''}`} title="Voice message">
                <Mic className={`w-4 h-4 ${showVoiceRecorder ? 'text-red-400' : 'text-white/30'}`} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
