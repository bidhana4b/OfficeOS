import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Package,
} from 'lucide-react';
import { useDeliverableTypes, type DeliverableTypeRow } from '@/hooks/usePackages';

export function DeliverableTypeManager() {
  const { data: types, loading, create, update, remove } = useDeliverableTypes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type_key: '',
    label: '',
    icon: 'package',
    unit_label: 'units',
    hours_per_unit: 1,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!formData.label.trim() || !formData.type_key.trim()) return;
    setSaving(true);
    await create(formData);
    setSaving(false);
    setShowCreate(false);
    setFormData({ type_key: '', label: '', icon: 'package', unit_label: 'units', hours_per_unit: 1 });
  };

  const handleUpdate = async (id: string) => {
    if (!formData.label.trim()) return;
    setSaving(true);
    await update(id, formData);
    setSaving(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    await remove(id);
    setSaving(false);
    setDeleteConfirm(null);
  };

  const startEdit = (dt: DeliverableTypeRow) => {
    setEditingId(dt.id);
    setFormData({
      type_key: dt.type_key,
      label: dt.label,
      icon: dt.icon,
      unit_label: dt.unit_label,
      hours_per_unit: dt.hours_per_unit,
    });
    setShowCreate(false);
  };

  const generateKey = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base">Deliverable Types</h3>
          <p className="font-mono text-[11px] text-white/40">Manage the service types available for packages. These appear in the deliverable matrix.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); setFormData({ type_key: '', label: '', icon: 'package', unit_label: 'units', hours_per_unit: 1 }); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 hover:bg-[#00D9FF]/20 font-mono text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Type
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#00D9FF]/[0.05] border border-[#00D9FF]/20"
        >
          <h4 className="font-mono text-xs text-[#00D9FF] font-bold mb-3">New Deliverable Type</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1">Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setFormData({ ...formData, label, type_key: formData.type_key || generateKey(label) });
                  }}
                  placeholder="e.g., Website Design"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1">Key *</label>
                <input
                  type="text"
                  value={formData.type_key}
                  onChange={(e) => setFormData({ ...formData, type_key: e.target.value })}
                  placeholder="e.g., website_design"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1">Icon</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="package"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1">Unit Label</label>
                <input
                  type="text"
                  value={formData.unit_label}
                  onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })}
                  placeholder="units"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1">Hours/Unit</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.hours_per_unit}
                  onChange={(e) => setFormData({ ...formData, hours_per_unit: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#00D9FF]/40"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={saving || !formData.label.trim() || !formData.type_key.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 hover:bg-[#39FF14]/30 font-mono text-xs font-bold disabled:opacity-30"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.06] text-white/40 hover:text-white font-mono text-xs"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Types Table */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Label</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Key</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Icon</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Unit</th>
              <th className="text-center px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Hrs/Unit</th>
              <th className="text-right px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((dt, idx) => {
              const isEditing = editingId === dt.id;

              return (
                <tr
                  key={dt.id}
                  className={`border-b border-white/[0.04] transition-all ${
                    isEditing ? 'bg-[#00D9FF]/[0.03]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <td className="px-4 py-2">
                        <input type="text" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} className="w-full px-2 py-1 rounded bg-white/[0.06] border border-white/10 text-white font-mono text-xs focus:outline-none" />
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-white/30">{dt.type_key}</span>
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-full px-2 py-1 rounded bg-white/[0.06] border border-white/10 text-white font-mono text-xs focus:outline-none" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" value={formData.unit_label} onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })} className="w-full px-2 py-1 rounded bg-white/[0.06] border border-white/10 text-white font-mono text-xs focus:outline-none" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" step="0.5" value={formData.hours_per_unit} onChange={(e) => setFormData({ ...formData, hours_per_unit: parseFloat(e.target.value) || 1 })} className="w-16 px-2 py-1 rounded bg-white/[0.06] border border-white/10 text-white font-mono text-xs text-center focus:outline-none mx-auto block" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleUpdate(dt.id)} disabled={saving} className="p-1.5 rounded-lg bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14]/30">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-white/[0.06] text-white/40 hover:bg-white/[0.1]">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono text-xs text-white/80">{dt.label}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-white/30">{dt.type_key}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-white/30">{dt.icon}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-white/30">{dt.unit_label}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-[#00D9FF]">{dt.hours_per_unit}h</td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(dt)} className="p-1.5 rounded-lg hover:bg-[#00D9FF]/10 text-white/30 hover:text-[#00D9FF] transition-all">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDeleteConfirm(dt.id)} className="p-1.5 rounded-lg hover:bg-[#FF006E]/10 text-white/30 hover:text-[#FF006E] transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {deleteConfirm === dt.id && (
                            <div className="absolute right-0 top-0 flex items-center gap-1 bg-[#0F1419] border border-[#FF006E]/30 rounded-lg px-2 py-1 z-10">
                              <span className="font-mono text-[9px] text-white/50">Delete?</span>
                              <button onClick={() => handleDelete(dt.id)} className="px-2 py-0.5 rounded bg-[#FF006E]/20 text-[#FF006E] font-mono text-[9px] font-bold">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono text-[9px]">No</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {types.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="font-mono text-sm text-white/30">No deliverable types yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
