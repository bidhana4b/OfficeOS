import { useState, useEffect, useCallback } from 'react';
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';
import type { Client, Activity, ClientPerformance, PackageFeatureInfo, PackageUsageItem } from '@/components/clients/types';

export function useClients() {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('clients')
        .select(`
          *,
          account_manager:team_members!clients_account_manager_id_fkey(id, name, avatar),
          client_wallets(balance, currency),
          client_packages(
            id, start_date, renewal_date, status, custom_monthly_fee, notes,
            package:packages(id, name, tier, plan_type, monthly_fee, currency, description, features, platform_count, correction_limit),
            package_usage(deliverable_type, used, total),
            client_package_features(deliverable_type, label, icon, total_allocated, unit_label, warning_threshold, auto_deduction)
          )
        `)
        .eq('tenant_id', DEMO_TENANT_ID);

      if (err) throw err;

      const mapped: Client[] = (result || []).map((r: Record<string, unknown>) => {
        const mgr = r.account_manager as Record<string, unknown> | null;
        const wallets = r.client_wallets as Record<string, unknown>[] | null;
        const wallet = wallets?.[0];
        const clientPkgs = r.client_packages as Record<string, unknown>[] | null;
        const activePkg = clientPkgs?.find((cp) => cp.status === 'active');
        const pkg = activePkg?.package as Record<string, unknown> | null;
        const usageRows = (activePkg?.package_usage as Record<string, unknown>[]) || [];
        const clientPkgFeatures = (activePkg?.client_package_features as Record<string, unknown>[]) || [];

        // Build legacy usage map
        const usageMap: Record<string, { used: number; total: number }> = {};
        usageRows.forEach((u) => {
          const type = u.deliverable_type as string;
          const key = type === 'photo_graphics' ? 'design' :
                      type === 'video_edit' ? 'video' :
                      type === 'copywriting' ? 'copywriting' :
                      type === 'boost_campaign' ? 'boost' : type;
          usageMap[key] = { used: Number(u.used), total: Number(u.total) };
        });

        // Build rich usage items from package_features or client_package_features
        let packageFeatures: PackageFeatureInfo[] = [];
        
        // First try client-specific features
        if (clientPkgFeatures.length > 0) {
          packageFeatures = clientPkgFeatures.map((f) => ({
            deliverable_type: f.deliverable_type as string,
            label: f.label as string,
            icon: (f.icon as string) || 'package',
            total_allocated: Number(f.total_allocated) || 0,
            unit_label: (f.unit_label as string) || 'units',
            warning_threshold: Number(f.warning_threshold) || 20,
            auto_deduction: f.auto_deduction as boolean ?? true,
          }));
        }

        // Build rich usage items with labels
        const usageItems: PackageUsageItem[] = usageRows.map((u) => {
          const dtype = u.deliverable_type as string;
          const feature = packageFeatures.find((f) => f.deliverable_type === dtype);
          const labelMap: Record<string, string> = {
            photo_graphics: 'Photo/Graphics Design',
            video_edit: 'Video Edit',
            motion_graphics: 'Motion Graphics',
            reels: 'Reels',
            copywriting: 'Copywriting',
            customer_frames: 'Customer Frames',
            service_frames: 'Service Frames',
            boost_campaign: 'Boost Campaign',
            ads_management: 'Ads Management',
            influencer_marketing: 'Influencer Marketing',
            seo: 'SEO',
            social_media_posts: 'Social Media Posts',
          };
          return {
            deliverable_type: dtype,
            label: feature?.label || labelMap[dtype] || dtype,
            icon: feature?.icon || 'package',
            used: Number(u.used) || 0,
            total: Number(u.total) || 0,
            unit_label: feature?.unit_label || 'units',
            warning_threshold: feature?.warning_threshold || 20,
          };
        });

        const planTypeMap: Record<string, string> = {
          'Infinity Plan': 'Infinity',
          'Eco Lite': 'Eco Lite',
          'Category-Based': 'Royal Dominance',
        };

        return {
          id: r.id as string,
          businessName: r.business_name as string,
          category: (r.category as Client['category']) || 'Other',
          location: (r.location as string) || '',
          contactInfo: {
            email: (r.contact_email as string) || '',
            phone: (r.contact_phone as string) || '',
            website: r.contact_website as string | undefined,
          },
          accountManager: {
            id: (mgr?.id as string) || '',
            name: (mgr?.name as string) || 'Unassigned',
            avatar: (mgr?.avatar as string) || '',
          },
          package: {
            name: (pkg?.name as string) || 'No Package',
            tier: ((pkg?.tier as string) || 'Starter') as Client['package']['tier'],
            type: (planTypeMap[(pkg?.plan_type as string) || ''] || 'Infinity') as Client['package']['type'],
            startDate: (activePkg?.start_date as string) || '',
            renewalDate: (activePkg?.renewal_date as string) || '',
            monthlyFee: Number(pkg?.monthly_fee) || 0,
            currency: (pkg?.currency as string) || 'BDT',
            description: (pkg?.description as string) || '',
            features: (pkg?.features as string[]) || [],
            platformCount: Number(pkg?.platform_count) || 1,
            correctionLimit: Number(pkg?.correction_limit) || 2,
          },
          packageFeatures,
          usage: {
            design: usageMap.design || { used: 0, total: 0 },
            video: usageMap.video || { used: 0, total: 0 },
            copywriting: usageMap.copywriting || { used: 0, total: 0 },
            boost: usageMap.boost || { used: 0, total: 0 },
          },
          usageItems,
          status: (r.status as Client['status']) || 'active',
          healthScore: (r.health_score as number) || 0,
          wallet: {
            balance: Number(wallet?.balance) || 0,
            currency: (wallet?.currency as string) || 'BDT',
          },
          clientPackageId: (activePkg?.id as string) || undefined,
          customMonthlyFee: activePkg?.custom_monthly_fee ? Number(activePkg.custom_monthly_fee) : undefined,
          notes: (activePkg?.notes as string) || undefined,
        };
      });
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useClientActivities(clientId?: string) {
  const [data, setData] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activities')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('timestamp', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: result, error: err } = await query;
      if (err) throw err;

      const mapped: Activity[] = (result || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        clientId: (r.client_id as string) || '',
        type: (r.type as Activity['type']) || 'deliverable_created',
        title: r.title as string,
        description: (r.description as string) || '',
        timestamp: r.timestamp as string,
        metadata: r.metadata as Activity['metadata'],
      }));
      setData(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading activities');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useClientPerformance(clientId: string) {
  const [data, setData] = useState<ClientPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('client_performance')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (err && err.code !== 'PGRST116') throw err;

      if (result) {
        setData({
          clientId: result.client_id,
          postsPublished: result.posts_published,
          reelsPublished: result.reels_published,
          customerFramesDelivered: result.customer_frames_delivered,
          reviewVideosDelivered: result.review_videos_delivered,
          adSpendThisMonth: Number(result.ad_spend_this_month),
          leadsGenerated: result.leads_generated,
          testRideBookings: result.test_ride_bookings,
          period: {
            start: result.period_start,
            end: result.period_end,
          },
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading performance');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
