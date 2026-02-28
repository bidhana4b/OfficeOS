import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  getClientWalletTransactions,
  getClientWalletBalance,
  logExport,
} from '@/lib/data-service';
import { downloadFile } from '@/lib/export-utils';
import {
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Clock,
  Filter,
  RefreshCw,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
  DollarSign,
  Search,
  X,
  Download,
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  balance_after: number;
  created_at: string;
}

interface WalletData {
  balance: number;
  currency: string;
  updated_at: string;
}

type FilterType = 'all' | 'credit' | 'debit';

function formatCurrency(amount: number) {
  return `৳${Math.abs(amount).toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getTransactionColor(type: string): string {
  return type === 'credit' ? '#39FF14' : '#FF006E';
}

function getTransactionIcon(type: string) {
  return type === 'credit' ? ArrowDownRight : ArrowUpRight;
}

export default function ClientPaymentHistory({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) { setLoading(false); return; }

    try {
      const [txns, walletData] = await Promise.all([
        getClientWalletTransactions(clientId),
        getClientWalletBalance(clientId),
      ]);
      setTransactions(txns as Transaction[]);
      setWallet(walletData as WalletData);
    } catch (e) {
      console.error('Failed to fetch payment history:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = transactions.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = formatDate(t.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-titan-cyan" />
            Payment History
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">
            {transactions.length} transactions
          </p>
        </div>
        <button
          onClick={() => {
            const headers = 'Date,Type,Description,Amount,Balance After';
            const rows = filteredTransactions.map((t) =>
              `"${new Date(t.created_at).toLocaleDateString()}","${t.type}","${t.description}",${t.amount},${t.balance_after}`
            );
            const csv = [headers, ...rows].join('\n');
            const ts = new Date().toISOString().split('T')[0];
            downloadFile(csv, `payment_history_${ts}.csv`);
            if (user?.client_id) {
              logExport(user.client_id, 'payment_history_csv', `payment_history_${ts}.csv`, rows.length);
            }
          }}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          title="Export CSV"
        >
          <Download className="w-4 h-4 text-titan-lime/60" />
        </button>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Wallet Summary */}
      {wallet && (
        <div className="px-4 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
            style={{
              background: 'linear-gradient(135deg, rgba(57,255,20,0.08) 0%, rgba(0,217,255,0.08) 100%)',
            }}
          >
            <div className="absolute inset-0 backdrop-blur-xl" />
            <div className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] text-white/40">Current Balance</p>
                  <p className="font-display font-extrabold text-2xl text-titan-lime mt-0.5">
                    {formatCurrency(wallet.balance)}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-white/10" />
              </div>

              <div className="flex gap-3 mt-3">
                <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                  <TrendingUp className="w-3.5 h-3.5 text-titan-lime" />
                  <div>
                    <p className="font-mono text-[8px] text-white/25">Total In</p>
                    <p className="font-mono text-[11px] text-titan-lime font-bold">{formatCurrency(totalCredit)}</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                  <TrendingDown className="w-3.5 h-3.5 text-titan-magenta" />
                  <div>
                    <p className="font-mono text-[8px] text-white/25">Total Out</p>
                    <p className="font-mono text-[11px] text-titan-magenta font-bold">{formatCurrency(totalDebit)}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { id: 'all' as FilterType, label: 'All' },
          { id: 'credit' as FilterType, label: 'Credits' },
          { id: 'debit' as FilterType, label: 'Debits' },
        ].map((f) => {
          const isActive = filter === f.id;
          const color = f.id === 'credit' ? '#39FF14' : f.id === 'debit' ? '#FF006E' : '#ffffff';
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex-none px-3 py-1.5 rounded-full font-mono text-[10px] border transition-all active:scale-95"
              style={{
                background: isActive ? `${color}15` : 'transparent',
                borderColor: isActive ? `${color}40` : 'rgba(255,255,255,0.06)',
                color: isActive ? color : 'rgba(255,255,255,0.4)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-white/30" />
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/40 text-sm font-medium">No transactions</p>
            <p className="text-white/20 text-xs mt-1">
              {search ? 'No matching transactions found' : 'Your wallet transactions will appear here'}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, txns]) => (
            <div key={date}>
              <p className="font-mono text-[10px] text-white/25 uppercase tracking-wider mb-2">{date}</p>
              <div className="space-y-2">
                {txns.map((txn, i) => {
                  const color = getTransactionColor(txn.type);
                  const TxnIcon = getTransactionIcon(txn.type);
                  const isCredit = txn.type === 'credit';
                  return (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-card p-3 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                      >
                        <TxnIcon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-xs text-white truncate">
                          {txn.description || (isCredit ? 'Wallet Credit' : 'Wallet Debit')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-white/20" />
                          <span className="font-mono text-[9px] text-white/25">{formatTime(txn.created_at)}</span>
                          {txn.reference_type && (
                            <>
                              <span className="text-white/10">•</span>
                              <span className="font-mono text-[9px] text-white/20 capitalize">{txn.reference_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="font-display font-bold text-sm"
                          style={{ color }}
                        >
                          {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
                        </p>
                        <p className="font-mono text-[8px] text-white/15">Bal: {formatCurrency(txn.balance_after)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
