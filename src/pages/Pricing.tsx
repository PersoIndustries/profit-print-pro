import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tiers = [
    {
      name: t('pricing.free.name'),
      price: t('pricing.free.price'),
      features: t('pricing.free.features', { returnObjects: true }) as string[],
      cta: t('pricing.free.cta'),
      tier: 'free'
    },
    {
      name: t('pricing.tier1.name'),
      price: t('pricing.tier1.price'),
      features: t('pricing.tier1.features', { returnObjects: true }) as string[],
      cta: t('pricing.tier1.cta'),
      tier: 'tier_1',
      popular: true
    },
    {
      name: t('pricing.tier2.name'),
      price: t('pricing.tier2.price'),
      features: t('pricing.tier2.features', { returnObjects: true }) as string[],
      cta: t('pricing.tier2.cta'),
      tier: 'tier_2'
    }
  ];

  const handleSelectPlan = (tier: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (tier === 'free') {
      navigate('/dashboard');
    } else {
      // For now, just redirect to dashboard
      // In a real app, this would open a payment flow
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Print3D Manager</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('nav.dashboard')}
            </Button>
            {!user && (
              <Button onClick={() => navigate('/auth')}>
                {t('nav.login')}
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('pricing.title')}</h1>
          <p className="text-xl text-muted-foreground">{t('pricing.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card 
              key={tier.tier} 
              className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                  {tier.tier !== 'free' && (
                    <span className="text-muted-foreground">{t('pricing.monthly')}</span>
                  )}
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
                <Button 
                  className="w-full" 
                  variant={tier.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(tier.tier)}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
