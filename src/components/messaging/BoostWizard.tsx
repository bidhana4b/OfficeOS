import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  X,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Target,
  Users,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoostWizardData } from './types';

interface BoostWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BoostWizardData) => void;
  workspaceName: string;
}

const platforms = [
  { id: 'meta', name: 'Meta Ads', icon: '📘', description: 'Facebook & Instagram' },
  { id: 'google', name: 'Google Ads', icon: '🔍', description: 'Search & Display' },
  { id: 'tiktok', name: 'TikTok Ads', icon: '🎵', description: 'Short-form Video' },
  { id: 'linkedin', name: 'LinkedIn Ads', icon: '💼', description: 'B2B & Professional' },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦', description: 'Engagement & Reach' },
  { id: 'snapchat', name: 'Snapchat Ads', icon: '👻', description: 'Youth Demographics' },
];

const goals = [
  { id: 'awareness', label: 'Brand Awareness', icon: Target },
  { id: 'traffic', label: 'Website Traffic', icon: Zap },
  { id: 'engagement', label: 'Engagement', icon: Users },
  { id: 'conversions', label: 'Conversions', icon: DollarSign },
  { id: 'leads', label: 'Lead Generation', icon: CheckCircle },
];

const durations = [
  { id: '3d', label: '3 Days', multiplier: 3 },
  { id: '7d', label: '7 Days', multiplier: 7 },
  { id: '14d', label: '14 Days', multiplier: 14 },
  { id: '30d', label: '30 Days', multiplier: 30 },
];

