import { useState, useEffect, useCallback } from 'react';
import { ClientList } from './ClientList';
import { ClientProfile } from './ClientProfile';
import { ActivityTimeline } from './ActivityTimeline';
import { ClientPerformancePanel } from './ClientPerformancePanel';
import { mockClients, mockActivities, mockPerformance } from './mock-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  X, Plus, UserPlus, Package, Users, Database, AlertCircle, 
  Building2, User, Phone, Mail, Globe, MapPin, ChevronRight, ChevronLeft,
  Shield, CreditCard, Eye, EyeOff, Key, CheckCircle2, Loader2, 
  DollarSign, Star, Zap, FileText, UserCheck, Hash, Info, Sparkles,
  Megaphone, BookUser, ClipboardList, ArrowRight, Check
} from 'lucide-react';
import { useClients, useClientActivities, useClientPerformance } from '@/hooks/useClients';
import { onboardClient, updateClient, deleteClient, subscribeToTable, getClientListForSelect } from '@/lib/data-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ClientHub() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    // Step 1: Business Info
    business_name: '',
    category: 'Other',
    location: '',
    contact_email: '',
    contact_phone: '',
    contact_website: '',
    // Owner Info
    owner_name: '',
    owner_phone: '',
    // Manager/Contact Person
    manager_name: '',
    manager_phone: '',
    // Step 2: Package Selection
    package_id: '',
    // Step 3: Boost Budget
    monthly_boost_budget: '',
    boost_budget_currency: 'USD',
    // Step 4: Team Assignment
    account_manager_id: '',
    // Step 5: Portal Access
    create_login: true,
    login_password: '123456',
    // Referral
    referrer_name: '',
    // Notes
    onboarding_notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const TOTAL_STEPS = 5;
  const [showPassword, setShowPassword] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<{id: string; name: string; tier: string; monthly_fee: number; description?: string; features?: string[]; platform_count?: number}[]>([]);
  const [availableManagers, setAvailableManagers] = useState<{id: string; name: string; avatar: string; primary_role: string}[]>([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<{id: string; name: string; avatar: string; primary_role: string}[]>([]);

  // Load packages and team members for selection
  useEffect(() => {
    if (!supabase || !showCreateDialog) return;
    
    supabase.from('packages').select('id, name, tier, monthly_fee, description, features, platform_count').eq('tenant_id', DEMO_TENANT_ID).eq('is_active', true).order('monthly_fee').then(({ data }) => {
      setAvailablePackages((data || []) as any);
    });
    
    supabase.from('team_members').select('id, name, avatar, primary_role').eq('tenant_id', DEMO_TENANT_ID).in('primary_role', ['Account Manager', 'account_manager']).then(({ data }) => {
      if (data && data.length > 0) {
        setAvailableManagers(data as any);
      } else {
        // Fallback to all team members if no account managers found
        supabase.from('team_members').select('id, name, avatar, primary_role').eq('tenant_id', DEMO_TENANT_ID).limit(10).then(({ data: all }) => {
          setAvailableManagers((all || []) as any);
        });
      }
    });

    // Load all team members for display
    supabase.from('team_members').select('id, name, avatar, primary_role').eq('tenant_id', DEMO_TENANT_ID).order('name').limit(20).then(({ data }) => {
      setAvailableTeamMembers((data || []) as any);
    });
  }, [showCreateDialog]);

  // Supabase data with mock fallbacks
  const clientsQuery = useClients();
  const activitiesQuery = useClientActivities(selectedClientId || undefined);
  const performanceQuery = useClientPerformance(selectedClientId || '');

  const clients = clientsQuery.data.length > 0 ? clientsQuery.data : mockClients;
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientActivities = activitiesQuery.data.length > 0
    ? activitiesQuery.data
    : mockActivities.filter((a) => a.clientId === selectedClientId);
  const clientPerformance = performanceQuery.data || (selectedClientId ? mockPerformance[selectedClientId] : null);

  // Real-time subscription for clients
  useEffect(() => {
    const unsubscribe = subscribeToTable('clients', () => {
      clientsQuery.refetch();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsQuery.refetch]);

  // Real-time subscription for activities
  useEffect(() => {
    const unsubscribe = subscribeToTable('activities', () => {
      activitiesQuery.refetch();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, activitiesQuery.refetch]);

  const handleCreateClient = useCallback(async () => {
    if (!newClientForm.business_name.trim()) return;
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(false);
    try {
      const result = await onboardClient({
        business_name: newClientForm.business_name,
        category: newClientForm.category,
        location: newClientForm.location,
        contact_email: newClientForm.contact_email,
        contact_phone: newClientForm.contact_phone,
        contact_website: newClientForm.contact_website,
        owner_name: newClientForm.owner_name || undefined,
        owner_phone: newClientForm.owner_phone || undefined,
        manager_name: newClientForm.manager_name || undefined,
        manager_phone: newClientForm.manager_phone || undefined,
        account_manager_id: newClientForm.account_manager_id || undefined,
        package_id: newClientForm.package_id || undefined,
        monthly_boost_budget: newClientForm.monthly_boost_budget ? Number(newClientForm.monthly_boost_budget) : undefined,
        boost_budget_currency: newClientForm.boost_budget_currency || 'USD',
        create_login: newClientForm.create_login && !!newClientForm.contact_email,
        login_password: newClientForm.login_password || '123456',
        referrer_name: newClientForm.referrer_name || undefined,
        onboarding_notes: newClientForm.onboarding_notes || undefined,
      });
      setCreateSuccess(true);
      setTimeout(() => {
        setShowCreateDialog(false);
        setOnboardStep(1);
        setCreateSuccess(false);
        setNewClientForm({ 
          business_name: '', category: 'Other', location: '', contact_email: '', contact_phone: '', 
          contact_website: '', create_login: true, login_password: '123456', package_id: '', 
          account_manager_id: '', owner_name: '', owner_phone: '', manager_name: '', manager_phone: '',
          monthly_boost_budget: '', boost_budget_currency: 'USD', referrer_name: '', onboarding_notes: '',
        });
      }, 2000);
      await clientsQuery.refetch();
      // Auto-select the new client
      if (result.client?.id) {
        setSelectedClientId(result.client.id as string);
      }
    } catch (err: any) {
      console.error('Failed to create client:', err);
      setCreateError(err?.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  }, [newClientForm, clientsQuery]);

  const isUsingRealData = clientsQuery.data.length > 0;

  return (
    <div className="flex h-screen bg-[#0A0E27]">
      {/* Left Sidebar - Client List */}
      <div className="w-80 border-r border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex flex-col">
        <div className="p-3 border-b border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm text-white/70">Clients</span>
            <Button
              size="sm"
              onClick={() => { setShowCreateDialog(true); setOnboardStep(1); }}
              className="bg-titan-cyan/20 hover:bg-titan-cyan/30 text-titan-cyan border border-titan-cyan/30 h-7 px-2 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3" style={{ color: isUsingRealData ? '#39FF14' : '#FFB800' }} />
            <span className="text-[10px] font-mono" style={{ color: isUsingRealData ? '#39FF14' : '#FFB800' }}>
              {isUsingRealData ? `${clientsQuery.data.length} from DB` : 'Mock data (DB empty)'}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ClientList
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />
        </div>
      </div>

      {/* ==================== 5-STEP CLIENT ONBOARDING WIZARD ==================== */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!creating) { setShowCreateDialog(open); if (!open) { setOnboardStep(1); setCreateError(null); setCreateSuccess(false); } } }}>
        <DialogContent className="bg-[#0D1230] border border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Wizard Header */}
          <div className="sticky top-0 z-10 bg-[#0D1230] border-b border-white/[0.06] p-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-cyan/20 to-titan-purple/20 border border-titan-cyan/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-titan-cyan" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-lg text-white">নতুন কাস্টমার রেজিস্ট্রেশন</h2>
                  <p className="font-mono text-[10px] text-white/30">New Client Onboarding Wizard</p>
                  <p className="font-mono text-[10px] text-white/30">Creates client + wallet + messaging workspace + default channels automatically</p>
                </div>
              </div>
              <button
                onClick={() => !creating && setShowCreateDialog(false)}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-1">
              {[
                { num: 1, label: 'প্রতিষ্ঠানের তথ্য', en: 'Business Info', icon: Building2 },
                { num: 2, label: 'প্যাকেজ সিলেকশন', en: 'Package', icon: Package },
                { num: 3, label: 'বুস্ট বাজেট', en: 'Boost Budget', icon: Megaphone },
                { num: 4, label: 'টিম অ্যাসাইন', en: 'Team', icon: Users },
                { num: 5, label: 'রিভিউ ও তৈরি', en: 'Review', icon: CheckCircle2 },
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center flex-1">
                  <button
                    onClick={() => {
                      if (step.num < onboardStep) setOnboardStep(step.num);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono transition-all w-full',
                      onboardStep === step.num
                        ? 'bg-titan-cyan/15 border border-titan-cyan/30 text-titan-cyan'
                        : step.num < onboardStep
                        ? 'text-titan-lime/70 cursor-pointer hover:bg-white/[0.04]'
                        : 'text-white/20'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                      onboardStep === step.num
                        ? 'bg-titan-cyan/20 text-titan-cyan border border-titan-cyan/30'
                        : step.num < onboardStep
                        ? 'bg-titan-lime/15 text-titan-lime border border-titan-lime/30'
                        : 'bg-white/[0.04] text-white/20 border border-white/[0.06]'
                    )}>
                      {step.num < onboardStep ? <Check className="w-2.5 h-2.5" /> : step.num}
                    </div>
                    <span className="hidden sm:inline truncate">{step.en}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i < onboardStep ? 'bg-titan-cyan' : 'bg-white/[0.06]'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Error Display */}
          {createError && (
            <div className="mx-5 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="font-mono text-xs text-red-400">{createError}</p>
              <button onClick={() => setCreateError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Success State */}
          <AnimatePresence>
            {createSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-5 mt-4 p-5 rounded-xl bg-titan-lime/10 border border-titan-lime/30 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-titan-lime/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-titan-lime" />
                </div>
                <p className="font-display font-bold text-lg text-titan-lime">সফলভাবে তৈরি হয়েছে! 🎉</p>
                <p className="font-mono text-xs text-titan-lime/60 mt-1">Client onboarded successfully!</p>
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  <span className="px-2 py-0.5 rounded-full bg-titan-lime/15 text-[10px] font-mono text-titan-lime/80">✅ Client Profile</span>
                  <span className="px-2 py-0.5 rounded-full bg-titan-lime/15 text-[10px] font-mono text-titan-lime/80">✅ Wallet</span>
                  <span className="px-2 py-0.5 rounded-full bg-titan-lime/15 text-[10px] font-mono text-titan-lime/80">✅ Workspace</span>
                  <span className="px-2 py-0.5 rounded-full bg-titan-lime/15 text-[10px] font-mono text-titan-lime/80">✅ Channels</span>
                  {newClientForm.create_login && newClientForm.contact_email && (
                    <span className="px-2 py-0.5 rounded-full bg-titan-lime/15 text-[10px] font-mono text-titan-lime/80">✅ Portal Login</span>
                  )}
                  {newClientForm.package_id && (
                    <span className="px-2 py-0.5 rounded-full bg-titan-lime/15 text-[10px] font-mono text-titan-lime/80">✅ Package Assigned</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          {!createSuccess && (
            <div className="p-5 min-h-[320px]">
              <AnimatePresence mode="wait">
                {/* ==================== STEP 1: BUSINESS INFO ==================== */}
                {onboardStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-titan-cyan/60" />
                      <h3 className="font-display font-bold text-sm text-white/80">প্রতিষ্ঠানের তথ্য (Business Information)</h3>
                    </div>

                    {/* Business Name */}
                    <div>
                      <Label className="text-white/50 text-xs flex items-center gap-1">
                        প্রতিষ্ঠানের নাম <span className="text-titan-magenta">*</span>
                      </Label>
                      <Input
                        value={newClientForm.business_name}
                        onChange={(e) => setNewClientForm((f) => ({ ...f, business_name: e.target.value }))}
                        className="bg-white/[0.04] border-white/[0.08] text-white mt-1 focus:border-titan-cyan/40"
                        placeholder="e.g. Apex Motors Ltd."
                        autoFocus
                      />
                    </div>

                    {/* Owner Info Section */}
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-3">
                      <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3 h-3" /> প্রতিষ্ঠান মালিকের তথ্য (Owner Info)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-white/50 text-[11px]">মালিকের নাম <span className="text-titan-magenta">*</span></Label>
                          <Input
                            value={newClientForm.owner_name}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, owner_name: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm focus:border-titan-cyan/40"
                            placeholder="Owner's full name"
                          />
                        </div>
                        <div>
                          <Label className="text-white/50 text-[11px]">মালিকের মোবাইল <span className="text-titan-magenta">*</span></Label>
                          <Input
                            value={newClientForm.owner_phone}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, owner_phone: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm focus:border-titan-cyan/40"
                            placeholder="+880 1711-000000"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manager/Contact Person */}
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-3">
                      <div>
                        <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                          <BookUser className="w-3 h-3" /> ম্যানেজার/যোগাযোগকারীর তথ্য (Contact Person)
                        </p>
                        <p className="font-mono text-[9px] text-white/20 mt-0.5">প্রতিষ্ঠানের দায়িত্ব রত ম্যানেজার অথবা সেলস পার্সোনাল তথ্য অবশ্যই দিবেন</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-white/50 text-[11px]">ম্যানেজারের নাম <span className="text-titan-magenta">*</span></Label>
                          <Input
                            value={newClientForm.manager_name}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, manager_name: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm focus:border-titan-cyan/40"
                            placeholder="Manager's name"
                          />
                        </div>
                        <div>
                          <Label className="text-white/50 text-[11px]">ম্যানেজারের মোবাইল <span className="text-titan-magenta">*</span></Label>
                          <Input
                            value={newClientForm.manager_phone}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, manager_phone: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm focus:border-titan-cyan/40"
                            placeholder="+880 1711-000000"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white/50 text-xs">ক্যাটাগরি (Category)</Label>
                        <select
                          value={newClientForm.category}
                          onChange={(e) => setNewClientForm((f) => ({ ...f, category: e.target.value }))}
                          className="w-full mt-1 h-9 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 focus:border-titan-cyan/40 focus:outline-none"
                        >
                          <option value="Other">Other</option>
                          <option value="Motorcycle Dealer">Motorcycle Dealer</option>
                          <option value="Restaurant">Restaurant / Food</option>
                          <option value="Corporate">Corporate</option>
                          <option value="E-Commerce">E-Commerce</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Education">Education</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Fashion">Fashion & Clothing</option>
                          <option value="Beauty">Beauty & Salon</option>
                          <option value="Automotive">Automotive</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Fitness">Fitness & Gym</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-white/50 text-xs">লোকেশন (Location)</Label>
                        <Input
                          value={newClientForm.location}
                          onChange={(e) => setNewClientForm((f) => ({ ...f, location: e.target.value }))}
                          className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm focus:border-titan-cyan/40"
                          placeholder="Dhaka, Bangladesh"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white/50 text-xs">ইমেইল (Email)</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 z-10" />
                          <Input
                            value={newClientForm.contact_email}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, contact_email: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm pl-9 focus:border-titan-cyan/40"
                            placeholder="info@example.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/50 text-xs">ফোন (Phone)</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 z-10" />
                          <Input
                            value={newClientForm.contact_phone}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, contact_phone: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm pl-9 focus:border-titan-cyan/40"
                            placeholder="+880 1711-000000"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/50 text-xs">ওয়েবসাইট/ফেসবুক পেইজ লিংক</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 z-10" />
                        <Input
                          value={newClientForm.contact_website}
                          onChange={(e) => setNewClientForm((f) => ({ ...f, contact_website: e.target.value }))}
                          className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm pl-9 focus:border-titan-cyan/40"
                          placeholder="https://facebook.com/yourpage or https://example.com"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================== STEP 2: PACKAGE SELECTION ==================== */}
                {onboardStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-titan-purple/60" />
                      <h3 className="font-display font-bold text-sm text-white/80">প্যাকেজ সিলেক্ট করুন (Select Package)</h3>
                    </div>
                    <p className="font-mono text-[10px] text-white/30">আপনি কোন প্যাকেজ নিতে ইচ্ছুক?</p>

                    {availablePackages.length === 0 ? (
                      <div className="p-6 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center">
                        <Package className="w-8 h-8 text-white/10 mx-auto mb-2" />
                        <p className="font-mono text-xs text-white/30">No packages found in database.</p>
                        <p className="font-mono text-[10px] text-white/20 mt-1">Create packages first in Package Hub, or skip this step.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {/* No package option */}
                        <button
                          type="button"
                          onClick={() => setNewClientForm((f) => ({ ...f, package_id: '' }))}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-all',
                            !newClientForm.package_id
                              ? 'border-titan-cyan/40 bg-titan-cyan/10'
                              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                              <X className="w-4 h-4 text-white/30" />
                            </div>
                            <div>
                              <p className="text-xs font-mono text-white/60">কাস্টম প্যাকেজ (আলোচনা সাপেক্ষে)</p>
                              <p className="text-[10px] font-mono text-white/30">No package - assign later</p>
                            </div>
                          </div>
                        </button>

                        {/* Available packages */}
                        {availablePackages.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setNewClientForm((f) => ({ ...f, package_id: pkg.id }))}
                            className={cn(
                              'w-full text-left p-4 rounded-lg border transition-all',
                              newClientForm.package_id === pkg.id
                                ? 'border-titan-cyan/40 bg-titan-cyan/10 shadow-lg shadow-titan-cyan/5'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center',
                                  pkg.tier === 'premium' || pkg.tier === 'Premium' ? 'bg-titan-magenta/15 border border-titan-magenta/30' :
                                  pkg.tier === 'standard' || pkg.tier === 'Standard' ? 'bg-titan-cyan/15 border border-titan-cyan/30' :
                                  'bg-titan-purple/15 border border-titan-purple/30'
                                )}>
                                  <Star className={cn(
                                    'w-4 h-4',
                                    pkg.tier === 'premium' || pkg.tier === 'Premium' ? 'text-titan-magenta' :
                                    pkg.tier === 'standard' || pkg.tier === 'Standard' ? 'text-titan-cyan' :
                                    'text-titan-purple'
                                  )} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white/90">{pkg.name}</p>
                                  <Badge variant="outline" className="text-[9px] border-white/20 text-white/50 mt-0.5">
                                    {pkg.tier}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-titan-cyan">৳{pkg.monthly_fee?.toLocaleString()}</p>
                                <p className="text-[10px] text-white/30 font-mono">/মাসিক</p>
                              </div>
                            </div>
                            {pkg.description && (
                              <p className="text-[10px] font-mono text-white/30 mt-1 line-clamp-2">{pkg.description}</p>
                            )}
                            {pkg.platform_count && (
                              <p className="text-[10px] font-mono text-titan-cyan/50 mt-1">{pkg.platform_count} platforms included</p>
                            )}
                            {newClientForm.package_id === pkg.id && (
                              <div className="mt-2 flex items-center gap-1 text-titan-cyan">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-[10px] font-mono">Selected</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ==================== STEP 3: BOOST BUDGET ==================== */}
                {onboardStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="w-4 h-4 text-orange-400/60" />
                      <h3 className="font-display font-bold text-sm text-white/80">ফেসবুক বুস্ট বাজেট (Boost Budget)</h3>
                    </div>
                    <p className="font-mono text-[10px] text-white/30">ফেসবুক বুস্ট এর জন্য মাসিক কত ডলার খরচ করতে চাচ্ছেন?</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: '15', label: '15$', desc: 'Basic' },
                        { value: '20', label: '20$', desc: 'Standard' },
                        { value: '50', label: '50$', desc: 'Growth' },
                        { value: '100', label: '100$', desc: 'Premium' },
                        { value: '200', label: '200$', desc: 'Enterprise' },
                        { value: 'custom', label: 'Custom', desc: 'আলোচনা সাপেক্ষে' },
                      ].map((budget) => (
                        <button
                          key={budget.value}
                          type="button"
                          onClick={() => {
                            if (budget.value === 'custom') {
                              setNewClientForm((f) => ({ ...f, monthly_boost_budget: '' }));
                            } else {
                              setNewClientForm((f) => ({ ...f, monthly_boost_budget: budget.value, boost_budget_currency: 'USD' }));
                            }
                          }}
                          className={cn(
                            'p-3 rounded-lg border text-center transition-all',
                            newClientForm.monthly_boost_budget === budget.value
                              ? 'border-orange-400/40 bg-orange-400/10 shadow-lg shadow-orange-400/5'
                              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
                          )}
                        >
                          <p className={cn(
                            'text-lg font-bold',
                            newClientForm.monthly_boost_budget === budget.value ? 'text-orange-400' : 'text-white/70'
                          )}>{budget.label}</p>
                          <p className="text-[9px] font-mono text-white/30">{budget.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Custom budget input */}
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <Label className="text-white/50 text-xs">অথবা নিজে বাজেট লিখুন (Or enter custom budget)</Label>
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15" />
                          <Input
                            type="number"
                            value={newClientForm.monthly_boost_budget}
                            onChange={(e) => setNewClientForm((f) => ({ ...f, monthly_boost_budget: e.target.value }))}
                            className="bg-white/[0.04] border-white/[0.08] text-white h-9 text-sm pl-9 focus:border-titan-cyan/40"
                            placeholder="Monthly budget amount"
                          />
                        </div>
                        <select
                          value={newClientForm.boost_budget_currency}
                          onChange={(e) => setNewClientForm((f) => ({ ...f, boost_budget_currency: e.target.value }))}
                          className="w-24 h-9 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-2 focus:border-titan-cyan/40 focus:outline-none"
                        >
                          <option value="USD">USD $</option>
                          <option value="BDT">BDT ৳</option>
                        </select>
                      </div>
                      {!newClientForm.monthly_boost_budget && (
                        <p className="font-mono text-[10px] text-white/20 mt-1.5">
                          💡 আলোচনা করে বাজেট করতে চাইলে খালি রাখুন (Leave blank to discuss later)
                        </p>
                      )}
                    </div>

                    {/* Referrer */}
                    <div>
                      <Label className="text-white/50 text-xs flex items-center gap-1.5">
                        <UserCheck className="w-3 h-3" /> রেফারকারীর নাম (Referrer Name)
                      </Label>
                      <Input
                        value={newClientForm.referrer_name}
                        onChange={(e) => setNewClientForm((f) => ({ ...f, referrer_name: e.target.value }))}
                        className="bg-white/[0.04] border-white/[0.08] text-white mt-1 h-9 text-sm focus:border-titan-cyan/40"
                        placeholder="Who referred this client?"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ==================== STEP 4: TEAM ASSIGNMENT ==================== */}
                {onboardStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-titan-purple/60" />
                      <h3 className="font-display font-bold text-sm text-white/80">টিম অ্যাসাইনমেন্ট (Team Assignment)</h3>
                    </div>

                    {/* Account Manager Selection */}
                    <div>
                      <Label className="text-white/50 text-xs flex items-center gap-1.5">
                        <Shield className="w-3 h-3" /> Account Manager
                      </Label>
                      <p className="font-mono text-[10px] text-white/20 mb-2">এই ক্লায়েন্টের দায়িত্বে থাকবেন</p>
                      
                      {availableManagers.length === 0 ? (
                        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center">
                          <Users className="w-6 h-6 text-white/10 mx-auto mb-2" />
                          <p className="font-mono text-[10px] text-white/30">No account managers found.</p>
                          <p className="font-mono text-[9px] text-white/20">Will be auto-assigned later.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => setNewClientForm((f) => ({ ...f, account_manager_id: '' }))}
                            className={cn(
                              'w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left',
                              !newClientForm.account_manager_id
                                ? 'border-titan-purple/40 bg-titan-purple/10'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                            )}
                          >
                            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-white/30" />
                            </div>
                            <div>
                              <p className="text-xs font-mono text-white/60">Auto-assign later</p>
                              <p className="text-[9px] font-mono text-white/20">পরে অ্যাসাইন করা হবে</p>
                            </div>
                          </button>
                          {availableManagers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setNewClientForm((f) => ({ ...f, account_manager_id: m.id }))}
                              className={cn(
                                'w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left',
                                newClientForm.account_manager_id === m.id
                                  ? 'border-titan-purple/40 bg-titan-purple/10 shadow-lg shadow-titan-purple/5'
                                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                              )}
                            >
                              <div className="w-8 h-8 rounded-full bg-titan-cyan/15 border border-titan-cyan/30 flex items-center justify-center text-[10px] font-mono font-bold text-titan-cyan">
                                {m.avatar && m.avatar.length <= 3 ? m.avatar : (m.name || '??').substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-mono text-white/80">{m.name}</p>
                                <p className="text-[9px] font-mono text-white/30">{m.primary_role}</p>
                              </div>
                              {newClientForm.account_manager_id === m.id && (
                                <CheckCircle2 className="w-4 h-4 text-titan-purple" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Client Portal Access */}
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                            <Key className="w-3 h-3" /> Create Client Portal Login
                          </p>
                          <p className="text-[10px] font-mono text-white/30">ক্লায়েন্ট ড্যাশবোর্ডে লগইন করতে পারবে</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewClientForm((f) => ({ ...f, create_login: !f.create_login }))}
                          className="transition-all duration-200"
                        >
                          {newClientForm.create_login ? (
                            <span className="w-10 h-5 rounded-full bg-titan-cyan/20 border border-titan-cyan/40 flex items-center px-0.5">
                              <span className="w-4 h-4 rounded-full bg-titan-cyan ml-auto transition-all" />
                            </span>
                          ) : (
                            <span className="w-10 h-5 rounded-full bg-white/10 border border-white/20 flex items-center px-0.5">
                              <span className="w-4 h-4 rounded-full bg-white/30 transition-all" />
                            </span>
                          )}
                        </button>
                      </div>
                      {newClientForm.create_login && (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-white/40 text-[10px]">Login Password</Label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/15" />
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                value={newClientForm.login_password}
                                onChange={(e) => setNewClientForm((f) => ({ ...f, login_password: e.target.value }))}
                                className="bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs pl-8 pr-8 focus:border-titan-cyan/40"
                                placeholder="Default: 123456"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
                              >
                                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          {newClientForm.contact_email ? (
                            <p className="text-[10px] font-mono text-titan-cyan/50">
                              Login: {newClientForm.contact_email} / {newClientForm.login_password || '123456'}
                            </p>
                          ) : (
                            <p className="text-[10px] font-mono text-titan-magenta/60">
                              ⚠️ Step 1 এ email দিতে হবে — login তৈরি করতে email প্রয়োজন
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-white/50 text-xs flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> অতিরিক্ত নোট (Notes)
                      </Label>
                      <textarea
                        value={newClientForm.onboarding_notes}
                        onChange={(e) => setNewClientForm((f) => ({ ...f, onboarding_notes: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm font-mono placeholder:text-white/20 focus:border-titan-cyan/40 focus:outline-none resize-none h-20"
                        placeholder="Any special requirements or notes about this client..."
                      />
                    </div>
                  </motion.div>
                )}

                {/* ==================== STEP 5: REVIEW & CREATE ==================== */}
                {onboardStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList className="w-4 h-4 text-titan-lime/60" />
                      <h3 className="font-display font-bold text-sm text-white/80">রিভিউ ও কনফার্ম (Review & Confirm)</h3>
                    </div>

                    {/* Summary Cards */}
                    <div className="space-y-3">
                      {/* Business Info Summary */}
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> প্রতিষ্ঠানের তথ্য
                          </p>
                          <button onClick={() => setOnboardStep(1)} className="text-[10px] font-mono text-titan-cyan hover:underline">Edit</button>
                        </div>
                        <div className="space-y-1 text-[11px] font-mono">
                          <p className="text-white/80 font-bold">{newClientForm.business_name || '—'}</p>
                          <p className="text-white/40">{newClientForm.category} {newClientForm.location && `· ${newClientForm.location}`}</p>
                          {newClientForm.owner_name && <p className="text-white/40">👤 {newClientForm.owner_name} {newClientForm.owner_phone && `· ${newClientForm.owner_phone}`}</p>}
                          {newClientForm.manager_name && <p className="text-white/40">📋 {newClientForm.manager_name} {newClientForm.manager_phone && `· ${newClientForm.manager_phone}`}</p>}
                          {newClientForm.contact_email && <p className="text-white/40">✉️ {newClientForm.contact_email}</p>}
                          {newClientForm.contact_phone && <p className="text-white/40">📞 {newClientForm.contact_phone}</p>}
                          {newClientForm.contact_website && <p className="text-white/40">🌐 {newClientForm.contact_website}</p>}
                        </div>
                      </div>

                      {/* Package Summary */}
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
                            <Package className="w-3 h-3" /> প্যাকেজ
                          </p>
                          <button onClick={() => setOnboardStep(2)} className="text-[10px] font-mono text-titan-cyan hover:underline">Edit</button>
                        </div>
                        {newClientForm.package_id ? (
                          <div>
                            <p className="text-xs font-mono text-white/80 font-bold">
                              {availablePackages.find(p => p.id === newClientForm.package_id)?.name || 'Selected Package'}
                            </p>
                            <p className="text-[10px] font-mono text-titan-cyan">
                              ৳{availablePackages.find(p => p.id === newClientForm.package_id)?.monthly_fee?.toLocaleString()}/mo
                              <span className="text-white/30 ml-2">
                                {availablePackages.find(p => p.id === newClientForm.package_id)?.tier}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-white/40">কাস্টম প্যাকেজ (পরে অ্যাসাইন হবে)</p>
                        )}
                      </div>

                      {/* Boost Budget Summary */}
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
                            <Megaphone className="w-3 h-3" /> বুস্ট বাজেট
                          </p>
                          <button onClick={() => setOnboardStep(3)} className="text-[10px] font-mono text-titan-cyan hover:underline">Edit</button>
                        </div>
                        {newClientForm.monthly_boost_budget ? (
                          <p className="text-xs font-mono text-orange-400 font-bold">
                            {newClientForm.boost_budget_currency === 'BDT' ? '৳' : '$'}{Number(newClientForm.monthly_boost_budget).toLocaleString()}/mo
                          </p>
                        ) : (
                          <p className="text-xs font-mono text-white/40">আলোচনা সাপেক্ষে (TBD)</p>
                        )}
                        {newClientForm.referrer_name && (
                          <p className="text-[10px] font-mono text-white/40 mt-1">📢 Referrer: {newClientForm.referrer_name}</p>
                        )}
                      </div>

                      {/* Team & Access Summary */}
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3" /> টিম ও অ্যাক্সেস
                          </p>
                          <button onClick={() => setOnboardStep(4)} className="text-[10px] font-mono text-titan-cyan hover:underline">Edit</button>
                        </div>
                        <p className="text-xs font-mono text-white/60">
                          👤 {newClientForm.account_manager_id 
                            ? availableManagers.find(m => m.id === newClientForm.account_manager_id)?.name || 'Selected' 
                            : 'Auto-assign later'}
                        </p>
                        <p className="text-xs font-mono text-white/60 mt-1">
                          🔐 {newClientForm.create_login && newClientForm.contact_email
                            ? `Portal login: ${newClientForm.contact_email}`
                            : 'No portal login'}
                        </p>
                      </div>
                    </div>

                    {/* Auto-creation info */}
                    <div className="p-3 rounded-lg bg-titan-cyan/5 border border-titan-cyan/20">
                      <p className="font-mono text-[10px] text-titan-cyan/80 font-bold uppercase tracking-wider mb-2">
                        ✨ যা স্বয়ংক্রিয়ভাবে তৈরি হবে:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-titan-cyan/10 text-[10px] font-mono text-titan-cyan/70 border border-titan-cyan/20">
                          💰 Client Wallet (BDT 0)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-titan-cyan/10 text-[10px] font-mono text-titan-cyan/70 border border-titan-cyan/20">
                          💬 Messaging Workspace
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-titan-cyan/10 text-[10px] font-mono text-titan-cyan/70 border border-titan-cyan/20">
                          📢 5 Default Channels
                        </span>
                        {newClientForm.create_login && newClientForm.contact_email && (
                          <span className="px-2 py-0.5 rounded-full bg-titan-lime/10 text-[10px] font-mono text-titan-lime/70 border border-titan-lime/20">
                            🔑 Portal Login
                          </span>
                        )}
                        {newClientForm.package_id && (
                          <span className="px-2 py-0.5 rounded-full bg-titan-purple/10 text-[10px] font-mono text-titan-purple/70 border border-titan-purple/20">
                            📦 Package + Usage Tracking
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {newClientForm.onboarding_notes && (
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1">📝 Notes</p>
                        <p className="font-mono text-xs text-white/50">{newClientForm.onboarding_notes}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Footer Navigation */}
          {!createSuccess && (
            <div className="sticky bottom-0 bg-[#0D1230] border-t border-white/[0.06] p-4 flex items-center justify-between">
              {onboardStep > 1 ? (
                <Button
                  variant="ghost"
                  onClick={() => setOnboardStep((s) => s - 1)}
                  disabled={creating}
                  className="text-white/60 hover:text-white gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  পিছনে (Back)
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                  className="text-white/60 hover:text-white"
                >
                  বাতিল (Cancel)
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/20">
                  Step {onboardStep}/{TOTAL_STEPS}
                </span>
                {onboardStep < TOTAL_STEPS ? (
                  <Button
                    onClick={() => setOnboardStep((s) => s + 1)}
                    disabled={onboardStep === 1 && !newClientForm.business_name.trim()}
                    className="bg-titan-cyan/20 hover:bg-titan-cyan/30 text-titan-cyan border border-titan-cyan/30 gap-1.5"
                  >
                    পরবর্তী (Next)
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateClient}
                    disabled={creating || !newClientForm.business_name.trim()}
                    className={cn(
                      'gap-2 font-bold',
                      creating
                        ? 'bg-white/[0.04] text-white/30'
                        : 'bg-gradient-to-r from-titan-cyan/20 to-titan-lime/20 hover:from-titan-cyan/30 hover:to-titan-lime/30 text-titan-cyan border border-titan-cyan/30 shadow-lg shadow-titan-cyan/10'
                    )}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        অনবোর্ডিং হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        কাস্টমার তৈরি করুন
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedClient ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex items-center justify-between px-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedClient.businessName}</h2>
                <p className="text-sm text-white/60">{selectedClient.category}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedClientId(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <TabsList className="border-b border-white/10 bg-transparent rounded-none px-6">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF] data-[state=active]:border-b-2 data-[state=active]:border-[#00D9FF]"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="data-[state=active]:bg-[#FF006E]/10 data-[state=active]:text-[#FF006E] data-[state=active]:border-b-2 data-[state=active]:border-[#FF006E]"
                  >
                    Activity
                  </TabsTrigger>
                  {clientPerformance && (
                    <TabsTrigger
                      value="performance"
                      className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] data-[state=active]:border-b-2 data-[state=active]:border-[#39FF14]"
                    >
                      Performance
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <ClientProfile client={selectedClient} onRefresh={clientsQuery.refetch} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <ActivityTimeline activities={clientActivities} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {clientPerformance && (
                  <TabsContent value="performance" className="flex-1 overflow-hidden m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <ClientPerformancePanel performance={clientPerformance} />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-[#00D9FF]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select a Client</h3>
              <p className="text-white/60 text-sm max-w-md">
                Choose a client from the list to view their profile, activity timeline, and
                performance metrics
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
