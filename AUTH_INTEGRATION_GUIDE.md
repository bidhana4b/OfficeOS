# Supabase Auth Integration Guide

**Status**: ✅ Implementation Complete  
**Date**: January 2025  
**Phase**: Auth Bridge System (Phase 6)

---

## Overview

This document describes the complete Supabase Auth integration for the Multi-Tenant Agency Management Platform. The system bridges Supabase's built-in authentication with the existing `demo_users` table-based system, enabling a gradual migration path.

### Key Architecture Points

1. **Dual Auth System**: Supports both Supabase Auth sessions and demo_users for backward compatibility
2. **Public Users Table**: Bridge table linking `auth.users` to multi-tenant system via `tenant_id`
3. **Auto-Provisioning**: User creation automatically creates entries in all required tables
4. **RLS-Ready**: Foundation for Row-Level Security policies based on `auth.uid()` and `tenant_id`

---

## Database Schema

### New Tables & Columns

#### 1. `public.users` (New)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Foreign key bridge to `auth.users` (cannot reference `auth.users` directly)

#### 2. Modified `user_profiles`
```sql
ALTER TABLE user_profiles ADD COLUMN auth_user_id UUID 
  REFERENCES public.users(id) ON DELETE SET NULL;
```

#### 3. Modified `demo_users`
```sql
ALTER TABLE demo_users ADD COLUMN auth_user_id UUID 
  REFERENCES public.users(id) ON DELETE SET NULL;
```

### Sync Trigger

A trigger automatically syncs new `auth.users` to `public.users`:

```typescript
// When a new auth user is created
// ↓
// Trigger creates public.users entry (id, email, tenant_id)
// ↓
// edge function also creates user_profiles and demo_users entries
```

---

## User Creation Flow

### Flow 1: Full Supabase Auth User (via Edge Function)

```
POST /edge/create-user?action=create
{
  email: "designer@agency.com",
  password: "securepass123",
  display_name: "John Designer",
  role: "designer",
  tenant_id: "tenant-uuid"
}
  ↓
Edge Function: create-user/index.ts
  ├─ 1. Create auth.users (Supabase Auth)
  ├─ 2. Create public.users (FK bridge)
  ├─ 3. Create user_profiles (role, metadata)
  ├─ 4. Create user_roles (RLS prep)
  ├─ 5. Create team_member (workload tracking)
  ├─ 6. Add to workspaces (messaging)
  ├─ 7. Create demo_users (backward compat)
  └─ 8. Log activity
```

### Flow 2: Quick Demo Login (Backward Compatible)

```
POST /login
{
  email: "admin@demo.com",
  password: "demo123"
}
  ↓
auth.tsx: login()
  ├─ Check demo_users table (fast path)
  ├─ If found → set session directly
  └─ If not found → try Supabase Auth
```

### Flow 3: Demo User Migration

```
Existing demo_user without Supabase Auth
  ↓
POST /edge/create-user?action=migrate-demo-user
{
  demo_user_id: "demo-user-uuid",
  password: "newpass" (optional)
}
  ↓
Edge Function:
  ├─ Create auth.users with demo_user.email
  ├─ Link demo_users.auth_user_id
  ├─ Link user_profiles.auth_user_id
  └─ Return auth_user_id
```

---

## Usage Examples

### 1. Create a New User

```typescript
import { useAuthManagement } from '@/hooks/useAuthManagement';

export function AddTeamMemberForm() {
  const { createUser, loading, error } = useAuthManagement();

  const handleSubmit = async (formData) => {
    try {
      const result = await createUser({
        email: formData.email,
        password: formData.password,
        display_name: formData.fullName,
        role: 'designer',
        avatar: formData.avatarUrl,
        team_ids: [formData.selectedTeamId],
      });

      console.log('User created:', result.auth_user_id);
      // Auto-synced to: demo_users, user_profiles, user_roles, team_member, workspaces
    } catch (err) {
      console.error('Failed to create user:', err.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 2. Invite a User

```typescript
const { inviteUser } = useAuthManagement();

const invitation = await inviteUser({
  email: 'client@company.com',
  display_name: 'Client Manager',
  role: 'client',
});

// Send invitation_link to user:
// https://app.domain.com/accept-invite?token={invitation.invitation_token}
```

### 3. Accept Invitation

```typescript
import { useSearchParams } from 'react-router-dom';
import { useAuthManagement } from '@/hooks/useAuthManagement';

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { acceptInvitation } = useAuthManagement();

  const handleAccept = async (password: string) => {
    const result = await acceptInvitation(token, password);
    // User is now created, redirect to login
  };

  return <SetPasswordForm onSubmit={handleAccept} />;
}
```

### 4. Migrate Demo User to Auth

```typescript
const { migrateDemoUser } = useAuthManagement();

const migrated = await migrateDemoUser(demoUserId, 'newPassword123');
console.log('Migration complete:', migrated.auth_user_id);
// demo_users.auth_user_id now linked to auth.users
```

### 5. Update User Password (Current User)

```typescript
const { updatePassword } = useAuthManagement();

await updatePassword('newSecurePassword123');
// Uses current Supabase Auth session
```

---

## Authentication Context (`src/lib/auth.tsx`)

### Flow Diagram

```
App Starts
  ↓
AuthProvider initializes
  ├─ Checks localStorage for Supabase session
  ├─ If session found → validate with Supabase
  ├─ Fetch AppUser via fetchAppUser()
  │   ├─ Query demo_users by auth_user_id (new users)
  │   └─ Fallback query by email (legacy migration)
  └─ Set AuthContext with user + session
