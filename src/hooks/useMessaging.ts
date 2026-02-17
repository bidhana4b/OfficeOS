import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { Workspace, Channel, Message } from '@/components/messaging/types';

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
        const lastMsgTime = r.last_message_time ? new Date(r.last_message_time as string) : new Date();
        const now = new Date();
        const diffMs = now.getTime() - lastMsgTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeAgo = `${diffMins}m ago`;
        if (diffMins >= 60) {
          const hrs = Math.floor(diffMins / 60);
          timeAgo = hrs >= 24 ? `${Math.floor(hrs / 24)}d ago` : `${hrs}h ago`;
        }

        return {
          id: r.id as string,
          clientName: r.client_name as string,
          clientLogo: r.client_logo as string | undefined,
          lastMessage: (r.last_message as string) || '',
          lastMessageTime: timeAgo,
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
          channels: channels.map((ch) => ({
            id: ch.id as string,
            workspaceId: ch.workspace_id as string,
            name: ch.name as string,
            type: (ch.type as Channel['type']) || 'general',
            icon: (ch.icon as string) || 'hash',
            unreadCount: (ch.unread_count as number) || 0,
            isHidden: (ch.is_hidden as boolean) || false,
            lastMessage: ch.last_message as string | undefined,
            lastMessageTime: ch.last_message_time as string | undefined,
          })),
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
          content: r.content as string,
          timestamp: r.created_at as string,
          status: (r.status as Message['status']) || 'sent',
          reactions: reactions.map((rx) => ({
            emoji: rx.emoji as string,
            users: (rx.user_ids as string[]) || [],
            count: (rx.count as number) || 0,
          })),
          files: files.map((f) => ({
            id: f.id as string,
            name: f.name as string,
            type: (f.type as Message['files'][0]['type']) || 'document',
            url: (f.url as string) || '',
            size: (f.size as string) || '',
            thumbnail: f.thumbnail as string | undefined,
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
          threadCount: (r.thread_count as number) || 0,
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
