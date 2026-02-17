import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Zap, Loader2 } from 'lucide-react';
import { usePackages, type PackageRow } from '@/hooks/usePackages';

const planTypeColors: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  'Infinity Plan': { border: 'border-[#00D9FF]/30', bg: 'bg-[#00D9FF]/10', text: 'text-[#00D9FF]', glow: 'shadow-[#00D9FF]/20' },
  'Eco Lite': { border: 'border-[#39FF14]/30', bg: 'bg-[#39FF14]/10', text: 'text-[#39FF14]', glow: 'shadow-[#39FF14]/20' },
  'Category-Based': { border: 'border-[#7B61FF]/30', bg: 'bg-[#7B61FF]/10', text: 'text-[#7B61FF]', glow: 'shadow-[#7B61FF]/20' },
};

const tierIcons: Record<string, React.ReactNode> = {
  Starter: <Zap className="w-4 h-4" />,
  Growth: <Sparkles className="w-4 h-4" />,
  Advanced: <Crown className="w-4 h-4" />,
  Premium: <Crown className="w-5 h-5" />,
};

export function PackageComparison() {
  const { data: packages, loading } = usePackages();
  const [selectedPlanType, setSelectedPlanType] = useState<string>('Infinity Plan');

  const planTypes = [...new Set(packages.map((p) => p.plan_type))];

  const filteredPackages = packages.filter((p) => p.plan_type === selectedPlanType);

  // Collect all unique deliverable types across filtered packages
  const allDeliverableLabels = Array.from(
    new Set(filteredPackages.flatMap((p) => (p.package_features || []).map((d) => d.label)))
  );

  const getDeliverableQty = (pkg: PackageRow, label: string): number | null => {
    const found = (pkg.package_features || []).find((d) => d.label === label);
    return found ? found.total_allocated : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  const defaultColors = { border: 'border-white/[0.08]', bg: 'bg-white/[0.03]', text: 'text-white/60', glow: '' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base">Package Comparison</h3>
          <p className="font-mono text-[11px] text-white/40">Compare plans side-by-side</p>
        </div>
      </div>

      {/* Plan Type Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {planTypes.map((type) => {
          const colors = planTypeColors[type] || defaultColors;
          const isActive = selectedPlanType === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedPlanType(type)}
              className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold border transition-all ${
                isActive
                  ? `${colors.border} ${colors.bg} ${colors.text}`
                  : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:bg-white/[0.06]'
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {filteredPackages.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-white/30">No packages in this plan type</p>
        </div>
      ) : (
        <>
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.map((pkg, idx) => {
              const colors = planTypeColors[pkg.plan_type] || defaultColors;
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative rounded-xl border backdrop-blur-xl overflow-hidden transition-all ${
                    pkg.recommended
                      ? `${colors.border} ${colors.bg}`
                      : 'border-white/[0.08] bg-white/[0.03]'
                  }`}
                >
                  {pkg.recommended && (
                    <div className={`absolute top-0 right-0 px-3 py-1 ${colors.bg} ${colors.text} rounded-bl-xl`}>
                      <span className="font-mono text-[10px] font-bold">RECOMMENDED</span>
                    </div>
                  )}

                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
                        {tierIcons[pkg.tier] || <Sparkles className="w-4 h-4" />}
                      </div>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {pkg.tier}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-white text-lg">{pkg.name}</h4>
                    <p className="font-mono text-[11px] text-white/40 mt-1">{pkg.description}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display font-extrabold text-2xl text-white">
                        ৳{pkg.monthly_fee.toLocaleString()}
                      </span>
                      <span className="font-mono text-[11px] text-white/30">/month</span>
                    </div>
                  </div>

                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg bg-white/[0.04]">
                        <p className="font-mono text-[10px] text-white/30">Platforms</p>
                        <p className={`font-display font-bold text-lg ${colors.text}`}>{pkg.platform_count}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.04]">
                        <p className="font-mono text-[10px] text-white/30">Corrections</p>
                        <p className={`font-display font-bold text-lg ${colors.text}`}>{pkg.correction_limit}</p>
                      </div>
                    </div>
                  </div>

                  {pkg.features && pkg.features.length > 0 && (
                    <div className="p-5 border-b border-white/[0.06]">
                      <p className="font-mono text-[10px] text-white/30 uppercase mb-3">Features</p>
                      <div className="space-y-2">
                        {pkg.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${colors.text}`} />
                            <span className="font-mono text-[11px] text-white/60">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <p className="font-mono text-[10px] text-white/30 uppercase mb-3">Deliverables</p>
                    <div className="space-y-1.5">
                      {(pkg.package_features || []).map((del) => (
                        <div key={del.deliverable_type} className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-white/50">{del.label}</span>
                          <span className={`font-display font-bold text-sm ${colors.text}`}>{del.total_allocated}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Detailed Table View */}
          {allDeliverableLabels.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <h4 className="font-display font-bold text-white text-sm">Detailed Comparison Table</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 font-mono text-[10px] text-white/40 uppercase">Deliverable</th>
                      {filteredPackages.map((pkg) => (
                        <th key={pkg.id} className="text-center px-4 py-3">
                          <div className="font-display font-bold text-xs text-white">{pkg.tier}</div>
                          <div className="font-mono text-[10px] text-white/30">৳{pkg.monthly_fee.toLocaleString()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/[0.06]">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/60">Platform Count</td>
                      {filteredPackages.map((pkg) => (
                        <td key={pkg.id} className="text-center px-4 py-2.5">
                          <span className="font-display font-bold text-sm text-white">{pkg.platform_count}</span>
                        </td>
                      ))}
                    </tr>
                    {allDeliverableLabels.map((label) => (
                      <tr key={label} className="border-b border-white/[0.04]">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-white/60">{label}</td>
                        {filteredPackages.map((pkg) => {
                          const qty = getDeliverableQty(pkg, label);
                          return (
                            <td key={pkg.id} className="text-center px-4 py-2.5">
                              {qty !== null ? (
                                <span className="font-display font-bold text-sm text-[#00D9FF]">{qty}</span>
                              ) : (
                                <span className="font-mono text-[11px] text-white/20">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-b border-white/[0.06]">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/60">Correction Limit</td>
                      {filteredPackages.map((pkg) => (
                        <td key={pkg.id} className="text-center px-4 py-2.5">
                          <span className="font-display font-bold text-sm text-white">{pkg.correction_limit}</span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
