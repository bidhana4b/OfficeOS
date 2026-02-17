import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2024-001',
    amount: 85000,
    status: 'paid',
    dueDate: '2024-01-15',
    paidAt: '2024-01-12',
    description: 'Royal Dominance Package — January 2024',
  },
  {
    id: '2',
    number: 'INV-2024-002',
    amount: 85000,
    status: 'sent',
    dueDate: '2024-02-15',
    description: 'Royal Dominance Package — February 2024',
  },
  {
    id: '3',
    number: 'INV-2024-B01',
    amount: 15000,
    status: 'paid',
    dueDate: '2024-01-10',
    paidAt: '2024-01-10',
    description: 'Boost Campaign — New Year Sale (Meta Ads)',
  },
  {
    id: '4',
    number: 'INV-2024-B02',
    amount: 20000,
    status: 'overdue',
    dueDate: '2024-01-20',
    description: 'Boost Campaign — Showroom Visit (Google Ads)',
  },
  {
    id: '5',
    number: 'INV-2024-003',
    amount: 85000,
    status: 'draft',
    dueDate: '2024-03-15',
    description: 'Royal Dominance Package — March 2024',
  },
];

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  paid: { label: 'Paid', color: '#39FF14', icon: CheckCircle2, bg: 'rgba(57,255,20,0.1)' },
  sent: { label: 'Pending', color: '#FFB800', icon: Clock, bg: 'rgba(255,184,0,0.1)' },
  overdue: { label: 'Overdue', color: '#FF006E', icon: AlertCircle, bg: 'rgba(255,0,110,0.1)' },
  draft: { label: 'Draft', color: '#ffffff30', icon: FileText, bg: 'rgba(255,255,255,0.04)' },
};

export default function ClientBilling() {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(125000);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showAddFund, setShowAddFund] = useState(false);

  useEffect(() => {
    async function fetchWallet() {
      const clientId = user?.client_id || '00000000-0000-0000-0000-0000000000c1';
      const { data } = await supabase
        .from('client_wallets')
        .select('balance')
        .eq('client_id', clientId)
        .single();
      if (data) setWalletBalance(data.balance);
    }
    fetchWallet();
  }, [user]);

  const totalDue = mockInvoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPaid = mockInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

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

        {/* Invoice List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-titan-cyan" />
              Invoices
            </h2>
            <span className="font-mono text-[10px] text-white/30">{mockInvoices.length} total</span>
          </div>

          <div className="space-y-2">
            {mockInvoices.map((invoice, i) => {
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
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-lime/30"
                />

                <div className="flex gap-2">
                  {[5000, 10000, 25000, 50000].map((amount) => (
                    <button
                      key={amount}
                      className="flex-1 py-2 rounded-lg glass-card font-mono text-[10px] text-white/50 active:scale-95 transition-transform"
                    >
                      ৳{(amount / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>

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
