import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Hash,
  Clock,
  FileUp,
  Wand2,
  Bot,
  Bell,
  Heart,
  Eye,
  Trash2,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { messagingRules as mockMessagingRules } from './mock-data';
import { ToggleSetting } from './UsersRolesControl';
import { useSettings } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function MessagingControl() {
  const settingsQuery = useSettings<Record<string, unknown>>('messaging_rules');
  const [rules, setRules] = useState(mockMessagingRules);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settingsQuery.data) {
      setRules({
        autoCreateChannels: (settingsQuery.data.autoCreateChannels as boolean) ?? mockMessagingRules.autoCreateChannels,
        clientCanCreateChannels: (settingsQuery.data.clientCanCreateChannels as boolean) ?? mockMessagingRules.clientCanCreateChannels,
        internalChannelVisibility: (settingsQuery.data.internalChannelVisibility as string) || mockMessagingRules.internalChannelVisibility,
        editTimeLimit: (settingsQuery.data.editTimeLimit as number) || mockMessagingRules.editTimeLimit,
        deletePermission: (settingsQuery.data.deletePermission as string) || mockMessagingRules.deletePermission,
        fileSizeLimit: (settingsQuery.data.fileSizeLimit as number) || mockMessagingRules.fileSizeLimit,
        allowedFileTypes: (settingsQuery.data.allowedFileTypes as string[]) || mockMessagingRules.allowedFileTypes,
        deliverableFromMessage: (settingsQuery.data.deliverableFromMessage as boolean) ?? mockMessagingRules.deliverableFromMessage,
        autoDeductOnCreate: (settingsQuery.data.autoDeductOnCreate as boolean) ?? mockMessagingRules.autoDeductOnCreate,
        boostAutoCreate: (settingsQuery.data.boostAutoCreate as boolean) ?? mockMessagingRules.boostAutoCreate,
        aiReplySuggestion: (settingsQuery.data.aiReplySuggestion as boolean) ?? mockMessagingRules.aiReplySuggestion,
        autoWeeklySummary: (settingsQuery.data.autoWeeklySummary as boolean) ?? mockMessagingRules.autoWeeklySummary,
        sentimentDetection: (settingsQuery.data.sentimentDetection as boolean) ?? mockMessagingRules.sentimentDetection,
      });
    }
  }, [settingsQuery.data]);

  const handleSaveMessagingRules = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'messaging_rules',
          config: rules,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            Messaging System Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Channel rules, message behavior, deliverable automation, and AI messaging</p>
        </div>
        <button
          onClick={handleSaveMessagingRules}
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

      {/* Channel Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-blue-400/60" />
          Channel Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Auto-create workspace channels"
            description="Automatically create channels when a new workspace/client is added"
            enabled={rules.autoCreateChannels}
            onToggle={() => setRules({ ...rules, autoCreateChannels: !rules.autoCreateChannels })}
          />
          <ToggleSetting
            label="Allow clients to create channels"
            description="Clients can create new channels in their workspace"
            enabled={rules.clientCanCreateChannels}
            onToggle={() => setRules({ ...rules, clientCanCreateChannels: !rules.clientCanCreateChannels })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <Eye className="w-3 h-3 text-white/40" />
                Internal channel visibility
              </p>
              <p className="font-mono text-[10px] text-white/30">Who can see internal team channels</p>
            </div>
            <select
              value={rules.internalChannelVisibility}
              onChange={(e) => setRules({ ...rules, internalChannelVisibility: e.target.value as any })}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              <option value="all">All Members</option>
              <option value="team">Team Only</option>
              <option value="admin">Admin Only</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Message Behavior */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-titan-cyan/60" />
          Message Behavior
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Edit time limit</p>
              <p className="font-mono text-[10px] text-white/30">How long after sending can a message be edited</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rules.editTimeLimit}
                onChange={(e) => setRules({ ...rules, editTimeLimit: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">min</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <Trash2 className="w-3 h-3 text-white/40" />
                Delete message permission
              </p>
              <p className="font-mono text-[10px] text-white/30">Who can delete messages</p>
            </div>
            <select
              value={rules.deletePermission}
              onChange={(e) => setRules({ ...rules, deletePermission: e.target.value as any })}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              <option value="admin">Admin Only</option>
              <option value="author">Message Author</option>
              <option value="none">Nobody</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <FileUp className="w-3 h-3 text-white/40" />
                File size limit
              </p>
              <p className="font-mono text-[10px] text-white/30">Maximum file upload size</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rules.fileSizeLimit}
                onChange={(e) => setRules({ ...rules, fileSizeLimit: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">MB</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <p className="font-mono text-xs text-white/70 mb-2">Allowed file types</p>
            <div className="flex flex-wrap gap-1.5">
              {rules.allowedFileTypes.map((type) => (
                <span key={type} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-white/50">
                  {type}
                </span>
              ))}
              <button className="px-2 py-0.5 rounded-full border border-dashed border-white/20 text-[10px] font-mono text-white/30 hover:text-white/50">
                + Add
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Deliverable Automation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-titan-purple/60" />
          Deliverable Automation
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Create deliverable from message"
            description="Allow converting message attachments directly into deliverables"
            enabled={rules.deliverableFromMessage}
            onToggle={() => setRules({ ...rules, deliverableFromMessage: !rules.deliverableFromMessage })}
          />
          <ToggleSetting
            label="Auto deduction on deliverable create"
            description="Automatically deduct from package when deliverable is created via message"
            enabled={rules.autoDeductOnCreate}
            onToggle={() => setRules({ ...rules, autoDeductOnCreate: !rules.autoDeductOnCreate })}
          />
          <ToggleSetting
            label="Boost auto-creation from message"
            description="Allow creating ad boosts directly from chat messages"
            enabled={rules.boostAutoCreate}
            onToggle={() => setRules({ ...rules, boostAutoCreate: !rules.boostAutoCreate })}
          />
        </div>
      </motion.div>

      {/* AI Messaging */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Bot className="w-4 h-4 text-titan-lime/60" />
          AI Messaging
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="AI reply suggestions"
            description="Show AI-generated reply suggestions in the message thread"
            enabled={rules.aiReplySuggestion}
            onToggle={() => setRules({ ...rules, aiReplySuggestion: !rules.aiReplySuggestion })}
          />
          <ToggleSetting
            label="Auto weekly summary"
            description="Generate automated weekly messaging summaries per workspace"
            enabled={rules.autoWeeklySummary}
            onToggle={() => setRules({ ...rules, autoWeeklySummary: !rules.autoWeeklySummary })}
          />
          <ToggleSetting
            label="Sentiment detection"
            description="Analyze message sentiment to flag frustrated or unhappy clients"
            enabled={rules.sentimentDetection}
            onToggle={() => setRules({ ...rules, sentimentDetection: !rules.sentimentDetection })}
          />
        </div>
      </motion.div>
    </div>
  );
}
