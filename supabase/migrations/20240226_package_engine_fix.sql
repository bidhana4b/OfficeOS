-- =====================================================
-- PACKAGE ENGINE FIX — Complete Overhaul
-- 1. Unified init_package_usage trigger (package_features priority)
-- 2. All service items create package_usage rows
-- 3. Deduction enforcement (block at 0, threshold warning, activity log)
-- 4. client_package_features override package_features
-- 5. Realtime for workload recalculation
-- =====================================================

-- ─────────────────────────────────────────────────
-- 1. UNIFIED init_package_usage TRIGGER
--    Priority: client_package_features > package_features > package_deliverables
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_init_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO package_usage (client_package_id, deliverable_type, used, total, allocated)
  SELECT
    NEW.id,
    pf.deliverable_type,
    0,
    pf.total_allocated,
    pf.total_allocated
  FROM package_features pf
  WHERE pf.package_id = NEW.package_id
  ON CONFLICT (client_package_id, deliverable_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    INSERT INTO package_usage (client_package_id, deliverable_type, used, total, allocated)
    SELECT
      NEW.id,
      pd.deliverable_type,
      0,
      pd.quantity,
      pd.quantity
    FROM package_deliverables pd
    WHERE pd.package_id = NEW.package_id
    ON CONFLICT (client_package_id, deliverable_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_usage ON client_packages;
DROP TRIGGER IF EXISTS trg_auto_init_package_usage ON client_packages;
CREATE TRIGGER trg_auto_init_package_usage
  AFTER INSERT ON client_packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_package_usage();

-- ─────────────────────────────────────────────────
-- 1b. Ensure package_usage has unique constraint and allocated column
-- ─────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE package_usage ADD COLUMN IF NOT EXISTS allocated INT DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE package_usage ADD COLUMN IF NOT EXISTS warning_triggered BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE package_usage ADD COLUMN IF NOT EXISTS depleted_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE package_usage SET allocated = total WHERE allocated = 0 AND total > 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE package_usage
    ADD CONSTRAINT uq_package_usage_cp_dt UNIQUE (client_package_id, deliverable_type);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─────────────────────────────────────────────────
-- 2. OVERRIDE TRIGGER: When client_package_features are inserted,
--    update the corresponding package_usage.total to match
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_client_package_features_to_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE package_usage
  SET total = NEW.total_allocated,
      allocated = NEW.total_allocated,
      updated_at = NOW()
  WHERE client_package_id = NEW.client_package_id
    AND deliverable_type = NEW.deliverable_type;

  IF NOT FOUND THEN
    INSERT INTO package_usage (client_package_id, deliverable_type, used, total, allocated)
    VALUES (NEW.client_package_id, NEW.deliverable_type, 0, NEW.total_allocated, NEW.total_allocated)
    ON CONFLICT (client_package_id, deliverable_type) 
    DO UPDATE SET total = EXCLUDED.total, allocated = EXCLUDED.total, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_cpf_to_usage ON client_package_features;
CREATE TRIGGER trg_sync_cpf_to_usage
  AFTER INSERT OR UPDATE ON client_package_features
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_package_features_to_usage();

-- ─────────────────────────────────────────────────
-- 3. ENHANCED DEDUCTION TRIGGER
--    - Block deduction when remaining = 0
--    - Mark warning_triggered when threshold reached
--    - Mark depleted_at when fully used
--    - Log activity on deduction
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION deduct_package_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_client_package_id UUID;
  v_deliverable_type TEXT;
  v_quantity INT;
  v_current_used INT;
  v_current_total INT;
  v_remaining INT;
  v_warning_threshold INT;
  v_tenant_id UUID;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_client_package_id := NEW.client_package_id;
    v_deliverable_type := NEW.deliverable_type;
    v_quantity := COALESCE(NEW.quantity, 1);

    IF v_client_package_id IS NOT NULL AND v_deliverable_type IS NOT NULL THEN
      SELECT used, total INTO v_current_used, v_current_total
      FROM package_usage
      WHERE client_package_id = v_client_package_id
        AND deliverable_type = v_deliverable_type;

      IF FOUND THEN
        v_remaining := GREATEST(v_current_total - v_current_used, 0);

        IF v_remaining <= 0 THEN
          RAISE WARNING 'Package usage depleted for type % (used: %, total: %). Deduction blocked.',
            v_deliverable_type, v_current_used, v_current_total;
          RETURN NEW;
        END IF;

        IF v_quantity > v_remaining THEN
          v_quantity := v_remaining;
        END IF;

        SELECT COALESCE(
          (SELECT cpf.warning_threshold FROM client_package_features cpf
           WHERE cpf.client_package_id = v_client_package_id
             AND cpf.deliverable_type = v_deliverable_type),
          20
        ) INTO v_warning_threshold;

        UPDATE package_usage
        SET used = used + v_quantity,
            warning_triggered = CASE
              WHEN (v_current_total > 0)
                AND (((v_current_used + v_quantity)::NUMERIC / v_current_total * 100) >= (100 - v_warning_threshold))
              THEN true
              ELSE warning_triggered
            END,
            depleted_at = CASE
              WHEN (v_current_used + v_quantity) >= v_current_total THEN NOW()
              ELSE depleted_at
            END,
            updated_at = NOW()
        WHERE client_package_id = v_client_package_id
          AND deliverable_type = v_deliverable_type;

        INSERT INTO usage_deduction_events (
          client_package_id, deliverable_id, deliverable_type,
          deliverable_name, quantity, confirmed_by, status
        ) VALUES (
          v_client_package_id, NEW.id, v_deliverable_type,
          NEW.title, v_quantity, COALESCE(NEW.confirmed_by, 'system'), 'confirmed'
        );

        SELECT tenant_id INTO v_tenant_id FROM deliverables WHERE id = NEW.id;

        BEGIN
          INSERT INTO activities (
            tenant_id, type, title, description,
            entity_type, entity_id, metadata
          ) VALUES (
            COALESCE(v_tenant_id, NEW.tenant_id),
            'usage_deducted',
            'Usage Deducted: ' || v_deliverable_type,
            v_quantity || ' unit(s) of ' || v_deliverable_type || ' deducted. Remaining: ' || (v_remaining - v_quantity),
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'client_package_id', v_client_package_id,
              'deliverable_type', v_deliverable_type,
              'quantity_deducted', v_quantity,
              'used_after', v_current_used + v_quantity,
              'total', v_current_total,
              'remaining_after', v_remaining - v_quantity,
              'warning_triggered', ((v_current_used + v_quantity)::NUMERIC / NULLIF(v_current_total, 0) * 100) >= (100 - v_warning_threshold)
            )
          );
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
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

-- ─────────────────────────────────────────────────
-- 4. RLS + Realtime for package_usage (ensures workload recalculation)
-- ─────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE package_usage REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE usage_deduction_events REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE package_usage;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE usage_deduction_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "package_usage_all_access" ON package_usage;
CREATE POLICY "package_usage_all_access" ON package_usage FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "usage_deduction_events_all_access" ON usage_deduction_events;
CREATE POLICY "usage_deduction_events_all_access" ON usage_deduction_events FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────
-- 5. HELPER: get_package_usage_with_overrides RPC
--    Returns usage data with client_package_features overriding defaults
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_package_usage_with_overrides(p_client_package_id UUID)
RETURNS TABLE (
  id UUID,
  client_package_id UUID,
  deliverable_type TEXT,
  used INT,
  total INT,
  allocated INT,
  remaining INT,
  usage_percent NUMERIC,
  warning_threshold INT,
  warning_triggered BOOLEAN,
  depleted_at TIMESTAMPTZ,
  label TEXT,
  icon TEXT,
  unit_label TEXT,
  auto_deduction BOOLEAN,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pu.id,
    pu.client_package_id,
    pu.deliverable_type,
    pu.used,
    pu.total,
    COALESCE(pu.allocated, pu.total) as allocated,
    GREATEST(pu.total - pu.used, 0) as remaining,
    CASE WHEN pu.total > 0 THEN ROUND((pu.used::NUMERIC / pu.total) * 100, 1) ELSE 0 END as usage_percent,
    COALESCE(cpf.warning_threshold, 20) as warning_threshold,
    COALESCE(pu.warning_triggered, false) as warning_triggered,
    pu.depleted_at,
    COALESCE(cpf.label, pf.label, pu.deliverable_type) as label,
    COALESCE(cpf.icon, pf.icon, 'package') as icon,
    COALESCE(cpf.unit_label, pf.unit_label, 'units') as unit_label,
    COALESCE(cpf.auto_deduction, pf.auto_deduction, true) as auto_deduction,
    CASE
      WHEN cpf.id IS NOT NULL THEN 'client_override'
      WHEN pf.id IS NOT NULL THEN 'package_default'
      ELSE 'usage_only'
    END as source
  FROM package_usage pu
  LEFT JOIN client_package_features cpf
    ON cpf.client_package_id = pu.client_package_id
    AND cpf.deliverable_type = pu.deliverable_type
  LEFT JOIN client_packages cp
    ON cp.id = pu.client_package_id
  LEFT JOIN package_features pf
    ON pf.package_id = cp.package_id
    AND pf.deliverable_type = pu.deliverable_type
  WHERE pu.client_package_id = p_client_package_id
  ORDER BY pu.deliverable_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────
-- 6. HELPER: check_usage_before_deduction RPC
--    Called before creating deliverable to validate remaining quota
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_usage_before_deduction(
  p_client_package_id UUID,
  p_deliverable_type TEXT,
  p_quantity INT DEFAULT 1
)
RETURNS TABLE (
  can_deduct BOOLEAN,
  current_used INT,
  current_total INT,
  remaining INT,
  warning_active BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_used INT;
  v_total INT;
  v_remaining INT;
  v_threshold INT;
  v_warn BOOLEAN;
BEGIN
  SELECT pu.used, pu.total INTO v_used, v_total
  FROM package_usage pu
  WHERE pu.client_package_id = p_client_package_id
    AND pu.deliverable_type = p_deliverable_type;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      0::INT,
      0::INT,
      0::INT,
      false::BOOLEAN,
      'No usage record found for this deliverable type'::TEXT;
    RETURN;
  END IF;

  v_remaining := GREATEST(v_total - v_used, 0);

  SELECT COALESCE(cpf.warning_threshold, 20) INTO v_threshold
  FROM client_package_features cpf
  WHERE cpf.client_package_id = p_client_package_id
    AND cpf.deliverable_type = p_deliverable_type;

  IF NOT FOUND THEN v_threshold := 20; END IF;

  v_warn := (v_total > 0) AND (((v_used::NUMERIC / v_total) * 100) >= (100 - v_threshold));

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_used,
      v_total,
      0::INT,
      true::BOOLEAN,
      ('Usage depleted: ' || v_used || '/' || v_total || ' used. No remaining quota.')::TEXT;
    RETURN;
  END IF;

  IF p_quantity > v_remaining THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_used,
      v_total,
      v_remaining,
      v_warn,
      ('Requested ' || p_quantity || ' but only ' || v_remaining || ' remaining.')::TEXT;
    RETURN;
  END IF;

  IF v_warn THEN
    RETURN QUERY SELECT
      true::BOOLEAN,
      v_used,
      v_total,
      v_remaining,
      true::BOOLEAN,
      ('Warning: Only ' || v_remaining || ' remaining (threshold: ' || v_threshold || '%).')::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN,
    v_used,
    v_total,
    v_remaining,
    false::BOOLEAN,
    'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────
-- 7. INDEX for performance
-- ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_package_usage_cp_dt ON package_usage(client_package_id, deliverable_type);
CREATE INDEX IF NOT EXISTS idx_cpf_cp_dt ON client_package_features(client_package_id, deliverable_type);
CREATE INDEX IF NOT EXISTS idx_usage_deduction_cp ON usage_deduction_events(client_package_id);
