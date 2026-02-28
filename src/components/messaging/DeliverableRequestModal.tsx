import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Palette, Video, FileText, ShieldCheck } from 'lucide-react';

interface DeliverableRequestModalProps {
  open: boolean;
  onClose: () => void;
  deliverableType: 'design' | 'video' | 'content' | 'approval' | null;
  onSubmit: (data: {
    type: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    deadline?: string;
  }) => void;
}

const typeConfig = {
  design: { icon: Palette, label: 'Design Request', color: 'text-titan-cyan' },
  video: { icon: Video, label: 'Video Request', color: 'text-titan-purple' },
  content: { icon: FileText, label: 'Content Request', color: 'text-titan-lime' },
  approval: { icon: ShieldCheck, label: 'Approval Request', color: 'text-titan-lime' },
};

export default function DeliverableRequestModal({
  open,
  onClose,
  deliverableType,
  onSubmit,
}: DeliverableRequestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [deadline, setDeadline] = useState('');

  if (!deliverableType) return null;

  const config = typeConfig[deliverableType];
  const Icon = config.icon;

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      type: deliverableType,
      title,
      description,
      priority,
      deadline: deadline || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDeadline('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border-white/[0.1]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Logo redesign for landing page"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed requirements..."
              rows={4}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Deadline (Optional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-titan-cyan hover:bg-titan-cyan/80">
              Submit Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
