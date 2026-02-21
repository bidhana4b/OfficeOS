import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Wallet,
  DollarSign,
  Link2,
  AlertTriangle,
  Ban,
  CheckCircle2,
  XCircle,
  Wifi,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaBuyingRules as mockMediaBuyingRules } from './defaults';
import { ToggleSetting } from './UsersRolesControl';
import { useSettings } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function MediaBuyingControl() {
  const settingsQuery = useSettings<Record<string, unknown>>('media_buying');
  const [rules, setRules] = useState(mockMediaBuyingRules);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settingsQuery.data) {
      setRules({
        allowManualBudgetOverride: (settingsQuery.data.allowManualBudgetOverride as boolean) ?? mockMediaBuyingRules.allowManualBudgetOverride,
        minimumBudget: (settingsQuery.data.minimumBudget as number) || mockMediaBuyingRules.minimumBudget,
        autoWalletDeduction: (settingsQuery.data.autoWalletDeduction as boolean) ?? mockMediaBuyingRules.autoWalletDeduction,
        allowNegativeBalance: (settingsQuery.data.allowNegativeBalance as boolean) ?? mockMediaBuyingRules.allowNegativeBalance,
        autoAlertThreshold: (settingsQuery.data.autoAlertThreshold as number) || mockMediaBuyingRules.autoAlertThreshold,
        vendorPaymentDelayAlert: (settingsQuery.data.vendorPaymentDelayAlert as number) || mockMediaBuyingRules.vendorPaymentDelayAlert,
        metaApiStatus: (settingsQuery.data.metaApiStatus as typeof mockMediaBuyingRules.metaApiStatus) || mockMediaBuyingRules.metaApiStatus,
        googleAdsApiStatus: (settingsQuery.data.googleAdsApiStatus as typeof mockMediaBuyingRules.googleAdsApiStatus) || mockMediaBuyingRules.googleAdsApiStatus,
      });
    }
  }, [settingsQuery.data]);

  const handleSaveMediaBuyingRules = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'media_buying',
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

  const apiStatusConfig = {
    connected: { icon: CheckCircle2, color: 'text-titan-lime', bg: 'bg-titan-lime/10', border: 'border-titan-lime/30', label: 'Connected' },
    disconnected: { icon: XCircle, color: 'text-white/30', bg: 'bg-white/[0.04]', border: 'border-white/10', label: 'Disconnected' },
    error: { icon: AlertTriangle, color: 'text-titan-magenta', bg: 'bg-titan-magenta/10', border: 'border-titan-magenta/30', label: 'Error' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-orange-400" />
            </div>
            Media Buying Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Boost wizard rules, wallet settings, and ad account linking</p>
        </div>
        <button
          onClick={handleSaveMediaBuyingRules}
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

      {/* Boost Wizard Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4 text-orange-400/60" />
          Boost Wizard Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Allow manual budget override"
            description="Let users override suggested budget amounts for campaigns"
            enabled={rules.allowManualBudgetOverride}
            onToggle={() => setRules({ ...rules, allowManualBudgetOverride: !rules.allowManualBudgetOverride })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-white/40" />
                Minimum budget rule
              </p>
              <p className="font-mono text-[10px] text-white/30">Minimum budget for any ad campaign</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-white/30">$</span>
              <input
                type="number"
                value={rules.minimumBudget}
                onChange={(e) => setRules({ ...rules, minimumBudget: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
            </div>
          </div>
          <ToggleSetting
            label="Auto wallet deduction"
            description="Automatically deduct from client wallet when a boost is launched"
            enabled={rules.autoWalletDeduction}
            onToggle={() => setRules({ ...rules, autoWalletDeduction: !rules.autoWalletDeduction })}
          />
        </div>
      </motion.div>

      {/* Wallet Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Wallet className="w-4 h-4 text-titan-cyan/60" />
          Wallet Settings
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Allow negative balance"
            description="Clients can overspend beyond their wallet balance"
            enabled={rules.allowNegativeBalance}
            onToggle={() => setRules({ ...rules, allowNegativeBalance: !rules.allowNegativeBalance })}
            danger
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-500/60" />
                Auto alert threshold
              </p>
              <p className="font-mono text-[10px] text-white/30">Send alert when wallet drops below this amount</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-white/30">$</span>
              <input
                type="number"
                value={rules.autoAlertThreshold}
                onChange={(e) => setRules({ ...rules, autoAlertThreshold: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Vendor payment delay alert</p>
              <p className="font-mono text-[10px] text-white/30">Alert after X days of pending vendor payment</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rules.vendorPaymentDelayAlert}
                onChange={(e) => setRules({ ...rules, vendorPaymentDelayAlert: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">days</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ad Account Linking */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-titan-purple/60" />
          Ad Account Linking
        </h3>
        <div className="space-y-3">
          {[
            { name: 'Meta Ads API', status: rules.metaApiStatus, logo: '📘' },
            { name: 'Google Ads API', status: rules.googleAdsApiStatus, logo: '🔍' },
          ].map((api) => {
            const config = apiStatusConfig[api.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={api.name}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  config.bg, config.border
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{api.logo}</span>
                  <div>
                    <p className="font-mono text-xs text-white/80">{api.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon className={cn('w-3 h-3', config.color)} />
                      <span className={cn('font-mono text-[10px]', config.color)}>{config.label}</span>
                    </div>
                  </div>
                </div>
                <button className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all',
                  api.status === 'connected'
                    ? 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/70'
                    : 'bg-titan-cyan/10 border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/20'
                )}>
                  {api.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
