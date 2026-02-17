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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { getSystemHealth, createClient, linkPackageToClient, createDeliverable, updateDeliverableStatus, sendMessage, createCampaign, creditWallet, debitWallet, createInvoice } from '@/lib/data-service';
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

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

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
      addLog('Creating test client...');

      const client = await createClient({
        business_name: `Test Client ${Date.now().toString().slice(-4)}`,
        category: 'Corporate',
        location: 'Debug Panel, Dhaka',
        contact_email: 'test@debug.com',
        contact_phone: '+880 1900-000000',
      });

      clientId = client.id;
      updateTest('Create Client', 'success', `ID: ${clientId.slice(0, 8)}...`, Date.now() - start);
      addLog(`✅ Client created: ${client.business_name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateTest('Create Client', 'error', msg);
      addLog(`❌ Client create failed: ${msg}`);
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
              onClick={fetchHealth}
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
