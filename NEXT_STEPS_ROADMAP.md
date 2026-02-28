# 🎯 Next Steps Roadmap — পরবর্তী কাজের পরিকল্পনা

**তারিখ:** March 2, 2025  
**বর্তমান Status:** 75% Complete

---

## ✅ সম্পন্ন হয়েছে (Just Completed)

### 1. System Status Overview Storyboard তৈরি করা হয়েছে
- ✅ Visual progress tracker সব phases এর জন্য
- ✅ System metrics dashboard
- ✅ Real-time status indication
- ✅ **Location:** Storyboard canvas এ available

### 2. Current Phase Status Document
- ✅ সম্পূর্ণ status report তৈরি করা হয়েছে
- ✅ **File:** `CURRENT_PHASE_STATUS.md`
- ✅ সমস্ত completed phases documented
- ✅ Pending tasks clearly listed

---

## 🔥 এখন করণীয় (Immediate Next Steps)

### Priority 2 সম্পূর্ণ করা (আনুমানিক: 4-6 hours)

#### ✅ Task 1: User System Health Monitor Enhancement — COMPLETED ⏱️ 1.5 hours
**Status:** ✅ Implemented

**Features Added:**
```typescript
✅ Orphaned Records Detection:
   - demo_users without user_profiles
   - user_profiles without demo_users  
   - team_members without user_profiles
   - demo_users (non-client) without team_members
   - clients without wallet
   - clients without workspace
   - clients without login

✅ Visual Link Diagram:
   - demo_users → user_profiles → team_members chain visualization
   - Broken links highlighted in red
   - Live status indicators with counts

✅ Detailed Issue List:
   - Color-coded issue cards (red/orange/yellow by severity)
   - First 5 records shown, with count of remaining
   - Scrollable issue details

✅ One-click Detection:
   - "Detect Orphans" button in Debug Panel
   - Real-time detection status
   - Comprehensive report with all issues
```

**Location:** `src/components/debug/DebugPanel.tsx`

---

#### ✅ Task 2: Bulk Import/Migration Tool — COMPLETED ⏱️ 2.5 hours
**Status:** ✅ Implemented

**Features Added:**
```typescript
✅ CSV File Upload with validation
✅ Auto-column mapping (smart matching)
✅ Manual column mapping UI
✅ Data validation before import
✅ Batch processing with progress bar
✅ Error handling with detailed error reporting
✅ Import summary (successful/failed counts)
✅ Template download (clients & team members)
✅ Auto-onboarding for clients (wallet + workspace)
✅ Auto-user creation for team members
```

**Location:** `src/components/imports/BulkImportTool.tsx`


#### Task 3: Client Sub-Users Portal Enhancement ⏱️ 1 hour
**কাজ:**
```typescript
// src/components/client-dashboard/ClientTeamManagement.tsx (ইতিমধ্যে আছে)

Enhancements needed:
1. Sub-user role definitions:
   - client_admin: Full access (except wallet admin)
   - client_member: View-only + messaging
   - client_viewer: Read-only access

2. Permission Matrix UI:
   - Visual table showing role → permission mapping
   - Toggle switches for custom permissions

3. Invitation Flow:
   - Send email with login link
   - Password setup page for new sub-users
   - Welcome email template

4. Sub-user Dashboard:
   - Limited navigation (no Wallet Admin)
   - Role badge in header
   - "Managed by [parent-client-name]" indicator
```

---

## 🚀 Priority 3: Agency Command Center Completion (8-10 hours)

### Phase A: Financial Pulse Chart ⏱️ 2 hours
**Component:** `src/components/dashboard/FinancialPulseChart.tsx`

**Features:**
```typescript
1. Monthly Revenue Trend (last 6 months)
   - Line chart: Revenue from packages + boosts
   - Comparison with previous period

2. Wallet Balance Aggregate
   - Total balance across all clients
   - Top 5 clients by balance

3. Package Revenue Breakdown
   - Pie chart: Infinity vs Eco Lite vs Royal Dominance
   - Monthly recurring revenue (MRR)

4. Boost Spend Tracking
   - Bar chart: Spend by platform (Facebook, Google, etc.)
   - ROI indicators

5. Invoice Status Overview
   - Paid vs Pending vs Overdue
   - Alerts for overdue invoices
```

**Data Source:**
```typescript
// Monthly revenue calculation
const calculateMonthlyRevenue = async (startMonth: Date, endMonth: Date) => {
  // Package revenue (monthly fees)
  const { data: packageRevenue } = await supabase
    .from('client_packages')
    .select('custom_monthly_fee, package:packages(monthly_fee)')
    .eq('status', 'active');

  // Boost revenue (wallet debits)
  const { data: boostRevenue } = await supabase
    .from('wallet_transactions')
    .select('amount')
    .eq('type', 'debit')
    .gte('created_at', startMonth.toISOString())
    .lte('created_at', endMonth.toISOString());

  return {
    packageRevenue: packageRevenue.reduce((sum, p) => sum + (p.custom_monthly_fee || p.package.monthly_fee), 0),
    boostRevenue: boostRevenue.reduce((sum, t) => sum + Math.abs(t.amount), 0),
  };
};
```

