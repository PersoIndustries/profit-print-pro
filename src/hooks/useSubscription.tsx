import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SubscriptionTier = 'free' | 'tier_1' | 'tier_2';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'canceled';

interface SubscriptionLimits {
  materials: number;
  projects: number;
  monthlyOrders: number;
  metricsHistory: number; // in days
  shoppingLists: number; // configurable, default 5
}

interface GracePeriodInfo {
  isInGracePeriod: boolean;
  gracePeriodEnd?: Date;
  daysUntilDeletion?: number;
  previousTier?: SubscriptionTier;
  downgradeDate?: Date;
  isReadOnly: boolean;
}

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  limits: SubscriptionLimits;
  usage: {
    materials: number;
    projects: number;
    monthlyOrders: number;
    shoppingLists: number;
  };
  canAdd: {
    materials: boolean;
    projects: boolean;
    orders: boolean;
    shoppingLists: boolean;
  };
  trialEndsAt?: Date;
  daysRemaining?: number;
  isTrialActive: boolean;
  gracePeriod: GracePeriodInfo;
}

// Fallback limits (used if database limits are not available)
const DEFAULT_TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    materials: 10,
    projects: 15,
    monthlyOrders: 15,
    metricsHistory: 0,
    shoppingLists: 5
  },
  tier_1: {
    materials: 50,
    projects: 100,
    monthlyOrders: 50,
    metricsHistory: 60,
    shoppingLists: 5
  },
  tier_2: {
    materials: 999999,
    projects: 999999,
    monthlyOrders: 999999,
    metricsHistory: 730,
    shoppingLists: 5
  }
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        // Fetch subscription tier and status
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('tier, status, expires_at, grace_period_end, previous_tier, downgrade_date, is_read_only')
          .eq('user_id', user.id)
          .single();

        if (subError) throw subError;

        const tier = (subData?.tier || 'free') as SubscriptionTier;
        const status = (subData?.status || 'active') as SubscriptionStatus;
        const expiresAt = subData?.expires_at ? new Date(subData.expires_at) : undefined;
        
        // Fetch limits from database, fallback to defaults if not available
        let limits: SubscriptionLimits;
        try {
          // Note: Using 'as any' because subscription_limits table types haven't been generated yet
          // After running the migration, regenerate types with: npx supabase gen types typescript
          const { data: limitsData, error: limitsError } = await (supabase
            .from('subscription_limits' as any)
            .select('materials, projects, monthly_orders, metrics_history, shopping_lists')
            .eq('tier', tier)
            .single() as any);

          if (limitsError || !limitsData) {
            // Fallback to default limits
            limits = DEFAULT_TIER_LIMITS[tier];
          } else {
            limits = {
              materials: limitsData.materials,
              projects: limitsData.projects,
              monthlyOrders: limitsData.monthly_orders,
              metricsHistory: limitsData.metrics_history,
              shoppingLists: limitsData.shopping_lists
            };
          }
        } catch (error) {
          // Fallback to default limits if database query fails
          console.warn('Failed to fetch subscription limits from database, using defaults:', error);
          limits = DEFAULT_TIER_LIMITS[tier];
        }
        
        // Calculate trial info
        const isTrialActive = status === 'trial' && expiresAt && expiresAt > new Date();
        const daysRemaining = isTrialActive && expiresAt 
          ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        // Calculate grace period info
        const gracePeriodEnd = subData?.grace_period_end ? new Date(subData.grace_period_end) : undefined;
        const isInGracePeriod = gracePeriodEnd ? gracePeriodEnd > new Date() : false;
        const daysUntilDeletion = isInGracePeriod && gracePeriodEnd
          ? Math.ceil((gracePeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        // Fetch usage counts
        const [materialsRes, projectsRes, ordersRes, shoppingListsRes] = await Promise.all([
          supabase.from('materials').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('order_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          (supabase.from('shopping_lists' as any).select('id', { count: 'exact', head: true }).eq('user_id', user.id) as any)
        ]);

        const usage = {
          materials: materialsRes.count || 0,
          projects: projectsRes.count || 0,
          monthlyOrders: ordersRes.count || 0,
          shoppingLists: shoppingListsRes.count || 0
        };

        setSubscription({
          tier,
          status,
          limits,
          usage,
          canAdd: {
            materials: usage.materials < limits.materials && !subData?.is_read_only,
            projects: usage.projects < limits.projects && !subData?.is_read_only,
            orders: usage.monthlyOrders < limits.monthlyOrders && !subData?.is_read_only,
            shoppingLists: usage.shoppingLists < limits.shoppingLists && !subData?.is_read_only
          },
          trialEndsAt: expiresAt,
          daysRemaining,
          isTrialActive,
          gracePeriod: {
            isInGracePeriod,
            gracePeriodEnd,
            daysUntilDeletion,
            previousTier: subData?.previous_tier as SubscriptionTier | undefined,
            downgradeDate: subData?.downgrade_date ? new Date(subData.downgrade_date) : undefined,
            isReadOnly: subData?.is_read_only || false
          }
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  return { subscription, loading };
};
