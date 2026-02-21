import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Edit3,
  Zap,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  FileText,
  Layers,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { packageTemplates, packageBehavior, deliverableMappings } from './defaults';
import { ToggleSetting } from './UsersRolesControl';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function PackageControl() {
  const [behavior, setBehavior] = useState(packageBehavior);
  const [mappings] = useState(deliverableMappings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSavePackageSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'package_control',
          config: { behavior, mappings },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,section' });

      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const tierColors: Record<string, string> = {
    starter: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    growth: 'bg-titan-purple/10 text-titan-purple border-titan-purple/30',
    advanced: 'bg-titan-cyan/10 text-titan-cyan border-titan-cyan/30',
    custom: 'bg-titan-magenta/10 text-titan-magenta border-titan-magenta/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-titan-cyan/10 border border-titan-cyan/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-titan-cyan" />
            </div>
            Package Engine Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Package templates, behavior rules, and deliverable mapping</p>
        </div>
        <button
          onClick={handleSavePackageSettings}
          disabled={isSaving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-xs transition-all',
            saveStatus === 'success'
              ? 'bg-titan-lime/10 border-titan-lime/30 text-titan-lime'
              : saveStatus === 'error'
              ? 'bg-titan-magenta/10 border-titan-magenta/30 text-titan-magenta'
              : 'bg-titan-cyan/10 border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/20',
            isSaving && 'opacity-50 cursor-not-allowed'
          )}
        >
          {saveStatus === 'success' ? (
            <>
              <Check className="w-3 h-3" />
              Saved
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="w-3 h-3" />
              Failed
            </>
          ) : (
            <>
              <Save className="w-3 h-3" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </>
          )}
        </button>
      </div>

      {/* Global Package Templates */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-titan-cyan/60" />
          Global Package Templates
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {packageTemplates.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'p-4 rounded-lg border transition-all',
                pkg.isActive
                  ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
                  : 'bg-white/[0.01] border-white/[0.04] opacity-60'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white/80">{pkg.name}</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-mono border', tierColors[pkg.tier])}>
                    {pkg.tier.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!pkg.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[9px] font-mono text-white/30">INACTIVE</span>
                  )}
                  <button className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-titan-cyan transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-3 h-3 text-titan-lime/60" />
                <span className="font-mono text-sm text-titan-lime">${pkg.monthlyFee.toLocaleString()}</span>
                <span className="font-mono text-[10px] text-white/30">/month</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Object.entries(pkg.deliverables).map(([key, value]) => (
                  <div key={key} className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">
                    <p className="font-mono text-[10px] text-white/30 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="font-mono text-xs text-white/70">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Package Behavior Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-titan-purple/60" />
          Package Behavior Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Auto deduction"
            description="Automatically deduct from package when a deliverable is created"
            enabled={behavior.autoDeduction}
            onToggle={() => setBehavior({ ...behavior, autoDeduction: !behavior.autoDeduction })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-500/60" />
                Warning threshold
              </p>
              <p className="font-mono text-[10px] text-white/30">Alert when usage drops below this %</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={behavior.warningThresholdPercent}
                onChange={(e) => setBehavior({ ...behavior, warningThresholdPercent: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Grace usage limit</p>
              <p className="font-mono text-[10px] text-white/30">Allow additional usage beyond limit (as %)</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={behavior.graceUsageLimitPercent}
                onChange={(e) => setBehavior({ ...behavior, graceUsageLimitPercent: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">%</span>
            </div>
          </div>
          <ToggleSetting
            label="Auto upgrade suggestion"
            description="Suggest package upgrade when client consistently hits limits"
            enabled={behavior.autoUpgradeSuggestion}
            onToggle={() => setBehavior({ ...behavior, autoUpgradeSuggestion: !behavior.autoUpgradeSuggestion })}
          />
          <ToggleSetting
            label="Custom credit enabled"
            description="Allow manually adding bonus credits to client packages"
            enabled={behavior.customCreditEnabled}
            onToggle={() => setBehavior({ ...behavior, customCreditEnabled: !behavior.customCreditEnabled })}
          />
        </div>
      </motion.div>

      {/* Deliverable Mapping */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-titan-lime/60" />
          Deliverable Unit Mapping
        </h3>
        <p className="font-mono text-[10px] text-white/30 mb-3">Define how many units each deliverable type costs</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {mappings.map((mapping) => (
            <div
              key={mapping.type}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
            >
              <div>
                <p className="font-mono text-xs text-white/70">{mapping.label}</p>
                <p className="font-mono text-[10px] text-white/30">type: {mapping.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-titan-cyan font-bold">{mapping.unitCost}</span>
                <span className="font-mono text-[10px] text-white/30">units</span>
                <button className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
