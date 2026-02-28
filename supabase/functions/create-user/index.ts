import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  display_name: string;
  role: string;
  tenant_id?: string;
  avatar?: string;
  phone?: string;
  client_id?: string | null;
  primary_role_label?: string;
  team_ids?: string[];
  metadata?: Record<string, string>;
}

interface InviteUserRequest {
  email: string;
  display_name: string;
  role: string;
  tenant_id?: string;
  invited_by_auth_id?: string;
  metadata?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const body = await req.json();
    const action = url.searchParams.get('action') || body.action || 'create';

    // Verify the caller is authenticated (except for accept-invitation)
    if (action !== 'accept-invitation') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !callerUser) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Check caller's role (must be admin)
      const { data: callerRole } = await supabaseAdmin
        .from('demo_users')
        .select('role')
        .eq('auth_user_id', callerUser.id)
        .eq('is_active', true)
        .single();

      if (action === 'create' && (!callerRole || !['super_admin', 'account_manager'].includes(callerRole.role))) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions. Only admins can create users.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    switch (action) {
      case 'create':
        return await handleCreateUser(supabaseAdmin, body as CreateUserRequest);
      case 'invite':
        return await handleInviteUser(supabaseAdmin, body as InviteUserRequest);
      case 'accept-invitation':
        return await handleAcceptInvitation(supabaseAdmin, body);
      case 'reset-password':
        return await handleResetPassword(supabaseAdmin, body);
      case 'migrate-demo-user':
        return await handleMigrateDemoUser(supabaseAdmin, body);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function handleCreateUser(supabaseAdmin: any, input: CreateUserRequest) {
  const tenantId = input.tenant_id || '00000000-0000-0000-0000-000000000001';

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email.toLowerCase().trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.display_name,
      role: input.role,
      tenant_id: tenantId,
    },
  });

  if (authError) {
    return new Response(
      JSON.stringify({ error: `Auth creation failed: ${authError.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const authUserId = authData.user.id;

  try {
    // 2. Create user_profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        tenant_id: tenantId,
        full_name: input.display_name,
        email: input.email.toLowerCase().trim(),
        avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
        phone: input.phone || null,
        status: 'active',
        auth_user_id: authUserId,
      })
      .select()
      .single();

    if (profileErr) throw new Error(`Profile creation failed: ${profileErr.message}`);

    // 3. Assign role
    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', `%${getRoleName(input.role)}%`)
      .limit(1)
      .single();

    if (roleData) {
      await supabaseAdmin.from('user_roles').insert({
        user_id: profile.id,
        role_id: roleData.id,
      });
    }

    // 4. Create team_member (for non-client roles)
    let teamMember = null;
    if (input.role !== 'client') {
      const { data: member, error: memberErr } = await supabaseAdmin
        .from('team_members')
        .insert({
          tenant_id: tenantId,
          user_profile_id: profile.id,
          name: input.display_name,
          email: input.email.toLowerCase().trim(),
          avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
          primary_role: input.primary_role_label || getRoleName(input.role),
          secondary_roles: [],
          work_capacity_hours: 8,
          status: 'online',
          current_load: 0,
          active_deliverables: 0,
          boost_campaigns: 0,
          tasks_completed_this_month: 0,
          join_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (memberErr) throw new Error(`Team member creation failed: ${memberErr.message}`);
      teamMember = member;

      // Link to teams
      if (input.team_ids && input.team_ids.length > 0) {
        const teamLinks = input.team_ids.map((teamId: string) => ({
          team_member_id: member.id,
          team_id: teamId,
        }));
        await supabaseAdmin.from('team_member_teams').insert(teamLinks);
      }

      // Add to all client workspaces (for staff members)
      const { data: workspaces } = await supabaseAdmin
        .from('workspaces')
        .select('id, client_id')
        .eq('tenant_id', tenantId);

      if (workspaces && workspaces.length > 0) {
        const wsMembers = workspaces.map((ws: any) => ({
          workspace_id: ws.id,
          user_profile_id: profile.id,
          name: input.display_name,
          avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
          role: input.role === 'super_admin' ? 'admin' : 'member',
          status: 'online',
        }));
        await supabaseAdmin.from('workspace_members').upsert(wsMembers, {
          onConflict: 'workspace_id,user_profile_id',
        });

        // Also add to all general/announcements channels in each workspace
        const { data: channels } = await supabaseAdmin
          .from('channels')
          .select('id')
          .in('workspace_id', workspaces.map((w: any) => w.id))
          .or('name.eq.general,name.eq.announcements');

        if (channels && channels.length > 0) {
          const channelMembers = channels.map((ch: any) => ({
            channel_id: ch.id,
            user_profile_id: profile.id,
            role: 'member',
            joined_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from('channel_members').upsert(channelMembers, {
            onConflict: 'channel_id,user_profile_id',
          });
        }
      }
    }

    // 5. Create demo_users entry (backward compatibility bridge)
    const { data: demoUser, error: demoErr } = await supabaseAdmin
      .from('demo_users')
      .insert({
        tenant_id: tenantId,
        email: input.email.toLowerCase().trim(),
        password_hash: '***SUPABASE_AUTH***',
        display_name: input.display_name,
        role: input.role,
        avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
        client_id: input.client_id || null,
        user_profile_id: profile.id,
        team_member_id: teamMember ? teamMember.id : null,
        metadata: input.metadata || {},
        is_active: true,
        auth_user_id: authUserId,
      })
      .select()
      .single();

    if (demoErr) throw new Error(`Demo user creation failed: ${demoErr.message}`);

    // 5b. For client roles: add to client workspace as member
    if (input.role === 'client' && input.client_id) {
      try {
        const { data: clientWorkspace } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('client_id', input.client_id)
          .single();

        if (clientWorkspace) {
          await supabaseAdmin.from('workspace_members').upsert({
            workspace_id: clientWorkspace.id,
            user_profile_id: profile.id,
            name: input.display_name,
            avatar: input.avatar || input.display_name.substring(0, 2).toUpperCase(),
            role: 'member',
            status: 'online',
          }, { onConflict: 'workspace_id,user_profile_id' });
        }
      } catch (wsErr) {
        // Non-critical — client workspace membership
        console.warn('Could not add client to workspace:', wsErr);
      }
    }

    // 6. Log activity
    await supabaseAdmin.from('activities').insert({
      tenant_id: tenantId,
      type: 'user_created',
      title: `New User: ${input.display_name}`,
      description: `${getRoleName(input.role)} account created via Supabase Auth. Auto-assigned to ${workspaces?.length || 0} workspace(s) and messaging channels.`,
      timestamp: new Date().toISOString(),
      metadata: { 
        email: input.email, 
        role: input.role, 
        auth_user_id: authUserId,
        team_ids: input.team_ids || [],
        workspace_count: workspaces?.length || 0 
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        auth_user_id: authUserId,
        demo_user: demoUser,
        user_profile: profile,
        team_member: teamMember,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    // Rollback: delete auth user on failure
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

async function handleInviteUser(supabaseAdmin: any, input: InviteUserRequest) {
  const tenantId = input.tenant_id || '00000000-0000-0000-0000-000000000001';

  const { data: invitation, error } = await supabaseAdmin
    .from('user_invitations')
    .insert({
      tenant_id: tenantId,
      email: input.email.toLowerCase().trim(),
      role: input.role,
      display_name: input.display_name,
      invited_by: input.invited_by_auth_id || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: `Invitation creation failed: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      invitation,
      invitation_link: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/accept-invite?token=${invitation.invitation_token}`,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function handleAcceptInvitation(supabaseAdmin: any, body: { token: string; password: string }) {
  // 1. Find invitation
  const { data: invitation, error: invErr } = await supabaseAdmin
    .from('user_invitations')
    .select('*')
    .eq('invitation_token', body.token)
    .eq('status', 'pending')
    .single();

  if (invErr || !invitation) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired invitation' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    await supabaseAdmin
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);

    return new Response(
      JSON.stringify({ error: 'Invitation has expired' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // 2. Create the user using the same flow
  const createResult = await handleCreateUser(supabaseAdmin, {
    email: invitation.email,
    password: body.password,
    display_name: invitation.display_name,
    role: invitation.role,
    tenant_id: invitation.tenant_id,
    metadata: invitation.metadata,
  });

  const resultBody = await createResult.json();

  if (!resultBody.success) {
    return new Response(
      JSON.stringify({ error: resultBody.error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // 3. Mark invitation as accepted
  await supabaseAdmin
    .from('user_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  return new Response(
    JSON.stringify({ success: true, ...resultBody }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function handleResetPassword(supabaseAdmin: any, body: { auth_user_id: string; new_password: string }) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(body.auth_user_id, {
    password: body.new_password,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: `Password reset failed: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function handleMigrateDemoUser(supabaseAdmin: any, body: { demo_user_id: string; password?: string }) {
  // Get existing demo user
  const { data: demoUser, error: fetchErr } = await supabaseAdmin
    .from('demo_users')
    .select('*')
    .eq('id', body.demo_user_id)
    .single();

  if (fetchErr || !demoUser) {
    return new Response(
      JSON.stringify({ error: 'Demo user not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  }

  // Check if already migrated
  if (demoUser.auth_user_id) {
    return new Response(
      JSON.stringify({ error: 'User already migrated', auth_user_id: demoUser.auth_user_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Create Supabase Auth user
  const password = body.password || demoUser.password_hash || 'changeme123';
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: demoUser.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      display_name: demoUser.display_name,
      role: demoUser.role,
      tenant_id: demoUser.tenant_id,
    },
  });

  if (authError) {
    return new Response(
      JSON.stringify({ error: `Auth creation failed: ${authError.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const authUserId = authData.user.id;

  // Link demo_user
  await supabaseAdmin.from('demo_users').update({ auth_user_id: authUserId }).eq('id', demoUser.id);

  // Link user_profile if exists
  if (demoUser.user_profile_id) {
    await supabaseAdmin.from('user_profiles').update({ auth_user_id: authUserId }).eq('id', demoUser.user_profile_id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      auth_user_id: authUserId,
      demo_user_id: demoUser.id,
      email: demoUser.email,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

function getRoleName(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'designer': return 'Designer';
    case 'media_buyer': return 'Media Buyer';
    case 'account_manager': return 'Account Manager';
    case 'finance': return 'Finance';
    case 'client': return 'Client';
    default: return role;
  }
}
