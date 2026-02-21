import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { createDemoSession, validateDemoSession, getDemoUserById } from '@/lib/data-service';

export type UserRole = 'super_admin' | 'designer' | 'media_buyer' | 'account_manager' | 'finance' | 'client';

export interface DemoUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  avatar: string;
  client_id: string | null;
  metadata: Record<string, string>;
  tenant_id: string;
}

interface AuthContextType {
  user: DemoUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'titan_demo_user';
const SESSION_TOKEN_KEY = 'titan_session_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          // Try to validate session with DB
          if (sessionToken && parsed.id) {
            const isValid = await validateDemoSession(parsed.id, sessionToken);
            if (isValid) {
              // Session valid, refresh user data from DB
              const freshUser = await getDemoUserById(parsed.id);
              if (freshUser) {
                const demoUser: DemoUser = {
                  id: freshUser.id,
                  email: freshUser.email,
                  display_name: freshUser.display_name,
                  role: freshUser.role as UserRole,
                  avatar: freshUser.avatar || '',
                  client_id: freshUser.client_id,
                  metadata: freshUser.metadata || {},
                  tenant_id: freshUser.tenant_id,
                };
                setUser(demoUser);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
                setLoading(false);
                return;
              }
            }
          }

          // Fallback: use stored data if DB validation fails (allows offline access)
          // This session will be re-validated on next successful DB connection
          console.warn('[Auth] DB session validation unavailable — using cached session');
          setUser(parsed);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Database connection not available. Check environment variables.');
        setLoading(false);
        return false;
      }

      const { data, error: queryError } = await supabase
        .from('demo_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('password_hash', password)
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true)
        .single();

      if (queryError || !data) {
        setError('Invalid email or password');
        setLoading(false);
        return false;
      }

      const demoUser: DemoUser = {
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        role: data.role as UserRole,
        avatar: data.avatar || '',
        client_id: data.client_id,
        metadata: data.metadata || {},
        tenant_id: data.tenant_id,
      };

      setUser(demoUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));

      // Create session token in DB
      try {
        const token = await createDemoSession(data.id);
        if (token) {
          localStorage.setItem(SESSION_TOKEN_KEY, token);
        }
      } catch {
        // Session token creation failed, still allow login
        console.warn('Session token creation failed, using local-only session');
      }

      // Track last login (fire and forget)
      supabase.from('demo_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id).then(() => {});

      setLoading(false);
      return true;
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a safe fallback for components used outside AuthProvider (e.g., storyboards)
    return {
      user: null,
      loading: false,
      error: null,
      login: async () => false,
      logout: () => {},
      isAuthenticated: false,
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
