import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

// ===== Types =====
export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export interface DeliverableTypeRow {
  id: string;
  type_key: string;
  label: string;
  icon: string;
  unit_label: string;
  hours_per_unit: number;
  is_active: boolean;
  sort_order: number;
}

export interface PackageFeatureRow {
  id: string;
  deliverable_type: string;
  label: string;
  icon: string;
  total_allocated: number;
  warning_threshold: number;
  auto_deduction: boolean;
  unit_label: string;
}

export interface PackageRow {
  id: string;
  name: string;
  plan_type: string;
  category: string | null;
  tier: string;
  monthly_fee: number;
  currency: string;
  platform_count: number;
  correction_limit: number;
  description: string;
  features: string[];
  recommended: boolean;
  is_active: boolean;
  created_at: string;
  package_features: PackageFeatureRow[];
}

export interface ClientPackageRow {
  id: string;
  client_id: string;
  package_id: string;
  start_date: string;
  renewal_date: string | null;
  status: string;
  custom_monthly_fee: number | null;
  notes: string | null;
  created_at: string;
  packages?: PackageRow;
  client_package_features?: PackageFeatureRow[];
}

// ===== Service Categories Hook =====
export function useServiceCategories() {
  const [data, setData] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from('service_categories')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('is_active', true)
      .order('sort_order');
    setData((rows || []) as ServiceCategory[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const create = async (cat: Partial<ServiceCategory>) => {
    if (!supabase) return new Error('No connection');
    const { error } = await supabase.from('service_categories').insert({
      tenant_id: DEMO_TENANT_ID,
      name: cat.name,
      icon: cat.icon || 'folder',
      color: cat.color || 'cyan',
      description: cat.description || '',
      sort_order: cat.sort_order || data.length + 1,
    });
    if (!error) await fetchCategories();
    return error;
  };

  const update = async (id: string, cat: Partial<ServiceCategory>) => {
    const { error } = await supabase.from('service_categories').update(cat).eq('id', id);
    if (!error) await fetchCategories();
    return error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('service_categories').update({ is_active: false }).eq('id', id);
    if (!error) await fetchCategories();
    return error;
  };

  return { data, loading, refetch: fetchCategories, create, update, remove };
}

// ===== Deliverable Types Hook =====
export function useDeliverableTypes() {
  const [data, setData] = useState<DeliverableTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('deliverable_types')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('is_active', true)
      .order('sort_order');
    setData((rows || []) as DeliverableTypeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const create = async (dt: Partial<DeliverableTypeRow>) => {
    const { error } = await supabase.from('deliverable_types').insert({
      tenant_id: DEMO_TENANT_ID,
      type_key: dt.type_key,
      label: dt.label,
      icon: dt.icon || 'package',
      unit_label: dt.unit_label || 'units',
      hours_per_unit: dt.hours_per_unit || 1,
      sort_order: dt.sort_order || data.length + 1,
    });
    if (!error) await fetchTypes();
    return error;
  };

  const update = async (id: string, dt: Partial<DeliverableTypeRow>) => {
    const { error } = await supabase.from('deliverable_types').update(dt).eq('id', id);
    if (!error) await fetchTypes();
    return error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('deliverable_types').update({ is_active: false }).eq('id', id);
    if (!error) await fetchTypes();
    return error;
  };

  return { data, loading, refetch: fetchTypes, create, update, remove };
}

// ===== Packages CRUD Hook =====
export function usePackages() {
  const [data, setData] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('packages')
        .select('*, package_features(*)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setData((result || []) as PackageRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createPackage = async (pkg: {
    name: string;
    plan_type: string;
    category: string | null;
    tier: string;
    monthly_fee: number;
    currency?: string;
    platform_count?: number;
    correction_limit?: number;
    description?: string;
    features?: string[];
    recommended?: boolean;
    deliverables: { deliverable_type: string; label: string; icon: string; total_allocated: number; unit_label: string; warning_threshold?: number; auto_deduction?: boolean }[];
  }) => {
    const { data: newPkg, error: pkgErr } = await supabase
      .from('packages')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        name: pkg.name,
        plan_type: pkg.plan_type,
        category: pkg.category,
        tier: pkg.tier,
        monthly_fee: pkg.monthly_fee,
        currency: pkg.currency || 'BDT',
        platform_count: pkg.platform_count || 1,
        correction_limit: pkg.correction_limit || 2,
        description: pkg.description || '',
        features: pkg.features || [],
        recommended: pkg.recommended || false,
      })
      .select()
      .single();

    if (pkgErr) return pkgErr;

    if (pkg.deliverables.length > 0 && newPkg) {
      const featureRows = pkg.deliverables.map((d) => ({
        package_id: newPkg.id,
        deliverable_type: d.deliverable_type,
        label: d.label,
        icon: d.icon,
        total_allocated: d.total_allocated,
        unit_label: d.unit_label,
        warning_threshold: d.warning_threshold || 20,
        auto_deduction: d.auto_deduction ?? true,
      }));
      const { error: featErr } = await supabase.from('package_features').insert(featureRows);
      if (featErr) return featErr;
    }

    await fetchData();
    return null;
  };

  const updatePackage = async (id: string, pkg: {
    name?: string;
    plan_type?: string;
    category?: string | null;
    tier?: string;
    monthly_fee?: number;
    currency?: string;
    platform_count?: number;
    correction_limit?: number;
    description?: string;
    features?: string[];
    recommended?: boolean;
    deliverables?: { deliverable_type: string; label: string; icon: string; total_allocated: number; unit_label: string; warning_threshold?: number; auto_deduction?: boolean }[];
  }) => {
    const { deliverables, ...pkgData } = pkg;
    const { error: pkgErr } = await supabase.from('packages').update(pkgData).eq('id', id);
    if (pkgErr) return pkgErr;

    if (deliverables) {
      await supabase.from('package_features').delete().eq('package_id', id);
      if (deliverables.length > 0) {
        const featureRows = deliverables.map((d) => ({
          package_id: id,
          deliverable_type: d.deliverable_type,
          label: d.label,
          icon: d.icon,
          total_allocated: d.total_allocated,
          unit_label: d.unit_label,
          warning_threshold: d.warning_threshold || 20,
          auto_deduction: d.auto_deduction ?? true,
        }));
        const { error: featErr } = await supabase.from('package_features').insert(featureRows);
        if (featErr) return featErr;
      }
    }

    await fetchData();
    return null;
  };

  const deletePackage = async (id: string) => {
    const { error: err } = await supabase.from('packages').update({ is_active: false }).eq('id', id);
    if (!err) await fetchData();
    return err;
  };

  return { data, loading, error, refetch: fetchData, createPackage, updatePackage, deletePackage };
}

