import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Minus,
  Save,
  Loader2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServiceCategories, useDeliverableTypes, type PackageRow, type PackageFeatureRow } from '@/hooks/usePackages';

interface PackageBuilderProps {
  open: boolean;
  onClose: () => void;
  onSave: (pkg: PackageBuilderData) => Promise<void>;
  editingPackage?: PackageRow | null;
}

export interface PackageBuilderData {
  name: string;
  plan_type: string;
  category: string | null;
  tier: string;
  monthly_fee: number;
  currency: string;
  platform_count: number;
  correction_limit: number;
  description: string;
  features: string[];
  recommended: boolean;
  deliverables: { deliverable_type: string; label: string; icon: string; total_allocated: number; unit_label: string; warning_threshold: number; auto_deduction: boolean }[];
}

const tiers = ['Starter', 'Growth', 'Advanced', 'Premium'];
const planTypes = ['Category-Based', 'Infinity Plan', 'Eco Lite'];

const colorMap: Record<string, string> = {
  cyan: 'border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#00D9FF]',
  magenta: 'border-[#FF006E]/40 bg-[#FF006E]/10 text-[#FF006E]',
  purple: 'border-[#7B61FF]/40 bg-[#7B61FF]/10 text-[#7B61FF]',
  lime: 'border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14]',
  red: 'border-red-400/40 bg-red-400/10 text-red-400',
  amber: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
};

interface DeliverableField {
  type_key: string;
  label: string;
  icon: string;
  unit_label: string;
  hours_per_unit: number;
  enabled: boolean;
  qty: number;
}

