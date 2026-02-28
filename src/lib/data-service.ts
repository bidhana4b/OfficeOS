/**
 * TITAN DEV AI — Core Data Service
 * Handles all CRUD operations, real-time subscriptions, and data flow
 */

import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

/**
 * Configuration: set to false to disable mock data fallbacks
 * In production, this should be false so errors are visible
 */
export const DATA_SERVICE_CONFIG = {
  enableMockFallback: false,
  logErrors: true,
};

function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase client not initialized. Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

/**
 * Utility: safe query wrapper that logs errors and optionally returns fallback
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback?: T,
  context?: string
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (DATA_SERVICE_CONFIG.logErrors) {
      console.error(`[DataService${context ? ` — ${context}` : ''}]`, error);
    }
    if (fallback !== undefined && DATA_SERVICE_CONFIG.enableMockFallback) {
      return fallback;
    }
    throw error;
  }
}

// ============================================
// CLIENT CRUD
// ============================================

export interface CreateClientInput {
  business_name: string;
  category?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_website?: string;
  account_manager_id?: string;
  status?: string;
  health_score?: number;
}

export async function createClient(input: CreateClientInput) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .insert({
      ...input,
      tenant_id: DEMO_TENANT_ID,
      status: input.status || 'active',
      health_score: input.health_score || 100,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(id: string, updates: Partial<CreateClientInput>) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const sb = requireSupabaseClient();

  // Cascade delete related records
  // 1. Delete deliverables
  await sb.from('deliverables').delete().eq('client_id', id);
  // 2. Delete client_packages & package_usage
  const { data: cps } = await sb.from('client_packages').select('id').eq('client_id', id);
  if (cps && cps.length > 0) {
    for (const cp of cps) {
      await sb.from('package_usage').delete().eq('client_package_id', cp.id);
    }
  }
  await sb.from('client_packages').delete().eq('client_id', id);
  // 3. Delete campaigns & invoices
  await sb.from('campaigns').delete().eq('client_id', id);
  const { data: invs } = await sb.from('invoices').select('id').eq('client_id', id);
  if (invs && invs.length > 0) {
    for (const inv of invs) {
      await sb.from('invoice_items').delete().eq('invoice_id', inv.id);
    }
  }
  await sb.from('invoices').delete().eq('client_id', id);
  // 4. Delete wallet transactions and wallet
  await sb.from('wallet_transactions').delete().eq('client_id', id);
  await sb.from('client_wallets').delete().eq('client_id', id);
  // 5. Delete workspace, channels, messages, members
  const { data: ws } = await sb.from('workspaces').select('id').eq('client_id', id);
  if (ws && ws.length > 0) {
    for (const w of ws) {
      const { data: chs } = await sb.from('channels').select('id').eq('workspace_id', w.id);
      if (chs && chs.length > 0) {
        for (const ch of chs) {
          await sb.from('messages').delete().eq('channel_id', ch.id);
          await sb.from('message_reactions').delete().eq('channel_id', ch.id);
          await sb.from('message_attachments').delete().eq('channel_id', ch.id);
          await sb.from('read_receipts').delete().eq('channel_id', ch.id);
          await sb.from('channel_members').delete().eq('channel_id', ch.id);
        }
        await sb.from('channels').delete().eq('workspace_id', w.id);
      }
      await sb.from('workspace_members').delete().eq('workspace_id', w.id);
    }
    await sb.from('workspaces').delete().eq('client_id', id);
  }
  // 6. Delete client performance, sub-users, notifications, activities
  await sb.from('client_performance').delete().eq('client_id', id);
  await sb.from('client_sub_users').delete().eq('client_id', id);
  await sb.from('notifications').delete().eq('client_id', id);
  await sb.from('activities').delete().eq('client_id', id);
  // 7. Delete demo_user login for client
  await sb.from('demo_users').delete().eq('client_id', id);
  // 8. Finally delete the client
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// PACKAGE LINKING
// ============================================

export interface LinkPackageInput {
  client_id: string;
  package_id: string;
  start_date: string;
  renewal_date?: string;
}

export async function linkPackageToClient(input: LinkPackageInput) {
  const sb = requireSupabaseClient();

  // Deactivate existing active packages for this client
  await sb
    .from('client_packages')
    .update({ status: 'expired' })
    .eq('client_id', input.client_id)
    .eq('status', 'active');

  const { data, error } = await sb
    .from('client_packages')
    .insert({
      client_id: input.client_id,
      package_id: input.package_id,
      start_date: input.start_date,
      renewal_date: input.renewal_date,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  // The trigger auto_init_package_usage handles usage initialization
  return data;
}

export async function getPackageUsage(clientPackageId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('package_usage')
    .select('*')
    .eq('client_package_id', clientPackageId);

  if (error) throw error;
  return data;
}

/**
 * Get package usage with client_package_features overrides applied.
 * Uses the RPC function that merges data from:
 *   client_package_features (priority) > package_features (defaults) > raw usage
 */
export async function getPackageUsageWithOverrides(clientPackageId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('get_package_usage_with_overrides', {
    p_client_package_id: clientPackageId,
  });

  if (error) {
    console.warn('[getPackageUsageWithOverrides] RPC failed, falling back to basic query:', error.message);
    return getPackageUsage(clientPackageId);
  }
  return data;
}

/**
 * Check if a deliverable can be created (has remaining quota).
 * Returns { can_deduct, remaining, warning_active, message }
 */
export interface UsageCheckResult {
  can_deduct: boolean;
  current_used: number;
  current_total: number;
  remaining: number;
  warning_active: boolean;
  message: string;
}

export async function checkUsageBeforeDeduction(
  clientPackageId: string,
  deliverableType: string,
  quantity: number = 1
): Promise<UsageCheckResult> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('check_usage_before_deduction', {
    p_client_package_id: clientPackageId,
    p_deliverable_type: deliverableType,
    p_quantity: quantity,
  });

  if (error) {
    console.warn('[checkUsageBeforeDeduction] RPC failed:', error.message);
    // Fallback: allow but warn
    return {
      can_deduct: true,
      current_used: 0,
      current_total: 0,
      remaining: 0,
      warning_active: false,
      message: `Could not verify usage: ${error.message}`,
    };
  }

  // RPC returns array with single row
  const row = Array.isArray(data) ? data[0] : data;
  return {
    can_deduct: row?.can_deduct ?? true,
    current_used: row?.current_used ?? 0,
    current_total: row?.current_total ?? 0,
    remaining: row?.remaining ?? 0,
    warning_active: row?.warning_active ?? false,
    message: row?.message ?? 'OK',
  };
}

// ============================================
// DELIVERABLE CRUD
// ============================================

export interface CreateDeliverableInput {
  client_id: string;
  client_package_id?: string;
  assigned_to?: string;
  title: string;
  deliverable_type: string;
  status?: string;
  deadline?: string;
  quantity?: number;
  notes?: string;
}

