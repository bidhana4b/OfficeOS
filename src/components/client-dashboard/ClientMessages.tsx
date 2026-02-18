import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { sendMessage as sendMessageToDb, subscribeToMessages } from '@/lib/data-service';
import {
  MessageCircle,
  Send,
  Paperclip,
  Image,
  Mic,
  ChevronLeft,
  Check,
  CheckCheck,
  Clock,
  Smile,
  Tag,
  Loader2,
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'client' | 'agency';
  senderName: string;
  senderAvatar: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file' | 'deliverable';
  deliverableTag?: string;
  imageUrl?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isTyping: boolean;
}

const fallbackChannels: ChatChannel[] = [
  {
    id: '1',
    name: 'Creative Team',
    avatar: '🎨',
    lastMessage: 'Customer frame design is ready for review!',
    timestamp: '2m ago',
    unread: 2,
    isTyping: false,
  },
  {
    id: '2',
    name: 'Rafiq Ahmed (AM)',
    avatar: '👤',
    lastMessage: 'I\'ll send the monthly report by EOD',
    timestamp: '15m ago',
    unread: 0,
    isTyping: true,
  },
  {
    id: '3',
    name: 'Video Production',
    avatar: '🎬',
    lastMessage: 'Review video uploaded — check & approve',
    timestamp: '1h ago',
    unread: 1,
    isTyping: false,
  },
  {
    id: '4',
    name: 'Media Buying',
    avatar: '📢',
    lastMessage: 'Campaign performance report attached',
    timestamp: '3h ago',
    unread: 0,
    isTyping: false,
  },
];

const fallbackMessages: Message[] = [
  {
    id: '1',
    text: 'Hi! The New Year sale banner design is complete.',
    sender: 'agency',
    senderName: 'Arif Hassan',
    senderAvatar: 'AH',
    timestamp: '10:30 AM',
    status: 'read',
    type: 'text',
  },
  {
    id: '2',
    text: '',
    sender: 'agency',
    senderName: 'Arif Hassan',
    senderAvatar: 'AH',
    timestamp: '10:31 AM',
    status: 'read',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=70',
  },
  {
    id: '3',
    text: 'Customer Frame Design ready for approval',
    sender: 'agency',
    senderName: 'Arif Hassan',
    senderAvatar: 'AH',
    timestamp: '10:32 AM',
    status: 'read',
    type: 'deliverable',
    deliverableTag: 'Customer Frame · Design #45',
  },
  {
    id: '4',
    text: 'This looks amazing! 🔥 Love the color scheme.',
    sender: 'client',
    senderName: 'You',
    senderAvatar: 'IM',
    timestamp: '10:45 AM',
    status: 'read',
    type: 'text',
  },
  {
    id: '5',
    text: 'Can we add the new tagline at the bottom? "Ride the Legacy"',
    sender: 'client',
    senderName: 'You',
    senderAvatar: 'IM',
    timestamp: '10:46 AM',
    status: 'delivered',
    type: 'text',
  },
  {
    id: '6',
    text: 'Sure! I\'ll update it and send the revised version shortly. Should take about 30 mins.',
    sender: 'agency',
    senderName: 'Arif Hassan',
    senderAvatar: 'AH',
    timestamp: '10:50 AM',
    status: 'read',
    type: 'text',
  },
];

// Map channel type to emoji
const channelEmoji: Record<string, string> = {
  general: '💬',
  deliverables: '📦',
  'boost-requests': '🚀',
  billing: '💳',
  internal: '🔒',
  custom: '🏷️',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-titan-cyan" />;
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-white/30" />;
  return <Check className="w-3 h-3 text-white/20" />;
}

