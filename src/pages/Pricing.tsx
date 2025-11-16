import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { TrialNotification } from '@/components/TrialNotification';

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user) {
        setSubscriptionStatus(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('status, tier')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setSubscriptionStatus(data?.status || null);
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus(null);
      }
    };

    fetchSubscriptionStatus();
  }, [user]);

  const tiers = [
    {
      name: t('pricing.free.name'),
      monthlyPrice: 0,
      annualPrice: 0,
      features: t('pricing.free.features', { returnObjects: true }) as string[],
      cta: t('pricing.free.cta'),
      tier: 'free'
    },
    {
      name: t('pricing.tier1.name'),
      monthlyPrice: 10,
      annualPrice: 96, // 10 * 12 * 0.8 = 96€ (20% discount)
      features: t('pricing.tier1.features', { returnObjects: true }) as string[],
      cta: t('pricing.tier1.cta'),
      tier: 'tier_1',
      popular: true
    },
    {
      name: t('pricing.tier2.name'),
      monthlyPrice: 45,
      annualPrice: 432, // 45 * 12 * 0.8 = 432€ (20% discount)
      features: t('pricing.tier2.features', { returnObjects: true }) as string[],
      cta: t('pricing.tier2.cta'),
      tier: 'tier_2'
    }
  ];

  const handleSelectPlan = (tier: string, billingPeriod: 'monthly' | 'annual') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (tier === 'free') {
      navigate('/dashboard');
    } else {
      // For now, just redirect to dashboard
      // In a real app, this would open a payment flow with Stripe
      navigate('/dashboard');
    }
  };

  const getDisplayPrice = (tier: typeof tiers[0]) => {
    if (tier.tier === 'free') return '0€';
    
    if (isAnnual) {
      return `${(tier.annualPrice / 12).toFixed(2)}€`;
    }
    return `${tier.monthlyPrice}€`;
  };

  const getSavings = (tier: typeof tiers[0]) => {
    if (tier.tier === 'free') return null;
    const monthlyCost = tier.monthlyPrice * 12;
    const savings = monthlyCost - tier.annualPrice;
    return savings;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      <Header variant="landing" />
      <TrialNotification />

      <div className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('pricing.title')}</h1>
          <p className="text-xl text-muted-foreground mb-6">{t('pricing.subtitle')}</p>
          
          {/* Trial Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full mb-8">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">
              Prueba gratis 15 días sin tarjeta de crédito
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : ''}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : ''}>
              Annual
            </Label>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
              Save 20%
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const savings = getSavings(tier);
            const isCurrentPlan = user && subscription && subscription.tier === tier.tier && subscriptionStatus === 'active';
            return (
              <Card 
                key={tier.tier} 
                className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-primary/50 ring-2 ring-primary/20' : ''}`}
              >
                {tier.popular && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      Popular
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tu plan actual
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>
                    <div className="space-y-1">
                      <div>
                        <span className="text-4xl font-bold text-foreground">{getDisplayPrice(tier)}</span>
                        {tier.tier !== 'free' && (
                          <span className="text-muted-foreground">
                            {t('pricing.monthly')}
                          </span>
                        )}
                      </div>
                      {isAnnual && tier.tier !== 'free' && (
                        <div className="text-sm text-muted-foreground">
                          {tier.annualPrice}€ billed annually
                        </div>
                      )}
                      {isAnnual && savings && (
                        <div className="text-sm text-green-600 font-semibold">
                          Save {savings}€/year
                        </div>
                      )}
                      {!isAnnual && tier.tier !== 'free' && (
                        <div className="text-xs text-muted-foreground">
                          or {tier.annualPrice}€/year
                        </div>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Ya estás suscrito a este plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={tier.popular ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(tier.tier, isAnnual ? 'annual' : 'monthly')}
                    >
                      {tier.cta}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
      <Footer variant="landing" />
    </div>
  );
};

export default Pricing;
