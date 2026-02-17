import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { useServiceCategories, type ServiceCategory } from '@/hooks/usePackages';

const colorOptions = [
  { value: 'cyan', label: 'Cyan', class: 'bg-[#00D9FF]' },
  { value: 'magenta', label: 'Magenta', class: 'bg-[#FF006E]' },
  { value: 'purple', label: 'Purple', class: 'bg-[#7B61FF]' },
  { value: 'lime', label: 'Lime', class: 'bg-[#39FF14]' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-400' },
  { value: 'red', label: 'Red', class: 'bg-red-400' },
];

export function CategoryManager() {
  const { data: categories, loading, create, update, remove } = useServiceCategories();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'cyan', icon: 'folder' });
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    await create(formData);
    setSaving(false);
    setShowCreate(false);
    setFormData({ name: '', description: '', color: 'cyan', icon: 'folder' });
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return;
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

  const startEdit = (cat: ServiceCategory) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, description: cat.description || '', color: cat.color, icon: cat.icon });
    setShowCreate(false);
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
          <h3 className="font-display font-bold text-white text-base">Service Categories</h3>
          <p className="font-mono text-[11px] text-white/40">Manage industry categories for packages. Create, edit, or remove.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); setFormData({ name: '', description: '', color: 'cyan', icon: 'folder' }); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 hover:bg-[#00D9FF]/20 font-mono text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#00D9FF]/[0.05] border border-[#00D9FF]/20"
        >
          <h4 className="font-mono text-xs text-[#00D9FF] font-bold mb-3">New Category</h4>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Category Name (e.g., Real Estate)"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40"
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40"
            />
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                      formData.color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0E27]' : 'opacity-50 hover:opacity-80'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 hover:bg-[#39FF14]/30 font-mono text-xs font-bold transition-all disabled:opacity-30"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.06] text-white/40 hover:text-white font-mono text-xs transition-all"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Categories list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat, idx) => {
          const isEditing = editingId === cat.id;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl border transition-all ${
                isEditing
                  ? 'border-[#00D9FF]/30 bg-[#00D9FF]/[0.05]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#00D9FF]/40"
                  />
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#00D9FF]/40"
                  />
                  <div className="flex items-center gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setFormData({ ...formData, color: c.value })}
                        className={`w-6 h-6 rounded-full ${c.class} transition-all ${
                          formData.color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0A0E27]' : 'opacity-40'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdate(cat.id)} disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#39FF14]/20 text-[#39FF14] font-mono text-[10px] font-bold hover:bg-[#39FF14]/30">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/40 font-mono text-[10px] hover:bg-white/[0.1]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${colorOptions.find((c) => c.value === cat.color)?.class || 'bg-[#00D9FF]'}`} />
                    <span className="font-display font-bold text-sm text-white">{cat.name}</span>
                  </div>
                  {cat.description && (
                    <p className="font-mono text-[11px] text-white/40 ml-6">{cat.description}</p>
                  )}

                  {/* Actions */}
                  <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-[#00D9FF]/10 text-white/30 hover:text-[#00D9FF] transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-[#FF006E]/10 text-white/30 hover:text-[#FF006E] transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Confirm */}
                  {deleteConfirm === cat.id && (
                    <div className="absolute inset-0 bg-[#0F1419]/95 backdrop-blur rounded-xl flex items-center justify-center gap-2">
                      <span className="font-mono text-[10px] text-white/60">Delete?</span>
                      <button onClick={() => handleDelete(cat.id)} className="px-2 py-1 rounded bg-[#FF006E]/20 text-[#FF006E] font-mono text-[10px] font-bold">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded bg-white/[0.06] text-white/40 font-mono text-[10px]">No</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {categories.length === 0 && !showCreate && (
        <div className="text-center py-12">
          <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="font-mono text-sm text-white/30">No categories yet</p>
          <p className="font-mono text-xs text-white/20 mt-1">Create your first service category to organize packages</p>
        </div>
      )}
    </div>
  );
}
