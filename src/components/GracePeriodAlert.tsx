import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, X, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const GracePeriodAlert = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when days until deletion changes
  useEffect(() => {
    if (subscription?.gracePeriod.daysUntilDeletion) {
      setIsDismissed(false);
    }
  }, [subscription?.gracePeriod.daysUntilDeletion]);

  if (!subscription?.gracePeriod.isInGracePeriod || isDismissed) {
    return null;
  }

  const daysUntilDeletion = subscription.gracePeriod.daysUntilDeletion || 0;
  const previousTier = subscription.gracePeriod.previousTier;
  
  const getAlertVariant = () => {
    if (daysUntilDeletion <= 7) return 'destructive';
    if (daysUntilDeletion <= 30) return 'default';
    return 'default';
  };

  const getMessage = () => {
    if (daysUntilDeletion <= 1) {
      return t('gracePeriod.lastDay');
    }
    if (daysUntilDeletion <= 7) {
      return t('gracePeriod.finalWeek', { days: daysUntilDeletion });
    }
    return t('gracePeriod.warning', { days: daysUntilDeletion });
  };

  const getTierName = (tier?: string) => {
    if (tier === 'tier_2') return 'Enterprise';
    if (tier === 'tier_1') return 'Pro';
    return 'Free';
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2">
      <Alert variant={getAlertVariant()} className="shadow-lg border-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span className="font-semibold">{getMessage()}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <ImageOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              {t('gracePeriod.readOnlyMode')}
            </p>
          </div>
          
          <p className="text-sm">
            {t('gracePeriod.preventDeletion', { tier: getTierName(previousTier) })}
          </p>
          
          <Button 
            onClick={() => navigate('/pricing')}
            className="w-full"
            size="sm"
          >
            <Crown className="h-4 w-4 mr-2" />
            {t('gracePeriod.reactivate')}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
