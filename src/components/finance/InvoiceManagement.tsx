import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Trash2,
  Receipt,
  X,
  Printer,
  Copy,
  Eye,
  BarChart3,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Hash,
  Building2,
  ChevronRight,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getClientListForSelect,
  subscribeToTable,
} from '@/lib/data-service';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  clients?: { business_name: string };
  invoice_items?: InvoiceItem[];
}

interface ClientOption {
  id: string;
  business_name: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string; borderColor: string; gradient: string }> = {
  draft: { label: 'Draft', color: 'text-white/50', icon: FileText, bgColor: 'bg-white/[0.06]', borderColor: 'border-white/[0.1]', gradient: 'from-white/5 to-transparent' },
  sent: { label: 'Sent', color: 'text-titan-cyan', icon: Send, bgColor: 'bg-titan-cyan/10', borderColor: 'border-titan-cyan/20', gradient: 'from-titan-cyan/5 to-transparent' },
  paid: { label: 'Paid', color: 'text-titan-lime', icon: CheckCircle2, bgColor: 'bg-titan-lime/10', borderColor: 'border-titan-lime/20', gradient: 'from-titan-lime/5 to-transparent' },
  overdue: { label: 'Overdue', color: 'text-titan-magenta', icon: AlertTriangle, bgColor: 'bg-titan-magenta/10', borderColor: 'border-titan-magenta/20', gradient: 'from-titan-magenta/5 to-transparent' },
  cancelled: { label: 'Cancelled', color: 'text-white/30', icon: X, bgColor: 'bg-white/[0.04]', borderColor: 'border-white/[0.08]', gradient: 'from-white/3 to-transparent' },
  partial: { label: 'Partial', color: 'text-titan-amber', icon: CreditCard, bgColor: 'bg-titan-amber/10', borderColor: 'border-titan-amber/20', gradient: 'from-titan-amber/5 to-transparent' },
};

