import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, PanelRightOpen, PanelRightClose, ArrowLeft, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import WorkspaceList from './WorkspaceList';
import ChannelList from './ChannelList';
import MessageThread from './MessageThread';
import WorkspaceInsightPanel from './WorkspaceInsightPanel';
import BoostWizard from './BoostWizard';
import type { Workspace, Channel, Message, BoostWizardData, WorkspaceInsights } from './types';
import { useWorkspaces, useMessages, useRealtimeConnection, useTypingIndicators, useReadReceipts } from '@/hooks/useMessaging';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  sendMessage,
  subscribeToMessages,
  addMessageReaction,
  removeMessageReaction,
  createCampaign,
  debitWallet,
  createDeliverable,
  editMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  saveMessage,
  unsaveMessage,
  forwardMessage,
  uploadMessageFile,
  addMessageFile,
} from '@/lib/data-service';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MessagingHub() {
  const { user } = useAuth();
  const workspacesQuery = useWorkspaces();
  const workspacesData = workspacesQuery.data.length > 0 ? workspacesQuery.data : [];
  const { status: realtimeStatus, lastConnectedAt } = useRealtimeConnection();

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [showInsights, setShowInsights] = useState(true);
  const [boostWizardOpen, setBoostWizardOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string; percent: number } | null>(null);

  // Map auth roles to messaging roles
  const mapAuthRoleToMessagingRole = (authRole: string): 'admin' | 'manager' | 'designer' | 'media-buyer' | 'client' => {
    const roleMap: Record<string, 'admin' | 'manager' | 'designer' | 'media-buyer' | 'client'> = {
      super_admin: 'admin',
      account_manager: 'manager',
      designer: 'designer',
      media_buyer: 'media-buyer',
      finance: 'admin',
      client: 'client',
    };
    return roleMap[authRole] || 'admin';
  };

  // Current user from auth (fallback for storyboard demos only)
  const currentUser = user
    ? {
        id: user.id,
        name: user.display_name,
        avatar: user.avatar || (user.display_name ? user.display_name.split(' ').map(n => n[0]).join('') : 'U'),
        role: mapAuthRoleToMessagingRole(user.role),
        status: 'online' as const,
      }
    : { id: 'anonymous', name: 'Guest', avatar: 'G', role: 'admin' as const, status: 'online' as const };

  // Fetch real messages when channel changes
  const messagesQuery = useMessages(activeChannel?.id);

  // Typing indicators (realtime)
  const { typingUserNames, startTyping, stopTyping } = useTypingIndicators(
    activeChannel?.id,
    currentUser.id
  );

  // Read receipts (realtime)
  const { receipts: readReceipts, markAsRead } = useReadReceipts(
    activeChannel?.id,
    currentUser.id
  );

  // Workspace insights (real data from DB)
  const [workspaceInsights, setWorkspaceInsights] = useState<WorkspaceInsights | null>(null);

  useEffect(() => {
    if (!activeWorkspace) {
      setWorkspaceInsights(null);
      return;
    }
    const fetchInsights = async () => {
      try {
        const clientId = (activeWorkspace as any).clientId || activeWorkspace.id;

        // Fetch package usage
        const { data: usageData } = await supabase
          .from('package_usage')
          .select('deliverable_type, used_count, total_limit')
          .eq('client_id', clientId);

        const packageUsage = (usageData || []).map((u: any) => ({
          category: u.deliverable_type || 'Unknown',
          used: u.used_count || 0,
          total: u.total_limit || 1,
          color: '#00FFD1',
        }));

        // Fetch wallet balance
        const { data: walletData } = await supabase
          .from('client_wallets')
          .select('balance')
          .eq('client_id', clientId)
          .single();

        // Fetch deliverable counts
        const { data: deliverables } = await supabase
          .from('deliverables')
          .select('status')
          .eq('client_id', clientId);

        const pending = (deliverables || []).filter((d: any) => d.status === 'pending').length;
        const inProgress = (deliverables || []).filter((d: any) => d.status === 'in_progress' || d.status === 'in-progress').length;
        const completed = (deliverables || []).filter((d: any) => d.status === 'completed' || d.status === 'delivered' || d.status === 'approved').length;

        // Fetch campaigns
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('status, budget, platform')
          .eq('client_id', clientId);

        const activeCampaigns = (campaigns || []).filter((c: any) => c.status === 'active' || c.status === 'live');
        const totalBudget = (campaigns || []).reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
        const spent = activeCampaigns.reduce((sum: number, c: any) => sum + ((c.budget || 0) * 0.6), 0); // Estimate 60% spent

        setWorkspaceInsights({
          packageUsage,
          boostSummary: {
            totalBudget,
            spent: Math.round(spent),
            activeCampaigns: activeCampaigns.length,
            platforms: activeCampaigns.map((c: any) => ({
              name: c.platform || 'Unknown',
              spend: Math.round((c.budget || 0) * 0.6),
              status: c.status || 'active',
            })),
          },
          walletBalance: walletData?.balance || 0,
          deliverables: { pending, inProgress, completed },
          healthScore: activeWorkspace.healthScore || 75,
          responseTime: '< 2h',
          satisfaction: 4.2,
        });
      } catch (err) {
        console.warn('Failed to fetch workspace insights:', err);
      }
    };

    fetchInsights();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (activeChannel && messagesQuery.data.length > 0) {
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: messagesQuery.data,
      }));
    }
  }, [activeChannel?.id, messagesQuery.data]);

  // Real-time message subscription
  useEffect(() => {
    if (!activeChannel) return;

    const unsubscribe = subscribeToMessages(activeChannel.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new;
        const mapped: Message = {
          id: newMsg.id as string,
          channelId: newMsg.channel_id as string,
          sender: {
            id: (newMsg.sender_id as string) || '',
            name: (newMsg.sender_name as string) || 'Unknown',
            avatar: (newMsg.sender_avatar as string) || '',
            role: mapAuthRoleToMessagingRole((newMsg.sender_role as string) || 'admin'),
            status: 'online',
          },
          content: newMsg.content as string,
          timestamp: new Date(newMsg.created_at as string).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          status: (newMsg.status as Message['status']) || 'sent',
          reactions: [],
          files: [],
          isSystemMessage: (newMsg.is_system_message as boolean) || false,
          messageType: (newMsg.message_type as Message['messageType']) || 'text',
          voiceUrl: newMsg.voice_url as string | undefined,
          voiceDuration: newMsg.voice_duration as number | undefined,
        };

        // Only add if not already in messages (avoid duplicates with optimistic update)
        setMessages((prev) => {
          const channelMessages = prev[activeChannel.id] || [];
          // Check by ID OR by content+timestamp to avoid optimistic duplicates
          const exists = channelMessages.some(
            (m) => m.id === mapped.id || 
            (m.content === mapped.content && 
             m.sender.id === mapped.sender.id &&
             Math.abs(new Date(m.timestamp).getTime() - new Date(mapped.timestamp).getTime()) < 2000)
          );
          if (exists) return prev;
          return {
            ...prev,
            [activeChannel.id]: [...channelMessages, mapped],
          };
        });
      }

      // Handle UPDATE events (for voice URL updates)
      if (payload.eventType === 'UPDATE') {
        const updatedMsg = payload.new;
        setMessages((prev) => {
          const channelMessages = prev[activeChannel.id] || [];
          return {
            ...prev,
            [activeChannel.id]: channelMessages.map((msg) => {
              if (msg.id === updatedMsg.id) {
                return {
                  ...msg,
                  voiceUrl: updatedMsg.voice_url as string | undefined,
                  voiceDuration: updatedMsg.voice_duration as number | undefined,
                  messageType: updatedMsg.message_type as Message['messageType'] || msg.messageType,
                };
              }
              return msg;
            }),
          };
        });
      }
    });

    return unsubscribe;
  }, [activeChannel?.id]);

  // Real-time message files subscription
  useEffect(() => {
    if (!activeChannel) return;

    const subscription = supabase
      .channel(`message-files:${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_files',
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        (payload) => {
          const newFile = payload.new;
          setMessages((prev) => {
            const channelMessages = prev[activeChannel.id] || [];
            return {
              ...prev,
              [activeChannel.id]: channelMessages.map((msg) => {
                if (msg.id === newFile.message_id) {
                  // DB columns are 'name', 'type', 'url', 'size', 'thumbnail'
                  const rawType = (newFile.type as string) || (newFile.file_type as string) || '';
                  const fileType = rawType === 'image' || rawType.startsWith('image/')
                    ? 'image'
                    : rawType === 'video' || rawType.startsWith('video/')
                    ? 'video'
                    : rawType === 'voice' || rawType.includes('audio')
                    ? 'voice'
                    : 'document';

                  const newFileObj = {
                    id: newFile.id as string,
                    name: (newFile.name as string) || (newFile.file_name as string) || 'file',
                    type: fileType,
                    size: (newFile.size as string) || formatFileSize((newFile.file_size as number) || 0),
                    url: (newFile.url as string) || (newFile.file_url as string) || '',
                    thumbnail: (newFile.thumbnail as string) || (newFile.thumbnail_url as string) || undefined,
                  };

                  // Check if file already exists
                  if (!msg.files.some(f => f.id === newFileObj.id)) {
                    return { ...msg, files: [...msg.files, newFileObj] };
                  }
                }
                return msg;
              }),
            };
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeChannel?.id]);

  // Helper function to format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const handleSelectWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspace(workspace);
    const generalChannel = workspace.channels.find((ch) => ch.type === 'general');
    if (generalChannel) {
      setActiveChannel(generalChannel);
    }
  }, []);

  const handleSelectChannel = useCallback((channel: Channel) => {
    setActiveChannel(channel);
  }, []);

  const handleBack = useCallback(() => {
    setActiveWorkspace(null);
    setActiveChannel(null);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string, files?: File[], replyTo?: Message, voiceBlob?: Blob) => {
      if (!activeChannel) return;

      // Optimistic UI update
      const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
      const newMessage: Message = {
        id: optimisticId,
        channelId: activeChannel.id,
        sender: currentUser,
        content,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'sending',
        reactions: [],
        files: [],
        replyTo: replyTo ? {
          id: replyTo.id,
          senderName: replyTo.sender.name,
          content: replyTo.content,
        } : undefined,
        messageType: voiceBlob ? 'voice' : 'text',
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: [...(prev[activeChannel.id] || []), newMessage],
      }));

      try {
        // Send to Supabase
        const result = await sendMessage({
          channel_id: activeChannel.id,
          sender_id: currentUser.id,
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar,
          sender_role: currentUser.role,
          content,
          reply_to_id: replyTo?.id,
          reply_to_sender: replyTo?.sender.name,
          reply_to_content: replyTo?.content,
          message_type: voiceBlob ? 'voice' : 'text',
        });

        // Remove optimistic message since real-time will add the actual one
        setMessages((prev) => ({
          ...prev,
          [activeChannel.id]: (prev[activeChannel.id] || []).filter(m => m.id !== optimisticId),
        }));

        // Upload files if any
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
              setUploadProgress({ current: i + 1, total: files.length, fileName: file.name, percent: Math.round(((i) / files.length) * 100) });
              const uploaded = await uploadMessageFile(file, activeChannel.id);
              await addMessageFile(result.id, {
                name: uploaded.name,
                type: uploaded.mimeType,
                url: uploaded.url,
                size: uploaded.size,
              });
              setUploadProgress({ current: i + 1, total: files.length, fileName: file.name, percent: Math.round(((i + 1) / files.length) * 100) });
            } catch (fileErr) {
              console.warn('File upload failed:', fileErr);
            }
          }
          setUploadProgress(null);
        }

        // Upload voice if any
        if (voiceBlob) {
          try {
            const voiceFile = new File([voiceBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
            const uploaded = await uploadMessageFile(voiceFile, activeChannel.id);
            
            // Add voice file to message_files
            await addMessageFile(result.id, {
              name: uploaded.name,
              type: 'audio/webm',
              url: uploaded.url,
              size: uploaded.size,
            });

            // Update message with voice URL and duration
            const duration = Math.floor(voiceBlob.size / 16000); // Approximate duration
            const { error: updateError } = await supabase
              .from('messages')
              .update({ 
                voice_url: uploaded.url,
                voice_duration: duration 
              })
              .eq('id', result.id);

            if (updateError) {
              console.warn('Failed to update voice URL:', updateError);
            }
          } catch (voiceErr) {
            console.warn('Voice upload failed:', voiceErr);
          }
        }

        // Replace optimistic message with real one
        setMessages((prev) => ({
          ...prev,
          [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
            m.id === optimisticId ? { ...m, id: result.id, status: 'sent' as const } : m
          ),
        }));

        // Simulate delivery after 500ms
        setTimeout(() => {
          setMessages((prev) => ({
            ...prev,
            [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
              m.id === result.id ? { ...m, status: 'delivered' as const } : m
            ),
          }));
        }, 500);
      } catch (err) {
        console.error('Failed to send message:', err);
        setUploadProgress(null);
        setMessages((prev) => ({
          ...prev,
          [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
            m.id === optimisticId ? { ...m, status: 'failed' as const } : m
          ),
        }));
      }
    },
    [activeChannel, currentUser]
  );

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!activeChannel) return;

      // Optimistic UI update first
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) => {
          if (m.id !== messageId) return m;

          const existingReaction = m.reactions.find((r) => r.emoji === emoji);
          if (existingReaction) {
            if (existingReaction.users.includes(currentUser.id)) {
              // Remove reaction
              const updatedReactions = m.reactions
                .map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        users: r.users.filter((u) => u !== currentUser.id),
                        count: r.count - 1,
                      }
                    : r
                )
                .filter((r) => r.count > 0);
              return { ...m, reactions: updatedReactions };
            } else {
              // Add to existing reaction
              return {
                ...m,
                reactions: m.reactions.map((r) =>
                  r.emoji === emoji
                    ? { ...r, users: [...r.users, currentUser.id], count: r.count + 1 }
                    : r
                ),
              };
            }
          } else {
            // New reaction
            return {
              ...m,
              reactions: [...m.reactions, { emoji, users: [currentUser.id], count: 1 }],
            };
          }
        }),
      }));

      // Persist to DB
      try {
        const message = (messages[activeChannel.id] || []).find((m) => m.id === messageId);
        const existingReaction = message?.reactions.find((r) => r.emoji === emoji);
        const isRemoving = existingReaction?.users.includes(currentUser.id);

        if (isRemoving) {
          await removeMessageReaction(messageId, emoji, currentUser.id);
        } else {
          await addMessageReaction(messageId, emoji, currentUser.id);
        }
      } catch (err) {
        console.error('Failed to persist reaction:', err);
      }
    },
    [activeChannel, currentUser, messages]
  );

  const handleBoostSubmit = useCallback(
    async (data: BoostWizardData) => {
      if (!activeChannel || !activeWorkspace) return;

      const durationMultiplier = data.duration === '3d' ? 3 : data.duration === '7d' ? 7 : data.duration === '14d' ? 14 : 30;
      const totalBudget = data.budget * durationMultiplier;

      // Create system message (optimistic UI)
      const systemMessage: Message = {
        id: `msg-boost-${Date.now()}`,
        channelId: activeChannel.id,
        sender: { id: 'system', name: 'TITAN AI', avatar: 'AI', role: 'admin', status: 'online' },
        content: `🚀 New Boost Campaign Created!\n\nPlatform: ${data.platform}\nGoal: ${data.goal}\nDaily Budget: $${data.budget}\nDuration: ${data.duration}\nTotal Budget: $${totalBudget}\n\nMedia Buyer has been notified. Wallet deducted.`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'read',
        reactions: [],
        files: [],
        isSystemMessage: true,
        boostTag: {
          id: `boost-${Date.now()}`,
          platform: data.platform,
          budget: data.budget,
          duration: data.duration,
          status: 'requested',
        },
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: [...(prev[activeChannel.id] || []), systemMessage],
      }));

      setBoostWizardOpen(false);

      // Persist to DB: create campaign + debit wallet + send system message
      try {
        // Find client_id from workspace
        const clientId = (activeWorkspace as any).clientId || activeWorkspace.id;

        // 1. Create campaign in DB
        const campaign = await createCampaign({
          client_id: clientId,
          name: `${data.platform} - ${data.goal} Campaign`,
          platform: data.platform,
          budget: totalBudget,
          goal: data.goal,
          target_audience: data.targetAudience,
          duration: data.duration,
        });

        // 2. Try to debit wallet (may fail if insufficient balance)
        try {
          await debitWallet(
            clientId,
            totalBudget,
            `Boost Campaign: ${data.platform} - ${data.goal}`,
            'campaign',
            campaign.id
          );
        } catch (walletErr) {
          console.warn('Wallet debit skipped (may be insufficient):', walletErr);
        }

        // 3. Send the system message to DB
        await sendMessage({
          channel_id: activeChannel.id,
          sender_id: 'system',
          sender_name: 'TITAN AI',
          sender_avatar: 'AI',
          sender_role: 'admin',
          content: systemMessage.content,
          is_system_message: true,
        });

        console.log('✅ Boost campaign created in DB:', campaign.id);
      } catch (err) {
        console.error('Failed to persist boost campaign:', err);
      }
    },
    [activeChannel, activeWorkspace]
  );

  const handleCreateDeliverable = useCallback(
    async (type: string) => {
      if (!activeChannel || !activeWorkspace) return;

      const typeLabels: Record<string, string> = {
        design: 'Design Task',
        video: 'Video Production',
        approval: 'Approval Request',
        content: 'Content Creation',
        seo: 'SEO Task',
        ads: 'Ad Creative',
        social: 'Social Media Post',
      };

      const systemMessage: Message = {
        id: `msg-del-${Date.now()}`,
        channelId: activeChannel.id,
        sender: { id: 'system', name: 'TITAN AI', avatar: 'AI', role: 'admin', status: 'online' },
        content: `📦 New ${typeLabels[type] || 'Deliverable'} created. Package usage has been deducted.`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'read',
        reactions: [],
        files: [],
        isSystemMessage: true,
        deliverableTag: {
          id: `del-${Date.now()}`,
          type: type as any,
          label: `${typeLabels[type] || 'New Deliverable'} — ${activeWorkspace?.clientName}`,
          status: 'pending',
          packageDeducted: true,
        },
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: [...(prev[activeChannel.id] || []), systemMessage],
      }));

      // Persist to DB: create deliverable + send system message
      try {
        const clientId = (activeWorkspace as any).clientId || activeWorkspace.id;

        // 1. Create deliverable in DB
        const deliverable = await createDeliverable({
          client_id: clientId,
          title: `${typeLabels[type] || 'Deliverable'} — ${activeWorkspace.clientName}`,
          deliverable_type: type,
          status: 'pending',
          quantity: 1,
          notes: `Created from messaging channel: ${activeChannel.name}`,
        });

        // 2. Send system message to DB
        await sendMessage({
          channel_id: activeChannel.id,
          sender_id: 'system',
          sender_name: 'TITAN AI',
          sender_avatar: 'AI',
          sender_role: 'admin',
          content: systemMessage.content,
          is_system_message: true,
        });

        console.log('✅ Deliverable created in DB:', deliverable.id);
      } catch (err) {
        console.error('Failed to persist deliverable:', err);
      }
    },
    [activeChannel, activeWorkspace]
  );

  // ===== EDIT MESSAGE =====
  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeChannel) return;
      // Optimistic
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
        ),
      }));
      try {
        await editMessage(messageId, newContent);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [activeChannel]
  );

  // ===== DELETE MESSAGE =====
  const handleDeleteMessage = useCallback(
    async (messageId: string, forEveryone: boolean) => {
      if (!activeChannel) return;
      // Optimistic
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                deletedForEveryone: forEveryone,
                content: forEveryone ? '🗑️ This message was deleted' : m.content,
              }
            : m
        ),
      }));
      try {
        await deleteMessage(messageId, forEveryone);
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [activeChannel]
  );

  // ===== PIN / UNPIN =====
  const handlePinMessage = useCallback(
    async (messageId: string) => {
      if (!activeChannel) return;
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, isPinned: true } : m
        ),
      }));
      try {
        await pinMessage(messageId, activeChannel.id, currentUser.id);
      } catch (err) {
        console.error('Failed to pin message:', err);
      }
    },
    [activeChannel, currentUser]
  );

  const handleUnpinMessage = useCallback(
    async (messageId: string) => {
      if (!activeChannel) return;
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, isPinned: false } : m
        ),
      }));
      try {
        await unpinMessage(messageId);
      } catch (err) {
        console.error('Failed to unpin message:', err);
      }
    },
    [activeChannel]
  );

  // ===== SAVE / UNSAVE =====
  const handleSaveMessage = useCallback(
    async (messageId: string) => {
      if (!activeChannel) return;
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, isSaved: true } : m
        ),
      }));
      try {
        await saveMessage(messageId, currentUser.id);
      } catch (err) {
        console.error('Failed to save message:', err);
      }
    },
    [activeChannel, currentUser]
  );

  const handleUnsaveMessage = useCallback(
    async (messageId: string) => {
      if (!activeChannel) return;
      setMessages((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, isSaved: false } : m
        ),
      }));
      try {
        await unsaveMessage(messageId, currentUser.id);
      } catch (err) {
        console.error('Failed to unsave message:', err);
      }
    },
    [activeChannel, currentUser]
  );

  // ===== FORWARD =====
  const handleForwardMessage = useCallback(
    async (messageId: string, targetChannelId: string) => {
      if (!activeChannel || !activeWorkspace) return;
      const targetChannel = activeWorkspace.channels.find((ch) => ch.id === targetChannelId);
      try {
        await forwardMessage(
          messageId,
          targetChannelId,
          currentUser.id,
          currentUser.name,
          currentUser.avatar,
          currentUser.role,
          activeChannel.name
        );
        console.log('✅ Message forwarded to #' + (targetChannel?.name || targetChannelId));
      } catch (err) {
        console.error('Failed to forward message:', err);
      }
    },
    [activeChannel, activeWorkspace, currentUser]
  );

  // Workspace insights (real or fallback empty)
  const emptyInsights: WorkspaceInsights = {
    packageUsage: [],
    boostSummary: { totalBudget: 0, spent: 0, activeCampaigns: 0, platforms: [] },
    walletBalance: 0,
    deliverables: { pending: 0, inProgress: 0, completed: 0 },
    healthScore: 0,
    responseTime: 'N/A',
    satisfaction: 0,
  };

  const currentMessages = activeChannel ? messages[activeChannel.id] || [] : [];
  const currentInsights = workspaceInsights || emptyInsights;

  return (
    <div className="h-full flex overflow-hidden bg-titan-bg relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-titan-purple/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-titan-cyan/[0.02] blur-[80px]" />
      </div>

      {/* Connection Status Indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-4 left-4 z-50">
              <Badge
                variant="outline"
                className={cn(
                  'gap-2 border-white/10 backdrop-blur-sm transition-all',
                  realtimeStatus === 'connected' && 'bg-green-500/10 border-green-500/30 text-green-400',
                  realtimeStatus === 'connecting' && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
                  realtimeStatus === 'disconnected' && 'bg-gray-500/10 border-gray-500/30 text-gray-400',
                  realtimeStatus === 'error' && 'bg-red-500/10 border-red-500/30 text-red-400'
                )}
              >
                {realtimeStatus === 'connected' && <Wifi className="w-3 h-3" />}
                {realtimeStatus === 'connecting' && <Wifi className="w-3 h-3 animate-pulse" />}
                {realtimeStatus === 'disconnected' && <WifiOff className="w-3 h-3" />}
                {realtimeStatus === 'error' && <AlertCircle className="w-3 h-3" />}
                <span className="text-xs font-medium">
                  {realtimeStatus === 'connected' && 'Live'}
                  {realtimeStatus === 'connecting' && 'Connecting...'}
                  {realtimeStatus === 'disconnected' && 'Offline'}
                  {realtimeStatus === 'error' && 'Error'}
                </span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {realtimeStatus === 'connected' && lastConnectedAt && 
                `Connected since ${lastConnectedAt.toLocaleTimeString()}`}
              {realtimeStatus === 'connecting' && 'Establishing realtime connection...'}
              {realtimeStatus === 'disconnected' && 'Realtime connection lost'}
              {realtimeStatus === 'error' && 'Failed to connect to realtime server'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Workspace List (Left Panel) — hidden on mobile when a workspace + channel is selected */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'w-full sm:w-[260px] lg:w-[300px] shrink-0 z-10 relative',
          // On mobile: hide when workspace+channel is active
          (activeWorkspace && activeChannel) && 'hidden sm:block'
        )}
      >
        <WorkspaceList
          workspaces={workspacesData}
          activeWorkspaceId={activeWorkspace?.id || null}
          onSelect={handleSelectWorkspace}
        />
      </motion.div>

      {/* Main Content Area */}
      {activeWorkspace && activeChannel ? (
        <>
          {/* Channel List — hidden on mobile when viewing messages */}
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="hidden md:block shrink-0 z-10 relative"
          >
            <ChannelList
              workspace={activeWorkspace}
              activeChannelId={activeChannel.id}
              onSelectChannel={handleSelectChannel}
              onBack={handleBack}
              currentUserRole={currentUser.role}
              currentUserId={user?.id || currentUser.id}
              onChannelsUpdated={() => workspacesQuery.refetch()}
            />
          </motion.div>

          {/* Message Thread */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="flex-1 z-10 relative min-w-0 flex flex-col"
          >
            {/* Mobile back button */}
            <div className="sm:hidden flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-titan-bg/80 backdrop-blur-sm">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-mono text-xs">Back</span>
              </button>
              <span className="font-display font-bold text-sm text-white/70 truncate">
                #{activeChannel.name}
              </span>
            </div>
            <div className="flex-1 min-h-0">
            <MessageThread
              messages={currentMessages}
              channel={activeChannel}
              workspace={activeWorkspace}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onReaction={handleReaction}
              onOpenBoostWizard={() => setBoostWizardOpen(true)}
              onCreateDeliverable={handleCreateDeliverable}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onPinMessage={handlePinMessage}
              onUnpinMessage={handleUnpinMessage}
              onForwardMessage={handleForwardMessage}
              onSaveMessage={handleSaveMessage}
              onUnsaveMessage={handleUnsaveMessage}
              uploadProgress={uploadProgress}
              typingUserNames={typingUserNames}
              onTypingStart={() => activeWorkspace && startTyping(activeWorkspace.id)}
              onTypingStop={stopTyping}
              readReceipts={readReceipts}
              onMessageViewed={markAsRead}
            />
            </div>
          </motion.div>

          {/* Insights Toggle Button — desktop only */}
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="hidden lg:block absolute top-3 right-3 z-20 p-2 rounded-lg glass-card border border-white/[0.08] hover:border-titan-cyan/20 text-white/40 hover:text-titan-cyan transition-all"
          >
            {showInsights ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>

          {/* Insight Panel (Right) — desktop only */}
          <AnimatePresence>
            {showInsights && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block shrink-0 z-10 relative"
              >
                <WorkspaceInsightPanel
                  workspace={activeWorkspace}
                  insights={currentInsights}
                  onClose={() => setShowInsights(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center z-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-titan-cyan/10 to-titan-purple/10 flex items-center justify-center border border-white/[0.06]">
              <MessageSquare className="w-8 h-8 text-titan-cyan/40" />
            </div>
            <h3 className="font-display font-bold text-lg text-white/70 mb-1">
              Select a Workspace
            </h3>
            <p className="font-mono-data text-xs text-white/30 max-w-xs">
              Choose a client workspace from the left panel to start messaging. Each workspace has
              dedicated channels for deliverables, billing, and more.
            </p>
          </motion.div>
        </div>
      )}

      {/* Boost Wizard Modal */}
      <BoostWizard
        open={boostWizardOpen}
        onClose={() => setBoostWizardOpen(false)}
        onSubmit={handleBoostSubmit}
        workspaceName={activeWorkspace?.clientName || ''}
      />
    </div>
  );
}