---

### Phase B: Quick Action Alerts ⏱️ 1.5 hours
**Component:** `src/components/dashboard/QuickAlerts.tsx` (ইতিমধ্যে আছে)

**Alert Types:**
```typescript
1. Package Limit Alerts:
   - "3 clients near package limit (>80% used)"
   - Click → Navigate to client profiles

2. Overdue Deliverables:
   - "5 deliverables overdue by 2+ days"
   - Click → Navigate to Projects Kanban

3. Overloaded Team Members:
   - "2 designers overloaded (>15 active tasks)"
   - Click → Navigate to workload dashboard

4. Low Wallet Balance:
   - "4 clients with balance < $100"
   - Click → Navigate to wallet admin

5. Unread Messages:
   - "12 unread messages across 3 workspaces"
   - Click → Navigate to messaging hub

6. Pending Invoices:
   - "2 invoices overdue (>7 days)"
   - Click → Navigate to invoice management
```

---

### Phase C: Enhanced Filters & Search ⏱️ 1 hour
**Location:** `AgencyCommandCenter.tsx`

**Filters:**
```typescript
Client Filters:
- All Clients
- Active Clients
- At Risk (usage >80% or health <50)
- Overdue Deliverables (>3 pending)
- Low Balance (<$100)
- No Activity (>7 days)

Team Filters:
- All Members
- Online
- Busy (>10 tasks)
- Overloaded (>15 tasks)
- Idle (<3 tasks)

Workspace Filters:
- All Workspaces
- Unread Messages
- Recent Activity (<24h)
- No Activity (>7 days)
```

---

### Phase D: Live Updates & Realtime ⏱️ 1.5 hours
**Implementation:**
```typescript
// Subscribe to realtime changes
useEffect(() => {
  const subscription = supabase
    .channel('command-center-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'clients',
    }, handleClientUpdate)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'deliverables',
    }, handleDeliverableUpdate)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
    }, handleMessageUpdate)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);

const handleClientUpdate = (payload: any) => {
  // Update client card in real-time
  setData((prev) => ({
    ...prev,
    clients: prev.clients.map((c) =>
      c.id === payload.new.id ? { ...c, ...payload.new } : c
    ),
  }));
};
```

---

## 🔵 Production Readiness (After Priority 3)

### Auth System Migration ⏱️ 3-4 hours
```typescript
Steps:
1. Create migration script: demo_users → Supabase Auth
2. For each demo_user:
   - Create auth.users entry (if not exists)
   - Link to user_profiles
   - Update all FK references
3. Add auth state persistence (localStorage)
4. Implement password reset flow
5. Add email verification (optional)
```

### RLS Policy Audit ⏱️ 2-3 hours
```sql
-- For each table, verify RLS:
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant clients"
  ON clients FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('super_admin', 'account_manager')
    AND tenant_id = auth.jwt() ->> 'tenant_id'
  );

-- Repeat for all 40+ tables
```

---

## 📊 Timeline Summary

| Phase | Task | Hours | Priority |
|-------|------|-------|----------|
| **Priority 2** | User Health Monitor | 1.5 | 🔴 High |
| | Bulk Import Tool | 2.5 | 🔴 High |
| | Sub-Users Enhancement | 1 | 🟡 Medium |
| **Priority 3** | Financial Pulse Chart | 2 | 🔴 High |
| | Quick Action Alerts | 1.5 | 🔴 High |
| | Enhanced Filters | 1 | 🟡 Medium |
| | Live Updates | 1.5 | 🔴 High |
| **Production** | Auth Migration | 3-4 | 🟠 Critical |
| | RLS Audit | 2-3 | 🟠 Critical |

**Total Estimated Time:** 15-20 hours  
**Target Completion:** Within 3-4 working days

---

## 🎯 Success Criteria

### Before Moving to Production:
- [ ] All Priority 2 tasks complete (user system solid)
- [ ] All Priority 3 tasks complete (command center functional)
- [ ] Auth migration complete (no demo_users in production)
- [ ] RLS policies applied (all 40+ tables)
- [ ] E2E testing done (all core flows working)
- [ ] Performance optimization (load times <2s)
- [ ] Error handling polished (user-friendly messages)
- [ ] Documentation complete (setup guide + API docs)

---

## 📞 পরবর্তী Action

**এখনই শুরু করুন:**
1. User System Health Monitor enhancement (Debug Panel)
2. Bulk Import Tool তৈরি করা
3. Financial Pulse Chart implementation

**অথবা**
আপনি যদি নির্দিষ্ট কোন task শুরু করতে চান, বলুন কোনটা দিয়ে শুরু করবেন।

---

**Status:** ✅ Roadmap Ready  
**Next:** Implementation of Priority 2 tasks
