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
  const [loading, setLoading] = useState(true);

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

        setRecentInvoices(invoices.slice(0, 8).map((i: any) => ({
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
    } catch (e) {
      console.error('FinanceDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = invoiceSummary.paid_amount;
  const pendingRevenue = invoiceSummary.pending_amount + invoiceSummary.overdue_amount;

  const stats = [
    { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: 'titan-lime', bg: 'from-titan-lime/15 to-titan-lime/5', sub: `${invoiceSummary.paid} invoices paid` },
    { label: 'Pending Amount', value: `$${(pendingRevenue / 1000).toFixed(1)}K`, icon: Clock, color: 'titan-cyan', bg: 'from-titan-cyan/15 to-titan-cyan/5', sub: `${invoiceSummary.pending + invoiceSummary.overdue} invoices` },
    { label: 'Wallet Balance', value: `$${(walletOverview.total_balance / 1000).toFixed(1)}K`, icon: Wallet, color: 'titan-purple', bg: 'from-titan-purple/15 to-titan-purple/5', sub: `${walletOverview.wallet_count} wallets` },
    { label: 'Overdue', value: `$${(invoiceSummary.overdue_amount / 1000).toFixed(1)}K`, icon: AlertTriangle, color: 'titan-magenta', bg: 'from-titan-magenta/15 to-titan-magenta/5', sub: `${invoiceSummary.overdue} invoices` },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-titan-amber/30 border-t-titan-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-titan-cyan" /> Recent Invoices
            </h2>
            <span className="font-mono-data text-[10px] text-white/30">{invoiceSummary.total} total</span>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-mono text-xs">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
              {recentInvoices.map((inv) => (
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
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
                    <span className={cn(
                      'font-mono-data text-sm font-bold',
                      isCredit ? 'text-titan-lime' : 'text-titan-magenta'
                    )}>
                      {isCredit ? '+' : '-'}${Number(txn.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      </motion.div>
    </div>
  );
}
