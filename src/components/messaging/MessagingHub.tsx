import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, PanelRightOpen, PanelRightClose } from 'lucide-react';
import WorkspaceList from './WorkspaceList';
import ChannelList from './ChannelList';
import MessageThread from './MessageThread';
import WorkspaceInsightPanel from './WorkspaceInsightPanel';
import BoostWizard from './BoostWizard';
import {
  workspacesData as mockWorkspacesData,
  messagesData,
  currentUser as mockCurrentUser,
  workspaceInsightsData,
  defaultInsights,
} from './mock-data';
import type { Workspace, Channel, Message, BoostWizardData } from './types';
import { useWorkspaces, useMessages } from '@/hooks/useMessaging';
import { useAuth } from '@/lib/auth';
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

export default function MessagingHub() {
  const { user } = useAuth();
  const workspacesQuery = useWorkspaces();
  const workspacesData = workspacesQuery.data.length > 0 ? workspacesQuery.data : mockWorkspacesData;

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(messagesData);
  const [showInsights, setShowInsights] = useState(true);
  const [boostWizardOpen, setBoostWizardOpen] = useState(false);

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

  // Current user from auth or fallback to mock
  const currentUser = user
    ? {
        id: user.id,
        name: user.display_name,
        avatar: user.avatar || (user.display_name ? user.display_name.split(' ').map(n => n[0]).join('') : 'U'),
        role: mapAuthRoleToMessagingRole(user.role),
        status: 'online' as const,
      }
    : mockCurrentUser;

  // Fetch real messages when channel changes
  const messagesQuery = useMessages(activeChannel?.id);

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
        };

        // Only add if not already in messages (avoid duplicates with optimistic update)
        setMessages((prev) => {
          const channelMessages = prev[activeChannel.id] || [];
          if (channelMessages.some(m => m.id === mapped.id)) return prev;
          return {
            ...prev,
            [activeChannel.id]: [...channelMessages, mapped],
          };
        });
      }
    });

    return unsubscribe;
  }, [activeChannel?.id]);

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
      const optimisticId = `msg-${Date.now()}`;
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
        });

        // Upload files if any
        if (files && files.length > 0) {
          for (const file of files) {
            try {
              const uploaded = await uploadMessageFile(file, activeChannel.id);
              await addMessageFile(result.id, {
                name: uploaded.name,
                type: uploaded.mimeType,
                url: uploaded.url,
                size: uploaded.size,
              });
            } catch (fileErr) {
              console.warn('File upload failed:', fileErr);
            }
          }
        }

        // Upload voice if any
        if (voiceBlob) {
          try {
            const voiceFile = new File([voiceBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
            const uploaded = await uploadMessageFile(voiceFile, activeChannel.id);
            await addMessageFile(result.id, {
              name: uploaded.name,
              type: 'audio/webm',
              url: uploaded.url,
              size: uploaded.size,
            });
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

  const currentMessages = activeChannel ? messages[activeChannel.id] || [] : [];
  const currentInsights = activeWorkspace
    ? workspaceInsightsData[activeWorkspace.id] || defaultInsights
    : defaultInsights;

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

      {/* Workspace List (Left Panel) */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-[300px] shrink-0 z-10 relative"
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
          {/* Channel List */}
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="shrink-0 z-10 relative"
          >
            <ChannelList
              workspace={activeWorkspace}
              activeChannelId={activeChannel.id}
              onSelectChannel={handleSelectChannel}
              onBack={handleBack}
              currentUserRole={currentUser.role}
            />
          </motion.div>

          {/* Message Thread */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="flex-1 z-10 relative min-w-0"
          >
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
            />
          </motion.div>

          {/* Insights Toggle Button */}
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="absolute top-3 right-3 z-20 p-2 rounded-lg glass-card border border-white/[0.08] hover:border-titan-cyan/20 text-white/40 hover:text-titan-cyan transition-all"
          >
            {showInsights ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>

          {/* Insight Panel (Right) */}
          <AnimatePresence>
            {showInsights && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 z-10 relative"
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
