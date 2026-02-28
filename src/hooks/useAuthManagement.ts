import { useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { UserRole } from '@/lib/auth';

export interface CreateUserOptions {
  email: string;
  password: string;
  display_name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  client_id?: string | null;
  primary_role_label?: string;
  team_ids?: string[];
  metadata?: Record<string, string>;
}

export interface InviteUserOptions {
  email: string;
  display_name: string;
  role: UserRole;
  metadata?: Record<string, string>;
}

/**
 * Hook for managing Supabase Auth user lifecycle
 * Handles: create, invite, reset password, migrate demo users
 */
export function useAuthManagement() {
  /**
   * Create a new user via Supabase Auth
   * Automatically creates user_profile, user_roles, team_member entries
   */
  const createUser = useCallback(async (options: CreateUserOptions) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.functions.invoke(
      'supabase-functions-create-user',
      {
        body: {
          ...options,
          tenant_id: DEMO_TENANT_ID,
        },
      }
    );

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return {
      auth_user_id: data.auth_user_id,
      demo_user: data.demo_user,
      user_profile: data.user_profile,
      team_member: data.team_member,
    };
  }, []);

  /**
   * Send a user invitation
   * User accepts by providing password
   */
  const inviteUser = useCallback(async (options: InviteUserOptions) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.functions.invoke(
      'supabase-functions-create-user',
      {
        body: { ...options, action: 'invite' },
      }
    );

    if (error) {
      throw new Error(`Failed to invite user: ${error.message}`);
    }

    return data;
  }, []);

  /**
   * Accept a user invitation and create account
   */
  const acceptInvitation = useCallback(async (token: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.functions.invoke(
      'supabase-functions-create-user',
      {
        body: { token, password, action: 'accept-invitation' },
      }
    );

    if (error) {
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }

    return data;
  }, []);

  /**
   * Request a password reset
   */
  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(`Failed to send reset email: ${error.message}`);
    }
  }, []);

  /**
   * Update password (requires current session)
   */
  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }, []);

  /**
   * Migrate a demo_user to Supabase Auth
   */
  const migrateDemoUser = useCallback(async (demoUserId: string, password?: string) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.functions.invoke(
      'supabase-functions-create-user',
      {
        body: {
          demo_user_id: demoUserId,
          password,
          action: 'migrate-demo-user',
        },
      }
    );

    if (error) {
      throw new Error(`Failed to migrate user: ${error.message}`);
    }

    return data;
  }, []);

  return {
    createUser,
    inviteUser,
    acceptInvitation,
    resetPassword,
    updatePassword,
    migrateDemoUser,
  };
}
