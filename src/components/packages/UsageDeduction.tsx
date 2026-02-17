import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X, Clapperboard, Image, Video, PenTool, Square, Layout, Rocket, Sparkles, Megaphone, Star, Search } from 'lucide-react';
import type { UsageDeductionEvent } from './types';

interface UsageDeductionProps {
  events: UsageDeductionEvent[];
  onConfirm?: (eventId: string) => void;
  onCancel?: (eventId: string) => void;
}

const typeIconMap: Record<string, { icon: React.ReactNode; color: string }> = {
  photo_graphics: { icon: <Image className="w-4 h-4" />, color: '#00D9FF' },
  video_edit: { icon: <Video className="w-4 h-4" />, color: '#7B61FF' },
  motion_graphics: { icon: <Sparkles className="w-4 h-4" />, color: '#FF006E' },
  reels: { icon: <Clapperboard className="w-4 h-4" />, color: '#39FF14' },
  copywriting: { icon: <PenTool className="w-4 h-4" />, color: '#00D9FF' },
  customer_frames: { icon: <Square className="w-4 h-4" />, color: '#7B61FF' },
  service_frames: { icon: <Layout className="w-4 h-4" />, color: '#FF006E' },
  boost_campaign: { icon: <Rocket className="w-4 h-4" />, color: '#39FF14' },
  ads_management: { icon: <Megaphone className="w-4 h-4" />, color: '#00D9FF' },
  influencer_marketing: { icon: <Star className="w-4 h-4" />, color: '#FF006E' },
  seo: { icon: <Search className="w-4 h-4" />, color: '#7B61FF' },
};

const typeLabels: Record<string, string> = {
  photo_graphics: 'Design',
  video_edit: 'Video',
  motion_graphics: 'Motion',
  reels: 'Reel',
  copywriting: 'Copy',
  customer_frames: 'Customer Frame',
  service_frames: 'Service Frame',
  boost_campaign: 'Boost Campaign',
  ads_management: 'Ads Platform',
  influencer_marketing: 'Influencer Campaign',
  seo: 'SEO Audit',
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function UsageDeduction({ events, onConfirm, onCancel }: UsageDeductionProps) {
  const [localEvents, setLocalEvents] = useState(events);

  const handleConfirm = (id: string) => {
    setLocalEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'confirmed' as const } : e))
    );
    onConfirm?.(id);
  };

  const handleCancel = (id: string) => {
    setLocalEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'cancelled' as const } : e))
    );
    onCancel?.(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base">Auto Usage Simulation</h3>
          <p className="font-mono text-[11px] text-white/40">Confirm or cancel deliverable deductions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#39FF14]/10 border border-[#39FF14]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14]" />
            <span className="font-mono text-[10px] text-[#39FF14]">{localEvents.filter((e) => e.status === 'confirmed').length} confirmed</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-400/10 border border-amber-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="font-mono text-[10px] text-amber-400">{localEvents.filter((e) => e.status === 'pending').length} pending</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {localEvents.map((event, idx) => {
            const typeInfo = typeIconMap[event.deliverableType] || { icon: <Sparkles className="w-4 h-4" />, color: '#00D9FF' };
            const isPending = event.status === 'pending';
            const isConfirmed = event.status === 'confirmed';
            const isCancelled = event.status === 'cancelled';

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border backdrop-blur-xl transition-all ${
                  isPending
                    ? 'border-amber-400/20 bg-amber-400/[0.04]'
                    : isConfirmed
                    ? 'border-[#39FF14]/20 bg-[#39FF14]/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02] opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                  >
                    {typeInfo.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-white/80 font-semibold truncate">{event.deliverableName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${typeInfo.color}15`,
                          color: typeInfo.color,
                          border: `1px solid ${typeInfo.color}30`,
                        }}
                      >
                        {typeLabels[event.deliverableType] || event.deliverableType}
                      </span>
                      <span className="font-mono text-[10px] text-white/30">×{event.quantity}</span>
                      <span className="font-mono text-[10px] text-white/30">by {event.confirmedBy}</span>
                      <span className="font-mono text-[10px] text-white/20">{timeAgo(event.timestamp)}</span>
                    </div>
                    {isPending && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
                        <p className="font-mono text-[11px] text-amber-400">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          "{event.quantity} {typeLabels[event.deliverableType]} will be deducted from package"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleConfirm(event.id)}
                          className="p-2 rounded-lg bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 hover:bg-[#39FF14]/20 transition-all"
                          title="Confirm deduction"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(event.id)}
                          className="p-2 rounded-lg bg-[#FF006E]/10 text-[#FF006E] border border-[#FF006E]/20 hover:bg-[#FF006E]/20 transition-all"
                          title="Cancel deduction"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : isConfirmed ? (
                      <div className="p-2 rounded-lg bg-[#39FF14]/10 text-[#39FF14]">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-white/5 text-white/30">
                        <X className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
