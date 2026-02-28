import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Send, X, ImageIcon, Video, FileText,
  Calendar, Flag, User, Package, Sparkles,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PostPriority } from './types';
import { PRIORITY_CONFIG } from './types';

interface CreatePostFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    priority: PostPriority;
    due_date?: string;
    assigned_to?: string;
    files?: File[];
  }) => void;
  onCancel?: () => void;
  teamMembers?: Array<{ id: string; name: string; avatar?: string; role?: string }>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function CreatePostForm({
  onSubmit,
  onCancel,
  teamMembers = [],
  isExpanded: controlledExpanded,
  onToggleExpand,
}: CreatePostFormProps) {
  const [isExpanded, setIsExpanded] = useState(controlledExpanded || false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PostPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expanded = controlledExpanded !== undefined ? controlledExpanded : isExpanded;
  const toggleExpand = onToggleExpand || (() => setIsExpanded(p => !p));

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title,
      description,
      priority,
      due_date: dueDate || undefined,
      assigned_to: assignedTo || undefined,
      files: files.length > 0 ? files : undefined,
    });
    // Reset
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setAssignedTo('');
    setFiles([]);
    setIsExpanded(false);
  };

  const selectedMember = teamMembers.find(m => m.id === assignedTo);

  if (!expanded) {
    return (
      <button
        onClick={toggleExpand}
        className="w-full glass-card p-4 flex items-center gap-3 text-left hover:border-cyan-500/20 transition-all group"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
          <Plus className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <p className="font-display font-semibold text-sm text-white/60 group-hover:text-white/80 transition-colors">
            Create New Deliverable Post
          </p>
          <p className="font-mono text-[10px] text-white/30">Share a design, video, or content for review</p>
        </div>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden border-cyan-500/20"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-display font-bold text-sm text-white">New Deliverable Post</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/40 hover:text-white"
            onClick={() => { toggleExpand(); onCancel?.(); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g., Facebook Post Design - January Campaign)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/30 font-display"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add description, requirements, or notes..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/30 resize-none min-h-[80px] font-mono"
          rows={3}
        />

        {/* File Previews */}
        {files.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {files.map((file, i) => (
              <div key={i} className="relative group">
                {file.type.startsWith('image/') ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center p-2">
                    {file.type.startsWith('video/') ? (
                      <Video className="w-5 h-5 text-purple-400 mb-1" />
                    ) : (
                      <FileText className="w-5 h-5 text-cyan-400 mb-1" />
                    )}
                    <span className="text-[8px] font-mono text-white/40 text-center line-clamp-2">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Meta Options Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Attach File */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] border-white/10 text-white/50 hover:text-white hover:border-white/20 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Attach Files
          </Button>

          {/* Priority Picker */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={cn('h-8 text-[11px] border-white/10 gap-1.5', PRIORITY_CONFIG[priority].color)}
              onClick={() => setShowPriorityPicker(!showPriorityPicker)}
            >
              <Flag className="w-3.5 h-3.5" /> {PRIORITY_CONFIG[priority].label}
              <ChevronDown className="w-3 h-3" />
            </Button>
            <AnimatePresence>
              {showPriorityPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 mt-1 glass-card p-1 z-50 w-36"
                >
                  {(Object.keys(PRIORITY_CONFIG) as PostPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPriority(p); setShowPriorityPicker(false); }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2',
                        priority === p ? 'bg-white/10' : 'hover:bg-white/5',
                        PRIORITY_CONFIG[p].color
                      )}
                    >
                      <Flag className="w-3 h-3" /> {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Due Date */}
          <div className="relative">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-[11px] bg-transparent border border-white/10 rounded-lg px-3 text-white/50 focus:outline-none focus:border-cyan-500/30 [color-scheme:dark]"
            />
          </div>

          {/* Assign To */}
          {teamMembers.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] border-white/10 text-white/50 hover:text-white hover:border-white/20 gap-1.5"
                onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              >
                <User className="w-3.5 h-3.5" />
                {selectedMember ? selectedMember.name : 'Assign To'}
                <ChevronDown className="w-3 h-3" />
              </Button>
              <AnimatePresence>
                {showAssigneePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full left-0 mt-1 glass-card p-1 z-50 w-48 max-h-48 overflow-y-auto"
                  >
                    <button
                      onClick={() => { setAssignedTo(''); setShowAssigneePicker(false); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/5 transition-colors"
                    >
                      Unassigned
                    </button>
                    {teamMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setAssignedTo(m.id); setShowAssigneePicker(false); }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2',
                          assignedTo === m.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/70 hover:bg-white/5'
                        )}
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <span>{m.name}</span>
                          {m.role && <span className="text-[9px] text-white/30 ml-1">({m.role})</span>}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-white/40"
            onClick={() => { toggleExpand(); onCancel?.(); }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 border-0 gap-1.5"
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            <Send className="w-3 h-3" /> Create Post
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAdd} multiple accept="image/*,video/*,.pdf,.doc,.docx,.psd,.ai,.zip" />
    </motion.div>
  );
}