export function PackageBuilder({ open, onClose, onSave, editingPackage }: PackageBuilderProps) {
  const { data: categories, loading: catLoading } = useServiceCategories();
  const { data: deliverableTypes, loading: delLoading } = useDeliverableTypes();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState('Category-Based');
  const [packageName, setPackageName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 fields
  const [selectedTier, setSelectedTier] = useState('Starter');
  const [monthlyFee, setMonthlyFee] = useState(15000);
  const [platformCount, setPlatformCount] = useState(2);
  const [correctionLimit, setCorrectionLimit] = useState(2);
  const [featuresList, setFeaturesList] = useState<string[]>(['']);
  const [recommended, setRecommended] = useState(false);

  // Step 3 fields
  const [deliverables, setDeliverables] = useState<DeliverableField[]>([]);

  // Init deliverables from DB types
  useEffect(() => {
    if (deliverableTypes.length > 0 && !editingPackage) {
      setDeliverables(deliverableTypes.map((dt) => ({
        type_key: dt.type_key,
        label: dt.label,
        icon: dt.icon,
        unit_label: dt.unit_label,
        hours_per_unit: dt.hours_per_unit,
        enabled: false,
        qty: 0,
      })));
    }
  }, [deliverableTypes, editingPackage]);

  // Populate when editing
  useEffect(() => {
    if (editingPackage && deliverableTypes.length > 0) {
      setPackageName(editingPackage.name);
      setDescription(editingPackage.description || '');
      setSelectedCategory(editingPackage.category);
      setSelectedPlanType(editingPackage.plan_type);
      setSelectedTier(editingPackage.tier);
      setMonthlyFee(editingPackage.monthly_fee);
      setPlatformCount(editingPackage.platform_count);
      setCorrectionLimit(editingPackage.correction_limit);
      setRecommended(editingPackage.recommended);
      setFeaturesList(editingPackage.features.length > 0 ? editingPackage.features : ['']);

      const featureMap = new Map(
        (editingPackage.package_features || []).map((f: PackageFeatureRow) => [f.deliverable_type, f])
      );

      setDeliverables(deliverableTypes.map((dt) => {
        const existing = featureMap.get(dt.type_key);
        return {
          type_key: dt.type_key,
          label: dt.label,
          icon: existing?.icon || dt.icon,
          unit_label: existing?.unit_label || dt.unit_label,
          hours_per_unit: dt.hours_per_unit,
          enabled: !!existing,
          qty: existing?.total_allocated || 0,
        };
      }));
    }
  }, [editingPackage, deliverableTypes]);

  const handleToggleDeliverable = (index: number) => {
    const updated = [...deliverables];
    updated[index].enabled = !updated[index].enabled;
    if (!updated[index].enabled) updated[index].qty = 0;
    else updated[index].qty = 5;
    setDeliverables(updated);
  };

  const handleQtyChange = (index: number, value: number) => {
    const updated = [...deliverables];
    updated[index].qty = Math.max(0, value);
    setDeliverables(updated);
  };

  const addFeature = () => setFeaturesList([...featuresList, '']);
  const removeFeature = (i: number) => setFeaturesList(featuresList.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, val: string) => {
    const updated = [...featuresList];
    updated[i] = val;
    setFeaturesList(updated);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await onSave({
        name: packageName || `${selectedCategory || selectedPlanType} ${selectedTier}`,
        plan_type: selectedPlanType,
        category: selectedPlanType === 'Category-Based' ? selectedCategory : null,
        tier: selectedTier,
        monthly_fee: monthlyFee,
        currency: 'BDT',
        platform_count: platformCount,
        correction_limit: correctionLimit,
        description,
        features: featuresList.filter((f) => f.trim() !== ''),
        recommended,
        deliverables: deliverables
          .filter((d) => d.enabled && d.qty > 0)
          .map((d) => ({
            deliverable_type: d.type_key,
            label: d.label,
            icon: d.icon,
            total_allocated: d.qty,
            unit_label: d.unit_label,
            warning_threshold: 20,
            auto_deduction: true,
          })),
      });
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedPlanType('Category-Based');
    setPackageName('');
    setDescription('');
    setSelectedTier('Starter');
    setMonthlyFee(15000);
    setPlatformCount(2);
    setCorrectionLimit(2);
    setFeaturesList(['']);
    setRecommended(false);
    if (deliverableTypes.length > 0) {
      setDeliverables(deliverableTypes.map((dt) => ({
        type_key: dt.type_key, label: dt.label, icon: dt.icon, unit_label: dt.unit_label,
        hours_per_unit: dt.hours_per_unit, enabled: false, qty: 0,
      })));
    }
  };

  if (!open) return null;

  const isLoading = catLoading || delLoading;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[750px] max-h-[90vh] bg-[#0F1419]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="font-display font-extrabold text-lg text-white">
                {editingPackage ? 'Edit Package' : 'Create Package'}
              </h2>
              <p className="font-mono text-[11px] text-white/40 mt-0.5">
                Step {step} of 3 — {step === 1 ? 'Category & Info' : step === 2 ? 'Pricing & Features' : 'Deliverable Matrix'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="px-6 pt-4 shrink-0">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s <= step ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40' : 'bg-white/5 text-white/30 border border-white/10'
                  }`}>
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && <div className={`flex-1 h-[2px] rounded-full ${s < step ? 'bg-[#00D9FF]/40' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {/* STEP 1: Category & Info */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      {/* Plan Type */}
                      <div>
                        <label className="font-mono text-[11px] text-white/40 block mb-2">Plan Type</label>
                        <div className="flex items-center gap-2">
                          {planTypes.map((pt) => (
                            <button
                              key={pt}
                              onClick={() => setSelectedPlanType(pt)}
                              className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold border transition-all ${
                                selectedPlanType === pt
                                  ? 'border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#00D9FF]'
                                  : 'border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06]'
                              }`}
                            >
                              {pt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category Selection (only for Category-Based) */}
                      {selectedPlanType === 'Category-Based' && (
                        <div>
                          <label className="font-mono text-[11px] text-white/40 block mb-2">Service Category</label>
                          <div className="grid grid-cols-2 gap-2">
                            {categories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`p-3 rounded-xl border transition-all text-left ${
                                  selectedCategory === cat.name
                                    ? colorMap[cat.color] || colorMap.cyan
                                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]'
                                }`}
                              >
                                <span className="font-mono text-xs font-semibold">{cat.name}</span>
                                {cat.description && (
                                  <p className="font-mono text-[9px] text-white/30 mt-0.5">{cat.description}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Package Name */}
                      <div>
                        <label className="font-mono text-[11px] text-white/40 block mb-2">Package Name *</label>
                        <input
                          type="text"
                          value={packageName}
                          onChange={(e) => setPackageName(e.target.value)}
                          placeholder="e.g., Royal Dominance Package"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40 transition-all"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="font-mono text-[11px] text-white/40 block mb-2">Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Brief description of this package..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40 transition-all resize-none"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Pricing & Features */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      {/* Tier */}
                      <div>
                        <label className="font-mono text-[11px] text-white/40 block mb-2">Pricing Tier</label>
                        <div className="grid grid-cols-4 gap-2">
                          {tiers.map((t) => (
                            <button
                              key={t}
                              onClick={() => setSelectedTier(t)}
                              className={`p-3 rounded-xl border text-center transition-all ${
                                selectedTier === t
                                  ? 'border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#00D9FF]'
                                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                              }`}
                            >
                              <span className="font-display font-bold text-sm">{t}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Monthly Fee */}
                      <div>
                        <label className="font-mono text-[11px] text-white/40 block mb-2">Monthly Fee (৳ BDT)</label>
                        <input
                          type="number"
                          value={monthlyFee}
                          onChange={(e) => setMonthlyFee(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#00D9FF]/40 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Platform Count */}
                        <div>
                          <label className="font-mono text-[11px] text-white/40 block mb-2">Platforms</label>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPlatformCount(Math.max(1, platformCount - 1))} className="p-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white">
                              <Minus className="w-4 h-4" />
                            </button>
                            <input type="number" value={platformCount} onChange={(e) => setPlatformCount(parseInt(e.target.value) || 1)} className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm text-center focus:outline-none" />
                            <button onClick={() => setPlatformCount(platformCount + 1)} className="p-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {/* Correction Limit */}
                        <div>
                          <label className="font-mono text-[11px] text-white/40 block mb-2">Corrections</label>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCorrectionLimit(Math.max(0, correctionLimit - 1))} className="p-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white">
                              <Minus className="w-4 h-4" />
                            </button>
                            <input type="number" value={correctionLimit} onChange={(e) => setCorrectionLimit(parseInt(e.target.value) || 0)} className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-sm text-center focus:outline-none" />
                            <button onClick={() => setCorrectionLimit(correctionLimit + 1)} className="p-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Recommended */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setRecommended(!recommended)}
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
                            recommended ? 'bg-[#39FF14] border-[#39FF14] text-black' : 'border-white/20'
                          }`}
                        >
                          {recommended && <Check className="w-3 h-3" />}
                        </button>
                        <span className="font-mono text-xs text-white/60">Mark as Recommended</span>
                      </div>

                      {/* Features List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-mono text-[11px] text-white/40">Package Features</label>
                          <button onClick={addFeature} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF] font-mono text-[10px] hover:bg-[#00D9FF]/20 transition-all">
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        <div className="space-y-2">
                          {featuresList.map((feat, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={feat}
                                onChange={(e) => updateFeature(i, e.target.value)}
                                placeholder="e.g., 4 Social Media Platforms"
                                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-xs placeholder:text-white/20 focus:outline-none focus:border-[#00D9FF]/40 transition-all"
                              />
                              {featuresList.length > 1 && (
                                <button onClick={() => removeFeature(i)} className="p-1.5 rounded-lg hover:bg-[#FF006E]/10 text-white/30 hover:text-[#FF006E] transition-all">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Deliverable Matrix */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div>
                        <h3 className="font-display font-bold text-white text-sm mb-1">Deliverable Matrix</h3>
                        <p className="font-mono text-[11px] text-white/40">Toggle and set quantities for each deliverable. Edit values directly.</p>
                      </div>
                      <div className="space-y-2">
                        {deliverables.map((del, idx) => (
                          <div
                            key={del.type_key}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              del.enabled ? 'border-[#00D9FF]/20 bg-[#00D9FF]/[0.04]' : 'border-white/[0.06] bg-white/[0.02] opacity-50'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleDeliverable(idx)}
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
                                del.enabled ? 'bg-[#00D9FF] border-[#00D9FF] text-black' : 'border-white/20'
                              }`}
                            >
                              {del.enabled && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs text-white/80 block truncate">{del.label}</span>
                              <span className="font-mono text-[9px] text-white/30">{del.unit_label} · {del.hours_per_unit}h/unit</span>
                            </div>
                            <input
                              type="number"
                              min={0}
                              value={del.qty}
                              onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                              disabled={!del.enabled}
                              className="w-20 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-white font-mono text-xs text-center focus:outline-none focus:border-[#00D9FF]/40 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#00D9FF]/10 to-[#7B61FF]/10 border border-[#00D9FF]/20">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="font-mono text-[10px] text-white/40">Total Deliverables</span>
                            <p className="font-display font-bold text-lg text-white">
                              {deliverables.filter((d) => d.enabled).reduce((s, d) => s + d.qty, 0)} units
                            </p>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-white/40">Est. Hours/Month</span>
                            <p className="font-display font-bold text-lg text-[#00D9FF]">
                              {Math.round(deliverables.filter((d) => d.enabled).reduce((s, d) => s + d.qty * d.hours_per_unit, 0))}h
                            </p>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-white/40">Monthly Fee</span>
                            <p className="font-display font-bold text-lg text-[#39FF14]">৳{monthlyFee.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] font-mono text-xs transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !packageName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 hover:bg-[#00D9FF]/30 font-mono text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={saving || deliverables.filter((d) => d.enabled).length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 hover:bg-[#39FF14]/30 font-accent font-extrabold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingPackage ? 'Update Package' : 'Create Package'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
