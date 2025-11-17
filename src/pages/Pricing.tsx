import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CheckCircle2, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { TrialNotification } from '@/components/TrialNotification';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Currency = 'EUR' | 'USD';
type BillingPeriod = 'monthly' | 'annual';

interface ComparisonFeature {
  category: string;
  feature: string;
  free: boolean | string;
  tier1: boolean | string;
  tier2: boolean | string;
}

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currency, setCurrency] = useState<Currency>('EUR');

  // Tipo de cambio aproximado (puedes usar una API real)
  const exchangeRate = 1.1; // 1 EUR = 1.1 USD

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

  const convertPrice = (priceEUR: number): number => {
    return currency === 'USD' ? Math.round(priceEUR * exchangeRate) : priceEUR;
  };

  const getCurrencySymbol = (): string => {
    return currency === 'USD' ? '$' : '€';
  };

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

  // Tabla comparativa de features
  const comparisonFeatures: ComparisonFeature[] = [
    {
      category: 'Gestión de Materiales',
      feature: 'Materiales',
      free: '10',
      tier1: '50',
      tier2: 'Ilimitados'
    },
    {
      category: 'Gestión de Materiales',
      feature: 'Proyectos',
      free: '15',
      tier1: '100',
      tier2: 'Ilimitados'
    },
    {
      category: 'Pedidos',
      feature: 'Pedidos por mes',
      free: '15',
      tier1: '50',
      tier2: 'Ilimitados'
    },
    {
      category: 'Pedidos',
      feature: 'Vista de lista',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Pedidos',
      feature: 'Vista Kanban',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Pedidos',
      feature: 'Vista de calendario',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Análisis',
      feature: 'Dashboard básico',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Análisis',
      feature: 'Dashboard avanzado',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Análisis',
      feature: 'Historial de métricas',
      free: 'No',
      tier1: '60 días',
      tier2: '2 años'
    },
    {
      category: 'Análisis',
      feature: 'Análisis financiero detallado',
      free: false,
      tier1: false,
      tier2: true
    },
    {
      category: 'Herramientas',
      feature: 'Calculadora de costes',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Herramientas',
      feature: 'Calculadora avanzada',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Herramientas',
      feature: 'Filtros avanzados',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Herramientas',
      feature: 'Exportar datos',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Catálogos',
      feature: 'Catálogos personalizados',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Catálogos',
      feature: 'Secciones y organización',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Soporte',
      feature: 'Soporte básico',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Soporte',
      feature: 'Soporte prioritario',
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: 'Soporte',
      feature: 'Soporte dedicado 24/7',
      free: false,
      tier1: false,
      tier2: true
    },
    {
      category: 'Empresa',
      feature: 'Marca personalizada',
      free: false,
      tier1: false,
      tier2: true
    },
    {
      category: 'Empresa',
      feature: 'Colaboración en equipo',
      free: false,
      tier1: false,
      tier2: true
    },
    {
      category: 'Empresa',
      feature: 'Acceso API',
      free: false,
      tier1: false,
      tier2: '2026?'
    },
    {
      category: 'Seguridad',
      feature: 'Encriptación de datos',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Seguridad',
      feature: 'Cumplimiento GDPR',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Seguridad',
      feature: 'Backup automático',
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: 'Seguridad',
      feature: 'Autenticación de dos factores',
      free: true,
      tier1: true,
      tier2: true
    }
  ];

  const handleSelectPlan = (tier: string, billingPeriod: BillingPeriod) => {
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
    if (tier.tier === 'free') return `0${getCurrencySymbol()}`;
    
    const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
    const convertedPrice = convertPrice(price);
    
    if (isAnnual) {
      return `${(convertedPrice / 12).toFixed(2)}${getCurrencySymbol()}`;
    }
    return `${convertedPrice}${getCurrencySymbol()}`;
  };

  const getMonthlyPrice = (tier: typeof tiers[0]) => {
    if (tier.tier === 'free') return null;
    const convertedPrice = convertPrice(tier.monthlyPrice);
    return `${convertedPrice}${getCurrencySymbol()}`;
  };

  const getAnnualPrice = (tier: typeof tiers[0]) => {
    if (tier.tier === 'free') return null;
    const convertedPrice = convertPrice(tier.annualPrice);
    return `${convertedPrice}${getCurrencySymbol()}`;
  };

  const getSavings = (tier: typeof tiers[0]) => {
    if (tier.tier === 'free') return null;
    const monthlyCost = convertPrice(tier.monthlyPrice * 12);
    const annualCost = convertPrice(tier.annualPrice);
    const savings = monthlyCost - annualCost;
    return savings;
  };

  const renderFeatureValue = (value: boolean | string, tier: 'free' | 'tier1' | 'tier2') => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-primary mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground mx-auto" />
      );
    }
    const strValue = value.toLowerCase();
    // Si es futuro (coming soon, próximos años, etc.)
    if (
      strValue.includes('coming soon') ||
      strValue.includes('próximamente') ||
      strValue.includes('2026')
    ) {
      return (
        <Badge variant="outline" className="text-xs">
          {value}
        </Badge>
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
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
              Prueba gratis 15 días
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <Label>Moneda:</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center gap-4">
              <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : ''}>
                Mensual
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : ''}>
                Anual
              </Label>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                Ahorra 20%
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {tiers.map((tier) => {
            const savings = getSavings(tier);
            const isCurrentPlan = user && subscription && subscription.tier === tier.tier && subscriptionStatus === 'active';
            const monthlyPrice = getMonthlyPrice(tier);
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
                        {isAnnual && monthlyPrice && (
                          <div className="flex items-center gap-2 justify-center mb-1">
                            <span className="text-2xl font-bold text-muted-foreground line-through">
                              {monthlyPrice}
                            </span>
                            <span className="text-xs text-muted-foreground">/mes</span>
                          </div>
                        )}
                        <span className="text-4xl font-bold text-foreground">{getDisplayPrice(tier)}</span>
                        {tier.tier !== 'free' && (
                          <span className="text-muted-foreground">
                            {t('pricing.monthly')}
                          </span>
                        )}
                      </div>
                      {isAnnual && tier.tier !== 'free' && (
                        <div className="text-sm text-muted-foreground">
                          {getAnnualPrice(tier)} facturado anualmente
                        </div>
                      )}
                      {isAnnual && savings && (
                        <div className="text-sm text-green-600 font-semibold">
                          Ahorra {savings}{getCurrencySymbol()}/año
                        </div>
                      )}
                      {!isAnnual && tier.tier !== 'free' && (
                        <div className="text-xs text-muted-foreground">
                          o {getAnnualPrice(tier)}/año
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

        {/* Tabla Comparativa */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Comparación de Planes</h2>
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Característica</TableHead>
                    <TableHead className="text-center">Gratis</TableHead>
                    <TableHead className="text-center">Pro</TableHead>
                    <TableHead className="text-center">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    comparisonFeatures.reduce((acc, feature) => {
                      if (!acc[feature.category]) {
                        acc[feature.category] = [];
                      }
                      acc[feature.category].push(feature);
                      return acc;
                    }, {} as Record<string, ComparisonFeature[]>)
                  ).map(([category, features]) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="font-semibold text-lg">
                          {category}
                        </TableCell>
                      </TableRow>
                      {features.map((feature, idx) => (
                        <TableRow key={`${category}-${idx}`}>
                          <TableCell className="font-medium">{feature.feature}</TableCell>
                          <TableCell className="text-center">
                            {renderFeatureValue(feature.free, 'free')}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderFeatureValue(feature.tier1, 'tier1')}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderFeatureValue(feature.tier2, 'tier2')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="bg-primary/5">
            <CardContent className="py-8 px-6 text-center space-y-4">
              <h3 className="text-2xl font-bold">Roadmap vivo para todos los planes</h3>
              <p className="text-muted-foreground text-lg">
                Seguiremos construyendo nuevas funcionalidades (como el acceso API previsto para 2026)
                en función del éxito de Layer Suite y el feedback de la comunidad. Todas las mejoras
                clave se desplegarán de forma progresiva en cada plan para que crezcas con nosotros.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer variant="landing" />
    </div>
  );
};

export default Pricing;
