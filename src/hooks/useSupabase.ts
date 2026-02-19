import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseSupabaseQueryOptions<T> {
  table: string;
  select?: string;
  filter?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  transform?: (data: unknown[]) => T[];
}

export interface UseSupabaseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupabaseQuery<T = unknown>(
  options: UseSupabaseQueryOptions<T>
): UseSupabaseQueryResult<T> {
  const { table, select = '*', filter, orderBy, limit, enabled = true, transform } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select);

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      query = query.eq('tenant_id', DEMO_TENANT_ID);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      const finalData = transform ? transform(result || []) : (result as T[]) || [];
      setData(finalData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error(`Supabase query error (${table}):`, err);
    } finally {
      setLoading(false);
    }
  }, [table, select, JSON.stringify(filter), orderBy?.column, orderBy?.ascending, limit, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useRealtimeSubscription(
  table: string,
  callback: (payload: unknown) => void
) {
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
}

export async function supabaseInsert<T extends Record<string, unknown>>(
  table: string,
  data: T
): Promise<{ data: T | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from(table)
    .insert({ ...data, tenant_id: DEMO_TENANT_ID })
    .select()
    .single();

  return {
    data: result as T | null,
    error: error?.message || null,
  };
}

export async function supabaseUpdate<T extends Record<string, unknown>>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  return {
    data: result as T | null,
    error: error?.message || null,
  };
}

export async function supabaseDelete(
  table: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  return { error: error?.message || null };
}