// ===== Client Packages Hook =====
export function useClientPackages(clientId?: string) {
  const [data, setData] = useState<ClientPackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientPkgs = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from('client_packages')
      .select('*, packages(*, package_features(*)), client_package_features(*)')
      .eq('client_id', clientId);
    setData((rows || []) as ClientPackageRow[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchClientPkgs(); }, [fetchClientPkgs]);

  const assignPackage = async (params: {
    client_id: string;
    package_id: string;
    start_date: string;
    renewal_date?: string;
    custom_monthly_fee?: number;
    notes?: string;
    custom_features?: { deliverable_type: string; label: string; icon: string; total_allocated: number; unit_label: string; warning_threshold?: number; auto_deduction?: boolean }[];
  }) => {
    const { data: cp, error: cpErr } = await supabase
      .from('client_packages')
      .insert({
        client_id: params.client_id,
        package_id: params.package_id,
        start_date: params.start_date,
        renewal_date: params.renewal_date || null,
        custom_monthly_fee: params.custom_monthly_fee || null,
        notes: params.notes || null,
      })
      .select()
      .single();

    if (cpErr) return cpErr;

    if (params.custom_features && params.custom_features.length > 0 && cp) {
      const rows = params.custom_features.map((f) => ({
        client_package_id: cp.id,
        deliverable_type: f.deliverable_type,
        label: f.label,
        icon: f.icon,
        total_allocated: f.total_allocated,
        unit_label: f.unit_label,
        warning_threshold: f.warning_threshold || 20,
        auto_deduction: f.auto_deduction ?? true,
      }));
      await supabase.from('client_package_features').insert(rows);
    }

    if (cp) {
      const pkg = await supabase.from('packages').select('*, package_features(*)').eq('id', params.package_id).single();
      if (pkg.data) {
        const features = params.custom_features || (pkg.data.package_features as { deliverable_type: string; total_allocated: number }[]) || [];
        const usageRows = features.map((f) => ({
          client_package_id: cp.id,
          deliverable_type: f.deliverable_type,
          used: 0,
          total: f.total_allocated,
        }));
        if (usageRows.length > 0) {
          await supabase.from('package_usage').insert(usageRows);
        }
      }
    }

    await fetchClientPkgs();
    return null;
  };

  const updateClientPackage = async (cpId: string, params: {
    status?: string;
    custom_monthly_fee?: number;
    notes?: string;
    renewal_date?: string;
    custom_features?: { deliverable_type: string; label: string; icon: string; total_allocated: number; unit_label: string; warning_threshold?: number; auto_deduction?: boolean }[];
  }) => {
    const { custom_features, ...rest } = params;
    const { error: updateError } = await supabase.from('client_packages').update(rest).eq('id', cpId);
    if (updateError) return updateError;

    if (custom_features) {
      await supabase.from('client_package_features').delete().eq('client_package_id', cpId);
      if (custom_features.length > 0) {
        const rows = custom_features.map((f) => ({
          client_package_id: cpId,
          ...f,
          warning_threshold: f.warning_threshold || 20,
          auto_deduction: f.auto_deduction ?? true,
        }));
        await supabase.from('client_package_features').insert(rows);
      }
    }

    await fetchClientPkgs();
    return null;
  };

  const removeClientPackage = async (cpId: string) => {
    const { error: delError } = await supabase.from('client_packages').delete().eq('id', cpId);
    if (!delError) await fetchClientPkgs();
    return delError;
  };

  return { data, loading, refetch: fetchClientPkgs, assignPackage, updateClientPackage, removeClientPackage };
}

