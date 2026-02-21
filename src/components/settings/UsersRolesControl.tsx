import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  UserPlus,
  Copy,
  Trash2,
  Check,
  X,
  Key,
  Monitor,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Save,
  AlertCircle,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  Search,
  Users,
  Link2,
  Unlink,
  Edit3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  UserCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { roles as mockRoles } from './defaults';
import type { Role } from './types';
import { useRoles } from '@/hooks/useSettings';
import { useUserManagement } from '@/hooks/useUserManagement';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { type CreateFullUserRole, type DetailedUser } from '@/lib/data-service';

type UserFilter = 'all' | 'active' | 'inactive' | 'staff' | 'client';

export default function UsersRolesControl() {
  const rolesQuery = useRoles();
  const um = useUserManagement();

  const roleList: Role[] = rolesQuery.data.length > 0
    ? rolesQuery.data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        description: (r.description as string) || '',
        isSystem: (r.is_system as boolean) || false,
        permissions: ((r.permissions as Record<string, unknown>[]) || []).reduce((acc: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }>, p) => {
          acc[p.module as string] = {
            read: (p.can_read as boolean) || false,
            create: (p.can_create as boolean) || false,
            update: (p.can_update as boolean) || false,
            delete: (p.can_delete as boolean) || false,
          };
          return acc;
        }, {}),
        userCount: (r.user_count as number) || 0,
      }))
    : [];

  // State
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [multiRoleEnabled, setMultiRoleEnabled] = useState(false);
  const [defaultRole, setDefaultRole] = useState('Account Manager');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Add User Dialog
  const [showAddUser, setShowAddUser] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    display_name: '',
    email: '',
    password: '123456',
    role: 'account_manager' as CreateFullUserRole,
    phone: '',
  });

  // Edit User Dialog
  const [editUser, setEditUser] = useState<DetailedUser | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', email: '', phone: '' });
  const [editingUser, setEditingUser] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Password Reset Dialog
  const [resetPwUser, setResetPwUser] = useState<DetailedUser | null>(null);
  const [newPassword, setNewPassword] = useState('123456');
  const [resettingPw, setResettingPw] = useState(false);

  // Delete Confirm Dialog
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<DetailedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Filtered + searched user list
  const filteredUsers = useMemo(() => {
    let list = um.users;
    if (userFilter === 'active') list = list.filter((u) => u.is_active);
    if (userFilter === 'inactive') list = list.filter((u) => !u.is_active);
    if (userFilter === 'staff') list = list.filter((u) => u.role !== 'client');
    if (userFilter === 'client') list = list.filter((u) => u.role === 'client');
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter((u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role_label.toLowerCase().includes(q)
      );
    }
    return list;
  }, [um.users, userFilter, userSearch]);

  const userStats = useMemo(() => ({
    total: um.users.length,
    active: um.users.filter((u) => u.is_active).length,
    inactive: um.users.filter((u) => !u.is_active).length,
    staff: um.users.filter((u) => u.role !== 'client').length,
    clients: um.users.filter((u) => u.role === 'client').length,
    linked: um.users.filter((u) => u.has_profile && (u.has_team_member || u.role === 'client')).length,
  }), [um.users]);

  const selectedRoleData = roleList.find((r) => r.id === selectedRole);

  const handleSaveRoleSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'users_roles',
          config: { multiRoleEnabled, defaultRole },
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

  const handleAddUser = useCallback(async () => {
    if (!addUserForm.display_name.trim() || !addUserForm.email.trim()) return;
    setAddingUser(true);
    setAddUserError(null);
    setAddUserSuccess(false);
    try {
      await um.createUser({
        display_name: addUserForm.display_name,
        email: addUserForm.email,
        password: addUserForm.password || '123456',
        role: addUserForm.role,
        phone: addUserForm.phone || undefined,
      });
      setAddUserSuccess(true);
      setAddUserForm({ display_name: '', email: '', password: '123456', role: 'account_manager', phone: '' });
      rolesQuery.refetch();
      setTimeout(() => { setShowAddUser(false); setAddUserSuccess(false); }, 1500);
    } catch (err: any) {
      console.error('Failed to create user:', err);
      setAddUserError(err?.message || 'Failed to create user. Email may already exist.');
    } finally {
      setAddingUser(false);
    }
  }, [addUserForm, um, rolesQuery]);

  const handleEditUser = useCallback(async () => {
    if (!editUser) return;
    setEditingUser(true);
    setEditError(null);
    try {
      await um.updateUser(editUser.id, {
        display_name: editForm.display_name || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
      });
      setEditUser(null);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update user');
    } finally {
      setEditingUser(false);
    }
  }, [editUser, editForm, um]);

  const handleResetPassword = useCallback(async () => {
    if (!resetPwUser || !newPassword.trim()) return;
    setResettingPw(true);
    try {
      await um.resetPassword(resetPwUser.id, newPassword);
      setResetPwUser(null);
      setNewPassword('123456');
    } catch (err) { console.error('Password reset failed:', err); }
    finally { setResettingPw(false); }
  }, [resetPwUser, newPassword, um]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteConfirmUser) return;
    setDeletingUser(true);
    try {
      await um.deleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeletingUser(false); }
  }, [deleteConfirmUser, um]);

  const openEditDialog = (user: DetailedUser) => {
    setEditForm({ display_name: user.display_name, email: user.email, phone: '' });
    setEditError(null);
    setEditUser(user);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'designer': return 'text-violet-400 bg-violet-500/10 border-violet-500/30';
      case 'media_buyer': return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      case 'account_manager': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'finance': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'client': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-titan-purple/10 border border-titan-purple/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-titan-purple" />
            </div>
            Users & Role Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Role management, permission matrix, and user control</p>
        </div>
        <button
          onClick={handleSaveRoleSettings}
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

      {/* Role Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
            <Shield className="w-4 h-4 text-titan-purple/60" />
            Role Management
          </h3>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-titan-purple/10 border border-titan-purple/30 text-[10px] font-mono text-titan-purple hover:bg-titan-purple/20 transition-all">
            <UserPlus className="w-3 h-3" />
            Create Role
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {roleList.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                selectedRole === role.id
                  ? 'bg-titan-purple/10 border-titan-purple/40 shadow-lg shadow-titan-purple/10'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-white/80 font-medium">{role.name}</span>
                {role.isSystem && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-titan-cyan/10 text-titan-cyan/70 border border-titan-cyan/20">
                    SYSTEM
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-white/30 mb-2">{role.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/40">{role.userCount} users</span>
                <div className="flex gap-1">
                  <button className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                  {!role.isSystem && (
                    <button className="p-1 rounded hover:bg-titan-magenta/10 text-white/30 hover:text-titan-magenta transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Permission Matrix */}
        {selectedRoleData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]"
          >
            <h4 className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-3">
              Permission Matrix — {selectedRoleData.name}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left font-mono text-[10px] text-white/30 pb-2 pr-4">Module</th>
                    <th className="font-mono text-[10px] text-white/30 pb-2 px-3">Create</th>
                    <th className="font-mono text-[10px] text-white/30 pb-2 px-3">Read</th>
                    <th className="font-mono text-[10px] text-white/30 pb-2 px-3">Update</th>
                    <th className="font-mono text-[10px] text-white/30 pb-2 px-3">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedRoleData.permissions).map(([module, perms]) => (
                    <tr key={module} className="border-t border-white/[0.04]">
                      <td className="py-2 pr-4 font-mono text-xs text-white/60 capitalize">{module}</td>
                      {(['create', 'read', 'update', 'delete'] as const).map((perm) => (
                        <td key={perm} className="py-2 px-3 text-center">
                          {perms[perm] ? (
                            <Check className="w-3.5 h-3.5 text-titan-lime mx-auto" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-white/15 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Multi-Role Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-titan-cyan/60" />
          Multi-Role Assignment Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Allow multiple roles per user"
            description="Users can be assigned more than one role simultaneously"
            enabled={multiRoleEnabled}
            onToggle={() => setMultiRoleEnabled(!multiRoleEnabled)}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Default role for new users</p>
              <p className="font-mono text-[10px] text-white/30">Automatically assigned when creating a user</p>
            </div>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              {roleList.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* User Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: userStats.total, icon: Users, color: 'text-white/70' },
          { label: 'Active', value: userStats.active, icon: UserCheck, color: 'text-titan-lime' },
          { label: 'Inactive', value: userStats.inactive, icon: UserX, color: 'text-titan-magenta' },
          { label: 'Staff', value: userStats.staff, icon: Shield, color: 'text-titan-cyan' },
          { label: 'Clients', value: userStats.clients, icon: Users, color: 'text-titan-purple' },
          { label: 'Linked', value: userStats.linked, icon: Link2, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={cn('w-3 h-3', stat.color)} />
              <span className="font-mono text-[10px] text-white/40">{stat.label}</span>
            </div>
            <p className={cn('font-display font-bold text-lg', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* User Control */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-titan-cyan/60" />
            User Control
            <span className="ml-2 px-2 py-0.5 rounded-full bg-titan-cyan/10 text-titan-cyan text-[10px] font-mono">{filteredUsers.length}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => um.refetch()} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors" title="Refresh">
              <RefreshCw className={cn('w-3.5 h-3.5', um.loading && 'animate-spin')} />
            </button>
            <button onClick={() => setShowAddUser(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-titan-lime/10 border border-titan-lime/30 text-[10px] font-mono text-titan-lime hover:bg-titan-lime/20 transition-all">
              <UserPlus className="w-3 h-3" /> Add User
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-mono placeholder:text-white/20 focus:border-titan-cyan/30 focus:outline-none transition-colors" />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            {(['all', 'active', 'inactive', 'staff', 'client'] as UserFilter[]).map((f) => (
              <button key={f} onClick={() => setUserFilter(f)} className={cn('px-2.5 py-1 rounded text-[10px] font-mono transition-all capitalize', userFilter === f ? 'bg-titan-cyan/15 text-titan-cyan' : 'text-white/30 hover:text-white/50')}>{f}</button>
            ))}
          </div>
        </div>

        {um.loading && um.users.length === 0 && (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-titan-cyan animate-spin" /><span className="ml-2 font-mono text-xs text-white/40">Loading users...</span></div>
        )}

        {um.error && (
          <div className="mb-4 p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-titan-magenta shrink-0" />
            <p className="font-mono text-xs text-titan-magenta">{um.error}</p>
            <button onClick={() => um.refetch()} className="ml-auto font-mono text-[10px] text-titan-cyan hover:underline">Retry</button>
          </div>
        )}

        {!um.loading && filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-8 h-8 text-white/10 mb-3" />
            <p className="font-mono text-xs text-white/30">{userSearch ? 'No users match your search' : 'No users found'}</p>
          </div>
        )}

        <div className="space-y-2">
          {filteredUsers.map((user) => {
            const isExpanded = expandedUser === user.id;
            const isActionLoading = um.actionLoading[user.id];
            return (
              <motion.div key={user.id} layout className={cn('rounded-lg border transition-all', user.is_active ? 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1]' : 'bg-white/[0.01] border-white/[0.03] opacity-60')}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0', user.is_active ? 'bg-titan-cyan/15 text-titan-cyan border border-titan-cyan/30' : 'bg-white/[0.06] text-white/30 border border-white/10')}>
                      {user.avatar && user.avatar.length <= 3 ? user.avatar : user.display_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-xs text-white/80 font-medium truncate">{user.display_name}</p>
                        <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-mono border', getRoleColor(user.role))}>{user.role_label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[10px] text-white/30 truncate">{user.email}</p>
                        <div className="flex items-center gap-1">
                          <span title={user.has_profile ? 'Profile linked' : 'No profile'} className={cn('w-1.5 h-1.5 rounded-full', user.has_profile ? 'bg-titan-lime' : 'bg-white/10')} />
                          <span title={user.has_team_member ? 'Team linked' : 'No team link'} className={cn('w-1.5 h-1.5 rounded-full', user.has_team_member ? 'bg-titan-cyan' : user.role === 'client' ? 'bg-titan-purple' : 'bg-white/10')} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn('px-2 py-0.5 rounded-full text-[9px] font-mono', user.is_active ? 'bg-titan-lime/10 text-titan-lime' : 'bg-titan-magenta/10 text-titan-magenta')}>{user.is_active ? 'active' : 'inactive'}</div>
                    <div className="flex gap-0.5">
                      <button onClick={() => openEditDialog(user)} className="p-1.5 rounded hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors" title="Edit" disabled={isActionLoading}><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => { setResetPwUser(user); setNewPassword('123456'); }} className="p-1.5 rounded hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors" title="Reset password" disabled={isActionLoading}><Key className="w-3 h-3" /></button>
                      {user.is_active ? (
                        <button onClick={() => um.deactivateUser(user.id)} className="p-1.5 rounded hover:bg-titan-magenta/10 text-white/25 hover:text-titan-magenta transition-colors" title="Deactivate" disabled={isActionLoading}>{isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}</button>
                      ) : (
                        <button onClick={() => um.reactivateUser(user.id)} className="p-1.5 rounded hover:bg-titan-lime/10 text-white/25 hover:text-titan-lime transition-colors" title="Reactivate" disabled={isActionLoading}>{isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}</button>
                      )}
                      <button onClick={() => setDeleteConfirmUser(user)} className="p-1.5 rounded hover:bg-titan-magenta/10 text-white/25 hover:text-titan-magenta transition-colors" title="Delete" disabled={isActionLoading}><Trash2 className="w-3 h-3" /></button>
                      <button onClick={() => setExpandedUser(isExpanded ? null : user.id)} className="p-1.5 rounded hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors" title="Details">{isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                          {[
                            { l: 'User ID', v: user.id.substring(0, 8) + '...' },
                            { l: 'Created', v: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' },
                            { l: 'Last Login', v: user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never' },
                            { l: 'PW Changed', v: user.password_changed_at ? new Date(user.password_changed_at).toLocaleString() : 'Never' },
                          ].map((d) => (
                            <div key={d.l} className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                              <p className="font-mono text-[9px] text-white/30 mb-0.5">{d.l}</p>
                              <p className="font-mono text-[10px] text-white/60 truncate">{d.v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          {[
                            { l: 'Profile', linked: user.has_profile, id: user.user_profile_id, s: user.profile_status },
                            { l: 'Team', linked: user.has_team_member, id: user.team_member_id, s: user.team_member_status },
                            { l: 'Login', linked: true, id: user.id, s: user.is_active ? 'active' : 'disabled' },
                          ].map((ls) => (
                            <div key={ls.l} className={cn('p-2 rounded border', ls.linked ? 'bg-titan-lime/5 border-titan-lime/15' : 'bg-white/[0.01] border-white/[0.04]')}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {ls.linked ? <Link2 className="w-3 h-3 text-titan-lime/70" /> : <Unlink className="w-3 h-3 text-white/15" />}
                                <p className="font-mono text-[9px] text-white/40">{ls.l}</p>
                              </div>
                              <p className={cn('font-mono text-[10px]', ls.linked ? 'text-titan-lime/80' : 'text-white/20')}>
                                {ls.linked ? `${ls.s || 'linked'} · ${(ls.id || '').substring(0, 8)}...` : 'Not linked'}
                              </p>
                            </div>
                          ))}
                        </div>
                        {user.team_member_role && (
                          <div className="mt-2 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                            <p className="font-mono text-[10px] text-white/40">Team Role: <span className="text-white/60">{user.team_member_role}</span></p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {filteredUsers.length > 0 && (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] text-white/20">Showing {filteredUsers.length} of {um.users.length}</p>
            <p className="font-mono text-[10px] text-white/20 flex items-center gap-1"><Database className="w-3 h-3" />Live from demo_users</p>
          </div>
        )}
      </motion.div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !addingUser && setShowAddUser(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg mx-4 p-6 rounded-2xl bg-[#0D1230] border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-extrabold text-lg text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-titan-cyan" />Create New User</h3>
                <button onClick={() => !addingUser && setShowAddUser(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              {addUserError && (<div className="mb-4 p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/30 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-titan-magenta shrink-0" /><p className="font-mono text-xs text-titan-magenta">{addUserError}</p></div>)}
              {addUserSuccess && (<div className="mb-4 p-3 rounded-lg bg-titan-lime/10 border border-titan-lime/30 flex items-center gap-2"><Check className="w-4 h-4 text-titan-lime shrink-0" /><p className="font-mono text-xs text-titan-lime">User created! Login + Profile + Team linked.</p></div>)}
              <div className="space-y-4">
                <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Full Name *</label><input type="text" value={addUserForm.display_name} onChange={(e) => setAddUserForm({ ...addUserForm, display_name: e.target.value })} placeholder="e.g. John Doe" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono placeholder:text-white/20 focus:border-titan-cyan/40 focus:outline-none transition-colors" disabled={addingUser} /></div>
                <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Email *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" /><input type="email" value={addUserForm.email} onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} placeholder="user@agency.com" className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono placeholder:text-white/20 focus:border-titan-cyan/40 focus:outline-none transition-colors" disabled={addingUser} /></div></div>
                <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Password</label><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" /><input type={showPassword ? 'text' : 'password'} value={addUserForm.password} onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} className="w-full pl-9 pr-10 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono placeholder:text-white/20 focus:border-titan-cyan/40 focus:outline-none transition-colors" disabled={addingUser} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">{showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Role *</label><select value={addUserForm.role} onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as CreateFullUserRole })} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none" disabled={addingUser}><option value="super_admin">Super Admin</option><option value="account_manager">Account Manager</option><option value="designer">Designer</option><option value="media_buyer">Media Buyer</option><option value="finance">Finance</option><option value="client">Client</option></select></div>
                  <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Phone</label><input type="tel" value={addUserForm.phone} onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })} placeholder="+880..." className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono placeholder:text-white/20 focus:border-titan-cyan/40 focus:outline-none" disabled={addingUser} /></div>
                </div>
                <div className="p-3 rounded-lg bg-titan-cyan/5 border border-titan-cyan/20"><p className="font-mono text-[10px] text-titan-cyan/70 leading-relaxed">ℹ️ Creates: Login (demo_users) + Profile (user_profiles) + Role + Team Member + Workspace access</p></div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => !addingUser && setShowAddUser(false)} className="px-4 py-2 rounded-lg border border-white/[0.08] font-mono text-xs text-white/50 hover:text-white/70 transition-all" disabled={addingUser}>Cancel</button>
                <button onClick={handleAddUser} disabled={addingUser || !addUserForm.display_name.trim() || !addUserForm.email.trim()} className={cn('flex items-center gap-2 px-5 py-2 rounded-lg font-mono text-xs font-bold transition-all', addingUser || !addUserForm.display_name.trim() || !addUserForm.email.trim() ? 'bg-white/[0.04] text-white/20 cursor-not-allowed' : 'bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan hover:bg-titan-cyan/25')}>{addingUser ? <><Loader2 className="w-3 h-3 animate-spin" />Creating...</> : <><UserPlus className="w-3 h-3" />Create User</>}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !editingUser && setEditUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md mx-4 p-6 rounded-2xl bg-[#0D1230] border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between mb-5"><h3 className="font-display font-extrabold text-lg text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-titan-purple" />Edit User</h3><button onClick={() => !editingUser && setEditUser(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button></div>
              {editError && (<div className="mb-4 p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/30 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-titan-magenta shrink-0" /><p className="font-mono text-xs text-titan-magenta">{editError}</p></div>)}
              <div className="space-y-4">
                <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Display Name</label><input type="text" value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none" disabled={editingUser} /></div>
                <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-titan-cyan/40 focus:outline-none" disabled={editingUser} /></div>
                <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Phone</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Optional" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono placeholder:text-white/20 focus:border-titan-cyan/40 focus:outline-none" disabled={editingUser} /></div>
                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"><p className="font-mono text-[10px] text-white/30">Changes sync across demo_users, user_profiles, and team_members.</p></div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => !editingUser && setEditUser(null)} className="px-4 py-2 rounded-lg border border-white/[0.08] font-mono text-xs text-white/50 transition-all" disabled={editingUser}>Cancel</button>
                <button onClick={handleEditUser} disabled={editingUser} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-titan-purple/15 border border-titan-purple/30 font-mono text-xs text-titan-purple hover:bg-titan-purple/25 transition-all">{editingUser ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}{editingUser ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {resetPwUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !resettingPw && setResetPwUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-[#0D1230] border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between mb-5"><h3 className="font-display font-bold text-base text-white flex items-center gap-2"><Key className="w-5 h-5 text-amber-400" />Reset Password</h3><button onClick={() => !resettingPw && setResetPwUser(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button></div>
              <p className="font-mono text-xs text-white/50 mb-4">Reset password for <strong className="text-white/80">{resetPwUser.display_name}</strong> ({resetPwUser.email})</p>
              <div><label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">New Password</label><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/90 font-mono focus:border-amber-400/40 focus:outline-none" disabled={resettingPw} /></div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => !resettingPw && setResetPwUser(null)} className="px-4 py-2 rounded-lg border border-white/[0.08] font-mono text-xs text-white/50 transition-all" disabled={resettingPw}>Cancel</button>
                <button onClick={handleResetPassword} disabled={resettingPw || !newPassword.trim()} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 font-mono text-xs text-amber-400 hover:bg-amber-500/25 transition-all">{resettingPw ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}{resettingPw ? 'Resetting...' : 'Reset Password'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !deletingUser && setDeleteConfirmUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-[#0D1230] border border-titan-magenta/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-titan-magenta/15 border border-titan-magenta/30 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-titan-magenta" /></div>
                <div><h3 className="font-display font-bold text-base text-white">Delete User</h3><p className="font-mono text-[10px] text-white/30">This action cannot be undone</p></div>
              </div>
              <div className="p-3 rounded-lg bg-titan-magenta/5 border border-titan-magenta/15 mb-4">
                <p className="font-mono text-xs text-white/70 mb-2">Delete <strong className="text-titan-magenta">{deleteConfirmUser.display_name}</strong> permanently?</p>
                <p className="font-mono text-[10px] text-white/40 leading-relaxed">Removes: login, profile, roles, team member, workspace memberships.</p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => !deletingUser && setDeleteConfirmUser(null)} className="px-4 py-2 rounded-lg border border-white/[0.08] font-mono text-xs text-white/50 transition-all" disabled={deletingUser}>Cancel</button>
                <button onClick={handleDeleteUser} disabled={deletingUser} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-titan-magenta/15 border border-titan-magenta/30 font-mono text-xs text-titan-magenta hover:bg-titan-magenta/25 transition-all">{deletingUser ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}{deletingUser ? 'Deleting...' : 'Delete Permanently'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ToggleSetting({
  label,
  description,
  enabled,
  onToggle,
  danger,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <div>
        <p className={cn('font-mono text-xs', danger ? 'text-titan-magenta/80' : 'text-white/70')}>{label}</p>
        {description && <p className="font-mono text-[10px] text-white/30">{description}</p>}
      </div>
      <button onClick={onToggle} className="transition-all duration-200">
        {enabled ? (
          <ToggleRight className={cn('w-7 h-7', danger ? 'text-titan-magenta' : 'text-titan-cyan')} />
        ) : (
          <ToggleLeft className="w-7 h-7 text-white/20" />
        )}
      </button>
    </div>
  );
}
