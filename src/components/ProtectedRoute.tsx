import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { hasPermission } from '@/utils/permissionValidator';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredFeature?: string;
  requiredTier?: 'tier_1' | 'tier_2';
  fallbackPath?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredFeature,
  requiredTier,
  fallbackPath = '/pricing'
}: ProtectedRouteProps) => {
  const { subscription, loading } = useSubscription();
  const { hasFeature } = useTierFeatures();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Check tier requirement
  if (requiredTier) {
    const tierOrder = { free: 0, tier_1: 1, tier_2: 2 };
    const userTierOrder = tierOrder[subscription?.tier || 'free'];
    const requiredTierOrder = tierOrder[requiredTier];
    
    if (userTierOrder < requiredTierOrder) {
      return <Navigate to={fallbackPath} state={{ from: location }} replace />;
    }
  }

  // Check feature requirement
  if (requiredFeature) {
    // If subscription is not loaded yet, wait
    if (!subscription) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }
    
    const hasAccess = requiredFeature.startsWith('feature_') 
      ? hasFeature(requiredFeature.replace('feature_', ''))
      : hasPermission(subscription.tier, requiredFeature);
    
    if (!hasAccess) {
      return <Navigate to={fallbackPath} state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

