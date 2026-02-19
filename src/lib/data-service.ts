/**
 * TITAN DEV AI — Core Data Service
 * Handles all CRUD operations, real-time subscriptions, and data flow
 */

import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase client not initialized. Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  return supabase;
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
}

export async function sendMessage(input: SendMessageInput) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('messages')
    .insert({
      channel_id: input.channel_id,
      sender_id: input.sender_id,
      sender_name: input.sender_name,
      sender_avatar: input.sender_avatar || '',
      sender_role: input.sender_role || 'admin',
      content: input.content,
      status: 'sent',
      reply_to_id: input.reply_to_id || null,
      reply_to_sender: input.reply_to_sender || null,
      reply_to_content: input.reply_to_content || null,
    })
    .select()
    .single();

  if (error) throw error;
  // trigger trg_update_msg_meta updates channel & workspace counters
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
    .insert({ message_id: messageId, user_id: userId })
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
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getSavedMessages(userId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('saved_messages')
    .select('*, messages(*)')
    .eq('user_id', userId)
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
  // Get original message
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
  return data;
}

export async function markMessageAsRead(messageId: string, userId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('message_read_receipts')
    .insert({ message_id: messageId, user_id: userId })
    .select()
    .single();
  if (error && error.code !== '23505') throw error;
  return data;
}

// ============================================
// FILE UPLOAD (Supabase Storage)
// ============================================

export async function uploadMessageFile(file: File, channelId: string) {
  const sb = requireSupabaseClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await sb.storage
    .from('message-attachments')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

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
// CHANNEL MEMBER MANAGEMENT (Legacy)
// ============================================
// NOTE: The project has an enhanced channel member API further down in this file.
// These legacy exports were causing duplicate identifier errors at runtime.
// They are kept here (non-exported) only for reference.

async function addChannelMemberLegacy(
  channelId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  userRole: string
) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('channel_members')
    .insert({
      channel_id: channelId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      user_role: userRole,
    })
    .select()
    .single();
  if (error && error.code !== '23505') throw error;
  return data;
}

async function removeChannelMemberLegacy(channelId: string, userId: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);
  if (error) throw error;
}

async function getChannelMembersLegacy(channelId: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('channel_members')
    .select('*')
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ============================================
// CANNED RESPONSES
// ============================================

export async function getCannedResponses() {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('canned_responses')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('usage_count', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCannedResponse(title: string, content: string, shortcut?: string, category?: string) {
  const sb = requireSupabaseClient();
  const { data, error } = await sb
    .from('canned_responses')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      title,
      content,
      shortcut,
      category: category || 'general',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

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
}

export async function createTeamMember(input: CreateTeamMemberInput) {
  const sb = requireSupabaseClient();
  const { data: member, error } = await sb
    .from('team_members')
    .insert({
      tenant_id: DEMO_TENANT_ID,
      name: input.name,
      email: input.email,
      primary_role: input.primary_role,
      secondary_roles: input.secondary_roles || [],
      work_capacity_hours: input.work_capacity_hours || 8,
      avatar: input.avatar || input.name.substring(0, 2).toUpperCase(),
      status: input.status || 'online',
      current_load: 0,
      active_deliverables: 0,
      boost_campaigns: 0,
      tasks_completed_this_month: 0,
      join_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;

  // Link to teams
  if (input.team_ids && input.team_ids.length > 0) {
    const teamLinks = input.team_ids.map((teamId) => ({
      team_member_id: member.id,
      team_id: teamId,
    }));
    await sb.from('team_member_teams').insert(teamLinks);

    // Update team total_members count
    for (const teamId of input.team_ids) {
      await sb.rpc('increment_team_member_count', { p_team_id: teamId }).catch(() => {
        // Fallback: manual update
        sb.from('teams')
          .update({ total_members: 1 })
          .eq('id', teamId);
      });
    }
  }

  // Add skills
  if (input.skills && input.skills.length > 0) {
    const skillRecords = input.skills.map((s) => ({
      team_member_id: member.id,
      skill_name: s.skill_name,
      skill_level: s.skill_level,
    }));
    await sb.from('user_skills').insert(skillRecords);
  }

  // Log activity
  await sb.from('activities').insert({
    tenant_id: DEMO_TENANT_ID,
    type: 'team_update',
    title: `New Team Member: ${input.name}`,
    description: `${input.primary_role} joined the team`,
    timestamp: new Date().toISOString(),
    metadata: { name: input.name, role: input.primary_role },
  });

  return member;
}

export async function updateTeamMember(id: string, updates: Partial<CreateTeamMemberInput>) {
  const sb = requireSupabaseClient();
  const { team_ids, skills, ...memberUpdates } = updates;

  const { data, error } = await sb
    .from('team_members')
    .update(memberUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeamMember(id: string) {
  const sb = requireSupabaseClient();
  const { error } = await sb.from('team_members').delete().eq('id', id);
  if (error) throw error;
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
