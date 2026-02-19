import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  GripVertical,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  Save,
  Palette,
  Video,
  Rocket,
  FileText,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getQuickActions,
  createQuickAction,
  updateQuickAction,
  deleteQuickAction,
  reorderQuickActions,
} from '@/lib/data-service';

interface QuickActionsManagerProps {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  userRole: string;
  onActionsUpdated: () => void;
}

const iconOptions = [
  { name: 'Palette', icon: Palette, value: 'Palette' },
  { name: 'Video', icon: Video, value: 'Video' },
  { name: 'Rocket', icon: Rocket, value: 'Rocket' },
  { name: 'FileText', icon: FileText, value: 'FileText' },
  { name: 'Link', icon: LinkIcon, value: 'Link' },
  { name: 'Sparkles', icon: Sparkles, value: 'Sparkles' },
];

const actionTypeOptions = [
  { value: 'deliverable', label: 'Deliverable' },
  { value: 'boost', label: 'Boost Request' },
  { value: 'custom', label: 'Custom Action' },
  { value: 'link', label: 'External Link' },
];

const colorOptions = [
  '#00D9FF', // cyan
  '#FF006E', // magenta
  '#7B61FF', // purple
  '#39FF14', // lime
  '#FFB800', // yellow
  '#FF4D4D', // red
];

