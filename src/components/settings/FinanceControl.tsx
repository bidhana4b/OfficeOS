import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  FileText,
  Receipt,
  CalendarClock,
  Bell,
  Edit3,
  Calendar,
  BarChart3,
  Lock,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeRules as mockFinanceRules } from './defaults';
import { ToggleSetting } from './UsersRolesControl';
import { useSettings } from '@/hooks/useSettings';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

export default function FinanceControl() {
  const settingsQuery = useSettings<Record<string, unknown>>('finance_rules');
  const [rules, setRules] = useState(mockFinanceRules);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (settingsQuery.data) {
      setRules({
        defaultTemplate: (settingsQuery.data.defaultTemplate as string) || mockFinanceRules.defaultTemplate,
        autoInvoiceGeneration: (settingsQuery.data.autoInvoiceGeneration as boolean) ?? mockFinanceRules.autoInvoiceGeneration,
        recurringBillingCycle: (settingsQuery.data.recurringBillingCycle as string) || mockFinanceRules.recurringBillingCycle,
        paymentReminderDays: (settingsQuery.data.paymentReminderDays as number[]) || mockFinanceRules.paymentReminderDays,
        manualEditPermission: (settingsQuery.data.manualEditPermission as boolean) ?? mockFinanceRules.manualEditPermission,
        backdatedEntryLimit: (settingsQuery.data.backdatedEntryLimit as number) || mockFinanceRules.backdatedEntryLimit,
        approvalRequired: (settingsQuery.data.approvalRequired as boolean) ?? mockFinanceRules.approvalRequired,
        monthlyClosingDay: (settingsQuery.data.monthlyClosingDay as number) || mockFinanceRules.monthlyClosingDay,
        autoFinancialReport: (settingsQuery.data.autoFinancialReport as boolean) ?? mockFinanceRules.autoFinancialReport,

      });
    }
  }, [settingsQuery.data]);

  const handleSaveFinanceRules = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          tenant_id: DEMO_TENANT_ID,
          section: 'finance_rules',
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
            <div className="w-8 h-8 rounded-lg bg-titan-lime/10 border border-titan-lime/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-titan-lime" />
            </div>
            Financial System Control
          </h2>
          <p className="font-mono text-xs text-white/30 mt-1">Invoice settings, ledger rules, and profit & loss configuration</p>
        </div>
        <button
          onClick={handleSaveFinanceRules}
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

      {/* Invoice Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-titan-lime/60" />
          Invoice Settings
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <FileText className="w-3 h-3 text-white/40" />
                Default invoice template
              </p>
              <p className="font-mono text-[10px] text-white/30">Template used for auto-generated invoices</p>
            </div>
            <select
              value={rules.defaultTemplate}
              onChange={(e) => setRules({ ...rules, defaultTemplate: e.target.value })}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              <option value="Modern Dark">Modern Dark</option>
              <option value="Classic White">Classic White</option>
              <option value="Minimal">Minimal</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>

          <ToggleSetting
            label="Auto invoice generation"
            description="Automatically generate invoices based on billing cycle"
            enabled={rules.autoInvoiceGeneration}
            onToggle={() => setRules({ ...rules, autoInvoiceGeneration: !rules.autoInvoiceGeneration })}
          />

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <CalendarClock className="w-3 h-3 text-white/40" />
                Recurring billing cycle
              </p>
            </div>
            <select
              value={rules.recurringBillingCycle}
              onChange={(e) => setRules({ ...rules, recurringBillingCycle: e.target.value as any })}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono focus:border-titan-cyan/40 focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <p className="font-mono text-xs text-white/70 flex items-center gap-1 mb-2">
              <Bell className="w-3 h-3 text-white/40" />
              Payment reminder schedule (days before due)
            </p>
            <div className="flex gap-2">
              {rules.paymentReminderDays.map((day, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-titan-cyan/5 border border-titan-cyan/20 font-mono text-xs text-titan-cyan/70"
                >
                  {day}d
                </div>
              ))}
              <button className="px-3 py-1.5 rounded-lg border border-dashed border-white/20 font-mono text-[10px] text-white/30 hover:text-white/50">
                + Add
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ledger Rules */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <Edit3 className="w-4 h-4 text-titan-purple/60" />
          Ledger Rules
        </h3>
        <div className="space-y-3">
          <ToggleSetting
            label="Manual edit permission"
            description="Allow manual editing of ledger entries (Super Admin only)"
            enabled={rules.manualEditPermission}
            onToggle={() => setRules({ ...rules, manualEditPermission: !rules.manualEditPermission })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70">Backdated entry limit</p>
              <p className="font-mono text-[10px] text-white/30">Max days back an entry can be backdated</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rules.backdatedEntryLimit}
                onChange={(e) => setRules({ ...rules, backdatedEntryLimit: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-white/30">days</span>
            </div>
          </div>
          <ToggleSetting
            label="Approval required for expenses"
            description="Require manager approval before logging an expense"
            enabled={rules.approvalRequired}
            onToggle={() => setRules({ ...rules, approvalRequired: !rules.approvalRequired })}
          />
        </div>
      </motion.div>

      {/* Profit & Loss Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
      >
        <h3 className="font-display font-bold text-sm text-white/80 flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-titan-cyan/60" />
          Profit & Loss Settings
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="font-mono text-xs text-white/70 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-white/40" />
                Monthly closing day
              </p>
              <p className="font-mono text-[10px] text-white/30">Day of month when books are closed</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="31"
                value={rules.monthlyClosingDay}
                onChange={(e) => setRules({ ...rules, monthlyClosingDay: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 font-mono text-right focus:border-titan-cyan/40 focus:outline-none"
              />
            </div>
          </div>
          <ToggleSetting
            label="Auto financial report generation"
            description="Automatically generate P&L reports at month close"
            enabled={rules.autoFinancialReport}
            onToggle={() => setRules({ ...rules, autoFinancialReport: !rules.autoFinancialReport })}
          />
        </div>
      </motion.div>
    </div>
  );
}
