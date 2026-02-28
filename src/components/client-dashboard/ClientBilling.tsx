import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { creditWallet, getAutoPaymentSettings, saveAutoPaymentSettings } from '@/lib/data-service';
import {
  CreditCard,
  Download,
  Plus,
  Wallet,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  ArrowUpRight,
  FileText,
  X,
  Loader2,
  RefreshCw,
  Zap,
  Save,
} from 'lucide-react';

type InvoiceStatus = 'paid' | 'sent' | 'overdue' | 'draft';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  description: string;
}

// No more fallback mock data — real DB data only

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  paid: { label: 'Paid', color: '#39FF14', icon: CheckCircle2, bg: 'rgba(57,255,20,0.1)' },
  sent: { label: 'Pending', color: '#FFB800', icon: Clock, bg: 'rgba(255,184,0,0.1)' },
  overdue: { label: 'Overdue', color: '#FF006E', icon: AlertCircle, bg: 'rgba(255,0,110,0.1)' },
  draft: { label: 'Draft', color: '#ffffff30', icon: FileText, bg: 'rgba(255,255,255,0.04)' },
};

export default function ClientBilling() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showAddFund, setShowAddFund] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [addingFund, setAddingFund] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-payment state
  const [showAutoPayment, setShowAutoPayment] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [autoPayMethod, setAutoPayMethod] = useState('wallet');
  const [autoPayInvoices, setAutoPayInvoices] = useState(true);
  const [autoRenew, setAutoRenew] = useState(true);
  const [autoTopup, setAutoTopup] = useState(false);
  const [autoTopupAmount, setAutoTopupAmount] = useState('5000');
  const [autoTopupThreshold, setAutoTopupThreshold] = useState('1000');
  const [autoPaySaving, setAutoPaySaving] = useState(false);
  const [autoPaySaved, setAutoPaySaved] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      const clientId = user?.client_id;
      if (!clientId) { setLoading(false); return; }

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('client_wallets')
        .select('balance')
        .eq('client_id', clientId)
        .single();
      if (walletData) setWalletBalance(Number(walletData.balance));

      // Fetch invoices
      const { data: invoiceData, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (!invErr && invoiceData && invoiceData.length > 0) {
        const mapped: Invoice[] = invoiceData.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          number: (r.invoice_number as string) || '',
          amount: Number(r.amount) || 0,
          status: (r.status as InvoiceStatus) || 'draft',
          dueDate: r.due_date ? (r.due_date as string).split('T')[0] : '',
          paidAt: r.paid_at ? (r.paid_at as string).split('T')[0] : undefined,
          description: (r.notes as string) || `Invoice ${r.invoice_number}`,
        }));
        setInvoices(mapped);
      }

      // Fetch auto-payment settings
      try {
        const apData = await getAutoPaymentSettings(clientId);
        if (apData) {
          setAutoPayEnabled(apData.enabled);
          setAutoPayMethod(apData.payment_method || 'wallet');
          setAutoPayInvoices(apData.auto_pay_invoices ?? true);
          setAutoRenew(apData.auto_renew_package ?? true);
          setAutoTopup(apData.auto_topup_enabled ?? false);
          setAutoTopupAmount(String(apData.auto_topup_amount || 5000));
          setAutoTopupThreshold(String(apData.auto_topup_threshold || 1000));
        }
      } catch (_e) {
        // No settings yet
      }
    } catch (e) {
      console.error('Failed to fetch billing data:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchBillingData(); }, [fetchBillingData]);

  // Real-time subscriptions for billing data
  useEffect(() => {
    const clientId = user?.client_id;
    if (!clientId) return;

    const walletChannel = supabase
      .channel(`client-wallet-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_wallets',
        filter: `client_id=eq.${clientId}`,
      }, () => { fetchBillingData(); })
      .subscribe();

    const invoiceChannel = supabase
      .channel(`client-invoices-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `client_id=eq.${clientId}`,
      }, () => { fetchBillingData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(invoiceChannel);
    };
  }, [user?.client_id, fetchBillingData]);

  const handleAddFund = useCallback(async () => {
    const clientId = user?.client_id;
    const amount = Number(fundAmount);
    if (!clientId || !amount || amount <= 0) return;
    setAddingFund(true);
    try {
      await creditWallet(clientId, amount, 'Client fund deposit');
      setShowAddFund(false);
      setFundAmount('');
      await fetchBillingData();
    } catch (e) {
      console.error('Failed to add fund:', e);
    } finally {
      setAddingFund(false);
    }
  }, [user?.client_id, fundAmount, fetchBillingData]);

  const totalDue = invoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const handleSaveAutoPay = async () => {
    const clientId = user?.client_id;
    if (!clientId) return;
    setAutoPaySaving(true);
    try {
      await saveAutoPaymentSettings(clientId, {
        enabled: autoPayEnabled,
        payment_method: autoPayMethod,
        auto_pay_invoices: autoPayInvoices,
        auto_renew_package: autoRenew,
        auto_topup_enabled: autoTopup,
        auto_topup_amount: Number(autoTopupAmount) || 0,
        auto_topup_threshold: Number(autoTopupThreshold) || 0,
      });
      setAutoPaySaved(true);
      setTimeout(() => setAutoPaySaved(false), 3000);
    } catch (e) {
      console.error('Failed to save auto-payment:', e);
    } finally {
      setAutoPaySaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-titan-cyan" />
          Billing
        </h1>
        <p className="font-mono text-[10px] text-white/30 mt-0.5">
          Invoices, payments & wallet
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-5">
        {/* Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            background: 'linear-gradient(135deg, rgba(57,255,20,0.08) 0%, rgba(0,217,255,0.06) 100%)',
          }}
        >
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="relative p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-titan-lime" />
                  <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">Wallet Balance</span>
                </div>
                <p className="font-display font-extrabold text-2xl text-white">
                  ৳{walletBalance.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowAddFund(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-titan-lime/15 border border-titan-lime/25 active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5 text-titan-lime" />
                <span className="font-display font-bold text-xs text-titan-lime">Add Fund</span>
              </button>
            </div>

            <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.06]">
              <div>
                <p className="font-mono text-[9px] text-white/30">Total Due</p>
                <p className="font-display font-bold text-sm text-titan-magenta">
                  ৳{totalDue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-white/30">Total Paid</p>
                <p className="font-display font-bold text-sm text-titan-lime">
                  ৳{totalPaid.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Auto Payment Setup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-titan-amber" />
              <h3 className="font-display font-bold text-sm text-white">Auto Payment</h3>
            </div>
            <div className="flex items-center gap-2">
              {autoPaySaved && (
                <span className="font-mono text-[9px] text-titan-lime">✓ Saved</span>
              )}
              <button
                onClick={() => setShowAutoPayment(!showAutoPayment)}
                className="font-mono text-[10px] text-titan-cyan active:scale-95 transition-transform"
              >
                {showAutoPayment ? 'Hide' : 'Setup'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] text-white/40">Auto-pay Status</p>
              <p className={`font-mono text-xs font-bold ${autoPayEnabled ? 'text-titan-lime' : 'text-white/30'}`}>
                {autoPayEnabled ? 'Active' : 'Disabled'}
              </p>
            </div>
            <button
              onClick={() => {
                const next = !autoPayEnabled;
                setAutoPayEnabled(next);
                if (!next) setShowAutoPayment(false);
              }}
              className="relative transition-all duration-200"
              style={{ width: 40, height: 22 }}
            >
              <div className={`absolute inset-0 rounded-full transition-all duration-200 ${autoPayEnabled ? 'bg-titan-lime/30' : 'bg-white/10'}`} />
              <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-200 ${autoPayEnabled ? 'left-[20px] bg-titan-lime' : 'left-0.5 bg-white/30'}`} />
            </button>
          </div>

          <AnimatePresence>
            {showAutoPayment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Payment Method */}
                <div>
                  <label className="font-mono text-[10px] text-white/40 block mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'wallet', label: 'Wallet' },
                      { id: 'bkash', label: 'bKash' },
                      { id: 'nagad', label: 'Nagad' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setAutoPayMethod(m.id)}
                        className="py-2 rounded-lg border font-mono text-[10px] transition-all"
                        style={{
                          background: autoPayMethod === m.id ? 'rgba(0,217,255,0.1)' : 'transparent',
                          borderColor: autoPayMethod === m.id ? 'rgba(0,217,255,0.3)' : 'rgba(255,255,255,0.06)',
                          color: autoPayMethod === m.id ? '#00D9FF' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-pay toggles */}
                {[
                  { key: 'invoices', label: 'Auto-pay Invoices', desc: 'Pay invoices when due', value: autoPayInvoices, setter: setAutoPayInvoices },
                  { key: 'renew', label: 'Auto-renew Package', desc: 'Renew package on expiry', value: autoRenew, setter: setAutoRenew },
                  { key: 'topup', label: 'Auto Top-up Wallet', desc: 'Add funds when balance is low', value: autoTopup, setter: setAutoTopup },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="font-display font-semibold text-xs text-white">{item.label}</p>
                      <p className="font-mono text-[9px] text-white/25">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className="relative transition-all duration-200"
                      style={{ width: 36, height: 20 }}
                    >
                      <div className={`absolute inset-0 rounded-full transition-all duration-200 ${item.value ? 'bg-titan-cyan/30' : 'bg-white/10'}`} />
                      <div className={`absolute top-0.5 w-[16px] h-[16px] rounded-full transition-all duration-200 ${item.value ? 'left-[18px] bg-titan-cyan' : 'left-0.5 bg-white/30'}`} />
                    </button>
                  </div>
                ))}

                {/* Auto top-up amount */}
                {autoTopup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-mono text-[9px] text-white/30 block mb-1">Top-up Amount</label>
                        <input
                          type="number"
                          value={autoTopupAmount}
                          onChange={(e) => setAutoTopupAmount(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[9px] text-white/30 block mb-1">When Below</label>
                        <input
                          type="number"
                          value={autoTopupThreshold}
                          onChange={(e) => setAutoTopupThreshold(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={handleSaveAutoPay}
                  disabled={autoPaySaving}
                  className="w-full py-2.5 rounded-xl bg-titan-amber/15 border border-titan-amber/30 font-display font-bold text-xs text-titan-amber active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {autoPaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Auto Payment
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Invoice List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-titan-cyan" />
              Invoices
            </h2>
            <span className="font-mono text-[10px] text-white/30">{invoices.length} total</span>
          </div>

          <div className="space-y-2">
            {invoices.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-white/40 text-sm font-medium">No invoices yet</p>
                <p className="text-white/20 text-xs mt-1">Your invoices will appear here</p>
              </div>
            )}
            {invoices.map((invoice, i) => {
              const status = statusConfig[invoice.status];
              const StatusIcon = status.icon;

              return (
                <motion.button
                  key={invoice.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedInvoice(invoice)}
                  className="w-full text-left glass-card p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: status.bg }}
                  >
                    <StatusIcon className="w-4.5 h-4.5" style={{ color: status.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-display font-semibold text-xs text-white truncate">{invoice.number}</p>
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-white/35 truncate">{invoice.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-sm text-white">
                      ৳{invoice.amount.toLocaleString()}
                    </p>
                    <p className="font-mono text-[9px] text-white/25 mt-0.5">
                      {invoice.status === 'paid' ? `Paid ${invoice.paidAt}` : `Due ${invoice.dueDate}`}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoice Detail Panel */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedInvoice(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-titan-bg border-t border-white/10 rounded-t-3xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-bold text-lg text-white">{selectedInvoice.number}</p>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono mt-1"
                      style={{
                        background: statusConfig[selectedInvoice.status].bg,
                        color: statusConfig[selectedInvoice.status].color,
                      }}
                    >
                      {statusConfig[selectedInvoice.status].label}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                <div className="glass-card p-4">
                  <p className="font-mono text-[10px] text-white/30 mb-1">Amount</p>
                  <p className="font-display font-extrabold text-2xl text-white">
                    ৳{selectedInvoice.amount.toLocaleString()}
                  </p>
                </div>

                <p className="font-mono text-xs text-white/50">{selectedInvoice.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3">
                    <p className="font-mono text-[9px] text-white/30">Due Date</p>
                    <p className="font-display font-semibold text-xs text-white mt-0.5">{selectedInvoice.dueDate}</p>
                  </div>
                  {selectedInvoice.paidAt && (
                    <div className="glass-card p-3">
                      <p className="font-mono text-[9px] text-white/30">Paid Date</p>
                      <p className="font-display font-semibold text-xs text-titan-lime mt-0.5">{selectedInvoice.paidAt}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl glass-card flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
                    <Download className="w-4 h-4 text-white/50" />
                    <span className="font-display font-bold text-xs text-white/70">Download PDF</span>
                  </button>
                  {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                    <button className="flex-1 py-2.5 rounded-xl bg-titan-lime/15 border border-titan-lime/30 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
                      <CreditCard className="w-4 h-4 text-titan-lime" />
                      <span className="font-display font-bold text-xs text-titan-lime">Pay Now</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Fund Panel */}
      <AnimatePresence>
        {showAddFund && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddFund(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-titan-bg border-t border-white/10 rounded-t-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" />
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-base text-white">Add Funds</h2>
                  <button onClick={() => setShowAddFund(false)} className="w-8 h-8 rounded-full glass-card flex items-center justify-center">
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                <input
                  type="number"
                  placeholder="Amount (BDT)"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-lime/30"
                />

                <div className="flex gap-2">
                  {[5000, 10000, 25000, 50000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setFundAmount(String(amount))}
                      className="flex-1 py-2 rounded-lg glass-card font-mono text-[10px] text-white/50 active:scale-95 transition-transform"
                    >
                      ৳{(amount / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddFund}
                  disabled={addingFund || !fundAmount || Number(fundAmount) <= 0}
                  className="w-full py-3 rounded-xl bg-titan-lime/15 border border-titan-lime/30 font-display font-bold text-sm text-titan-lime active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingFund ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addingFund ? 'Processing...' : 'Add Fund'}
                </button>

                <p className="font-mono text-[10px] text-white/25">Payment Methods</p>
                {['Bank Transfer', 'bKash / Nagad', 'Credit Card'].map((method) => (
                  <button
                    key={method}
                    className="w-full glass-card p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                  >
                    <span className="font-display font-semibold text-xs text-white">{method}</span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
