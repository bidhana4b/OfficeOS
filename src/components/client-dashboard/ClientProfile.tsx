import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  Save,
  X,
  ArrowLeft,
  Edit3,
  CheckCircle2,
  Loader2,
  Instagram,
  Facebook,
  Link as LinkIcon,
  Briefcase,
  AlertCircle,
} from 'lucide-react';

interface ClientProfileData {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  category: string;
  address: string;
  website: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  timezone: string;
  business_hours: string;
  notes: string;
}

const categories = [
  'E-Commerce', 'Restaurant', 'Real Estate', 'Healthcare', 'Education',
  'Fashion', 'Technology', 'Fitness', 'Beauty & Salon', 'Travel',
  'Automotive', 'Legal', 'Finance', 'Manufacturing', 'Other',
];

const timezones = [
  'Asia/Dhaka (GMT+6)',
  'Asia/Kolkata (GMT+5:30)',
  'Asia/Dubai (GMT+4)',
  'Europe/London (GMT+0)',
  'America/New_York (GMT-5)',
];

export default function ClientProfilePage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClientProfileData>>({});

  const fetchProfile = useCallback(async () => {
    try {
      const clientId = user?.client_id;
      if (!clientId) { setLoading(false); return; }

      const { data, error: err } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (err) throw err;

      if (data) {
        const profileData: ClientProfileData = {
          id: data.id,
          business_name: data.business_name || '',
          contact_person: data.contact_person || '',
          email: data.email || data.contact_email || '',
          phone: data.phone || data.contact_phone || '',
          category: data.category || '',
          address: data.address || data.location || '',
          website: data.website || data.contact_website || '',
          social_links: data.social_links || {},
          timezone: data.timezone || 'Asia/Dhaka (GMT+6)',
          business_hours: data.business_hours || '9:00 AM - 6:00 PM',
          notes: data.notes || '',
        };
        setProfile(profileData);
        setEditForm(profileData);
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.client_id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setError(null);
    try {
      // Build update object with only fields that have values
      const updates: Record<string, unknown> = {
        business_name: editForm.business_name || profile.business_name,
        category: editForm.category,
        updated_at: new Date().toISOString(),
      };

      // Add fields that may or may not exist in the table
      // We use a single update that includes all possible columns
      if (editForm.contact_person !== undefined) updates.contact_person = editForm.contact_person;
      if (editForm.email !== undefined) {
        updates.contact_email = editForm.email;
      }
      if (editForm.phone !== undefined) {
        updates.contact_phone = editForm.phone;
      }
      if (editForm.address !== undefined) {
        updates.location = editForm.address;
        updates.address = editForm.address;
      }
      if (editForm.website !== undefined) {
        updates.contact_website = editForm.website;
      }
      if (editForm.social_links !== undefined) updates.social_links = editForm.social_links;
      if (editForm.timezone !== undefined) updates.timezone = editForm.timezone;
      if (editForm.business_hours !== undefined) updates.business_hours = editForm.business_hours;
      if (editForm.notes !== undefined) updates.notes = editForm.notes;

      const { error: updateErr } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      setProfile({ ...profile, ...editForm } as ClientProfileData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save profile:', e);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
          <p className="font-mono text-xs text-white/30">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div>
            <h1 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
              <User className="w-5 h-5 text-titan-cyan" />
              Profile
            </h1>
            <p className="font-mono text-[10px] text-white/30 mt-0.5">Business information & settings</p>
          </div>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-titan-cyan/10 border border-titan-cyan/25 active:scale-95 transition-transform"
          >
            <Edit3 className="w-3.5 h-3.5 text-titan-cyan" />
            <span className="font-mono text-[10px] text-titan-cyan">Edit</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditing(false); setEditForm(profile || {}); setError(null); }}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-titan-lime/15 border border-titan-lime/30 active:scale-95 transition-transform disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 text-titan-lime animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-titan-lime" />
              )}
              <span className="font-mono text-[10px] text-titan-lime">Save</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mx-4 mb-2 px-3 py-2 rounded-lg bg-titan-lime/10 border border-titan-lime/25 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-titan-lime" />
            <span className="font-mono text-[10px] text-titan-lime">Profile updated successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mx-4 mb-2 px-3 py-2 rounded-lg bg-titan-magenta/10 border border-titan-magenta/25 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-titan-magenta" />
            <span className="font-mono text-[10px] text-titan-magenta">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-6 space-y-4">
        {/* Business Info Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h3 className="font-display font-bold text-xs text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" /> Business Information
          </h3>

          <div className="glass-card p-3 space-y-3">
            <ProfileField
              icon={Building2}
              label="Business Name"
              value={editForm.business_name || ''}
              editing={editing}
              onChange={(v) => setEditForm({ ...editForm, business_name: v })}
            />
            <ProfileField
              icon={User}
              label="Contact Person"
              value={editForm.contact_person || ''}
              editing={editing}
              onChange={(v) => setEditForm({ ...editForm, contact_person: v })}
            />
            <ProfileField
              icon={Mail}
              label="Email"
              value={editForm.email || ''}
              editing={editing}
              type="email"
              onChange={(v) => setEditForm({ ...editForm, email: v })}
            />
            <ProfileField
              icon={Phone}
              label="Phone"
              value={editForm.phone || ''}
              editing={editing}
              type="tel"
              onChange={(v) => setEditForm({ ...editForm, phone: v })}
            />
            <ProfileField
              icon={MapPin}
              label="Address"
              value={editForm.address || ''}
              editing={editing}
              onChange={(v) => setEditForm({ ...editForm, address: v })}
            />
            <ProfileField
              icon={Globe}
              label="Website"
              value={editForm.website || ''}
              editing={editing}
              type="url"
              onChange={(v) => setEditForm({ ...editForm, website: v })}
            />
          </div>
        </motion.div>

        {/* Category & Schedule */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <h3 className="font-display font-bold text-xs text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5" /> Category & Schedule
          </h3>

          <div className="glass-card p-3 space-y-3">
            {editing ? (
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1">Industry Category</label>
                <select
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                >
                  <option value="" className="bg-titan-bg">Select category...</option>
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-titan-bg">{c}</option>
                  ))}
                </select>
              </div>
            ) : (
              <ProfileField
                icon={Briefcase}
                label="Industry Category"
                value={editForm.category || 'Not set'}
                editing={false}
                onChange={() => {}}
              />
            )}

            {editing ? (
              <div>
                <label className="font-mono text-[10px] text-white/40 block mb-1">Timezone</label>
                <select
                  value={editForm.timezone || ''}
                  onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:border-titan-cyan/50 focus:outline-none"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz} className="bg-titan-bg">{tz}</option>
                  ))}
                </select>
              </div>
            ) : (
              <ProfileField
                icon={Clock}
                label="Timezone"
                value={editForm.timezone || 'Not set'}
                editing={false}
                onChange={() => {}}
              />
            )}

            <ProfileField
              icon={Clock}
              label="Business Hours"
              value={editForm.business_hours || ''}
              editing={editing}
              onChange={(v) => setEditForm({ ...editForm, business_hours: v })}
            />
          </div>
        </motion.div>

        {/* Social Media Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          <h3 className="font-display font-bold text-xs text-white/50 uppercase tracking-wider flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5" /> Social Media
          </h3>

          <div className="glass-card p-3 space-y-3">
            <ProfileField
              icon={Facebook}
              label="Facebook"
              value={editForm.social_links?.facebook || ''}
              editing={editing}
              placeholder="https://facebook.com/..."
              onChange={(v) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, facebook: v } })}
            />
            <ProfileField
              icon={Instagram}
              label="Instagram"
              value={editForm.social_links?.instagram || ''}
              editing={editing}
              placeholder="https://instagram.com/..."
              onChange={(v) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, instagram: v } })}
            />
            <ProfileField
              icon={LinkIcon}
              label="TikTok"
              value={editForm.social_links?.tiktok || ''}
              editing={editing}
              placeholder="https://tiktok.com/@..."
              onChange={(v) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, tiktok: v } })}
            />
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <h3 className="font-display font-bold text-xs text-white/50 uppercase tracking-wider">Notes</h3>
          <div className="glass-card p-3">
            {editing ? (
              <textarea
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
              />
            ) : (
              <p className="font-mono text-xs text-white/50">
                {profile?.notes || 'No notes'}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
  editing,
  type = 'text',
  placeholder,
  onChange,
}: {
  icon: typeof User;
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-white/30" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] text-white/40 mb-0.5">{label}</p>
        {editing ? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none"
          />
        ) : (
          <p className="font-mono text-xs text-white/70 truncate">{value || 'Not set'}</p>
        )}
      </div>
    </div>
  );
}
