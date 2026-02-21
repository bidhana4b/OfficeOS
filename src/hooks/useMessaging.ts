import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
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
  return { data, loading, error, refetch: fetchData };
}
