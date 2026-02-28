import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  sendTypingIndicator,
  clearTypingIndicator,
  subscribeToTypingIndicators,
  markMessageAsReadV2,
  markChannelAsRead,
  subscribeToReadReceipts,
  validateChannelAccess,
} from '@/lib/data-service';
import type { Workspace, Channel, Message, MessageType } from '@/components/messaging/types';

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function useWorkspaces() {
  const [data, setData] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('workspaces')
        .select('*, channels(*), workspace_members(*)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('pinned', { ascending: false });

      if (err) throw err;

      const mapped: Workspace[] = (result || []).map((r: Record<string, unknown>) => {
        const channels = (r.channels as Record<string, unknown>[]) || [];
        const members = (r.workspace_members as Record<string, unknown>[]) || [];
        const rawTimestamp = r.last_message_time as string | null;
        const lastMsgTime = rawTimestamp ? new Date(rawTimestamp) : null;
        const now = new Date();

        let timeAgo = '';
        if (lastMsgTime && !isNaN(lastMsgTime.getTime())) {
          const diffMs = now.getTime() - lastMsgTime.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) {
            timeAgo = 'just now';
          } else if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
          } else {
            const hrs = Math.floor(diffMins / 60);
            timeAgo = hrs >= 24 ? `${Math.floor(hrs / 24)}d ago` : `${hrs}h ago`;
          }
        }

        // Sort channels by last_message_time (most recent first), then by type priority
        const channelTypePriority: Record<string, number> = {
          general: 0,
          deliverables: 1,
          'boost-requests': 2,
          billing: 3,
          internal: 4,
          custom: 5,
        };

        const mappedChannels = channels.map((ch) => ({
          id: ch.id as string,
          workspaceId: ch.workspace_id as string,
          name: ch.name as string,
          type: (ch.type as Channel['type']) || 'general',
          icon: (ch.icon as string) || 'hash',
          unreadCount: (ch.unread_count as number) || 0,
          isHidden: (ch.is_hidden as boolean) || false,
          lastMessage: ch.last_message as string | undefined,
          lastMessageTime: ch.last_message_time
            ? formatRelativeTime(ch.last_message_time as string)
            : undefined,
          lastMessageTimestamp: (ch.last_message_time as string) || undefined,
          description: (ch.description as string) || undefined,
          isPrivate: (ch.is_private as boolean) || false,
          isArchived: (ch.is_archived as boolean) || false,
        }));

        // Sort: channels with unread first, then by last message time, then by type priority
        mappedChannels.sort((a, b) => {
          // Unread channels first
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
          // Then by last message timestamp
          const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
          const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
          if (timeA !== timeB) return timeB - timeA;
          // Then by type priority
          return (channelTypePriority[a.type] ?? 99) - (channelTypePriority[b.type] ?? 99);
        });

        return {
          id: r.id as string,
          clientId: (r.client_id as string) || undefined,
          clientName: r.client_name as string,
          clientLogo: r.client_logo as string | undefined,
          lastMessage: (r.last_message as string) || '',
          lastMessageTime: timeAgo,
          lastMessageTimestamp: rawTimestamp || undefined,
          unreadCount: (r.unread_count as number) || 0,
          pinned: (r.pinned as boolean) || false,
          status: (r.status as Workspace['status']) || 'active',
          healthScore: (r.health_score as number) || 0,
          packageUsage: (r.package_usage as number) || 0,
          members: members.map((m) => ({
            id: (m.user_profile_id as string) || (m.id as string),
            name: (m.name as string) || '',
            avatar: (m.avatar as string) || '',
            role: (m.role as Workspace['members'][0]['role']) || 'client',
            status: (m.status as Workspace['members'][0]['status']) || 'offline',
          })),
          channels: mappedChannels,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription for workspace updates (new messages update last_message_time)
  useEffect(() => {
    const subscription = supabase
      .channel('workspaces-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspaces',
          filter: `tenant_id=eq.${DEMO_TENANT_ID}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useMessages(channelId?: string) {
  const [data, setData] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!channelId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('messages')
        .select('*, message_reactions(*), message_files(*)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (err) throw err;

      const mapped: Message[] = (result || []).map((r: Record<string, unknown>) => {
        const reactions = (r.message_reactions as Record<string, unknown>[]) || [];
        const files = (r.message_files as Record<string, unknown>[]) || [];

        return {
          id: r.id as string,
          channelId: r.channel_id as string,
          sender: {
            id: (r.sender_id as string) || '',
            name: (r.sender_name as string) || 'Unknown',
            avatar: (r.sender_avatar as string) || '',
            role: (r.sender_role as Message['sender']['role']) || 'admin',
            status: 'online' as const,
          },
          content: (r.content as string) || '',
          timestamp: new Date(r.created_at as string).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          status: (r.status as Message['status']) || 'sent',
          reactions: reactions.map((rx) => ({
            emoji: rx.emoji as string,
            users: (rx.user_ids as string[]) || [],
            count: (rx.count as number) || 0,
          })),
          files: files.map((f) => ({
            id: f.id as string,
            name: (f.name as string) || (f.file_name as string) || 'file',
            type: (f.type as Message['files'][0]['type']) || 'document',
            url: (f.url as string) || (f.file_url as string) || '',
            size: (f.size as string) || '',
            thumbnail: (f.thumbnail as string) || (f.thumbnail_url as string) || undefined,
          })),
          replyTo: r.reply_to_id ? {
            id: r.reply_to_id as string,
            senderName: (r.reply_to_sender as string) || '',
            content: (r.reply_to_content as string) || '',
          } : undefined,
          isSystemMessage: (r.is_system_message as boolean) || false,
          deliverableTag: r.deliverable_tag as Message['deliverableTag'],
          boostTag: r.boost_tag as Message['boostTag'],
          isPinned: (r.is_pinned as boolean) || false,
          isEdited: (r.is_edited as boolean) || false,
          isDeleted: (r.is_deleted as boolean) || false,
          deletedForEveryone: (r.deleted_for_everyone as boolean) || false,
          threadCount: (r.thread_count as number) || 0,
          messageType: (r.message_type as MessageType) || 'text',
          voiceUrl: r.voice_url as string | undefined,
          voiceDuration: r.voice_duration as number | undefined,
          forwardedFrom: r.forwarded_from_channel ? {
            id: (r.forwarded_from_id as string) || '',
            channelName: r.forwarded_from_channel as string,
          } : undefined,
          isSaved: false,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading messages');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!channelId) return;

    const messageSubscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('✅ New message received (realtime):', payload.new);
          // Refetch to get complete data with joins
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('✅ Message updated (realtime):', payload.new);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [channelId, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// TYPING INDICATORS HOOK (Realtime)
// ============================================

export function useTypingIndicators(channelId?: string, currentUserId?: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [typingUserNames, setTypingUserNames] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to typing indicator changes
  useEffect(() => {
    if (!channelId) {
      setTypingUsers([]);
      setTypingUserNames([]);
      return;
    }

    const subscription = subscribeToTypingIndicators(channelId, (userIds) => {
      // Filter out current user
      const otherUsers = currentUserId
        ? userIds.filter(id => id !== currentUserId)
        : userIds;
      setTypingUsers(otherUsers);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, currentUserId]);

  // Resolve user names from typing user IDs
  useEffect(() => {
    if (typingUsers.length === 0) {
      setTypingUserNames([]);
      return;
    }

    const fetchNames = async () => {
      try {
        const { data } = await supabase
          .from('workspace_members')
          .select('user_profile_id, name')
          .in('user_profile_id', typingUsers);

        if (data) {
          const nameMap = new Map(data.map(d => [d.user_profile_id, d.name]));
          setTypingUserNames(typingUsers.map(id => nameMap.get(id) || 'Someone'));
        }
      } catch {
        setTypingUserNames(typingUsers.map(() => 'Someone'));
      }
    };

    fetchNames();
  }, [typingUsers]);

  // Send typing indicator
  const startTyping = useCallback((workspaceId: string) => {
    if (!channelId || !currentUserId) return;

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingIndicator(channelId, currentUserId, workspaceId).catch(console.warn);

    // Auto-clear after 5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingIndicator(channelId, currentUserId).catch(console.warn);
    }, 5000);
  }, [channelId, currentUserId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!channelId || !currentUserId) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    clearTypingIndicator(channelId, currentUserId).catch(console.warn);
  }, [channelId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { typingUsers, typingUserNames, startTyping, stopTyping };
}

// ============================================
// READ RECEIPTS HOOK (Realtime)
// ============================================

export interface ReadReceiptInfo {
  messageId: string;
  readers: Array<{ userId: string; readAt: string }>;
}

export function useReadReceipts(channelId?: string, currentUserId?: string) {
  const [receipts, setReceipts] = useState<Map<string, Array<{ userId: string; readAt: string }>>>(new Map());

  // Mark channel as read when entering
  useEffect(() => {
    if (!channelId || !currentUserId) return;

    markChannelAsRead(channelId, currentUserId).catch(console.warn);
  }, [channelId, currentUserId]);

  // Subscribe to new read receipts
  useEffect(() => {
    if (!channelId) return;

    const unsubscribe = subscribeToReadReceipts(channelId, (receipt) => {
      if (receipt.reader_profile_id === currentUserId) return;

      setReceipts(prev => {
        const next = new Map(prev);
        const existing = next.get(receipt.message_id) || [];
        if (!existing.some(r => r.userId === receipt.reader_profile_id)) {
          next.set(receipt.message_id, [
            ...existing,
            { userId: receipt.reader_profile_id, readAt: receipt.read_at },
          ]);
        }
        return next;
      });
    });

    return unsubscribe;
  }, [channelId, currentUserId]);

  // Mark a specific message as read
  const markAsRead = useCallback((messageId: string) => {
    if (!channelId || !currentUserId) return;
    markMessageAsReadV2(messageId, currentUserId, channelId).catch(console.warn);
  }, [channelId, currentUserId]);

  // Get reader count for a message
  const getReaderCount = useCallback((messageId: string) => {
    return receipts.get(messageId)?.length || 0;
  }, [receipts]);

  return { receipts, markAsRead, getReaderCount };
}

// ============================================
// CHANNEL ACCESS CHECK HOOK
// ============================================

export function useChannelAccess(channelId?: string, userProfileId?: string) {
  const [hasAccess, setHasAccess] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channelId || !userProfileId) {
      setHasAccess(true);
      return;
    }

    const check = async () => {
      setLoading(true);
      try {
        const result = await validateChannelAccess(channelId, userProfileId);
        setHasAccess(result);
      } catch {
        setHasAccess(true); // graceful fallback
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [channelId, userProfileId]);

  return { hasAccess, loading };
}

// ============================================
// REALTIME CONNECTION STATUS HOOK
// ============================================

export type RealtimeConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export function useRealtimeConnection() {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);

  useEffect(() => {
    // Create a test channel to monitor connection status
    const testChannel = supabase.channel('connection-monitor');

    testChannel
      .on('system', {}, (payload) => {
        console.log('📡 Realtime status:', payload);
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        switch (status) {
          case 'SUBSCRIBED':
            setStatus('connected');
            setLastConnectedAt(new Date());
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setStatus('error');
            break;
          case 'CLOSED':
            setStatus('disconnected');
            break;
          default:
            setStatus('connecting');
        }
      });

    return () => {
      testChannel.unsubscribe();
    };
  }, []);

  return { status, lastConnectedAt };
}

// ============================================
// CHANNEL MEMBERS REALTIME HOOK
// ============================================

export interface ChannelMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'online' | 'offline' | 'away';
}

export function useChannelMembers(channelId?: string) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          user_id,
          role,
          user_profiles:user_id (
            full_name,
            avatar_url,
            status
          )
        `)
        .eq('channel_id', channelId);

      if (error) throw error;

      const mapped = (data || []).map((m: Record<string, unknown>) => {
        const profile = m.user_profiles as Record<string, unknown> | null;
        return {
          id: m.user_id as string,
          name: (profile?.full_name as string) || 'Unknown User',
          avatar: (profile?.avatar_url as string) || '',
          role: (m.role as string) || 'member',
          status: ((profile?.status as string) || 'offline') as 'online' | 'offline' | 'away',
        };
      });

      setMembers(mapped);
    } catch (error) {
      console.error('Error fetching channel members:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Real-time subscription for member changes
  useEffect(() => {
    if (!channelId) return;

    const subscription = supabase
      .channel(`channel-members:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_members',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          console.log('✅ Channel members updated (realtime)');
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}
