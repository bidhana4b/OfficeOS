import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  Plus,
  Image,
  Video,
  PenTool,
  Rocket,
  FileText,
  Upload,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Zap,
  Clock,
} from 'lucide-react';

interface RequestFormData {
  title: string;
  deliverable_type: string;
  description: string;
  priority: 'normal' | 'urgent' | 'low';
  requested_deadline: string;
  notes: string;
}

const deliverableTypes = [
  { id: 'photo_graphics', label: 'Photo / Graphics', icon: Image, color: '#00D9FF' },
  { id: 'video_edit', label: 'Video Edit', icon: Video, color: '#7B61FF' },
  { id: 'motion_graphics', label: 'Motion Graphics', icon: Video, color: '#FF006E' },
  { id: 'reels', label: 'Reels / Shorts', icon: Video, color: '#FFB800' },
  { id: 'copywriting', label: 'Copywriting', icon: PenTool, color: '#39FF14' },
  { id: 'social_media_posts', label: 'Social Media Posts', icon: FileText, color: '#00D9FF' },
  { id: 'boost_campaign', label: 'Boost Campaign', icon: Rocket, color: '#FF006E' },
];

const priorities = [
  { id: 'low', label: 'Low', color: '#ffffff40', icon: Clock },
  { id: 'normal', label: 'Normal', color: '#00D9FF', icon: Clock },
  { id: 'urgent', label: 'Urgent', color: '#FF006E', icon: Zap },
];

const initialForm: RequestFormData = {
  title: '',
  deliverable_type: '',
  description: '',
  priority: 'normal',
  requested_deadline: '',
  notes: '',
};

