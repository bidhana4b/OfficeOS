import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

// ─── Theme Preset definitions ───────────────────────────────────────────────
export interface ThemePresetDef {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  // Light mode overrides
  lightBackground?: string;
  lightForeground?: string;
}

export const THEME_PRESETS: ThemePresetDef[] = [
  { id: 'cyber-midnight', name: 'Cyber Midnight', primary: '#00D9FF', secondary: '#7B61FF', accent: '#FF006E', background: '#0A0E27', lightBackground: '#F8FAFC', lightForeground: '#0F172A' },
  { id: 'neon-abyss', name: 'Neon Abyss', primary: '#39FF14', secondary: '#FF006E', accent: '#FFD700', background: '#0B0F1A', lightBackground: '#F0FDF4', lightForeground: '#14532D' },
  { id: 'arctic-storm', name: 'Arctic Storm', primary: '#60A5FA', secondary: '#A78BFA', accent: '#34D399', background: '#0F172A', lightBackground: '#EFF6FF', lightForeground: '#1E3A5F' },
  { id: 'solar-flare', name: 'Solar Flare', primary: '#F59E0B', secondary: '#EF4444', accent: '#F97316', background: '#1C1917', lightBackground: '#FFFBEB', lightForeground: '#451A03' },
  { id: 'phantom-glass', name: 'Phantom Glass', primary: '#E2E8F0', secondary: '#94A3B8', accent: '#22D3EE', background: '#020617', lightBackground: '#F1F5F9', lightForeground: '#0F172A' },
  { id: 'crimson-ops', name: 'Crimson Ops', primary: '#FF006E', secondary: '#DC2626', accent: '#FF4500', background: '#180A0A', lightBackground: '#FFF1F2', lightForeground: '#4C0519' },
  { id: 'emerald-matrix', name: 'Emerald Matrix', primary: '#10B981', secondary: '#059669', accent: '#34D399', background: '#0A1A14', lightBackground: '#ECFDF5', lightForeground: '#064E3B' },
  { id: 'royal-amethyst', name: 'Royal Amethyst', primary: '#A855F7', secondary: '#7C3AED', accent: '#C084FC', background: '#1A0A2E', lightBackground: '#FAF5FF', lightForeground: '#3B0764' },
  { id: 'titan-default', name: 'TITAN Default', primary: '#00D9FF', secondary: '#FF006E', accent: '#39FF14', background: '#0A0E27', lightBackground: '#F0F9FF', lightForeground: '#0C1220' },
];

export type ThemeMode = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'normal' | 'large';
export type DashboardLayout = 'compact' | 'extended' | 'client-simplified';

export interface UserThemeSettings {
  themeMode: ThemeMode;
  activePreset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontSize: FontSize;
  dashboardLayout: DashboardLayout;
  sidebarCollapsed: boolean;
}

const DEFAULT_SETTINGS: UserThemeSettings = {
  themeMode: 'dark',
  activePreset: 'cyber-midnight',
  primaryColor: '#00D9FF',
  secondaryColor: '#7B61FF',
  accentColor: '#FF006E',
  backgroundColor: '#0A0E27',
  fontSize: 'normal',
  dashboardLayout: 'extended',
  sidebarCollapsed: false,
};

