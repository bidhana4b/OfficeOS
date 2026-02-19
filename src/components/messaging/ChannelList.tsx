import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Hash,
  Package,
  Rocket,
  CreditCard,
  Lock,
  Plus,
  Settings,
  Users,
  ChevronLeft,
  UserPlus,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Channel, Workspace, User } from './types';
import CreateChannelModal from './CreateChannelModal';
import AddMemberModal from './AddMemberModal';
import QuickActionsManager from './QuickActionsManager';

interface ChannelListProps {
  workspace: Workspace;
  activeChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onBack: () => void;
  currentUserRole: User['role'];
  currentUserId: string;
  onChannelsUpdated?: () => void;
}

const channelIcons: Record<string, React.ElementType> = {
  hash: Hash,
  package: Package,
  rocket: Rocket,
  'credit-card': CreditCard,
  lock: Lock,
};

const channelColors: Record<string, string> = {
  general: 'text-titan-cyan',
  deliverables: 'text-titan-purple',
  'boost-requests': 'text-titan-magenta',
  billing: 'text-titan-lime',
  internal: 'text-yellow-400',
  custom: 'text-white/50',
};

export default function ChannelList({
  workspace,
  activeChannelId,
  onSelectChannel,
  onBack,
  currentUserRole,
  currentUserId,
  onChannelsUpdated,
}: ChannelListProps) {
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [selectedChannelForMembers, setSelectedChannelForMembers] = useState<string | null>(null);

  const visibleChannels = workspace.channels.filter((ch) => {
    // Internal channels only visible to non-client roles
    if (ch.type === 'internal' && currentUserRole === 'client') return false;
    return true;
  });

  const standardChannels = visibleChannels.filter((ch) => ch.type !== 'custom');
  const customChannels = visibleChannels.filter((ch) => ch.type === 'custom');

  const handleAddMembersClick = (channelId: string) => {
    setSelectedChannelForMembers(channelId);
    setAddMemberOpen(true);
  };

  const handleChannelCreated = () => {
    onChannelsUpdated?.();
  };

  const handleMembersUpdated = () => {
    onChannelsUpdated?.();
  };

  return (
    <div className="h-full flex flex-col bg-[#0D1029]/80 backdrop-blur-xl border-r border-white/[0.06] w-[220px]">
      {/* Workspace Header */}
      <div className="px-3 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="p-1 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm text-white truncate">
              {workspace.clientName}
            </h3>
          </div>
          <button 
            onClick={() => setQuickActionsOpen(true)}
            className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all"
            title="Quick Actions Manager"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Online Members */}
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {workspace.members.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-[#0D1029]',
                  member.status === 'online'
                    ? 'bg-titan-cyan/20 text-titan-cyan'
                    : 'bg-white/[0.08] text-white/40'
                )}
              >
                {member.avatar}
              </div>
            ))}
          </div>
          <span className="font-mono-data text-[9px] text-white/30">
            {workspace.members.filter((m) => m.status === 'online').length} online
          </span>
        </div>
      </div>

      {/* Package Usage Mini Bar */}
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono-data text-[9px] text-white/30">Package Usage</span>
          <span
            className={cn(
              'font-mono-data text-[9px] font-bold',
              workspace.packageUsage > 80
                ? 'text-titan-magenta'
                : workspace.packageUsage > 50
                  ? 'text-yellow-400'
                  : 'text-titan-lime'
            )}
          >
            {workspace.packageUsage}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${workspace.packageUsage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              workspace.packageUsage > 80
                ? 'bg-gradient-to-r from-titan-magenta/80 to-titan-magenta'
                : workspace.packageUsage > 50
                  ? 'bg-gradient-to-r from-yellow-400/80 to-yellow-400'
                  : 'bg-gradient-to-r from-titan-lime/80 to-titan-lime'
            )}
          />
        </div>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
        {/* Standard Channels */}
        <div className="mb-3">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="font-mono-data text-[9px] text-white/20 uppercase tracking-wider">
              Channels
            </span>
            <button 
              onClick={() => setCreateChannelOpen(true)}
              className="p-0.5 rounded hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-all"
              title="Create Channel"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {standardChannels.map((channel) => {
            const isActive = activeChannelId === channel.id;
            const Icon = channelIcons[channel.icon] || Hash;
            const colorClass = channelColors[channel.type] || 'text-white/50';

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 group relative',
                  isActive
                    ? 'bg-white/[0.08] border border-white/[0.1]'
                    : 'hover:bg-white/[0.04] border border-transparent'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-titan-cyan" />
                )}
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    isActive ? colorClass : 'text-white/30 group-hover:text-white/50'
                  )}
                />
                <span
                  className={cn(
                    'font-mono-data text-[11px] truncate flex-1 text-left',
                    isActive ? 'text-white' : 'text-white/50 group-hover:text-white/70',
                    channel.unreadCount > 0 && 'font-semibold'
                  )}
                >
                  {channel.name}
                </span>
                {channel.type === 'internal' && (
                  <Lock className="w-2.5 h-2.5 text-yellow-400/50" />
                )}
                {channel.unreadCount > 0 && (
                  <span className="min-w-[16px] h-4 rounded-full bg-titan-cyan/20 text-titan-cyan font-mono-data text-[9px] font-bold flex items-center justify-center px-1">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Channels */}
        {customChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="font-mono-data text-[9px] text-white/20 uppercase tracking-wider">
                Custom
              </span>
            </div>
            {customChannels.map((channel) => {
              const isActive = activeChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all',
                    isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  )}
                >
                  <Hash className="w-3.5 h-3.5 text-white/30" />
                  <span className="font-mono-data text-[11px] text-white/50 truncate">
                    {channel.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <button 
          onClick={() => activeChannelId && handleAddMembersClick(activeChannelId)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-white/30 hover:text-white/60 transition-all"
        >
          <Users className="w-3.5 h-3.5" />
          <span className="font-mono-data text-[10px]">
            {workspace.members.length} members
          </span>
          <UserPlus className="w-3 h-3 ml-auto" />
        </button>
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        workspaceId={workspace.id}
        currentUserId={currentUserId}
        onChannelCreated={handleChannelCreated}
      />

      {selectedChannelForMembers && (
        <AddMemberModal
          open={addMemberOpen}
          onClose={() => {
            setAddMemberOpen(false);
            setSelectedChannelForMembers(null);
          }}
          channelId={selectedChannelForMembers}
          workspaceId={workspace.id}
          currentUserId={currentUserId}
          onMembersUpdated={handleMembersUpdated}
        />
      )}

      <QuickActionsManager
        open={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        userRole={currentUserRole}
        onActionsUpdated={handleChannelCreated}
      />
    </div>
  );
}