```

### Key Functions

#### `fetchAppUser(authUser: User): Promise<AppUser | null>`

Fetches the complete user profile from `demo_users`:

```typescript
// 1. Try auth_user_id (Supabase Auth users)
const demoUser = await supabase
  .from('demo_users')
  .select('*')
  .eq('auth_user_id', authUser.id)
  .single();

// 2. Fallback: query by email (legacy)
if (!demoUser) {
  const legacyUser = await supabase
    .from('demo_users')
    .select('*')
    .eq('email', authUser.email)
    .single();
}

// 3. Last resort: use auth metadata
return { email: authUser.email, role: 'client', ... };
```

#### `login(email: string, password: string): Promise<boolean>`

Two-path authentication:

```typescript
// Path 1: Supabase Auth (new standard)
const { data, error } = await supabase.auth.signInWithPassword(email, password);
if (!error && data.session) {
  setSession(data.session);
  const appUser = await fetchAppUser(data.session.user);
  setUser(appUser);
  return true;
}

// Path 2: Demo users (backward compat, instant fallback)
// ... (quick validation for pre-migrated users)
```

---

## RLS Policies

### Current Status

RLS is **disabled by default** on all tables. When implementing security:

```sql
-- Enable RLS on table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own record
CREATE POLICY "Users can read own user"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow service role to manage
CREATE POLICY "Service role can manage"
  ON users FOR ALL
  USING (auth.role() = 'service_role');
```

### Tenant Isolation (Future)

Once ready to enforce security:

```sql
-- Users can read their own tenant's data
CREATE POLICY "Tenant isolation on select"
  ON users FOR SELECT
  USING (
    auth.uid() = id 
    OR tenant_id = (
      SELECT tenant_id FROM user_profiles 
      WHERE auth_user_id = auth.uid()
    )
  );
```

---

## Edge Function: `supabase/functions/create-user`

### Location
`supabase/functions/create-user/index.ts`

### Actions Supported

#### `?action=create` (Default)
- Creates Supabase Auth user
- Creates all related tables
- **Auth Required**: Bearer token with admin role

#### `?action=invite`
- Sends invitation to email
- Returns invitation link
- **Auth Required**: Bearer token

#### `?action=accept-invitation`
- User provides password
- Creates full user account
- **Auth Required**: None (public)

#### `?action=reset-password`
- Changes password for existing user
- **Auth Required**: Bearer token

#### `?action=migrate-demo-user`
- Links existing demo_user to Supabase Auth
- **Auth Required**: Bearer token with admin role

### Error Handling

```typescript
// Automatic rollback on failure
if (error) {
  await supabaseAdmin.auth.admin.deleteUser(authUserId);
  throw new Error('Profile creation failed, auth user deleted');
}
```

---

## Backward Compatibility

### Demo Users Table

The `demo_users` table remains as a **compatibility bridge**:

```sql
demo_users
  ├─ id (UUID primary key)
  ├─ email (login identifier)
  ├─ role (quick access)
  ├─ auth_user_id ← links to auth.users
  ├─ user_profile_id ← links to user_profiles
  └─ team_member_id ← links to team_members
```

### Dual Login Support

- **Old**: `demo_users` → instant session (no password hash verification in demo mode)
- **New**: `auth.users` + Supabase session → full security

### Zero Breaking Changes

```typescript
// Old code still works
const user = await useAuth(); // Returns AppUser with all fields
user.role // ✅ Works (from demo_users OR auth.user_metadata)
user.auth_id // ✅ Works (auth.users.id for new users)
```

---

## Deployment Checklist

- [x] **Database Migration**: `20240222_auth_bridge_system.sql`
  - Creates `public.users` table
  - Adds `auth_user_id` columns
  - Creates sync trigger
  - Enables RLS foundation

- [x] **Edge Function**: Deployed `supabase-functions-create-user`
  - Full user lifecycle management
  - Invitation system
  - Migration utilities

- [x] **Frontend Hooks**: `useAuthManagement.ts`
  - Simple API for user operations
  - Wraps edge function calls

- [x] **Auth Context**: Updated `src/lib/auth.tsx`
  - Supports both auth systems
  - Graceful fallback

- [ ] **Settings UI**: Add to `SettingsHub` or `UsersRolesControl`
  - Invite team members
  - Manage user roles
  - Migrate demo users

- [ ] **Tests**
  - Create user flow
  - Invitation acceptance
  - Demo user migration
  - RLS policy enforcement

---

## Troubleshooting

### "Missing authorization header"
- The API call requires a Bearer token from authenticated user
- Ensure user is logged in before invoking edge function

### "User already migrated"
- `demo_user.auth_user_id` already has a value
- Check for duplicate migration attempts

### "Invitation has expired"
- Default expiry is 24-48 hours
- Resend invitation if needed

### RLS Policy Violations
- RLS is disabled by default (safe for dev)
- In production, ensure policies are correctly configured
- Use Debug Panel to verify table access

---

## Next Steps

1. **Add UI Components**
   - Invite user modal in `UsersRolesControl.tsx`
   - Invite acceptance page
   - Migration status indicator in admin

2. **Enable RLS in Staging**
   - Review all policies first
   - Test with real tenant data
   - Monitor for permission errors

3. **Audit Sessions**
   - Implement session management UI
   - Track login history
   - Session timeout policies

4. **Monitoring**
   - Add metrics for auth failures
   - Track user creation flows
   - Monitor edge function performance

---

## References

- **Auth Context**: `src/lib/auth.tsx`
- **Data Service**: `src/lib/data-service.ts` (createFullUser, inviteUser, etc.)
- **Auth Hook**: `src/hooks/useAuthManagement.ts`
- **Edge Function**: `supabase/functions/create-user/index.ts`
- **Migration**: `supabase/migrations/20240222_auth_bridge_system.sql`
- **Types**: `src/types/supabase.ts`
