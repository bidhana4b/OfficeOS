import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  getClientSubUsers,
  createClientSubUser,
  updateClientSubUser,
  removeClientSubUser,
  resendSubUserInvite,
  getClientActivityLog,
  type ClientSubUser,
} from '@/lib/data-service';
import {
  Users,
  ArrowLeft,
  UserPlus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  Eye,
  Stamp,
  CreditCard,
  Crown,
  MoreVertical,
  Send,
  UserMinus,
  Clock,
  Activity,
  Search,
  RefreshCw,
  Grid3X3,
  Check,
  XCircle,
  Lock,
  MessageSquare,
  FileText,
  BarChart3,
  ClipboardCheck,
  Wallet,
} from 'lucide-react';

const ROLE_CONFIG = {
  viewer: {
    label: 'Viewer',
    description: 'Can view tasks and send messages',
    icon: Eye,
    color: '#00D9FF',
    bgColor: 'rgba(0,217,255,0.1)',
    borderColor: 'rgba(0,217,255,0.2)',
  },
  approver: {
    label: 'Approver',
    description: 'Can approve deliverables and request tasks',
    icon: Stamp,
    color: '#39FF14',
    bgColor: 'rgba(57,255,20,0.1)',
    borderColor: 'rgba(57,255,20,0.2)',
  },
  billing_manager: {
    label: 'Billing Manager',
    description: 'Can manage billing and view analytics',
    icon: CreditCard,
    color: '#FFB800',
    bgColor: 'rgba(255,184,0,0.1)',
    borderColor: 'rgba(255,184,0,0.2)',
  },
  admin: {
    label: 'Admin',
    description: 'Full access to all features',
    icon: Crown,
    color: '#7B61FF',
    bgColor: 'rgba(123,97,255,0.1)',
    borderColor: 'rgba(123,97,255,0.2)',
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: '#39FF14', bgColor: 'rgba(57,255,20,0.1)' },
  inactive: { label: 'Inactive', color: '#FF006E', bgColor: 'rgba(255,0,110,0.1)' },
  invited: { label: 'Invited', color: '#FFB800', bgColor: 'rgba(255,184,0,0.1)' },
};

const PERMISSION_DEFINITIONS = [
  { key: 'can_view_tasks', label: 'View Tasks', icon: FileText, description: 'View deliverables and task status' },
  { key: 'can_approve_deliverables', label: 'Approve Deliverables', icon: ClipboardCheck, description: 'Approve or reject completed work' },
  { key: 'can_manage_billing', label: 'Manage Billing', icon: Wallet, description: 'View invoices, manage payments' },
  { key: 'can_send_messages', label: 'Send Messages', icon: MessageSquare, description: 'Chat with agency team' },
  { key: 'can_request_deliverables', label: 'Request Deliverables', icon: FileText, description: 'Submit new work requests' },
  { key: 'can_view_analytics', label: 'View Analytics', icon: BarChart3, description: 'Access performance reports' },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  viewer: { can_view_tasks: true, can_approve_deliverables: false, can_manage_billing: false, can_send_messages: true, can_request_deliverables: false, can_view_analytics: false },
  approver: { can_view_tasks: true, can_approve_deliverables: true, can_manage_billing: false, can_send_messages: true, can_request_deliverables: true, can_view_analytics: true },
  billing_manager: { can_view_tasks: true, can_approve_deliverables: false, can_manage_billing: true, can_send_messages: true, can_request_deliverables: false, can_view_analytics: true },
  admin: { can_view_tasks: true, can_approve_deliverables: true, can_manage_billing: true, can_send_messages: true, can_request_deliverables: true, can_view_analytics: true },
};

interface InviteFormData {
  name: string;
  email: string;
  phone: string;
  role: 'viewer' | 'approver' | 'billing_manager' | 'admin';
}

