/**
 * TITAN DEV AI — Sidebar Badge Counts Hook
 * Fetches real-time counts for sidebar navigation badges
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToTable } from '@/lib/data-service';

export interface SidebarBadges {
  messaging: number;
  clients: number;
  packages: number;
  projects: number;
  media: number;
  team: number;
  finance: number;
}

const defaultBadges: SidebarBadges = {
  messaging: 0,
  clients: 0,
  packages: 0,
  projects: 0,
  media: 0,
  team: 0,
  finance: 0,
};

export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges>(defaultBadges);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchBadges = useCallback(async () => {
    if (!supabase) return;

    try {
      // Fetch all counts in parallel
      const [
        messagesRes,
        clientsRes,
        packagesRes,
        deliverablesRes,
        campaignsRes,
        teamRes,
        invoicesRes,
      ] = await Promise.allSettled([
        // Unread messages: messages in last 24h (proxy for unread)
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        // Active clients
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        // Active packages
        supabase
          .from('packages')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        // In-progress deliverables
        supabase
          .from('deliverables')
          .select('id', { count: 'exact', head: true })
          .in('status', ['in_progress', 'pending', 'revision']),
        // Active campaigns
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .in('status', ['active', 'pending']),
        // Active team members
        supabase
          .from('team_members')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        // Pending invoices
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'overdue']),
      ]);

      if (!mountedRef.current) return;

      const getCount = (res: PromiseSettledResult<{ count: number | null }>) =>
        res.status === 'fulfilled' ? (res.value?.count ?? 0) : 0;

      setBadges({
        messaging: getCount(messagesRes as PromiseSettledResult<{ count: number | null }>),
        clients: getCount(clientsRes as PromiseSettledResult<{ count: number | null }>),
        packages: getCount(packagesRes as PromiseSettledResult<{ count: number | null }>),
        projects: getCount(deliverablesRes as PromiseSettledResult<{ count: number | null }>),
        media: getCount(campaignsRes as PromiseSettledResult<{ count: number | null }>),
        team: getCount(teamRes as PromiseSettledResult<{ count: number | null }>),
        finance: getCount(invoicesRes as PromiseSettledResult<{ count: number | null }>),
      });
    } catch (error) {
      console.error('[SidebarBadges] Failed to fetch counts:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchBadges();

    // Subscribe to real-time changes for badge updates
    const unsubs = [
      subscribeToTable('messages', () => fetchBadges()),
      subscribeToTable('clients', () => fetchBadges()),
      subscribeToTable('deliverables', () => fetchBadges()),
      subscribeToTable('campaigns', () => fetchBadges()),
      subscribeToTable('invoices', () => fetchBadges()),
    ];

    return () => {
      mountedRef.current = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, [fetchBadges]);

  return { badges, loading, refetch: fetchBadges };
}
