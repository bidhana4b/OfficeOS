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
  Sun,
  Moon,
  Laptop,
  Type,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemeMode, type FontSize } from '@/lib/theme-context';

export default function AppearanceControl() {
  const {
    settings,
    isDark,
    updateTheme,
    applyPreset,
    setThemeMode,
    resetToDefaults,
    presets,
  } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTheme({});
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetToDefaults();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const themeModes: { id: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
    { id: 'light', label: 'Light', icon: Sun, description: 'Bright & clean interface' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { id: 'system', label: 'System', icon: Laptop, description: 'Follow OS preference' },
  ];

  const fontSizes: { id: FontSize; label: string; preview: string }[] = [
    { id: 'small', label: 'Small', preview: 'Aa' },
    { id: 'normal', label: 'Normal', preview: 'Aa' },
    { id: 'large', label: 'Large', preview: 'Aa' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            "font-display font-extrabold text-xl flex items-center gap-3",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
              <Paintbrush className="w-4 h-4 text-pink-400" />
            </div>
            System Appearance Control
          </h2>
          <p className={cn(
            "font-mono text-xs mt-1",
            isDark ? "text-white/30" : "text-gray-500"
          )}>
            Theme mode, presets, colors, and dashboard layout — per-user personalization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all',
              isDark
                ? 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            )}
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-xs transition-all',
              saveStatus === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : saveStatus === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : isDark
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100',
              isSaving && 'opacity-50 cursor-not-allowed'
            )}
          >
            {saveStatus === 'success' ? (
              <><Check className="w-3 h-3" /> Saved</>
            ) : saveStatus === 'error' ? (
              <><AlertCircle className="w-3 h-3" /> Failed</>
            ) : (
              <><Save className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save Changes'}</>
            )}
          </button>
        </div>
      </div>

      {/* Theme Mode Selection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-5 rounded-xl backdrop-blur-xl border",
          isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <h3 className={cn(
          "font-display font-bold text-sm flex items-center gap-2 mb-4",
          isDark ? "text-white/80" : "text-gray-800"
        )}>
          <Sun className="w-4 h-4 text-amber-400" />
          Theme Mode
          <span className={cn(
            "ml-auto px-2 py-0.5 rounded-full font-mono text-[10px]",
            isDark ? "bg-white/[0.04] text-white/30" : "bg-gray-100 text-gray-500"
          )}>
            Currently: {settings.themeMode === 'system' ? `System (${isDark ? 'Dark' : 'Light'})` : settings.themeMode}
          </span>
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {themeModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = settings.themeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setThemeMode(mode.id)}
                className={cn(
                  'relative p-4 rounded-lg border text-left transition-all group',
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                      : 'bg-cyan-50 border-cyan-300 shadow-lg shadow-cyan-100/50'
                    : isDark
                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                )}
              >
                {isActive && (
                  <div className={cn(
                    "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                    isDark ? "bg-cyan-500/20 border border-cyan-500/40" : "bg-cyan-100 border border-cyan-300"
                  )}>
                    <Check className={cn("w-3 h-3", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                )}
                <Icon className={cn(
                  'w-6 h-6 mb-2',
                  isActive
                    ? isDark ? 'text-cyan-400' : 'text-cyan-600'
                    : isDark ? 'text-white/30' : 'text-gray-400'
                )} />
                <p className={cn(
                  'font-mono text-xs font-medium',
                  isDark ? 'text-white/80' : 'text-gray-800'
                )}>{mode.label}</p>
                <p className={cn(
                  'font-mono text-[10px] mt-0.5',
                  isDark ? 'text-white/30' : 'text-gray-500'
                )}>{mode.description}</p>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Theme Presets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={cn(
          "p-5 rounded-xl backdrop-blur-xl border",
          isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <h3 className={cn(
          "font-display font-bold text-sm flex items-center gap-2 mb-4",
          isDark ? "text-white/80" : "text-gray-800"
        )}>
          <Palette className="w-4 h-4 text-pink-400/60" />
          Color Presets
          <span className={cn(
            "ml-auto px-2 py-0.5 rounded-full font-mono text-[10px]",
            isDark ? "bg-white/[0.04] text-white/30" : "bg-gray-100 text-gray-500"
          )}>
            {presets.length} available
          </span>
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {presets.map((theme) => {
            const isActive = settings.activePreset === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => applyPreset(theme.id)}
                className={cn(
                  'relative p-3 rounded-lg border text-left transition-all group',
                  isActive
                    ? isDark
                      ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                      : 'border-cyan-300 shadow-lg shadow-cyan-100/50'
                    : isDark
                    ? 'border-white/[0.06] hover:border-white/[0.12]'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                style={{
                  backgroundColor: isDark
                    ? theme.background + '80'
                    : isActive ? theme.primary + '08' : undefined,
                }}
              >
                {isActive && (
                  <div className={cn(
                    "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                    isDark ? "bg-cyan-500/20 border border-cyan-500/40" : "bg-cyan-100 border border-cyan-300"
                  )}>
                    <Check className={cn("w-3 h-3", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                )}
                <div className="flex gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.primary }} />
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.secondary }} />
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.accent }} />
                </div>
                <p className={cn(
                  "font-mono text-[11px]",
                  isDark ? "text-white/80" : "text-gray-700"
                )}>{theme.name}</p>
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
                {isActive && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
                    <span className="font-mono text-[9px]" style={{ color: theme.primary }}>Active</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Custom Color Overrides */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "p-5 rounded-xl backdrop-blur-xl border",
          isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <h3 className={cn(
          "font-display font-bold text-sm flex items-center gap-2 mb-4",
          isDark ? "text-white/80" : "text-gray-800"
        )}>
          <Paintbrush className="w-4 h-4 text-purple-400/60" />
          Custom Colors
          <span className={cn(
            "ml-auto px-2 py-0.5 rounded-full font-mono text-[10px]",
            isDark ? "bg-white/[0.04] text-white/30" : "bg-gray-100 text-gray-500"
          )}>
            Override preset colors
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Primary Color', key: 'primaryColor' as const, value: settings.primaryColor },
            { label: 'Secondary Color', key: 'secondaryColor' as const, value: settings.secondaryColor },
            { label: 'Accent Color', key: 'accentColor' as const, value: settings.accentColor },
            { label: 'Background Color', key: 'backgroundColor' as const, value: settings.backgroundColor },
          ].map((color) => (
            <div key={color.key} className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              isDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-gray-50 border-gray-200"
            )}>
              <div className="relative group">
                <div
                  className="w-10 h-10 rounded-lg border-2 cursor-pointer transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color.value,
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                  }}
                />
                <input
                  type="color"
                  value={color.value}
                  onChange={(e) => updateTheme({ [color.key]: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-mono text-xs",
                  isDark ? "text-white/70" : "text-gray-700"
                )}>{color.label}</p>
                <p className={cn(
                  "font-mono text-[10px] uppercase",
                  isDark ? "text-white/30" : "text-gray-400"
                )}>{color.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Font Size */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cn(
          "p-5 rounded-xl backdrop-blur-xl border",
          isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <h3 className={cn(
          "font-display font-bold text-sm flex items-center gap-2 mb-4",
          isDark ? "text-white/80" : "text-gray-800"
        )}>
          <Type className="w-4 h-4 text-cyan-400/60" />
          Font Size
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {fontSizes.map((fs) => {
            const isActive = settings.fontSize === fs.id;
            const textSizeClass = fs.id === 'small' ? 'text-sm' : fs.id === 'large' ? 'text-xl' : 'text-base';
            return (
              <button
                key={fs.id}
                onClick={() => updateTheme({ fontSize: fs.id })}
                className={cn(
                  'p-4 rounded-lg border text-center transition-all',
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-cyan-50 border-cyan-300 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                )}
              >
                <span className={cn(
                  'font-display font-bold block mb-1',
                  textSizeClass,
                  isActive
                    ? isDark ? 'text-cyan-400' : 'text-cyan-600'
                    : isDark ? 'text-white/50' : 'text-gray-500'
                )}>
                  {fs.preview}
                </span>
                <p className={cn(
                  'font-mono text-[10px]',
                  isDark ? 'text-white/40' : 'text-gray-500'
                )}>{fs.label}</p>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Dashboard Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "p-5 rounded-xl backdrop-blur-xl border",
          isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <h3 className={cn(
          "font-display font-bold text-sm flex items-center gap-2 mb-4",
          isDark ? "text-white/80" : "text-gray-800"
        )}>
          <Layout className="w-4 h-4 text-purple-400/60" />
          Dashboard Layout
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: 'compact' as const,
              label: 'Compact',
              description: 'Minimal layout with essential widgets',
              icon: Tablet,
            },
            {
              id: 'extended' as const,
              label: 'Extended Analytics',
              description: 'Full analytics dashboard with all widgets',
              icon: Monitor,
            },
            {
              id: 'client-simplified' as const,
              label: 'Client Simplified',
              description: 'Simplified view for client-facing users',
              icon: User,
            },
          ].map((layout) => {
            const Icon = layout.icon;
            const isActive = settings.dashboardLayout === layout.id;
            return (
              <button
                key={layout.id}
                onClick={() => updateTheme({ dashboardLayout: layout.id })}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all',
                  isActive
                    ? isDark
                      ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
                      : 'bg-purple-50 border-purple-300 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 mb-2',
                  isActive
                    ? isDark ? 'text-purple-400' : 'text-purple-600'
                    : isDark ? 'text-white/30' : 'text-gray-400'
                )} />
                <p className={cn(
                  'font-mono text-xs font-medium',
                  isDark ? 'text-white/80' : 'text-gray-800'
                )}>{layout.label}</p>
                <p className={cn(
                  'font-mono text-[10px] mt-0.5',
                  isDark ? 'text-white/30' : 'text-gray-500'
                )}>{layout.description}</p>
                {isActive && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      isDark ? "bg-purple-400" : "bg-purple-500"
                    )} />
                    <span className={cn(
                      "font-mono text-[9px]",
                      isDark ? "text-purple-400" : "text-purple-600"
                    )}>Active</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Live Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={cn(
          "p-5 rounded-xl backdrop-blur-xl border",
          isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <h3 className={cn(
          "font-display font-bold text-sm flex items-center gap-2 mb-4",
          isDark ? "text-white/80" : "text-gray-800"
        )}>
          <Monitor className="w-4 h-4 text-emerald-400/60" />
          Live Preview
        </h3>

        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: isDark ? settings.backgroundColor : '#F8FAFC',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }}
        >
          {/* Mini header */}
          <div
            className="px-4 py-3 flex items-center gap-3 border-b"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: settings.primaryColor + '20' }}
            >
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: settings.primaryColor }} />
            </div>
            <div className="flex-1">
              <div
                className="h-2 w-24 rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}
              />
            </div>
            <div className="flex gap-1.5">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: settings.accentColor + '30' }} />
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: settings.secondaryColor + '30' }} />
            </div>
          </div>

          {/* Mini content */}
          <div className="p-4 flex gap-3">
            {/* Sidebar mini */}
            <div
              className="w-12 rounded-lg p-2 flex flex-col gap-2 items-center"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            >
              {[settings.primaryColor, settings.secondaryColor, settings.accentColor].map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-md"
                  style={{ backgroundColor: c + (i === 0 ? '40' : '15') }}
                />
              ))}
            </div>

            {/* Cards */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {[
                { bg: settings.primaryColor, label: 'Primary' },
                { bg: settings.secondaryColor, label: 'Secondary' },
                { bg: settings.accentColor, label: 'Accent' },
                { bg: settings.primaryColor, label: 'Mixed' },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3 border"
                  style={{
                    backgroundColor: card.bg + '10',
                    borderColor: card.bg + '25',
                  }}
                >
                  <div
                    className="h-1.5 w-8 rounded-full mb-2"
                    style={{ backgroundColor: card.bg + '50' }}
                  />
                  <div
                    className="h-1 w-12 rounded-full"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                  />
                  <p className="font-mono text-[8px] mt-1.5" style={{ color: card.bg }}>
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
