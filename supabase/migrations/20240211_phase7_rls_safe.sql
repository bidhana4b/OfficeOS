-- TITAN DEV AI — Phase 7: Row Level Security (RLS) Policies
-- Enables RLS on all key tables with permissive policies
-- Uses safe DO blocks to skip tables that may not exist

-- ============================================
-- HELPER: Safe RLS enabler function
-- ============================================
CREATE OR REPLACE FUNCTION public._enable_rls_safe(tbl_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_all" ON public.%I', tbl_name, tbl_name);
    EXECUTE format('CREATE POLICY "%s_select_all" ON public.%I FOR SELECT USING (true)', tbl_name, tbl_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_all" ON public.%I', tbl_name, tbl_name);
    EXECUTE format('CREATE POLICY "%s_insert_all" ON public.%I FOR INSERT WITH CHECK (true)', tbl_name, tbl_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_all" ON public.%I', tbl_name, tbl_name);
    EXECUTE format('CREATE POLICY "%s_update_all" ON public.%I FOR UPDATE USING (true)', tbl_name, tbl_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_all" ON public.%I', tbl_name, tbl_name);
    EXECUTE format('CREATE POLICY "%s_delete_all" ON public.%I FOR DELETE USING (true)', tbl_name, tbl_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Apply RLS to all major tables
-- ============================================
SELECT public._enable_rls_safe('clients');
SELECT public._enable_rls_safe('team_members');
SELECT public._enable_rls_safe('messages');
SELECT public._enable_rls_safe('channels');
SELECT public._enable_rls_safe('workspaces');
SELECT public._enable_rls_safe('deliverables');
SELECT public._enable_rls_safe('packages');
SELECT public._enable_rls_safe('invoices');
SELECT public._enable_rls_safe('campaigns');
SELECT public._enable_rls_safe('activities');
SELECT public._enable_rls_safe('notifications');
SELECT public._enable_rls_safe('demo_users');
SELECT public._enable_rls_safe('user_profiles');
SELECT public._enable_rls_safe('client_wallets');
SELECT public._enable_rls_safe('wallet_transactions');
SELECT public._enable_rls_safe('channel_members');
SELECT public._enable_rls_safe('workspace_members');
SELECT public._enable_rls_safe('client_assignments');
SELECT public._enable_rls_safe('package_usage');
SELECT public._enable_rls_safe('client_packages');
SELECT public._enable_rls_safe('user_settings');
SELECT public._enable_rls_safe('dashboard_layouts');
SELECT public._enable_rls_safe('pinned_messages');
SELECT public._enable_rls_safe('saved_messages');
SELECT public._enable_rls_safe('message_read_receipts');
SELECT public._enable_rls_safe('canned_responses');
SELECT public._enable_rls_safe('quick_actions');
SELECT public._enable_rls_safe('default_assignment_rules');
SELECT public._enable_rls_safe('deliverable_types');
SELECT public._enable_rls_safe('package_categories');
SELECT public._enable_rls_safe('client_package_features');
SELECT public._enable_rls_safe('user_roles');

-- Cleanup helper function
DROP FUNCTION IF EXISTS public._enable_rls_safe(TEXT);

-- ============================================
-- STORAGE: message-attachments bucket policy
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'message-attachments') THEN
    DROP POLICY IF EXISTS "message_attachments_select" ON storage.objects;
    CREATE POLICY "message_attachments_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'message-attachments');

    DROP POLICY IF EXISTS "message_attachments_insert" ON storage.objects;
    CREATE POLICY "message_attachments_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'message-attachments');

    DROP POLICY IF EXISTS "message_attachments_delete" ON storage.objects;
    CREATE POLICY "message_attachments_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'message-attachments');
  END IF;
END $$;

-- ============================================
-- ENABLE REALTIME on key tables
-- ============================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['messages', 'channels', 'clients', 'deliverables', 'activities', 'notifications', 'package_usage', 'client_assignments', 'invoices', 'campaigns']
  LOOP
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.%I', tbl);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
