import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  CreditCard,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Send,
  RefreshCw,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface InvoiceSummary {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
}

interface WalletOverview {
  total_balance: number;
  total_credits: number;
  total_debits: number;
  wallet_count: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  client_name?: string;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  client_name: string;
  due_date: string | null;
  created_at: string;
}

interface CampaignSpend {
  platform: string;
  total_budget: number;
  total_spent: number;
  count: number;
}

export default function FinanceDashboard() {
  const { user } = useAuth();
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary>({
    total: 0, paid: 0, pending: 0, overdue: 0,
    paid_amount: 0, pending_amount: 0, overdue_amount: 0,
  });
  const [walletOverview, setWalletOverview] = useState<WalletOverview>({
    total_balance: 0, total_credits: 0, total_debits: 0, wallet_count: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [campaignSpends, setCampaignSpends] = useState<CampaignSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invTab, setInvTab] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch all invoices for summary
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, amount, due_date, invoice_number, created_at, clients(business_name)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false });

      if (invoices) {
        const paid = invoices.filter((i: any) => i.status === 'paid');
        const pending = invoices.filter((i: any) => i.status === 'sent' || i.status === 'draft');
        const overdue = invoices.filter((i: any) => i.status === 'overdue');

        setInvoiceSummary({
          total: invoices.length,
          paid: paid.length,
          pending: pending.length,
          overdue: overdue.length,
          paid_amount: paid.reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
          pending_amount: pending.reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
          overdue_amount: overdue.reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
        });

        setRecentInvoices(invoices.slice(0, 10).map((i: any) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          amount: i.amount,
          status: i.status,
          client_name: i.clients?.business_name || 'Unknown',
          due_date: i.due_date,
          created_at: i.created_at,
        })));
      }

      // Fetch wallets
      const { data: wallets } = await supabase
        .from('client_wallets')
        .select('balance');

      // Fetch all transactions to compute credits/debits
      const { data: allTxns } = await supabase
        .from('wallet_transactions')
        .select('type, amount');

      const totalCredits = (allTxns || []).filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const totalDebits = (allTxns || []).filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      if (wallets) {
        setWalletOverview({
          total_balance: wallets.reduce((s: number, w: any) => s + Number(w.balance || 0), 0),
          total_credits: totalCredits,
          total_debits: totalDebits,
          wallet_count: wallets.length,
        });
      }

      // Fetch recent transactions
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*, client_wallets(clients(business_name))')
        .order('created_at', { ascending: false })
        .limit(10);

      if (txns) {
        setRecentTransactions(txns.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description || '',
          created_at: t.created_at,
          client_name: t.client_wallets?.clients?.business_name || 'Unknown',
        })));
      }

      // Fetch campaign spend breakdown
      const { data: campData } = await supabase
        .from('campaigns')
        .select('platform, budget, spent')
        .eq('tenant_id', DEMO_TENANT_ID);

      if (campData) {
        const platformMap: Record<string, CampaignSpend> = {};
        campData.forEach((c: any) => {
          const p = c.platform || 'other';
          if (!platformMap[p]) platformMap[p] = { platform: p, total_budget: 0, total_spent: 0, count: 0 };
          platformMap[p].total_budget += Number(c.budget || 0);
          platformMap[p].total_spent += Number(c.spent || 0);
          platformMap[p].count++;
        });
        setCampaignSpends(Object.values(platformMap).sort((a, b) => b.total_spent - a.total_spent));
      }
    } catch (e) {
      console.error('FinanceDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = invoiceSummary.paid_amount;
  const pendingRevenue = invoiceSummary.pending_amount + invoiceSummary.overdue_amount;
  const totalCampaignSpent = campaignSpends.reduce((s, c) => s + c.total_spent, 0);

  // Filter invoices
  const filteredInvoices = invTab === 'all' ? recentInvoices :
    recentInvoices.filter(i =>
      invTab === 'paid' ? i.status === 'paid' :
      invTab === 'pending' ? (i.status === 'sent' || i.status === 'draft') :
      i.status === 'overdue'
    );

  const platformEmoji = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'facebook': return '📘';
      case 'instagram': return '📸';
      case 'google': return '🔍';
      case 'tiktok': return '🎵';
      case 'youtube': return '🎬';
      default: return '🌐';
    }
  };

  const stats = [
    { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: 'titan-lime', bg: 'from-titan-lime/15 to-titan-lime/5', sub: `${invoiceSummary.paid} invoices paid` },
    { label: 'Pending Amount', value: `$${(pendingRevenue / 1000).toFixed(1)}K`, icon: Clock, color: 'titan-cyan', bg: 'from-titan-cyan/15 to-titan-cyan/5', sub: `${invoiceSummary.pending + invoiceSummary.overdue} invoices` },
    { label: 'Wallet Balance', value: `$${(walletOverview.total_balance / 1000).toFixed(1)}K`, icon: Wallet, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5', sub: `${walletOverview.wallet_count} wallets` },
    { label: 'Overdue', value: `$${(invoiceSummary.overdue_amount / 1000).toFixed(1)}K`, icon: AlertTriangle, color: 'titan-magenta', bg: 'from-titan-magenta/15 to-titan-magenta/5', sub: `${invoiceSummary.overdue} invoices` },
  ];

  const quickActions = [
    { label: 'Create Invoice', icon: Plus, color: 'titan-lime' },
    { label: 'Send Reminder', icon: Send, color: 'titan-cyan' },
    { label: 'Process Payment', icon: CheckCircle2, color: 'titan-purple' },
    { label: 'Export Report', icon: Download, color: 'yellow-400' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-titan-lime/10 border border-yellow-500/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl text-white">
                Finance <span className="text-gradient-cyan">Dashboard</span>
              </h1>
              <p className="font-mono-data text-xs text-white/30">
                {user?.display_name || 'Finance'} — Revenue, Invoices & Wallets
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white/40" />
            <span className="font-mono-data text-[10px] text-white/40">Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={cn(
                'relative rounded-xl border border-white/[0.06] p-4',
                'bg-gradient-to-br', stat.bg,
                'hover:border-white/[0.12] transition-all duration-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn('w-5 h-5', `text-${stat.color}`)} />
                <span className={cn('font-display font-extrabold text-xl', `text-${stat.color}`)}>
                  {stat.value}
                </span>
              </div>
              <p className="font-mono-data text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
              <p className="font-mono-data text-[9px] text-white/20 mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-wrap items-center gap-3"
      >
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                'bg-white/[0.03] border border-white/[0.06]',
                'hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200',
                'group'
              )}
            >
              <Icon className={cn('w-4 h-4', `text-${action.color}`, 'group-hover:scale-110 transition-transform')} />
              <span className="font-mono text-xs text-white/60 group-hover:text-white/80 transition-colors">
                {action.label}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Wallet Flow Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
      >
        <h2 className="font-display font-bold text-sm text-white mb-4">Wallet Flow Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-titan-lime/5 border border-titan-lime/10">
            <ArrowUpRight className="w-5 h-5 text-titan-lime mx-auto mb-1" />
            <p className="font-display font-bold text-lg text-titan-lime">
              ${walletOverview.total_credits.toLocaleString()}
            </p>
            <p className="font-mono-data text-[10px] text-white/30">Total Credits</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-titan-magenta/5 border border-titan-magenta/10">
            <ArrowDownRight className="w-5 h-5 text-titan-magenta mx-auto mb-1" />
            <p className="font-display font-bold text-lg text-titan-magenta">
              ${walletOverview.total_debits.toLocaleString()}
            </p>
            <p className="font-mono-data text-[10px] text-white/30">Total Debits</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-titan-cyan/5 border border-titan-cyan/10">
            <Wallet className="w-5 h-5 text-titan-cyan mx-auto mb-1" />
            <p className="font-display font-bold text-lg text-titan-cyan">
              ${walletOverview.total_balance.toLocaleString()}
            </p>
            <p className="font-mono-data text-[10px] text-white/30">Current Balance</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Invoices with tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-titan-cyan" /> Invoices
            </h2>
            <span className="font-mono-data text-[10px] text-white/30">{invoiceSummary.total} total</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
            {([
              { key: 'all' as const, label: 'All', count: recentInvoices.length },
              { key: 'paid' as const, label: 'Paid', count: invoiceSummary.paid },
              { key: 'pending' as const, label: 'Pending', count: invoiceSummary.pending },
              { key: 'overdue' as const, label: 'Overdue', count: invoiceSummary.overdue },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setInvTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-mono transition-all',
                  invTab === tab.key
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full',
                  invTab === tab.key ? 'bg-titan-cyan/20 text-titan-cyan' : 'bg-white/5 text-white/30'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No invoices in this category</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    inv.status === 'paid' ? 'bg-titan-lime/10' :
                    inv.status === 'overdue' ? 'bg-titan-magenta/10' : 'bg-white/5'
                  )}>
                    {inv.status === 'paid' ? <CheckCircle2 className="w-4 h-4 text-titan-lime" /> :
                     inv.status === 'overdue' ? <AlertTriangle className="w-4 h-4 text-titan-magenta" /> :
                     <Clock className="w-4 h-4 text-white/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xs text-white">{inv.invoice_number}</p>
                    <p className="font-mono-data text-[10px] text-white/30">{inv.client_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-data text-sm text-white font-bold">
                      ${Number(inv.amount).toLocaleString()}
                    </p>
                    <p className={cn(
                      'font-mono-data text-[9px]',
                      inv.status === 'paid' ? 'text-titan-lime' :
                      inv.status === 'overdue' ? 'text-titan-magenta' : 'text-yellow-400'
                    )}>
                      {inv.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-titan-purple" /> Recent Transactions
            </h2>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {recentTransactions.map((txn) => {
                const isCredit = txn.type === 'credit';
                return (
                  <div
                    key={txn.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      isCredit ? 'bg-titan-lime/10' : 'bg-titan-magenta/10'
                    )}>
                      {isCredit
                        ? <ArrowUpRight className="w-4 h-4 text-titan-lime" />
                        : <ArrowDownRight className="w-4 h-4 text-titan-magenta" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xs text-white truncate">
                        {txn.description || (isCredit ? 'Credit' : 'Debit')}
                      </p>
                      <p className="font-mono-data text-[10px] text-white/30">{txn.client_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn(
                        'font-mono-data text-sm font-bold',
                        isCredit ? 'text-titan-lime' : 'text-titan-magenta'
                      )}>
                        {isCredit ? '+' : '-'}${Number(txn.amount).toLocaleString()}
                      </span>
                      <p className="font-mono-data text-[9px] text-white/20">
                        {new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Campaign Spend + Invoice Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Campaign Spend by Platform */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <h2 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-titan-magenta" /> Campaign Spend by Platform
          </h2>
          {campaignSpends.length === 0 ? (
            <div className="text-center py-8 text-white/20">
              <Megaphone className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No campaign data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaignSpends.map((cs) => {
                const pct = cs.total_budget > 0 ? (cs.total_spent / cs.total_budget) * 100 : 0;
                return (
                  <div key={cs.platform} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{platformEmoji(cs.platform)}</span>
                        <span className="font-display text-xs text-white capitalize">{cs.platform}</span>
                        <span className="font-mono-data text-[9px] text-white/20">{cs.count} campaigns</span>
                      </div>
                      <span className="font-mono-data text-[10px] text-white/40">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] mb-1.5">
                      <div
                        className={cn('h-full rounded-full', pct > 85 ? 'bg-titan-magenta' : 'bg-titan-cyan')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-data text-[10px] text-titan-magenta">
                        Spent: ${cs.total_spent.toLocaleString()}
                      </span>
                      <span className="font-mono-data text-[10px] text-white/20">
                        Budget: ${cs.total_budget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                <span className="font-mono-data text-[10px] text-white/40">Total Campaign Spend</span>
                <span className="font-mono-data text-sm text-titan-magenta font-bold">
                  ${totalCampaignSpent.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Invoice Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <h2 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-titan-cyan" /> Invoice Status Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-titan-lime/5 border border-titan-lime/10">
              <CheckCircle2 className="w-4 h-4 text-titan-lime mx-auto mb-1" />
              <p className="font-display font-bold text-lg text-titan-lime">{invoiceSummary.paid}</p>
              <p className="font-mono-data text-[10px] text-white/30">Paid</p>
              <p className="font-mono-data text-[9px] text-titan-lime/60">${invoiceSummary.paid_amount.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <p className="font-display font-bold text-lg text-yellow-400">{invoiceSummary.pending}</p>
              <p className="font-mono-data text-[10px] text-white/30">Pending</p>
              <p className="font-mono-data text-[9px] text-yellow-400/60">${invoiceSummary.pending_amount.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-titan-magenta/5 border border-titan-magenta/10">
              <AlertTriangle className="w-4 h-4 text-titan-magenta mx-auto mb-1" />
              <p className="font-display font-bold text-lg text-titan-magenta">{invoiceSummary.overdue}</p>
              <p className="font-mono-data text-[10px] text-white/30">Overdue</p>
              <p className="font-mono-data text-[9px] text-titan-magenta/60">${invoiceSummary.overdue_amount.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-titan-cyan/5 border border-titan-cyan/10">
              <BarChart3 className="w-4 h-4 text-titan-cyan mx-auto mb-1" />
              <p className="font-display font-bold text-lg text-titan-cyan">{invoiceSummary.total}</p>
              <p className="font-mono-data text-[10px] text-white/30">Total</p>
              <p className="font-mono-data text-[9px] text-titan-cyan/60">
                ${(invoiceSummary.paid_amount + invoiceSummary.pending_amount + invoiceSummary.overdue_amount).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Collection Rate */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-data text-[10px] text-white/40">Collection Rate</span>
              <span className="font-mono-data text-xs text-titan-lime font-bold">
                {invoiceSummary.total > 0
                  ? ((invoiceSummary.paid / invoiceSummary.total) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-titan-lime to-titan-cyan"
                style={{ width: `${invoiceSummary.total > 0 ? (invoiceSummary.paid / invoiceSummary.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
