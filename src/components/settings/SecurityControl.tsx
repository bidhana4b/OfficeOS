import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Trash2,
  HardDrive,
  Download,
  AlertOctagon,
  MessageSquareOff,
  Ban,
  FileX,
  Wrench,
  Calendar,
  Lock,
  Power,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { backupConfig, emergencyControls } from './defaults';
import { ToggleSetting } from './UsersRolesControl';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function SecurityControl() {
  const [backup, setBackup] = useState(backupConfig);
  const [emergency, setEmergency] = useState(emergencyControls);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSaveSecurity = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'security',
          config: { backup, emergency },
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
            <div className="w-8 h-8 rounded-lg bg-titan-magenta/10 border border-titan-magenta/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-titan-magenta" />
            </div>
            System Safety & Backup
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Recycle bin, backup settings, and emergency controls</p>
        </div>
        <button
          onClick={handleSaveSecurity}
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

      {/* Recycle Bin Control */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Trash2 className="w-4 h-4 text-white/40" />
          Recycle Bin Control
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-white/40" />
                Retention period
              </p>
              <p className="font-mono text-[10px] text-white/30">How long deleted items are kept</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={backup.recycleBinRetention}
                onChange={(e) => setBackup({ ...backup, recycleBinRetention: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">days</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <Lock className="w-3 h-3 text-white/40" />
                Permanent delete rule
              </p>
              <p className="font-mono text-[10px] text-white/30">Who can permanently delete items</p>
            </div>
            <select
              value={backup.permanentDeleteRule}
              onChange={(e) => setBackup({ ...backup, permanentDeleteRule: e.target.value as any })}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              <option value="admin-only">Admin Only</option>
              <option value="after-retention">After Retention Period</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Backup Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-titan-cyan/60" />
          Backup Settings
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Daily DB snapshot"
            description="Automatically create a database backup every day at 3:00 AM UTC"
            enabled={backup.dailyDbSnapshot}
            onToggle={() => setBackup({ ...backup, dailyDbSnapshot: !backup.dailyDbSnapshot })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Last backup</p>
              <p className="font-mono text-[10px] text-white/30">{new Date(backup.lastBackup).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-titan-lime">
              <div className="w-1.5 h-1.5 rounded-full bg-titan-lime" />
              <span className="font-mono text-[10px]">Healthy</span>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-titan-cyan/5 border border-titan-cyan/20 text-titan-cyan font-mono text-xs hover:bg-titan-cyan/10 transition-all">
            <Download className="w-4 h-4" />
            Export Full System Backup
          </button>
        </div>
      </motion.div>

      {/* Emergency Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-titan-magenta/[0.03] backdrop-blur-xl border border-titan-magenta/[0.15]"
      >
        <h3 className="font-display font-bold text-sm text-titan-magenta/80 flex items-center gap-2 mb-2">
          <AlertOctagon className="w-4 h-4 text-titan-magenta/60" />
          Emergency Controls
        </h3>
        <p className="font-mono text-[10px] text-titan-magenta/30 mb-4">
          ⚠️ These controls immediately affect all users and operations. Use with extreme caution.
        </p>
        <div className="space-y-3">
          <ToggleSetting
            label="🔧 Maintenance Mode"
            description="Put the entire system into maintenance mode. All users will see a maintenance page."
            enabled={emergency.maintenanceMode}
            onToggle={() => setEmergency({ ...emergency, maintenanceMode: !emergency.maintenanceMode })}
            danger
          />
          <ToggleSetting
            label="💬 Disable Messaging Globally"
            description="Immediately disable all messaging features across the platform"
            enabled={emergency.messagingDisabled}
            onToggle={() => setEmergency({ ...emergency, messagingDisabled: !emergency.messagingDisabled })}
            danger
          />
          <ToggleSetting
            label="📢 Disable Boost Globally"
            description="Block all ad boost creation and campaign launches"
            enabled={emergency.boostDisabled}
            onToggle={() => setEmergency({ ...emergency, boostDisabled: !emergency.boostDisabled })}
            danger
          />
          <ToggleSetting
            label="📄 Disable Deliverable Creation Globally"
            description="Block all new deliverable creation across the entire system"
            enabled={emergency.deliverableCreationDisabled}
            onToggle={() => setEmergency({ ...emergency, deliverableCreationDisabled: !emergency.deliverableCreationDisabled })}
            danger
          />
        </div>

        {/* Emergency Status Banner */}
        {(emergency.maintenanceMode || emergency.messagingDisabled || emergency.boostDisabled || emergency.deliverableCreationDisabled) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-titan-magenta/10 border border-titan-magenta/30"
          >
            <div className="flex items-center gap-2 mb-1">
              <Power className="w-3.5 h-3.5 text-titan-magenta" />
              <span className="font-mono text-xs text-titan-magenta font-bold">EMERGENCY CONTROLS ACTIVE</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {emergency.maintenanceMode && (
                <span className="px-2 py-0.5 rounded-full bg-titan-magenta/20 text-[9px] font-mono text-titan-magenta flex items-center gap-1">
                  <Wrench className="w-2.5 h-2.5" /> Maintenance
                </span>
              )}
              {emergency.messagingDisabled && (
                <span className="px-2 py-0.5 rounded-full bg-titan-magenta/20 text-[9px] font-mono text-titan-magenta flex items-center gap-1">
                  <MessageSquareOff className="w-2.5 h-2.5" /> No Messaging
                </span>
              )}
              {emergency.boostDisabled && (
                <span className="px-2 py-0.5 rounded-full bg-titan-magenta/20 text-[9px] font-mono text-titan-magenta flex items-center gap-1">
                  <Ban className="w-2.5 h-2.5" /> No Boosts
                </span>
              )}
              {emergency.deliverableCreationDisabled && (
                <span className="px-2 py-0.5 rounded-full bg-titan-magenta/20 text-[9px] font-mono text-titan-magenta flex items-center gap-1">
                  <FileX className="w-2.5 h-2.5" /> No Deliverables
                </span>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
