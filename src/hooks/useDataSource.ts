import { useState, useEffect, useCallback } from 'react';
import { getTableCounts, type TableCounts } from '@/lib/data-service';

export interface DataSourceStatus {
  isLive: boolean;
  counts: TableCounts | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check whether data is coming from the real database or fallback/mock.
 * Returns counts of key tables so components can show "Live" or "Demo" badges.
 */
export function useDataSource(): DataSourceStatus {
  const [counts, setCounts] = useState<TableCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTableCounts();
      setCounts(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to check data source');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const isLive = counts !== null && (
    counts.clients > 0 ||
    counts.team_members > 0 ||
    counts.deliverables > 0
  );

  return { isLive, counts, loading, error, refetch: fetchCounts };
}
