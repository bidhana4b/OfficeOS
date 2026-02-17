import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Zap,
  Percent,
  Settings2,
  ArrowLeftRight,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { teamConfigs } from './mock-data';
import { ToggleSetting } from './UsersRolesControl';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function TeamControl() {
  const [teams, setTeams] = useState(teamConfigs);
  const [multiTeamGlobal, setMultiTeamGlobal] = useState(true);
  const [conflictDetection, setConflictDetection] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const updateTeam = (id: string, field: string, value: any) => {
    setTeams(teams.map((t) =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const handleSaveTeamSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'team_control',
          config: {
            teams,
            multiTeamGlobal,
            conflictDetection,
          },
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
            <div className="w-8 h-8 rounded-lg bg-titan-lime/10 border border-titan-lime/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-titan-lime" />
            </div>
            Team Control Engine
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Team creation, workload thresholds, and cross-team rules</p>
        </div>
        <button
          onClick={handleSaveTeamSettings}
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

      {/* Team Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {teams.map((team, i) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.1] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-titan-cyan/10 flex items-center justify-center">
                  <Users className="w-3 h-3 text-titan-cyan" />
                </div>
                <span className="font-display font-bold text-sm text-white/80">{team.category}</span>
              </div>
              <span className="font-mono text-[10px] text-white/30">{team.memberCount} members</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/40">Team Lead</span>
                <span className="font-mono text-xs text-titan-cyan/80">{team.lead}</span>
              </div>

              {/* Max Workload Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Max Workload
                  </span>
                  <span className="font-mono text-xs text-white/70">{team.maxWorkloadPercent}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={team.maxWorkloadPercent}
                  onChange={(e) => updateTeam(team.id, 'maxWorkloadPercent', parseInt(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none bg-white/10 accent-titan-cyan cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-titan-cyan [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-titan-cyan/30"
                />
              </div>

              {/* Overload Warning */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Overload Warning
                  </span>
                  <span className={cn(
                    'font-mono text-xs',
                    team.overloadWarningPercent >= 80 ? 'text-titan-magenta' : 'text-white/70'
                  )}>{team.overloadWarningPercent}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={team.overloadWarningPercent}
                  onChange={(e) => updateTeam(team.id, 'overloadWarningPercent', parseInt(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none bg-white/10 accent-titan-magenta cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-titan-magenta [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-titan-magenta/30"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <ToggleInline
                    label="Cross-Team"
                    enabled={team.crossTeamAllowed}
                    onToggle={() => updateTeam(team.id, 'crossTeamAllowed', !team.crossTeamAllowed)}
                  />
                </div>
                <ToggleInline
                  label="Auto Redistribute"
                  enabled={team.autoRedistribute}
                  onToggle={() => updateTeam(team.id, 'autoRedistribute', !team.autoRedistribute)}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Global Cross-Team Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-4 h-4 text-titan-purple/60" />
          Global Cross-Team Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Allow multi-team assignments globally"
            description="Members can be part of multiple teams simultaneously"
            enabled={multiTeamGlobal}
            onToggle={() => setMultiTeamGlobal(!multiTeamGlobal)}
          />
          <ToggleSetting
            label="Conflict detection"
            description="Warn when a member's combined workload exceeds their threshold"
            enabled={conflictDetection}
            onToggle={() => setConflictDetection(!conflictDetection)}
          />
        </div>
      </motion.div>

      {/* Add Team Button */}
      <button className="w-full p-4 rounded-xl border border-dashed border-white/[0.1] text-white/30 hover:text-white/50 hover:border-white/[0.2] transition-all flex items-center justify-center gap-2 font-mono text-xs">
        <UserPlus className="w-4 h-4" />
        Create New Team Category
      </button>
    </div>
  );
}

function ToggleInline({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-1.5">
      <div className={cn(
        'w-6 h-3 rounded-full transition-all relative',
        enabled ? 'bg-titan-cyan/30' : 'bg-white/10'
      )}>
        <div className={cn(
          'w-2.5 h-2.5 rounded-full absolute top-0.5 transition-all',
          enabled ? 'left-3 bg-titan-cyan' : 'left-0.5 bg-white/30'
        )} />
      </div>
      <span className="font-mono text-[10px] text-white/40">{label}</span>
    </button>
  );
}
