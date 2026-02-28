import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useTheme, THEME_PRESETS, type ThemeMode } from '@/lib/theme-context';
import { useI18n, type Language } from '@/lib/i18n';
import {
  getClientNotificationPreferences,
  saveClientNotificationPreferences,
  changeClientPassword,
  get2FASettings,
  save2FASettings,
  generate2FABackupCodes,
  saveClientPreferences,
} from '@/lib/data-service';
import {
  Settings,
  Shield,
  Bell,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Mail,
  Smartphone,
  MessageSquare,
  CreditCard,
  Package,
  ClipboardList,
  Megaphone,
  Moon,
  Sun,
  Monitor,
  Palette,
  Globe,
  KeyRound,
  Copy,
  ShieldCheck,
} from 'lucide-react';

type SettingsTab = 'security' | 'notifications' | 'appearance';

interface NotifPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  task_updates: boolean;
  billing_alerts: boolean;
  message_alerts: boolean;
  package_renewal_alerts: boolean;
  marketing_emails: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultPrefs: NotifPrefs = {
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  task_updates: true,
  billing_alerts: true,
  message_alerts: true,
  package_renewal_alerts: true,
  marketing_emails: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

interface TwoFAState {
  enabled: boolean;
  method: string;
  backupCodes: string[];
  showSetup: boolean;
  showCodes: boolean;
}

export default function ClientSettings({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { settings: themeSettings, setThemeMode, applyPreset } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Notification prefs
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);

  // 2FA state
  const [twoFA, setTwoFA] = useState<TwoFAState>({
    enabled: false,
    method: 'email',
    backupCodes: [],
    showSetup: false,
    showCodes: false,
  });
  const [twoFASaving, setTwoFASaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) { setLoading(false); return; }

    try {
      const [notifData, tfaData] = await Promise.all([
        getClientNotificationPreferences(clientId),
        get2FASettings(clientId),
      ]);

      if (notifData) {
        setPrefs({
          email_notifications: notifData.email_notifications ?? true,
          push_notifications: notifData.push_notifications ?? true,
          sms_notifications: notifData.sms_notifications ?? false,
          task_updates: notifData.task_updates ?? true,
          billing_alerts: notifData.billing_alerts ?? true,
          message_alerts: notifData.message_alerts ?? true,
          package_renewal_alerts: notifData.package_renewal_alerts ?? true,
          marketing_emails: notifData.marketing_emails ?? false,
          quiet_hours_start: notifData.quiet_hours_start || '22:00',
          quiet_hours_end: notifData.quiet_hours_end || '08:00',
        });
      }

      if (tfaData) {
        setTwoFA((prev) => ({
          ...prev,
          enabled: tfaData.enabled,
          method: tfaData.method || 'email',
          backupCodes: tfaData.backup_codes || [],
        }));
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const handlePasswordChange = async () => {
    setError(null);
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await changeClientPassword(user!.id, currentPassword, newPassword);
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    const clientId = user?.client_id;
    if (!clientId) return;

    setSaving(true);
    setError(null);
    try {
      await saveClientNotificationPreferences(clientId, prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save preferences');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof NotifPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 2FA handlers
  const handleToggle2FA = async () => {
    const clientId = user?.client_id;
    if (!clientId) return;

    if (twoFA.enabled) {
      setTwoFASaving(true);
      try {
        await save2FASettings(clientId, { enabled: false });
        setTwoFA((prev) => ({ ...prev, enabled: false, showSetup: false }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (_e) {
        setError('Failed to disable 2FA');
      } finally {
        setTwoFASaving(false);
      }
    } else {
      setTwoFA((prev) => ({ ...prev, showSetup: true }));
    }
  };

  const handleEnable2FA = async () => {
    const clientId = user?.client_id;
    if (!clientId) return;

    setTwoFASaving(true);
    try {
      const result = await generate2FABackupCodes(clientId);
      await save2FASettings(clientId, {
        enabled: true,
        method: twoFA.method,
        email: user?.email,
        setup_completed_at: new Date().toISOString(),
      });
      setTwoFA((prev) => ({
        ...prev,
        enabled: true,
        backupCodes: result.codes,
        showSetup: false,
        showCodes: true,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (_e) {
      setError('Failed to enable 2FA');
    } finally {
      setTwoFASaving(false);
    }
  };

  // Theme handlers
  const handleThemeMode = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    const clientId = user?.client_id;
    if (clientId) {
      try {
        await saveClientPreferences(clientId, { theme_mode: mode });
      } catch (e) {
        console.error('Failed to save theme preference:', e);
      }
    }
  };

  const handlePresetChange = async (presetId: string) => {
    await applyPreset(presetId);
    const clientId = user?.client_id;
    if (clientId) {
      try {
        await saveClientPreferences(clientId, { theme_preset: presetId });
      } catch (e) {
        console.error('Failed to save preset:', e);
      }
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    const clientId = user?.client_id;
    if (clientId) {
      try {
        await saveClientPreferences(clientId, { language: lang });
      } catch (e) {
        console.error('Failed to save language:', e);
      }
    }
  };

  const copyBackupCodes = () => {
    const text = twoFA.backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-titan-cyan" />
            {t('settings.title')}
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">Security, appearance & preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { id: 'security' as SettingsTab, label: t('settings.security'), icon: Shield },
          { id: 'notifications' as SettingsTab, label: t('settings.notifications'), icon: Bell },
          { id: 'appearance' as SettingsTab, label: t('settings.appearance'), icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null); setSaved(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-mono text-[11px] border transition-all active:scale-95"
              style={{
                background: isActive ? 'rgba(0,217,255,0.1)' : 'transparent',
                borderColor: isActive ? 'rgba(0,217,255,0.3)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#00D9FF' : 'rgba(255,255,255,0.4)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-titan-magenta/10 border border-titan-magenta/20"
            >
              <AlertCircle className="w-4 h-4 text-titan-magenta shrink-0" />
              <span className="font-mono text-[11px] text-titan-magenta">{error}</span>
            </motion.div>
          )}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-titan-lime/10 border border-titan-lime/20"
            >
              <CheckCircle2 className="w-4 h-4 text-titan-lime shrink-0" />
              <span className="font-mono text-[11px] text-titan-lime">{t('common.savedSuccessfully')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Tab */}
        {activeTab === 'security' ? (
          <div className="space-y-4">
            {/* Password Change */}
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-titan-cyan" />
                <h3 className="font-display font-bold text-sm text-white">{t('settings.changePassword')}</h3>
              </div>

              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                  />
                  <button
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showCurrentPw ? <EyeOff className="w-3.5 h-3.5 text-white/25" /> : <Eye className="w-3.5 h-3.5 text-white/25" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                  />
                  <button
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5 text-white/25" /> : <Eye className="w-3.5 h-3.5 text-white/25" />}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="font-mono text-[9px] text-titan-magenta mt-1">Min 6 characters required</p>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="font-mono text-[9px] text-titan-magenta mt-1">Passwords don't match</p>
                )}
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-xs text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </button>
            </div>

            {/* 2FA Section */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-titan-purple" />
                  <h3 className="font-display font-bold text-sm text-white">{t('settings.twoFactor')}</h3>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={twoFASaving}
                  className="relative transition-all duration-200"
                  style={{ width: 40, height: 22 }}
                >
                  <div className={`absolute inset-0 rounded-full transition-all duration-200 ${twoFA.enabled ? 'bg-titan-lime/30' : 'bg-white/10'}`} />
                  <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-200 ${twoFA.enabled ? 'left-[20px] bg-titan-lime' : 'left-0.5 bg-white/30'}`} />
                </button>
              </div>

              <p className="font-mono text-[10px] text-white/30">
                Add extra security to your account with two-factor authentication
              </p>

              {twoFA.enabled && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-titan-lime/5 border border-titan-lime/15">
                  <ShieldCheck className="w-4 h-4 text-titan-lime" />
                  <span className="font-mono text-[10px] text-titan-lime">2FA is active via {twoFA.method}</span>
                </div>
              )}

              {/* 2FA Setup */}
              <AnimatePresence>
                {twoFA.showSetup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <p className="font-mono text-[10px] text-white/40">Choose verification method:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'email', label: 'Email', icon: Mail, color: '#00D9FF' },
                        { id: 'sms', label: 'SMS', icon: Smartphone, color: '#39FF14' },
                        { id: 'authenticator', label: 'App', icon: KeyRound, color: '#7B61FF' },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isActive = twoFA.method === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setTwoFA((prev) => ({ ...prev, method: m.id }))}
                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                            style={{
                              background: isActive ? `${m.color}12` : 'transparent',
                              borderColor: isActive ? `${m.color}40` : 'rgba(255,255,255,0.06)',
                            }}
                          >
                            <Icon className="w-5 h-5" style={{ color: isActive ? m.color : 'rgba(255,255,255,0.3)' }} />
                            <span className="font-mono text-[9px]" style={{ color: isActive ? m.color : 'rgba(255,255,255,0.3)' }}>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleEnable2FA}
                      disabled={twoFASaving}
                      className="w-full py-2.5 rounded-xl bg-titan-lime/15 border border-titan-lime/30 font-display font-bold text-xs text-titan-lime active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {twoFASaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Enable 2FA
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Backup Codes */}
              <AnimatePresence>
                {twoFA.showCodes && twoFA.backupCodes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] text-titan-amber">⚠ Save these backup codes!</p>
                      <button onClick={copyBackupCodes} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 active:scale-95 transition-transform">
                        <Copy className="w-3 h-3 text-white/40" />
                        <span className="font-mono text-[9px] text-white/40">Copy</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {twoFA.backupCodes.map((code, i) => (
                        <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-1.5 text-center">
                          <span className="font-mono text-xs text-white/60 tracking-wider">{code}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setTwoFA((prev) => ({ ...prev, showCodes: false }))}
                      className="w-full py-2 rounded-lg bg-white/5 font-mono text-[10px] text-white/40 active:scale-[0.97] transition-transform"
                    >
                      I've saved my codes
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account Info */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-titan-purple" />
                Account Info
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="font-mono text-[10px] text-white/40">Email</span>
                  <span className="font-mono text-xs text-white/70">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="font-mono text-[10px] text-white/40">Role</span>
                  <span className="font-mono text-xs text-titan-cyan">Client</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-mono text-[10px] text-white/40">Client ID</span>
                  <span className="font-mono text-[9px] text-white/30">{user?.client_id?.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'notifications' ? (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Channels */}
              <div className="glass-card p-4 space-y-3">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-titan-cyan" />
                  Notification Channels
                </h3>

                {[
                  { key: 'email_notifications' as keyof NotifPrefs, label: 'Email Notifications', icon: Mail, color: '#00D9FF', desc: 'Receive updates via email' },
                  { key: 'push_notifications' as keyof NotifPrefs, label: 'Push Notifications', icon: Smartphone, color: '#7B61FF', desc: 'Browser push notifications' },
                  { key: 'sms_notifications' as keyof NotifPrefs, label: 'SMS Notifications', icon: MessageSquare, color: '#39FF14', desc: 'Text message alerts' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                        <div>
                          <p className="font-display font-semibold text-xs text-white">{item.label}</p>
                          <p className="font-mono text-[9px] text-white/25">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePref(item.key)}
                        className="relative transition-all duration-200"
                        style={{ width: 40, height: 22 }}
                      >
                        <div className={`absolute inset-0 rounded-full transition-all duration-200 ${prefs[item.key] ? 'bg-titan-cyan/30' : 'bg-white/10'}`} />
                        <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-200 ${prefs[item.key] ? 'left-[20px] bg-titan-cyan' : 'left-0.5 bg-white/30'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Alert Types */}
              <div className="glass-card p-4 space-y-3">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-titan-yellow" />
                  Alert Types
                </h3>

                {[
                  { key: 'task_updates' as keyof NotifPrefs, label: 'Task Updates', icon: ClipboardList, color: '#00D9FF' },
                  { key: 'billing_alerts' as keyof NotifPrefs, label: 'Billing Alerts', icon: CreditCard, color: '#FFB800' },
                  { key: 'message_alerts' as keyof NotifPrefs, label: 'New Messages', icon: MessageSquare, color: '#39FF14' },
                  { key: 'package_renewal_alerts' as keyof NotifPrefs, label: 'Package Renewal', icon: Package, color: '#7B61FF' },
                  { key: 'marketing_emails' as keyof NotifPrefs, label: 'Marketing & Tips', icon: Megaphone, color: '#FF006E' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                        <p className="font-display font-semibold text-xs text-white">{item.label}</p>
                      </div>
                      <button
                        onClick={() => togglePref(item.key)}
                        className="relative transition-all duration-200"
                        style={{ width: 40, height: 22 }}
                      >
                        <div className={`absolute inset-0 rounded-full transition-all duration-200 ${prefs[item.key] ? 'bg-titan-cyan/30' : 'bg-white/10'}`} />
                        <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-200 ${prefs[item.key] ? 'left-[20px] bg-titan-cyan' : 'left-0.5 bg-white/30'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Quiet Hours */}
              <div className="glass-card p-4 space-y-3">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <Moon className="w-4 h-4 text-titan-purple" />
                  Quiet Hours
                </h3>
                <p className="font-mono text-[10px] text-white/30">No notifications during these hours</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="font-mono text-[9px] text-white/30 block mb-1">From</label>
                    <input
                      type="time"
                      value={prefs.quiet_hours_start}
                      onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                    />
                  </div>
                  <span className="text-white/20 font-mono text-xs mt-4">→</span>
                  <div className="flex-1">
                    <label className="font-mono text-[9px] text-white/30 block mb-1">To</label>
                    <input
                      type="time"
                      value={prefs.quiet_hours_end}
                      onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSavePrefs}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Notification Preferences
              </button>
            </div>
          )
        ) : (
          /* Appearance Tab */
          <div className="space-y-4">
            {/* Theme Mode */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-titan-cyan" />
                Theme Mode
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'dark' as ThemeMode, label: t('settings.darkMode'), icon: Moon, color: '#7B61FF' },
                  { mode: 'light' as ThemeMode, label: t('settings.lightMode'), icon: Sun, color: '#FFB800' },
                  { mode: 'system' as ThemeMode, label: t('settings.systemMode'), icon: Monitor, color: '#00D9FF' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = themeSettings.themeMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => handleThemeMode(item.mode)}
                      className="flex flex-col items-center gap-2 py-3 rounded-xl border transition-all active:scale-95"
                      style={{
                        background: isActive ? `${item.color}12` : 'transparent',
                        borderColor: isActive ? `${item.color}40` : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: isActive ? item.color : 'rgba(255,255,255,0.3)' }} />
                      <span className="font-mono text-[10px]" style={{ color: isActive ? item.color : 'rgba(255,255,255,0.3)' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Presets */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-titan-purple" />
                Color Theme
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {THEME_PRESETS.slice(0, 9).map((preset) => {
                  const isActive = themeSettings.activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetChange(preset.id)}
                      className={`relative flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${
                        isActive ? 'border-titan-cyan/40' : 'border-white/[0.06]'
                      }`}
                      style={{ background: isActive ? 'rgba(0,217,255,0.06)' : 'transparent' }}
                    >
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ background: preset.primary }} />
                        <div className="w-3 h-3 rounded-full" style={{ background: preset.secondary }} />
                        <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                      </div>
                      <span className="font-mono text-[8px] text-white/40 text-center leading-tight px-1">
                        {preset.name}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activePreset"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-titan-cyan flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-3 h-3 text-black" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-titan-lime" />
                {t('settings.language')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'en' as Language, label: 'English', native: 'English', flag: '🇺🇸' },
                  { code: 'bn' as Language, label: 'Bangla', native: 'বাংলা', flag: '🇧🇩' },
                ].map((lang) => {
                  const isActive = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl border transition-all active:scale-95"
                      style={{
                        background: isActive ? 'rgba(57,255,20,0.08)' : 'transparent',
                        borderColor: isActive ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <div className="text-left">
                        <p className="font-display font-semibold text-xs" style={{ color: isActive ? '#39FF14' : 'rgba(255,255,255,0.6)' }}>
                          {lang.native}
                        </p>
                        <p className="font-mono text-[9px] text-white/25">{lang.label}</p>
                      </div>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-titan-lime ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
