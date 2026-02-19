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
  Key,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiConfig as mockAiConfig } from './mock-data';
import { ToggleSetting } from './UsersRolesControl';
import { useSettings } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  getAIApiKeys,
  saveAIApiKeys,
  testAIConnection,
  clearAIKeysCache,
  type AIApiKeys,
} from '@/lib/ai-service';

export default function AIAutomationControl() {
  const settingsQuery = useSettings<Record<string, unknown>>('ai_config');
  const [config, setConfig] = useState(mockAiConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // AI API Key State
  const [apiKeys, setApiKeys] = useState<AIApiKeys>({
    gemini_api_key: '',
    preferred_model: 'gemini-2.0-flash',
    enabled: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);
  const [keySaveStatus, setKeySaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load API keys
  useEffect(() => {
    getAIApiKeys().then(setApiKeys);
  }, []);

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

  const handleTestConnection = async () => {
    if (!apiKeys.gemini_api_key) return;
    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const result = await testAIConnection(apiKeys.gemini_api_key);
      setConnectionStatus(result.success ? 'success' : 'error');
      setConnectionMessage(result.message);
    } catch {
      setConnectionStatus('error');
      setConnectionMessage('Connection test failed');
    } finally {
      setTestingConnection(false);
      setTimeout(() => setConnectionStatus('idle'), 5000);
    }
  };

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    setKeySaveStatus('idle');
    try {
      clearAIKeysCache();
      const success = await saveAIApiKeys(apiKeys);
      setKeySaveStatus(success ? 'success' : 'error');
    } catch {
      setKeySaveStatus('error');
    } finally {
      setSavingKeys(false);
      setTimeout(() => setKeySaveStatus('idle'), 3000);
    }
  };

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

  const geminiModelOptions = [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fastest, most efficient' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Best quality, slower' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Good balance' },
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

      {/* 🔑 Gemini API Key Integration */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-5 rounded-xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 backdrop-blur-xl border border-blue-500/20"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            Google Gemini API Integration
          </h3>
          <div className="flex items-center gap-2">
            {connectionStatus === 'success' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-titan-lime/10 border border-titan-lime/20 text-titan-lime font-mono text-[9px]">
                <Wifi className="w-2.5 h-2.5" /> Connected
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-titan-magenta/10 border border-titan-magenta/20 text-titan-magenta font-mono text-[9px]">
                <WifiOff className="w-2.5 h-2.5" /> Failed
              </span>
            )}
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="mb-4">
          <ToggleSetting
            label="Enable AI Integration"
            description="Activate AI features across the entire system using Google Gemini"
            enabled={apiKeys.enabled}
            onToggle={() => setApiKeys({ ...apiKeys, enabled: !apiKeys.enabled })}
          />
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <label className="block font-mono text-xs text-white/60 mb-2">
              Gemini API Key
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeys.gemini_api_key}
                  onChange={(e) => setApiKeys({ ...apiKeys, gemini_api_key: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-mono focus:border-blue-400/40 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testingConnection || !apiKeys.gemini_api_key}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg border font-mono text-[10px] transition-all whitespace-nowrap',
                  testingConnection
                    ? 'bg-white/[0.04] border-white/[0.08] text-white/40 cursor-wait'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
                  !apiKeys.gemini_api_key && 'opacity-40 cursor-not-allowed'
                )}
              >
                {testingConnection ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wifi className="w-3 h-3" />
                )}
                Test
              </button>
            </div>
            {connectionMessage && connectionStatus !== 'idle' && (
              <p className={cn(
                'mt-2 font-mono text-[10px]',
                connectionStatus === 'success' ? 'text-titan-lime/70' : 'text-titan-magenta/70'
              )}>
                {connectionMessage}
              </p>
            )}
            <p className="mt-2 font-mono text-[9px] text-white/20">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400/60 hover:text-blue-400 underline"
              >
                Google AI Studio
              </a>
              {' '}→ API keys
            </p>
          </div>

          {/* Model Selection */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <label className="block font-mono text-xs text-white/60 mb-2">
              Preferred Gemini Model
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {geminiModelOptions.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setApiKeys({ ...apiKeys, preferred_model: model.id as AIApiKeys['preferred_model'] })}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    apiKeys.preferred_model === model.id
                      ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                  )}
                >
                  <span className="font-mono text-[11px] text-white/80 font-medium">{model.label}</span>
                  <p className="font-mono text-[9px] text-white/30 mt-0.5">{model.description}</p>
                  {apiKeys.preferred_model === model.id && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="font-mono text-[8px] text-blue-400">Selected</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Save API Keys Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400/40" />
              <span className="font-mono text-[10px] text-white/30">
                {apiKeys.enabled && apiKeys.gemini_api_key
                  ? 'AI features active across Dashboard, Assistant, Insights, and Client Analysis'
                  : 'Configure API key to enable AI features'
                }
              </span>
            </div>
            <button
              onClick={handleSaveApiKeys}
              disabled={savingKeys}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg border font-mono text-xs transition-all',
                keySaveStatus === 'success'
                  ? 'bg-titan-lime/10 border-titan-lime/30 text-titan-lime'
                  : keySaveStatus === 'error'
                  ? 'bg-titan-magenta/10 border-titan-magenta/30 text-titan-magenta'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
                savingKeys && 'opacity-50 cursor-not-allowed'
              )}
            >
              {keySaveStatus === 'success' ? (
                <><Check className="w-3 h-3" /> Saved</>
              ) : keySaveStatus === 'error' ? (
                <><AlertCircle className="w-3 h-3" /> Failed</>
              ) : (
                <><Save className="w-3 h-3" /> {savingKeys ? 'Saving...' : 'Save API Config'}</>
              )}
            </button>
          </div>
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
