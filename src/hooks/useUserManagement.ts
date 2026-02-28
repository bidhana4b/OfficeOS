import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  getAllUsersDetailed,
  createFullUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
  resetUserPassword,
  inviteUser,
  getInvitations,
  cancelInvitation,
  migrateDemoUser,
  type DetailedUser,
  type CreateFullUserInput,
  type InviteUserInput,
  type UserInvitation,
} from '@/lib/data-service';

export function useUserManagement() {
  const [users, setUsers] = useState<DetailedUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsersDetailed();
      setUsers(data);
    } catch (e: any) {
      console.error('[useUserManagement] fetch error:', e);
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await getInvitations();
      setInvitations(data);
    } catch (e: any) {
      console.error('[useUserManagement] invitations fetch error:', e);
    }
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    fetchUsers();
    fetchInvitations();

    if (!supabase) return;

    const channel = supabase
      .channel('user-management-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_users', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => {
        fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => {
        fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_invitations', filter: `tenant_id=eq.${DEMO_TENANT_ID}` }, () => {
        fetchInvitations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUsers, fetchInvitations]);

  const setUserActionLoading = (userId: string, state: boolean) => {
    setActionLoading((prev) => ({ ...prev, [userId]: state }));
  };

  const handleCreateUser = useCallback(async (input: CreateFullUserInput) => {
    const result = await createFullUser(input);
    await fetchUsers();
    return result;
  }, [fetchUsers]);

  const handleInviteUser = useCallback(async (input: InviteUserInput) => {
    const result = await inviteUser(input);
    await fetchInvitations();
    return result;
  }, [fetchInvitations]);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    await cancelInvitation(invitationId);
    await fetchInvitations();
  }, [fetchInvitations]);

  const handleMigrateDemoUser = useCallback(async (demoUserId: string, password?: string) => {
    setUserActionLoading(demoUserId, true);
    try {
      const result = await migrateDemoUser(demoUserId, password);
      await fetchUsers();
      return result;
    } finally {
      setUserActionLoading(demoUserId, false);
    }
  }, [fetchUsers]);

  const handleUpdateUser = useCallback(async (demoUserId: string, updates: Parameters<typeof updateUser>[1]) => {
    setUserActionLoading(demoUserId, true);
    try {
      await updateUser(demoUserId, updates);
      await fetchUsers();
    } finally {
      setUserActionLoading(demoUserId, false);
    }
  }, [fetchUsers]);

  const handleDeactivateUser = useCallback(async (demoUserId: string) => {
    setUserActionLoading(demoUserId, true);
    try {
      await deactivateUser(demoUserId);
      await fetchUsers();
    } finally {
      setUserActionLoading(demoUserId, false);
    }
  }, [fetchUsers]);

  const handleReactivateUser = useCallback(async (demoUserId: string) => {
    setUserActionLoading(demoUserId, true);
    try {
      await reactivateUser(demoUserId);
      await fetchUsers();
    } finally {
      setUserActionLoading(demoUserId, false);
    }
  }, [fetchUsers]);

  const handleDeleteUser = useCallback(async (demoUserId: string) => {
    setUserActionLoading(demoUserId, true);
    try {
      await deleteUser(demoUserId);
      await fetchUsers();
    } finally {
      setUserActionLoading(demoUserId, false);
    }
  }, [fetchUsers]);

  const handleResetPassword = useCallback(async (demoUserId: string, newPassword: string) => {
    setUserActionLoading(demoUserId, true);
    try {
      await resetUserPassword(demoUserId, newPassword);
      await fetchUsers();
    } finally {
      setUserActionLoading(demoUserId, false);
    }
  }, [fetchUsers]);

  return {
    users,
    invitations,
    loading,
    error,
    actionLoading,
    refetch: fetchUsers,
    refetchInvitations: fetchInvitations,
    createUser: handleCreateUser,
    inviteUser: handleInviteUser,
    cancelInvitation: handleCancelInvitation,
    migrateDemoUser: handleMigrateDemoUser,
    updateUser: handleUpdateUser,
    deactivateUser: handleDeactivateUser,
    reactivateUser: handleReactivateUser,
    deleteUser: handleDeleteUser,
    resetPassword: handleResetPassword,
  };
}
