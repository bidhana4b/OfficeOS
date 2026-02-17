import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Paintbrush,
  Layout,
  Check,
  Monitor,
  Tablet,
  User,
  Save,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeConfig, themePresets } from './mock-data';
import { ToggleSetting } from './UsersRolesControl';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function AppearanceControl() {
  const [config, setConfig] = useState(themeConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'appearance',
          config: config,
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
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
              <Paintbrush className="w-4 h-4 text-pink-400" />
            </div>
            System Appearance Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Theme engine, presets, and dashboard layout configuration</p>
        </div>
        <button
          onClick={handleSaveAppearance}
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

      {/* Theme Presets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Paintbrush className="w-4 h-4 text-pink-400/60" />
          Theme Presets
          <span className="ml-auto px-2 py-0.5 rounded-full bg-white/[0.04] font-mono text-[10px] text-white/30">
            {themePresets.length} available
          </span>
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {themePresets.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setConfig({ ...config, activePreset: theme.id })}
              className={cn(
                'relative p-3 rounded-lg border text-left transition-all group',
                config.activePreset === theme.id
                  ? 'border-titan-cyan/40 shadow-lg shadow-titan-cyan/5'
                  : 'border-white/[0.06] hover:border-white/[0.12]'
              )}
              style={{ backgroundColor: theme.background + '80' }}
            >
              {config.activePreset === theme.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-titan-cyan/20 border border-titan-cyan/40 flex items-center justify-center">
                  <Check className="w-3 h-3 text-titan-cyan" />
                </div>
              )}
              <div className="flex gap-1.5 mb-2">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.primary }} />
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.secondary }} />
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.accent }} />
              </div>
              <p className="font-mono text-[11px] text-white/80">{theme.name}</p>
              <div className="mt-2 h-6 rounded overflow-hidden flex">
                <div className="flex-1" style={{ backgroundColor: theme.background }} />
                <div className="w-px bg-white/10" />
                <div className="flex-1 relative overflow-hidden">
                  <div className="absolute inset-0" style={{ backgroundColor: theme.background }} />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-titan-cyan/60" />
          Theme Settings
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Global override"
            description="Force the selected theme for all users (ignores user preferences)"
            enabled={config.globalOverride}
            onToggle={() => setConfig({ ...config, globalOverride: !config.globalOverride })}
          />
          <ToggleSetting
            label="Per-user theme selection"
            description="Allow individual users to choose their own theme"
            enabled={config.perUserThemeAllowed}
            onToggle={() => setConfig({ ...config, perUserThemeAllowed: !config.perUserThemeAllowed })}
          />
        </div>
      </motion.div>

      {/* Dashboard Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Layout className="w-4 h-4 text-titan-purple/60" />
          Dashboard Layout
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: 'compact',
              label: 'Compact',
              description: 'Minimal layout with essential widgets',
              icon: Tablet,
              preview: 'grid-cols-2 gap-1',
            },
            {
              id: 'extended',
              label: 'Extended Analytics',
              description: 'Full analytics dashboard with all widgets',
              icon: Monitor,
              preview: 'grid-cols-3 gap-1',
            },
            {
              id: 'client-simplified',
              label: 'Client Simplified',
              description: 'Simplified view for client-facing users',
              icon: User,
              preview: 'grid-cols-1 gap-1',
            },
          ].map((layout) => {
            const Icon = layout.icon;
            return (
              <button
                key={layout.id}
                onClick={() => setConfig({ ...config, dashboardLayout: layout.id as any })}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all',
                  config.dashboardLayout === layout.id
                    ? 'bg-titan-purple/10 border-titan-purple/40 shadow-lg shadow-titan-purple/10'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 mb-2',
                  config.dashboardLayout === layout.id ? 'text-titan-purple' : 'text-white/30'
                )} />
                <p className="font-mono text-xs text-white/80 font-medium">{layout.label}</p>
                <p className="font-mono text-[10px] text-white/30 mt-0.5">{layout.description}</p>
                {config.dashboardLayout === layout.id && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-titan-purple animate-pulse" />
                    <span className="font-mono text-[9px] text-titan-purple">Active</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
