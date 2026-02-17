/**
 * TITAN DEV AI — Core Data Service
 * Handles all CRUD operations, real-time subscriptions, and data flow
 */

import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

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
  // Deactivate existing active packages for this client
  await supabase
    .from('client_packages')
    .update({ status: 'expired' })
    .eq('client_id', input.client_id)
    .eq('status', 'active');

  const { data, error } = await supabase
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
  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('deliverables')
    .select('*, clients(business_name)')
    .eq('assigned_to', assigneeId)
    .eq('tenant_id', DEMO_TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDeliverablesByClient(clientId: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const channel = supabase
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
    supabase.removeChannel(channel);
  };
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
  const { data, error } = await supabase
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
  await supabase.from('activities').insert({
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
  const { data, error } = await supabase
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
  // Get wallet ID
  const { data: wallet, error: walletErr } = await supabase
    .from('client_wallets')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (walletErr || !wallet) throw walletErr || new Error('Wallet not found');

  const { data, error } = await supabase
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
  const { data: wallet, error: walletErr } = await supabase
    .from('client_wallets')
    .select('id, balance')
    .eq('client_id', clientId)
    .single();

  if (walletErr || !wallet) throw walletErr || new Error('Wallet not found');

  // Check balance
  if (Number(wallet.balance) < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('client_wallets')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error) throw error;
  return data;
}

export async function getWalletTransactions(clientId: string) {
  const { data: wallet } = await supabase
    .from('client_wallets')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (!wallet) return [];

  const { data, error } = await supabase
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
  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', DEMO_TENANT_ID);

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data: invoice, error } = await supabase
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
    await supabase
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
  await supabase.from('activities').insert({
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

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // If paid, log payment activity
  if (status === 'paid' && data) {
    await supabase.from('activities').insert({
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
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('client_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}

export async function getClientAssignments(clientId: string) {
  const { data, error } = await supabase
    .from('client_assignments')
    .select('*, team_members:team_member_id(id, name, avatar, email, primary_role, current_load, status)')
    .eq('client_id', clientId)
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

export async function getAssignmentsByTeamMember(teamMemberId: string) {
  const { data, error } = await supabase
    .from('client_assignments')
    .select('*, clients:client_id(id, business_name, category, status, health_score)')
    .eq('team_member_id', teamMemberId)
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

export async function getAvailableTeamMembers(tenantId?: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('default_assignment_rules')
    .select('*')
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('industry_category', category)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    const { data: fallback } = await supabase
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
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('client_id', clientId)
    .single();

  if (!workspace) throw new Error('Workspace not found for this client');

  const { data, error } = await supabase
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
// TEAM ASSIGNMENT (DELIVERABLE-LEVEL)
// ============================================

export async function assignTeamMemberToDeliverable(deliverableId: string, teamMemberId: string) {
  const { data, error } = await supabase
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
  await supabase.rpc('increment_team_member_load', { member_id: teamMemberId }).catch(() => {
    // fallback: manual increment
    supabase
      .from('team_members')
      .update({ active_deliverables: supabase.rpc ? undefined : 1 })
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
    supabase.removeChannel(channel);
  };
}

// ============================================
// SYSTEM HEALTH / DEBUG
// ============================================

export async function getSystemHealth() {
  const [
    clientsRes,
    deliverablesRes,
    messagesRes,
    campaignsRes,
    packagesRes,
    walletRes,
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', DEMO_TENANT_ID),
    supabase.from('deliverables').select('id, status').eq('tenant_id', DEMO_TENANT_ID),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase.from('campaigns').select('id, status').eq('tenant_id', DEMO_TENANT_ID),
    supabase.from('package_usage').select('*, client_packages!inner(clients!inner(tenant_id))'),
    supabase.from('client_wallets').select('balance, clients!inner(tenant_id)'),
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
  const { error } = await supabase.rpc('refresh_dashboard_metrics', {
    p_tenant_id: DEMO_TENANT_ID,
  });

  if (error) {
    console.warn('Could not refresh metrics via RPC:', error.message);
  }
}
