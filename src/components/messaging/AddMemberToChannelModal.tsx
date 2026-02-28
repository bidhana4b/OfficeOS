import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, Search } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface AddMemberToChannelModalProps {
  open: boolean;
  onClose: () => void;
  channelName: string;
  existingMembers: string[]; // Array of user IDs already in channel
  availableMembers: Member[];
  onAddMembers: (userIds: string[]) => void;
}

export default function AddMemberToChannelModal({
  open,
  onClose,
  channelName,
  existingMembers,
  availableMembers,
  onAddMembers,
}: AddMemberToChannelModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const filteredMembers = availableMembers
    .filter((m) => !existingMembers.includes(m.id))
    .filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    );

  const handleToggle = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAdd = () => {
    if (selected.length === 0) return;
    onAddMembers(selected);
    setSelected([]);
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border-white/[0.1]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-titan-cyan" />
            Add Members to #{channelName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="pl-9"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm">
                {search ? 'No members found' : 'All members are already in this channel'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => handleToggle(member.id)}
                >
                  <Checkbox checked={selected.includes(member.id)} />
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{member.avatar || member.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-white/40 truncate">{member.email}</p>
                  </div>
                  <span className="text-xs text-white/30">{member.role}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-white/[0.06]">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={selected.length === 0}
              className="bg-titan-cyan hover:bg-titan-cyan/80"
            >
              Add {selected.length > 0 && `(${selected.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
