-- =====================================================
-- FIX: Campaign status constraint to match UI values
-- Old: ('draft', 'requested', 'approved', 'live', 'paused', 'completed', 'rejected')
-- New: includes 'active' and 'cancelled' which UI uses
-- =====================================================

-- Drop the existing check constraint and recreate with expanded values
ALTER TABLE IF EXISTS campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE IF EXISTS campaigns 
  ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'requested', 'approved', 'active', 'live', 'paused', 'completed', 'rejected', 'cancelled'));

-- Update any existing 'live' status to 'active' for consistency with UI
UPDATE campaigns SET status = 'active' WHERE status = 'live';
UPDATE campaigns SET status = 'cancelled' WHERE status = 'rejected';