export default function BoostWizard({ open, onClose, onSubmit, workspaceName }: BoostWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BoostWizardData>({
    platform: '',
    budget: 50,
    duration: '7d',
    goal: '',
    targetAudience: '',
    creativeReady: false,
  });

  const totalSteps = 4;

  const handleSubmit = () => {
    onSubmit(data);
    setStep(1);
    setData({ platform: '', budget: 50, duration: '7d', goal: '', targetAudience: '', creativeReady: false });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!data.platform;
      case 2: return !!data.goal;
      case 3: return data.budget >= 10;
      case 4: return true;
      default: return false;
    }
  };

  const selectedDuration = durations.find((d) => d.id === data.duration);
  const totalBudget = data.budget * (selectedDuration?.multiplier || 7);

  if (!open) return null;

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
          className="w-full max-w-lg mx-4 glass-card border border-white/[0.1] rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-titan-magenta/10 to-titan-purple/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-magenta/30 to-titan-purple/30 flex items-center justify-center border border-titan-magenta/20">
                  <Rocket className="w-5 h-5 text-titan-magenta" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-white">Boost Wizard</h2>
                  <p className="font-mono-data text-[10px] text-white/40">
                    {workspaceName} • Step {step} of {totalSteps}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/80 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1.5 mt-3">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: i < step ? '100%' : '0%' }}
                    className="h-full rounded-full bg-gradient-to-r from-titan-magenta to-titan-purple"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 min-h-[300px]">
            <AnimatePresence mode="wait">
              {/* Step 1: Platform */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="font-display font-semibold text-sm text-white mb-1">
                    Select Platform
                  </h3>
                  <p className="font-mono-data text-[11px] text-white/40 mb-4">
                    Choose where to run your boost campaign
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {platforms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setData({ ...data, platform: p.id })}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                          data.platform === p.id
                            ? 'bg-titan-magenta/10 border-titan-magenta/30 shadow-lg shadow-titan-magenta/10'
                            : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]'
                        )}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <div>
                          <p className="font-display text-xs text-white font-semibold">{p.name}</p>
                          <p className="font-mono-data text-[9px] text-white/30">{p.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Goal */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="font-display font-semibold text-sm text-white mb-1">
                    Campaign Goal
                  </h3>
                  <p className="font-mono-data text-[11px] text-white/40 mb-4">
                    What do you want to achieve?
                  </p>
                  <div className="space-y-2">
                    {goals.map((g) => {
                      const Icon = g.icon;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setData({ ...data, goal: g.id })}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                            data.goal === g.id
                              ? 'bg-titan-cyan/10 border-titan-cyan/30'
                              : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-4 h-4',
                              data.goal === g.id ? 'text-titan-cyan' : 'text-white/40'
                            )}
                          />
                          <span
                            className={cn(
                              'font-mono-data text-xs',
                              data.goal === g.id ? 'text-white' : 'text-white/60'
                            )}
                          >
                            {g.label}
                          </span>
                          {data.goal === g.id && (
                            <CheckCircle className="w-4 h-4 text-titan-cyan ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Budget & Duration */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="font-display font-semibold text-sm text-white mb-1">
                    Budget & Duration
                  </h3>
                  <p className="font-mono-data text-[11px] text-white/40 mb-4">
                    Set your daily budget and campaign duration
                  </p>

                  {/* Daily Budget */}
                  <div className="mb-5">
                    <label className="font-mono-data text-[10px] text-white/40 mb-2 block">
                      Daily Budget
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="number"
                          min={10}
                          max={10000}
                          value={data.budget}
                          onChange={(e) =>
                            setData({ ...data, budget: Math.max(10, Number(e.target.value)) })
                          }
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono-data text-sm focus:outline-none focus:border-titan-cyan/30 transition-all"
                        />
                      </div>
                      <span className="font-mono-data text-xs text-white/30">/day</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={1000}
                      step={10}
                      value={data.budget}
                      onChange={(e) => setData({ ...data, budget: Number(e.target.value) })}
                      className="w-full mt-2 accent-titan-magenta h-1"
                    />
                  </div>

                  {/* Duration */}
                  <div className="mb-5">
                    <label className="font-mono-data text-[10px] text-white/40 mb-2 block">
                      Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {durations.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setData({ ...data, duration: d.id })}
                          className={cn(
                            'py-2 rounded-lg border text-center transition-all',
                            data.duration === d.id
                              ? 'bg-titan-cyan/10 border-titan-cyan/30 text-titan-cyan'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-white/[0.12]'
                          )}
                        >
                          <span className="font-mono-data text-[11px]">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-titan-magenta/10 to-titan-purple/10 border border-titan-magenta/20">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-data text-xs text-white/50">Total Budget</span>
                      <span className="font-display font-bold text-lg text-titan-magenta">
                        ${totalBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="font-display font-semibold text-sm text-white mb-1">
                    Review & Launch
                  </h3>
                  <p className="font-mono-data text-[11px] text-white/40 mb-4">
                    Confirm your boost campaign details
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        label: 'Platform',
                        value: platforms.find((p) => p.id === data.platform)?.name || '-',
                        icon: '📘',
                      },
                      {
                        label: 'Goal',
                        value: goals.find((g) => g.id === data.goal)?.label || '-',
                        icon: '🎯',
                      },
                      {
                        label: 'Daily Budget',
                        value: `$${data.budget}/day`,
                        icon: '💰',
                      },
                      {
                        label: 'Duration',
                        value: selectedDuration?.label || '-',
                        icon: '📅',
                      },
                      {
                        label: 'Total Budget',
                        value: `$${totalBudget.toLocaleString()}`,
                        icon: '💎',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.icon}</span>
                          <span className="font-mono-data text-[11px] text-white/50">
                            {item.label}
                          </span>
                        </div>
                        <span className="font-mono-data text-xs text-white font-semibold">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Creative Ready Checkbox */}
                  <label className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-all">
                    <input
                      type="checkbox"
                      checked={data.creativeReady}
                      onChange={(e) => setData({ ...data, creativeReady: e.target.checked })}
                      className="accent-titan-cyan w-3.5 h-3.5"
                    />
                    <div>
                      <span className="font-mono-data text-[11px] text-white/60">
                        Creative assets are ready
                      </span>
                      <p className="font-mono-data text-[9px] text-white/30">
                        Media buyer will be notified to set up the campaign
                      </p>
                    </div>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all font-mono-data text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2 rounded-xl font-mono-data text-xs font-semibold transition-all',
                  canProceed()
                    ? 'bg-gradient-to-r from-titan-magenta to-titan-purple text-white hover:shadow-lg hover:shadow-titan-magenta/20'
                    : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                )}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-titan-magenta to-titan-purple text-white font-accent font-bold text-xs hover:shadow-lg hover:shadow-titan-magenta/20 transition-all"
              >
                <Rocket className="w-4 h-4" />
                Launch Boost
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
