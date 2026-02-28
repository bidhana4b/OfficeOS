import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Plus,
  Minus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAllClientWallets,
  getAllWalletTransactions,
  creditWallet,
  debitWallet,
  getWalletTransactions,
  subscribeToTable,
} from '@/lib/data-service';
import { DataSourceIndicator } from '@/components/ui/data-source-indicator';

interface ClientWallet {
  id: string;
  client_id: string;
  balance: number;
  currency: string;
  updated_at: string;
  clients?: { business_name: string; status: string };
}

interface WalletTransaction {
  id: string;
  client_wallet_id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  client_wallets?: { client_id: string; clients?: { business_name: string } };
}

export default function WalletAdmin() {
  const [wallets, setWallets] = useState<ClientWallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showDebitDialog, setShowDebitDialog] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<ClientWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [showWalletDetail, setShowWalletDetail] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [txForm, setTxForm] = useState({
    client_id: '',
    amount: 0,
    description: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletsData, txData] = await Promise.all([
        getAllClientWallets(),
        getAllWalletTransactions(50),
      ]);
      setWallets(walletsData as ClientWallet[]);
      setTransactions(txData as WalletTransaction[]);
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsub1 = subscribeToTable('client_wallets', () => fetchData());
    const unsub2 = subscribeToTable('wallet_transactions', () => fetchData());
    return () => {
      unsub1();
      unsub2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const filteredWallets = wallets.filter((w) => {
    if (searchQuery) {
      return w.clients?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const totalCredits = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalDebits = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);

  const handleCredit = async () => {
    if (!txForm.client_id || txForm.amount <= 0) {
      setError('Please fill in required fields');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await creditWallet(txForm.client_id, txForm.amount, txForm.description || undefined);
      setShowCreditDialog(false);
      setTxForm({ client_id: '', amount: 0, description: '' });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to credit wallet');
    } finally {
      setProcessing(false);
    }
  };

  const handleDebit = async () => {
    if (!txForm.client_id || txForm.amount <= 0) {
      setError('Please fill in required fields');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await debitWallet(txForm.client_id, txForm.amount, txForm.description || undefined);
      setShowDebitDialog(false);
      setTxForm({ client_id: '', amount: 0, description: '' });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to debit wallet');
    } finally {
      setProcessing(false);
    }
  };

  const openWalletDetail = async (wallet: ClientWallet) => {
    setSelectedWallet(wallet);
    setShowWalletDetail(true);
    try {
      const txs = await getWalletTransactions(wallet.client_id);
      setWalletTransactions(txs as WalletTransaction[]);
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
    }
  };

  const openCreditForWallet = (wallet: ClientWallet) => {
    setTxForm({ client_id: wallet.client_id, amount: 0, description: '' });
    setShowCreditDialog(true);
  };

  const openDebitForWallet = (wallet: ClientWallet) => {
    setTxForm({ client_id: wallet.client_id, amount: 0, description: '' });
    setShowDebitDialog(true);
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-titan-lime" />
              Wallet Admin
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-xs text-white/30">
                Manage client wallet balances, credits, and debits
              </p>
              <DataSourceIndicator isRealData={wallets.length > 0} size="xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setTxForm({ client_id: '', amount: 0, description: '' });
                setShowCreditDialog(true);
              }}
              className="bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              Credit
            </Button>
            <Button
              onClick={() => {
                setTxForm({ client_id: '', amount: 0, description: '' });
                setShowDebitDialog(true);
              }}
              className="bg-titan-magenta/15 border border-titan-magenta/30 text-titan-magenta hover:bg-titan-magenta/25 font-display font-bold text-sm gap-2"
            >
              <Minus className="w-4 h-4" />
              Debit
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Balance', value: `৳${totalBalance.toLocaleString()}`, icon: Wallet, color: 'text-white/80', border: 'border-white/[0.08]' },
            { label: 'Total Credits', value: `৳${totalCredits.toLocaleString()}`, icon: ArrowUpRight, color: 'text-titan-lime', border: 'border-titan-lime/20' },
            { label: 'Total Debits', value: `৳${totalDebits.toLocaleString()}`, icon: ArrowDownRight, color: 'text-titan-magenta', border: 'border-titan-magenta/20' },
            { label: 'Client Wallets', value: String(wallets.length), icon: Users, color: 'text-titan-cyan', border: 'border-titan-cyan/20' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'rounded-xl bg-white/[0.03] border p-3 flex items-center gap-3',
                stat.border
              )}
            >
              <div className={cn('p-2 rounded-lg bg-white/[0.04]', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                <p className={cn('font-display font-extrabold text-lg', stat.color)}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-sm h-8 text-white/80 placeholder:text-white/30 font-mono"
          />
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="wallets" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-3">
          <TabsList className="bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger value="wallets" className="data-[state=active]:bg-titan-cyan/10 data-[state=active]:text-titan-cyan font-mono text-xs">
              Client Wallets
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-titan-cyan/10 data-[state=active]:text-titan-cyan font-mono text-xs">
              Recent Transactions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="wallets" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : filteredWallets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Wallet className="w-12 h-12 text-white/10 mb-3" />
                  <p className="font-mono text-sm text-white/30">No client wallets found</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredWallets.map((wallet, i) => (
                    <motion.div
                      key={wallet.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openWalletDetail(wallet)}
                      className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all"
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        (wallet.balance || 0) > 0 ? 'bg-titan-lime/10' : 'bg-white/[0.06]'
                      )}>
                        <Wallet className={cn(
                          'w-4 h-4',
                          (wallet.balance || 0) > 0 ? 'text-titan-lime' : 'text-white/40'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-white/90">
                          {wallet.clients?.business_name || 'Unknown Client'}
                        </p>
                        <p className="font-mono text-[10px] text-white/30">
                          {wallet.clients?.status || 'unknown'} · Last updated: {new Date(wallet.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'font-display font-extrabold text-lg',
                          (wallet.balance || 0) > 0 ? 'text-titan-lime' : (wallet.balance || 0) < 0 ? 'text-titan-magenta' : 'text-white/40'
                        )}>
                          ৳{(wallet.balance || 0).toLocaleString()}
                        </p>
                        <p className="font-mono text-[10px] text-white/30">{wallet.currency || 'BDT'}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreditForWallet(wallet);
                          }}
                          className="p-1.5 rounded-lg hover:bg-titan-lime/10 text-white/30 hover:text-titan-lime transition-colors"
                          title="Credit"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDebitForWallet(wallet);
                          }}
                          className="p-1.5 rounded-lg hover:bg-titan-magenta/10 text-white/30 hover:text-titan-magenta transition-colors"
                          title="Debit"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Clock className="w-12 h-12 text-white/10 mb-3" />
                  <p className="font-mono text-sm text-white/30">No transactions yet</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {transactions.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        tx.type === 'credit' ? 'bg-titan-lime/10' : 'bg-titan-magenta/10'
                      )}>
                        {tx.type === 'credit'
                          ? <ArrowUpRight className="w-3.5 h-3.5 text-titan-lime" />
                          : <ArrowDownRight className="w-3.5 h-3.5 text-titan-magenta" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-white/70 truncate">
                          {tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit')}
                        </p>
                        <p className="font-mono text-[10px] text-white/30">
                          {tx.client_wallets?.clients?.business_name || 'Unknown'} · {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className={cn(
                        'font-display font-extrabold text-sm',
                        tx.type === 'credit' ? 'text-titan-lime' : 'text-titan-magenta'
                      )}>
                        {tx.type === 'credit' ? '+' : '-'}৳{(tx.amount || 0).toLocaleString()}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Credit Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-titan-lime" />
              Credit Wallet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 font-mono text-xs text-titan-magenta">
                {error}
              </div>
            )}

            {!txForm.client_id && (
              <div>
                <Label className="text-xs text-white/50 font-mono">Select Client *</Label>
                <select
                  value={txForm.client_id}
                  onChange={(e) => setTxForm({ ...txForm, client_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-lime/40 focus:outline-none"
                >
                  <option value="">Select Client</option>
                  {wallets.map((w) => (
                    <option key={w.client_id} value={w.client_id} className="bg-[#0D1029]">
                      {w.clients?.business_name} (Balance: ৳{(w.balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs text-white/50 font-mono">Amount (৳) *</Label>
              <Input
                type="number"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-white/50 font-mono">Description</Label>
              <Input
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="e.g. Monthly deposit"
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreditDialog(false)}
              className="border-white/[0.08] text-white/60 hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCredit}
              disabled={processing}
              className="bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold"
            >
              {processing ? 'Processing...' : 'Credit Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debit Dialog */}
      <Dialog open={showDebitDialog} onOpenChange={setShowDebitDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-titan-magenta" />
              Debit Wallet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 font-mono text-xs text-titan-magenta">
                {error}
              </div>
            )}

            {!txForm.client_id && (
              <div>
                <Label className="text-xs text-white/50 font-mono">Select Client *</Label>
                <select
                  value={txForm.client_id}
                  onChange={(e) => setTxForm({ ...txForm, client_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-magenta/40 focus:outline-none"
                >
                  <option value="">Select Client</option>
                  {wallets.map((w) => (
                    <option key={w.client_id} value={w.client_id} className="bg-[#0D1029]">
                      {w.clients?.business_name} (Balance: ৳{(w.balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs text-white/50 font-mono">Amount (৳) *</Label>
              <Input
                type="number"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-white/50 font-mono">Description</Label>
              <Input
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="e.g. Campaign charge"
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDebitDialog(false)}
              className="border-white/[0.08] text-white/60 hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDebit}
              disabled={processing}
              className="bg-titan-magenta/15 border border-titan-magenta/30 text-titan-magenta hover:bg-titan-magenta/25 font-display font-bold"
            >
              {processing ? 'Processing...' : 'Debit Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Detail Dialog */}
      <Dialog open={showWalletDetail} onOpenChange={setShowWalletDetail}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-titan-lime" />
              {selectedWallet?.clients?.business_name} — Wallet
            </DialogTitle>
          </DialogHeader>

          {selectedWallet && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Current Balance</p>
                <p className={cn(
                  'font-display font-extrabold text-3xl',
                  (selectedWallet.balance || 0) > 0 ? 'text-titan-lime' : (selectedWallet.balance || 0) < 0 ? 'text-titan-magenta' : 'text-white/50'
                )}>
                  ৳{(selectedWallet.balance || 0).toLocaleString()}
                </p>
                <p className="font-mono text-[10px] text-white/30 mt-1">{selectedWallet.currency || 'BDT'}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowWalletDetail(false);
                    openCreditForWallet(selectedWallet);
                  }}
                  className="flex-1 bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Credit
                </Button>
                <Button
                  onClick={() => {
                    setShowWalletDetail(false);
                    openDebitForWallet(selectedWallet);
                  }}
                  className="flex-1 bg-titan-magenta/15 border border-titan-magenta/30 text-titan-magenta hover:bg-titan-magenta/25 font-display font-bold text-sm gap-2"
                >
                  <Minus className="w-3.5 h-3.5" /> Debit
                </Button>
              </div>

              <div>
                <p className="font-mono text-xs text-white/50 mb-2">Transaction History</p>
                {walletTransactions.length === 0 ? (
                  <p className="font-mono text-xs text-white/30 text-center py-6">No transactions</p>
                ) : (
                  <div className="space-y-1.5">
                    {walletTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className={cn(
                          'p-1.5 rounded-lg',
                          tx.type === 'credit' ? 'bg-titan-lime/10' : 'bg-titan-magenta/10'
                        )}>
                          {tx.type === 'credit'
                            ? <ArrowUpRight className="w-3 h-3 text-titan-lime" />
                            : <ArrowDownRight className="w-3 h-3 text-titan-magenta" />
                          }
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-xs text-white/60">{tx.description || tx.type}</p>
                          <p className="font-mono text-[10px] text-white/30">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                        <span className={cn(
                          'font-display font-bold text-sm',
                          tx.type === 'credit' ? 'text-titan-lime' : 'text-titan-magenta'
                        )}>
                          {tx.type === 'credit' ? '+' : '-'}৳{(tx.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
