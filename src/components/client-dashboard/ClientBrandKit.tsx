import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  getBrandKitItems,
  addBrandKitItem,
  deleteBrandKitItem,
} from '@/lib/data-service';
import {
  Palette,
  ArrowLeft,
  Plus,
  Loader2,
  Image,
  Type,
  FileText,
  Trash2,
  Download,
  ExternalLink,
  X,
  Copy,
  CheckCircle2,
  RefreshCw,
  Paintbrush,
  Eye,
} from 'lucide-react';

interface BrandItem {
  id: string;
  item_type: string;
  name: string;
  value: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number;
  notes: string | null;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Image; color: string; label: string }> = {
  logo: { icon: Image, color: '#00D9FF', label: 'Logos' },
  color: { icon: Palette, color: '#FF006E', label: 'Brand Colors' },
  font: { icon: Type, color: '#7B61FF', label: 'Fonts' },
  guideline: { icon: FileText, color: '#FFB800', label: 'Guidelines' },
  template: { icon: Paintbrush, color: '#39FF14', label: 'Templates' },
  asset: { icon: Image, color: '#00D9FF', label: 'Assets' },
};

export default function ClientBrandKit({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    itemType: 'color',
    name: '',
    value: '',
    notes: '',
  });

  const fetchItems = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await getBrandKitItems(clientId, activeFilter === 'all' ? undefined : activeFilter);
      setItems(data as BrandItem[]);
    } catch (e) {
      console.error('Failed to fetch brand kit:', e);
      // No mock fallback - show empty state
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id, activeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    const clientId = user?.client_id;
    if (!clientId || !newItem.name.trim()) return;
    setSubmitting(true);
    try {
      await addBrandKitItem({
        clientId,
        itemType: newItem.itemType,
        name: newItem.name,
        value: newItem.value || undefined,
        notes: newItem.notes || undefined,
      });
      setShowAddForm(false);
      setNewItem({ itemType: 'color', name: '', value: '', notes: '' });
      fetchItems();
    } catch (e) {
      console.error('Failed to add item:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBrandKitItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const filters = ['all', ...Object.keys(typeConfig)];

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-titan-bg/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-sm text-white">Brand Kit</h1>
            <p className="font-mono text-[10px] text-white/30">{items.length} items</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-8 h-8 rounded-full bg-titan-cyan/15 border border-titan-cyan/30 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus className="w-4 h-4 text-titan-cyan" />
          </button>
          <button
            onClick={fetchItems}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <RefreshCw className={`w-4 h-4 text-white/30 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-none px-3 py-1.5 rounded-full font-mono text-[10px] transition-all ${
                activeFilter === f
                  ? 'bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan'
                  : 'bg-white/5 border border-white/[0.06] text-white/30'
              }`}
            >
              {f === 'all' ? 'All' : typeConfig[f]?.label || f}
            </button>
          ))}
        </div>

        {/* Items */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Palette className="w-10 h-10 text-white/10 mb-3" />
            <p className="font-display font-semibold text-sm text-white/40">No brand kit items</p>
            <p className="font-mono text-[10px] text-white/20 mt-1">Add colors, fonts, logos & more</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Color Items - Special Grid */}
            {(activeFilter === 'all' || activeFilter === 'color') && items.filter(i => i.item_type === 'color').length > 0 && (
              <div className="space-y-2">
                <h3 className="font-mono text-[10px] text-white/20 uppercase tracking-wider">
                  Colors
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {items.filter(i => i.item_type === 'color').map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-card overflow-hidden"
                    >
                      <div
                        className="h-16 w-full"
                        style={{ background: item.value || '#333' }}
                      />
                      <div className="p-2">
                        <p className="font-display font-semibold text-[10px] text-white truncate">{item.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-[8px] text-white/30 uppercase">{item.value}</span>
                          <button
                            onClick={() => handleCopy(item.value || '', item.id)}
                            className="active:scale-90 transition-transform"
                          >
                            {copied === item.id ? (
                              <CheckCircle2 className="w-3 h-3 text-titan-lime" />
                            ) : (
                              <Copy className="w-3 h-3 text-white/20" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Items - List */}
            {items.filter(i => (activeFilter === 'all' && i.item_type !== 'color') || (activeFilter !== 'all' && activeFilter !== 'color')).length > 0 && (
              <div className="space-y-2">
                {activeFilter === 'all' && (
                  <h3 className="font-mono text-[10px] text-white/20 uppercase tracking-wider mt-3">
                    Other Assets
                  </h3>
                )}
                {items
                  .filter(i => (activeFilter === 'all' && i.item_type !== 'color') || (activeFilter !== 'all' && activeFilter !== 'color'))
                  .map((item, idx) => {
                    const config = typeConfig[item.item_type] || typeConfig.asset;
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="glass-card p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${config.color}12`, border: `1px solid ${config.color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-xs text-white truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[9px] text-white/30 capitalize">{item.item_type}</span>
                              {item.value && (
                                <>
                                  <span className="text-white/10">•</span>
                                  <span className="font-mono text-[9px] text-white/20">{item.value}</span>
                                </>
                              )}
                            </div>
                            {item.notes && (
                              <p className="font-mono text-[9px] text-white/15 mt-0.5 truncate">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {item.value && (
                              <button
                                onClick={() => handleCopy(item.value || '', item.id)}
                                className="w-7 h-7 rounded-lg glass-card flex items-center justify-center active:scale-90 transition-transform"
                              >
                                {copied === item.id ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-titan-lime" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-white/20" />
                                )}
                              </button>
                            )}
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 rounded-lg glass-card flex items-center justify-center active:scale-90 transition-transform"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-white/20" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="w-7 h-7 rounded-lg glass-card flex items-center justify-center active:scale-90 transition-transform"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-titan-magenta/40" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[80vh] overflow-y-auto bg-titan-bg border-t border-white/10 rounded-t-3xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-white">Add Brand Item</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Type */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(typeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewItem((p) => ({ ...p, itemType: key }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                          newItem.itemType === key
                            ? 'border-opacity-40'
                            : 'bg-white/5 border-white/[0.06] text-white/30'
                        }`}
                        style={
                          newItem.itemType === key
                            ? { background: `${config.color}12`, borderColor: `${config.color}40`, color: config.color }
                            : undefined
                        }
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="font-mono text-[10px] capitalize">{key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Name</label>
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Primary Blue, Logo Light..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                />
              </div>

              {/* Value */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">
                  {newItem.itemType === 'color' ? 'Color Value (hex/rgb)' : 'Value'}
                </label>
                <div className="flex gap-2">
                  {newItem.itemType === 'color' && newItem.value && (
                    <div
                      className="w-10 h-10 rounded-xl border border-white/10 shrink-0"
                      style={{ background: newItem.value }}
                    />
                  )}
                  <input
                    value={newItem.value}
                    onChange={(e) => setNewItem((p) => ({ ...p, value: e.target.value }))}
                    placeholder={newItem.itemType === 'color' ? '#FF0066' : 'Font name, URL, etc.'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Notes (optional)</label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Usage guidelines..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleAdd}
                disabled={!newItem.name.trim() || submitting}
                className="w-full py-3 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Brand Kit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
