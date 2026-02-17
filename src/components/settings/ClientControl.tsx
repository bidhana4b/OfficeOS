import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  Gauge,
  Lock,
  MessageSquareOff,
  Zap,
  Ban,
  FileX,
  Sliders,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { clientRules as mockClientRules } from './mock-data';
import { ToggleSetting } from './UsersRolesControl';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function ClientControl() {
  const settingsQuery = useSettings<Record<string, unknown>>('client_rules');
  const [rules, setRules] = useState(mockClientRules);
  const [freezeAccounts, setFreezeAccounts] = useState(false);
  const [lockMessaging, setLockMessaging] = useState(false);
  const [blockBoost, setBlockBoost] = useState(false);
  const [limitDeliverables, setLimitDeliverables] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settingsQuery.data) {
      setRules({
        maxClientsPerManager: (settingsQuery.data.maxClientsPerManager as number) || mockClientRules.maxClientsPerManager,
        autoAssignManager: (settingsQuery.data.autoAssignManager as boolean) ?? mockClientRules.autoAssignManager,
        clientPortalEnabled: (settingsQuery.data.clientPortalEnabled as boolean) ?? mockClientRules.clientPortalEnabled,
        healthScoreWeights: (settingsQuery.data.healthScoreWeights as typeof mockClientRules.healthScoreWeights) || mockClientRules.healthScoreWeights,
      });
    }
  }, [settingsQuery.data]);

  const handleSaveClientRules = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'client_rules',
          config: rules,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-titan-magenta/10 border border-titan-magenta/30 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-titan-magenta" />
            </div>
            Client Control Engine
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Client rules, restrictions, and health score configuration</p>
        </div>
        <button
          onClick={handleSaveClientRules}
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

      {/* Client Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-titan-cyan/60" />
          Client Rules
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Max clients per account manager</p>
              <p className="font-mono text-[10px] text-white/30">Limit to prevent overload</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRules({ ...rules, maxClientsPerManager: Math.max(1, rules.maxClientsPerManager - 1) })}
                className="w-7 h-7 rounded bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all font-mono text-sm"
              >
                −
              </button>
              <span className="font-mono text-sm text-titan-cyan w-8 text-center">{rules.maxClientsPerManager}</span>
              <button
                onClick={() => setRules({ ...rules, maxClientsPerManager: rules.maxClientsPerManager + 1 })}
                className="w-7 h-7 rounded bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all font-mono text-sm"
              >
                +
              </button>
            </div>
          </div>
          <ToggleSetting
            label="Auto assign manager"
            description="Automatically assign an account manager when a new client is onboarded"
            enabled={rules.autoAssignManager}
            onToggle={() => setRules({ ...rules, autoAssignManager: !rules.autoAssignManager })}
          />
          <ToggleSetting
            label="Client portal enabled"
            description="Allow clients to access their own portal with project status and deliverables"
            enabled={rules.clientPortalEnabled}
            onToggle={() => setRules({ ...rules, clientPortalEnabled: !rules.clientPortalEnabled })}
          />
        </div>
      </motion.div>

      {/* Client Restrictions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-titan-magenta/60" />
          Client Restrictions (Global Override)
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Freeze all client accounts"
            description="Temporarily suspend all client account activities"
            enabled={freezeAccounts}
            onToggle={() => setFreezeAccounts(!freezeAccounts)}
            danger
          />
          <ToggleSetting
            label="Lock client messaging"
            description="Disable messaging for all clients globally"
            enabled={lockMessaging}
            onToggle={() => setLockMessaging(!lockMessaging)}
            danger
          />
          <ToggleSetting
            label="Block boost requests"
            description="Prevent all clients from submitting ad boost requests"
            enabled={blockBoost}
            onToggle={() => setBlockBoost(!blockBoost)}
            danger
          />
          <ToggleSetting
            label="Limit deliverable creation"
            description="Block all new deliverable creation across the platform"
            enabled={limitDeliverables}
            onToggle={() => setLimitDeliverables(!limitDeliverables)}
            danger
          />
        </div>
      </motion.div>

      {/* Health Score Weights */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-titan-lime/60" />
          Client Health Score Weights
        </h3>
        <p className="font-mono text-[10px] text-white/30 mb-4">Total must equal 100%. Adjust how each factor influences the health score.</p>

        <div className="space-y-4">
          <HealthWeightSlider
            label="Engagement Weight"
            value={rules.healthScoreWeights.engagement}
            color="cyan"
            onChange={(v) => setRules({
              ...rules,
              healthScoreWeights: { ...rules.healthScoreWeights, engagement: v },
            })}
          />
          <HealthWeightSlider
            label="Payment Delay Weight"
            value={rules.healthScoreWeights.paymentDelay}
            color="magenta"
            onChange={(v) => setRules({
              ...rules,
              healthScoreWeights: { ...rules.healthScoreWeights, paymentDelay: v },
            })}
          />
          <HealthWeightSlider
            label="Usage Over-Limit Weight"
            value={rules.healthScoreWeights.usageOverLimit}
            color="purple"
            onChange={(v) => setRules({
              ...rules,
              healthScoreWeights: { ...rules.healthScoreWeights, usageOverLimit: v },
            })}
          />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
          <span className="font-mono text-[10px] text-white/40">Total Weight</span>
          <span className={`font-mono text-sm font-bold ${
            rules.healthScoreWeights.engagement + rules.healthScoreWeights.paymentDelay + rules.healthScoreWeights.usageOverLimit === 100
              ? 'text-titan-lime'
              : 'text-titan-magenta'
          }`}>
            {rules.healthScoreWeights.engagement + rules.healthScoreWeights.paymentDelay + rules.healthScoreWeights.usageOverLimit}%
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function HealthWeightSlider({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: 'cyan' | 'magenta' | 'purple';
  onChange: (v: number) => void;
}) {
  const colorMap = {
    cyan: { accent: 'accent-[#00D9FF]', text: 'text-titan-cyan', thumb: 'bg-titan-cyan', shadow: 'shadow-titan-cyan/30', bar: 'bg-titan-cyan' },
    magenta: { accent: 'accent-[#FF006E]', text: 'text-titan-magenta', thumb: 'bg-titan-magenta', shadow: 'shadow-titan-magenta/30', bar: 'bg-titan-magenta' },
    purple: { accent: 'accent-[#7B61FF]', text: 'text-titan-purple', thumb: 'bg-titan-purple', shadow: 'shadow-titan-purple/30', bar: 'bg-titan-purple' },
  };
  const c = colorMap[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] text-white/40">{label}</span>
        <span className={`font-mono text-xs ${c.text}`}>{value}%</span>
      </div>
      <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`absolute left-0 top-0 h-full rounded-full ${c.bar} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-0 mt-[-2px] appearance-none cursor-pointer ${c.accent} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:${c.thumb} [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:${c.shadow}`}
      />
    </div>
  );
}
