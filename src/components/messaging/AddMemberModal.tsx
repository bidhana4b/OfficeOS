import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Search, Trash2, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getChannelMembers,
  addChannelMember,
  removeChannelMember,
  getAvailableMembersForChannel,
} from '@/lib/data-service';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  workspaceId: string;
  currentUserId: string;
  onMembersUpdated: () => void;
}

export default function AddMemberModal({
  open,
  onClose,
  channelId,
  workspaceId,
  currentUserId,
  onMembersUpdated,
}: AddMemberModalProps) {
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [currentMembers, setCurrentMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'add' | 'manage'>('add');

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, channelId, workspaceId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // Load available members
      const available = await getAvailableMembersForChannel(workspaceId, channelId);
      setAvailableMembers(available);

      // Load current members
      const current = await getChannelMembers(channelId);
      setCurrentMembers(current);
    } catch (err) {
      console.error('Failed to load members:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) return;

    setLoading(true);
    setError('');

    try {
      await Promise.all(
        selectedMembers.map(userId =>
          addChannelMember(channelId, userId, currentUserId, 'member')
        )
      );

      onMembersUpdated();
      setSelectedMembers([]);
      await loadMembers(); // Reload to update lists
    } catch (err: any) {
      setError(err.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the channel?')) return;

    try {
      await removeChannelMember(channelId, userId);
      onMembersUpdated();
      await loadMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredAvailable = availableMembers.filter(m =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCurrent = currentMembers.filter(m =>
    m.user_profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClose = () => {
    setSelectedMembers([]);
    setSearchQuery('');
    setError('');
    setView('add');
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-gradient-to-br from-[#0A0E27] to-[#1A1D2E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg text-white">Channel Members</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setView('add')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  view === 'add'
                    ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20'
                    : 'text-white/60 hover:text-white/80'
                )}
              >
                Add Members
              </button>
              <button
                onClick={() => setView('manage')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  view === 'manage'
                    ? 'bg-titan-cyan/10 text-titan-cyan border border-titan-cyan/20'
                    : 'text-white/60 hover:text-white/80'
                )}
              >
                Manage ({currentMembers.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-10 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-titan-cyan/50 transition-colors text-sm"
              />
            </div>

            {/* Member List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="text-center py-12 text-white/40">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
                  Loading members...
                </div>
              ) : view === 'add' ? (
                // Add Members View
                <>
                  {filteredAvailable.length === 0 ? (
                    <div className="text-center py-12 text-white/40 text-sm">
                      {availableMembers.length === 0
                        ? 'All workspace members are already in this channel'
                        : 'No members found'}
                    </div>
                  ) : (
                    filteredAvailable.map((member) => (
                      <button
                        key={member.user_profile_id}
                        onClick={() => toggleMember(member.user_profile_id)}
                        className={cn(
                          'w-full px-3 py-2.5 rounded-lg border transition-all flex items-center gap-3',
                          selectedMembers.includes(member.user_profile_id)
                            ? 'bg-titan-cyan/10 border-titan-cyan/30'
                            : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-titan-cyan/30 to-titan-purple/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {member.avatar || member.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white">{member.name}</div>
                          <div className="text-xs text-white/50 capitalize">{member.role}</div>
                        </div>
                        {selectedMembers.includes(member.user_profile_id) && (
                          <div className="w-5 h-5 rounded-full bg-titan-cyan flex items-center justify-center">
                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </>
              ) : (
                // Manage Members View
                <>
                  {filteredCurrent.length === 0 ? (
                    <div className="text-center py-12 text-white/40 text-sm">
                      No members found
                    </div>
                  ) : (
                    filteredCurrent.map((member) => (
                      <div
                        key={member.id}
                        className="px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-titan-cyan/30 to-titan-purple/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {member.user_profiles?.avatar || member.user_profiles?.full_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {member.user_profiles?.full_name || 'Unknown'}
                            {member.role_in_channel === 'admin' && (
                              <Shield className="w-3.5 h-3.5 text-titan-cyan" />
                            )}
                          </div>
                          <div className="text-xs text-white/50 capitalize">{member.role_in_channel}</div>
                        </div>
                        {member.user_profile_id !== currentUserId && member.role_in_channel !== 'admin' && (
                          <button
                            onClick={() => handleRemoveMember(member.user_profile_id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Selected Count (Add view only) */}
            {view === 'add' && selectedMembers.length > 0 && (
              <div className="text-xs text-white/50">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Footer */}
          {view === 'add' && (
            <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={loading}
                className="border-white/[0.08] hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={loading || selectedMembers.length === 0}
                className="bg-gradient-to-r from-titan-cyan to-titan-purple hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
