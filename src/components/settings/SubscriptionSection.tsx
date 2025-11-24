import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertCircle, Calendar, BarChart3, Clock } from "lucide-react";

interface SubscriptionInfo {
  tier: string;
  billing_period: string;
  status: string;
  next_billing_date: string;
  price_paid: number;
  expires_at: string | null;
  is_paid_subscription?: boolean;
}

interface SubscriptionSectionProps {
  subscriptionInfo: SubscriptionInfo | null;
  onCancelSubscription: () => void;
}

export function SubscriptionSection({ subscriptionInfo, onCancelSubscription }: SubscriptionSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const getTierName = (tier: string) => {
    return t(`settings.tierNames.${tier}` as any) || 'Free';
  };

  const getTierBadgeColor = (tier: string) => {
    switch(tier) {
      case 'tier_2': return 'bg-purple-500';
      case 'tier_1': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return limit === 0 ? 0 : (current / limit) * 100;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-primary';
  };

  // Check if subscription is cancelled but still has active access
  const isCancelledButActive = subscriptionInfo.status === 'cancelled' && 
    subscriptionInfo.expires_at && 
    new Date(subscriptionInfo.expires_at) > new Date();

  if (!subscriptionInfo || !subscription) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t('settings.subscription.title')}</CardTitle>
        <CardDescription className="text-sm">{t('settings.subscription.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Plan Information */}
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <Label className="text-sm text-muted-foreground">{t('settings.subscription.currentPlan')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold">{getTierName(subscriptionInfo.tier)}</p>
              <Badge className={getTierBadgeColor(subscriptionInfo.tier)}>
                {subscriptionInfo.tier === 'free' ? 'FREE' : subscriptionInfo.tier === 'tier_1' ? 'PRO' : 'BUSINESS'}
              </Badge>
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">{t('settings.subscription.status')}</Label>
            <div className="mt-1">
              <p className={`text-lg font-semibold ${
                isCancelledButActive 
                  ? 'text-orange-600' 
                  : (subscriptionInfo.status === 'active' || subscriptionInfo.is_paid_subscription) 
                    ? 'text-primary' 
                    : 'text-destructive'
              }`}>
                {isCancelledButActive 
                  ? 'CANCELADO - ACTIVO'
                  : (subscriptionInfo.is_paid_subscription && subscriptionInfo.status === 'trial') 
                    ? 'ACTIVE' 
                    : subscriptionInfo.status.toUpperCase()}
              </p>
              {isCancelledButActive && subscriptionInfo.expires_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Acceso hasta {new Date(subscriptionInfo.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trial Days Alert */}
        {subscription.isTrialActive && subscription.daysRemaining !== undefined && subscription.daysRemaining <= 7 && (
          <Card className={`${
            subscription.daysRemaining <= 1 
              ? 'border-destructive/50 bg-destructive/5' 
              : subscription.daysRemaining <= 3
              ? 'border-orange-500/50 bg-orange-500/5'
              : 'border-primary/50 bg-primary/5'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  subscription.daysRemaining <= 1 
                    ? 'text-destructive' 
                    : subscription.daysRemaining <= 3
                    ? 'text-orange-500'
                    : 'text-primary'
                }`} />
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${
                    subscription.daysRemaining <= 1 
                      ? 'text-destructive' 
                      : subscription.daysRemaining <= 3
                      ? 'text-orange-500'
                      : 'text-primary'
                  }`}>
                    {subscription.daysRemaining === 0 
                      ? 'Tu prueba gratuita termina hoy'
                      : subscription.daysRemaining === 1
                      ? 'Te queda 1 día de prueba gratuita'
                      : `Te quedan ${subscription.daysRemaining} días de prueba gratuita`}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Tu suscripción de prueba expira el {subscriptionInfo.expires_at ? new Date(subscriptionInfo.expires_at).toLocaleDateString() : 'pronto'}. 
                    Actualiza ahora para seguir disfrutando de todas las funcionalidades premium.
                  </p>
                  <Button size="sm" onClick={() => navigate('/pricing')} variant="default">
                    Ver Planes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled but Active Alert */}
        {isCancelledButActive && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-600 mb-1">
                    Suscripción Cancelada
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Tu suscripción ha sido cancelada, pero aún tienes acceso completo hasta el{' '}
                    <strong>{subscriptionInfo.expires_at ? new Date(subscriptionInfo.expires_at).toLocaleDateString() : 'final del período'}</strong>.
                    Después de esa fecha, tu cuenta se degradará al plan gratuito.
                  </p>
                  <Button size="sm" onClick={() => navigate('/pricing')} variant="outline">
                    Reactivar Suscripción
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grace Period Alert */}
        {subscription.gracePeriod.isInGracePeriod && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-1">
                    {subscription.gracePeriod.daysUntilDeletion! <= 7 
                      ? t('gracePeriod.finalWeek', { days: subscription.gracePeriod.daysUntilDeletion })
                      : t('gracePeriod.warning', { days: subscription.gracePeriod.daysUntilDeletion })}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your account is in read-only mode. Images will be deleted on {new Date(subscription.gracePeriod.gracePeriodEnd!).toLocaleDateString()}.
                  </p>
                  <Button size="sm" onClick={() => navigate('/grace-period-settings')} variant="outline">
                    Manage Grace Period
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Free User CTA */}
        {subscriptionInfo.tier === 'free' && (
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className="text-center pb-3">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 text-primary" />
              <CardTitle className="text-xl">{t('settings.subscription.unlockStats')}</CardTitle>
              <CardDescription className="text-sm">
                {t('settings.subscription.unlockDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-card">
                  <Calendar className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{t('settings.subscription.fullHistory')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.subscription.fullHistoryDesc')}
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-card">
                  <BarChart3 className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{t('settings.subscription.detailedAnalysis')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.subscription.detailedAnalysisDesc')}
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-card">
                  <TrendingUp className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{t('settings.subscription.projections')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.subscription.projectionsDesc')}
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <Button size="sm" onClick={() => navigate("/pricing")} className="w-full md:w-auto">
                  {t('settings.subscription.viewPlans')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Statistics */}
        <div className="border-t pt-4 max-w-2xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('settings.subscription.currentUsage')}
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-sm">{t('settings.subscription.materials')}</Label>
                <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.materials, subscription.limits.materials))}`}>
                  {subscription.usage.materials} / {subscription.limits.materials}
                </span>
              </div>
              <Progress value={getUsagePercentage(subscription.usage.materials, subscription.limits.materials)} className="h-1.5" />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-sm">{t('settings.subscription.projects')}</Label>
                <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.projects, subscription.limits.projects))}`}>
                  {subscription.usage.projects} / {subscription.limits.projects}
                </span>
              </div>
              <Progress value={getUsagePercentage(subscription.usage.projects, subscription.limits.projects)} className="h-1.5" />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-sm">{t('settings.subscription.monthlyOrders')}</Label>
                <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.monthlyOrders, subscription.limits.monthlyOrders))}`}>
                  {subscription.usage.monthlyOrders} / {subscription.limits.monthlyOrders}
                </span>
              </div>
              <Progress value={getUsagePercentage(subscription.usage.monthlyOrders, subscription.limits.monthlyOrders)} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.subscription.resetsFirstDay')}
              </p>
            </div>
          </div>
        </div>

        {/* Billing Info */}
        {subscriptionInfo.tier !== 'free' && (
          <div className="border-t pt-4 max-w-2xl">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">{t('settings.subscription.billingPeriod')}</Label>
                <p className="text-base font-medium capitalize mt-1">{subscriptionInfo.billing_period}</p>
              </div>
              {subscriptionInfo.next_billing_date && (
                <div>
                  <Label className="text-sm text-muted-foreground">{t('settings.subscription.nextBillingDate')}</Label>
                  <p className="text-base font-medium mt-1">
                    {new Date(subscriptionInfo.next_billing_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-4 max-w-2xl flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/pricing")}>
            {t('settings.subscription.changePlan')}
          </Button>
          {subscriptionInfo.tier !== 'free' && (
            <Button size="sm" variant="destructive" onClick={onCancelSubscription}>
              {t('settings.subscription.cancelSubscription')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
