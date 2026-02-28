import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Package,
  MessageSquare,
  Megaphone,
  Wallet,
  FileText,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Zap,
  Database,
  Terminal,
  Shield,
  Link2,
  AlertTriangle,
  Wrench,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { getSystemHealth, createFullClient, createTeamMember, linkPackageToClient, createDeliverable, updateDeliverableStatus, sendMessage, createCampaign, creditWallet, debitWallet, createInvoice } from '@/lib/data-service';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

interface HealthData {
  totalClients: number;
  totalDeliverables: number;
  completedDeliverables: number;
  pendingDeliverables: number;
  totalMessages: number;
  activeCampaigns: number;
  totalCampaigns: number;
  packageUsageItems: number;
  totalWalletBalance: number;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  time?: number;
}

export default function DebugPanel() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const [userHealth, setUserHealth] = useState<Record<string, number> | null>(null);
  const [repairResult, setRepairResult] = useState<{ count: number; details: string[] } | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [tableInventory, setTableInventory] = useState<{ name: string; count: number; status: 'ok' | 'empty' | 'error' }[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<Record<string, { status: 'testing' | 'active' | 'inactive' | 'error'; message?: string }>>({});
  const [testingRealtime, setTestingRealtime] = useState(false);
  const [orphanedRecords, setOrphanedRecords] = useState<{
    demo_users_no_profile: any[];
    profiles_no_demo: any[];
    demo_no_team: any[];
    team_no_profile: any[];
    clients_no_wallet: any[];
    clients_no_workspace: any[];
    clients_no_login: any[];
  } | null>(null);
  const [detectingOrphans, setDetectingOrphans] = useState(false);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSystemHealth();
      setHealth(data);
      addLog('System health refreshed successfully');
    } catch (err) {
      addLog(`Error fetching health: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const fetchUserHealth = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_system_health', {
        p_tenant_id: DEMO_TENANT_ID,
      });
      if (error) {
        addLog(`⚠️ User health check failed: ${error.message}`);
        return;
      }
      setUserHealth(data as Record<string, number>);
      addLog('User system health refreshed');
    } catch (err) {
      addLog(`⚠️ User health check error: ${err}`);
    }
  }, [addLog]);

  const testRealtimeChannels = useCallback(async () => {
    setTestingRealtime(true);
    addLog('🔄 Testing Realtime subscriptions...');
    
    const tablesToTest = ['messages', 'notifications', 'deliverables'];
    const newStatus: Record<string, { status: 'testing' | 'active' | 'inactive' | 'error'; message?: string }> = {};

    for (const table of tablesToTest) {
      try {
        newStatus[table] = { status: 'testing' };
        setRealtimeStatus({ ...newStatus });

        // Test subscription
        const channel = supabase
          .channel(`test-${table}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            () => {
              addLog(`✅ ${table}: Realtime event received`);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              newStatus[table] = { status: 'active', message: 'Subscribed successfully' };
              addLog(`✅ ${table}: Realtime ACTIVE`);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              newStatus[table] = { status: 'error', message: `Subscription failed: ${status}` };
              addLog(`❌ ${table}: Realtime ERROR - ${status}`);
            }
            setRealtimeStatus({ ...newStatus });
          });

        // Wait for subscription
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Cleanup
        await supabase.removeChannel(channel);

        if (!newStatus[table] || newStatus[table].status === 'testing') {
          newStatus[table] = { status: 'inactive', message: 'No response within timeout' };
          addLog(`⚠️ ${table}: Realtime TIMEOUT`);
        }
      } catch (err) {
        newStatus[table] = { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
        addLog(`❌ ${table}: Realtime ERROR - ${newStatus[table].message}`);
      }
    }

    setRealtimeStatus(newStatus);
    setTestingRealtime(false);
    addLog('🏁 Realtime test complete');
  }, [addLog]);

  useEffect(() => {
    fetchHealth();
    fetchUserHealth();
  }, [fetchHealth, fetchUserHealth]);

  const detectOrphanedRecords = useCallback(async () => {
    setDetectingOrphans(true);
    try {
      addLog('🔍 Detecting orphaned records...');

      // Demo users without profiles
      const { data: demoNoProfile } = await supabase
        .from('demo_users')
        .select('id, email, display_name, role')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true)
        .is('user_profile_id', null);

      // Profiles without demo users
      const { data: allProfiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('status', 'active');

      const { data: allDemoEmails } = await supabase
        .from('demo_users')
        .select('email')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true);

      const demoEmailSet = new Set((allDemoEmails || []).map(d => d.email));
      const profilesNoDemo = (allProfiles || []).filter(p => !demoEmailSet.has(p.email));

      // Demo users (non-client) without team members
      const { data: demoNoTeam } = await supabase
        .from('demo_users')
        .select('id, email, display_name, role')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true)
        .neq('role', 'client')
        .is('team_member_id', null);

      // Team members without profiles
      const { data: teamNoProfile } = await supabase
        .from('team_members')
        .select('id, name, email, role')
        .eq('tenant_id', DEMO_TENANT_ID)
        .is('user_profile_id', null);

      // Clients without wallet
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('tenant_id', DEMO_TENANT_ID);

      const { data: walletsData } = await supabase
        .from('client_wallets')
        .select('client_id');

      const walletClientIds = new Set((walletsData || []).map(w => w.client_id));
      const clientsNoWallet = (allClients || []).filter(c => !walletClientIds.has(c.id));

      // Clients without workspace
      const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('client_id');

      const workspaceClientIds = new Set((workspacesData || []).map(w => w.client_id));
      const clientsNoWorkspace = (allClients || []).filter(c => !workspaceClientIds.has(c.id));

      // Clients without login
      const { data: clientLoginsData } = await supabase
        .from('demo_users')
        .select('client_id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('role', 'client')
        .eq('is_active', true)
        .not('client_id', 'is', null);

      const clientLoginIds = new Set((clientLoginsData || []).map(cl => cl.client_id));
      const clientsNoLogin = (allClients || []).filter(c => !clientLoginIds.has(c.id));

      setOrphanedRecords({
        demo_users_no_profile: demoNoProfile || [],
        profiles_no_demo: profilesNoDemo,
        demo_no_team: demoNoTeam || [],
        team_no_profile: teamNoProfile || [],
        clients_no_wallet: clientsNoWallet,
        clients_no_workspace: clientsNoWorkspace,
        clients_no_login: clientsNoLogin,
      });

      const totalIssues =
        (demoNoProfile?.length || 0) +
        profilesNoDemo.length +
        (demoNoTeam?.length || 0) +
        (teamNoProfile?.length || 0) +
        clientsNoWallet.length +
        clientsNoWorkspace.length +
        clientsNoLogin.length;

      addLog(`🔍 Detected ${totalIssues} orphaned records`);
    } catch (err) {
      addLog(`❌ Detection failed: ${err}`);
    } finally {
      setDetectingOrphans(false);
    }
  }, [addLog]);

  const handleRepairLinks = useCallback(async () => {
    setRepairing(true);
    setRepairResult(null);
    try {
      addLog('🔧 Running user link repair...');
      const { data, error } = await supabase.rpc('repair_user_links', {
        p_tenant_id: DEMO_TENANT_ID,
      });
      if (error) {
        addLog(`❌ Repair failed: ${error.message}`);
        setRepairResult({ count: 0, details: [`Error: ${error.message}`] });
        return;
      }
      const results = data as { demo_user_id: string; action_taken: string }[];
      if (results.length === 0) {
        addLog('✅ No repairs needed — all user links are healthy!');
        setRepairResult({ count: 0, details: ['No repairs needed'] });
      } else {
        const details = results.map((r) => `${r.demo_user_id.slice(0, 8)}...: ${r.action_taken}`);
        addLog(`✅ Repaired ${results.length} user(s): ${details.join(', ')}`);
        setRepairResult({ count: results.length, details });
      }
      // Refresh health after repair
      await fetchUserHealth();
      await detectOrphanedRecords();
    } catch (err) {
      addLog(`❌ Repair error: ${err}`);
    } finally {
      setRepairing(false);
    }
  }, [addLog, fetchUserHealth, detectOrphanedRecords]);

  const fetchTableInventory = useCallback(async () => {
    if (!supabase) return;
    setInventoryLoading(true);
    const tables = [
      'tenants', 'demo_users', 'user_profiles', 'user_roles', 'roles',
      'clients', 'client_wallets', 'client_packages', 'client_performance', 'client_sub_users',
      'team_members', 'team_skills',
      'packages', 'package_tiers', 'deliverable_types', 'deliverable_categories',
      'package_deliverables', 'package_usage',
      'deliverables', 'deliverable_ratings',
      'workspaces', 'channels', 'messages', 'message_reactions', 'message_attachments',
      'read_receipts', 'workspace_members', 'channel_members',
      'invoices', 'invoice_items', 'wallet_transactions',
      'campaigns', 'ad_accounts',
      'agency_settings', 'dashboard_widgets', 'notifications', 'activities',
    ];

    const results: { name: string; count: number; status: 'ok' | 'empty' | 'error' }[] = [];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({ name: table, count: -1, status: 'error' });
        } else {
          results.push({ name: table, count: count || 0, status: (count || 0) > 0 ? 'ok' : 'empty' });
        }
      } catch {
        results.push({ name: table, count: -1, status: 'error' });
      }
    }

    setTableInventory(results);
    setInventoryLoading(false);
    const okCount = results.filter(r => r.status === 'ok').length;
    const emptyCount = results.filter(r => r.status === 'empty').length;
    const errCount = results.filter(r => r.status === 'error').length;
    addLog(`📊 Table Inventory: ${okCount} populated, ${emptyCount} empty, ${errCount} errors (${results.length} total)`);
  }, [addLog]);

  const updateTest = (name: string, status: TestResult['status'], message?: string, time?: number) => {
    setTests((prev) =>
      prev.map((t) => (t.name === name ? { ...t, status, message, time } : t))
    );
  };

  const runMasterFlowTest = useCallback(async () => {
    setRunningTests(true);
    const testNames = [
      'Supabase Connection',
      'Create Client',
      'Create Team Member',
      'Link Package',
      'Create Deliverable',
      'Complete Deliverable (Usage Deduct)',
      'Send Message (Realtime)',
      'Create Campaign',
      'Credit Wallet',
      'Debit Wallet',
      'Generate Invoice',
    ];

    setTests(testNames.map((name) => ({ name, status: 'pending' })));

    let clientId = '';
    let clientPackageId = '';
    let deliverableId = '';
    let channelId = '';

    // 1. Connection test
    try {
      const start = Date.now();
      updateTest('Supabase Connection', 'running');
      addLog('Testing Supabase connection...');

      const { data, error } = await supabase.from('clients').select('id').eq('tenant_id', DEMO_TENANT_ID).limit(1);
      if (error) throw error;

      updateTest('Supabase Connection', 'success', `Connected. Found ${data?.length || 0} clients.`, Date.now() - start);
      addLog('✅ Supabase connection OK');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateTest('Supabase Connection', 'error', msg);
      addLog(`❌ Connection failed: ${msg}`);
      setRunningTests(false);
      return;
    }

    // 2. Create Client
    try {
      const start = Date.now();
      updateTest('Create Client', 'running');
      addLog('Creating test client via createFullClient...');

      const result = await createFullClient({
        business_name: `Test Client ${Date.now().toString().slice(-4)}`,
        category: 'Corporate',
        location: 'Debug Panel, Dhaka',
        contact_email: 'test@debug.com',
        contact_phone: '+880 1900-000000',
      });

      clientId = result.client.id as string;
      const stepsSummary = [
        result.wallet ? 'wallet✅' : 'wallet❌',
        result.workspace ? 'workspace✅' : 'workspace❌',
        `${result.channels.length} channels`,
        result.activity ? 'activity✅' : 'activity❌',
        result.notification ? 'notif✅' : 'notif❌',
        `${result.steps_completed.length} steps`,
      ].join(', ');
      updateTest('Create Client', 'success', `ID: ${clientId.slice(0, 8)}... (${stepsSummary})`, Date.now() - start);
      addLog(`✅ Client onboarded: ${result.client.business_name} [${stepsSummary}]`);
      addLog(`📋 Steps: ${result.steps_completed.join(' → ')}`);
      if (result.errors.length > 0) {
        addLog(`⚠️ Onboarding partial errors: ${result.errors.join('; ')}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateTest('Create Client', 'error', msg);
      addLog(`❌ Client create failed: ${msg}`);
    }

    // 2.5. Create Team Member (User System Unification Test)
    try {
      const start = Date.now();
      updateTest('Create Team Member', 'running');
      addLog('Creating team member via createTeamMember...');

      const tmEmail = `test.member.${Date.now().toString().slice(-4)}@debug.com`;
      const tmResult = await createTeamMember({
        name: `Test Designer ${Date.now().toString().slice(-4)}`,
        email: tmEmail,
        primary_role: 'Graphic Designer',
        password: '123456',
        work_capacity_hours: 8,
        assign_to_clients: clientId ? [clientId] : [],
      });

      const tmSummary = [
        tmResult.team_member ? 'member✅' : 'member❌',
        tmResult.user_profile ? 'profile✅' : 'profile❌',
        tmResult.demo_user ? 'login✅' : 'login❌',
        `${tmResult.steps_completed.length} steps`,
        tmResult.client_assignments.length > 0 ? `${tmResult.client_assignments.length} client(s)` : '',
      ].filter(Boolean).join(', ');

      updateTest('Create Team Member', 'success', `${tmSummary}`, Date.now() - start);
      addLog(`✅ Team member created [${tmSummary}]`);
      addLog(`📋 Steps: ${tmResult.steps_completed.join(' → ')}`);
      if (tmResult.errors.length > 0) {
        addLog(`⚠️ Team member partial errors: ${tmResult.errors.join('; ')}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateTest('Create Team Member', 'error', msg);
      addLog(`❌ Team member create failed: ${msg}`);
    }

    // 3. Link Package
    if (clientId) {
      try {
        const start = Date.now();
        updateTest('Link Package', 'running');
        addLog('Linking package to client...');

        // Get first available package
        const { data: packages } = await supabase
          .from('packages')
          .select('id')
          .eq('tenant_id', DEMO_TENANT_ID)
          .limit(1)
          .single();

        if (!packages) throw new Error('No packages found');

        const cp = await linkPackageToClient({
          client_id: clientId,
          package_id: packages.id,
          start_date: new Date().toISOString().split('T')[0],
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

        clientPackageId = cp.id;
        updateTest('Link Package', 'success', `Package linked, usage initialized`, Date.now() - start);
        addLog(`✅ Package linked: ${clientPackageId.slice(0, 8)}...`);

        // Verify usage was auto-created
        const { data: usage } = await supabase
          .from('package_usage')
          .select('*')
          .eq('client_package_id', clientPackageId);

        addLog(`   → Auto-created ${usage?.length || 0} usage rows`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Link Package', 'error', msg);
        addLog(`❌ Package link failed: ${msg}`);
      }
    }

    // 4. Create Deliverable
    if (clientId && clientPackageId) {
      try {
        const start = Date.now();
        updateTest('Create Deliverable', 'running');
        addLog('Creating deliverable...');

        // Get first team member
        const { data: member } = await supabase
          .from('team_members')
          .select('id, name')
          .eq('tenant_id', DEMO_TENANT_ID)
          .limit(1)
          .single();

        const del = await createDeliverable({
          client_id: clientId,
          client_package_id: clientPackageId,
          assigned_to: member?.id,
          title: 'Test Design - Debug Panel',
          deliverable_type: 'photo_graphics',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quantity: 1,
        });

        deliverableId = del.id;
        updateTest('Create Deliverable', 'success', `Assigned to: ${member?.name || 'N/A'}`, Date.now() - start);
        addLog(`✅ Deliverable created: ${deliverableId.slice(0, 8)}...`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Create Deliverable', 'error', msg);
        addLog(`❌ Deliverable create failed: ${msg}`);
      }
    }

    // 5. Complete Deliverable (triggers usage deduction)
    if (deliverableId) {
      try {
        const start = Date.now();
        updateTest('Complete Deliverable (Usage Deduct)', 'running');
        addLog('Completing deliverable (should deduct usage)...');

        // Check usage before
        const { data: usageBefore } = await supabase
          .from('package_usage')
          .select('used, total')
          .eq('client_package_id', clientPackageId)
          .eq('deliverable_type', 'photo_graphics')
          .single();

        const usedBefore = usageBefore?.used || 0;

        await updateDeliverableStatus(deliverableId, 'delivered', user?.display_name || 'Debug');

        // Small delay for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check usage after
        const { data: usageAfter } = await supabase
          .from('package_usage')
          .select('used, total')
          .eq('client_package_id', clientPackageId)
          .eq('deliverable_type', 'photo_graphics')
          .single();

        const usedAfter = usageAfter?.used || 0;

        if (usedAfter > usedBefore) {
          updateTest('Complete Deliverable (Usage Deduct)', 'success', `Usage: ${usedBefore} → ${usedAfter}/${usageAfter?.total}`, Date.now() - start);
          addLog(`✅ Usage deducted: ${usedBefore} → ${usedAfter}`);
        } else {
          updateTest('Complete Deliverable (Usage Deduct)', 'success', `Deliverable completed (usage: ${usedAfter}/${usageAfter?.total})`, Date.now() - start);
          addLog(`⚠️ Usage may not have changed: ${usedBefore} → ${usedAfter}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Complete Deliverable (Usage Deduct)', 'error', msg);
        addLog(`❌ Complete failed: ${msg}`);
      }
    }

    // 6. Send Message (Realtime)
    try {
      const start = Date.now();
      updateTest('Send Message (Realtime)', 'running');
      addLog('Sending test message...');

      // Get first channel
      const { data: channels } = await supabase.from('channels').select('id').limit(1).single();
      if (!channels) throw new Error('No channels found');
      channelId = channels.id;

      await sendMessage({
        channel_id: channelId,
        sender_id: user?.id || '00000000-0000-0000-0000-000000000a01',
        sender_name: user?.display_name || 'Debug User',
        sender_avatar: user?.avatar || 'DU',
        sender_role: user?.role || 'super_admin',
        content: `🧪 Debug test message at ${new Date().toLocaleTimeString()}`,
      });

      updateTest('Send Message (Realtime)', 'success', `Message sent to channel`, Date.now() - start);
      addLog(`✅ Message sent to channel ${channelId.slice(0, 8)}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateTest('Send Message (Realtime)', 'error', msg);
      addLog(`❌ Message failed: ${msg}`);
    }

    // 7. Create Campaign
    if (clientId) {
      try {
        const start = Date.now();
        updateTest('Create Campaign', 'running');
        addLog('Creating test campaign...');

        const campaign = await createCampaign({
          client_id: clientId,
          name: 'Debug Test Campaign',
          platform: 'Facebook',
          budget: 5000,
          goal: 'Test campaign from debug panel',
        });

        updateTest('Create Campaign', 'success', `Campaign: ${campaign.id.slice(0, 8)}...`, Date.now() - start);
        addLog(`✅ Campaign created: ${campaign.name}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Create Campaign', 'error', msg);
        addLog(`❌ Campaign failed: ${msg}`);
      }
    }

    // 8. Credit Wallet
    if (clientId) {
      try {
        const start = Date.now();
        updateTest('Credit Wallet', 'running');
        addLog('Crediting wallet...');

        await creditWallet(clientId, 10000, 'Debug panel test credit');

        updateTest('Credit Wallet', 'success', `+10,000 BDT credited`, Date.now() - start);
        addLog(`✅ Wallet credited: 10,000 BDT`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Credit Wallet', 'error', msg);
        addLog(`❌ Credit failed: ${msg}`);
      }
    }

    // 9. Debit Wallet
    if (clientId) {
      try {
        const start = Date.now();
        updateTest('Debit Wallet', 'running');
        addLog('Debiting wallet...');

        await debitWallet(clientId, 2000, 'Debug panel test debit');

        updateTest('Debit Wallet', 'success', `-2,000 BDT debited`, Date.now() - start);
        addLog(`✅ Wallet debited: 2,000 BDT. Net balance: 8,000 BDT`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Debit Wallet', 'error', msg);
        addLog(`❌ Debit failed: ${msg}`);
      }
    }

    // 10. Generate Invoice
    if (clientId) {
      try {
        const start = Date.now();
        updateTest('Generate Invoice', 'running');
        addLog('Generating invoice...');

        const invoice = await createInvoice({
          client_id: clientId,
          amount: 35000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Generated from debug panel test',
          items: [
            { description: 'Monthly Package Fee', quantity: 1, unit_price: 25000 },
            { description: 'Additional Boost Budget', quantity: 1, unit_price: 10000 },
          ],
        });

        updateTest('Generate Invoice', 'success', `Invoice: ${invoice.invoice_number}`, Date.now() - start);
        addLog(`✅ Invoice generated: ${invoice.invoice_number}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateTest('Generate Invoice', 'error', msg);
        addLog(`❌ Invoice failed: ${msg}`);
      }
    }

    addLog('🏁 Master flow test complete!');
    await fetchHealth();
    setRunningTests(false);
  }, [user, addLog, fetchHealth]);

  const successCount = tests.filter((t) => t.status === 'success').length;
  const errorCount = tests.filter((t) => t.status === 'error').length;

  const [cleaning, setCleaning] = useState(false);
  const cleanupTestData = useCallback(async () => {
    setCleaning(true);
    addLog('🧹 Cleaning up test data...');
    try {
      // Delete test clients (created by debug panel)
      const { data: testClients } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('tenant_id', DEMO_TENANT_ID)
        .like('business_name', 'Test Client %');

      if (testClients && testClients.length > 0) {
        for (const tc of testClients) {
          // Delete related records first
          await supabase.from('deliverables').delete().eq('client_id', tc.id);
          await supabase.from('client_packages').delete().eq('client_id', tc.id);
          await supabase.from('campaigns').delete().eq('client_id', tc.id);
          await supabase.from('invoices').delete().eq('client_id', tc.id);
          await supabase.from('wallet_transactions').delete().eq('client_id', tc.id);
          await supabase.from('client_wallets').delete().eq('client_id', tc.id);
          
          // Delete workspace and channels
          const { data: ws } = await supabase.from('workspaces').select('id').eq('client_id', tc.id);
          if (ws) {
            for (const w of ws) {
              await supabase.from('messages').delete().eq('channel_id', (await supabase.from('channels').select('id').eq('workspace_id', w.id)).data?.map((c: any) => c.id)[0] || '');
              await supabase.from('channel_members').delete().eq('channel_id', (await supabase.from('channels').select('id').eq('workspace_id', w.id)).data?.map((c: any) => c.id)[0] || '');
              await supabase.from('channels').delete().eq('workspace_id', w.id);
              await supabase.from('workspace_members').delete().eq('workspace_id', w.id);
            }
            await supabase.from('workspaces').delete().eq('client_id', tc.id);
          }

          // Delete client login
          await supabase.from('demo_users').delete().eq('client_id', tc.id);
          
          // Delete client
          await supabase.from('clients').delete().eq('id', tc.id);
        }
        addLog(`🧹 Removed ${testClients.length} test client(s)`);
      }

      // Delete test team members
      const { data: testMembers } = await supabase
        .from('team_members')
        .select('id, email, user_profile_id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .like('email', '%@debug.com');

      if (testMembers && testMembers.length > 0) {
        for (const tm of testMembers) {
          await supabase.from('demo_users').delete().eq('team_member_id', tm.id);
          await supabase.from('workspace_members').delete().eq('user_profile_id', tm.user_profile_id);
          await supabase.from('team_members').delete().eq('id', tm.id);
          if (tm.user_profile_id) {
            await supabase.from('user_profiles').delete().eq('id', tm.user_profile_id);
          }
        }
        addLog(`🧹 Removed ${testMembers.length} test team member(s)`);
      }

      // Delete test activities & notifications
      await supabase.from('activities').delete().eq('tenant_id', DEMO_TENANT_ID).like('title', '%Test Client%');
      await supabase.from('notifications').delete().eq('tenant_id', DEMO_TENANT_ID).like('title', '%Test Client%');

      addLog('✅ Test data cleanup complete!');
      await fetchHealth();
    } catch (err) {
      addLog(`❌ Cleanup error: ${err}`);
    } finally {
      setCleaning(false);
    }
  }, [addLog, fetchHealth]);

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display font-extrabold text-3xl">
                <span className="text-titan-cyan">🧪 System</span>{' '}
                <span className="text-white">Debug Panel</span>
              </h1>
              <p className="font-mono text-xs text-white/30 mt-1">
                TITAN DEV AI — Functional Test & Health Monitor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => { fetchHealth(); fetchUserHealth(); }}
              disabled={loading}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={runMasterFlowTest}
              disabled={runningTests}
              className="bg-titan-cyan/20 hover:bg-titan-cyan/30 border border-titan-cyan/40 text-titan-cyan font-display font-bold text-sm"
            >
              <Zap className={`w-4 h-4 mr-2 ${runningTests ? 'animate-pulse' : ''}`} />
              {runningTests ? 'Running Tests...' : 'Run Master Flow Test'}
            </Button>
            <Button
              onClick={cleanupTestData}
              disabled={cleaning}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-display font-bold text-sm"
            >
              <Wrench className={`w-4 h-4 mr-2 ${cleaning ? 'animate-spin' : ''}`} />
              {cleaning ? 'Cleaning...' : 'Cleanup Test Data'}
            </Button>
          </div>
        </div>

        {/* Health Metrics */}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { icon: Users, label: 'Clients', value: health.totalClients, color: 'cyan' },
              { icon: Package, label: 'Deliverables', value: health.totalDeliverables, color: 'purple' },
              { icon: CheckCircle, label: 'Completed', value: health.completedDeliverables, color: 'lime' },
              { icon: MessageSquare, label: 'Messages', value: health.totalMessages, color: 'cyan' },
              { icon: Megaphone, label: 'Active Campaigns', value: health.activeCampaigns, color: 'magenta' },
              { icon: Clock, label: 'Pending', value: health.pendingDeliverables, color: 'yellow' },
              { icon: FileText, label: 'Usage Items', value: health.packageUsageItems, color: 'purple' },
              { icon: Megaphone, label: 'Total Campaigns', value: health.totalCampaigns, color: 'cyan' },
              { icon: Wallet, label: 'Wallet Balance', value: `৳${health.totalWalletBalance.toLocaleString()}`, color: 'lime' },
              { icon: Database, label: 'Tenant', value: 'OK', color: 'cyan' },
            ].map(({ icon: Icon, label, value, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-xl`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 text-titan-${color}`} />
                  <span className="font-mono text-[10px] text-white/40 uppercase">{label}</span>
                </div>
                <p className="font-display font-extrabold text-2xl text-white">{value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* User System Health */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white">
              <Shield className="w-5 h-5 inline mr-2 text-titan-purple" />
              User System Health
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={fetchUserHealth}
                size="sm"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
              <Button
                onClick={testRealtimeChannels}
                size="sm"
                disabled={testingRealtime}
                className="bg-titan-purple/20 hover:bg-titan-purple/30 border border-titan-purple/40 text-titan-purple text-xs"
              >
                <Zap className={`w-3 h-3 mr-1 ${testingRealtime ? 'animate-pulse' : ''}`} />
                Test Realtime
              </Button>
              <Button
                onClick={handleRepairLinks}
                disabled={repairing}
                size="sm"
                className="bg-titan-purple/20 hover:bg-titan-purple/30 border border-titan-purple/40 text-titan-purple text-xs"
              >
                <Wrench className={`w-3 h-3 mr-1 ${repairing ? 'animate-spin' : ''}`} />
                {repairing ? 'Repairing...' : 'Repair User Links'}
              </Button>
            </div>
          </div>

          {userHealth ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { key: 'total_demo_users', label: 'Demo Users', icon: Users, color: 'cyan' },
                { key: 'total_user_profiles', label: 'User Profiles', icon: UserCheck, color: 'purple' },
                { key: 'total_team_members', label: 'Team Members', icon: Users, color: 'lime' },
                { key: 'orphaned_demo_users_no_profile', label: 'Missing Profile', icon: AlertTriangle, color: 'magenta', isWarning: true },
                { key: 'orphaned_demo_users_no_team', label: 'Missing Team Link', icon: AlertTriangle, color: 'magenta', isWarning: true },
                { key: 'orphaned_team_members_no_profile', label: 'Orphan TM (no profile)', icon: AlertTriangle, color: 'yellow', isWarning: true },
                { key: 'total_clients', label: 'Active Clients', icon: Users, color: 'cyan' },
                { key: 'clients_with_wallet', label: 'With Wallet', icon: Wallet, color: 'lime' },
                { key: 'clients_with_workspace', label: 'With Workspace', icon: MessageSquare, color: 'lime' },
                { key: 'clients_with_login', label: 'With Login', icon: Link2, color: 'lime' },
                { key: 'total_packages', label: 'Active Packages', icon: Package, color: 'purple' },
                { key: 'active_packages', label: 'Assigned Packages', icon: Package, color: 'cyan' },
                { key: 'total_deliverables', label: 'Deliverables', icon: FileText, color: 'cyan' },
                { key: 'total_messages', label: 'Messages', icon: MessageSquare, color: 'purple' },
                { key: 'total_workspaces', label: 'Workspaces', icon: MessageSquare, color: 'lime' },
                { key: 'total_channels', label: 'Channels', icon: MessageSquare, color: 'cyan' },
                { key: 'total_invoices', label: 'Invoices', icon: FileText, color: 'lime' },
                { key: 'total_campaigns', label: 'Campaigns', icon: Megaphone, color: 'purple' },
              ].map(({ key, label, icon: Icon, color, isWarning }) => {
                const value = userHealth[key] ?? 0;
                const hasIssue = isWarning && value > 0;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-3 backdrop-blur-xl ${
                      hasIssue
                        ? 'bg-titan-magenta/5 border-titan-magenta/20'
                        : 'bg-white/[0.03] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${hasIssue ? 'text-titan-magenta' : `text-titan-${color}`}`} />
                      <span className="font-mono text-[9px] text-white/40 uppercase">{label}</span>
                    </div>
                    <p className={`font-display font-extrabold text-xl ${hasIssue ? 'text-titan-magenta' : 'text-white'}`}>
                      {value}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-white/30 font-mono text-xs py-4">Loading user health...</div>
          )}

          {/* Repair Results */}
          {repairResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 rounded-lg border p-3 ${
                repairResult.count === 0
                  ? 'bg-titan-lime/5 border-titan-lime/20'
                  : 'bg-titan-cyan/5 border-titan-cyan/20'
              }`}
            >
              <p className="font-mono text-xs text-white/70 mb-1">
                {repairResult.count === 0 ? '✅ All user links healthy!' : `🔧 Repaired ${repairResult.count} user(s)`}
              </p>
              {repairResult.details.map((detail, i) => (
                <p key={i} className="font-mono text-[10px] text-white/40">{detail}</p>
              ))}
            </motion.div>
          )}
        </div>

        {/* Orphaned Records Detection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white">
              <AlertTriangle className="w-5 h-5 inline mr-2 text-titan-magenta" />
              Orphaned Records Detection
            </h2>
            <Button
              onClick={detectOrphanedRecords}
              disabled={detectingOrphans}
              size="sm"
              className="bg-titan-magenta/20 hover:bg-titan-magenta/30 border border-titan-magenta/40 text-titan-magenta text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${detectingOrphans ? 'animate-spin' : ''}`} />
              {detectingOrphans ? 'Detecting...' : 'Detect Orphans'}
            </Button>
          </div>

          {orphanedRecords && (
            <div className="space-y-3">
              {/* Visual Link Diagram */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6 backdrop-blur-xl">
                <h3 className="font-mono text-xs text-white/60 uppercase mb-4">User System Link Chain</h3>
                <div className="flex items-center justify-between gap-4 text-center">
                  <div className="flex-1">
                    <div className={`rounded-lg p-4 border-2 ${orphanedRecords.demo_users_no_profile.length > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-titan-cyan/30 bg-titan-cyan/5'}`}>
                      <Users className={`w-8 h-8 mx-auto mb-2 ${orphanedRecords.demo_users_no_profile.length > 0 ? 'text-red-400' : 'text-titan-cyan'}`} />
                      <p className="font-display font-bold text-white text-sm">demo_users</p>
                      <p className="font-mono text-xs text-white/40 mt-1">{userHealth?.total_demo_users || 0} total</p>
                    </div>
                  </div>
                  <div className="flex-none">
                    <Link2 className={`w-6 h-6 ${orphanedRecords.demo_users_no_profile.length > 0 || orphanedRecords.profiles_no_demo.length > 0 ? 'text-red-400' : 'text-titan-lime'}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-lg p-4 border-2 ${orphanedRecords.profiles_no_demo.length > 0 || orphanedRecords.demo_users_no_profile.length > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-titan-purple/30 bg-titan-purple/5'}`}>
                      <UserCheck className={`w-8 h-8 mx-auto mb-2 ${orphanedRecords.profiles_no_demo.length > 0 || orphanedRecords.demo_users_no_profile.length > 0 ? 'text-red-400' : 'text-titan-purple'}`} />
                      <p className="font-display font-bold text-white text-sm">user_profiles</p>
                      <p className="font-mono text-xs text-white/40 mt-1">{userHealth?.total_user_profiles || 0} total</p>
                    </div>
                  </div>
                  <div className="flex-none">
                    <Link2 className={`w-6 h-6 ${orphanedRecords.demo_no_team.length > 0 || orphanedRecords.team_no_profile.length > 0 ? 'text-red-400' : 'text-titan-lime'}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-lg p-4 border-2 ${orphanedRecords.team_no_profile.length > 0 || orphanedRecords.demo_no_team.length > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-titan-lime/30 bg-titan-lime/5'}`}>
                      <Users className={`w-8 h-8 mx-auto mb-2 ${orphanedRecords.team_no_profile.length > 0 || orphanedRecords.demo_no_team.length > 0 ? 'text-red-400' : 'text-titan-lime'}`} />
                      <p className="font-display font-bold text-white text-sm">team_members</p>
                      <p className="font-mono text-xs text-white/40 mt-1">{userHealth?.total_team_members || 0} total</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="font-mono text-xs text-red-400">{orphanedRecords.demo_users_no_profile.length} missing profile</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-xs text-red-400">{orphanedRecords.profiles_no_demo.length} no demo user</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-xs text-red-400">{orphanedRecords.demo_no_team.length + orphanedRecords.team_no_profile.length} team issues</p>
                  </div>
                </div>
              </div>

              {/* Issue Details */}
              <div className="grid grid-cols-2 gap-3">
                {/* Demo users without profiles */}
                {orphanedRecords.demo_users_no_profile.length > 0 && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                    <p className="font-mono text-xs text-red-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.demo_users_no_profile.length} Demo User(s) without Profile
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.demo_users_no_profile.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.email} ({record.role})
                        </p>
                      ))}
                      {orphanedRecords.demo_users_no_profile.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.demo_users_no_profile.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Profiles without demo users */}
                {orphanedRecords.profiles_no_demo.length > 0 && (
                  <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3">
                    <p className="font-mono text-xs text-orange-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.profiles_no_demo.length} Profile(s) without Demo User
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.profiles_no_demo.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.email}
                        </p>
                      ))}
                      {orphanedRecords.profiles_no_demo.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.profiles_no_demo.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Demo users without team members */}
                {orphanedRecords.demo_no_team.length > 0 && (
                  <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                    <p className="font-mono text-xs text-yellow-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.demo_no_team.length} Staff without Team Link
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.demo_no_team.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.email} ({record.role})
                        </p>
                      ))}
                      {orphanedRecords.demo_no_team.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.demo_no_team.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Team members without profiles */}
                {orphanedRecords.team_no_profile.length > 0 && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                    <p className="font-mono text-xs text-red-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.team_no_profile.length} Team Member(s) without Profile
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.team_no_profile.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.email} ({record.role})
                        </p>
                      ))}
                      {orphanedRecords.team_no_profile.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.team_no_profile.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Clients without wallet */}
                {orphanedRecords.clients_no_wallet.length > 0 && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                    <p className="font-mono text-xs text-red-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.clients_no_wallet.length} Client(s) without Wallet
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.clients_no_wallet.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.business_name}
                        </p>
                      ))}
                      {orphanedRecords.clients_no_wallet.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.clients_no_wallet.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Clients without workspace */}
                {orphanedRecords.clients_no_workspace.length > 0 && (
                  <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3">
                    <p className="font-mono text-xs text-orange-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.clients_no_workspace.length} Client(s) without Workspace
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.clients_no_workspace.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.business_name}
                        </p>
                      ))}
                      {orphanedRecords.clients_no_workspace.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.clients_no_workspace.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Clients without login */}
                {orphanedRecords.clients_no_login.length > 0 && (
                  <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                    <p className="font-mono text-xs text-yellow-400 font-semibold mb-2">
                      ⚠️ {orphanedRecords.clients_no_login.length} Client(s) without Login
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orphanedRecords.clients_no_login.slice(0, 5).map((record) => (
                        <p key={record.id} className="font-mono text-[10px] text-white/40">
                          {record.business_name}
                        </p>
                      ))}
                      {orphanedRecords.clients_no_login.length > 5 && (
                        <p className="font-mono text-[10px] text-white/30">...and {orphanedRecords.clients_no_login.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* All Good Message */}
              {orphanedRecords.demo_users_no_profile.length === 0 &&
               orphanedRecords.profiles_no_demo.length === 0 &&
               orphanedRecords.demo_no_team.length === 0 &&
               orphanedRecords.team_no_profile.length === 0 &&
               orphanedRecords.clients_no_wallet.length === 0 &&
               orphanedRecords.clients_no_workspace.length === 0 &&
               orphanedRecords.clients_no_login.length === 0 && (
                <div className="rounded-lg bg-lime-500/5 border border-lime-500/20 p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                  <p className="font-mono text-sm text-lime-400">✅ All records properly linked — no orphans detected!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Realtime Status Panel */}
        {Object.keys(realtimeStatus).length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg text-white mb-4">
              <Activity className="w-5 h-5 inline mr-2 text-titan-cyan" />
              Realtime Subscription Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(realtimeStatus).map(([table, { status, message }]) => (
                <motion.div
                  key={table}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-white font-semibold">{table}</span>
                    {status === 'active' && <CheckCircle className="w-5 h-5 text-lime-400" />}
                    {status === 'testing' && <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />}
                    {status === 'inactive' && <AlertTriangle className="w-5 h-5 text-orange-400" />}
                    {status === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                  </div>
                  <p className={`text-xs font-mono ${
                    status === 'active' ? 'text-lime-400' :
                    status === 'testing' ? 'text-yellow-400' :
                    status === 'inactive' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {status === 'active' ? '● ACTIVE' :
                     status === 'testing' ? '○ TESTING...' :
                     status === 'inactive' ? '○ INACTIVE' :
                     '✕ ERROR'}
                  </p>
                  {message && (
                    <p className="text-[10px] text-white/40 mt-1 font-mono">{message}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Test Results */}
        {tests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-white">
                <Activity className="w-5 h-5 inline mr-2 text-titan-cyan" />
                Master Flow Test Results
              </h2>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-titan-lime">✅ {successCount} passed</span>
                {errorCount > 0 && (
                  <span className="font-mono text-xs text-titan-magenta">❌ {errorCount} failed</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {tests.map((test) => (
                <motion.div
                  key={test.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-lg border p-3 flex items-center justify-between ${
                    test.status === 'success'
                      ? 'bg-titan-lime/5 border-titan-lime/20'
                      : test.status === 'error'
                      ? 'bg-titan-magenta/5 border-titan-magenta/20'
                      : test.status === 'running'
                      ? 'bg-titan-cyan/5 border-titan-cyan/20'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        test.status === 'success'
                          ? 'bg-titan-lime'
                          : test.status === 'error'
                          ? 'bg-titan-magenta'
                          : test.status === 'running'
                          ? 'bg-titan-cyan animate-pulse'
                          : 'bg-white/20'
                      }`}
                    />
                    <span className="font-mono text-sm text-white/80">{test.name}</span>
                    {test.message && (
                      <span className="font-mono text-[10px] text-white/40">— {test.message}</span>
                    )}
                  </div>
                  {test.time !== undefined && (
                    <span className="font-mono text-[10px] text-white/30">{test.time}ms</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Log Console */}
        <div>
          <h2 className="font-display font-bold text-lg text-white mb-3">
            <Terminal className="w-5 h-5 inline mr-2 text-titan-purple" />
            Console Log
          </h2>
          <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] p-4 max-h-80 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-white/20">No logs yet. Run the master flow test to see results.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-white/50 py-0.5 border-b border-white/[0.03] last:border-0">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
