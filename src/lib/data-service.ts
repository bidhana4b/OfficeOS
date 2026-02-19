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
  enableMockFallback: true,
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
}

/**
 * Creates a fully-linked user across demo_users, user_profiles,
 * team_members (if staff), user_roles, and workspace_members.
 */
export async function createFullUser(input: CreateFullUserInput): Promise<CreateFullUserResult> {
  const sb = requireSupabaseClient();

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
 */
export async function resetUserPassword(demoUserId: string, newPassword: string) {
  const sb = requireSupabaseClient();

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
// CLIENT ONBOARDING (Phase 3)
// ============================================

export interface OnboardClientInput {
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

export interface OnboardClientResult {
  client: Record<string, unknown>;
  wallet: Record<string, unknown> | null;
  workspace: Record<string, unknown> | null;
  channels: Record<string, unknown>[];
  demo_user: Record<string, unknown> | null;
  client_package: Record<string, unknown> | null;
}

/**
 * Full client onboarding: creates client + wallet + workspace + channels + login + package assignment.
 * Note: wallet and workspace are auto-created by DB triggers, but we fetch them to return.
 */
export async function onboardClient(input: OnboardClientInput): Promise<OnboardClientResult> {
  const sb = requireSupabaseClient();

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

  // 1. Create client (triggers auto-create wallet + workspace + channels)
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
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    })
    .select()
    .single();

  if (clientErr) throw clientErr;

  // Small delay to let triggers complete
  await new Promise((r) => setTimeout(r, 500));

  // 2. Fetch auto-created wallet
  const { data: wallet } = await sb
    .from('client_wallets')
    .select('*')
    .eq('client_id', client.id)
    .single();

  // 3. Fetch auto-created workspace
  const { data: workspace } = await sb
    .from('workspaces')
    .select('*')
    .eq('client_id', client.id)
    .single();

  // 4. Fetch auto-created channels
  let channels: Record<string, unknown>[] = [];
  if (workspace) {
    const { data: chans } = await sb
      .from('channels')
      .select('*')
      .eq('workspace_id', workspace.id);
    channels = chans || [];

    // Add account manager as workspace member if set
    if (input.account_manager_id) {
      const { data: manager } = await sb
        .from('team_members')
        .select('id, name, avatar, user_profile_id')
        .eq('id', input.account_manager_id)
        .single();

      if (manager && manager.user_profile_id) {
        await sb.from('workspace_members').upsert({
          workspace_id: workspace.id,
          user_profile_id: manager.user_profile_id,
          name: manager.name,
          avatar: manager.avatar || '',
          role: 'admin',
          status: 'online',
        }, { onConflict: 'workspace_id,user_profile_id' });
      }
    }
  }

  // 5. Create client login account if requested
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
    } catch (e) {
      console.warn('Could not create client login:', e);
    }
  }

  // 6. Assign package if provided
  let clientPackage: Record<string, unknown> | null = null;
  if (input.package_id) {
    try {
      const { data: cp, error: cpErr } = await sb
        .from('client_packages')
        .insert({
          client_id: client.id,
          package_id: input.package_id,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (!cpErr) clientPackage = cp;
    } catch (e) {
      console.warn('Could not assign package:', e);
    }
  }

  return {
    client,
    wallet,
    workspace,
    channels,
    demo_user: demoUser,
    client_package: clientPackage,
  };
}

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================

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