export default function ClientTeamManagement({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [subUsers, setSubUsers] = useState<ClientSubUser[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [activeView, setActiveView] = useState<'members' | 'permissions' | 'activity'>('members');
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, boolean>>({});
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<InviteFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'viewer',
  });

  const clientId = user?.client_id;

  const fetchData = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      const [users, logs] = await Promise.all([
        getClientSubUsers(clientId),
        getClientActivityLog(clientId, 30),
      ]);
      setSubUsers(users);
      setActivityLog(logs);
    } catch (e) {
      console.error('Failed to fetch sub-users:', e);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async () => {
    if (!clientId) return;
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    // Check for duplicate emails
    if (subUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError('This email is already invited');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createClientSubUser({
        client_id: clientId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        invited_by: user?.id,
      });
      setSuccess(`Invitation sent to ${formData.name}`);
      setFormData({ name: '', email: '', phone: '', role: 'viewer' });
      setShowInviteForm(false);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (subUser: ClientSubUser, newRole: ClientSubUser['role']) => {
    try {
      await updateClientSubUser(subUser.id, { role: newRole });
      setSuccess(`${subUser.name}'s role updated to ${ROLE_CONFIG[newRole].label}`);
      setActionMenu(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to update role');
    }
  };

  const handleToggleStatus = async (subUser: ClientSubUser) => {
    const newStatus = subUser.status === 'active' ? 'inactive' : 'active';
    try {
      await updateClientSubUser(subUser.id, { status: newStatus });
      setSuccess(`${subUser.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      setActionMenu(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to update status');
    }
  };

  const handleRemove = async (subUser: ClientSubUser) => {
    if (!clientId) return;
    try {
      await removeClientSubUser(subUser.id, clientId);
      setSuccess(`${subUser.name} has been removed`);
      setActionMenu(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to remove member');
    }
  };

  const handleResendInvite = async (subUser: ClientSubUser) => {
    if (!clientId) return;
    try {
      await resendSubUserInvite(subUser.id, clientId);
      setSuccess(`Invitation resent to ${subUser.name}`);
      setActionMenu(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to resend invitation');
    }
  };

  const startEditPermissions = (subUser: ClientSubUser) => {
    setEditingPermissions(subUser.id);
    setTempPermissions(subUser.permissions || DEFAULT_PERMISSIONS[subUser.role] || {});
  };

  const handleSavePermissions = async (subUser: ClientSubUser) => {
    try {
      await updateClientSubUser(subUser.id, { permissions: tempPermissions });
      setSuccess(`${subUser.name}'s permissions updated`);
      setEditingPermissions(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to update permissions');
    }
  };

  const filteredUsers = subUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
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
            <Users className="w-5 h-5 text-titan-cyan" />
            Team Members
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">
            {subUsers.filter(u => u.status === 'active').length} active • {subUsers.filter(u => u.status === 'invited').length} pending
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setShowInviteForm(true)}
          className="h-8 px-3 rounded-full bg-titan-cyan/15 border border-titan-cyan/30 flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <UserPlus className="w-3.5 h-3.5 text-titan-cyan" />
          <span className="font-mono text-[10px] text-titan-cyan font-bold">Invite</span>
        </button>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-titan-magenta/10 border border-titan-magenta/20"
          >
            <AlertCircle className="w-4 h-4 text-titan-magenta shrink-0" />
            <span className="font-mono text-[11px] text-titan-magenta flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0"><X className="w-3 h-3 text-titan-magenta/50" /></button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-titan-lime/10 border border-titan-lime/20"
          >
            <CheckCircle2 className="w-4 h-4 text-titan-lime shrink-0" />
            <span className="font-mono text-[11px] text-titan-lime">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switcher */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { id: 'members' as const, label: 'Members', icon: Users },
          { id: 'permissions' as const, label: 'Permissions', icon: Shield },
          { id: 'activity' as const, label: 'Activity', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
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
        {activeView === 'members' ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-titan-cyan/30"
              />
            </div>

            {/* Role Legend */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                <div
                  key={key}
                  className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
                  <span className="font-mono text-[8px]" style={{ color: config.color }}>{config.label}</span>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-white/15" />
                </div>
                <p className="font-display font-semibold text-sm text-white/40">
                  {searchQuery ? 'No matching members' : 'No team members yet'}
                </p>
                <p className="font-mono text-[10px] text-white/20 mt-1">
                  {searchQuery ? 'Try a different search' : 'Invite team members to collaborate'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-mono text-[11px] text-titan-cyan font-bold flex items-center gap-2 active:scale-95 transition-transform"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Your First Member
                  </button>
                )}
              </motion.div>
            ) : (
              filteredUsers.map((subUser, i) => {
                const roleConfig = ROLE_CONFIG[subUser.role];
                const statusConfig = STATUS_CONFIG[subUser.status] || STATUS_CONFIG.active;
                const RoleIcon = roleConfig.icon;

                return (
                  <motion.div
                    key={subUser.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-3 relative"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: roleConfig.bgColor, border: `1px solid ${roleConfig.borderColor}` }}
                      >
                        <span className="font-display font-bold text-xs" style={{ color: roleConfig.color }}>
                          {subUser.avatar || subUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display font-semibold text-xs text-white truncate">{subUser.name}</p>
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                            style={{ background: statusConfig.bgColor }}
                          >
                            <div className="w-1 h-1 rounded-full" style={{ background: statusConfig.color }} />
                            <span className="font-mono text-[7px]" style={{ color: statusConfig.color }}>
                              {statusConfig.label}
                            </span>
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-white/30 truncate mt-0.5">{subUser.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                            style={{ background: roleConfig.bgColor }}
                          >
                            <RoleIcon className="w-2.5 h-2.5" style={{ color: roleConfig.color }} />
                            <span className="font-mono text-[8px] font-bold" style={{ color: roleConfig.color }}>
                              {roleConfig.label}
                            </span>
                          </div>
                          {subUser.last_active_at && (
                            <span className="font-mono text-[8px] text-white/20 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {getTimeAgo(subUser.last_active_at)}
                            </span>
                          )}
                          {subUser.status === 'invited' && (
                            <span className="font-mono text-[8px] text-titan-yellow/50 flex items-center gap-0.5">
                              <Mail className="w-2.5 h-2.5" />
                              Invited {getTimeAgo(subUser.invited_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Menu */}
                      <button
                        onClick={() => setActionMenu(actionMenu === subUser.id ? null : subUser.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all shrink-0"
                      >
                        <MoreVertical className="w-4 h-4 text-white/30" />
                      </button>
                    </div>

                    {/* Action Dropdown */}
                    <AnimatePresence>
                      {actionMenu === subUser.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          className="absolute right-3 top-12 z-50 w-48 glass-card p-1.5 shadow-xl"
                        >
                          {/* Role Change */}
                          <p className="font-mono text-[8px] text-white/20 uppercase tracking-wider px-2 py-1">Change Role</p>
                          {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                            const Icon = config.icon;
                            const isActive = subUser.role === key;
                            return (
                              <button
                                key={key}
                                onClick={() => handleUpdateRole(subUser, key as ClientSubUser['role'])}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                                  isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                                <span className="font-mono text-[10px] text-white/60">{config.label}</span>
                                {isActive && <CheckCircle2 className="w-3 h-3 text-titan-lime ml-auto" />}
                              </button>
                            );
                          })}

                          <div className="h-px bg-white/[0.06] my-1" />

                          {/* Status Toggle */}
                          <button
                            onClick={() => handleToggleStatus(subUser)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] text-left"
                          >
                            <Shield className="w-3.5 h-3.5 text-white/40" />
                            <span className="font-mono text-[10px] text-white/60">
                              {subUser.status === 'active' ? 'Deactivate' : 'Activate'}
                            </span>
                          </button>

                          {/* Resend Invite */}
                          {subUser.status === 'invited' && (
                            <button
                              onClick={() => handleResendInvite(subUser)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] text-left"
                            >
                              <Send className="w-3.5 h-3.5 text-titan-cyan/60" />
                              <span className="font-mono text-[10px] text-titan-cyan/60">Resend Invite</span>
                            </button>
                          )}

                          <div className="h-px bg-white/[0.06] my-1" />

                          {/* Remove */}
                          <button
                            onClick={() => handleRemove(subUser)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-titan-magenta/5 text-left"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-titan-magenta/70" />
                            <span className="font-mono text-[10px] text-titan-magenta/70">Remove Member</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Permissions Row */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {subUser.permissions && Object.entries(subUser.permissions).map(([key, value]) => {
                        if (!value) return null;
                        const label = key.replace('can_', '').replace(/_/g, ' ');
                        return (
                          <span
                            key={key}
                            className="inline-flex px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] font-mono text-[7px] text-white/25 capitalize"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        ) : activeView === 'permissions' ? (
          /* Permission Matrix View */
          <div className="space-y-4">
            {/* Role-Permission Matrix */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-titan-cyan" />
                <span className="font-display font-bold text-xs text-white">Role → Permission Matrix</span>
              </div>
              
              {/* Matrix Header */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left px-3 py-2 font-mono text-[9px] text-white/30 uppercase tracking-wider min-w-[120px]">Permission</th>
                      {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                        <th key={key} className="text-center px-2 py-2 min-w-[70px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: config.bgColor }}>
                              {(() => { const Icon = config.icon; return <Icon className="w-3 h-3" style={{ color: config.color }} />; })()}
                            </div>
                            <span className="font-mono text-[8px] font-bold" style={{ color: config.color }}>{config.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_DEFINITIONS.map((perm, i) => {
                      const PermIcon = perm.icon;
                      return (
                        <tr key={perm.key} className={i % 2 === 0 ? 'bg-white/[0.01]' : ''}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <PermIcon className="w-3 h-3 text-white/25 shrink-0" />
                              <div>
                                <span className="font-mono text-[10px] text-white/60 block">{perm.label}</span>
                                <span className="font-mono text-[7px] text-white/20 block">{perm.description}</span>
                              </div>
                            </div>
                          </td>
                          {Object.keys(ROLE_CONFIG).map((role) => {
                            const hasPermission = DEFAULT_PERMISSIONS[role]?.[perm.key];
                            return (
                              <td key={role} className="text-center px-2 py-2.5">
                                {hasPermission ? (
                                  <div className="w-5 h-5 rounded-full bg-titan-lime/15 border border-titan-lime/30 flex items-center justify-center mx-auto">
                                    <Check className="w-3 h-3 text-titan-lime" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto">
                                    <X className="w-2.5 h-2.5 text-white/15" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-User Custom Permissions */}
            {subUsers.filter(u => u.status !== 'removed').length > 0 && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#7B61FF]" />
                  <span className="font-display font-bold text-xs text-white">Custom Permissions per Member</span>
                  <span className="font-mono text-[8px] text-white/20 ml-auto">Toggle to override defaults</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {subUsers.filter(u => u.status !== 'removed').map((subUser) => {
                    const roleConfig = ROLE_CONFIG[subUser.role as keyof typeof ROLE_CONFIG];
                    const RoleIcon = roleConfig?.icon || Eye;
                    const isEditing = editingPermissions === subUser.id;
                    const currentPermissions = isEditing ? tempPermissions : (subUser.permissions || DEFAULT_PERMISSIONS[subUser.role] || {});

                    return (
                      <div key={subUser.id} className="px-3 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: roleConfig?.bgColor || 'rgba(255,255,255,0.05)' }}>
                            <RoleIcon className="w-3.5 h-3.5" style={{ color: roleConfig?.color || '#fff' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-display font-semibold text-[11px] text-white block truncate">{subUser.name}</span>
                            <span className="font-mono text-[8px] block" style={{ color: roleConfig?.color || '#fff' }}>{roleConfig?.label || subUser.role}</span>
                          </div>
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSavePermissions(subUser)}
                                className="h-6 px-2 rounded-lg bg-[rgba(57,255,20,0.15)] border border-[rgba(57,255,20,0.3)] font-mono text-[9px] text-[#39FF14] flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                <Check className="w-3 h-3" /> Save
                              </button>
                              <button
                                onClick={() => setEditingPermissions(null)}
                                className="h-6 px-2 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[9px] text-white/40 flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                <X className="w-3 h-3" /> Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditPermissions(subUser)}
                              className="h-6 px-2 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[9px] text-white/30 flex items-center gap-1 hover:text-white/60 active:scale-95 transition-all"
                            >
                              <Shield className="w-3 h-3" /> Edit
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {PERMISSION_DEFINITIONS.map((perm) => {
                            const isEnabled = currentPermissions[perm.key] ?? false;
                            const PermIcon = perm.icon;
                            return (
                              <button
                                key={perm.key}
                                disabled={!isEditing}
                                onClick={() => {
                                  if (isEditing) {
                                    setTempPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }));
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${
                                  isEditing ? 'cursor-pointer hover:bg-white/[0.03] active:scale-95' : 'cursor-default'
                                }`}
                                style={{
                                  background: isEnabled ? 'rgba(57,255,20,0.05)' : 'transparent',
                                  borderColor: isEnabled ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.04)',
                                }}
                              >
                                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                  isEnabled ? 'bg-[rgba(57,255,20,0.2)] border-[rgba(57,255,20,0.4)]' : 'bg-white/[0.02] border-white/[0.1]'
                                }`}>
                                  {isEnabled && <Check className="w-2.5 h-2.5 text-[#39FF14]" />}
                                </div>
                                <PermIcon className={`w-3 h-3 shrink-0 ${isEnabled ? 'text-white/50' : 'text-white/15'}`} />
                                <span className={`font-mono text-[8px] truncate ${isEnabled ? 'text-white/50' : 'text-white/20'}`}>
                                  {perm.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {subUsers.filter(u => u.status !== 'removed').length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="w-8 h-8 text-white/15 mb-3" />
                <p className="font-display font-semibold text-sm text-white/30">No team members yet</p>
                <p className="font-mono text-[10px] text-white/15 mt-1">Invite members to customize their permissions</p>
              </div>
            )}
          </div>
        ) : (
          /* Activity Log View */
          <div className="space-y-2">
            {activityLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-8 h-8 text-white/15 mb-3" />
                <p className="font-display font-semibold text-sm text-white/30">No activity yet</p>
                <p className="font-mono text-[10px] text-white/15 mt-1">Activity will appear here as team members take actions</p>
              </div>
            ) : (
              activityLog.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="w-8 h-8 rounded-full glass-card flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-white/25" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] text-white/60">{log.description || log.action}</p>
                    <p className="font-mono text-[8px] text-white/20 mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowInviteForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-titan-bg border-t border-white/10 rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-titan-cyan" />
                  <h2 className="font-display font-bold text-base text-white">Invite Team Member</h2>
                </div>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Full Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Ariful Islam"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="team@company.com"
                    className="w-full pl-9 pr-3 bg-white/5 border border-white/10 rounded-xl py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1.5">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+880 1XXX XXXXXX"
                    className="w-full pl-9 pr-3 bg-white/5 border border-white/10 rounded-xl py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-2">Select Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = formData.role === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setFormData((prev) => ({ ...prev, role: key as InviteFormData['role'] }))}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95"
                        style={{
                          background: isActive ? config.bgColor : 'transparent',
                          borderColor: isActive ? config.borderColor : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: isActive ? config.color : 'rgba(255,255,255,0.3)' }} />
                        <span
                          className="font-display font-semibold text-[10px]"
                          style={{ color: isActive ? config.color : 'rgba(255,255,255,0.3)' }}
                        >
                          {config.label}
                        </span>
                        <span
                          className="font-mono text-[7px] text-center px-2 leading-tight"
                          style={{ color: isActive ? `${config.color}99` : 'rgba(255,255,255,0.15)' }}
                        >
                          {config.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permission Preview */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-white/30" />
                  <span className="font-mono text-[9px] text-white/30 uppercase tracking-wider">
                    {ROLE_CONFIG[formData.role]?.label} Permissions
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {PERMISSION_DEFINITIONS.map((perm) => {
                    const isEnabled = DEFAULT_PERMISSIONS[formData.role]?.[perm.key] ?? false;
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center gap-1.5 py-1"
                      >
                        {isEnabled ? (
                          <Check className="w-3 h-3 text-[#39FF14] shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-white/10 shrink-0" />
                        )}
                        <span className={`font-mono text-[8px] ${isEnabled ? 'text-white/50' : 'text-white/15'}`}>
                          {perm.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="font-mono text-[7px] text-white/15 mt-2">
                  Permissions can be customized after invitation
                </p>
              </div>

              {/* Send Button */}
              <button
                onClick={handleInvite}
                disabled={saving || !formData.name.trim() || !formData.email.trim()}
                className="w-full py-3 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Invitation
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