export default function DeliverableRequestForm({ onBack, onSuccess }: { onBack: () => void; onSuccess?: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<RequestFormData>(initialForm);
  const [step, setStep] = useState(1); // 1: Type, 2: Details, 3: Review
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = (field: keyof RequestFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (!user?.client_id) return;
    setSubmitting(true);
    setError(null);

    try {
      // Create in deliverable_requests (legacy support)
      await supabase
        .from('deliverable_requests')
        .insert({
          tenant_id: DEMO_TENANT_ID,
          client_id: user.client_id,
          title: form.title,
          deliverable_type: form.deliverable_type,
          description: form.description,
          priority: form.priority,
          requested_deadline: form.requested_deadline || null,
          notes: form.notes || null,
          status: 'pending',
        }).then(() => {});

      // Also create in new deliverable_posts system for the feed
      const priorityMap: Record<string, string> = { low: 'low', normal: 'medium', urgent: 'urgent' };
      await supabase
        .from('deliverable_posts')
        .insert({
          tenant_id: DEMO_TENANT_ID,
          client_id: user.client_id,
          title: form.title,
          description: form.description + (form.notes ? `\n\nNotes: ${form.notes}` : ''),
          status: 'draft',
          priority: priorityMap[form.priority] || 'medium',
          due_date: form.requested_deadline || null,
          created_by: user.id,
        });

      // Also create a notification for the agency
      await supabase.from('notifications').insert({
        tenant_id: DEMO_TENANT_ID,
        type: 'task',
        title: 'New Deliverable Request',
        message: `${user.display_name} requested: ${form.title}`,
        priority: form.priority === 'urgent' ? 'high' : 'medium',
        target_client_id: user.client_id,
        category: 'deliverable_request',
      }).then(() => {});

      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onBack();
      }, 2000);
    } catch (e) {
      console.error('Failed to submit request:', e);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, form, onBack, onSuccess]);

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-16 h-16 rounded-full bg-titan-lime/15 border border-titan-lime/30 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-titan-lime" />
          </motion.div>
          <h2 className="font-display font-bold text-lg text-white mb-1">Request Submitted!</h2>
          <p className="font-mono text-xs text-white/40">Your team will review and start working on it.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={step > 1 ? () => setStep(step - 1) : onBack}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-titan-cyan" />
            New Request
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">
            Step {step} of 3 — {step === 1 ? 'Choose type' : step === 2 ? 'Details' : 'Review & submit'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: s <= step ? '#00D9FF' : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2 px-3 py-2 rounded-lg bg-titan-magenta/10 border border-titan-magenta/25 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-titan-magenta shrink-0" />
            <span className="font-mono text-[10px] text-titan-magenta">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-3.5 h-3.5 text-titan-magenta" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <p className="font-display font-bold text-sm text-white/80 mb-4">What do you need?</p>
              {deliverableTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = form.deliverable_type === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      updateForm('deliverable_type', type.id);
                      setTimeout(() => setStep(2), 200);
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.97] ${
                      isSelected
                        ? 'border-opacity-50 bg-opacity-10'
                        : 'border-white/[0.06] bg-transparent'
                    }`}
                    style={{
                      borderColor: isSelected ? type.color : undefined,
                      background: isSelected ? `${type.color}10` : undefined,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${type.color}12`, border: `1px solid ${type.color}25` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: type.color }} />
                    </div>
                    <span className="font-display font-semibold text-sm text-white">{type.label}</span>
                    <ChevronRight className="w-4 h-4 text-white/15 ml-auto" />
                  </button>
                );
              })}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="font-display font-bold text-sm text-white/80 mb-1">Request Details</p>

              {/* Title */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="e.g., Facebook Banner Design"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="Describe what you need..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {priorities.map((p) => {
                    const isActive = form.priority === p.id;
                    const PIcon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => updateForm('priority', p.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all active:scale-95 ${
                          isActive ? 'border-opacity-50' : 'border-white/[0.06]'
                        }`}
                        style={{
                          borderColor: isActive ? p.color : undefined,
                          background: isActive ? `${p.color}10` : 'transparent',
                        }}
                      >
                        <PIcon className="w-3.5 h-3.5" style={{ color: isActive ? p.color : 'rgba(255,255,255,0.3)' }} />
                        <span
                          className="font-mono text-[10px] font-semibold"
                          style={{ color: isActive ? p.color : 'rgba(255,255,255,0.3)' }}
                        >
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Preferred Deadline</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  <input
                    type="date"
                    value={form.requested_deadline}
                    onChange={(e) => updateForm('requested_deadline', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Additional Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  placeholder="Reference links, brand guidelines, specific instructions..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
                />
              </div>

              {/* Continue Button */}
              <button
                onClick={() => setStep(3)}
                disabled={!form.title.trim()}
                className="w-full py-3 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue to Review
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="font-display font-bold text-sm text-white/80 mb-1">Review & Submit</p>

              {/* Summary Card */}
              <div className="glass-card p-4 space-y-3">
                <div>
                  <p className="font-mono text-[10px] text-white/30">Type</p>
                  <p className="font-display font-semibold text-sm text-white mt-0.5">
                    {deliverableTypes.find((t) => t.id === form.deliverable_type)?.label || form.deliverable_type}
                  </p>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div>
                  <p className="font-mono text-[10px] text-white/30">Title</p>
                  <p className="font-display font-semibold text-sm text-white mt-0.5">{form.title}</p>
                </div>
                {form.description && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div>
                      <p className="font-mono text-[10px] text-white/30">Description</p>
                      <p className="font-mono text-xs text-white/60 mt-0.5">{form.description}</p>
                    </div>
                  </>
                )}
                <div className="h-px bg-white/[0.06]" />
                <div className="flex gap-4">
                  <div>
                    <p className="font-mono text-[10px] text-white/30">Priority</p>
                    <span
                      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold"
                      style={{
                        background: `${priorities.find((p) => p.id === form.priority)?.color}15`,
                        color: priorities.find((p) => p.id === form.priority)?.color,
                      }}
                    >
                      {form.priority.charAt(0).toUpperCase() + form.priority.slice(1)}
                    </span>
                  </div>
                  {form.requested_deadline && (
                    <div>
                      <p className="font-mono text-[10px] text-white/30">Deadline</p>
                      <p className="font-mono text-xs text-white/60 mt-1">{form.requested_deadline}</p>
                    </div>
                  )}
                </div>
                {form.notes && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div>
                      <p className="font-mono text-[10px] text-white/30">Notes</p>
                      <p className="font-mono text-xs text-white/50 mt-0.5">{form.notes}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-titan-lime/15 border border-titan-lime/30 font-display font-bold text-sm text-titan-lime active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
