import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get all demo users that haven't been migrated yet
    const { data: demoUsers, error: fetchErr } = await supabaseAdmin
      .from('demo_users')
      .select('*')
      .is('auth_user_id', null)
      .eq('is_active', true);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch demo users: ${fetchErr.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!demoUsers || demoUsers.length === 0) {
      // Check if any demo users exist at all
      const { data: allDemoUsers } = await supabaseAdmin
        .from('demo_users')
        .select('email, auth_user_id')
        .eq('is_active', true);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'All demo users already migrated',
          users: (allDemoUsers || []).map((u: any) => ({ email: u.email, auth_user_id: u.auth_user_id })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results: any[] = [];

    for (const demoUser of demoUsers) {
      try {
        // Use the password from demo_users (for demo accounts it's '123456')
        const password = demoUser.password_hash === '***SUPABASE_AUTH***' 
          ? 'changeme123' 
          : demoUser.password_hash || '123456';

        // Check if auth user already exists with this email
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u: any) => u.email?.toLowerCase() === demoUser.email?.toLowerCase()
        );

        let authUserId: string;

        if (existingUser) {
          authUserId = existingUser.id;
        } else {
          // Create Supabase Auth user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: demoUser.email.toLowerCase().trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
              display_name: demoUser.display_name,
              role: demoUser.role,
              tenant_id: demoUser.tenant_id,
            },
          });

          if (authError) {
            results.push({
              email: demoUser.email,
              status: 'error',
              error: authError.message,
            });
            continue;
          }

          authUserId = authData.user.id;
        }

        // Ensure public.users entry exists
        await supabaseAdmin.from('users').upsert({
          id: authUserId,
          email: demoUser.email.toLowerCase().trim(),
          tenant_id: demoUser.tenant_id,
        }, { onConflict: 'id' });

        // Link demo_user to auth user
        await supabaseAdmin
          .from('demo_users')
          .update({ auth_user_id: authUserId })
          .eq('id', demoUser.id);

        // Link user_profile if exists
        if (demoUser.user_profile_id) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ auth_user_id: authUserId })
            .eq('id', demoUser.user_profile_id);
        }

        // Add user to workspace members for all workspaces
        const { data: workspaces } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('tenant_id', demoUser.tenant_id);

        if (workspaces && workspaces.length > 0) {
          for (const ws of workspaces) {
            await supabaseAdmin.from('workspace_members').upsert({
              workspace_id: ws.id,
              user_profile_id: demoUser.user_profile_id || demoUser.id,
              name: demoUser.display_name,
              avatar: demoUser.avatar || demoUser.display_name.substring(0, 2).toUpperCase(),
              role: demoUser.role === 'super_admin' ? 'admin' : 'member',
              status: 'online',
            }, { onConflict: 'workspace_id,user_profile_id' });
          }

          // Add to all default channels
          const { data: defaultChannels } = await supabaseAdmin
            .from('channels')
            .select('id')
            .in('workspace_id', workspaces.map((w: any) => w.id))
            .eq('is_default', true);

          if (defaultChannels && defaultChannels.length > 0) {
            for (const ch of defaultChannels) {
              await supabaseAdmin.from('channel_members').upsert({
                channel_id: ch.id,
                user_profile_id: demoUser.user_profile_id || demoUser.id,
                role: 'member',
                joined_at: new Date().toISOString(),
              }, { onConflict: 'channel_id,user_profile_id' });
            }
          }
        }

        results.push({
          email: demoUser.email,
          status: 'migrated',
          auth_user_id: authUserId,
          role: demoUser.role,
        });
      } catch (userError: any) {
        results.push({
          email: demoUser.email,
          status: 'error',
          error: userError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migrated ${results.filter(r => r.status === 'migrated').length}/${demoUsers.length} users`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
