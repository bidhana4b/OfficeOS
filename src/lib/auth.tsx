import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
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

      // Track last login
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