function formatDate(dateStr: string | null | undefined, fallback = '—') {
  if (!dateStr) return fallback;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysUntilDue(dueDate: string | null) {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getDueDateLabel(dueDate: string | null, status: string) {
  if (status === 'paid' || status === 'cancelled') return null;
  const days = getDaysUntilDue(dueDate);
  if (days === null) return null;
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: 'text-titan-magenta' };
  if (days === 0) return { text: 'Due today', color: 'text-titan-amber' };
  if (days <= 3) return { text: `Due in ${days}d`, color: 'text-titan-amber' };
  if (days <= 7) return { text: `Due in ${days}d`, color: 'text-titan-cyan' };
  return { text: `Due in ${days}d`, color: 'text-white/40' };
}

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due'>('date');
  const printRef = useRef<HTMLDivElement>(null);

  const [createForm, setCreateForm] = useState({
    client_id: '',
    due_date: '',
    notes: '',
    currency: 'BDT',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices({ status: activeFilter });
      setInvoices(data as Invoice[]);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const data = await getClientListForSelect();
      setClients(data as ClientOption[]);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [fetchInvoices, fetchClients]);

  useEffect(() => {
    const unsub = subscribeToTable('invoices', () => {
      fetchInvoices();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInvoices]);

  const fetchInvoiceDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await getInvoiceById(id);
      setDetailInvoice(data as Invoice);
    } catch (err) {
      console.error('Failed to fetch invoice detail:', err);
      setDetailInvoice(selectedInvoice);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedInvoice]);

  const filteredInvoices = invoices
    .filter((inv) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          inv.invoice_number?.toLowerCase().includes(q) ||
          inv.clients?.business_name?.toLowerCase().includes(q) ||
          inv.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'amount') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'due') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = invoices.filter((i) => i.status === 'sent' || i.status === 'draft').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const overdueAmount = invoices.filter((i) => i.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const thisMonthInvoices = invoices.filter((i) => {
    const created = new Date(i.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });
  const thisMonthAmount = thisMonthInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const handleCreate = async () => {
    if (!createForm.client_id) {
      setError('Please select a client');
      return;
    }
    const validItems = lineItems.filter((li) => li.description && li.unit_price > 0);
    if (validItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const totalAmt = validItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
      await createInvoice({
        client_id: createForm.client_id,
        amount: totalAmt,
        currency: createForm.currency,
        due_date: createForm.due_date || undefined,
        notes: createForm.notes || undefined,
        items: validItems,
      });
      setShowCreateDialog(false);
      setCreateForm({ client_id: '', due_date: '', notes: '', currency: 'BDT' });
      setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
      fetchInvoices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateInvoiceStatus(id, status);
      fetchInvoices();
      if (detailInvoice?.id === id) {
        setDetailInvoice({ ...detailInvoice, status, paid_at: status === 'paid' ? new Date().toISOString() : detailInvoice.paid_at });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoice(id);
      fetchInvoices();
      setShowDetailDialog(false);
      setShowPreviewDialog(false);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailInvoice(invoice);
    setShowDetailDialog(true);
    fetchInvoiceDetail(invoice.id);
  };

  const openPreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailInvoice(invoice);
    setShowPreviewDialog(true);
    fetchInvoiceDetail(invoice.id);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    (updated[idx] as Record<string, unknown>)[field] = value;
    setLineItems(updated);
  };

  const copyInvoiceNumber = (num: string) => {
    navigator.clipboard.writeText(num);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>Invoice ${detailInvoice?.invoice_number}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1a1a2e; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e9ecef; }
            td { padding: 12px; border-bottom: 1px solid #f1f1f1; }
          </style></head><body>
          ${printRef.current.innerHTML}
          </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All', count: invoices.length },
    { id: 'draft', label: 'Draft', count: invoices.filter((i) => i.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: invoices.filter((i) => i.status === 'sent').length },
    { id: 'paid', label: 'Paid', count: invoices.filter((i) => i.status === 'paid').length },
    { id: 'overdue', label: 'Overdue', count: invoices.filter((i) => i.status === 'overdue').length },
    { id: 'cancelled', label: 'Cancelled', count: invoices.filter((i) => i.status === 'cancelled').length },
  ];

  const sortOptions = [
    { id: 'date' as const, label: 'Date' },
    { id: 'amount' as const, label: 'Amount' },
    { id: 'due' as const, label: 'Due Date' },
  ];

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20">
                <Receipt className="w-5 h-5 text-titan-cyan" />
              </div>
              Invoice Management
            </h2>
            <p className="font-mono text-xs text-white/30 mt-1.5 ml-[42px]">
              Track, create, and manage all client invoices &amp; payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInvoices()}
              className="border-white/[0.08] text-white/40 hover:bg-white/[0.04] hover:text-white/60 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Enhanced Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            {
              label: 'Total Revenue',
              value: `৳${totalAmount.toLocaleString()}`,
              sub: `${invoices.length} invoices total`,
              icon: DollarSign,
              color: 'text-white/80',
              border: 'border-white/[0.08]',
              bg: 'bg-white/[0.02]',
            },
            {
              label: 'Collected',
              value: `৳${paidAmount.toLocaleString()}`,
              sub: `${collectionRate}% collection rate · ${paidCount} paid`,
              icon: CheckCircle2,
              color: 'text-titan-lime',
              border: 'border-titan-lime/20',
              bg: 'bg-titan-lime/[0.03]',
              trend: collectionRate > 50 ? 'up' as const : 'down' as const,
            },
            {
              label: 'Pending',
              value: `৳${pendingAmount.toLocaleString()}`,
              sub: `${invoices.filter((i) => i.status === 'sent' || i.status === 'draft').length} awaiting payment`,
              icon: Clock,
              color: 'text-titan-cyan',
              border: 'border-titan-cyan/20',
              bg: 'bg-titan-cyan/[0.03]',
            },
            {
              label: 'Overdue',
              value: `৳${overdueAmount.toLocaleString()}`,
              sub: overdueCount > 0 ? `${overdueCount} invoices overdue!` : 'All clear',
              icon: AlertTriangle,
              color: overdueCount > 0 ? 'text-titan-magenta' : 'text-white/40',
              border: overdueCount > 0 ? 'border-titan-magenta/20' : 'border-white/[0.08]',
              bg: overdueCount > 0 ? 'bg-titan-magenta/[0.03]' : 'bg-white/[0.02]',
              pulse: overdueCount > 0,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'rounded-xl border p-4 flex items-center gap-3 transition-all hover:scale-[1.01]',
                stat.border,
                stat.bg,
                stat.pulse && 'animate-pulse-glow'
              )}
            >
              <div className={cn('p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-center gap-1.5">
                  <p className={cn('font-display font-extrabold text-lg leading-tight', stat.color)}>
                    {stat.value}
                  </p>
                  {'trend' in stat && stat.trend && (
                    stat.trend === 'up'
                      ? <ArrowUpRight className="w-3.5 h-3.5 text-titan-lime" />
                      : <ArrowDownRight className="w-3.5 h-3.5 text-titan-magenta" />
                  )}
                </div>
                {stat.sub && <p className="font-mono text-[9px] text-white/25 mt-0.5">{stat.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* This Month Mini Banner */}
        {thisMonthInvoices.length > 0 && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-gradient-to-r from-titan-cyan/[0.06] to-transparent border border-titan-cyan/10 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-titan-cyan/60" />
            <span className="font-mono text-[10px] text-white/40">This month:</span>
            <span className="font-display font-bold text-xs text-titan-cyan">
              {thisMonthInvoices.length} invoices · ৳{thisMonthAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* Filter tabs + Search + Sort + View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap flex items-center gap-1.5',
                  activeFilter === tab.id
                    ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                )}
              >
                {tab.label}
                {tab.count > 0 && <span className="text-[10px] opacity-60">{tab.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={cn(
                    'px-2 py-1 font-mono text-[10px] transition-all',
                    sortBy === opt.id ? 'bg-titan-cyan/10 text-titan-cyan' : 'text-white/30 hover:text-white/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoices..."
                className="pl-9 bg-white/[0.04] border-white/[0.08] text-sm h-8 text-white/80 placeholder:text-white/30 font-mono"
              />
            </div>
            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 transition-all', viewMode === 'grid' ? 'bg-titan-cyan/10 text-titan-cyan' : 'text-white/30 hover:text-white/50')}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 transition-all', viewMode === 'list' ? 'bg-titan-cyan/10 text-titan-cyan' : 'text-white/30 hover:text-white/50')}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List / Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className={cn('gap-4', viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cn('rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]', viewMode === 'grid' ? 'h-52' : 'h-16')} />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                <Receipt className="w-10 h-10 text-white/10" />
              </div>
              <p className="font-display font-bold text-sm text-white/40">No invoices found</p>
              <p className="font-mono text-xs text-white/20 mt-1 mb-4">Create your first invoice to get started</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ========================== GRID VIEW ========================== */
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredInvoices.map((invoice, i) => {
                  const config = statusConfig[invoice.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  const dueLabel = getDueDateLabel(invoice.due_date, invoice.status);

                  return (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => openDetail(invoice)}
                      className="group rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all p-4 relative overflow-hidden"
                    >
                      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity', config.gradient)} />

                      <div className="relative z-10">
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3 h-3 text-white/20" />
                              <span className="font-display font-bold text-sm text-white/90">
                                {invoice.invoice_number}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 ml-[18px]">
                              <Building2 className="w-2.5 h-2.5 text-white/20" />
                              <span className="font-mono text-[10px] text-white/40 line-clamp-1">
                                {invoice.clients?.business_name || 'Unknown Client'}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0 border shrink-0', config.borderColor, config.bgColor, config.color)}
                          >
                            <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                            {config.label}
                          </Badge>
                        </div>

                        {/* Amount */}
                        <div className="mb-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                          <p className="font-mono text-[10px] text-white/30 uppercase">Amount</p>
                          <p className="font-display font-extrabold text-xl text-white/90">
                            ৳{(invoice.amount || 0).toLocaleString()}
                          </p>
                          <p className="font-mono text-[9px] text-white/25 mt-0.5">{invoice.currency || 'BDT'}</p>
                        </div>

                        {/* Date info */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="px-2 py-1.5 rounded-lg bg-white/[0.03]">
                            <p className="font-mono text-[8px] text-white/30 uppercase">Created</p>
                            <p className="font-display font-bold text-xs text-white/60">{formatDateShort(invoice.created_at)}</p>
                          </div>
                          <div className="px-2 py-1.5 rounded-lg bg-white/[0.03]">
                            <p className="font-mono text-[8px] text-white/30 uppercase">Due</p>
                            <p className={cn('font-display font-bold text-xs', dueLabel?.color || 'text-white/60')}>
                              {invoice.due_date ? formatDateShort(invoice.due_date) : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Due date warning */}
                        {dueLabel && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Clock className="w-3 h-3 text-white/20" />
                            <span className={cn('font-mono text-[10px]', dueLabel.color)}>{dueLabel.text}</span>
                          </div>
                        )}

                        {/* Notes preview */}
                        {invoice.notes && (
                          <p className="font-mono text-[10px] text-white/25 line-clamp-1 mb-2">📝 {invoice.notes}</p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
                          <span className="font-mono text-[10px] text-white/25">
                            {invoice.paid_at ? `Paid ${formatDateShort(invoice.paid_at)}` : formatDateShort(invoice.created_at)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openPreview(invoice); }}
                              className="p-1 rounded text-white/20 hover:text-titan-cyan hover:bg-titan-cyan/10 transition-all opacity-0 group-hover:opacity-100"
                              title="Preview"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                          </div>
                        </div>

                        {/* Quick status actions on hover */}
                        {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <div className="mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                            {invoice.status === 'draft' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(invoice.id, 'sent'); }}
                                className="flex-1 px-2 py-1 rounded-md bg-titan-cyan/10 text-titan-cyan font-mono text-[10px] hover:bg-titan-cyan/20 transition-all flex items-center justify-center gap-1"
                              >
                                <Send className="w-2.5 h-2.5" /> Send
                              </button>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusUpdate(invoice.id, 'paid'); }}
                                  className="flex-1 px-2 py-1 rounded-md bg-titan-lime/10 text-titan-lime font-mono text-[10px] hover:bg-titan-lime/20 transition-all flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Paid
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); }}
                                  className="flex-1 px-2 py-1 rounded-md bg-titan-amber/10 text-titan-amber font-mono text-[10px] hover:bg-titan-amber/20 transition-all flex items-center justify-center gap-1"
                                >
                                  <Mail className="w-2.5 h-2.5" /> Remind
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            /* ========================== LIST VIEW ========================== */
            <div className="space-y-1.5">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.7fr_0.6fr_100px] gap-3 px-4 py-2">
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider">Invoice #</span>
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider">Client</span>
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider text-right">Amount</span>
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider">Due Date</span>
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider">Status</span>
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider text-right">Actions</span>
              </div>

              <AnimatePresence mode="popLayout">
                {filteredInvoices.map((invoice, i) => {
                  const config = statusConfig[invoice.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  const dueLabel = getDueDateLabel(invoice.due_date, invoice.status);

                  return (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => openDetail(invoice)}
                      className="group grid grid-cols-[1fr_1.2fr_0.8fr_0.7fr_0.6fr_100px] gap-3 items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('p-1.5 rounded-lg shrink-0', config.bgColor)}>
                          <StatusIcon className={cn('w-3 h-3', config.color)} />
                        </div>
                        <span className="font-display font-bold text-sm text-white/90 truncate">
                          {invoice.invoice_number}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="font-mono text-xs text-white/70 truncate">
                          {invoice.clients?.business_name || 'Unknown Client'}
                        </p>
                        {invoice.notes && (
                          <p className="font-mono text-[9px] text-white/25 truncate mt-0.5">{invoice.notes}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-display font-extrabold text-sm text-white/90">
                          ৳{(invoice.amount || 0).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="font-mono text-xs text-white/50">
                          {invoice.due_date ? formatDateShort(invoice.due_date) : '—'}
                        </p>
                        {dueLabel && (
                          <p className={cn('font-mono text-[9px] mt-0.5', dueLabel.color)}>{dueLabel.text}</p>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0 border w-fit', config.borderColor, config.bgColor, config.color)}
                      >
                        {config.label}
                      </Badge>

                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); openPreview(invoice); }}
                          className="p-1.5 rounded-lg text-white/20 hover:text-titan-cyan hover:bg-titan-cyan/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(invoice.id, 'sent'); }}
                            className="p-1.5 rounded-lg text-white/20 hover:text-titan-cyan hover:bg-titan-cyan/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Mark as Sent"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(invoice.id, 'paid'); }}
                            className="p-1.5 rounded-lg text-white/20 hover:text-titan-lime hover:bg-titan-lime/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ========================== CREATE INVOICE DIALOG ========================== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20">
                <Plus className="w-4 h-4 text-titan-cyan" />
              </div>
              Create New Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 font-mono text-xs text-titan-magenta flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Client *</Label>
                <select
                  value={createForm.client_id}
                  onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none"
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0D1029]">{c.business_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">Due Date</Label>
                <Input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-white/50 font-mono">Currency</Label>
                <select
                  value={createForm.currency}
                  onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none"
                >
                  {['BDT', 'USD', 'EUR', 'GBP'].map((c) => (
                    <option key={c} value={c} className="bg-[#0D1029]">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs text-white/50 font-mono flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Line Items
                </Label>
                <button
                  onClick={addLineItem}
                  className="text-xs text-titan-cyan hover:text-titan-cyan/80 font-mono flex items-center gap-1 px-2 py-1 rounded-md hover:bg-titan-cyan/10 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_100px_80px_30px] gap-2 px-1">
                  <span className="font-mono text-[9px] text-white/30 uppercase">Description</span>
                  <span className="font-mono text-[9px] text-white/30 uppercase">Qty</span>
                  <span className="font-mono text-[9px] text-white/30 uppercase">Unit Price</span>
                  <span className="font-mono text-[9px] text-white/30 uppercase text-right">Total</span>
                  <span />
                </div>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px_30px] gap-2 items-center">
                    <Input
                      placeholder="Service description..."
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      className="bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm h-9"
                    />
                    <Input
                      type="number"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm h-9"
                    />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm h-9"
                    />
                    <span className="font-mono text-xs text-white/50 text-right">
                      ৳{(item.quantity * item.unit_price).toLocaleString()}
                    </span>
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLineItem(idx)} className="p-1 text-white/20 hover:text-titan-magenta transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-white/40">Subtotal:</span>
                  <span className="font-display font-extrabold text-lg text-titan-cyan">
                    ৳{lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-white/50 font-mono">Notes / Terms</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                rows={3}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm resize-none"
                placeholder="Payment terms, additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-white/[0.08] text-white/60 hover:bg-white/[0.04]">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold gap-2"
            >
              {creating ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</>
              ) : (
                <><FileCheck className="w-3.5 h-3.5" /> Create Invoice</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================== INVOICE DETAIL DIALOG ========================== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20">
                <Receipt className="w-4 h-4 text-titan-cyan" />
              </div>
              {detailInvoice?.invoice_number || selectedInvoice?.invoice_number}
              <button
                onClick={() => copyInvoiceNumber(detailInvoice?.invoice_number || '')}
                className="p-1 rounded hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-all"
                title="Copy number"
              >
                <Copy className="w-3 h-3" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {(detailInvoice || selectedInvoice) && (() => {
            const inv = detailInvoice || selectedInvoice!;
            const config = statusConfig[inv.status] || statusConfig.draft;
            const dueLabel = getDueDateLabel(inv.due_date, inv.status);
            const items = inv.invoice_items || [];

            return (
              <div className="space-y-4 py-2">
                {loadingDetail && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                    <RefreshCw className="w-3 h-3 animate-spin text-titan-cyan" />
                    <span className="font-mono text-[10px] text-white/40">Loading details...</span>
                  </div>
                )}

                {/* Status + Amount Hero */}
                <div className={cn('p-4 rounded-xl border', config.borderColor, config.bgColor)}>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={cn('text-xs border px-2 py-0.5', config.borderColor, config.bgColor, config.color)}>
                      <config.icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    {dueLabel && (
                      <span className={cn('font-mono text-[10px]', dueLabel.color)}>{dueLabel.text}</span>
                    )}
                  </div>
                  <p className="font-display font-extrabold text-3xl text-white">
                    ৳{(inv.amount || 0).toLocaleString()}
                  </p>
                  <p className="font-mono text-[10px] text-white/30 mt-1">{inv.currency || 'BDT'}</p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <p className="font-mono text-[10px] text-white/40 uppercase mb-1 flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5" /> Client
                    </p>
                    <p className="font-display font-bold text-sm text-white/90">
                      {inv.clients?.business_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <p className="font-mono text-[10px] text-white/40 uppercase mb-1 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Due Date
                    </p>
                    <p className={cn('font-display font-bold text-sm', dueLabel?.color || 'text-white/70')}>
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Created</p>
                    <p className="font-mono text-sm text-white/70">{formatDate(inv.created_at)}</p>
                  </div>
                  {inv.paid_at && (
                    <div className="p-3 rounded-lg bg-titan-lime/[0.05] border border-titan-lime/10">
                      <p className="font-mono text-[10px] text-titan-lime/60 uppercase mb-1">Paid</p>
                      <p className="font-mono text-sm text-titan-lime">{formatDate(inv.paid_at)}</p>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                {items.length > 0 && (
                  <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                    <div className="px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider">Line Items</p>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {items.map((item, idx) => (
                        <div key={idx} className="px-3 py-2.5 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs text-white/80 truncate">{item.description}</p>
                            <p className="font-mono text-[9px] text-white/30">
                              {item.quantity} × ৳{(item.unit_price || 0).toLocaleString()}
                            </p>
                          </div>
                          <p className="font-display font-bold text-xs text-white/70 ml-3">
                            ৳{(item.quantity * item.unit_price).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-2.5 bg-white/[0.03] border-t border-white/[0.06] flex justify-between items-center">
                      <span className="font-mono text-xs text-white/40">Total</span>
                      <span className="font-display font-extrabold text-sm text-white">
                        ৳{items.reduce((s, li) => s + li.quantity * li.unit_price, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {inv.notes && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Notes</p>
                    <p className="font-mono text-xs text-white/60 whitespace-pre-wrap">{inv.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex gap-2">
                    {inv.status === 'draft' && (
                      <Button
                        onClick={() => handleStatusUpdate(inv.id, 'sent')}
                        className="flex-1 bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Invoice
                      </Button>
                    )}
                    {(inv.status === 'sent' || inv.status === 'overdue') && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate(inv.id, 'paid')}
                          className="flex-1 bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                        </Button>
                        <Button
                          variant="outline"
                          className="border-titan-amber/20 text-titan-amber/70 hover:bg-titan-amber/10 hover:text-titan-amber text-sm gap-2"
                        >
                          <Mail className="w-3.5 h-3.5" /> Send Reminder
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setShowDetailDialog(false); openPreview(inv); }}
                      className="flex-1 border-white/[0.08] text-white/50 hover:bg-white/[0.04] text-sm gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      className="border-white/[0.08] text-white/50 hover:bg-white/[0.04] text-sm gap-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    {inv.status !== 'paid' && (
                      <Button
                        onClick={() => handleStatusUpdate(inv.id, 'cancelled')}
                        variant="outline"
                        className="border-white/[0.08] text-white/30 hover:bg-white/[0.04] hover:text-white/50 text-sm gap-2"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(inv.id)}
                      variant="outline"
                      className="border-titan-magenta/20 text-titan-magenta/50 hover:bg-titan-magenta/10 hover:text-titan-magenta text-sm gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================== PRINT PREVIEW DIALOG ========================== */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-white text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div ref={printRef}>
            {(detailInvoice || selectedInvoice) && (() => {
              const inv = detailInvoice || selectedInvoice!;
              const items = inv.invoice_items || [];
              const config = statusConfig[inv.status] || statusConfig.draft;

              return (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
                      <p className="text-sm text-gray-500 mt-1 font-mono">{inv.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold" style={{ color: '#00D9FF' }}>TITAN</div>
                      <p className="text-xs text-gray-400 mt-1">Agency Management Platform</p>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-1">Bill To</p>
                      <p className="font-bold text-gray-900">{inv.clients?.business_name || 'Client'}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: inv.status === 'paid' ? '#39FF1420' : inv.status === 'overdue' ? '#FF006E20' : '#00D9FF20',
                          color: inv.status === 'paid' ? '#22c55e' : inv.status === 'overdue' ? '#ef4444' : '#0ea5e9',
                        }}
                      >
                        {config.label}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-1">Issue Date</p>
                      <p className="text-sm text-gray-700">{formatDate(inv.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-1">Due Date</p>
                      <p className="text-sm text-gray-700">{inv.due_date ? formatDate(inv.due_date) : '—'}</p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  {items.length > 0 ? (
                    <table className="w-full mb-6">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 text-[10px] uppercase text-gray-500 tracking-wider">Description</th>
                          <th className="text-center py-3 text-[10px] uppercase text-gray-500 tracking-wider w-20">Qty</th>
                          <th className="text-right py-3 text-[10px] uppercase text-gray-500 tracking-wider w-28">Unit Price</th>
                          <th className="text-right py-3 text-[10px] uppercase text-gray-500 tracking-wider w-28">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-3 text-sm text-gray-700">{item.description}</td>
                            <td className="py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                            <td className="py-3 text-sm text-gray-500 text-right">৳{(item.unit_price || 0).toLocaleString()}</td>
                            <td className="py-3 text-sm text-gray-900 font-semibold text-right">৳{(item.quantity * item.unit_price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-sm border-y border-gray-100 mb-6">
                      No line item details available
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex justify-end mb-8">
                    <div className="w-64">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Subtotal</span>
                        <span className="text-sm font-semibold text-gray-900">৳{(inv.amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b-2 border-gray-900">
                        <span className="font-bold text-gray-900">Total Due</span>
                        <span className="text-xl font-extrabold" style={{ color: '#00D9FF' }}>
                          ৳{(inv.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{inv.currency || 'BDT'}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {inv.notes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-1">Notes</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{inv.notes}</p>
                    </div>
                  )}

                  {inv.paid_at && (
                    <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                      <p className="text-sm font-semibold text-green-700">✅ Paid on {formatDate(inv.paid_at)}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)} className="text-gray-600">
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-gray-900 text-white hover:bg-gray-800 gap-2">
              <Printer className="w-4 h-4" /> Print / Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
