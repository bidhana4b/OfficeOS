ALTER TABLE IF EXISTS public.client_wallets
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS client_wallets_tenant_id_idx
  ON public.client_wallets (tenant_id);
