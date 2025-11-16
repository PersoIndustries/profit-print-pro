import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Crown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TrialNotification = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when days remaining changes
  useEffect(() => {
    if (subscription?.daysRemaining) {
      setIsDismissed(false);
    }
  }, [subscription?.daysRemaining]);

  if (!subscription?.isTrialActive || isDismissed) {
    return null;
  }

  const daysRemaining = subscription.daysRemaining || 0;
  
  // Show notification at 7, 3, and 1 day marks
  const shouldShow = daysRemaining <= 7;
  
  if (!shouldShow) {
    return null;
  }

  const getAlertVariant = () => {
    if (daysRemaining <= 1) return 'destructive';
    if (daysRemaining <= 3) return 'default';
    return 'default';
  };

  const getMessage = () => {
    if (daysRemaining === 0) {
      return t('trial.expiringToday', 'Tu prueba gratuita termina hoy');
    }
    if (daysRemaining === 1) {
      return t('trial.oneDayLeft', 'Te queda 1 día de prueba gratuita');
    }
    return t('trial.daysLeft', `Te quedan ${daysRemaining} días de prueba gratuita`);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2">
      <Alert variant={getAlertVariant()} className="shadow-lg border-2">
        <Clock className="h-4 w-4" />
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
        <AlertDescription className="mt-2">
          <p className="text-sm mb-3">
            {t('trial.upgradeMessage', 'Actualiza ahora para seguir disfrutando de todas las funcionalidades premium')}
          </p>
          <Button 
            onClick={() => navigate('/pricing')}
            className="w-full"
            size="sm"
          >
            <Crown className="h-4 w-4 mr-2" />
            {t('trial.upgradeNow', 'Ver Planes')}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
