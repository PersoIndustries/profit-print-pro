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
}

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  limits: SubscriptionLimits;
  usage: {
    materials: number;
    projects: number;
    monthlyOrders: number;
  };
  canAdd: {
    materials: boolean;
    projects: boolean;
    orders: boolean;
  };
  trialEndsAt?: Date;
  daysRemaining?: number;
  isTrialActive: boolean;
}

const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    materials: 10,
    projects: 15,
    monthlyOrders: 15,
    metricsHistory: 0
  },
  tier_1: {
    materials: 50,
    projects: 100,
    monthlyOrders: 50,
    metricsHistory: 60
  },
  tier_2: {
    materials: 999999,
    projects: 999999,
    monthlyOrders: 999999,
    metricsHistory: 730
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
          .select('tier, status, expires_at')
          .eq('user_id', user.id)
          .single();

        if (subError) throw subError;

        const tier = (subData?.tier || 'free') as SubscriptionTier;
        const status = (subData?.status || 'active') as SubscriptionStatus;
        const expiresAt = subData?.expires_at ? new Date(subData.expires_at) : undefined;
        const limits = TIER_LIMITS[tier];
        
        // Calculate trial info
        const isTrialActive = status === 'trial' && expiresAt && expiresAt > new Date();
        const daysRemaining = isTrialActive && expiresAt 
          ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        // Fetch usage counts
        const [materialsRes, projectsRes, ordersRes] = await Promise.all([
          supabase.from('materials').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('order_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        ]);

        const usage = {
          materials: materialsRes.count || 0,
          projects: projectsRes.count || 0,
          monthlyOrders: ordersRes.count || 0
        };

        setSubscription({
          tier,
          status,
          limits,
          usage,
          canAdd: {
            materials: usage.materials < limits.materials,
            projects: usage.projects < limits.projects,
            orders: usage.monthlyOrders < limits.monthlyOrders
          },
          trialEndsAt: expiresAt,
          daysRemaining,
          isTrialActive
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
