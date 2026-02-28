import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'designer' | 'media_buyer' | 'account_manager' | 'finance' | 'client';

export interface AppUser {
  id: string; // demo_users.id (backward compatible)
  auth_id: string; // auth.users.id (Supabase Auth UUID)
  email: string;
  display_name: string;
  role: UserRole;
  avatar: string;
  client_id: string | null;
  metadata: Record<string, string>;
  tenant_id: string;
  profile_id: string | null;
  team_member_id: string | null;
}

/** @deprecated Use AppUser instead */
export type DemoUser = AppUser;

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Legacy storage keys (for cleanup)
const LEGACY_STORAGE_KEY = 'titan_demo_user';
const LEGACY_SESSION_TOKEN_KEY = 'titan_session_token';

/**
 * Fetch the user's app profile data (role, display_name, etc.) from demo_users
 */
async function fetchAppUser(authUser: User): Promise<AppUser | null> {
  if (!supabase) return null;

  // Try to find by auth_user_id first (migrated users)
  const { data: demoUser, error } = await supabase
    .from('demo_users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .eq('is_active', true)
    .single();

  if (!error && demoUser) {
    return {
      id: demoUser.id,
      auth_id: authUser.id,
      email: demoUser.email,
      display_name: demoUser.display_name,
      role: demoUser.role as UserRole,
      avatar: demoUser.avatar || '',
      client_id: demoUser.client_id,
      metadata: demoUser.metadata || {},
      tenant_id: demoUser.tenant_id,
      profile_id: demoUser.user_profile_id,
      team_member_id: demoUser.team_member_id,
    };
  }

  // Fallback: look up by email (for users who signed up via Supabase Auth directly)
  const { data: demoUserByEmail } = await supabase
    .from('demo_users')
    .select('*')
    .eq('email', authUser.email?.toLowerCase().trim())
    .eq('is_active', true)
    .single();

  if (demoUserByEmail) {
    // Link this demo_user to the auth user for future lookups
    await supabase.from('demo_users')
      .update({ auth_user_id: authUser.id })
      .eq('id', demoUserByEmail.id);

    if (demoUserByEmail.user_profile_id) {
      await supabase.from('user_profiles')
        .update({ auth_user_id: authUser.id })
        .eq('id', demoUserByEmail.user_profile_id);
    }

    return {
      id: demoUserByEmail.id,
      auth_id: authUser.id,
      email: demoUserByEmail.email,
      display_name: demoUserByEmail.display_name,
      role: demoUserByEmail.role as UserRole,
      avatar: demoUserByEmail.avatar || '',
      client_id: demoUserByEmail.client_id,
      metadata: demoUserByEmail.metadata || {},
      tenant_id: demoUserByEmail.tenant_id,
      profile_id: demoUserByEmail.user_profile_id,
      team_member_id: demoUserByEmail.team_member_id,
    };
  }

  // No demo_users record found — use auth metadata
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    auth_id: authUser.id,
    email: authUser.email || '',
    display_name: meta.display_name || authUser.email?.split('@')[0] || 'User',
    role: (meta.role as UserRole) || 'client',
    avatar: meta.avatar || '',
    client_id: meta.client_id || null,
    metadata: {},
    tenant_id: meta.tenant_id || DEMO_TENANT_ID,
    profile_id: null,
    team_member_id: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Initialize auth state from Supabase session
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Clean up legacy localStorage
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);

        // Get current session from Supabase
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user && mounted) {
          setSession(currentSession);
          const appUser = await fetchAppUser(currentSession.user);
          setUser(appUser);
        }
      } catch (err) {
        console.error('[Auth] Session initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          const appUser = await fetchAppUser(newSession.user);
          setUser(appUser);
          setIsDemoMode(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsDemoMode(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          const appUser = await fetchAppUser(newSession.user);
          setUser(appUser);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login with email and password via Supabase Auth.
   * Falls back to demo_users table for quick demo login.
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Primary: Try Supabase Auth login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (!authError && data.session) {
        const appUser = await fetchAppUser(data.user);
        setUser(appUser);
        setSession(data.session);
        setIsDemoMode(false);

        if (appUser?.id) {
          supabase.from('demo_users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', appUser.id)
            .then(() => {});
        }

        setLoading(false);
        return true;
      }

      // Fallback: Try demo_users table login (for non-migrated demo users)
      console.warn('[Auth] Supabase Auth failed, trying demo fallback:', authError?.message);

      const { data: demoData, error: demoError } = await supabase
        .from('demo_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('password_hash', password)
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true)
        .single();

      if (demoError || !demoData) {
        setError('Invalid email or password');
        setLoading(false);
        return false;
      }

      // Demo login succeeded — try auto-migrate to Supabase Auth
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              display_name: demoData.display_name,
              role: demoData.role,
              tenant_id: demoData.tenant_id,
            },
          },
        });

        if (!signUpError && signUpData.session) {
          await supabase.from('demo_users')
            .update({ auth_user_id: signUpData.user?.id })
            .eq('id', demoData.id);

          if (demoData.user_profile_id) {
            await supabase.from('user_profiles')
              .update({ auth_user_id: signUpData.user?.id })
              .eq('id', demoData.user_profile_id);
          }

          const appUser = await fetchAppUser(signUpData.user!);
          setUser(appUser);
          setSession(signUpData.session);
          setIsDemoMode(false);
          setLoading(false);
          return true;
        }
      } catch {
        // Auto-migration failed, continue with demo mode
      }

      // Use demo mode as final fallback
      const demoAppUser: AppUser = {
        id: demoData.id,
        auth_id: demoData.auth_user_id || demoData.id,
        email: demoData.email,
        display_name: demoData.display_name,
        role: demoData.role as UserRole,
        avatar: demoData.avatar || '',
        client_id: demoData.client_id,
        metadata: demoData.metadata || {},
        tenant_id: demoData.tenant_id,
        profile_id: demoData.user_profile_id,
        team_member_id: demoData.team_member_id,
      };

      setUser(demoAppUser);
      setIsDemoMode(true);

      supabase.from('demo_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', demoData.id)
        .then(() => {});

      setLoading(false);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore errors
    }
    setUser(null);
    setSession(null);
    setIsDemoMode(false);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: metadata },
      });
      if (signUpError) return { success: false, error: signUpError.message };
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      return { success: false, error: message };
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: `${window.location.origin}/login?reset=true` }
      );
      if (resetError) return { success: false, error: resetError.message };
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      return { success: false, error: message };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) return { success: false, error: updateError.message };
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password update failed';
      return { success: false, error: message };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        login,
        logout,
        signUp,
        resetPassword,
        updatePassword,
        isAuthenticated: !!user,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      loading: false,
      error: null,
      login: async () => false,
      logout: async () => {},
      signUp: async () => ({ success: false, error: 'Not in AuthProvider' }),
      resetPassword: async () => ({ success: false, error: 'Not in AuthProvider' }),
      updatePassword: async () => ({ success: false, error: 'Not in AuthProvider' }),
      isAuthenticated: false,
      isDemoMode: false,
    } as AuthContextType;
  }
  return context;
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'super_admin': return '/dashboard/admin';
    case 'designer': return '/dashboard/design';
    case 'media_buyer': return '/dashboard/media';
    case 'account_manager': return '/dashboard/account';
    case 'finance': return '/dashboard/finance';
    case 'client': return '/dashboard/client';
    default: return '/dashboard/admin';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'designer': return 'Designer';
    case 'media_buyer': return 'Media Buyer';
    case 'account_manager': return 'Account Manager';
    case 'finance': return 'Finance';
    case 'client': return 'Client';
    default: return role;
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'super_admin': return '#00D9FF';
    case 'designer': return '#7B61FF';
    case 'media_buyer': return '#FF006E';
    case 'account_manager': return '#39FF14';
    case 'finance': return '#FFB800';
    case 'client': return '#00D9FF';
    default: return '#00D9FF';
  }
}
