import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  UserPlus,
  Copy,
  Trash2,
  Check,
  X,
  Key,
  Clock,
  Monitor,
  Lock,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Save,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { roles as mockRoles, users as mockUsers } from './mock-data';
import type { Role, UserAccount } from './types';
import { useRoles, useUserProfiles } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function UsersRolesControl() {
  const rolesQuery = useRoles();
  const usersQuery = useUserProfiles();

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
    : mockRoles;

  const userList: UserAccount[] = usersQuery.data.length > 0
    ? usersQuery.data.map((u: Record<string, unknown>) => {
        const userRoles = (u.user_roles as Record<string, unknown>[]) || [];
        const roleName = userRoles.length > 0
          ? ((userRoles[0].role as Record<string, unknown>)?.name as string) || 'User'
          : 'User';
        return {
          id: u.id as string,
          fullName: (u.full_name as string) || '',
          email: (u.email as string) || '',
          avatar: (u.avatar as string) || '',
          role: roleName,
          status: (u.status as UserAccount['status']) || 'active',
          twoFactorEnabled: (u.two_factor_enabled as boolean) || false,
          ipRestricted: (u.ip_restricted as boolean) || false,
        };
      })
    : mockUsers;

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [multiRoleEnabled, setMultiRoleEnabled] = useState(false);
  const [defaultRole, setDefaultRole] = useState('Account Manager');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const selectedRoleData = roleList.find((r) => r.id === selectedRole);

  const handleSaveRoleSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'users_roles',
          config: {
            multiRoleEnabled,
            defaultRole,
          },
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

  const handleUpdateUserStatus = async (userId: string, newStatus: UserAccount['status']) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    } catch (err) {
      console.error('Update error:', err);
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

      {/* User Control */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-titan-cyan/60" />
          User Control
        </h3>
        <div className="space-y-2">
          {userList.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold',
                  user.status === 'active' ? 'bg-titan-cyan/15 text-titan-cyan border border-titan-cyan/30' :
                  user.status === 'suspended' ? 'bg-titan-magenta/15 text-titan-magenta border border-titan-magenta/30' :
                  'bg-white/[0.06] text-white/30 border border-white/10'
                )}>
                  {user.avatar}
                </div>
                <div>
                  <p className="font-mono text-xs text-white/80">{user.name}</p>
                  <p className="font-mono text-[10px] text-white/30">{user.email} · {user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-white/20" />
                  <span className="font-mono text-[10px] text-white/30">{user.lastLogin}</span>
                </div>
                <div className="flex items-center gap-1">
                  {user.twoFactorEnabled && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-titan-lime/10 text-titan-lime/70 border border-titan-lime/20">
                      2FA
                    </span>
                  )}
                  {user.ipRestricted && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-titan-magenta/10 text-titan-magenta/70 border border-titan-magenta/20">
                      IP
                    </span>
                  )}
                </div>
                <div className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-mono',
                  user.status === 'active' ? 'bg-titan-lime/10 text-titan-lime' :
                  user.status === 'suspended' ? 'bg-titan-magenta/10 text-titan-magenta' :
                  'bg-white/[0.06] text-white/40'
                )}>
                  {user.status}
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors" title="Force password reset">
                    <Key className="w-3 h-3" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors" title="Toggle 2FA">
                    <Smartphone className="w-3 h-3" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors" title="Restrict IP">
                    <Lock className="w-3 h-3" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-titan-magenta/10 text-white/30 hover:text-titan-magenta transition-colors" title="Kill session">
                    <AlertTriangle className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
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
