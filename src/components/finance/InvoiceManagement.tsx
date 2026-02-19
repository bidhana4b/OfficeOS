import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getClientListForSelect,
  subscribeToTable,
} from '@/lib/data-service';

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
  clients?: { business_name: string };
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-white/50', icon: FileText, bgColor: 'bg-white/[0.06]' },
  sent: { label: 'Sent', color: 'text-titan-cyan', icon: Send, bgColor: 'bg-titan-cyan/10' },
  paid: { label: 'Paid', color: 'text-titan-lime', icon: CheckCircle2, bgColor: 'bg-titan-lime/10' },
  overdue: { label: 'Overdue', color: 'text-titan-magenta', icon: AlertTriangle, bgColor: 'bg-titan-magenta/10' },
  cancelled: { label: 'Cancelled', color: 'text-white/30', icon: X, bgColor: 'bg-white/[0.04]' },
};

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    client_id: '',
    due_date: '',
    notes: '',
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

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.clients?.business_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = invoices.filter((i) => i.status === 'sent').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const overdueAmount = invoices.filter((i) => i.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0);

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
        due_date: createForm.due_date || undefined,
        notes: createForm.notes || undefined,
        items: validItems,
      });
      setShowCreateDialog(false);
      setCreateForm({ client_id: '', due_date: '', notes: '' });
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
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoice(id);
      fetchInvoices();
      setShowDetailDialog(false);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
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

  const filterTabs = [
    { id: 'all', label: 'All', count: invoices.length },
    { id: 'draft', label: 'Draft', count: invoices.filter((i) => i.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: invoices.filter((i) => i.status === 'sent').length },
    { id: 'paid', label: 'Paid', count: invoices.filter((i) => i.status === 'paid').length },
    { id: 'overdue', label: 'Overdue', count: invoices.filter((i) => i.status === 'overdue').length },
  ];

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-titan-cyan" />
              Invoice Management
            </h2>
            <p className="font-mono text-xs text-white/30 mt-1">
              Track, create, and manage all client invoices
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total', value: totalAmount, icon: DollarSign, color: 'text-white/80', border: 'border-white/[0.08]' },
            { label: 'Paid', value: paidAmount, icon: CheckCircle2, color: 'text-titan-lime', border: 'border-titan-lime/20' },
            { label: 'Pending', value: pendingAmount, icon: Clock, color: 'text-titan-cyan', border: 'border-titan-cyan/20' },
            { label: 'Overdue', value: overdueAmount, icon: AlertTriangle, color: 'text-titan-magenta', border: 'border-titan-magenta/20' },
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
                  ৳{stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-mono text-xs transition-all',
                  activeFilter === tab.id
                    ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="pl-9 bg-white/[0.04] border-white/[0.08] text-sm h-8 text-white/80 placeholder:text-white/30 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Receipt className="w-12 h-12 text-white/10 mb-3" />
              <p className="font-mono text-sm text-white/30">No invoices found</p>
              <p className="font-mono text-xs text-white/20 mt-1">Create your first invoice to get started</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredInvoices.map((invoice, i) => {
                const config = statusConfig[invoice.status] || statusConfig.draft;
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowDetailDialog(true);
                    }}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all"
                  >
                    <div className={cn('p-2.5 rounded-lg', config.bgColor)}>
                      <StatusIcon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-white/90">
                          {invoice.invoice_number}
                        </span>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border-0', config.bgColor, config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-white/40 truncate mt-0.5">
                        {invoice.clients?.business_name || 'Unknown Client'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-extrabold text-sm text-white/90">
                        ৳{(invoice.amount || 0).toLocaleString()}
                      </p>
                      <p className="font-mono text-[10px] text-white/30">
                        {invoice.due_date
                          ? `Due: ${new Date(invoice.due_date).toLocaleDateString()}`
                          : 'No due date'}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {invoice.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(invoice.id, 'sent');
                          }}
                          className="p-1.5 rounded-lg hover:bg-titan-cyan/10 text-white/30 hover:text-titan-cyan transition-colors"
                          title="Mark as Sent"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(invoice.id, 'paid');
                          }}
                          className="p-1.5 rounded-lg hover:bg-titan-lime/10 text-white/30 hover:text-titan-lime transition-colors"
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
          )}
        </div>
      </ScrollArea>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white">
              Create New Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/20 font-mono text-xs text-titan-magenta">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/50 font-mono">Client *</Label>
                <select
                  value={createForm.client_id}
                  onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none"
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0D1029]">
                      {c.business_name}
                    </option>
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
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-white/50 font-mono">Line Items</Label>
                <button
                  onClick={addLineItem}
                  className="text-xs text-titan-cyan hover:text-titan-cyan/80 font-mono flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      className="flex-1 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm h-9"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-20 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm h-9"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-28 bg-white/[0.04] border-white/[0.08] text-white/90 font-mono text-sm h-9"
                    />
                    <span className="font-mono text-xs text-white/40 w-20 text-right">
                      ৳{(item.quantity * item.unit_price).toLocaleString()}
                    </span>
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="p-1 text-white/20 hover:text-titan-magenta transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-white/[0.06]">
                <span className="font-display font-extrabold text-sm text-white/90">
                  Total: ৳{lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs text-white/50 font-mono">Notes</Label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                rows={2}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none resize-none"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-white/[0.08] text-white/60 hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold"
            >
              {creating ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-[#0D1029] border border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-titan-cyan" />
              {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase">Client</p>
                  <p className="font-display font-bold text-sm text-white/90">
                    {selectedInvoice.clients?.business_name}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs border-0',
                      statusConfig[selectedInvoice.status]?.bgColor,
                      statusConfig[selectedInvoice.status]?.color
                    )}
                  >
                    {statusConfig[selectedInvoice.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase">Amount</p>
                  <p className="font-display font-extrabold text-lg text-white">
                    ৳{(selectedInvoice.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase">Due Date</p>
                  <p className="font-mono text-sm text-white/70">
                    {selectedInvoice.due_date
                      ? new Date(selectedInvoice.due_date).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase">Created</p>
                  <p className="font-mono text-sm text-white/70">
                    {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedInvoice.paid_at && (
                  <div>
                    <p className="font-mono text-[10px] text-white/40 uppercase">Paid At</p>
                    <p className="font-mono text-sm text-titan-lime">
                      {new Date(selectedInvoice.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Notes</p>
                  <p className="font-mono text-xs text-white/60">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                {selectedInvoice.status === 'draft' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedInvoice.id, 'sent')}
                    className="flex-1 bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25 font-display font-bold text-sm gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Invoice
                  </Button>
                )}
                {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedInvoice.id, 'paid')}
                    className="flex-1 bg-titan-lime/15 border border-titan-lime/30 text-titan-lime hover:bg-titan-lime/25 font-display font-bold text-sm gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                  </Button>
                )}
                <Button
                  onClick={() => handleDelete(selectedInvoice.id)}
                  variant="outline"
                  className="border-titan-magenta/20 text-titan-magenta/60 hover:bg-titan-magenta/10 hover:text-titan-magenta text-sm gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
