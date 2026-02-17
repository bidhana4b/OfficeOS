import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Plus,
  X,
  ArrowRight,
  ChevronRight,
  Target,
  Calendar,
  Zap,
} from 'lucide-react';

type CampaignStatus = 'live' | 'paused' | 'completed' | 'draft';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number;
  spent: number;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  leads: number;
  startDate: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'New Year Sale — Meta Ads',
    platform: 'Meta',
    budget: 15000,
    spent: 8700,
    status: 'live',
    impressions: 45000,
    clicks: 1200,
    leads: 47,
    startDate: '2024-01-10',
  },
  {
    id: '2',
    name: 'Showroom Visit — Google Ads',
    platform: 'Google',
    budget: 20000,
    spent: 20000,
    status: 'completed',
    impressions: 68000,
    clicks: 2100,
    leads: 89,
    startDate: '2024-01-01',
  },
  {
    id: '3',
    name: 'Test Ride Booking — TikTok',
    platform: 'TikTok',
    budget: 10000,
    spent: 3200,
    status: 'live',
    impressions: 28000,
    clicks: 850,
    leads: 23,
    startDate: '2024-01-15',
  },
  {
    id: '4',
    name: 'Brand Awareness — Instagram',
    platform: 'Meta',
    budget: 12000,
    spent: 0,
    status: 'draft',
    impressions: 0,
    clicks: 0,
    leads: 0,
    startDate: '',
  },
];

const statusStyles: Record<CampaignStatus, { color: string; label: string; bg: string }> = {
  live: { color: '#39FF14', label: '● Live', bg: 'rgba(57,255,20,0.1)' },
  paused: { color: '#FFB800', label: '● Paused', bg: 'rgba(255,184,0,0.1)' },
  completed: { color: '#00D9FF', label: '✓ Done', bg: 'rgba(0,217,255,0.1)' },
  draft: { color: '#ffffff40', label: 'Draft', bg: 'rgba(255,255,255,0.04)' },
};

const platformColors: Record<string, string> = {
  Meta: '#1877F2',
  Google: '#4285F4',
  TikTok: '#FF0050',
};

function MiniSparkline({ color }: { color: string }) {
  const points = Array.from({ length: 8 }, () => 10 + Math.random() * 30);
  const max = Math.max(...points);
  const path = points.map((p, i) => `${i * 14},${40 - (p / max) * 35}`).join(' ');

  return (
    <svg width="98" height="40" className="opacity-60">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ClientBoost() {
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const totalBudget = mockCampaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = mockCampaigns.reduce((s, c) => s + c.spent, 0);
  const totalLeads = mockCampaigns.reduce((s, c) => s + c.leads, 0);
  const liveCampaigns = mockCampaigns.filter((c) => c.status === 'live').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
          <Rocket className="w-5 h-5 text-titan-purple" />
          Boost Campaigns
        </h1>
        <p className="font-mono text-[10px] text-white/30 mt-0.5">
          {liveCampaigns} live • {mockCampaigns.length} total campaigns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-4 pb-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {[
            { label: 'Total Budget', value: `৳${(totalBudget / 1000).toFixed(0)}K`, icon: DollarSign, color: '#FFB800' },
            { label: 'Total Spent', value: `৳${(totalSpent / 1000).toFixed(0)}K`, icon: TrendingUp, color: '#00D9FF' },
            { label: 'Total Leads', value: totalLeads.toString(), icon: Target, color: '#39FF14' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex-none glass-card px-3 py-2.5 min-w-[110px]">
                <Icon className="w-3.5 h-3.5 mb-1" style={{ color: stat.color }} />
                <p className="font-display font-extrabold text-base text-white">{stat.value}</p>
                <p className="font-mono text-[9px] text-white/30">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-3">
        {mockCampaigns.map((campaign, i) => {
          const status = statusStyles[campaign.status];
          const spentPercent = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;
          const platformColor = platformColors[campaign.platform] || '#888';

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold"
                      style={{ background: `${platformColor}20`, color: platformColor }}
                    >
                      {campaign.platform}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="font-display font-semibold text-sm text-white truncate">{campaign.name}</p>
                </div>
                <MiniSparkline color={status.color} />
              </div>

              {/* Budget Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-white/30">Budget</span>
                  <span className="font-mono text-[10px] text-white/60">
                    ৳{campaign.spent.toLocaleString()} / ৳{campaign.budget.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${spentPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background: spentPercent > 90 ? '#FF006E' : status.color,
                    }}
                  />
                </div>
              </div>

              {/* Stats Row */}
              {campaign.status !== 'draft' && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-white/25" />
                    <span className="font-mono text-[10px] text-white/40">{(campaign.impressions / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MousePointer className="w-3 h-3 text-white/25" />
                    <span className="font-mono text-[10px] text-white/40">{campaign.clicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-white/25" />
                    <span className="font-mono text-[10px] text-titan-lime">{campaign.leads} leads</span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Floating Create Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => { setShowWizard(true); setWizardStep(0); }}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-titan-purple to-titan-cyan flex items-center justify-center shadow-lg shadow-titan-purple/30 active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      {/* Create Boost Wizard */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWizard(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-titan-bg border-t border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" />

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-titan-purple" />
                    Create Boost Campaign
                  </h2>
                  <button onClick={() => setShowWizard(false)} className="w-8 h-8 rounded-full glass-card flex items-center justify-center">
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2">
                  {['Platform', 'Details', 'Budget'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border transition-all ${
                          i <= wizardStep
                            ? 'bg-titan-purple/20 border-titan-purple/40 text-titan-purple'
                            : 'border-white/10 text-white/20'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className={`font-mono text-[10px] ${i <= wizardStep ? 'text-white/60' : 'text-white/20'}`}>
                        {step}
                      </span>
                      {i < 2 && <div className={`flex-1 h-px ${i < wizardStep ? 'bg-titan-purple/30' : 'bg-white/6'}`} />}
                    </div>
                  ))}
                </div>

                {/* Step Content */}
                {wizardStep === 0 && (
                  <div className="space-y-3">
                    <p className="font-mono text-xs text-white/40">Select advertising platform</p>
                    {['Meta (Facebook & Instagram)', 'Google Ads', 'TikTok Ads'].map((platform) => (
                      <button
                        key={platform}
                        onClick={() => setWizardStep(1)}
                        className="w-full glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
                      >
                        <span className="font-display font-semibold text-sm text-white">{platform}</span>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </button>
                    ))}
                  </div>
                )}

                {wizardStep === 1 && (
                  <div className="space-y-3">
                    <p className="font-mono text-xs text-white/40">Campaign details</p>
                    <input
                      placeholder="Campaign Name"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30"
                    />
                    <input
                      placeholder="Target Audience"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30"
                    />
                    <textarea
                      placeholder="Campaign Goal"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30 resize-none"
                    />
                    <button
                      onClick={() => setWizardStep(2)}
                      className="w-full py-3 rounded-xl bg-titan-purple/15 border border-titan-purple/30 font-display font-bold text-sm text-titan-purple active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-3">
                    <p className="font-mono text-xs text-white/40">Set budget & duration</p>
                    <input
                      placeholder="Budget (BDT)"
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-titan-cyan/30"
                      />
                      <input
                        type="date"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-titan-cyan/30"
                      />
                    </div>
                    <button
                      onClick={() => setShowWizard(false)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-titan-purple/20 to-titan-cyan/20 border border-titan-purple/30 font-display font-bold text-sm text-white active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                    >
                      <Rocket className="w-4 h-4" />
                      Submit Boost Request
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