export default function QuickActionsManager({
  open,
  onClose,
  tenantId,
  userRole,
  onActionsUpdated,
}: QuickActionsManagerProps) {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    action_name: '',
    action_label: '',
    icon: 'Palette',
    action_type: 'deliverable' as 'deliverable' | 'boost' | 'custom' | 'link',
    linked_service_type: '',
    linked_url: '',
    color_accent: '#00D9FF',
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      loadActions();
    }
  }, [open, tenantId]);

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await getQuickActions(tenantId);
      setActions(data);
    } catch (err) {
      console.error('Failed to load quick actions:', err);
      setError('Failed to load quick actions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.action_label.trim()) {
      setError('Action label is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await createQuickAction({
        ...formData,
        tenant_id: tenantId,
        action_name: formData.action_label.toLowerCase().replace(/\s+/g, '_'),
      });
      await loadActions();
      resetForm();
      onActionsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to create action');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setLoading(true);
      setError('');
      await updateQuickAction(id, formData);
      await loadActions();
      setEditingId(null);
      resetForm();
      onActionsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update action');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quick action?')) return;

    try {
      await deleteQuickAction(id);
      await loadActions();
      onActionsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete action');
    }
  };

  const handleToggleActive = async (action: any) => {
    try {
      await updateQuickAction(action.id, { is_active: !action.is_active });
      await loadActions();
      onActionsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle action');
    }
  };

  const startEdit = (action: any) => {
    setEditingId(action.id);
    setFormData({
      action_name: action.action_name,
      action_label: action.action_label,
      icon: action.icon,
      action_type: action.action_type,
      linked_service_type: action.linked_service_type || '',
      linked_url: action.linked_url || '',
      color_accent: action.color_accent || '#00D9FF',
      is_active: action.is_active,
    });
    setShowNewForm(false);
  };

  const resetForm = () => {
    setFormData({
      action_name: '',
      action_label: '',
      icon: 'Palette',
      action_type: 'deliverable',
      linked_service_type: '',
      linked_url: '',
      color_accent: '#00D9FF',
      is_active: true,
    });
    setShowNewForm(false);
    setEditingId(null);
  };

  const handleClose = () => {
    resetForm();
    setError('');
    onClose();
  };

  const IconComponent = iconOptions.find(opt => opt.value === formData.icon)?.icon || Palette;

  if (!open) return null;

  // Check permission
  const canManage = ['super_admin', 'admin'].includes(userRole);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-gradient-to-br from-[#0A0E27] to-[#1A1D2E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-white">Quick Actions Manager</h2>
              <p className="text-xs text-white/50 mt-1">Customize quick actions for messaging</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!canManage ? (
            <div className="px-6 py-12 text-center">
              <div className="text-white/40 mb-2">🔒</div>
              <div className="text-white/60">Only Super Admins can manage quick actions</div>
            </div>
          ) : (
            <>
              {/* Content */}
              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Add New Button */}
                {!showNewForm && !editingId && (
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-white/[0.15] rounded-lg hover:border-titan-cyan/50 hover:bg-titan-cyan/5 text-white/60 hover:text-titan-cyan transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">Add New Quick Action</span>
                  </button>
                )}

                {/* New/Edit Form */}
                {(showNewForm || editingId) && (
                  <div className="p-4 border border-titan-cyan/20 rounded-lg bg-titan-cyan/5 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white text-sm">
                        {editingId ? 'Edit Action' : 'New Action'}
                      </h3>
                      <button
                        onClick={resetForm}
                        className="text-white/40 hover:text-white/70 text-sm"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Label *</label>
                        <input
                          type="text"
                          value={formData.action_label}
                          onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                          placeholder="e.g. Create Design"
                          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-titan-cyan/50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-white/60 mb-1">Type *</label>
                        <select
                          value={formData.action_type}
                          onChange={(e) => setFormData({ ...formData, action_type: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-titan-cyan/50"
                        >
                          {actionTypeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-white/60 mb-1">Icon</label>
                        <select
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-titan-cyan/50"
                        >
                          {iconOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-white/60 mb-1">Color</label>
                        <div className="flex gap-2">
                          {colorOptions.map(color => (
                            <button
                              key={color}
                              onClick={() => setFormData({ ...formData, color_accent: color })}
                              className={cn(
                                'w-8 h-8 rounded-lg transition-all',
                                formData.color_accent === color
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0E27]'
                                  : 'opacity-50 hover:opacity-100'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {formData.action_type === 'deliverable' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-white/60 mb-1">Service Type</label>
                          <input
                            type="text"
                            value={formData.linked_service_type}
                            onChange={(e) => setFormData({ ...formData, linked_service_type: e.target.value })}
                            placeholder="e.g. design, video, content"
                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-titan-cyan/50"
                          />
                        </div>
                      )}

                      {formData.action_type === 'link' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-white/60 mb-1">URL</label>
                          <input
                            type="url"
                            value={formData.linked_url}
                            onChange={(e) => setFormData({ ...formData, linked_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-titan-cyan/50"
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                      disabled={loading || !formData.action_label.trim()}
                      className="w-full bg-gradient-to-r from-titan-cyan to-titan-purple hover:opacity-90"
                      size="sm"
                    >
                      {loading ? 'Saving...' : editingId ? 'Update Action' : 'Create Action'}
                    </Button>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions List */}
                <div className="space-y-2">
                  {loading && actions.length === 0 ? (
                    <div className="text-center py-12 text-white/40">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
                      Loading...
                    </div>
                  ) : actions.length === 0 ? (
                    <div className="text-center py-12 text-white/40 text-sm">
                      No quick actions yet. Create one to get started.
                    </div>
                  ) : (
                    actions.map((action) => {
                      const ActionIcon = iconOptions.find(opt => opt.value === action.icon)?.icon || Palette;
                      return (
                        <div
                          key={action.id}
                          className={cn(
                            'px-4 py-3 rounded-lg border transition-all',
                            action.is_active
                              ? 'bg-white/[0.03] border-white/[0.08]'
                              : 'bg-white/[0.01] border-white/[0.04] opacity-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${action.color_accent}20`, color: action.color_accent }}
                            >
                              <ActionIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-white text-sm">{action.action_label}</div>
                              <div className="text-xs text-white/50">
                                {actionTypeOptions.find(t => t.value === action.action_type)?.label}
                                {action.linked_service_type && ` · ${action.linked_service_type}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleActive(action)}
                                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"
                                title={action.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {action.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => startEdit(action)}
                                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-titan-cyan transition-all"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(action.id)}
                                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-red-400 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