interface ThemeContextType {
  settings: UserThemeSettings;
  isDark: boolean;
  loading: boolean;
  error: string | null;
  updateTheme: (updates: Partial<UserThemeSettings>) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  presets: ThemePresetDef[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'titan_theme_settings';

// ─── Helper: hex → HSL string for CSS vars ────────────────────────────────
function hexToHsl(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ─── Apply theme to DOM ───────────────────────────────────────────────────
function applyThemeToDOM(settings: UserThemeSettings, systemPrefersDark: boolean) {
  const root = document.documentElement;
  const isDark = settings.themeMode === 'system' ? systemPrefersDark : settings.themeMode === 'dark';
  const preset = THEME_PRESETS.find((p) => p.id === settings.activePreset) || THEME_PRESETS[0];

  // Toggle class for tailwind darkMode: ["class"]
  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  // CSS Custom Properties
  if (isDark) {
    // Dark mode
    root.style.setProperty('--background', hexToHsl(settings.backgroundColor || preset.background));
    root.style.setProperty('--foreground', '210 40% 95%');
    root.style.setProperty('--card', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 15)));
    root.style.setProperty('--card-foreground', '210 40% 95%');
    root.style.setProperty('--popover', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 15)));
    root.style.setProperty('--popover-foreground', '210 40% 95%');
    root.style.setProperty('--primary', hexToHsl(settings.primaryColor || preset.primary));
    root.style.setProperty('--primary-foreground', hexToHsl(settings.backgroundColor || preset.background));
    root.style.setProperty('--secondary', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 25)));
    root.style.setProperty('--secondary-foreground', '210 40% 95%');
    root.style.setProperty('--muted', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 20)));
    root.style.setProperty('--muted-foreground', '215 20% 55%');
    root.style.setProperty('--accent', hexToHsl(settings.accentColor || preset.accent));
    root.style.setProperty('--accent-foreground', '210 40% 95%');
    root.style.setProperty('--border', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 30)));
    root.style.setProperty('--input', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 30)));
    root.style.setProperty('--ring', hexToHsl(settings.primaryColor || preset.primary));
    root.style.setProperty('--sidebar-background', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, -5)));
    root.style.setProperty('--sidebar-foreground', '210 40% 90%');
    root.style.setProperty('--sidebar-primary', hexToHsl(settings.primaryColor || preset.primary));
    root.style.setProperty('--sidebar-primary-foreground', hexToHsl(settings.backgroundColor || preset.background));
    root.style.setProperty('--sidebar-accent', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 18)));
    root.style.setProperty('--sidebar-accent-foreground', '210 40% 90%');
    root.style.setProperty('--sidebar-border', hexToHsl(adjustBrightness(settings.backgroundColor || preset.background, 25)));
    root.style.setProperty('--sidebar-ring', hexToHsl(settings.primaryColor || preset.primary));

    // Apply background color directly to body
    document.body.style.backgroundColor = settings.backgroundColor || preset.background;
    document.body.style.color = '';
  } else {
    // Light mode
    const lightBg = preset.lightBackground || '#F8FAFC';
    const lightFg = preset.lightForeground || '#0F172A';
    root.style.setProperty('--background', hexToHsl(lightBg));
    root.style.setProperty('--foreground', hexToHsl(lightFg));
    root.style.setProperty('--card', '0 0% 100%');
    root.style.setProperty('--card-foreground', hexToHsl(lightFg));
    root.style.setProperty('--popover', '0 0% 100%');
    root.style.setProperty('--popover-foreground', hexToHsl(lightFg));
    root.style.setProperty('--primary', hexToHsl(settings.primaryColor || preset.primary));
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--secondary', '210 20% 93%');
    root.style.setProperty('--secondary-foreground', hexToHsl(lightFg));
    root.style.setProperty('--muted', '210 20% 96%');
    root.style.setProperty('--muted-foreground', '215 20% 45%');
    root.style.setProperty('--accent', hexToHsl(settings.accentColor || preset.accent));
    root.style.setProperty('--accent-foreground', hexToHsl(lightFg));
    root.style.setProperty('--border', '214 20% 88%');
    root.style.setProperty('--input', '214 20% 88%');
    root.style.setProperty('--ring', hexToHsl(settings.primaryColor || preset.primary));
    root.style.setProperty('--sidebar-background', '210 20% 96%');
    root.style.setProperty('--sidebar-foreground', hexToHsl(lightFg));
    root.style.setProperty('--sidebar-primary', hexToHsl(settings.primaryColor || preset.primary));
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-accent', '210 20% 92%');
    root.style.setProperty('--sidebar-accent-foreground', hexToHsl(lightFg));
    root.style.setProperty('--sidebar-border', '214 20% 90%');
    root.style.setProperty('--sidebar-ring', hexToHsl(settings.primaryColor || preset.primary));

    document.body.style.backgroundColor = lightBg;
    document.body.style.color = lightFg;
  }

  // Font size
  const fontSizes: Record<FontSize, string> = { small: '14px', normal: '16px', large: '18px' };
  root.style.fontSize = fontSizes[settings.fontSize] || '16px';

  // Set CSS custom properties for theme colors (for inline usage)
  root.style.setProperty('--titan-primary', settings.primaryColor || preset.primary);
  root.style.setProperty('--titan-secondary', settings.secondaryColor || preset.secondary);
  root.style.setProperty('--titan-accent', settings.accentColor || preset.accent);
  root.style.setProperty('--titan-bg', isDark ? (settings.backgroundColor || preset.background) : (preset.lightBackground || '#F8FAFC'));
}

