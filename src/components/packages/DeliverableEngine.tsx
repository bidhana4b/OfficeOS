import { motion } from 'framer-motion';
import {
  Image,
  Video,
  Sparkles,
  Clapperboard,
  PenTool,
  Square,
  Layout,
  Rocket,
  Megaphone,
  Star,
  Search,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { DeliverableConfig } from './types';

interface DeliverableEngineProps {
  deliverables: DeliverableConfig[];
  clientName: string;
  onToggleAutoDeduction?: (type: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
  clapperboard: <Clapperboard className="w-5 h-5" />,
  'pen-tool': <PenTool className="w-5 h-5" />,
  frame: <Square className="w-5 h-5" />,
  layout: <Layout className="w-5 h-5" />,
  rocket: <Rocket className="w-5 h-5" />,
  megaphone: <Megaphone className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
  search: <Search className="w-5 h-5" />,
};

export function DeliverableEngine({ deliverables, clientName, onToggleAutoDeduction }: DeliverableEngineProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-display font-bold text-white text-base">Deliverable Engine</h3>
          <p className="font-mono text-[11px] text-white/40">{clientName} — Usage Tracker</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
          <span className="font-mono text-[10px] text-white/40">Live Tracking</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {deliverables.map((del, idx) => {
          const usagePercent = del.totalAllocated > 0 ? (del.used / del.totalAllocated) * 100 : 0;
          const remainingPercent = del.totalAllocated > 0 ? (del.remaining / del.totalAllocated) * 100 : 0;
          const isWarning = remainingPercent <= del.warningThreshold && remainingPercent > 0;
          const isDepleted = del.remaining <= 0;

          let barColor = 'bg-[#00D9FF]';
          let glowColor = 'shadow-[#00D9FF]/20';
          if (isDepleted) {
            barColor = 'bg-[#FF006E]';
            glowColor = 'shadow-[#FF006E]/20';
          } else if (isWarning) {
            barColor = 'bg-amber-400';
            glowColor = 'shadow-amber-400/20';
          }

          return (
            <motion.div
              key={del.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl border backdrop-blur-xl transition-all ${
                isDepleted
                  ? 'border-[#FF006E]/30 bg-[#FF006E]/[0.05]'
                  : isWarning
                  ? 'border-amber-400/30 bg-amber-400/[0.05]'
                  : 'border-white/[0.08] bg-white/[0.03]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    isDepleted ? 'bg-[#FF006E]/20 text-[#FF006E]' : isWarning ? 'bg-amber-400/20 text-amber-400' : 'bg-[#00D9FF]/10 text-[#00D9FF]'
                  }`}>
                    {iconMap[del.icon] || <Sparkles className="w-5 h-5" />}
                  </div>
                  <span className="font-mono text-xs text-white/80 font-semibold">{del.label}</span>
                </div>
                {(isWarning || isDepleted) && (
                  <AlertTriangle className={`w-4 h-4 ${isDepleted ? 'text-[#FF006E]' : 'text-amber-400'} animate-pulse`} />
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="font-mono text-[10px] text-white/30 uppercase">Total</p>
                  <p className="font-display font-bold text-lg text-white">{del.totalAllocated}</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-[10px] text-white/30 uppercase">Used</p>
                  <p className="font-display font-bold text-lg text-[#00D9FF]">{del.used}</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-[10px] text-white/30 uppercase">Left</p>
                  <p className={`font-display font-bold text-lg ${
                    isDepleted ? 'text-[#FF006E]' : isWarning ? 'text-amber-400' : 'text-[#39FF14]'
                  }`}>
                    {del.remaining}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.05 }}
                  className={`absolute inset-y-0 left-0 rounded-full ${barColor} ${glowColor} shadow-lg`}
                />
              </div>

              {/* Warning text */}
              {isDepleted && (
                <p className="font-mono text-[10px] text-[#FF006E] mb-2">⚠ Quota depleted — additional charges apply</p>
              )}
              {isWarning && !isDepleted && (
                <p className="font-mono text-[10px] text-amber-400 mb-2">⚠ Below {del.warningThreshold}% remaining</p>
              )}

              {/* Auto Deduction Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="font-mono text-[10px] text-white/30">Auto Deduction</span>
                <button
                  onClick={() => onToggleAutoDeduction?.(del.type)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  {del.autoDeduction ? (
                    <ToggleRight className="w-5 h-5 text-[#39FF14]" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
