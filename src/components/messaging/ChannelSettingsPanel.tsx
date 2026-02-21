import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Hash,
  Settings,
  Edit3,
  Bell,
  BellOff,
  Users,
  Trash2,
  Archive,
  Lock,
  Globe,
  Check,
  AlertTriangle,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Channel, Workspace, User } from './types';

interface ChannelSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  channel: Channel | null;
  workspace: Workspace;
  currentUserId: string;
  currentUserRole: User['role'];
  onChannelUpdated?: () => void;
}

export default function ChannelSettingsPanel({
  open,
  onClose,
  channel,
  workspace,
  currentUserId,
  currentUserRole,
  onChannelUpdated,
}: ChannelSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const isSystemChannel = channel?.type !== 'custom';

  useEffect(() => {
    if (channel && open) {
      setChannelName(channel.name || '');
      setDescription(channel.description || '');
      setIsPrivate(channel.isPrivate || false);
      setIsMuted(channel.isMuted || false);
      setActiveTab('general');
      setConfirmDelete(false);
      setConfirmArchive(false);
      setSaved(false);
      loadMembers();
    }
  }, [channel?.id, open]);

  const loadMembers = async () => {
    if (!channel) return;
    setLoadingMembers(true);
    try {
      // Try user_profile_id first (newer schema), fallback to user_id (older schema)
      const { data, error } = await supabase
        .from('channel_members')
        .select('*, user_profiles:user_profile_id(id, full_name, avatar, email, role)')
        .eq('channel_id', channel.id);

      if (error) throw error;

      // Map members — handle both schema variants
      const mappedMembers = (data || []).map((m: any) => {
        const profile = m.user_profiles;
        return {
          id: m.id,
          user_id: m.user_profile_id || m.user_id,
          user_name: profile?.full_name || m.user_name || m.name || 'Unknown',
          user_avatar: profile?.avatar || m.user_avatar || m.avatar || '',
          role: m.role_in_channel || profile?.role || m.role || m.user_role || 'member',
        };
      });

      setMembers(mappedMembers.length > 0 ? mappedMembers : []);

      // If no DB members found, fallback to workspace members display
      if (mappedMembers.length === 0) {
        setMembers(
          workspace.members.map((m) => ({
            id: m.id,
            user_id: m.id,
            user_name: m.name,
            user_avatar: m.avatar,
            role: m.role,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load channel members:', err);
      // Fallback to workspace members
      setMembers(
        workspace.members.map((m) => ({
          id: m.id,
          user_id: m.id,
          user_name: m.name,
          user_avatar: m.avatar,
          role: m.role,
        }))
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSave = async () => {
    if (!channel) return;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        name: channelName.trim(),
        description: description.trim(),
        is_private: isPrivate,
      };

      const { error } = await supabase
        .from('channels')
        .update(updateData)
        .eq('id', channel.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChannelUpdated?.();
    } catch (err) {
      console.error('Failed to update channel:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMute = async () => {
    if (!channel) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      // Try user_profile_id first (newer schema), then user_id (older schema)
      const { error: err1 } = await supabase
        .from('channel_members')
        .update({ is_muted: newMuted })
        .eq('channel_id', channel.id)
        .eq('user_profile_id', currentUserId);

      if (err1) {
        // Fallback to user_id column
        const { error: err2 } = await supabase
          .from('channel_members')
          .update({ is_muted: newMuted })
          .eq('channel_id', channel.id)
          .eq('user_id', currentUserId);

        if (err2) throw err2;
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      setIsMuted(!newMuted); // revert
    }
  };

  const handleArchive = async () => {
    if (!channel) return;
    try {
      const { error } = await supabase
        .from('channels')
        .update({ is_archived: true })
        .eq('id', channel.id);

      if (error) throw error;
      onChannelUpdated?.();
      onClose();
    } catch (err) {
      console.error('Failed to archive channel:', err);
    }
  };

  const handleDelete = async () => {
    if (!channel) return;
    try {
      // Delete messages first, then channel
      await supabase.from('messages').delete().eq('channel_id', channel.id);
      await supabase.from('channel_members').delete().eq('channel_id', channel.id);
      const { error } = await supabase.from('channels').delete().eq('id', channel.id);

      if (error) throw error;
      onChannelUpdated?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!channel) return;
    try {
      // Try user_profile_id first (newer schema), then user_id (older schema)
      const { error: err1 } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)
        .eq('user_profile_id', memberId);

      if (err1) {
        const { error: err2 } = await supabase
          .from('channel_members')
          .delete()
          .eq('channel_id', channel.id)
          .eq('user_id', memberId);

        if (err2) throw err2;
      }

      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
      onChannelUpdated?.();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  if (!open || !channel) return null;

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'members' as const, label: 'Members', icon: Users },
    ...(isAdmin ? [{ id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle }] : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-4 glass-card border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-titan-cyan/10 flex items-center justify-center border border-titan-cyan/20">
                  <Hash className="w-4 h-4 text-titan-cyan" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm text-white">Channel Settings</h2>
                  <p className="font-mono-data text-[10px] text-white/30">#{channel.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-white/[0.06]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono-data text-[11px] transition-all',
                      activeTab === tab.id
                        ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  {/* Channel Name */}
                  <div>
                    <label className="font-mono-data text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      disabled={isSystemChannel && !isAdmin}
                      placeholder="channel-name"
                      className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 focus:bg-white/[0.06] transition-all disabled:opacity-50"
                    />
                    {isSystemChannel && (
                      <p className="font-mono-data text-[9px] text-yellow-400/60 mt-1">
                        ⚠ System channels have limited editing
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="font-mono-data text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's this channel about?"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono-data text-xs focus:outline-none focus:border-titan-cyan/30 focus:bg-white/[0.06] transition-all resize-none"
                    />
                  </div>

                  {/* Privacy Toggle */}
                  <div className="flex items-center justify-between px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      {isPrivate ? (
                        <Lock className="w-3.5 h-3.5 text-yellow-400" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-titan-lime" />
                      )}
                      <div>
                        <p className="font-mono-data text-[11px] text-white/60">
                          {isPrivate ? 'Private Channel' : 'Public Channel'}
                        </p>
                        <p className="font-mono-data text-[9px] text-white/30">
                          {isPrivate
                            ? 'Only invited members can see this channel'
                            : 'Anyone in the workspace can see this channel'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPrivate(!isPrivate)}
                      disabled={isSystemChannel}
                      className={cn(
                        'w-10 h-5 rounded-full transition-all relative',
                        isPrivate ? 'bg-yellow-400/30' : 'bg-white/[0.1]',
                        isSystemChannel && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full absolute top-0.5 transition-all',
                          isPrivate ? 'right-0.5 bg-yellow-400' : 'left-0.5 bg-white/40'
                        )}
                      />
                    </button>
                  </div>

                  {/* Notification Toggle */}
                  <div className="flex items-center justify-between px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      {isMuted ? (
                        <BellOff className="w-3.5 h-3.5 text-white/30" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-titan-cyan" />
                      )}
                      <div>
                        <p className="font-mono-data text-[11px] text-white/60">
                          {isMuted ? 'Notifications Muted' : 'Notifications Active'}
                        </p>
                        <p className="font-mono-data text-[9px] text-white/30">
                          {isMuted
                            ? "You won't receive notifications from this channel"
                            : 'You will receive notifications for new messages'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleMute}
                      className={cn(
                        'w-10 h-5 rounded-full transition-all relative',
                        !isMuted ? 'bg-titan-cyan/30' : 'bg-white/[0.1]'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full absolute top-0.5 transition-all',
                          !isMuted ? 'right-0.5 bg-titan-cyan' : 'left-0.5 bg-white/40'
                        )}
                      />
                    </button>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving || !channelName.trim()}
                    className={cn(
                      'w-full py-2.5 rounded-lg font-mono-data text-xs font-semibold transition-all flex items-center justify-center gap-2',
                      saved
                        ? 'bg-titan-lime/20 text-titan-lime border border-titan-lime/20'
                        : 'bg-titan-cyan/20 text-titan-cyan border border-titan-cyan/20 hover:bg-titan-cyan/30',
                      (saving || !channelName.trim()) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
                    ) : saved ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Saved!
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono-data text-[10px] text-white/30">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="font-mono-data text-[10px] text-white/20">No members found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {members.map((member) => (
                        <div
                          key={member.user_id || member.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all group"
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold',
                              member.role === 'client'
                                ? 'bg-titan-purple/20 text-titan-purple'
                                : 'bg-titan-cyan/20 text-titan-cyan'
                            )}
                          >
                            {member.user_avatar ||
                              (member.user_name || 'U')
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono-data text-[11px] text-white/60 truncate">
                              {member.user_name || 'Unknown'}
                            </p>
                            <p className="font-mono-data text-[9px] text-white/20 capitalize">
                              {member.role || 'member'}
                            </p>
                          </div>
                          {isAdmin && member.user_id !== currentUserId && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="p-1.5 rounded-md hover:bg-red-500/10 text-white/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                              title="Remove member"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && isAdmin && (
                <div className="space-y-4">
                  {/* Archive Channel */}
                  <div className="px-4 py-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.03]">
                    <div className="flex items-start gap-3">
                      <Archive className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-xs text-yellow-400">
                          Archive Channel
                        </h4>
                        <p className="font-mono-data text-[10px] text-white/30 mt-1 leading-relaxed">
                          Archive this channel. It will be hidden from the channel list but can be restored later.
                          All messages will be preserved.
                        </p>
                        {!confirmArchive ? (
                          <button
                            onClick={() => setConfirmArchive(true)}
                            disabled={isSystemChannel}
                            className={cn(
                              'mt-3 px-4 py-2 rounded-lg font-mono-data text-[10px] font-semibold transition-all',
                              'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20',
                              isSystemChannel && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            Archive Channel
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={handleArchive}
                              className="px-4 py-2 rounded-lg font-mono-data text-[10px] font-semibold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/30 transition-all"
                            >
                              Confirm Archive
                            </button>
                            <button
                              onClick={() => setConfirmArchive(false)}
                              className="px-4 py-2 rounded-lg font-mono-data text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Channel */}
                  <div className="px-4 py-4 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
                    <div className="flex items-start gap-3">
                      <Trash2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-xs text-red-400">
                          Delete Channel
                        </h4>
                        <p className="font-mono-data text-[10px] text-white/30 mt-1 leading-relaxed">
                          Permanently delete this channel and all its messages. This action cannot be undone.
                        </p>
                        {!confirmDelete ? (
                          <button
                            onClick={() => setConfirmDelete(true)}
                            disabled={isSystemChannel}
                            className={cn(
                              'mt-3 px-4 py-2 rounded-lg font-mono-data text-[10px] font-semibold transition-all',
                              'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
                              isSystemChannel && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            Delete Channel
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={handleDelete}
                              className="px-4 py-2 rounded-lg font-mono-data text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(false)}
                              className="px-4 py-2 rounded-lg font-mono-data text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
