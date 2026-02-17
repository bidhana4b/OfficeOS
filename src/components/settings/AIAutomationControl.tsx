import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Cpu,
  Gauge,
  Clock,
  Zap,
  DollarSign,
  PauseCircle,
  AlertTriangle,
  FileText,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiConfig as mockAiConfig } from './mock-data';
import { ToggleSetting } from './UsersRolesControl';
import { useSettings } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function AIAutomationControl() {
  const settingsQuery = useSettings<Record<string, unknown>>('ai_config');
  const [config, setConfig] = useState(mockAiConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settingsQuery.data) {
      setConfig({
        model: (settingsQuery.data.model as string) || mockAiConfig.model,
        monthlyUsageCap: (settingsQuery.data.monthlyUsageCap as number) || mockAiConfig.monthlyUsageCap,
        perClientLimit: (settingsQuery.data.perClientLimit as number) || mockAiConfig.perClientLimit,
        autoOverdueReminder: (settingsQuery.data.autoOverdueReminder as boolean) ?? mockAiConfig.autoOverdueReminder,
        autoCampaignPauseOnLowWallet: (settingsQuery.data.autoCampaignPauseOnLowWallet as boolean) ?? mockAiConfig.autoCampaignPauseOnLowWallet,
        autoReportSchedule: (settingsQuery.data.autoReportSchedule as string) || mockAiConfig.autoReportSchedule,
      });
    }
  }, [settingsQuery.data]);

  const handleSaveAIConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'ai_config',
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

  const modelOptions = [
    { id: 'openai', label: 'OpenAI (GPT-4)', description: 'Best quality, higher cost', icon: '🧠' },
    { id: 'gemini', label: 'Google Gemini', description: 'Good balance of speed & quality', icon: '💎' },
    { id: 'hybrid', label: 'Hybrid Mode', description: 'Uses both intelligently based on task', icon: '⚡' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-titan-purple/10 border border-titan-purple/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-titan-purple" />
            </div>
            AI & Automation Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">AI model selection, budget control, and automation rules</p>
        </div>
        <button
          onClick={handleSaveAIConfig}
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

      {/* AI Model Selection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-titan-purple/60" />
          AI Model Selection
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {modelOptions.map((model) => (
            <button
              key={model.id}
              onClick={() => setConfig({ ...config, model: model.id as any })}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                config.model === model.id
                  ? 'bg-titan-purple/10 border-titan-purple/40 shadow-lg shadow-titan-purple/10'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{model.icon}</span>
                <span className="font-mono text-xs text-white/80 font-medium">{model.label}</span>
              </div>
              <p className="font-mono text-[10px] text-white/30">{model.description}</p>
              {config.model === model.id && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-titan-purple animate-pulse" />
                  <span className="font-mono text-[9px] text-titan-purple">Active</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* AI Budget Control */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-titan-cyan/60" />
          AI Budget Control
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Monthly AI usage cap</p>
              <p className="font-mono text-[10px] text-white/30">Maximum API tokens per month across all operations</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.monthlyUsageCap}
                onChange={(e) => setConfig({ ...config, monthlyUsageCap: parseInt(e.target.value) || 0 })}
                className="w-24 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">tokens</span>
            </div>
          </div>

          {/* Usage Indicator */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-white/40">Current Usage</span>
              <span className="font-mono text-xs text-titan-cyan">6,720 / {config.monthlyUsageCap.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(6720 / config.monthlyUsageCap) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-titan-cyan to-titan-purple"
              />
            </div>
            <p className="font-mono text-[10px] text-white/20 mt-1">
              {((6720 / config.monthlyUsageCap) * 100).toFixed(1)}% used · Resets in 16 days
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Per-client AI limit</p>
              <p className="font-mono text-[10px] text-white/30">Maximum tokens per client per month</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.perClientLimit}
                onChange={(e) => setConfig({ ...config, perClientLimit: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">tokens</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Automation Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-titan-lime/60" />
          Automation Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Auto overdue reminder"
            description="Automatically send reminders for overdue invoices and tasks"
            enabled={config.autoOverdueReminder}
            onToggle={() => setConfig({ ...config, autoOverdueReminder: !config.autoOverdueReminder })}
          />
          <ToggleSetting
            label="Auto campaign pause on low wallet"
            description="Automatically pause running campaigns when wallet drops below threshold"
            enabled={config.autoCampaignPauseOnLowWallet}
            onToggle={() => setConfig({ ...config, autoCampaignPauseOnLowWallet: !config.autoCampaignPauseOnLowWallet })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <FileText className="w-3 h-3 text-white/40" />
                Auto report generation schedule
              </p>
              <p className="font-mono text-[10px] text-white/30">How often AI generates performance reports</p>
            </div>
            <select
              value={config.autoReportSchedule}
              onChange={(e) => setConfig({ ...config, autoReportSchedule: e.target.value as any })}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="off">Disabled</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
