import { useState, useEffect } from 'react';
import { Client } from './types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { updateClient } from '@/lib/data-service';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { useClientAssignments } from '@/hooks/useAssignments';

function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}
import { 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  User, 
  Users,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  Pencil,
  Save,
  X,
  Check,
  Layers,
  Hash,
  RefreshCw,
  FileText,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  Briefcase,
} from 'lucide-react';

interface ClientProfileProps {
  client: Client;
  onRefresh?: () => void;
}

const roleLabelsMap: Record<string, string> = {
  designer: 'Designer',
  media_buyer: 'Media Buyer',
  account_manager: 'Account Manager',
  video_editor: 'Video Editor',
  content_writer: 'Content Writer',
  strategist: 'Strategist',
  developer: 'Developer',
};

function TeamAssignmentsPanel({ clientId }: { clientId: string }) {
  const { data: assignments, loading } = useClientAssignments(clientId);

  return (
    <div className="bg-[#1A1D2E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#00D9FF]" />
        <h4 className="text-lg font-bold text-white">Assigned Team</h4>
        <Badge variant="outline" className="ml-auto border-[#00D9FF]/30 text-[#00D9FF] text-[10px]">
          {assignments.length} members
        </Badge>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-[#00D9FF] animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/30 font-mono">No team members assigned yet</p>
          <p className="text-[10px] text-white/20 font-mono mt-1">Go to Assignment Center to assign team members</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const member = a.team_members;
            if (!member) return null;
            return (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="relative shrink-0">
                  {member.avatar?.startsWith('http') ? (
                    <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1A1D2E] ${
                    member.status === 'online' ? 'bg-emerald-400' :
                    member.status === 'busy' ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{member.name}</p>
                  <p className="text-[10px] text-white/40 font-mono">{member.primary_role}</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 border-white/10 text-white/50">
                  <Briefcase className="w-2.5 h-2.5 mr-1" />
                  {roleLabelsMap[a.role_type] || a.role_type}
                </Badge>
                <span className={`text-[10px] font-mono ${
                  member.current_load >= 85 ? 'text-red-400' :
                  member.current_load >= 65 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {member.current_load}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ClientProfile({ client, onRefresh }: ClientProfileProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'account_manager';
  
  // Edit state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPackageDetails, setShowPackageDetails] = useState(true);
  const [showAssignPackage, setShowAssignPackage] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<Array<{id: string; name: string; tier: string; monthly_fee: number; currency: string}>>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{id: string; name: string; avatar: string}>>([]);
  
  // Business info edit form
  const [businessForm, setBusinessForm] = useState({
    business_name: client.businessName,
    category: client.category,
    location: client.location,
    contact_email: client.contactInfo.email,
    contact_phone: client.contactInfo.phone,
    contact_website: client.contactInfo.website || '',
    status: client.status,
    health_score: client.healthScore,
  });
  
  // Package assignment form
  const [assignForm, setAssignForm] = useState({
    package_id: '',
    start_date: new Date().toISOString().split('T')[0],
    renewal_date: '',
    custom_monthly_fee: '',
    notes: '',
  });

  // Notes edit
  const [notesEdit, setNotesEdit] = useState(client.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);

  // Manager edit
  const [selectedManagerId, setSelectedManagerId] = useState(client.accountManager.id);
  const [editingManager, setEditingManager] = useState(false);

  useEffect(() => {
    setBusinessForm({
      business_name: client.businessName,
      category: client.category,
      location: client.location,
      contact_email: client.contactInfo.email,
      contact_phone: client.contactInfo.phone,
      contact_website: client.contactInfo.website || '',
      status: client.status,
      health_score: client.healthScore,
    });
    setNotesEdit(client.notes || '');
    setSelectedManagerId(client.accountManager.id);
  }, [client]);

  // Fetch available packages and team members
  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await getSupabase()
        .from('packages')
        .select('id, name, tier, monthly_fee, currency')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true);
      setAvailablePackages(data || []);
    };
    const fetchTeam = async () => {
      const { data } = await getSupabase()
        .from('team_members')
        .select('id, name, avatar')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('status', 'active');
      setTeamMembers(data || []);
    };
    fetchPackages();
    fetchTeam();
  }, []);

  const getUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return (used / total) * 100;
  };
  
  const isLowUsage = (used: number, total: number) => {
    if (total === 0) return false;
    const remaining = total - used;
    const percentRemaining = (remaining / total) * 100;
    return percentRemaining < 20;
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30';
      case 'at-risk':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'churning':
        return 'bg-[#FF006E]/20 text-[#FF006E] border-[#FF006E]/30';
      case 'paused':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Starter':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Growth':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Advanced':
        return 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/30';
      default:
        return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const usageColors = [
    'bg-[#00D9FF]', 'bg-purple-500', 'bg-[#39FF14]', 'bg-[#FF006E]',
    'bg-amber-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500',
    'bg-orange-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500',
  ];

  const handleSaveBusinessInfo = async () => {
    setSaving(true);
    try {
      await updateClient(client.id, businessForm);
      setEditingSection(null);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManager = async () => {
    setSaving(true);
    try {
      await updateClient(client.id, { account_manager_id: selectedManagerId });
      setEditingManager(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save manager:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!client.clientPackageId) return;
    setSaving(true);
    try {
      await getSupabase().from('client_packages').update({ notes: notesEdit }).eq('id', client.clientPackageId);
      setEditingNotes(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPackage = async () => {
    if (!assignForm.package_id) return;
    setSaving(true);
    try {
      // Deactivate existing active packages
      if (client.clientPackageId) {
        await getSupabase().from('client_packages').update({ status: 'expired' }).eq('id', client.clientPackageId);
      }

      const { data: newCp } = await supabase
        .from('client_packages')
        .insert({
          client_id: client.id,
          package_id: assignForm.package_id,
          start_date: assignForm.start_date,
          renewal_date: assignForm.renewal_date || null,
          custom_monthly_fee: assignForm.custom_monthly_fee ? Number(assignForm.custom_monthly_fee) : null,
          notes: assignForm.notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (newCp) {
        // Initialize package_usage from package_features
        const { data: pkgFeatures } = await supabase
          .from('package_features')
          .select('*')
          .eq('package_id', assignForm.package_id);

        if (pkgFeatures && pkgFeatures.length > 0) {
          const usageRows = pkgFeatures.map((f: Record<string, unknown>) => ({
            client_package_id: newCp.id,
            deliverable_type: f.deliverable_type,
            used: 0,
            total: f.total_allocated,
          }));
          await getSupabase().from('package_usage').insert(usageRows);
        }
      }

      setShowAssignPackage(false);
      setAssignForm({ package_id: '', start_date: new Date().toISOString().split('T')[0], renewal_date: '', custom_monthly_fee: '', notes: '' });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to assign package:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUsage = async (clientPackageId: string, deliverableType: string, field: 'used' | 'total', value: number) => {
    try {
      await supabase
        .from('package_usage')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('client_package_id', clientPackageId)
        .eq('deliverable_type', deliverableType);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update usage:', err);
    }
  };

  // Determine usage items to display
  const displayUsageItems = client.usageItems && client.usageItems.length > 0 
    ? client.usageItems 
    : [
      { deliverable_type: 'design', label: 'Design', icon: 'image', used: client.usage.design.used, total: client.usage.design.total, unit_label: 'designs', warning_threshold: 20 },
      { deliverable_type: 'video', label: 'Video', icon: 'video', used: client.usage.video.used, total: client.usage.video.total, unit_label: 'videos', warning_threshold: 20 },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', used: client.usage.copywriting.used, total: client.usage.copywriting.total, unit_label: 'copies', warning_threshold: 20 },
      { deliverable_type: 'boost', label: 'Boost', icon: 'rocket', used: client.usage.boost.used, total: client.usage.boost.total, unit_label: 'campaigns', warning_threshold: 20 },
    ];

  return (
    <div className="space-y-6">
      {/* Business Info Section */}
      <div className="bg-[#1A1D2E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-6 relative group">
        {isAdmin && editingSection !== 'business' && (
          <button
            onClick={() => setEditingSection('business')}
            className="absolute top-4 right-14 p-2 rounded-lg bg-white/5 hover:bg-[#00D9FF]/20 text-white/40 hover:text-[#00D9FF] transition-all opacity-0 group-hover:opacity-100"
            title="Edit Business Info"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {editingSection === 'business' ? (
          // Edit Mode
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-bold text-white">Edit Business Information</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingSection(null)}
                  className="text-white/60 hover:text-white h-8"
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveBusinessInfo}
                  disabled={saving}
                  className="bg-[#39FF14]/20 hover:bg-[#39FF14]/30 text-[#39FF14] border border-[#39FF14]/30 h-8"
                >
                  <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/40 text-xs">Business Name</Label>
                <Input
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm(f => ({ ...f, business_name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/40 text-xs">Category</Label>
                <select
                  value={businessForm.category}
                  onChange={(e) => setBusinessForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full mt-1 h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
                >
                  {['Motorcycle Dealer', 'Restaurant', 'Corporate', 'Retail', 'Healthcare', 'Real Estate', 'Education', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white/40 text-xs">Location</Label>
                <Input
                  value={businessForm.location}
                  onChange={(e) => setBusinessForm(f => ({ ...f, location: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/40 text-xs">Status</Label>
                <select
                  value={businessForm.status}
                  onChange={(e) => setBusinessForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
                >
                  <option value="active">Active</option>
                  <option value="at-risk">At Risk</option>
                  <option value="churning">Churning</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div>
                <Label className="text-white/40 text-xs">Email</Label>
                <Input
                  value={businessForm.contact_email}
                  onChange={(e) => setBusinessForm(f => ({ ...f, contact_email: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/40 text-xs">Phone</Label>
                <Input
                  value={businessForm.contact_phone}
                  onChange={(e) => setBusinessForm(f => ({ ...f, contact_phone: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/40 text-xs">Website</Label>
                <Input
                  value={businessForm.contact_website}
                  onChange={(e) => setBusinessForm(f => ({ ...f, contact_website: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className="text-white/40 text-xs">Health Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={businessForm.health_score}
                  onChange={(e) => setBusinessForm(f => ({ ...f, health_score: Number(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            </div>
          </div>
        ) : (
          // View Mode
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{client.businessName}</h3>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white/60">
                    {client.category}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#00D9FF] mb-1">{client.healthScore}</div>
                <div className="text-xs text-white/40">Health Score</div>
              </div>
            </div>

            <div className="space-y-3">
              {client.location && (
                <div className="flex items-center gap-3 text-white/70">
                  <MapPin className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-sm">{client.location}</span>
                </div>
              )}
              {client.contactInfo.email && (
                <div className="flex items-center gap-3 text-white/70">
                  <Mail className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-sm">{client.contactInfo.email}</span>
                </div>
              )}
              {client.contactInfo.phone && (
                <div className="flex items-center gap-3 text-white/70">
                  <Phone className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-sm">{client.contactInfo.phone}</span>
                </div>
              )}
              {client.contactInfo.website && (
                <div className="flex items-center gap-3 text-white/70">
                  <Globe className="w-4 h-4 text-[#00D9FF]" />
                  <a 
                    href={client.contactInfo.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm hover:text-[#00D9FF] transition-colors"
                  >
                    {client.contactInfo.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3 text-white/70 pt-2 border-t border-white/10">
                <User className="w-4 h-4 text-[#FF006E]" />
                <div className="flex items-center gap-2 flex-1">
                  {editingManager ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={selectedManagerId}
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="flex-1 h-8 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button onClick={handleSaveManager} disabled={saving} className="p-1 text-[#39FF14] hover:bg-[#39FF14]/20 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingManager(false)} className="p-1 text-white/40 hover:bg-white/10 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {client.accountManager.avatar && (
                        <img 
                          src={client.accountManager.avatar} 
                          alt={client.accountManager.name}
                          className="w-6 h-6 rounded-full border border-white/20"
                        />
                      )}
                      <span className="text-sm">
                        <span className="text-white/40">Account Manager: </span>
                        {client.accountManager.name}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => setEditingManager(true)}
                          className="p-1 rounded text-white/30 hover:text-[#00D9FF] hover:bg-white/5 transition-all ml-1"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Package Info Section */}
      <div className="bg-[#1A1D2E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#FF006E]" />
            <h4 className="text-lg font-bold text-white">Package Information</h4>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowAssignPackage(true)}
                className="bg-[#FF006E]/20 hover:bg-[#FF006E]/30 text-[#FF006E] border border-[#FF006E]/30 h-7 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {client.package.name === 'No Package' ? 'Assign Package' : 'Change Package'}
              </Button>
            )}
            <button onClick={() => setShowPackageDetails(!showPackageDetails)} className="text-white/40 hover:text-white p-1">
              {showPackageDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-white font-semibold mb-1">{client.package.name}</div>
            <div className="flex items-center gap-2">
              <Badge className={getTierColor(client.package.tier)}>
                {client.package.tier}
              </Badge>
              <Badge variant="outline" className="border-[#FF006E]/30 text-[#FF006E]">
                {client.package.type}
              </Badge>
            </div>
          </div>

          {client.package.description && (
            <div className="text-white/50 text-sm italic">
              {client.package.description}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Start Date
              </div>
              <div className="text-white text-sm">
                {client.package.startDate ? new Date(client.package.startDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : '—'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Renewal Date
              </div>
              <div className="text-white text-sm">
                {client.package.renewalDate ? new Date(client.package.renewalDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : '—'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
              <DollarSign className="w-3 h-3" />
              Monthly Fee {client.customMonthlyFee ? '(Custom)' : ''}
            </div>
            <div className="text-2xl font-bold text-[#00D9FF]">
              {client.package.currency} {(client.customMonthlyFee || client.package.monthlyFee).toLocaleString()}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="text-white/40 text-xs mb-1">Wallet Balance</div>
            <div className="text-xl font-bold text-[#39FF14]">
              {client.wallet.currency} {client.wallet.balance.toLocaleString()}
            </div>
          </div>

          {/* Expanded Package Details */}
          {showPackageDetails && (
            <>
              {/* Package Features List */}
              {client.package.features && client.package.features.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
                    <Star className="w-3 h-3" />
                    Package Features
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {client.package.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-white/70 text-sm">
                        <Check className="w-3 h-3 text-[#39FF14]" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Package Meta */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                {client.package.platformCount && (
                  <div>
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <Layers className="w-3 h-3" />
                      Platforms
                    </div>
                    <div className="text-white text-sm font-mono">{client.package.platformCount}</div>
                  </div>
                )}
                {client.package.correctionLimit && (
                  <div>
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <Hash className="w-3 h-3" />
                      Correction Limit
                    </div>
                    <div className="text-white text-sm font-mono">{client.package.correctionLimit}</div>
                  </div>
                )}
              </div>

              {/* Deliverable Allocations Table */}
              {client.packageFeatures && client.packageFeatures.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
                    <Package className="w-3 h-3" />
                    Deliverable Allocations
                  </div>
                  <div className="space-y-2">
                    {client.packageFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-white text-sm">{feat.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white/60 text-xs font-mono">{feat.total_allocated} {feat.unit_label}</span>
                          {feat.auto_deduction && (
                            <Badge variant="outline" className="border-[#39FF14]/30 text-[#39FF14] text-[10px] h-5">
                              Auto
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Team Assignments Section */}
      <TeamAssignmentsPanel clientId={client.id} />

      {/* Notes Section */}
      <div className="bg-[#1A1D2E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h4 className="text-lg font-bold text-white">Notes</h4>
          </div>
          {isAdmin && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-400 transition-all"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-3">
            <textarea
              value={notesEdit}
              onChange={(e) => setNotesEdit(e.target.value)}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-amber-400/50"
              placeholder="Add notes about this client..."
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditingNotes(false); setNotesEdit(client.notes || ''); }} className="text-white/60 h-8">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveNotes} disabled={saving} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-400/30 h-8">
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-white/60 text-sm">
            {client.notes || 'No notes added yet.'}
          </p>
        )}
      </div>

      {/* Live Usage Tracker */}
      <div className="bg-[#1A1D2E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white">Live Usage Tracker</h4>
          <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] text-xs">
            {client.package.type}
          </Badge>
        </div>

        <div className="space-y-5">
          {displayUsageItems.map((item, idx) => {
            const colorClass = isLowUsage(item.used, item.total) ? 'bg-[#FF006E]' : usageColors[idx % usageColors.length];
            return (
              <div key={item.deliverable_type}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{item.label}</span>
                    {isLowUsage(item.used, item.total) && (
                      <AlertTriangle className="w-4 h-4 text-[#FF006E]" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && editingSection === 'usage' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={item.used}
                          onChange={(e) => client.clientPackageId && handleUpdateUsage(client.clientPackageId, item.deliverable_type, 'used', Number(e.target.value))}
                          className="w-12 h-6 bg-white/5 border border-white/10 rounded text-white text-xs text-center"
                        />
                        <span className="text-white/40 text-xs">/</span>
                        <input
                          type="number"
                          min="0"
                          value={item.total}
                          onChange={(e) => client.clientPackageId && handleUpdateUsage(client.clientPackageId, item.deliverable_type, 'total', Number(e.target.value))}
                          className="w-12 h-6 bg-white/5 border border-white/10 rounded text-white text-xs text-center"
                        />
                      </div>
                    ) : (
                      <span className="text-white/60 text-sm font-mono">
                        {item.used} / {item.total}
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={getUsagePercentage(item.used, item.total)} 
                  className="h-2 bg-white/5"
                  indicatorClassName={colorClass}
                />
                {isLowUsage(item.used, item.total) && (
                  <div className="text-xs text-[#FF006E] mt-1">
                    ⚠️ Less than {item.warning_threshold}% remaining
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-4 pt-3 border-t border-white/10">
            {editingSection === 'usage' ? (
              <Button
                size="sm"
                onClick={() => setEditingSection(null)}
                className="bg-[#39FF14]/20 hover:bg-[#39FF14]/30 text-[#39FF14] border border-[#39FF14]/30 h-7 px-3 text-xs"
              >
                <Check className="w-3 h-3 mr-1" /> Done Editing
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setEditingSection('usage')}
                className="bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 h-7 px-3 text-xs"
              >
                <Pencil className="w-3 h-3 mr-1" /> Edit Usage
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Assign Package Dialog */}
      <Dialog open={showAssignPackage} onOpenChange={setShowAssignPackage}>
        <DialogContent className="bg-[#1A1D2E] border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-[#00D9FF]">
              {client.package.name === 'No Package' ? 'Assign Package' : 'Change Package'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs">Select Package *</Label>
              <select
                value={assignForm.package_id}
                onChange={(e) => setAssignForm(f => ({ ...f, package_id: e.target.value }))}
                className="w-full mt-1 h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
              >
                <option value="">-- Select Package --</option>
                {availablePackages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tier}) — {p.currency} {p.monthly_fee?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Start Date *</Label>
                <Input
                  type="date"
                  value={assignForm.start_date}
                  onChange={(e) => setAssignForm(f => ({ ...f, start_date: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Renewal Date</Label>
                <Input
                  type="date"
                  value={assignForm.renewal_date}
                  onChange={(e) => setAssignForm(f => ({ ...f, renewal_date: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-xs">Custom Monthly Fee (Override)</Label>
              <Input
                type="number"
                value={assignForm.custom_monthly_fee}
                onChange={(e) => setAssignForm(f => ({ ...f, custom_monthly_fee: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Leave blank to use package default"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Notes</Label>
              <textarea
                value={assignForm.notes}
                onChange={(e) => setAssignForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-[#00D9FF]/50"
                placeholder="Any special notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAssignPackage(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleAssignPackage}
              disabled={saving || !assignForm.package_id}
              className="bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] border border-[#00D9FF]/30"
            >
              {saving ? 'Assigning...' : 'Assign Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