export default function ClientMessages() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>(fallbackChannels);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [activeChannelDbId, setActiveChannelDbId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(fallbackMessages);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch workspace channels for this client
  const fetchChannels = useCallback(async () => {
    try {
      const clientId = user?.client_id;
      if (!clientId) { setLoading(false); return; }

      // Find workspace for this client
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id, channels(*)')
        .eq('client_id', clientId)
        .single();

      if (workspace) {
        const chs = (workspace.channels as Record<string, unknown>[]) || [];
        if (chs.length > 0) {
          const mapped: ChatChannel[] = chs
            .filter((ch) => !(ch.is_hidden as boolean))
            .map((ch) => {
              const lastMsgTime = ch.last_message_time ? new Date(ch.last_message_time as string) : null;
              let timeAgo = '';
              if (lastMsgTime) {
                const diffMs = Date.now() - lastMsgTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                else {
                  const hrs = Math.floor(diffMins / 60);
                  timeAgo = hrs >= 24 ? `${Math.floor(hrs / 24)}d ago` : `${hrs}h ago`;
                }
              }
              return {
                id: ch.id as string,
                name: (ch.name as string) || 'General',
                avatar: channelEmoji[(ch.type as string) || 'general'] || '💬',
                lastMessage: (ch.last_message as string) || '',
                timestamp: timeAgo,
                unread: (ch.unread_count as number) || 0,
                isTyping: false,
              };
            });
          setChannels(mapped);
        }
      }
    } catch (e) {
      console.error('Failed to fetch channels:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Fetch messages when a channel is selected
  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const { data: result, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (err) throw err;

      if (result && result.length > 0) {
        const mapped: Message[] = result.map((r: Record<string, unknown>) => {
          const isClient = (r.sender_role as string) === 'client' || (r.sender_id as string) === user?.id;
          return {
            id: r.id as string,
            text: r.content as string,
            sender: isClient ? 'client' : 'agency',
            senderName: isClient ? 'You' : (r.sender_name as string) || 'Team',
            senderAvatar: (r.sender_avatar as string) || ((r.sender_name as string) || 'T').substring(0, 2).toUpperCase(),
            timestamp: new Date(r.created_at as string).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
            }),
            status: (r.status as Message['status']) || 'sent',
            type: (r.is_system_message as boolean) ? 'deliverable' : 'text',
            deliverableTag: (r.is_system_message as boolean) ? (r.content as string).substring(0, 30) : undefined,
          };
        });
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  }, [user?.id]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!activeChannelDbId) return;

    const unsubscribe = subscribeToMessages(activeChannelDbId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new;
        const isClient = (newMsg.sender_role as string) === 'client' || (newMsg.sender_id as string) === user?.id;
        const mapped: Message = {
          id: newMsg.id as string,
          text: newMsg.content as string,
          sender: isClient ? 'client' : 'agency',
          senderName: isClient ? 'You' : (newMsg.sender_name as string) || 'Team',
          senderAvatar: (newMsg.sender_avatar as string) || 'T',
          timestamp: new Date(newMsg.created_at as string).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
          }),
          status: (newMsg.status as Message['status']) || 'sent',
          type: 'text',
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
      }
    });

    return unsubscribe;
  }, [activeChannelDbId, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

  const handleSelectChannel = useCallback((channel: ChatChannel) => {
    setActiveChannel(channel);
    setActiveChannelDbId(channel.id);
    fetchMessages(channel.id);
  }, [fetchMessages]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !activeChannelDbId) return;

    const optimisticId = `msg-${Date.now()}`;
    const newMsg: Message = {
      id: optimisticId,
      text: message,
      sender: 'client',
      senderName: 'You',
      senderAvatar: user?.display_name?.split(' ').map(n => n[0]).join('') || 'U',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessage('');

    try {
      const result = await sendMessageToDb({
        channel_id: activeChannelDbId,
        sender_id: user?.id || 'client',
        sender_name: user?.display_name || 'Client',
        sender_avatar: user?.avatar || user?.display_name?.split(' ').map(n => n[0]).join('') || 'C',
        sender_role: 'client',
        content: message,
      });

      // Replace optimistic with real
      setMessages((prev) => prev.map((m) =>
        m.id === optimisticId ? { ...m, id: result.id, status: 'delivered' as const } : m
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.map((m) =>
        m.id === optimisticId ? { ...m, status: 'sent' as const } : m
      ));
    }
  }, [message, activeChannelDbId, user]);

  // Channel List View
  if (!activeChannel) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-titan-cyan" />
            Messages
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">
            {channels.filter((c) => c.unread > 0).length} unread conversations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
          {channels.map((channel, i) => (
            <motion.button
              key={channel.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelectChannel(channel)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] active:scale-[0.98] transition-all mb-1"
            >
              <div className="w-11 h-11 rounded-full glass-card flex items-center justify-center text-lg shrink-0">
                {channel.avatar}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-sm text-white">{channel.name}</span>
                  <span className="font-mono text-[9px] text-white/25 shrink-0">{channel.timestamp}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-mono text-[11px] text-white/40 truncate flex-1">
                    {channel.isTyping ? (
                      <span className="text-titan-cyan italic">typing...</span>
                    ) : (
                      channel.lastMessage
                    )}
                  </p>
                  {channel.unread > 0 && (
                    <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-titan-cyan text-titan-bg text-[9px] font-mono font-bold flex items-center justify-center px-1 shrink-0">
                      {channel.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="px-3 py-2.5 flex items-center gap-3 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveChannel(null)}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white/50" />
        </button>
        <div className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-base">
          {activeChannel.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-white truncate">{activeChannel.name}</p>
          {activeChannel.isTyping ? (
            <p className="font-mono text-[10px] text-titan-cyan">typing...</p>
          ) : (
            <p className="font-mono text-[10px] text-white/30">Online</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-3">
        {messages.map((msg) => {
          const isClient = msg.sender === 'client';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isClient ? 'order-2' : ''}`}>
                {!isClient && (
                  <p className="font-mono text-[9px] text-white/30 mb-1 ml-1">{msg.senderName}</p>
                )}
                <div
                  className={`rounded-2xl overflow-hidden ${
                    isClient
                      ? 'bg-titan-cyan/15 border border-titan-cyan/20 rounded-tr-md'
                      : 'glass-card rounded-tl-md'
                  }`}
                >
                  {msg.type === 'image' && msg.imageUrl && (
                    <img src={msg.imageUrl} alt="" className="w-full h-40 object-cover" />
                  )}
                  {msg.type === 'deliverable' && (
                    <div className="px-3 pt-2 pb-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-titan-purple/15 border border-titan-purple/20 mb-1">
                        <Tag className="w-3 h-3 text-titan-purple" />
                        <span className="font-mono text-[9px] text-titan-purple">{msg.deliverableTag}</span>
                      </div>
                    </div>
                  )}
                  {msg.text && (
                    <p className="px-3 py-2 font-mono text-xs text-white/80 leading-relaxed">{msg.text}</p>
                  )}
                  <div className={`flex items-center gap-1 px-3 pb-1.5 ${isClient ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-mono text-[8px] text-white/20">{msg.timestamp}</span>
                    {isClient && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0">
            <Paperclip className="w-4.5 h-4.5 text-white/30" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0">
            <Image className="w-4.5 h-4.5 text-white/30" />
          </button>
          <div className="flex-1 relative">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="w-full px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30 pr-10"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <Smile className="w-4 h-4 text-white/20" />
            </button>
          </div>
          {message.trim() ? (
            <button
              onClick={handleSend}
              className="w-9 h-9 rounded-full bg-titan-cyan/20 border border-titan-cyan/30 flex items-center justify-center active:scale-90 transition-transform shrink-0"
            >
              <Send className="w-4 h-4 text-titan-cyan" />
            </button>
          ) : (
            <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0">
              <Mic className="w-4.5 h-4.5 text-white/30" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
