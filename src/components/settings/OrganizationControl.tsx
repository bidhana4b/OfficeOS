import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Upload,
  Palette,
  MapPin,
  FileText,
  CreditCard,
  GitBranch,
  Plus,
  Users,
  BarChart3,
  ChevronRight,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companyProfile as mockCompanyProfile, branches as mockBranches } from './mock-data';
import { useBranches, useSettings } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function OrganizationControl() {
  const branchesQuery = useBranches();
  const settingsQuery = useSettings('organization');
  const [profile, setProfile] = useState(mockCompanyProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settingsQuery.data) {
      const d = settingsQuery.data as Record<string, unknown>;
      setProfile({
        name: (d.name as string) || mockCompanyProfile.name,
        logo: (d.logo as string) || mockCompanyProfile.logo,
        brandColor: (d.brandColor as string) || mockCompanyProfile.brandColor,
        address: (d.address as string) || mockCompanyProfile.address,
        taxInfo: (d.taxInfo as string) || mockCompanyProfile.taxInfo,
        invoiceFooter: (d.invoiceFooter as string) || mockCompanyProfile.invoiceFooter,
        legalInfo: (d.legalInfo as string) || mockCompanyProfile.legalInfo,
        paymentMethods: (d.paymentMethods as string[]) || mockCompanyProfile.paymentMethods,
      });
    }
  }, [settingsQuery.data]);
  
  const branchList = branchesQuery.data.length > 0
    ? branchesQuery.data.map((b: Record<string, unknown>) => ({
        id: b.id as string,
        name: b.name as string,
        manager: (b.manager as string) || '',
        clientCount: (b.client_count as number) || 0,
        status: (b.status as string) || 'active',
        location: (b.location as string) || '',
      }))
    : mockBranches;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'organization',
          config: profile,
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
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-titan-cyan/10 border border-titan-cyan/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-titan-cyan" />
            </div>
            Organization Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Company profile, branding, and branch management</p>
        </div>
        <button
          onClick={handleSaveProfile}
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

      {/* Company Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-titan-cyan/60" />
          Company Profile
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Logo Upload */}
          <div className="lg:col-span-2 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 border border-white/10 flex items-center justify-center">
              <span className="font-display font-extrabold text-lg text-titan-cyan">T</span>
            </div>
            <div>
              <p className="font-mono text-xs text-white/50 mb-1">Company Logo</p>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white/60 hover:text-white hover:border-titan-cyan/30 transition-all">
                <Upload className="w-3 h-3" />
                Upload Logo
              </button>
            </div>
          </div>

          {/* Fields */}
          <SettingsField
            label="Company Name"
            value={profile.name}
            onChange={(v) => setProfile({ ...profile, name: v })}
          />
          <SettingsField
            label="Brand Color"
            value={profile.brandColor}
            onChange={(v) => setProfile({ ...profile, brandColor: v })}
            icon={<Palette className="w-3 h-3" />}
            colorPreview={profile.brandColor}
          />
          <SettingsField
            label="Address"
            value={profile.address}
            onChange={(v) => setProfile({ ...profile, address: v })}
            icon={<MapPin className="w-3 h-3" />}
            fullWidth
          />
          <SettingsField
            label="Tax Info"
            value={profile.taxInfo}
            onChange={(v) => setProfile({ ...profile, taxInfo: v })}
          />
          <SettingsField
            label="Legal Info"
            value={profile.legalInfo}
            onChange={(v) => setProfile({ ...profile, legalInfo: v })}
          />
          <div className="lg:col-span-2">
            <label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Invoice Footer Text</label>
            <textarea
              value={profile.invoiceFooter}
              onChange={(e) => setProfile({ ...profile, invoiceFooter: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-mono focus:border-titan-cyan/40 focus:outline-none resize-none h-20 transition-colors"
            />
          </div>

          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-2 block flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Accepted Payment Methods
            </label>
            <div className="flex flex-wrap gap-2">
              {profile.paymentMethods.map((method) => (
                <span
                  key={method}
                  className="px-3 py-1 rounded-full bg-titan-cyan/10 border border-titan-cyan/20 text-[10px] font-mono text-titan-cyan/80"
                >
                  {method}
                </span>
              ))}
              <button className="px-3 py-1 rounded-full bg-white/[0.04] border border-dashed border-white/20 text-[10px] font-mono text-white/40 hover:text-white/60 hover:border-white/30 transition-colors">
                + Add Method
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Branch Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-titan-purple/60" />
            Branch Management
          </h3>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/30 text-[10px] font-mono text-titan-cyan hover:bg-titan-cyan/20 transition-all">
            <Plus className="w-3 h-3" />
            Add Branch
          </button>
        </div>

        <div className="space-y-2">
          {branchList.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  branch.status === 'active' ? 'bg-titan-lime' : 'bg-white/20'
                )} />
                <div>
                  <p className="font-mono text-xs text-white/80">{branch.name}</p>
                  <p className="font-mono text-[10px] text-white/30">{branch.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-white/30">
                  <Users className="w-3 h-3" />
                  <span className="font-mono text-[10px]">{branch.manager}</span>
                </div>
                <div className="flex items-center gap-1 text-white/30">
                  <BarChart3 className="w-3 h-3" />
                  <span className="font-mono text-[10px]">{branch.clientCount} clients</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Reusable Settings Field Component
function SettingsField({
  label,
  value,
  onChange,
  icon,
  colorPreview,
  fullWidth,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  colorPreview?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'lg:col-span-2' : ''}>
      <label className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="relative">
        {colorPreview && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: colorPreview }}
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-mono focus:border-titan-cyan/40 focus:outline-none transition-colors',
            colorPreview && 'pl-8'
          )}
        />
      </div>
    </div>
  );
}