export async function createDeliverable(input: CreateDeliverableInput) {
  // Pre-check: If client_package_id is set, verify remaining quota
  if (input.client_package_id && input.deliverable_type) {
    const check = await checkUsageBeforeDeduction(
      input.client_package_id,
      input.deliverable_type,
      input.quantity || 1
    );

    if (!check.can_deduct) {
      throw new Error(check.message || 'Package usage depleted for this deliverable type');
    }
  }

  const deadlineDate = input.deadline ? new Date(input.deadline) : null;
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .insert({
      ...input,
      tenant_id: DEMO_TENANT_ID,
      status: input.status || 'pending',
      quantity: input.quantity || 1,
      days_left: daysLeft,
      progress: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeliverableStatus(
  id: string,
  status: string,
  confirmedBy?: string
) {
  const progressMap: Record<string, number> = {
    pending: 0,
    'in-progress': 30,
    review: 70,
    approved: 90,
    delivered: 100,
    cancelled: 0,
  };

  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .update({
      status,
      progress: progressMap[status] || 0,
      confirmed_by: confirmedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  // The trigger trg_deduct_package_usage auto-deducts on 'delivered'
  return data;
}

export async function getDeliverablesByAssignee(assigneeId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .select('*, clients(business_name)')
    .eq('assigned_to', assigneeId)
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDeliverablesByClient(clientId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .select('*, team_members:assigned_to(name, avatar)')
    .eq('client_id', clientId)
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================
// MESSAGING (REAL-TIME)
// ============================================

export interface SendMessageInput {
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  sender_role?: string;
  content: string;
  reply_to_id?: string;
  reply_to_sender?: string;
  reply_to_content?: string;
  message_type?: string;
  is_system_message?: boolean;
}

export async function sendMessage(input: SendMessageInput) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('messages')
    .insert({
      channel_id: input.channel_id,
      sender_id: input.sender_id === 'system' ? null : input.sender_id,
      sender_name: input.sender_name,
      sender_avatar: input.sender_avatar || '',
      sender_role: input.sender_role || 'admin',
      content: input.content,
      status: 'sent',
      reply_to_id: input.reply_to_id || null,
      reply_to_sender: input.reply_to_sender || null,
      reply_to_content: input.reply_to_content || null,
      message_type: input.message_type || 'text',
      is_system_message: input.is_system_message || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getChannelMessages(channelId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('messages')
    .select('*, message_reactions(*), message_files(*)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export function subscribeToMessages(
  channelId: string,
  callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void
) {
  const sb = requireSupabaseClient();
  const channel = sb
    .channel(`messages-${channelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        });
      }
    )
    .subscribe();

  return () => {
    const sb = requireSupabaseClient();
    sb.removeChannel(channel);
  };
}

// ============================================
// MESSAGE REACTIONS (DB PERSIST)
// ============================================

export async function addMessageReaction(messageId: string, emoji: string, userId: string) {
  const sb = requireSupabaseClient();

  // Check if reaction for this emoji already exists on this message
  const { data: existing } = await sb
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    // Add user to existing reaction
    const currentUsers: string[] = existing.user_ids || [];
    if (currentUsers.includes(userId)) return existing; // Already reacted

    const updatedUsers = [...currentUsers, userId];
    const { data, error } = await sb
      .from('message_reactions')
      .update({
        user_ids: updatedUsers,
        count: updatedUsers.length,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new reaction
    const { data, error } = await sb
      .from('message_reactions')
      .insert({
        message_id: messageId,
        emoji,
        user_ids: [userId],
        count: 1,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function removeMessageReaction(messageId: string, emoji: string, userId: string) {
  const sb = requireSupabaseClient();

  const { data: existing } = await sb
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (!existing) return null;

  const currentUsers: string[] = existing.user_ids || [];
  const updatedUsers = currentUsers.filter((u: string) => u !== userId);

  if (updatedUsers.length === 0) {
    // Remove reaction entirely
    const { error } = await sb
      .from('message_reactions')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return null;
  } else {
    // Update user list
    const { data, error } = await sb
      .from('message_reactions')
      .update({
        user_ids: updatedUsers,
        count: updatedUsers.length,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// ============================================
// ENHANCED MESSAGE OPERATIONS
// ============================================

export async function editMessage(messageId: string, newContent: string) {
  const sb = requireSupabaseClient();
  const { data: existing } = await sb
    .from('messages')
    .select('content')
    .eq('id', messageId)
    .single();

  const { data, error } = await sb
    .from('messages')
    .update({
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
      original_content: existing?.content || null,
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId: string, forEveryone: boolean = false) {
  const sb = requireSupabaseClient();
  if (forEveryone) {
    const { data, error } = await sb
      .from('messages')
      .update({
        is_deleted: true,
        deleted_for_everyone: true,
        deleted_at: new Date().toISOString(),
        content: '🗑️ This message was deleted',
      })
      .eq('id', messageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await sb
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function pinMessage(messageId: string, channelId: string, pinnedBy: string) {
  const sb = requireSupabaseClient();
  // Update message
  await sb.from('messages').update({ is_pinned: true }).eq('id', messageId);
  // Insert into pinned_messages
  const { data, error } = await sb
    .from('pinned_messages')
    .insert({
      message_id: messageId,
      channel_id: channelId,
      pinned_by: pinnedBy,
    })
    .select()
    .single();
  if (error && error.code !== '23505') throw error; // Ignore duplicate
  return data;
}

export async function unpinMessage(messageId: string) {
  const sb = requireSupabaseClient();
  await sb.from('messages').update({ is_pinned: false }).eq('id', messageId);
  const { error } = await sb.from('pinned_messages').delete().eq('message_id', messageId);
  if (error) throw error;
}

export async function getPinnedMessages(channelId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('pinned_messages')
    .select('*, messages(*)')
    .eq('channel_id', channelId)
    .order('pinned_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveMessage(messageId: string, userId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('saved_messages')
    .insert({ message_id: messageId, user_profile_id: userId })
    .select()
    .single();
  if (error && error.code !== '23505') throw error;
  return data;
}

export async function unsaveMessage(messageId: string, userId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('saved_messages')
    .delete()
    .eq('message_id', messageId)
    .eq('user_profile_id', userId);
  if (error) throw error;
}

export async function getSavedMessages(userId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('saved_messages')
    .select('*, messages(*)')
    .eq('user_profile_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function forwardMessage(
  originalMessageId: string,
  targetChannelId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  senderRole: string,
  originalChannelName: string
) {
  const sb = requireSupabaseClient();

  // Try using the DB function that also copies attachments
  try {
    const { data: newMsgId, error: rpcError } = await sb.rpc('forward_message_with_attachments', {
      p_original_message_id: originalMessageId,
      p_target_channel_id: targetChannelId,
      p_sender_id: senderId,
      p_sender_name: senderName,
      p_sender_avatar: senderAvatar,
      p_sender_role: senderRole,
      p_original_channel_name: originalChannelName,
    });

    if (!rpcError && newMsgId) {
      // Fetch the full new message
      const { data: newMsg } = await sb
        .from('messages')
        .select('*')
        .eq('id', newMsgId)
        .single();
      return newMsg;
    }
  } catch {
    // RPC not available, fallback to manual forward
  }

  // Fallback: manual forward without attachments
  const { data: original } = await sb
    .from('messages')
    .select('content')
    .eq('id', originalMessageId)
    .single();

  if (!original) throw new Error('Original message not found');

  const { data, error } = await sb
    .from('messages')
    .insert({
      channel_id: targetChannelId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      sender_role: senderRole,
      content: original.content,
      status: 'sent',
      forwarded_from_id: originalMessageId,
      forwarded_from_channel: originalChannelName,
    })
    .select()
    .single();

  if (error) throw error;

  // Manually copy attachments
  try {
    const { data: files } = await sb
      .from('message_files')
      .select('*')
      .eq('message_id', originalMessageId);

    if (files && files.length > 0) {
      for (const file of files) {
        await sb.from('message_files').insert({
          message_id: data.id,
          name: file.name,
          type: file.type,
          url: file.url,
          size: file.size,
          thumbnail: file.thumbnail,
        });
      }
    }
  } catch (fileErr) {
    console.warn('Failed to copy attachments during forward:', fileErr);
  }

  return data;
}

// Legacy markMessageAsRead removed — use `markMessageAsReadV2` from Phase 3 section.

// ============================================
// FILE UPLOAD (Supabase Storage)
// ============================================

export type UploadProgressCallback = (progress: { loaded: number; total: number; percent: number }) => void;

export async function uploadMessageFile(
  file: File,
  channelId: string,
  onProgress?: UploadProgressCallback
) {
  const sb = requireSupabaseClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Max file size: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${formatFileSize(file.size)}). Maximum allowed: 50 MB`);
  }

  // Report initial progress
  onProgress?.({ loaded: 0, total: file.size, percent: 0 });

  const { data, error } = await sb.storage
    .from('message-attachments')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    // If bucket doesn't exist, give a better error message
    if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
      throw new Error('Storage bucket "message-attachments" not found. Please create it in Supabase Dashboard → Storage.');
    }
    throw error;
  }

  // Report completion
  onProgress?.({ loaded: file.size, total: file.size, percent: 100 });

  const { data: publicUrl } = sb.storage
    .from('message-attachments')
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicUrl.publicUrl,
    name: file.name,
    size: formatFileSize(file.size),
    mimeType: file.type,
  };
}

// Upload multiple files with aggregate progress
export async function uploadMultipleFiles(
  files: File[],
  channelId: string,
  onProgress?: (progress: { current: number; total: number; fileName: string; percent: number }) => void
) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ current: i + 1, total: files.length, fileName: file.name, percent: Math.round(((i) / files.length) * 100) });
    const result = await uploadMessageFile(file, channelId);
    results.push(result);
    onProgress?.({ current: i + 1, total: files.length, fileName: file.name, percent: Math.round(((i + 1) / files.length) * 100) });
  }
  return results;
}

export async function addMessageFile(
  messageId: string,
  file: { name: string; type: string; url: string; size: string; thumbnail?: string }
) {
  const sb = requireSupabaseClient();
  const fileType = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('audio/')
    ? 'voice'
    : 'document';

  const { data, error } = await sb
    .from('message_files')
    .insert({
      message_id: messageId,
      name: file.name,
      type: fileType,
      url: file.url,
      size: file.size,
      thumbnail: file.thumbnail || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================
// CANNED RESPONSES (Legacy helpers removed)
// ============================================
// The primary getCannedResponses(workspaceId) and createCannedResponse(...)
// are defined in the "PHASE 3: MESSAGING ENHANCEMENTS" section below.

// ============================================
// CAMPAIGNS / BOOST
// ============================================

export interface CreateCampaignInput {
  client_id: string;
  name: string;
  platform: string;
  budget: number;
  goal?: string;
  target_audience?: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
}

export async function createCampaign(input: CreateCampaignInput) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('campaigns')
    .insert({
      ...input,
      tenant_id: DEMO_TENANT_ID,
      status: 'requested',
      spent: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    client_id: input.client_id,
    type: 'boost_launched',
    title: `Campaign Created: ${input.name}`,
    description: `${input.platform} campaign - Budget: ${input.budget}`,
    timestamp: new Date().toISOString(),
    metadata: { platform: input.platform, budget: input.budget },
  });

  return data;
}

export async function updateCampaignStatus(id: string, status: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('campaigns')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// WALLET OPERATIONS
// ============================================

export async function creditWallet(clientId: string, amount: number, description?: string) {
  const sb = requireSupabaseClient();
  // Get wallet ID
  const { data: wallet, error: walletErr } = await sb
    .from('client_wallets')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (walletErr || !wallet) throw walletErr || new Error('Wallet not found');

  const { data, error } = await sb
    .from('wallet_transactions')
    .insert({
      client_wallet_id: wallet.id,
      type: 'credit',
      amount,
      description: description || 'Wallet credit',
      reference_type: 'manual',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function debitWallet(clientId: string, amount: number, description?: string, referenceType?: string, referenceId?: string) {
  const sb = requireSupabaseClient();
  const { data: wallet, error: walletErr } = await sb
    .from('client_wallets')
    .select('id, balance')
    .eq('client_id', clientId)
    .single();

  if (walletErr || !wallet) throw walletErr || new Error('Wallet not found');

  // Check balance
  if (Number(wallet.balance) < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const { data, error } = await sb
    .from('wallet_transactions')
    .insert({
      client_wallet_id: wallet.id,
      type: 'debit',
      amount,
      description: description || 'Wallet debit',
      reference_type: referenceType || 'manual',
      reference_id: referenceId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWalletBalance(clientId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_wallets')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error) throw error;
  return data;
}

export async function getWalletTransactions(clientId: string) {
  const sb = requireSupabaseClient();
  const { data: wallet } = await sb
    .from('client_wallets')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (!wallet) return [];

  const { data, error } = await sb
    .from('wallet_transactions')
    .select('*')
    .eq('client_wallet_id', wallet.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// INVOICE OPERATIONS
// ============================================

export interface CreateInvoiceInput {
  client_id: string;
  amount: number;
  currency?: string;
  due_date?: string;
  notes?: string;
  items?: { description: string; quantity: number; unit_price: number }[];
}

export async function createInvoice(input: CreateInvoiceInput) {
  const sb = requireSupabaseClient();

  // Generate invoice number
  const { count } = await sb
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', DEMO_TENANT_ID);

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data: invoice, error } = await sb
    .from('invoices')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      client_id: input.client_id,
      invoice_number: invoiceNumber,
      amount: input.amount,
      currency: input.currency || 'BDT',
      status: 'draft',
      due_date: input.due_date,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert line items
  if (input.items && input.items.length > 0) {
    await sb
      .from('invoice_items')
      .insert(
        input.items.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      );
  }

  // Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    client_id: input.client_id,
    type: 'invoice_generated',
    title: `Invoice ${invoiceNumber} Generated`,
    description: `Amount: ${input.amount} ${input.currency || 'BDT'}`,
    timestamp: new Date().toISOString(),
    metadata: { amount: input.amount, currency: input.currency || 'BDT', invoiceNumber },
  });

  return invoice;
}

export async function updateInvoiceStatus(id: string, status: string) {
  const updates: Record<string, unknown> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }

  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // If paid, log payment activity
  if (status === 'paid' && data) {
    await sb.from('activities').insert({
      tenant_id: DEMO_TENANT_ID,
      client_id: data.client_id,
      type: 'payment_received',
      title: `Payment Received: ${data.invoice_number}`,
      description: `Amount: ${data.amount} ${data.currency}`,
      timestamp: new Date().toISOString(),
      metadata: { amount: data.amount, currency: data.currency },
    });
  }

  return data;
}

// ============================================
// INVOICE FETCHING
// ============================================

export async function getInvoices(filters?: { status?: string; client_id?: string }) {
  const sb = requireSupabaseClient();
  let query = sb
    .from('invoices')
    .select('*, clients(business_name)')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getInvoiceById(id: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('invoices')
    .select('*, clients(business_name), invoice_items(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// CAMPAIGN FETCHING
// ============================================

export async function getCampaigns(filters?: { status?: string; client_id?: string }) {
  const sb = requireSupabaseClient();
  let query = sb
    .from('campaigns')
    .select('*, clients(business_name)')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateCampaignSpend(id: string, spent: number) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('campaigns')
    .update({ spent, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb.from('campaigns').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// WALLET ADMIN FETCHING
// ============================================

export async function getAllClientWallets() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_wallets')
    .select('*, clients(business_name, status)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllWalletTransactions(limit = 50) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('wallet_transactions')
    .select('*, client_wallets(client_id, clients(business_name))')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getClientListForSelect() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .select('id, business_name')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('business_name');
  if (error) throw error;
  return data || [];
}

// ============================================
// TEAM MEMBER CRUD
// ============================================

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  primary_role: string;
  secondary_roles?: string[];
  work_capacity_hours?: number;
  avatar?: string;
  status?: string;
  team_ids?: string[];
  skills?: { skill_name: string; skill_level: number }[];
  password?: string;
  create_login?: boolean;
  assign_to_clients?: string[];
}

export interface CreateTeamMemberResult {
  team_member: Record<string, unknown>;
  user_profile: Record<string, unknown> | null;
  demo_user: Record<string, unknown> | null;
  client_assignments: Record<string, unknown>[];
  steps_completed: string[];
  errors: string[];
}

/**
 * Enhanced createTeamMember with complete user system integration
 * Creates: team_member + user_profile + demo_user (login) + client assignments
 * Uses RPC with automatic fallback to direct DB insert
 */
export async function createTeamMember(input: CreateTeamMemberInput): Promise<CreateTeamMemberResult> {
  const sb = requireSupabaseClient();
  const errors: string[] = [];
  const stepsCompleted: string[] = [];
  const clientAssignments: Record<string, unknown>[] = [];

  let teamMemberId: string;
  let userProfileId: string;
  let member: Record<string, unknown> | null = null;
  let userProfile: Record<string, unknown> | null = null;
  let demoUser: Record<string, unknown> | null = null;

  // Try RPC first, fallback to direct DB insert
  const { data: result, error: rpcError } = await sb.rpc('create_complete_team_member', {
    p_tenant_id: DEMO_TENANT_ID,
    p_name: input.name,
    p_email: input.email,
    p_password: input.password || '123456',
    p_primary_role: input.primary_role,
    p_secondary_roles: input.secondary_roles || [],
    p_work_capacity_hours: input.work_capacity_hours || 8,
    p_avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
    p_status: input.status || 'online',
  });

  if (rpcError) {
    console.warn('[createTeamMember] RPC failed, using direct DB fallback:', rpcError.message);

    // FALLBACK: Direct DB insert
    try {
      // 1. Create user_profile
      const { data: profile, error: profileErr } = await sb
        .from('user_profiles')
        .insert({
          tenant_id: DEMO_TENANT_ID,
          full_name: input.name,
          email: input.email.toLowerCase().trim(),
          role: input.primary_role,
          avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
          status: input.status || 'active',
        })
        .select()
        .single();

      if (profileErr) throw new Error(`user_profile creation failed: ${profileErr.message}`);
      userProfileId = profile.id;
      userProfile = profile;
      stepsCompleted.push('user_profile_created');

      // 2. Create team_member
      const { data: tm, error: tmErr } = await sb
        .from('team_members')
        .insert({
          tenant_id: DEMO_TENANT_ID,
          user_profile_id: userProfileId,
          name: input.name,
          email: input.email.toLowerCase().trim(),
          avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
          primary_role: input.primary_role,
          secondary_roles: input.secondary_roles || [],
          work_capacity_hours: input.work_capacity_hours || 8,
          status: input.status || 'online',
          current_load: 0,
          active_deliverables: 0,
          boost_campaigns: 0,
          tasks_completed_this_month: 0,
          join_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (tmErr) throw new Error(`team_member creation failed: ${tmErr.message}`);
      teamMemberId = tm.id;
      member = tm;
      stepsCompleted.push('team_member_created');

      // 3. Create demo_user (login bridge)
      try {
        const roleMap: Record<string, string> = {
          'Graphic Designer': 'designer',
          'Video Editor': 'designer',
          'Media Buyer': 'media_buyer',
          'Copywriter': 'designer',
          'Account Manager': 'account_manager',
          'SEO Specialist': 'media_buyer',
          'Social Media Manager': 'media_buyer',
          'Developer': 'super_admin',
          'AI Engineer': 'super_admin',
          'Finance Manager': 'finance',
          'HR Manager': 'super_admin',
        };

        const { data: du, error: duErr } = await sb
          .from('demo_users')
          .insert({
            tenant_id: DEMO_TENANT_ID,
            email: input.email.toLowerCase().trim(),
            password_hash: input.password || '123456',
            display_name: input.name,
            role: roleMap[input.primary_role] || 'designer',
            avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
            user_profile_id: userProfileId,
            team_member_id: teamMemberId,
            is_active: true,
          })
          .select('id, email, display_name, role, created_at')
          .single();

        if (duErr) {
          errors.push(`demo_user creation failed: ${duErr.message}`);
        } else {
          demoUser = du;
          stepsCompleted.push('demo_user_created');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`demo_user creation failed: ${msg}`);
      }

      // 4. Add to all client workspaces as workspace_member
      try {
        const { data: workspaces } = await sb
          .from('workspaces')
          .select('id')
          .eq('tenant_id', DEMO_TENANT_ID);

        if (workspaces && workspaces.length > 0) {
          const wsMembers = workspaces.map((ws: any) => ({
            workspace_id: ws.id,
            user_profile_id: userProfileId,
            name: input.name,
            avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
            role: 'member',
            status: 'online',
          }));
          await sb.from('workspace_members').upsert(wsMembers, { onConflict: 'workspace_id,user_profile_id' });
          stepsCompleted.push(`workspace_access(${workspaces.length})`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`workspace access failed: ${msg}`);
      }

    } catch (fallbackErr) {
      throw new Error(`Failed to create team member: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
    }
  } else {
    // RPC succeeded
    teamMemberId = result.team_member_id;
    userProfileId = result.user_profile_id;

    stepsCompleted.push('team_member_created');
    stepsCompleted.push('user_profile_created');
    stepsCompleted.push('demo_user_created');

    // Fetch the created team member
    const { data: m } = await sb
      .from('team_members')
      .select('*')
      .eq('id', teamMemberId)
      .single();
    member = m;

    // Fetch user_profile
    const { data: up } = await sb
      .from('user_profiles')
      .select('*')
      .eq('id', userProfileId)
      .single();
    userProfile = up;

    // Fetch demo_user
    const { data: du } = await sb
      .from('demo_users')
      .select('id, email, display_name, role, created_at')
      .eq('id', result.demo_user_id)
      .single();
    demoUser = du;
  }

  // Link to teams
  if (input.team_ids && input.team_ids.length > 0) {
    try {
      const teamLinks = input.team_ids.map((teamId) => ({
        team_member_id: teamMemberId,
        team_id: teamId,
      }));
      await sb.from('team_member_teams').insert(teamLinks);
      stepsCompleted.push(`linked_to_teams(${input.team_ids.length})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Team linking failed: ${msg}`);
    }
  }

  // Add skills
  if (input.skills && input.skills.length > 0) {
    try {
      const skillRecords = input.skills.map((s) => ({
        team_member_id: teamMemberId,
        skill_name: s.skill_name,
        skill_level: s.skill_level,
      }));
      await sb.from('user_skills').insert(skillRecords);
      stepsCompleted.push(`skills_added(${input.skills.length})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Skills creation failed: ${msg}`);
    }
  }

  // Assign to clients and their workspaces/channels
  if (input.assign_to_clients && input.assign_to_clients.length > 0) {
    for (const clientId of input.assign_to_clients) {
      try {
        // Try RPC first
        const { data: assignResult, error: assignError } = await sb.rpc('assign_team_member_to_client', {
          p_team_member_id: teamMemberId,
          p_client_id: clientId,
          p_workspace_role: 'member',
          p_assign_to_all_channels: true,
        });

        if (assignError) {
          // Fallback: direct DB insert for workspace access
          console.warn('[createTeamMember] assign RPC failed, using fallback:', assignError.message);
          const { data: workspace } = await sb
            .from('workspaces')
            .select('id')
            .eq('client_id', clientId)
            .single();

          if (workspace && userProfileId) {
            await sb.from('workspace_members').upsert({
              workspace_id: workspace.id,
              user_profile_id: userProfileId,
              name: input.name,
              avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
              role: 'member',
              status: 'online',
            }, { onConflict: 'workspace_id,user_profile_id' });

            // Add to channels
            const { data: channels } = await sb
              .from('channels')
              .select('id')
              .eq('workspace_id', workspace.id);

            if (channels && channels.length > 0) {
              for (const ch of channels) {
                try {
                  await sb.from('channel_members').upsert({
                    channel_id: ch.id,
                    user_profile_id: userProfileId,
                    role_in_channel: 'member',
                    added_by: userProfileId,
                  }, { onConflict: 'channel_id,user_profile_id' });
                } catch { /* continue */ }
              }
            }

            clientAssignments.push({ client_id: clientId, workspace_id: workspace.id });
            stepsCompleted.push(`assigned_to_client(${clientId})`);
          } else {
            errors.push(`Client assignment failed for ${clientId}: No workspace found`);
          }
        } else {
          clientAssignments.push(assignResult);
          stepsCompleted.push(`assigned_to_client(${clientId})`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Client assignment failed for ${clientId}: ${msg}`);
      }
    }
  }

  return {
    team_member: member || {},
    user_profile: userProfile || null,
    demo_user: demoUser || null,
    client_assignments: clientAssignments,
    steps_completed: stepsCompleted,
    errors,
  };
}

export async function updateTeamMember(id: string, updates: Partial<CreateTeamMemberInput>) {
  const sb = requireSupabaseClient();
  const { team_ids, skills, assign_to_clients, password, ...memberUpdates } = updates;

  const { data, error } = await sb
    .from('team_members')
    .update({ ...memberUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, user_profile_id')
    .single();

  if (error) throw error;

  // Sync name/email/avatar/role to user_profile
  const profileId = data?.user_profile_id;
  if (profileId) {
    const profileUpdates: Record<string, unknown> = {};
    if (updates.name) profileUpdates.full_name = updates.name;
    if (updates.email) profileUpdates.email = updates.email;
    if (updates.avatar) profileUpdates.avatar = updates.avatar;
    if (updates.primary_role) profileUpdates.role = updates.primary_role;
    if (updates.status) profileUpdates.status = updates.status;
    if (Object.keys(profileUpdates).length > 0) {
      await sb.from('user_profiles').update(profileUpdates).eq('id', profileId);
    }
  }

  // Sync to demo_users
  const demoUpdates: Record<string, unknown> = {};
  if (updates.name) demoUpdates.display_name = updates.name;
  if (updates.email) demoUpdates.email = updates.email;
  if (updates.avatar) demoUpdates.avatar = updates.avatar;
  if (password) demoUpdates.password_hash = password;
  if (Object.keys(demoUpdates).length > 0) {
    await sb.from('demo_users').update(demoUpdates).eq('team_member_id', id);
  }

  return data;
}

export async function deleteTeamMember(id: string) {
  const sb = requireSupabaseClient();

  // 1. Get team member to find linked user_profile_id
  const { data: member } = await sb.from('team_members').select('user_profile_id, email').eq('id', id).single();
  const profileId = member?.user_profile_id;

  // 2. Delete demo_user login
  await sb.from('demo_users').delete().eq('team_member_id', id);

  // 3. Remove from workspace_members and channel_members (via user_profile_id)
  if (profileId) {
    await sb.from('channel_members').delete().eq('user_profile_id', profileId);
    await sb.from('workspace_members').delete().eq('user_profile_id', profileId);
  }

  // 4. Delete skills
  await sb.from('team_skills').delete().eq('team_member_id', id);
  // Also try user_skills table
  try { await sb.from('user_skills').delete().eq('team_member_id', id); } catch { /* ignore */ }

  // 5. Unassign deliverables (set to null, don't delete them)
  await sb.from('deliverables').update({ assigned_to: null }).eq('assigned_to', id);

  // 6. Delete the team_member
  const { error } = await sb.from('team_members').delete().eq('id', id);
  if (error) throw error;

  // 7. Delete user_profile (after team_member is deleted to avoid FK issues)
  if (profileId) {
    try {
      await sb.from('user_profiles').delete().eq('id', profileId);
    } catch (e) {
      console.warn('[deleteTeamMember] user_profile cleanup failed:', e);
    }
  }
}

// ============================================
// SKILL MANAGEMENT CRUD
// ============================================

export interface SkillRecord {
  id: string;
  team_member_id: string;
  skill_name: string;
  skill_level: number;
}

export async function getSkillsForMember(teamMemberId: string): Promise<SkillRecord[]> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('user_skills')
    .select('*')
    .eq('team_member_id', teamMemberId)
    .order('skill_name');
  if (error) throw error;
  return (data || []) as SkillRecord[];
}

export async function addSkillToMember(teamMemberId: string, skillName: string, skillLevel: number = 3): Promise<SkillRecord> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('user_skills')
    .insert({
      team_member_id: teamMemberId,
      skill_name: skillName,
      skill_level: skillLevel,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SkillRecord;
}

export async function updateSkillLevel(skillId: string, skillLevel: number): Promise<SkillRecord> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('user_skills')
    .update({ skill_level: skillLevel })
    .eq('id', skillId)
    .select()
    .single();
  if (error) throw error;
  return data as SkillRecord;
}

export async function removeSkillFromMember(skillId: string): Promise<void> {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('user_skills')
    .delete()
    .eq('id', skillId);
  if (error) throw error;
}

// ============================================
// REAL WORKLOAD CALCULATION
// ============================================

export interface WorkloadData {
  teamMemberId: string;
  assignedDeliverables: number;
  inProgressCount: number;
  reviewCount: number;
  pendingCount: number;
  estimatedHours: number;
  capacityHoursPerDay: number;
  capacityHoursPerMonth: number; // ~22 working days
  loadPercentage: number;
  deliverableBreakdown: { type: string; count: number; hours: number }[];
}

export async function calculateWorkload(teamMemberId: string): Promise<WorkloadData> {
  const sb = requireSupabaseClient();

  // 1. Get team member capacity
  const { data: member, error: memberErr } = await sb
    .from('team_members')
    .select('work_capacity_hours')
    .eq('id', teamMemberId)
    .single();
  if (memberErr) throw memberErr;

  const capacityPerDay = Number(member?.work_capacity_hours) || 8;
  const workingDaysPerMonth = 22;
  const capacityPerMonth = capacityPerDay * workingDaysPerMonth;

  // 2. Get active deliverables assigned to this member
  const { data: deliverables, error: delErr } = await sb
    .from('deliverables')
    .select('id, deliverable_type, status, quantity')
    .eq('assigned_to', teamMemberId)
    .eq('tenant_id', DEMO_TENANT_ID)
    .in('status', ['pending', 'in-progress', 'review']);
  if (delErr) throw delErr;

  // 3. Get hours_per_unit from deliverable_types
  const { data: dtypes } = await sb
    .from('deliverable_types')
    .select('type_key, hours_per_unit')
    .eq('tenant_id', DEMO_TENANT_ID);

  const hoursMap: Record<string, number> = {};
  (dtypes || []).forEach((dt: any) => {
    hoursMap[dt.type_key] = Number(dt.hours_per_unit) || 1;
  });

  // 4. Compute breakdown
  const breakdownMap: Record<string, { count: number; hours: number }> = {};
  let totalEstimatedHours = 0;
  let inProgress = 0;
  let review = 0;
  let pending = 0;

  (deliverables || []).forEach((d: any) => {
    const qty = Number(d.quantity) || 1;
    const hpu = hoursMap[d.deliverable_type] || 1;
    const hours = qty * hpu;
    totalEstimatedHours += hours;

    if (d.status === 'in-progress') inProgress++;
    else if (d.status === 'review') review++;
    else if (d.status === 'pending') pending++;

    if (!breakdownMap[d.deliverable_type]) {
      breakdownMap[d.deliverable_type] = { count: 0, hours: 0 };
    }
    breakdownMap[d.deliverable_type].count += qty;
    breakdownMap[d.deliverable_type].hours += hours;
  });

  const deliverableBreakdown = Object.entries(breakdownMap).map(([type, data]) => ({
    type,
    count: data.count,
    hours: data.hours,
  }));

  const loadPercentage = capacityPerMonth > 0
    ? Math.min(Math.round((totalEstimatedHours / capacityPerMonth) * 100), 100)
    : 0;

  // 5. Update team_members.current_load in DB
  await sb
    .from('team_members')
    .update({
      current_load: loadPercentage,
      active_deliverables: (deliverables || []).length,
    })
    .eq('id', teamMemberId);

  return {
    teamMemberId,
    assignedDeliverables: (deliverables || []).length,
    inProgressCount: inProgress,
    reviewCount: review,
    pendingCount: pending,
    estimatedHours: Math.round(totalEstimatedHours * 10) / 10,
    capacityHoursPerDay: capacityPerDay,
    capacityHoursPerMonth: capacityPerMonth,
    loadPercentage,
    deliverableBreakdown,
  };
}

export async function calculateWorkloadBatch(teamMemberIds: string[]): Promise<WorkloadData[]> {
  const results: WorkloadData[] = [];
  for (const id of teamMemberIds) {
    try {
      const wd = await calculateWorkload(id);
      results.push(wd);
    } catch (e) {
      console.warn(`[calculateWorkloadBatch] Failed for ${id}:`, e);
    }
  }
  return results;
}

// ============================================
// CLIENT → TEAM ASSIGNMENT ENGINE
// ============================================

export interface AssignTeamToClientInput {
  client_id: string;
  team_member_id: string;
  role_type: string;
  assigned_by?: string;
  notes?: string;
}

export async function assignTeamToClient(input: AssignTeamToClientInput) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_assignments')
    .insert({
      ...input,
      tenant_id: DEMO_TENANT_ID,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeClientAssignment(assignmentId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('client_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}

export async function getClientAssignments(clientId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_assignments')
    .select('*, team_members:team_member_id(id, name, avatar, email, primary_role, current_load, status)')
    .eq('client_id', clientId)
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

export async function getAssignmentsByTeamMember(teamMemberId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_assignments')
    .select('*, clients:client_id(id, business_name, category, status, health_score)')
    .eq('team_member_id', teamMemberId)
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

export async function getAvailableTeamMembers(tenantId?: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('team_members')
    .select(`
      *,
      user_skills(skill_name, skill_level),
      team_member_teams(team_id, teams:team_id(id, name, category, color))
    `)
    .eq('tenant_id', tenantId || DEMO_TENANT_ID)
    .order('current_load', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getDefaultAssignmentRules(category: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('default_assignment_rules')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('industry_category', category)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    const { data: fallback } = await sb
      .from('default_assignment_rules')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('industry_category', 'Other')
      .single();
    return fallback;
  }
  return data;
}

export async function addClientToWorkspace(
  clientId: string,
  name: string,
  role: 'client_admin' | 'client_member'
) {
  const sb = requireSupabaseClient();
  const { data: workspace } = await sb
    .from('workspaces')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (!workspace) throw new Error('Workspace not found for this client');

  const { data, error } = await sb
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      name,
      avatar: name.substring(0, 2).toUpperCase(),
      role,
      status: 'online',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// CHANNEL MANAGEMENT (Create, Members)
// ============================================

export interface CreateChannelInput {
  workspace_id: string;
  name: string;
  channel_type: 'open' | 'closed';
  description?: string;
  icon?: string;
  created_by_id: string;
  member_ids?: string[]; // For closed channels
}

export async function createChannel(input: CreateChannelInput) {
  const sb = requireSupabaseClient();
  
  // Create channel
  const { data: channel, error: channelError } = await sb
    .from('channels')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      channel_type: input.channel_type,
      description: input.description,
      icon: input.icon || 'hash',
      type: 'custom',
      created_by_id: input.created_by_id,
    })
    .select()
    .single();

  if (channelError) throw channelError;

  // If closed channel, add specific members
  if (input.channel_type === 'closed' && input.member_ids && input.member_ids.length > 0) {
    const { error: membersError } = await sb
      .from('channel_members')
      .insert(
        input.member_ids.map(userId => ({
          channel_id: channel.id,
          user_profile_id: userId,
          role_in_channel: 'member',
          added_by: input.created_by_id,
        }))
      );
    
    if (membersError) throw membersError;
  }

  return channel;
}

export async function getChannelMembers(channelId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('channel_members')
    .select('*, user_profiles:user_profile_id(id, full_name, avatar, email, role)')
    .eq('channel_id', channelId)
    .order('added_at', { ascending: true });

  if (error) throw error;

  // Dedupe by (channel_id, user_profile_id) to avoid runtime crashes if the table contains duplicates
  // (e.g. if older client code inserted into channel_members without a unique constraint).
  const seen = new Set<string>();
  const deduped = (data || []).filter((row: any) => {
    const key = `${row.channel_id ?? channelId}:${row.user_profile_id ?? row.user_id ?? row.id ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}

export async function addChannelMember(
  channelId: string,
  userProfileId: string,
  addedBy: string,
  roleInChannel: 'admin' | 'member' = 'member'
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('channel_members')
    .insert({
      channel_id: channelId,
      user_profile_id: userProfileId,
      role_in_channel: roleInChannel,
      added_by: addedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeChannelMember(channelId: string, userProfileId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_profile_id', userProfileId);

  if (error) throw error;
}

export async function getAvailableMembersForChannel(workspaceId: string, channelId: string) {
  const sb = requireSupabaseClient();
  
  // Get all workspace members
  const { data: workspaceMembers, error: wmError } = await sb
    .from('workspace_members')
    .select('user_profile_id, name, avatar, role')
    .eq('workspace_id', workspaceId);

  if (wmError) throw wmError;

  // Get current channel members
  const { data: channelMembers, error: cmError } = await sb
    .from('channel_members')
    .select('user_profile_id')
    .eq('channel_id', channelId);

  if (cmError) throw cmError;

  const channelMemberIds = new Set(channelMembers?.map(m => m.user_profile_id) || []);
  
  // Filter out members already in channel
  return (workspaceMembers || []).filter(
    m => m.user_profile_id && !channelMemberIds.has(m.user_profile_id)
  );
}

// ============================================
// QUICK ACTIONS MANAGEMENT
// ============================================

export async function getQuickActions(tenantId?: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('quick_actions')
    .select('*')
    .eq('tenant_id', tenantId || DEMO_TENANT_ID)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export interface CreateQuickActionInput {
  tenant_id?: string;
  action_name: string;
  action_label: string;
  icon: string;
  action_type: 'deliverable' | 'boost' | 'custom' | 'link';
  linked_service_type?: string;
  linked_url?: string;
  color_accent?: string;
  role_access?: string[];
}

export async function createQuickAction(input: CreateQuickActionInput) {
  const sb = requireSupabaseClient();
  
  // Get max display order
  const { data: maxOrder } = await sb
    .from('quick_actions')
    .select('display_order')
    .eq('tenant_id', input.tenant_id || DEMO_TENANT_ID)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await sb
    .from('quick_actions')
    .insert({
      ...input,
      tenant_id: input.tenant_id || DEMO_TENANT_ID,
      display_order: (maxOrder?.display_order || 0) + 1,
      role_access: input.role_access || ['super_admin'],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuickAction(id: string, updates: Partial<CreateQuickActionInput>) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('quick_actions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuickAction(id: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('quick_actions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderQuickActions(tenantId: string, orderedIds: string[]) {
  const sb = requireSupabaseClient();
  
  // Update display_order for each action
  const updates = orderedIds.map((id, index) =>
    sb.from('quick_actions')
      .update({ display_order: index + 1 })
      .eq('id', id)
      .eq('tenant_id', tenantId)
  );

  await Promise.all(updates);
}

// ============================================
// TEAM ASSIGNMENT (DELIVERABLE-LEVEL)
// ============================================

export async function assignTeamMemberToDeliverable(deliverableId: string, teamMemberId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .update({
      assigned_to: teamMemberId,
      status: 'in-progress',
      progress: 30,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliverableId)
    .select()
    .single();

  if (error) throw error;

  // Update team member load
  await sb.rpc('increment_team_member_load', { member_id: teamMemberId }).catch(() => {
    // fallback: manual increment
    sb.from('team_members')
      .update({ active_deliverables: 1 })
      .eq('id', teamMemberId);
  });

  return data;
}

// ============================================
// READ RECEIPTS & CANNED RESPONSES (Messaging Phase 3)
// ============================================

// NOTE: These helpers already exist elsewhere in this file.
// They were temporarily duplicated here and caused runtime errors like:
// "Identifier 'markMessageAsRead' has already been declared".
//
// Keeping this section as a pointer for future maintainers.

// ============================================
// REAL-TIME SUBSCRIPTIONS (Generic)
// ============================================

export function subscribeToTable(
  table: string,
  callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void,
  filter?: string
) {
  if (!supabase) {
    return () => {};
  }

  const config: {
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema: string;
    table: string;
    filter?: string;
  } = {
    event: '*',
    schema: 'public',
    table,
  };

  if (filter) {
    config.filter = filter;
  }

  const channel = supabase
    .channel(`realtime-${table}-${filter || 'all'}`)
    .on('postgres_changes', config, (payload) => {
      callback({
        eventType: payload.eventType,
        new: payload.new as Record<string, unknown>,
        old: payload.old as Record<string, unknown>,
      });
    })
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

// ============================================
// TABLE COUNTS (for Data Source Indicators)
// ============================================

export interface TableCounts {
  clients: number;
  team_members: number;
  demo_users: number;
  packages: number;
  deliverables: number;
  workspaces: number;
  notifications: number;
}

export async function getTableCounts(): Promise<TableCounts> {
  const sb = requireSupabaseClient();
  try {
    const { data, error } = await sb.rpc('get_table_counts', {
      p_tenant_id: DEMO_TENANT_ID,
    });
    if (error) throw error;
    return data as TableCounts;
  } catch {
    // Fallback: individual counts
    const [c, t, d, p, del, w, n] = await Promise.all([
      sb.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
      sb.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
      sb.from('demo_users').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID).eq('is_active', true),
      sb.from('packages').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID).eq('is_active', true),
      sb.from('deliverables').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
      sb.from('workspaces').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
      sb.from('notifications').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
    ]);
    return {
      clients: c.count || 0,
      team_members: t.count || 0,
      demo_users: d.count || 0,
      packages: p.count || 0,
      deliverables: del.count || 0,
      workspaces: w.count || 0,
      notifications: n.count || 0,
    };
  }
}

// ============================================
// SYSTEM HEALTH / DEBUG
// ============================================

export async function getSystemHealth() {
  const sb = requireSupabaseClient();
  const [
    clientsRes,
    deliverablesRes,
    messagesRes,
    campaignsRes,
    packagesRes,
    walletRes,
  ] = await Promise.all([
    sb.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
    sb.from('deliverables').select('id, status').eq('tenant_id', DEMO_TENANT_ID),
    sb.from('messages').select('id', { count: 'exact', head: true }),
    sb.from('campaigns').select('id, status').eq('tenant_id', DEMO_TENANT_ID),
    sb.from('package_usage').select('*, client_packages!inner(clients!inner(tenant_id))'),
    sb.from('client_wallets').select('balance, clients!inner(tenant_id)'),
  ]);

  const deliverables = deliverablesRes.data || [];
  const campaigns = campaignsRes.data || [];
  const usage = packagesRes.data || [];
  const wallets = walletRes.data || [];

  return {
    totalClients: clientsRes.count || 0,
    totalDeliverables: deliverables.length,
    completedDeliverables: deliverables.filter((d: Record<string, unknown>) => d.status === 'delivered').length,
    pendingDeliverables: deliverables.filter((d: Record<string, unknown>) => d.status === 'pending').length,
    totalMessages: messagesRes.count || 0,
    activeCampaigns: campaigns.filter((c: Record<string, unknown>) => c.status === 'live').length,
    totalCampaigns: campaigns.length,
    packageUsageItems: usage.length,
    totalWalletBalance: wallets.reduce((sum: number, w: Record<string, unknown>) => sum + Number(w.balance || 0), 0),
  };
}

// ============================================
// FULL USER MANAGEMENT (Phase 2)
// ============================================

export type CreateFullUserRole = 'super_admin' | 'designer' | 'media_buyer' | 'account_manager' | 'finance' | 'client';

export interface CreateFullUserInput {
  display_name: string;
  email: string;
  password: string;
  role: CreateFullUserRole;
  avatar?: string;
  phone?: string;
  client_id?: string | null;
  primary_role_label?: string;
  team_ids?: string[];
  metadata?: Record<string, string>;
}

export interface CreateFullUserResult {
  demo_user: Record<string, unknown>;
  user_profile: Record<string, unknown>;
  team_member: Record<string, unknown> | null;
  auth_user_id?: string;
}

/**
 * Creates a fully-linked user via Supabase Auth (edge function) with fallback
 * to direct DB insert for backward compatibility.
 *
 * Primary path: calls the `create-user` edge function which:
 * 1. Creates auth.users entry (Supabase Auth)
 * 2. Creates user_profiles
 * 3. Creates user_roles
 * 4. Creates team_members (if staff)
 * 5. Creates workspace_members
 * 6. Creates demo_users (backward compatibility bridge)
 *
 * Fallback path: direct DB insert (for environments without edge functions)
 */
export async function createFullUser(input: CreateFullUserInput): Promise<CreateFullUserResult> {
  const sb = requireSupabaseClient();

  // Try Supabase Auth path via edge function
  try {
    const { data: fnData, error: fnError } = await sb.functions.invoke(
      'supabase-functions-create-user',
      {
        body: {
          email: input.email,
          password: input.password,
          display_name: input.display_name,
          role: input.role,
          tenant_id: DEMO_TENANT_ID,
          avatar: input.avatar,
          phone: input.phone,
          client_id: input.client_id,
          primary_role_label: input.primary_role_label,
          team_ids: input.team_ids,
          metadata: input.metadata,
        },
      }
    );

    if (!fnError && fnData?.success) {
      return {
        demo_user: fnData.demo_user,
        user_profile: fnData.user_profile,
        team_member: fnData.team_member,
        auth_user_id: fnData.auth_user_id,
      };
    }

    // Edge function failed, fall through to direct DB insert
    console.warn('[createFullUser] Edge function failed, using direct DB path:', fnError?.message || fnData?.error);
  } catch (edgeFnErr) {
    console.warn('[createFullUser] Edge function unavailable, using direct DB path:', edgeFnErr);
  }

  // Fallback: Direct DB insert (no Supabase Auth user created)

  // 1. Create user_profile
  const { data: profile, error: profileErr } = await sb
    .from('user_profiles')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      full_name: input.display_name,
      email: input.email.toLowerCase().trim(),
      avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
      phone: input.phone || null,
      status: 'active',
    })
    .select()
    .single();

  if (profileErr) throw profileErr;

  // 2. Assign role in user_roles table
  // Find or create the role entry
  const { data: roleData } = await sb
    .from('roles')
    .select('id')
    .eq('tenant_id', DEMO_TENANT_ID)
    .ilike('name', `%${getRoleName(input.role)}%`)
    .limit(1)
    .single();

  if (roleData) {
    await sb.from('user_roles').insert({
      user_id: profile.id,
      role_id: roleData.id,
    }).then(() => {
      // Update role user_count
      sb.from('roles')
        .update({ user_count: (roleData as any).user_count ? (roleData as any).user_count + 1 : 1 })
        .eq('id', roleData.id);
    });
  }

  // 3. Create team_member (for non-client roles)
  let teamMember: Record<string, unknown> | null = null;
  if (input.role !== 'client') {
    const { data: member, error: memberErr } = await sb
      .from('team_members')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        user_profile_id: profile.id,
        name: input.display_name,
        email: input.email.toLowerCase().trim(),
        avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
        primary_role: input.primary_role_label || getRoleName(input.role),
        secondary_roles: [],
        work_capacity_hours: 8,
        status: 'online',
        current_load: 0,
        active_deliverables: 0,
        boost_campaigns: 0,
        tasks_completed_this_month: 0,
        join_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (memberErr) throw memberErr;
    teamMember = member;

    // Link to teams
    if (input.team_ids && input.team_ids.length > 0) {
      const teamLinks = input.team_ids.map((teamId) => ({
        team_member_id: member.id,
        team_id: teamId,
      }));
      await sb.from('team_member_teams').insert(teamLinks);
    }

    // Add to all client workspaces as a workspace member
    const { data: workspaces } = await sb
      .from('workspaces')
      .select('id')
      .eq('tenant_id', DEMO_TENANT_ID);

    if (workspaces && workspaces.length > 0) {
      const wsMembers = workspaces.map((ws: any) => ({
        workspace_id: ws.id,
        user_profile_id: profile.id,
        name: input.display_name,
        avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
        role: input.role === 'super_admin' ? 'admin' : 'member',
        status: 'online',
      }));
      // Use upsert to avoid duplicates
      await sb.from('workspace_members').upsert(wsMembers, { onConflict: 'workspace_id,user_profile_id' });
    }
  }

  // 4. Create demo_users entry (login)
  const { data: demoUser, error: demoErr } = await sb
    .from('demo_users')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      email: input.email.toLowerCase().trim(),
      password_hash: input.password,
      display_name: input.display_name,
      role: input.role,
      avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
      client_id: input.client_id || null,
      user_profile_id: profile.id,
      team_member_id: teamMember ? (teamMember as any).id : null,
      metadata: input.metadata || {},
      is_active: true,
    })
    .select()
    .single();

  if (demoErr) throw demoErr;

  // 5. Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'user_created',
    title: `New User: ${input.display_name}`,
    description: `${getRoleName(input.role)} account created`,
    timestamp: new Date().toISOString(),
    metadata: { email: input.email, role: input.role },
  });

  return { demo_user: demoUser, user_profile: profile, team_member: teamMember };
}

function getRoleName(role: CreateFullUserRole): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'designer': return 'Designer';
    case 'media_buyer': return 'Media Buyer';
    case 'account_manager': return 'Account Manager';
    case 'finance': return 'Finance';
    case 'client': return 'Client';
    default: return role;
  }
}

/**
 * Deactivate a user across all linked tables.
 */
export async function deactivateUser(demoUserId: string) {
  const sb = requireSupabaseClient();

  // Get the demo user to find linked IDs
  const { data: demoUser, error } = await sb
    .from('demo_users')
    .select('*')
    .eq('id', demoUserId)
    .single();

  if (error) throw error;

  // Deactivate demo_users entry
  await sb.from('demo_users').update({ is_active: false }).eq('id', demoUserId);

  // Deactivate user_profile
  if (demoUser.user_profile_id) {
    await sb.from('user_profiles').update({ status: 'inactive', updated_at: new Date().toISOString() }).eq('id', demoUser.user_profile_id);
  }

  // Set team member offline
  if (demoUser.team_member_id) {
    await sb.from('team_members').update({ status: 'offline' }).eq('id', demoUser.team_member_id);
  }

  return demoUser;
}

/**
 * Reactivate a user.
 */
export async function reactivateUser(demoUserId: string) {
  const sb = requireSupabaseClient();

  const { data: demoUser, error } = await sb
    .from('demo_users')
    .select('*')
    .eq('id', demoUserId)
    .single();

  if (error) throw error;

  await sb.from('demo_users').update({ is_active: true }).eq('id', demoUserId);

  if (demoUser.user_profile_id) {
    await sb.from('user_profiles').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', demoUser.user_profile_id);
  }

  if (demoUser.team_member_id) {
    await sb.from('team_members').update({ status: 'online' }).eq('id', demoUser.team_member_id);
  }

  return demoUser;
}

/**
 * Get all users with their linked profiles.
 */
export async function getAllUsers() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('demo_users')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all users with detailed linked data (profile, team member, roles).
 */
export async function getAllUsersDetailed(): Promise<DetailedUser[]> {
  const sb = requireSupabaseClient();

  const { data: demoUsers, error } = await sb
    .from('demo_users')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!demoUsers || demoUsers.length === 0) return [];

  // Fetch linked profiles
  const profileIds = demoUsers.map((u: any) => u.user_profile_id).filter(Boolean);
  let profiles: Record<string, any> = {};
  if (profileIds.length > 0) {
    const { data: profileData } = await sb
      .from('user_profiles')
      .select('*, user_roles(role:roles(name))')
      .in('id', profileIds);

    if (profileData) {
      profiles = profileData.reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
    }
  }

  // Fetch linked team members
  const tmIds = demoUsers.map((u: any) => u.team_member_id).filter(Boolean);
  let teamMembers: Record<string, any> = {};
  if (tmIds.length > 0) {
    const { data: tmData } = await sb
      .from('team_members')
      .select('*')
      .in('id', tmIds);

    if (tmData) {
      teamMembers = tmData.reduce((acc: any, t: any) => { acc[t.id] = t; return acc; }, {});
    }
  }

  return demoUsers.map((du: any) => {
    const profile = du.user_profile_id ? profiles[du.user_profile_id] : null;
    const tm = du.team_member_id ? teamMembers[du.team_member_id] : null;
    const userRoles = profile?.user_roles || [];
    const roleName = userRoles.length > 0
      ? userRoles[0]?.role?.name || getRoleName(du.role)
      : getRoleName(du.role);

    return {
      id: du.id,
      email: du.email,
      display_name: du.display_name,
      role: du.role,
      role_label: roleName,
      avatar: du.avatar || '',
      is_active: du.is_active ?? true,
      client_id: du.client_id,
      user_profile_id: du.user_profile_id,
      team_member_id: du.team_member_id,
      last_login_at: du.last_login_at || null,
      password_changed_at: du.password_changed_at || null,
      created_at: du.created_at,
      profile_status: profile?.status || (du.is_active ? 'active' : 'inactive'),
      team_member_status: tm?.status || null,
      team_member_name: tm?.name || null,
      team_member_role: tm?.primary_role || null,
      has_profile: !!du.user_profile_id,
      has_team_member: !!du.team_member_id,
    };
  });
}

export interface DetailedUser {
  id: string;
  email: string;
  display_name: string;
  role: CreateFullUserRole;
  role_label: string;
  avatar: string;
  is_active: boolean;
  client_id: string | null;
  user_profile_id: string | null;
  team_member_id: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  profile_status: string;
  team_member_status: string | null;
  team_member_name: string | null;
  team_member_role: string | null;
  has_profile: boolean;
  has_team_member: boolean;
}

/**
 * Update a user's info across all linked tables.
 */
export async function updateUser(demoUserId: string, updates: {
  display_name?: string;
  email?: string;
  role?: CreateFullUserRole;
  phone?: string;
  avatar?: string;
}) {
  const sb = requireSupabaseClient();

  // Get current demo user
  const { data: du, error: fetchErr } = await sb
    .from('demo_users')
    .select('*')
    .eq('id', demoUserId)
    .single();

  if (fetchErr) throw fetchErr;

  // Update demo_users
  const demoUpdate: any = {};
  if (updates.display_name) demoUpdate.display_name = updates.display_name;
  if (updates.email) demoUpdate.email = updates.email.toLowerCase().trim();
  if (updates.role) demoUpdate.role = updates.role;
  if (updates.avatar) demoUpdate.avatar = updates.avatar;

  if (Object.keys(demoUpdate).length > 0) {
    const { error } = await sb.from('demo_users').update(demoUpdate).eq('id', demoUserId);
    if (error) throw error;
  }

  // Update user_profile
  if (du.user_profile_id) {
    const profileUpdate: any = {};
    if (updates.display_name) profileUpdate.full_name = updates.display_name;
    if (updates.email) profileUpdate.email = updates.email.toLowerCase().trim();
    if (updates.phone) profileUpdate.phone = updates.phone;
    if (updates.avatar) profileUpdate.avatar = updates.avatar;
    profileUpdate.updated_at = new Date().toISOString();

    if (Object.keys(profileUpdate).length > 1) {
      await sb.from('user_profiles').update(profileUpdate).eq('id', du.user_profile_id);
    }
  }

  // Update team_member
  if (du.team_member_id) {
    const tmUpdate: any = {};
    if (updates.display_name) tmUpdate.name = updates.display_name;
    if (updates.email) tmUpdate.email = updates.email.toLowerCase().trim();
    if (updates.avatar) tmUpdate.avatar = updates.avatar;
    if (updates.role) tmUpdate.primary_role = getRoleName(updates.role);

    if (Object.keys(tmUpdate).length > 0) {
      await sb.from('team_members').update(tmUpdate).eq('id', du.team_member_id);
    }
  }

  // Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'user_updated',
    title: `User Updated: ${updates.display_name || du.display_name}`,
    description: `Account info updated`,
    timestamp: new Date().toISOString(),
    metadata: { user_id: demoUserId },
  });

  return du;
}

/**
 * Reset a user's password.
 * Tries Supabase Auth first (via edge function), falls back to demo_users direct update.
 */
export async function resetUserPassword(demoUserId: string, newPassword: string) {
  const sb = requireSupabaseClient();

  // Check if user has auth_user_id (migrated to Supabase Auth)
  const { data: du } = await sb
    .from('demo_users')
    .select('auth_user_id')
    .eq('id', demoUserId)
    .single();

  if (du?.auth_user_id) {
    // Use edge function to reset via Supabase Auth admin API
    try {
      const { data: fnData, error: fnError } = await sb.functions.invoke(
        'supabase-functions-create-user',
        {
          body: {
            action: 'reset-password',
            auth_user_id: du.auth_user_id,
            new_password: newPassword,
          },
        }
      );

      if (!fnError && fnData?.success) {
        // Also update demo_users timestamp
        await sb.from('demo_users').update({
          password_changed_at: new Date().toISOString(),
        }).eq('id', demoUserId);

        // Log activity
        await sb.from('activities').insert({
          tenant_id: DEMO_TENANT_ID,
          type: 'password_reset',
          title: 'Password Reset (Auth)',
          description: 'Password was reset via Supabase Auth',
          timestamp: new Date().toISOString(),
          metadata: { user_id: demoUserId },
        });

        return;
      }
    } catch {
      console.warn('[resetUserPassword] Edge function failed, falling back to direct update');
    }
  }

  // Fallback: direct demo_users password update
  const { error } = await sb
    .from('demo_users')
    .update({
      password_hash: newPassword,
      password_changed_at: new Date().toISOString(),
    })
    .eq('id', demoUserId);

  if (error) throw error;

  // Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'password_reset',
    title: 'Password Reset',
    description: `Password was reset for user`,
    timestamp: new Date().toISOString(),
    metadata: { user_id: demoUserId },
  });
}

/**
 * Permanently delete a user and all linked records.
 */
export async function deleteUser(demoUserId: string) {
  const sb = requireSupabaseClient();

  // Get demo user
  const { data: du, error: fetchErr } = await sb
    .from('demo_users')
    .select('*')
    .eq('id', demoUserId)
    .single();

  if (fetchErr) throw fetchErr;

  // Delete workspace_members entries
  if (du.user_profile_id) {
    await sb.from('workspace_members').delete().eq('user_profile_id', du.user_profile_id);
  }

  // Delete user_roles entries
  if (du.user_profile_id) {
    await sb.from('user_roles').delete().eq('user_id', du.user_profile_id);
  }

  // Delete team_member_teams entries
  if (du.team_member_id) {
    await sb.from('team_member_teams').delete().eq('team_member_id', du.team_member_id);
  }

  // Delete team_member
  if (du.team_member_id) {
    await sb.from('team_members').delete().eq('id', du.team_member_id);
  }

  // Delete user_profile
  if (du.user_profile_id) {
    await sb.from('user_profiles').delete().eq('id', du.user_profile_id);
  }

  // Delete demo_user
  await sb.from('demo_users').delete().eq('id', demoUserId);

  // Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'user_deleted',
    title: `User Deleted: ${du.display_name}`,
    description: `Account and all linked data permanently removed`,
    timestamp: new Date().toISOString(),
    metadata: { email: du.email, role: du.role },
  });

  return du;
}

// ============================================
// USER INVITATIONS
// ============================================

export interface InviteUserInput {
  email: string;
  display_name: string;
  role: CreateFullUserRole;
  metadata?: Record<string, string>;
}

export interface UserInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  display_name: string;
  invited_by: string | null;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Send a user invitation via edge function.
 */
export async function inviteUser(input: InviteUserInput): Promise<UserInvitation> {
  const sb = requireSupabaseClient();

  const { data, error } = await sb.functions.invoke(
    'supabase-functions-create-user',
    {
      body: {
        action: 'invite',
        email: input.email,
        display_name: input.display_name,
        role: input.role,
        tenant_id: DEMO_TENANT_ID,
        metadata: input.metadata || {},
      },
    }
  );

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Failed to send invitation');
  }

  return data.invitation;
}

/**
 * Accept a user invitation.
 */
export async function acceptInvitation(token: string, password: string): Promise<{ success: boolean; auth_user_id?: string }> {
  const sb = requireSupabaseClient();

  const { data, error } = await sb.functions.invoke(
    'supabase-functions-create-user',
    {
      body: { action: 'accept-invitation', token, password },
    }
  );

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Failed to accept invitation');
  }

  return { success: true, auth_user_id: data.auth_user_id };
}

/**
 * Get all invitations for the current tenant.
 */
export async function getInvitations(): Promise<UserInvitation[]> {
  const sb = requireSupabaseClient();

  const { data, error } = await sb
    .from('user_invitations')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as UserInvitation[];
}

/**
 * Cancel an invitation.
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const sb = requireSupabaseClient();

  const { error } = await sb
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (error) throw error;
}

/**
 * Migrate a demo user to Supabase Auth.
 */
export async function migrateDemoUser(demoUserId: string, password?: string): Promise<{ auth_user_id: string }> {
  const sb = requireSupabaseClient();

  const { data, error } = await sb.functions.invoke(
    'supabase-functions-create-user',
    {
      body: { action: 'migrate-demo-user', demo_user_id: demoUserId, password },
    }
  );

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Migration failed');
  }

  return { auth_user_id: data.auth_user_id };
}

// ============================================
// CLIENT ONBOARDING ENGINE (Complete Transactional Flow)
// ============================================

export interface CreateFullClientInput {
  // Step 1: Business Info (matches Google Form: প্রতিষ্ঠানের তথ্য)
  business_name: string;
  category?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_website?: string;
  // Owner Info (Google Form: মালিকের তথ্য)
  owner_name?: string;
  owner_phone?: string;
  // Manager/Contact Person (Google Form: ম্যানেজার/যোগাযোগকারীর তথ্য)
  manager_name?: string;
  manager_phone?: string;
  // Step 2: Package Selection (Google Form: প্যাকেজ)
  package_id?: string;
  // Step 3: Boost Budget (Google Form: ফেসবুক বুস্ট বাজেট)
  monthly_boost_budget?: number;
  boost_budget_currency?: string;
  // Step 4: Team Assignment
  account_manager_id?: string;
  // Step 5: Portal Access
  create_login?: boolean;
  login_password?: string;
  // Referral (Google Form: রেফারকারীর নাম)
  referrer_name?: string;
  // Notes
  onboarding_notes?: string;
}

/** Backward-compatible alias */
export type OnboardClientInput = CreateFullClientInput;

export interface CreateFullClientResult {
  client: Record<string, unknown>;
  wallet: Record<string, unknown> | null;
  workspace: Record<string, unknown> | null;
  channels: Record<string, unknown>[];
  demo_user: Record<string, unknown> | null;
  client_package: Record<string, unknown> | null;
  client_package_features: Record<string, unknown>[];
  activity: Record<string, unknown> | null;
  notification: Record<string, unknown> | null;
  steps_completed: string[];
  errors: string[];
}

/** Backward-compatible alias */
export type OnboardClientResult = CreateFullClientResult;

/**
 * createFullClient — Complete Client Onboarding Engine
 *
 * Transactional flow that executes ALL 7 steps:
 *   1. Insert into clients table (triggers auto-create wallet + workspace + channels)
 *   2. Fetch auto-created resources (wallet, workspace, channels)
 *   3. Assign account manager to workspace
 *   4. Optionally create client login user (demo_user + user_profile)
 *   5. Assign package + initialize package_usage + copy client_package_features
 *   6. Insert onboarding activity log entry
 *   7. Send notification to admin
 *
 * Non-critical steps (3-7) use graceful degradation — if one fails, others continue.
 * The `steps_completed` array shows which steps succeeded.
 * The `errors` array captures any non-critical failures.
 */
export async function createFullClient(input: CreateFullClientInput): Promise<CreateFullClientResult> {
  const sb = requireSupabaseClient();
  const errors: string[] = [];
  const stepsCompleted: string[] = [];

  // Build metadata for extra fields from the onboarding form
  const metadata: Record<string, unknown> = {};
  if (input.owner_name) metadata.owner_name = input.owner_name;
  if (input.owner_phone) metadata.owner_phone = input.owner_phone;
  if (input.manager_name) metadata.manager_name = input.manager_name;
  if (input.manager_phone) metadata.manager_phone = input.manager_phone;
  if (input.monthly_boost_budget) metadata.monthly_boost_budget = input.monthly_boost_budget;
  if (input.boost_budget_currency) metadata.boost_budget_currency = input.boost_budget_currency;
  if (input.referrer_name) metadata.referrer_name = input.referrer_name;
  if (input.onboarding_notes) metadata.onboarding_notes = input.onboarding_notes;

  // ─────────────────────────────────────────────────
  // STEP 1: Create client record
  //   DB triggers auto-create: client_wallet, workspace, default channels
  // ─────────────────────────────────────────────────
  const { data: client, error: clientErr } = await sb
    .from('clients')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      business_name: input.business_name,
      category: input.category || 'Other',
      location: input.location || null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone || input.owner_phone || null,
      contact_website: input.contact_website || null,
      account_manager_id: input.account_manager_id || null,
      status: 'active',
      health_score: 100,
      owner_name: input.owner_name || null,
      owner_phone: input.owner_phone || null,
      manager_name: input.manager_name || null,
      manager_phone: input.manager_phone || null,
      monthly_boost_budget: input.monthly_boost_budget || 0,
      boost_budget_currency: input.boost_budget_currency || 'USD',
      referrer_name: input.referrer_name || null,
      onboarding_notes: input.onboarding_notes || null,
      onboarded_at: new Date().toISOString(),
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    })
    .select()
    .single();

  if (clientErr) throw new Error(`[Step 1] Client creation failed: ${clientErr.message}`);
  stepsCompleted.push('client_created');

  // Small delay to let DB triggers complete (wallet + workspace + channels)
  await new Promise((r) => setTimeout(r, 600));

  // ─────────────────────────────────────────────────
  // STEP 2: Fetch auto-created resources
  // ─────────────────────────────────────────────────
  const { data: wallet } = await sb
    .from('client_wallets')
    .select('*')
    .eq('client_id', client.id)
    .single();

  if (wallet) stepsCompleted.push('wallet_created');

  const { data: workspace } = await sb
    .from('workspaces')
    .select('*')
    .eq('client_id', client.id)
    .single();

  if (workspace) stepsCompleted.push('workspace_created');

  let channels: Record<string, unknown>[] = [];
  if (workspace) {
    const { data: chans } = await sb
      .from('channels')
      .select('*')
      .eq('workspace_id', workspace.id);
    channels = chans || [];
    if (channels.length > 0) stepsCompleted.push(`channels_created(${channels.length})`);
  }

  // ─────────────────────────────────────────────────
  // STEP 3: Assign account manager to workspace + channels
  // ─────────────────────────────────────────────────
  if (workspace && input.account_manager_id) {
    try {
      const { data: manager } = await sb
        .from('team_members')
        .select('id, name, avatar, user_profile_id')
        .eq('id', input.account_manager_id)
        .single();

      if (manager && manager.user_profile_id) {
        // Add to workspace_members
        const { error: memberErr } = await sb.from('workspace_members').upsert({
          workspace_id: workspace.id,
          user_profile_id: manager.user_profile_id,
          name: manager.name,
          avatar: manager.avatar || '',
          role: 'admin',
          status: 'online',
        }, { onConflict: 'workspace_id,user_profile_id' });

        if (memberErr) {
          errors.push(`Account manager workspace assignment failed: ${memberErr.message}`);
        } else {
          stepsCompleted.push('account_manager_assigned_to_workspace');

          // Add to all channels in the workspace
          if (channels.length > 0) {
            let channelsAssigned = 0;
            for (const channel of channels) {
              try {
                const { error: channelErr } = await sb
                  .from('channel_members')
                  .upsert({
                    channel_id: channel.id,
                    user_profile_id: manager.user_profile_id,
                    role_in_channel: 'admin',
                    added_by: manager.user_profile_id,
                  }, { onConflict: 'channel_id,user_profile_id' });

                if (!channelErr) {
                  channelsAssigned++;
                }
              } catch (e) {
                // Continue to next channel on error
                console.warn(`Failed to assign manager to channel ${channel.id}`);
              }
            }
            
            if (channelsAssigned > 0) {
              stepsCompleted.push(`account_manager_assigned_to_channels(${channelsAssigned})`);
            }
          }
        }
      } else {
        errors.push('Account manager not found or missing user_profile_id');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Account manager assignment failed: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────
  // STEP 4: Create client login account (if requested)
  // ─────────────────────────────────────────────────
  let demoUser: Record<string, unknown> | null = null;
  if (input.create_login && input.contact_email) {
    try {
      const result = await createFullUser({
        display_name: input.business_name,
        email: input.contact_email,
        password: input.login_password || '123456',
        role: 'client',
        client_id: client.id,
        metadata: {
          business_name: input.business_name,
          category: input.category || 'Other',
        },
      });
      demoUser = result.demo_user;
      stepsCompleted.push('client_login_created');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[createFullClient] Could not create client login:', msg);
      errors.push(`Client login creation failed: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────
  // STEP 5: Assign package + init usage + copy features
  // ─────────────────────────────────────────────────
  let clientPackage: Record<string, unknown> | null = null;
  let clientPkgFeatures: Record<string, unknown>[] = [];

  if (input.package_id) {
    try {
      // 5a. Deactivate any existing active packages for this client
      await sb
        .from('client_packages')
        .update({ status: 'expired', is_active: false })
        .eq('client_id', client.id)
        .eq('status', 'active');

      // 5b. Create new client_package entry
      const { data: cp, error: cpErr } = await sb
        .from('client_packages')
        .insert({
          client_id: client.id,
          package_id: input.package_id,
          status: 'active',
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (cpErr) {
        console.warn('[createFullClient] Package assignment failed:', cpErr.message);
        errors.push(`Package assignment failed: ${cpErr.message}`);
      } else {
        clientPackage = cp;
        stepsCompleted.push('package_assigned');

        // 5c. DB trigger auto_init_package_usage handles package_usage rows
        // Wait a moment for the trigger to run
        await new Promise((r) => setTimeout(r, 200));

        // Verify usage rows were created
        const { data: usageRows } = await sb
          .from('package_usage')
          .select('id')
          .eq('client_package_id', cp.id);

        if (usageRows && usageRows.length > 0) {
          stepsCompleted.push(`package_usage_initialized(${usageRows.length})`);
        }

        // 5d. Copy package_features to client_package_features
        try {
          const { data: features } = await sb
            .from('package_features')
            .select('*')
            .eq('package_id', input.package_id);

          if (features && features.length > 0) {
            const featureRows = features.map((f: Record<string, unknown>) => ({
              client_package_id: cp.id,
              deliverable_type: f.deliverable_type,
              label: f.label,
              icon: f.icon || 'package',
              total_allocated: f.total_allocated || 0,
              unit_label: f.unit_label || 'units',
              warning_threshold: f.warning_threshold || 20,
              auto_deduction: f.auto_deduction !== false,
            }));

            const { data: insertedFeatures, error: featErr } = await sb
              .from('client_package_features')
              .insert(featureRows)
              .select();

            if (featErr) {
              console.warn('[createFullClient] Could not copy package features:', featErr.message);
              errors.push(`Package features copy failed: ${featErr.message}`);
            } else {
              clientPkgFeatures = insertedFeatures || [];
              stepsCompleted.push(`package_features_copied(${clientPkgFeatures.length})`);
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn('[createFullClient] Could not copy package features:', msg);
          errors.push(`Package features copy failed: ${msg}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[createFullClient] Package assignment failed:', msg);
      errors.push(`Package assignment failed: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────
  // STEP 6: Insert onboarding activity log entry
  // ─────────────────────────────────────────────────
  let activity: Record<string, unknown> | null = null;
  try {
    const { data: act, error: actErr } = await sb
      .from('activities')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        client_id: client.id,
        type: 'client_onboarded',
        title: `New client onboarded: ${input.business_name}`,
        description: `Client "${input.business_name}" was successfully onboarded.${input.package_id ? ' Package assigned.' : ''}${input.account_manager_id ? ' Account manager assigned.' : ''}${input.create_login ? ' Portal login created.' : ''}`,
        entity_type: 'client',
        entity_id: client.id,
        metadata: {
          category: input.category || 'Other',
          package_id: input.package_id || null,
          account_manager_id: input.account_manager_id || null,
          created_login: !!input.create_login,
          workspace_id: workspace?.id || null,
          wallet_id: wallet?.id || null,
          channels_count: channels.length,
          steps_completed: stepsCompleted,
          errors_count: errors.length,
        },
      })
      .select()
      .single();

    if (actErr) {
      console.warn('[createFullClient] Activity log failed:', actErr.message);
      errors.push(`Activity log failed: ${actErr.message}`);
    } else {
      activity = act;
      stepsCompleted.push('activity_logged');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[createFullClient] Activity log failed:', msg);
    errors.push(`Activity log failed: ${msg}`);
  }

  // ─────────────────────────────────────────────────
  // STEP 7: Send notification to admin
  // ─────────────────────────────────────────────────
  let notification: Record<string, unknown> | null = null;
  try {
    const notifMessage = [
      `${input.business_name} has been onboarded successfully.`,
      input.package_id ? '📦 Package assigned.' : '⚠️ No package assigned yet.',
      input.account_manager_id ? '👤 Account manager set.' : '⚠️ Account manager not assigned.',
      input.create_login ? '🔑 Client portal login created.' : '',
      errors.length > 0 ? `⚠️ ${errors.length} non-critical issue(s) during onboarding.` : '',
    ].filter(Boolean).join(' ');

    const { data: notif, error: notifErr } = await sb
      .from('notifications')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        type: 'client_onboarded',
        category: 'client',
        title: `New Client: ${input.business_name}`,
        message: notifMessage,
        priority: 'high',
        read: false,
        action_url: `/clients/${client.id}`,
        metadata: {
          client_id: client.id,
          business_name: input.business_name,
          category: input.category || 'Other',
          package_id: input.package_id || null,
          account_manager_id: input.account_manager_id || null,
          steps_completed: stepsCompleted,
        },
      })
      .select()
      .single();

    if (notifErr) {
      console.warn('[createFullClient] Notification creation failed:', notifErr.message);
      errors.push(`Notification creation failed: ${notifErr.message}`);
    } else {
      notification = notif;
      stepsCompleted.push('notification_sent');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[createFullClient] Notification creation failed:', msg);
    errors.push(`Notification creation failed: ${msg}`);
  }

  // Log summary for debugging
  if (errors.length > 0) {
    console.warn(`[createFullClient] Completed with ${errors.length} non-critical error(s):`, errors);
  }
  console.info(`[createFullClient] Steps completed (${stepsCompleted.length}):`, stepsCompleted);

  return {
    client,
    wallet,
    workspace,
    channels,
    demo_user: demoUser,
    client_package: clientPackage,
    client_package_features: clientPkgFeatures,
    activity,
    notification,
    steps_completed: stepsCompleted,
    errors,
  };
}

/**
 * onboardClient — Backward-compatible alias for createFullClient
 */
export const onboardClient = createFullClient;

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================

/**
 * Create a notification entry. Reusable helper for any module.
 */
export async function createNotification(input: {
  type: string;
  title: string;
  message: string;
  user_id?: string | null;
  action_url?: string;
  metadata?: Record<string, unknown>;
}) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('notifications')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      type: input.type,
      title: input.title,
      message: input.message,
      user_id: input.user_id || null,
      action_url: input.action_url || null,
      read: false,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create an activity log entry. Reusable helper for any module.
 */
export async function createActivityLog(input: {
  type: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
  metadata?: Record<string, unknown>;
}) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('activities')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      type: input.type,
      title: input.title,
      description: input.description || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      user_id: input.user_id || null,
      user_name: input.user_name || null,
      user_avatar: input.user_avatar || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('read', false);

  if (error) throw error;
}

export async function deleteNotification(notificationId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

export async function clearAllNotifications() {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('notifications')
    .delete()
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('read', true);

  if (error) throw error;
}

// ============================================
// DASHBOARD CUSTOMIZATION
// ============================================

export interface DashboardWidget {
  id: string;
  visible: boolean;
  order: number;
  size?: 'small' | 'medium' | 'large';
  gridArea?: string;
}

export interface DashboardLayout {
  id: string;
  user_profile_id: string;
  tenant_id: string;
  widgets: DashboardWidget[];
  layout_type: 'grid' | 'list' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_profile_id: string;
  tenant_id: string;
  email_enabled: boolean;
  email_frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  push_enabled: boolean;
  categories: {
    client: boolean;
    team: boolean;
    financial: boolean;
    deliverable: boolean;
    system: boolean;
    assignment: boolean;
    message: boolean;
  };
  dnd_enabled: boolean;
  dnd_start_time?: string;
  dnd_end_time?: string;
  created_at: string;
  updated_at: string;
}

export async function getDashboardLayout(userProfileId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('dashboard_layouts')
    .select('*')
    .eq('user_profile_id', userProfileId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data as DashboardLayout | null;
}

export async function saveDashboardLayout(
  userProfileId: string,
  tenantId: string,
  widgets: DashboardWidget[],
  layoutType: 'grid' | 'list' | 'custom' = 'grid'
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('dashboard_layouts')
    .upsert({
      user_profile_id: userProfileId,
      tenant_id: tenantId,
      widgets,
      layout_type: layoutType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DashboardLayout;
}

export async function resetDashboardLayout(userProfileId: string) {
  const sb = requireSupabaseClient();
  const defaultWidgets: DashboardWidget[] = [
    { id: 'hero-metrics', visible: true, order: 0, size: 'large' },
    { id: 'activity-feed', visible: true, order: 1, size: 'medium' },
    { id: 'quick-actions', visible: true, order: 2, size: 'small' },
    { id: 'ai-insights', visible: true, order: 3, size: 'medium' },
    { id: 'projects-kanban', visible: true, order: 4, size: 'large' },
    { id: 'financial-pulse', visible: true, order: 5, size: 'medium' },
  ];

  const { data, error } = await sb
    .from('dashboard_layouts')
    .update({ widgets: defaultWidgets, layout_type: 'grid' })
    .eq('user_profile_id', userProfileId)
    .select()
    .single();

  if (error) throw error;
  return data as DashboardLayout;
}

export async function getNotificationPreferences(userProfileId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('notification_preferences')
    .select('*')
    .eq('user_profile_id', userProfileId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as NotificationPreferences | null;
}

export async function saveNotificationPreferences(
  userProfileId: string,
  tenantId: string,
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_profile_id' | 'tenant_id' | 'created_at' | 'updated_at'>>
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('notification_preferences')
    .upsert({
      user_profile_id: userProfileId,
      tenant_id: tenantId,
      ...preferences,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

// ============================================
// REFRESH DASHBOARD METRICS
// ============================================

export async function refreshDashboardMetrics() {
  const sb = requireSupabaseClient();
  const { error } = await sb.rpc('refresh_dashboard_metrics', {
    p_tenant_id: DEMO_TENANT_ID,
  });

  if (error) {
    console.warn('Could not refresh metrics via RPC:', error.message);
  }
}

// ============================================
// PHASE 3: MESSAGING ENHANCEMENTS
// ============================================

// Typing Indicators
export async function sendTypingIndicator(channelId: string, userId: string, workspaceId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('typing_indicators').upsert({
    channel_id: channelId,
    user_profile_id: userId,
    workspace_id: workspaceId,
    expires_at: new Date(Date.now() + 5000).toISOString(),
  });

  if (error) throw error;
  return data;
}

export async function clearTypingIndicator(channelId: string, userId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('typing_indicators')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_profile_id', userId);

  if (error) throw error;
}

export function subscribeToTypingIndicators(
  channelId: string,
  callback: (users: string[]) => void
) {
  const sb = requireSupabaseClient();
  return sb
    .channel(`typing:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `channel_id=eq.${channelId}`,
      },
      async () => {
        const { data } = await sb
          .from('typing_indicators')
          .select('user_profile_id')
          .eq('channel_id', channelId)
          .gt('expires_at', new Date().toISOString());
        
        const userIds = data?.map(d => d.user_profile_id) || [];
        callback(userIds);
      }
    )
    .subscribe();
}

// Read Receipts (Phase 3 schema)
export async function markMessageAsReadV2(
  messageId: string,
  readerProfileId: string,
  channelId: string
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('message_read_receipts').upsert({
    message_id: messageId,
    reader_profile_id: readerProfileId,
    channel_id: channelId,
  });

  if (error) throw error;
  return data;
}

export async function getReadReceipts(messageId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('message_read_receipts')
    .select('reader_profile_id, read_at')
    .eq('message_id', messageId)
    .order('read_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// CHANNEL ACCESS VALIDATION
// ============================================

export async function validateChannelAccess(channelId: string, userProfileId: string): Promise<boolean> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('validate_channel_access', {
    p_channel_id: channelId,
    p_user_profile_id: userProfileId,
  });

  if (error) {
    console.warn('Channel access validation failed:', error);
    return true; // graceful fallback — allow access on error
  }
  return data === true;
}

// ============================================
// MARK CHANNEL AS READ (batch read receipts)
// ============================================

export async function markChannelAsRead(channelId: string, readerProfileId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb.rpc('mark_channel_as_read', {
    p_channel_id: channelId,
    p_reader_profile_id: readerProfileId,
  });

  if (error) throw error;
}

// ============================================
// SUBSCRIBE TO READ RECEIPTS (realtime)
// ============================================

export function subscribeToReadReceipts(
  channelId: string,
  callback: (receipt: { message_id: string; reader_profile_id: string; read_at: string }) => void
) {
  const sb = requireSupabaseClient();
  const channel = sb
    .channel(`read-receipts:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        callback({
          message_id: payload.new.message_id as string,
          reader_profile_id: payload.new.reader_profile_id as string,
          read_at: payload.new.read_at as string,
        });
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

// ============================================
// SUBSCRIBE TO NOTIFICATIONS (realtime)
// ============================================

export function subscribeToNotifications(
  userId: string,
  callback: (notification: Record<string, unknown>) => void
) {
  const sb = requireSupabaseClient();
  const channel = sb
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Record<string, unknown>);
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

// Message Search
export async function searchMessages(channelId: string, query: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('search_messages', {
    p_channel_id: channelId,
    p_search_query: query,
  });

  if (error) throw error;
  return data || [];
}

// Thread Messages
export async function createThreadReply(
  parentMessageId: string,
  messageId: string,
  channelId: string
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('thread_messages').insert({
    thread_parent_id: parentMessageId,
    message_id: messageId,
    channel_id: channelId,
  });

  if (error) throw error;
  return data;
}

export async function getThreadReplies(parentMessageId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('thread_messages')
    .select('message_id')
    .eq('thread_parent_id', parentMessageId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getThreadReplyCount(parentMessageId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('get_thread_reply_count', {
    p_parent_message_id: parentMessageId,
  });

  if (error) throw error;
  return data || 0;
}

// Draft Messages
export async function saveDraftMessage(
  channelId: string,
  userProfileId: string,
  content: string,
  replyToId?: string
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('draft_messages').upsert({
    channel_id: channelId,
    user_profile_id: userProfileId,
    content,
    reply_to_id: replyToId,
  });

  if (error) throw error;
  return data;
}

export async function getDraftMessage(channelId: string, userProfileId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('draft_messages')
    .select('*')
    .eq('channel_id', channelId)
    .eq('user_profile_id', userProfileId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function deleteDraftMessage(channelId: string, userProfileId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('draft_messages')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_profile_id', userProfileId);

  if (error) throw error;
}

// Canned Responses
export async function createCannedResponse(
  workspaceId: string,
  creatorProfileId: string,
  title: string,
  content: string,
  category?: string,
  shortcut?: string
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('canned_responses').insert({
    workspace_id: workspaceId,
    creator_profile_id: creatorProfileId,
    title,
    content,
    category,
    shortcut,
  });

  if (error) throw error;
  return data;
}

export async function getCannedResponses(workspaceId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('canned_responses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateCannedResponse(
  responseId: string,
  updates: Partial<{ title: string; content: string; category: string; is_favorite: boolean }>
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('canned_responses')
    .update(updates)
    .eq('id', responseId);

  if (error) throw error;
  return data;
}

export async function deleteCannedResponse(responseId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb.from('canned_responses').delete().eq('id', responseId);

  if (error) throw error;
}

// Message Collections (Bookmarks)
export async function addMessageToCollection(
  messageId: string,
  collectorProfileId: string,
  collectionName?: string
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.from('message_collections').upsert({
    message_id: messageId,
    collector_profile_id: collectorProfileId,
    collection_name: collectionName,
  });

  if (error) throw error;
  return data;
}

export async function removeMessageFromCollection(messageId: string, collectorProfileId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('message_collections')
    .delete()
    .eq('message_id', messageId)
    .eq('collector_profile_id', collectorProfileId);

  if (error) throw error;
}

export async function getCollectedMessages(collectorProfileId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('message_collections')
    .select('*')
    .eq('collector_profile_id', collectorProfileId)
    .order('collected_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// SESSION MANAGEMENT (Phase 5)
// ============================================

export async function createDemoSession(userId: string): Promise<string | null> {
  const sb = requireSupabaseClient();
  try {
    const { data, error } = await sb.rpc('create_demo_session', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch {
    // Fallback: just update last_login_at
    await sb.from('demo_users').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
    return null;
  }
}

export async function validateDemoSession(userId: string, token: string): Promise<boolean> {
  const sb = requireSupabaseClient();
  try {
    const { data, error } = await sb.rpc('validate_demo_session', {
      p_user_id: userId,
      p_token: token,
    });
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function getDemoUserById(userId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('demo_users')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk update client status
 */
export async function bulkUpdateClientStatus(clientIds: string[], status: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', clientIds)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Bulk assign account manager to clients
 */
export async function bulkAssignAccountManager(clientIds: string[], accountManagerId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .update({ account_manager_id: accountManagerId, updated_at: new Date().toISOString() })
    .in('id', clientIds)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Bulk update deliverable status
 */
export async function bulkUpdateDeliverableStatus(deliverableIds: string[], status: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', deliverableIds)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Bulk assign deliverables to team member
 */
export async function bulkAssignDeliverables(deliverableIds: string[], assignedToId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .update({ assigned_to: assignedToId, updated_at: new Date().toISOString() })
    .in('id', deliverableIds)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Bulk delete clients (soft-delete by setting status to archived)
 */
export async function bulkArchiveClients(clientIds: string[]) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .in('id', clientIds)
    .select();
  if (error) throw error;
  return data;
}

// ============================================
// EXPORT DATA QUERIES (raw data for CSV)
// ============================================

export async function getClientsForExport() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('business_name');
  if (error) throw error;
  return data || [];
}

export async function getInvoicesForExport() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('invoices')
    .select('*, clients(business_name)')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('issue_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getTeamMembersForExport() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('team_members')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getDeliverablesForExport() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverables')
    .select('*, clients(business_name), assigned_to_member:team_members!deliverables_assigned_to_fkey(name)')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCampaignsForExport() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('campaigns')
    .select('*, clients(business_name)')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================
// PACKAGE RENEWAL ALERTS
// ============================================

export interface RenewalAlert {
  clientPackageId: string;
  clientId: string;
  clientName: string;
  packageName: string;
  renewalDate: string;
  daysUntilRenewal: number;
  status: 'urgent' | 'warning' | 'upcoming';
  monthlyFee: number;
  currency: string;
}

/**
 * Get upcoming package renewals within N days
 */
export async function getPackageRenewalAlerts(daysAhead = 30): Promise<RenewalAlert[]> {
  const sb = requireSupabaseClient();
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data, error } = await sb
    .from('client_packages')
    .select(`
      id, renewal_date, status, custom_monthly_fee,
      clients(id, business_name),
      packages(name, monthly_fee, currency)
    `)
    .eq('status', 'active')
    .lte('renewal_date', future.toISOString().split('T')[0])
    .gte('renewal_date', now.toISOString().split('T')[0])
    .order('renewal_date');

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => {
    const client = row.clients as Record<string, unknown> | null;
    const pkg = row.packages as Record<string, unknown> | null;
    const renewalDate = row.renewal_date as string;
    const daysUntil = Math.ceil(
      (new Date(renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const fee = (row.custom_monthly_fee as number) || (pkg?.monthly_fee as number) || 0;

    return {
      clientPackageId: row.id as string,
      clientId: client?.id as string,
      clientName: client?.business_name as string || 'Unknown',
      packageName: pkg?.name as string || 'Unknown Package',
      renewalDate,
      daysUntilRenewal: daysUntil,
      status: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'warning' : 'upcoming',
      monthlyFee: fee,
      currency: (pkg?.currency as string) || 'BDT',
    };
  });
}

// ============================================
// CLIENT DASHBOARD PHASE 2 FUNCTIONS
// ============================================

// --- Files & Assets Hub ---

export async function getClientSharedFiles(clientId: string, category?: string) {
  const sb = supabase;
  let query = sb
    .from('client_shared_files')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getApprovedDeliverables(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('deliverables')
    .select('id, title, deliverable_type, status, final_file_url, final_file_name, created_at, updated_at')
    .eq('client_id', clientId)
    .in('status', ['approved', 'delivered'])
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadClientFile(
  clientId: string,
  file: File,
  category: string,
  description?: string,
  uploadedBy?: string,
) {
  const sb = supabase;
  const filePath = `client-files/${clientId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await sb.storage
    .from('message-attachments')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = sb.storage
    .from('message-attachments')
    .getPublicUrl(filePath);

  const { data, error } = await sb
    .from('client_shared_files')
    .insert({
      client_id: clientId,
      uploaded_by: uploadedBy,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type.startsWith('image/') ? 'image' :
                 file.type.startsWith('video/') ? 'video' :
                 file.type.includes('pdf') ? 'pdf' : 'document',
      file_size: file.size,
      category,
      description,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClientFile(fileId: string) {
  const sb = supabase;
  const { error } = await sb
    .from('client_shared_files')
    .delete()
    .eq('id', fileId);
  if (error) throw error;
}

// --- Client Notification Preferences ---

export async function getClientNotificationPreferences(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_notification_preferences')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveClientNotificationPreferences(
  clientId: string,
  prefs: Record<string, unknown>,
) {
  const sb = supabase;
  const { data: existing } = await sb
    .from('client_notification_preferences')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (existing) {
    const { data, error } = await sb
      .from('client_notification_preferences')
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await sb
      .from('client_notification_preferences')
      .insert({ client_id: clientId, ...prefs })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// --- Package Details & Change Requests ---

export async function getClientPackageDetails(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_packages')
    .select(`
      *,
      package:packages(*)
    `)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAvailablePackagesForUpgrade(currentPackageId?: string) {
  const sb = supabase;
  let query = sb
    .from('packages')
    .select('*')
    .eq('status', 'active')
    .order('monthly_fee', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function requestPackageChange(input: {
  clientId: string;
  currentPackageId?: string;
  requestedPackageId: string;
  requestType: 'upgrade' | 'downgrade' | 'addon';
  notes?: string;
}) {
  const sb = supabase;
  const { data, error } = await sb
    .from('package_change_requests')
    .insert({
      client_id: input.clientId,
      current_package_id: input.currentPackageId,
      requested_package_id: input.requestedPackageId,
      request_type: input.requestType,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification
  await sb.from('notifications').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'package',
    title: `Package ${input.requestType} Request`,
    message: `Client requested a package ${input.requestType}`,
    priority: 'high',
    target_client_id: input.clientId,
    category: 'package',
  });

  return data;
}

export async function getPackageChangeRequests(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('package_change_requests')
    .select('*, requested_package:packages!requested_package_id(name, monthly_fee)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// --- Payment / Transaction History ---

export async function getClientWalletTransactions(clientId: string, limit = 50) {
  const sb = supabase;

  // First try client_id filter
  let { data, error } = await sb
    .from('wallet_transactions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // If no results, try via wallet id
  if ((!data || data.length === 0) && !error) {
    const { data: wallet } = await sb
      .from('client_wallets')
      .select('id')
      .eq('client_id', clientId)
      .single();

    if (wallet) {
      const result = await sb
        .from('wallet_transactions')
        .select('*')
        .eq('client_wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      data = result.data;
      error = result.error;
    }
  }

  if (error) throw error;
  return data || [];
}

export async function getClientWalletBalance(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_wallets')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// --- Deliverable Revision History ---

export async function getDeliverableRevisions(deliverableId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('deliverable_revisions')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createDeliverableRevision(
  deliverableId: string,
  notes: string,
  requestedBy?: string,
) {
  const sb = supabase;

  // Get current revision count
  const { data: existing } = await sb
    .from('deliverable_revisions')
    .select('revision_number')
    .eq('deliverable_id', deliverableId)
    .order('revision_number', { ascending: false })
    .limit(1);

  const nextRevision = existing && existing.length > 0 ? (existing[0].revision_number + 1) : 1;

  const { data, error } = await sb
    .from('deliverable_revisions')
    .insert({
      deliverable_id: deliverableId,
      revision_number: nextRevision,
      requested_by: requestedBy,
      notes,
      status: 'requested',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- Password Change (demo_users) ---

export async function changeClientPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const sb = supabase;

  // Verify current password
  const { data: user, error: fetchErr } = await sb
    .from('demo_users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!user || user.password_hash !== currentPassword) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  const { error } = await sb
    .from('demo_users')
    .update({ password_hash: newPassword, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
  return true;
}

// ==============================================================
// Phase 3: Support Tickets, Ratings, Calendar, Analytics, Brand Kit
// ==============================================================

// --- Support Tickets ---

export async function getSupportTickets(clientId: string, status?: string) {
  const sb = supabase;
  let query = sb
    .from('support_tickets')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createSupportTicket(input: {
  clientId: string;
  subject: string;
  description?: string;
  category: string;
  priority: string;
}) {
  const sb = supabase;
  const { data, error } = await sb
    .from('support_tickets')
    .insert({
      client_id: input.clientId,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification for admin
  await sb.from('notifications').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'support',
    title: `New Support Ticket: ${input.subject}`,
    message: `Priority: ${input.priority} | Category: ${input.category}`,
    priority: input.priority === 'urgent' ? 'critical' : 'normal',
    target_client_id: input.clientId,
    category: 'support',
  });

  return data;
}

export async function getTicketReplies(ticketId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('support_ticket_replies')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addTicketReply(input: {
  ticketId: string;
  senderType: string;
  senderId?: string;
  senderName?: string;
  message: string;
}) {
  const sb = supabase;
  const { data, error } = await sb
    .from('support_ticket_replies')
    .insert({
      ticket_id: input.ticketId,
      sender_type: input.senderType,
      sender_id: input.senderId,
      sender_name: input.senderName,
      message: input.message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const sb = supabase;
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'resolved' || status === 'closed') {
    updates.resolved_at = new Date().toISOString();
  }
  const { data, error } = await sb
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- Deliverable Ratings ---

export async function rateDeliverable(input: {
  deliverableId: string;
  clientId: string;
  rating: number;
  feedback?: string;
}) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverable_ratings')
    .upsert({
      deliverable_id: input.deliverableId,
      client_id: input.clientId,
      rating: input.rating,
      feedback: input.feedback,
      tenant_id: DEMO_TENANT_ID,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'deliverable_id,client_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDeliverableRating(deliverableId: string, clientId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('deliverable_ratings')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getClientDeliverableRatings(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('deliverable_ratings')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// --- Content Calendar ---

export async function getContentCalendar(clientId: string, month?: string) {
  const sb = supabase;
  let query = sb
    .from('deliverables')
    .select('id, title, deliverable_type, status, scheduled_publish_date, published_at, publish_platform, calendar_color, created_at, updated_at')
    .eq('client_id', clientId)
    .not('scheduled_publish_date', 'is', null)
    .order('scheduled_publish_date', { ascending: true });

  if (month) {
    const start = `${month}-01`;
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().split('T')[0];
    query = query.gte('scheduled_publish_date', start).lt('scheduled_publish_date', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// --- Client Analytics ---

export async function getClientAnalytics(clientId: string) {
  const sb = supabase;

  // Get overall stats
  const [deliverables, ratings, wallet, campaigns] = await Promise.all([
    sb.from('deliverables').select('id, status, created_at').eq('client_id', clientId),
    sb.from('deliverable_ratings').select('rating').eq('client_id', clientId),
    sb.from('client_wallets').select('balance, total_funded, total_spent').eq('client_id', clientId).single(),
    sb.from('campaigns').select('id, status, budget, spent, impressions, clicks').eq('client_id', clientId),
  ]);

  const allDeliverables = deliverables.data || [];
  const allRatings = ratings.data || [];
  const walletData = wallet.data;
  const allCampaigns = campaigns.data || [];

  const totalDeliverables = allDeliverables.length;
  const approved = allDeliverables.filter(d => d.status === 'approved' || d.status === 'delivered').length;
  const pending = allDeliverables.filter(d => d.status === 'pending' || d.status === 'in-progress' || d.status === 'review').length;
  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
    : '0.0';

  const totalBoostSpend = allCampaigns.reduce((sum, c) => sum + Number(c.spent || 0), 0);
  const totalImpressions = allCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalClicks = allCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);

  // Monthly breakdown (last 6 months)
  const months: { month: string; deliverables: number; approved: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    const monthDels = allDeliverables.filter(del => del.created_at?.startsWith(key));
    months.push({
      month: monthLabel,
      deliverables: monthDels.length,
      approved: monthDels.filter(del => del.status === 'approved' || del.status === 'delivered').length,
    });
  }

  return {
    totalDeliverables,
    approved,
    pending,
    avgRating: parseFloat(avgRating),
    totalRatings: allRatings.length,
    walletBalance: walletData?.balance || 0,
    totalFunded: walletData?.total_funded || 0,
    totalSpent: walletData?.total_spent || 0,
    totalBoostSpend,
    totalImpressions,
    totalClicks,
    activeCampaigns: allCampaigns.filter(c => c.status === 'active').length,
    monthlyBreakdown: months,
  };
}

// --- Brand Kit ---

export async function getBrandKitItems(clientId: string, itemType?: string) {
  const sb = supabase;
  let query = sb
    .from('brand_kit_items')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true });

  if (itemType && itemType !== 'all') {
    query = query.eq('item_type', itemType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addBrandKitItem(input: {
  clientId: string;
  itemType: string;
  name: string;
  value?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  notes?: string;
}) {
  const sb = supabase;
  const { data, error } = await sb
    .from('brand_kit_items')
    .insert({
      client_id: input.clientId,
      item_type: input.itemType,
      name: input.name,
      value: input.value,
      file_url: input.fileUrl,
      file_name: input.fileName,
      file_size: input.fileSize,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBrandKitItem(itemId: string) {
  const sb = supabase;
  const { error } = await sb
    .from('brand_kit_items')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

export async function updateBrandKitItem(itemId: string, updates: Record<string, unknown>) {
  const sb = supabase;
  const { data, error } = await sb
    .from('brand_kit_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Phase 4: Personalization, Auto-Payment, 2FA
// ============================================

// --- Client Preferences (Language, Theme, etc.) ---

export async function getClientPreferences(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_preferences')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveClientPreferences(clientId: string, prefs: Record<string, unknown>) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_preferences')
    .upsert({
      client_id: clientId,
      ...prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- Auto-Payment ---

export async function getAutoPaymentSettings(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_auto_payments')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveAutoPaymentSettings(clientId: string, settings: Record<string, unknown>) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_auto_payments')
    .upsert({
      client_id: clientId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- 2FA Settings ---

export async function get2FASettings(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_2fa_settings')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function save2FASettings(clientId: string, settings: Record<string, unknown>) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_2fa_settings')
    .upsert({
      client_id: clientId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function generate2FABackupCodes(clientId: string) {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
  }

  const sb = supabase;
  const { data, error } = await sb
    .from('client_2fa_settings')
    .upsert({
      client_id: clientId,
      backup_codes: codes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) throw error;
  return { codes, data };
}

// --- Export Audit Log ---

export async function logExport(clientId: string, exportType: string, fileName: string, recordCount: number) {
  const sb = supabase;
  const { error } = await sb
    .from('client_export_logs')
    .insert({
      client_id: clientId,
      export_type: exportType,
      file_name: fileName,
      record_count: recordCount,
    });

  if (error) console.error('Failed to log export:', error);
}

export async function getExportHistory(clientId: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('client_export_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

// ============================================
// CLIENT SUB-USER / TEAM MEMBER MANAGEMENT
// ============================================

export interface ClientSubUser {
  id: string;
  tenant_id: string;
  client_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'viewer' | 'approver' | 'billing_manager' | 'admin';
  status: 'active' | 'inactive' | 'invited' | 'removed';
  avatar: string | null;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  last_active_at: string | null;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export async function getClientSubUsers(clientId: string): Promise<ClientSubUser[]> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_sub_users')
    .select('*')
    .eq('client_id', clientId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ClientSubUser[];
}

export interface CreateSubUserInput {
  client_id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'viewer' | 'approver' | 'billing_manager' | 'admin';
  permissions?: Record<string, boolean>;
  invited_by?: string;
}

export async function createClientSubUser(input: CreateSubUserInput): Promise<ClientSubUser> {
  const sb = requireSupabaseClient();

  const defaultPermissions: Record<string, Record<string, boolean>> = {
    viewer: { can_view_tasks: true, can_approve_deliverables: false, can_manage_billing: false, can_send_messages: true, can_request_deliverables: false, can_view_analytics: false },
    approver: { can_view_tasks: true, can_approve_deliverables: true, can_manage_billing: false, can_send_messages: true, can_request_deliverables: true, can_view_analytics: true },
    billing_manager: { can_view_tasks: true, can_approve_deliverables: false, can_manage_billing: true, can_send_messages: true, can_request_deliverables: false, can_view_analytics: true },
    admin: { can_view_tasks: true, can_approve_deliverables: true, can_manage_billing: true, can_send_messages: true, can_request_deliverables: true, can_view_analytics: true },
  };

  const { data, error } = await sb
    .from('client_sub_users')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      client_id: input.client_id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role: input.role,
      status: 'invited',
      permissions: input.permissions || defaultPermissions[input.role] || defaultPermissions.viewer,
      invited_by: input.invited_by || null,
      invited_at: new Date().toISOString(),
      avatar: input.name.split(' ').map(n => n[0]).join('').toUpperCase(),
    })
    .select()
    .single();

  if (error) throw error;

  // Log the activity
  await logClientActivity(input.client_id, input.invited_by || null, 'invite_sub_user', `Invited ${input.name} as ${input.role}`);

  return data as ClientSubUser;
}

export async function updateClientSubUser(id: string, updates: Partial<Pick<ClientSubUser, 'name' | 'email' | 'phone' | 'role' | 'status' | 'permissions'>>) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_sub_users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ClientSubUser;
}

export async function removeClientSubUser(id: string, clientId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('client_sub_users')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  await logClientActivity(clientId, null, 'remove_sub_user', `Removed sub-user ${id}`);
}

export async function resendSubUserInvite(id: string, clientId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('client_sub_users')
    .update({ invited_at: new Date().toISOString(), status: 'invited', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  await logClientActivity(clientId, null, 'resend_invite', `Resent invite for sub-user ${id}`);
}

export async function logClientActivity(clientId: string, subUserId: string | null, action: string, description: string) {
  const sb = requireSupabaseClient();
  await sb.from('client_activity_log').insert({
    tenant_id: DEMO_TENANT_ID,
    client_id: clientId,
    sub_user_id: subUserId,
    action,
    description,
  }).catch(() => {});
}

export async function getClientActivityLog(clientId: string, limit = 30) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('client_activity_log')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================
// USER SYSTEM HEALTH & REPAIR
// ============================================

export interface UserSystemHealth {
  total_demo_users: number;
  total_user_profiles: number;
  total_team_members: number;
  orphaned_demo_users_no_profile: number;
  orphaned_demo_users_no_team: number;
  orphaned_team_members_no_profile: number;
  total_clients: number;
  clients_with_wallet: number;
  clients_with_workspace: number;
  clients_with_login: number;
}

export async function getUserSystemHealth(): Promise<UserSystemHealth> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('get_user_system_health', {
    p_tenant_id: DEMO_TENANT_ID,
  });
  if (error) throw error;
  return data as UserSystemHealth;
}

export interface RepairResult {
  demo_user_id: string;
  action_taken: string;
}

export async function repairUserLinks(): Promise<RepairResult[]> {
  const sb = requireSupabaseClient();
  const { data, error } = await sb.rpc('repair_user_links', {
    p_tenant_id: DEMO_TENANT_ID,
  });
  if (error) throw error;
  return (data || []) as RepairResult[];
}
