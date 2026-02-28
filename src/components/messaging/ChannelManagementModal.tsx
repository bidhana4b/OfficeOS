import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Hash, Lock, AlertCircle } from 'lucide-react';

interface ChannelManagementModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'delete';
  channel?: {
    id: string;
    name: string;
    type: 'public' | 'private';
    description?: string;
  };
  onSave: (data: {
    name: string;
    type: 'public' | 'private';
    description?: string;
  }) => void;
  onDelete?: (channelId: string) => void;
}

export default function ChannelManagementModal({
  open,
  onClose,
  mode,
  channel,
  onSave,
  onDelete,
}: ChannelManagementModalProps) {
  const [name, setName] = useState(channel?.name || '');
  const [type, setType] = useState<'public' | 'private'>(channel?.type || 'public');
  const [description, setDescription] = useState(channel?.description || '');

  const handleSave = () => {
    if (!name.trim()) {
      alert('Channel name is required');
      return;
    }

    onSave({ name: name.trim(), type, description: description.trim() });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      onDelete?.(channel!.id);
      onClose();
    }
  };

  if (mode === 'delete') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px] glass-card border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Delete Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-white/60 text-sm">
              Are you sure you want to delete <strong>{channel?.name}</strong>? All messages will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete Channel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border-white/[0.1]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Channel' : 'Edit Channel'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Channel Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., project-updates"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Channel Type</Label>
            <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex items-center gap-1.5 cursor-pointer">
                  <Hash className="w-4 h-4" />
                  Public - Everyone can see and join
                </Label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center gap-1.5 cursor-pointer">
                  <Lock className="w-4 h-4" />
                  Private - Invite only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of channel purpose"
              className="mt-1.5"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-titan-cyan hover:bg-titan-cyan/80">
              {mode === 'create' ? 'Create Channel' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