// ===== All Client Packages (for PackageHub overview) =====
export function useAllClientPackages() {
  const [data, setData] = useState<(ClientPackageRow & { client_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('client_packages')
      .select('*, packages(*, package_features(*)), client_package_features(*)')
      .order('created_at', { ascending: false });

    if (rows) {
      const clientIds = [...new Set(rows.map((r: Record<string, unknown>) => r.client_id as string))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, business_name')
        .in('id', clientIds);
      const clientMap = new Map((clients || []).map((c: Record<string, unknown>) => [c.id as string, c.business_name as string]));

      setData(rows.map((r: Record<string, unknown>) => ({
        ...(r as ClientPackageRow),
        client_name: clientMap.get(r.client_id as string) || 'Unknown',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { data, loading, refetch: fetchAll };
}

// ===== Package Usage with Realtime (for WorkloadEngine recalculation) =====
export interface PackageUsageRow {
  id: string;
  client_package_id: string;
  deliverable_type: string;
  used: number;
  total: number;
  allocated: number;
  remaining: number;
  usage_percent: number;
  warning_threshold: number;
  warning_triggered: boolean;
  depleted_at: string | null;
  label: string;
  icon: string;
  unit_label: string;
  auto_deduction: boolean;
  source: 'client_override' | 'package_default' | 'usage_only';
}

export function usePackageUsage(clientPackageId?: string) {
  const [data, setData] = useState<PackageUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!clientPackageId || !supabase) { setData([]); setLoading(false); return; }
    setLoading(true);

    // Try RPC with overrides first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_package_usage_with_overrides', {
      p_client_package_id: clientPackageId,
    });

    if (!rpcErr && rpcData) {
      setData(rpcData as PackageUsageRow[]);
    } else {
      // Fallback: raw package_usage
      const { data: rawData } = await supabase
        .from('package_usage')
        .select('*')
        .eq('client_package_id', clientPackageId);
      setData((rawData || []).map((r: Record<string, unknown>) => ({
        ...r,
        allocated: (r.allocated as number) || (r.total as number) || 0,
        remaining: Math.max(((r.total as number) || 0) - ((r.used as number) || 0), 0),
        usage_percent: (r.total as number) > 0 ? Math.round(((r.used as number) / (r.total as number)) * 100) : 0,
        warning_threshold: 20,
        warning_triggered: false,
        depleted_at: null,
        label: r.deliverable_type as string,
        icon: 'package',
        unit_label: 'units',
        auto_deduction: true,
        source: 'usage_only' as const,
      })) as PackageUsageRow[]);
    }
    setLoading(false);
  }, [clientPackageId]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  // Realtime subscription on package_usage changes → recalculate
  useEffect(() => {
    if (!clientPackageId || !supabase) return;

    const channel = supabase
      .channel(`package_usage_${clientPackageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_usage',
          filter: `client_package_id=eq.${clientPackageId}`,
        },
        () => {
          fetchUsage();
        }
      )
      .subscribe();

    subRef.current = channel;

    return () => {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
    };
  }, [clientPackageId, fetchUsage]);

  return { data, loading, refetch: fetchUsage };
}

// ===== Usage Deduction Events Hook =====
export interface UsageDeductionEventRow {
  id: string;
  client_package_id: string;
  deliverable_id: string | null;
  deliverable_type: string;
  deliverable_name: string;
  quantity: number;
  confirmed_by: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export function useUsageDeductionEvents(clientPackageId?: string) {
  const [data, setData] = useState<UsageDeductionEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!clientPackageId || !supabase) { setData([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from('usage_deduction_events')
      .select('*')
      .eq('client_package_id', clientPackageId)
      .order('created_at', { ascending: false })
      .limit(50);
    setData((rows || []) as UsageDeductionEventRow[]);
    setLoading(false);
  }, [clientPackageId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!clientPackageId || !supabase) return;

    const channel = supabase
      .channel(`usage_events_${clientPackageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'usage_deduction_events',
          filter: `client_package_id=eq.${clientPackageId}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    subRef.current = channel;

    return () => {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
    };
  }, [clientPackageId, fetchEvents]);

  const cancelEvent = async (eventId: string) => {
    if (!supabase) return;
    await supabase.from('usage_deduction_events').update({ status: 'cancelled' }).eq('id', eventId);
    await fetchEvents();
  };

  const confirmEvent = async (eventId: string) => {
    if (!supabase) return;
    await supabase.from('usage_deduction_events').update({ status: 'confirmed' }).eq('id', eventId);
    await fetchEvents();
  };

  return { data, loading, refetch: fetchEvents, cancelEvent, confirmEvent };
}

// ===== Pre-Deduction Check Hook =====
export function useUsageCheck() {
  const [checking, setChecking] = useState(false);

  const checkUsage = useCallback(async (
    clientPackageId: string,
    deliverableType: string,
    quantity: number = 1
  ) => {
    if (!supabase) return { can_deduct: true, remaining: 0, warning_active: false, message: 'No connection' };
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc('check_usage_before_deduction', {
        p_client_package_id: clientPackageId,
        p_deliverable_type: deliverableType,
        p_quantity: quantity,
      });

      if (error) return { can_deduct: true, remaining: 0, warning_active: false, message: error.message };
      const row = Array.isArray(data) ? data[0] : data;
      return {
        can_deduct: row?.can_deduct ?? true,
        current_used: row?.current_used ?? 0,
        current_total: row?.current_total ?? 0,
        remaining: row?.remaining ?? 0,
        warning_active: row?.warning_active ?? false,
        message: row?.message ?? 'OK',
      };
    } finally {
      setChecking(false);
    }
  }, []);

  return { checkUsage, checking };
}
