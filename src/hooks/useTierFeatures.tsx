import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

interface TierFeature {
  feature_key: string;
  feature_name: string;
  description: string | null;
  free_tier: boolean;
  tier_1: boolean;
  tier_2: boolean;
}

export const useTierFeatures = () => {
  const { subscription, loading: subLoading } = useSubscription();
  const [features, setFeatures] = useState<TierFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("tier_features")
        .select("*")
        .order("feature_name");

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error("Error fetching tier features:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (featureKey: string): boolean => {
    if (!subscription) return false;

    const feature = features.find((f) => f.feature_key === featureKey);
    if (!feature) return false;

    switch (subscription.tier) {
      case "free":
        return feature.free_tier;
      case "tier_1":
        return feature.tier_1;
      case "tier_2":
        return feature.tier_2;
      default:
        return false;
    }
  };

  const getFeaturesByTier = (tier: "free" | "tier_1" | "tier_2") => {
    return features.filter((feature) => {
      switch (tier) {
        case "free":
          return feature.free_tier;
        case "tier_1":
          return feature.tier_1;
        case "tier_2":
          return feature.tier_2;
        default:
          return false;
      }
    });
  };

  const isEnterprise = subscription?.tier === "tier_2";
  const isPro = subscription?.tier === "tier_1";
  const isFree = subscription?.tier === "free";

  return {
    features,
    loading: loading || subLoading,
    hasFeature,
    getFeaturesByTier,
    isEnterprise,
    isPro,
    isFree,
    currentTier: subscription?.tier,
  };
};