// ─── Helper: adjust hex brightness ─────────────────────────────────────────
function adjustBrightness(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserThemeSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch { /* fallback */ }
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Watch system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply theme whenever settings or system preference changes
  useEffect(() => {
    applyThemeToDOM(settings, systemPrefersDark);
  }, [settings, systemPrefersDark]);

  // Resolve isDark
  const isDark = settings.themeMode === 'system' ? systemPrefersDark : settings.themeMode === 'dark';

  // Get userId from localStorage (demo auth)
  const getUserId = (): string | null => {
    try {
      const stored = localStorage.getItem('titan_demo_user');
      if (stored) return JSON.parse(stored).id;
    } catch { /* ignore */ }
    return null;
  };

  // Load from DB on mount
  useEffect(() => {
    const loadFromDB = async () => {
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: err } = await supabase
          .from('user_appearance_settings')
          .select('*')
          .eq('user_id', userId)
          .eq('tenant_id', DEMO_TENANT_ID)
          .single();

        if (err && err.code !== 'PGRST116') {
          console.warn('Error loading theme:', err);
          setLoading(false);
          return;
        }

        if (data) {
          const loaded: UserThemeSettings = {
            themeMode: data.theme_mode as ThemeMode,
            activePreset: data.active_preset,
            primaryColor: data.primary_color,
            secondaryColor: data.secondary_color,
            accentColor: data.accent_color,
            backgroundColor: data.background_color,
            fontSize: data.font_size as FontSize,
            dashboardLayout: data.dashboard_layout as DashboardLayout,
            sidebarCollapsed: data.sidebar_collapsed,
          };
          setSettings(loaded);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
        }
      } catch (e) {
        console.warn('Theme load error:', e);
      } finally {
        setLoading(false);
      }
    };

    loadFromDB();
  }, []);

  // Persist to both localStorage and DB
  const persistSettings = useCallback(async (newSettings: UserThemeSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    const userId = getUserId();
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('user_appearance_settings')
        .upsert({
          user_id: userId,
          tenant_id: DEMO_TENANT_ID,
          theme_mode: newSettings.themeMode,
          active_preset: newSettings.activePreset,
          primary_color: newSettings.primaryColor,
          secondary_color: newSettings.secondaryColor,
          accent_color: newSettings.accentColor,
          background_color: newSettings.backgroundColor,
          font_size: newSettings.fontSize,
          dashboard_layout: newSettings.dashboardLayout,
          sidebar_collapsed: newSettings.sidebarCollapsed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,tenant_id' });

      if (err) {
        console.error('Theme save error:', err);
        setError('Failed to save theme to server');
      } else {
        setError(null);
      }
    } catch (e) {
      console.error('Theme persist error:', e);
    }
  }, []);

  const updateTheme = useCallback(async (updates: Partial<UserThemeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const applyPreset = useCallback(async (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const updates: Partial<UserThemeSettings> = {
      activePreset: presetId,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
      backgroundColor: preset.background,
    };
    await updateTheme(updates);
  }, [updateTheme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    await updateTheme({ themeMode: mode });
  }, [updateTheme]);

  const resetToDefaults = useCallback(async () => {
    await updateTheme(DEFAULT_SETTINGS);
  }, [updateTheme]);

  return (
    <ThemeContext.Provider
      value={{
        settings,
        isDark,
        loading,
        error,
        updateTheme,
        applyPreset,
        setThemeMode,
        resetToDefaults,
        presets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Safe fallback for storyboards
    return {
      settings: DEFAULT_SETTINGS,
      isDark: true,
      loading: false,
      error: null,
      updateTheme: async () => {},
      applyPreset: async () => {},
      setThemeMode: async () => {},
      resetToDefaults: async () => {},
      presets: THEME_PRESETS,
    } as ThemeContextType;
  }
  return context;
}
