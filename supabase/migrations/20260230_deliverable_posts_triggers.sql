-- =============================================
-- DELIVERABLE POSTS TRIGGERS
-- 1. Auto-deduct package usage when post approved
-- 2. Auto-create notification on status change
-- 3. Auto-update team_members stats on assignment
-- =============================================

-- 1. Package usage deduction when deliverable_posts status = 'approved'
CREATE OR REPLACE FUNCTION deduct_package_usage_on_post_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_client_pkg_id UUID;
  v_del_type TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT cp.id INTO v_client_pkg_id
      FROM client_packages cp
      WHERE cp.client_id = NEW.client_id
        AND cp.status = 'active'
      ORDER BY cp.created_at DESC
      LIMIT 1;

      IF v_client_pkg_id IS NOT NULL THEN
        IF NEW.deliverable_type_id IS NOT NULL THEN
          SELECT name INTO v_del_type
          FROM deliverable_types
          WHERE id = NEW.deliverable_type_id;
        END IF;

        IF v_del_type IS NOT NULL THEN
          UPDATE package_usage
          SET used = used + 1,
              updated_at = now()
          WHERE client_package_id = v_client_pkg_id
            AND deliverable_type = v_del_type;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_usage_on_post_approval ON deliverable_posts;
CREATE TRIGGER trg_deduct_usage_on_post_approval
  AFTER UPDATE ON deliverable_posts
  FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage_on_post_approval();


-- 2. Auto-create notification when deliverable_posts status changes
CREATE OR REPLACE FUNCTION notify_on_deliverable_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_assignee_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_target_user UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT business_name INTO v_client_name
    FROM clients WHERE id = NEW.client_id;

    SELECT name INTO v_assignee_name
    FROM team_members WHERE id = NEW.assigned_to;

    v_title := 'Deliverable "' || COALESCE(NEW.title, 'Untitled') || '" → ' || UPPER(REPLACE(NEW.status, '_', ' '));
    v_body := COALESCE(v_client_name, 'Unknown client') || ' | ' || COALESCE(v_assignee_name, 'Unassigned');

    IF NEW.status IN ('approved', 'revision', 'cancelled') AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, body, action_type, reference_id, reference_type, metadata)
      VALUES (
        NEW.tenant_id,
        NEW.assigned_to,
        v_title,
        v_body,
        'deliverable_' || NEW.status,
        NEW.id,
        'deliverable_post',
        jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status, 'client_name', COALESCE(v_client_name, ''), 'section', 'deliverables-feed')
      );
    END IF;

    IF NEW.status IN ('client_review', 'delivered') AND NEW.client_id IS NOT NULL THEN
      BEGIN
        INSERT INTO notifications (tenant_id, user_id, title, body, action_type, reference_id, reference_type, metadata)
        SELECT
          NEW.tenant_id,
          du.id,
          v_title,
          'Your deliverable is ready for review',
          'deliverable_' || NEW.status,
          NEW.id,
          'deliverable_post',
          jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status, 'section', 'deliverables')
        FROM demo_users du
        WHERE du.client_id = NEW.client_id::text
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_deliverable_status ON deliverable_posts;
CREATE TRIGGER trg_notify_deliverable_status
  AFTER UPDATE ON deliverable_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_deliverable_status_change();


-- 3. Update team_members active_deliverables count when assigned
CREATE OR REPLACE FUNCTION update_team_active_deliverables()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE team_members
      SET active_deliverables = (
        SELECT COUNT(*) FROM deliverable_posts
        WHERE assigned_to = NEW.assigned_to
          AND status NOT IN ('approved', 'delivered', 'cancelled')
      )
      WHERE id = NEW.assigned_to;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      UPDATE team_members
      SET active_deliverables = (
        SELECT COUNT(*) FROM deliverable_posts
        WHERE assigned_to = OLD.assigned_to
          AND status NOT IN ('approved', 'delivered', 'cancelled')
      )
      WHERE id = OLD.assigned_to;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE team_members
      SET active_deliverables = (
        SELECT COUNT(*) FROM deliverable_posts
        WHERE assigned_to = NEW.assigned_to
          AND status NOT IN ('approved', 'delivered', 'cancelled')
      ),
      tasks_completed_this_month = (
        SELECT COUNT(*) FROM deliverable_posts
        WHERE assigned_to = NEW.assigned_to
          AND status IN ('approved', 'delivered')
          AND updated_at >= date_trunc('month', now())
      )
      WHERE id = NEW.assigned_to;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_team_active_deliverables ON deliverable_posts;
CREATE TRIGGER trg_update_team_active_deliverables
  AFTER INSERT OR UPDATE ON deliverable_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_team_active_deliverables();


-- 4. Enable realtime on deliverable_posts (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'deliverable_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_posts;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'approval_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE approval_log;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
