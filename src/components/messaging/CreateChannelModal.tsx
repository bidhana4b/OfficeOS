import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Lock, Users, UserPlus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createChannel, getAvailableMembersForChannel } from '@/lib/data-service';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUserId: string;
  onChannelCreated: () => void;
}

export default function CreateChannelModal({
  open,
  onClose,
  workspaceId,
  currentUserId,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'open' | 'closed'>('open');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && channelType === 'closed') {
      loadAvailableMembers();
    }
  }, [open, channelType, workspaceId]);

  const loadAvailableMembers = async () => {
    try {
      // For new channel, pass empty string as channelId
      const { data: workspaceMembers } = await window.supabase
        .from('workspace_members')
        .select('user_profile_id, name, avatar, role')
        .eq('workspace_id', workspaceId);

      setAvailableMembers(workspaceMembers || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleCreate = async () => {
    if (!channelName.trim()) {
      setError('Channel name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createChannel({
        workspace_id: workspaceId,
        name: channelName.trim(),
        channel_type: channelType,
        description: description.trim(),
        created_by_id: currentUserId,
        member_ids: channelType === 'closed' ? selectedMembers : undefined,
      });

      onChannelCreated();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChannelName('');
    setChannelType('open');
    setDescription('');
    setSelectedMembers([]);
    setSearchQuery('');
    setError('');
    onClose();
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredMembers = availableMembers.filter(m =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-white">Create New Channel</h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Channel Name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Channel Name <span className="text-titan-cyan">*</span>
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. design-team"
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-titan-cyan/50 transition-colors"
              />
            </div>

            {/* Channel Type */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Channel Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setChannelType('open')}
                  className={cn(
                    'px-4 py-3 rounded-lg border transition-all flex items-center gap-3',
                    channelType === 'open'
                      ? 'bg-titan-cyan/10 border-titan-cyan/30 text-titan-cyan'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:border-white/[0.15]'
                  )}
                >
                  <Hash className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Open</div>
                    <div className="text-xs opacity-70">Everyone can join</div>
                  </div>
                </button>
                <button
                  onClick={() => setChannelType('closed')}
                  className={cn(
                    'px-4 py-3 rounded-lg border transition-all flex items-center gap-3',
                    channelType === 'closed'
                      ? 'bg-titan-magenta/10 border-titan-magenta/30 text-titan-magenta'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:border-white/[0.15]'
                  )}
                >
                  <Lock className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Closed</div>
                    <div className="text-xs opacity-70">Invite only</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel for?"
                rows={3}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-titan-cyan/50 transition-colors resize-none"
              />
            </div>

            {/* Member Selection (for Closed channels) */}
            {channelType === 'closed' && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Add Members
                </label>
                
                {/* Search */}
                <div className="relative mb-3">
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="text-center py-6 text-white/40 text-sm">
                      No members found
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <button
                        key={member.user_profile_id}
                        onClick={() => toggleMember(member.user_profile_id)}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border transition-all flex items-center gap-3',
                          selectedMembers.includes(member.user_profile_id)
                            ? 'bg-titan-cyan/10 border-titan-cyan/30'
                            : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-titan-cyan/30 to-titan-purple/30 flex items-center justify-center text-xs font-bold text-white shrink-0"
                        >
                          {member.avatar || member.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white">{member.name}</div>
                          <div className="text-xs text-white/50">{member.role}</div>
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
                </div>

                {selectedMembers.length > 0 && (
                  <div className="mt-2 text-xs text-white/50">
                    {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
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
              onClick={handleCreate}
              disabled={loading || !channelName.trim()}
              className="bg-gradient-to-r from-titan-cyan to-titan-purple hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Create Channel
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
