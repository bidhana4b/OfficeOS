-- ====================================
-- PHASE 1: PACKAGE USAGE DEDUCTION TRIGGER
-- When a deliverable is completed, automatically deduct from package_usage
-- ====================================

CREATE OR REPLACE FUNCTION deduct_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_client_package_id UUID;
  v_deliverable_type TEXT;
  v_quantity INT;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_client_package_id := NEW.client_package_id;
    v_deliverable_type := NEW.deliverable_type;
    v_quantity := COALESCE(NEW.quantity, 1);

    IF v_client_package_id IS NOT NULL AND v_deliverable_type IS NOT NULL THEN
      UPDATE package_usage
      SET used = used + v_quantity,
          updated_at = NOW()
      WHERE client_package_id = v_client_package_id
        AND deliverable_type = v_deliverable_type;

      INSERT INTO usage_deduction_events (
        client_package_id,
        deliverable_id,
        deliverable_type,
        deliverable_name,
        quantity,
        confirmed_by,
        status
      ) VALUES (
        v_client_package_id,
        NEW.id,
        v_deliverable_type,
        NEW.title,
        v_quantity,
        NEW.confirmed_by,
        'confirmed'
      );

      INSERT INTO activities (
        tenant_id,
        client_id,
        type,
        title,
        description,
        timestamp,
        metadata
      ) VALUES (
        NEW.tenant_id,
        NEW.client_id,
        'deliverable_created',
        'Deliverable Completed: ' || NEW.title,
        'Package usage deducted: ' || v_quantity || ' ' || v_deliverable_type,
        NOW(),
        jsonb_build_object('deliverableType', v_deliverable_type, 'quantity', v_quantity)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_package_usage ON deliverables;
CREATE TRIGGER trg_deduct_package_usage
  AFTER UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION deduct_package_usage();

-- ====================================
-- PHASE 2: WALLET DEDUCTION TRIGGER
-- When a wallet_transaction is inserted with type='debit', reduce balance
-- ====================================

CREATE OR REPLACE FUNCTION process_wallet_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'debit' THEN
    UPDATE client_wallets
    SET balance = balance - NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.client_wallet_id;
  ELSIF NEW.type = 'credit' THEN
    UPDATE client_wallets
    SET balance = balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.client_wallet_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_process_wallet ON wallet_transactions;
CREATE TRIGGER trg_process_wallet
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_wallet_transaction();

-- ====================================
-- PHASE 3: AUTO ACTIVITY LOG ON CLIENT CREATE
-- ====================================

CREATE OR REPLACE FUNCTION log_client_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (
    tenant_id,
    client_id,
    type,
    title,
    description,
    timestamp,
    metadata
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    'client_onboarded',
    'New Client: ' || NEW.business_name,
    'Client onboarded - ' || COALESCE(NEW.category, 'Other'),
    NOW(),
    jsonb_build_object('category', COALESCE(NEW.category, 'Other'), 'location', COALESCE(NEW.location, ''))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_client_created ON clients;
CREATE TRIGGER trg_log_client_created
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_client_created();

-- ====================================
-- PHASE 4: AUTO CREATE WALLET ON CLIENT CREATE
-- ====================================

CREATE OR REPLACE FUNCTION auto_create_client_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_wallets (client_id, balance, currency)
  VALUES (NEW.id, 0, 'BDT')
  ON CONFLICT (client_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_wallet ON clients;
CREATE TRIGGER trg_auto_wallet
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_wallet();

-- ====================================
-- PHASE 5: AUTO INIT PACKAGE USAGE ON client_packages INSERT
-- ====================================

CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO package_usage (client_package_id, deliverable_type, used, total)
  SELECT
    NEW.id,
    pf.deliverable_type,
    0,
    pf.total_allocated
  FROM package_features pf
  WHERE pf.package_id = NEW.package_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_usage ON client_packages;
CREATE TRIGGER trg_auto_init_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- ====================================
-- PHASE 6: AUTO CREATE WORKSPACE ON CLIENT CREATE
-- ====================================

CREATE OR REPLACE FUNCTION auto_create_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_ws_id UUID;
BEGIN
  INSERT INTO workspaces (
    tenant_id, client_id, client_name, client_logo,
    last_message, last_message_time, status, health_score
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.business_name,
    LEFT(NEW.business_name, 2),
    'Welcome to ' || NEW.business_name || ' workspace!',
    NOW(),
    'active',
    NEW.health_score
  )
  RETURNING id INTO v_ws_id;

  INSERT INTO channels (workspace_id, name, type, icon) VALUES
    (v_ws_id, 'general', 'general', 'hash'),
    (v_ws_id, 'deliverables', 'deliverables', 'package'),
    (v_ws_id, 'boost-requests', 'boost-requests', 'rocket'),
    (v_ws_id, 'billing', 'billing', 'credit-card'),
    (v_ws_id, 'internal', 'internal', 'lock');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_workspace ON clients;
CREATE TRIGGER trg_auto_workspace
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workspace();

-- ====================================
-- PHASE 7: MESSAGE COUNTER UPDATE
-- When message inserted, update channel + workspace last_message
-- ====================================

CREATE OR REPLACE FUNCTION update_message_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  UPDATE channels
  SET last_message = NEW.content,
      last_message_time = NEW.created_at,
      unread_count = unread_count + 1
  WHERE id = NEW.channel_id;

  SELECT workspace_id INTO v_workspace_id FROM channels WHERE id = NEW.channel_id;

  IF v_workspace_id IS NOT NULL THEN
    UPDATE workspaces
    SET last_message = NEW.content,
        last_message_time = NEW.created_at,
        unread_count = unread_count + 1
    WHERE id = v_workspace_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_msg_meta ON messages;
CREATE TRIGGER trg_update_msg_meta
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_metadata();

-- ====================================
-- PHASE 8: DASHBOARD VIEWS
-- ====================================

CREATE OR REPLACE VIEW client_usage_summary AS
SELECT
  c.id as client_id,
  c.business_name,
  c.tenant_id,
  COUNT(d.id) as total_deliverables,
  SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN d.status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) as pending
FROM clients c
LEFT JOIN deliverables d ON d.client_id = c.id
GROUP BY c.id, c.business_name, c.tenant_id;

CREATE OR REPLACE VIEW system_health_summary AS
SELECT
  t.id as tenant_id,
  (SELECT COUNT(*) FROM clients WHERE tenant_id = t.id) as total_clients,
  (SELECT COUNT(*) FROM deliverables WHERE tenant_id = t.id) as total_deliverables,
  (SELECT COUNT(*) FROM messages m JOIN channels ch ON m.channel_id = ch.id JOIN workspaces w ON ch.workspace_id = w.id WHERE w.tenant_id = t.id) as total_messages,
  (SELECT COUNT(*) FROM campaigns WHERE tenant_id = t.id AND status = 'live') as active_campaigns,
  (SELECT COALESCE(SUM(cw.balance), 0) FROM client_wallets cw JOIN clients cl ON cw.client_id = cl.id WHERE cl.tenant_id = t.id) as total_wallet_balance
FROM tenants t;

-- ====================================
-- PHASE 9: ENABLE REALTIME ON ADDITIONAL TABLES
-- ====================================

ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE client_wallets REPLICA IDENTITY FULL;
ALTER TABLE campaigns REPLICA IDENTITY FULL;
ALTER TABLE invoices REPLICA IDENTITY FULL;
ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE workspaces REPLICA IDENTITY FULL;
ALTER TABLE channels REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_wallets; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channels; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ====================================
-- PHASE 10: AUTO UPDATE DASHBOARD METRICS FUNCTION
-- ====================================

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_revenue NUMERIC;
  v_campaigns INT;
  v_pkg_usage NUMERIC;
  v_utilization NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM invoices
  WHERE tenant_id = p_tenant_id AND status = 'paid';

  SELECT COUNT(*) INTO v_campaigns
  FROM campaigns
  WHERE tenant_id = p_tenant_id AND status IN ('live', 'approved');

  SELECT COALESCE(AVG(CASE WHEN pu.total > 0 THEN (pu.used::NUMERIC / pu.total * 100) ELSE 0 END), 0) INTO v_pkg_usage
  FROM package_usage pu
  JOIN client_packages cp ON pu.client_package_id = cp.id
  JOIN clients c ON cp.client_id = c.id
  WHERE c.tenant_id = p_tenant_id AND cp.status = 'active';

  SELECT COALESCE(AVG(current_load), 0) INTO v_utilization
  FROM team_members
  WHERE tenant_id = p_tenant_id;

  UPDATE dashboard_metrics
  SET value = '$' || TO_CHAR(v_revenue, 'FM999,999'),
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'revenue';

  UPDATE dashboard_metrics
  SET value = v_campaigns::TEXT,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'campaigns';

  UPDATE dashboard_metrics
  SET value = ROUND(v_pkg_usage)::TEXT || '%',
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'package_usage';

  UPDATE dashboard_metrics
  SET value = ROUND(v_utilization)::TEXT || '%',
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND metric_key = 'utilization';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
