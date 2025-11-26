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
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
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
  const { createCheckoutSession, loading: checkoutLoading } = useStripeCheckout();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{ status: string; tier: string; expires_at: string | null; grace_period_end: string | null } | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [limits, setLimits] = useState<{
    free: { materials: number; projects: number; monthlyOrders: number };
    tier_1: { materials: number; projects: number; monthlyOrders: number };
    tier_2: { materials: number; projects: number; monthlyOrders: number };
  } | null>(null);
  const [products, setProducts] = useState<Array<{
    id: string;
    tier: 'tier_1' | 'tier_2';
    billing_period: 'monthly' | 'annual';
    product_type: 'regular' | 'early_bird' | 'vip';
    price_amount_cents: number;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
  }>>([]);

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
          .select('status, tier, expires_at, grace_period_end')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setSubscriptionStatus(data?.status || null);
        setSubscriptionData(data || null);
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus(null);
        setSubscriptionData(null);
      }
    };

    fetchSubscriptionStatus();
  }, [user]);

  // Fetch subscription limits from database
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        // Fetch limits for all tiers from database
        const { data: limitsData, error: limitsError } = await (supabase
          .from('subscription_limits' as any)
          .select('tier, materials, projects, monthly_orders')
          .in('tier', ['free', 'tier_1', 'tier_2']) as any);

        if (limitsError || !limitsData || limitsData.length === 0) {
          // Fallback to default values if database query fails
          setLimits({
            free: { materials: 10, projects: 15, monthlyOrders: 15 },
            tier_1: { materials: 50, projects: 100, monthlyOrders: 50 },
            tier_2: { materials: 999999, projects: 999999, monthlyOrders: 999999 }
          });
          return;
        }

        // Transform data to match our structure
        const limitsMap = limitsData.reduce((acc: any, limit: any) => {
          acc[limit.tier] = {
            materials: limit.materials,
            projects: limit.projects,
            monthlyOrders: limit.monthly_orders
          };
          return acc;
        }, {});

        setLimits({
          free: limitsMap.free || { materials: 10, projects: 15, monthlyOrders: 15 },
          tier_1: limitsMap.tier_1 || { materials: 50, projects: 100, monthlyOrders: 50 },
          tier_2: limitsMap.tier_2 || { materials: 999999, projects: 999999, monthlyOrders: 999999 }
        });
      } catch (error) {
        console.warn('Failed to fetch subscription limits from database, using defaults:', error);
        // Fallback to default values
        setLimits({
          free: { materials: 10, projects: 15, monthlyOrders: 15 },
          tier_1: { materials: 50, projects: 100, monthlyOrders: 50 },
          tier_2: { materials: 999999, projects: 999999, monthlyOrders: 999999 }
        });
      }
    };

    fetchLimits();
  }, []);

  // Fetch active products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const now = new Date().toISOString();
        const { data: productsData, error: productsError } = await (supabase
          .from('products' as any)
          .select('*')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .in('product_type', ['regular', 'early_bird']) as any); // Don't show VIP products in pricing

        if (productsError) throw productsError;
        setProducts((productsData as any) || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to default products if database fails
        setProducts([]);
      }
    };

    fetchProducts();
  }, []);

  const convertPrice = (priceEUR: number): number => {
    return currency === 'USD' ? Math.round(priceEUR * exchangeRate) : priceEUR;
  };

  const getCurrencySymbol = (): string => {
    return currency === 'USD' ? '$' : '€';
  };

  // Get prices from products or fallback to defaults
  const getProductPrice = (tier: 'tier_1' | 'tier_2', billingPeriod: 'monthly' | 'annual', productType: 'regular' | 'early_bird' = 'early_bird') => {
    const product = products.find(
      p => p.tier === tier && 
      p.billing_period === billingPeriod && 
      p.product_type === productType
    );
    
    if (product) {
      return product.price_amount_cents / 100; // Convert cents to euros
    }
    
    // Fallback to default prices
    if (tier === 'tier_1') {
      return billingPeriod === 'monthly' ? 3.99 : 38.30;
    } else {
      return billingPeriod === 'monthly' ? 12.99 : 124.70;
    }
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
      monthlyPrice: getProductPrice('tier_1', 'monthly'),
      annualPrice: getProductPrice('tier_1', 'annual'),
      features: t('pricing.tier1.features', { returnObjects: true }) as string[],
      cta: t('pricing.tier1.cta'),
      tier: 'tier_1',
      popular: true,
      isEarlyBird: products.some(p => p.tier === 'tier_1' && p.product_type === 'early_bird' && p.is_active)
    },
    {
      name: t('pricing.tier2.name'),
      monthlyPrice: getProductPrice('tier_2', 'monthly'),
      annualPrice: getProductPrice('tier_2', 'annual'),
      features: t('pricing.tier2.features', { returnObjects: true }) as string[],
      cta: t('pricing.tier2.cta'),
      tier: 'tier_2',
      isEarlyBird: products.some(p => p.tier === 'tier_2' && p.product_type === 'early_bird' && p.is_active)
    }
  ];

  // Helper function to format limit value
  const formatLimit = (value: number): string => {
    if (value >= 999999) {
      return t('pricing.comparison.unlimited');
    }
    return value.toString();
  };

  // Tabla comparativa de features
  const comparisonFeatures: ComparisonFeature[] = [
    {
      category: t('pricing.comparison.categories.materials'),
      feature: t('pricing.comparison.features.materials'),
      free: limits ? formatLimit(limits.free.materials) : '10',
      tier1: limits ? formatLimit(limits.tier_1.materials) : '50',
      tier2: limits ? formatLimit(limits.tier_2.materials) : t('pricing.comparison.unlimited')
    },
    {
      category: t('pricing.comparison.categories.materials'),
      feature: t('pricing.comparison.features.projects'),
      free: limits ? formatLimit(limits.free.projects) : '15',
      tier1: limits ? formatLimit(limits.tier_1.projects) : '100',
      tier2: limits ? formatLimit(limits.tier_2.projects) : t('pricing.comparison.unlimited')
    },
    {
      category: t('pricing.comparison.categories.orders'),
      feature: t('pricing.comparison.features.ordersPerMonth'),
      free: limits ? formatLimit(limits.free.monthlyOrders) : '15',
      tier1: limits ? formatLimit(limits.tier_1.monthlyOrders) : '50',
      tier2: limits ? formatLimit(limits.tier_2.monthlyOrders) : t('pricing.comparison.unlimited')
    },
    {
      category: t('pricing.comparison.categories.orders'),
      feature: t('pricing.comparison.features.listView'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.orders'),
      feature: t('pricing.comparison.features.kanbanView'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.orders'),
      feature: t('pricing.comparison.features.calendarView'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.analysis'),
      feature: t('pricing.comparison.features.basicDashboard'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.analysis'),
      feature: t('pricing.comparison.features.advancedDashboard'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.analysis'),
      feature: t('pricing.comparison.features.metricsHistory'),
      free: t('pricing.comparison.no'),
      tier1: t('pricing.comparison.days60'),
      tier2: t('pricing.comparison.years2')
    },
    {
      category: t('pricing.comparison.categories.analysis'),
      feature: t('pricing.comparison.features.detailedFinancial'),
      free: false,
      tier1: false,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.tools'),
      feature: t('pricing.comparison.features.calculator'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.tools'),
      feature: t('pricing.comparison.features.advancedFilters'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.tools'),
      feature: t('pricing.comparison.features.exportData'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.catalogs'),
      feature: t('pricing.comparison.features.customCatalogs'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.catalogs'),
      feature: t('pricing.comparison.features.templates'),
      free: '2026?',
      tier1: '2026?',
      tier2: '2026?'
    },
    {
      category: t('pricing.comparison.categories.catalogs'),
      feature: t('pricing.comparison.features.premiumTemplates'),
      free: false,
      tier1: false,
      tier2: '2026?'
    },
    {
      category: t('pricing.comparison.categories.catalogs'),
      feature: t('pricing.comparison.features.sectionsOrganization'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.support'),
      feature: t('pricing.comparison.features.basicSupport'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.support'),
      feature: t('pricing.comparison.features.prioritySupport'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.support'),
      feature: t('pricing.comparison.features.dedicatedSupport'),
      free: false,
      tier1: false,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.enterprise'),
      feature: t('pricing.comparison.features.customBranding'),
      free: t('pricing.comparison.comingSoon'),
      tier1: t('pricing.comparison.comingSoon'),
      tier2: t('pricing.comparison.comingSoon')
    },
    {
      category: t('pricing.comparison.categories.enterprise'),
      feature: t('pricing.comparison.features.teamCollaboration'),
      free: '2026?',
      tier1: '2026?',
      tier2: '2026?'
    },
    {
      category: t('pricing.comparison.categories.enterprise'),
      feature: t('pricing.comparison.features.apiAccess'),
      free: false,
      tier1: false,
      tier2: '2026?'
    },
    {
      category: t('pricing.comparison.categories.inventory'),
      feature: t('pricing.comparison.features.inventoryHistory'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.inventory'),
      feature: t('pricing.comparison.features.autoStockCalculation'),
      free: false,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.inventory'),
      feature: t('pricing.comparison.features.machineStockMaintenance'),
      free: false,
      tier1: t('pricing.comparison.comingSoon'),
      tier2: t('pricing.comparison.comingSoon')
    },
    {
      category: t('pricing.comparison.categories.security'),
      feature: t('pricing.comparison.features.dataEncryption'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.security'),
      feature: t('pricing.comparison.features.gdprCompliance'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.security'),
      feature: t('pricing.comparison.features.autoBackup'),
      free: true,
      tier1: true,
      tier2: true
    },
    {
      category: t('pricing.comparison.categories.security'),
      feature: t('pricing.comparison.features.twoFactorAuth'),
      free: '2026?',
      tier1: '2026?',
      tier2: '2026?'
    }
  ];

  const handleSelectPlan = async (tier: string, billingPeriod: BillingPeriod) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (tier === 'free') {
      navigate('/dashboard');
      return;
    }

    // Validate tier
    if (tier !== 'tier_1' && tier !== 'tier_2') {
      console.error('Invalid tier:', tier);
      return;
    }

    // Find the product (prefer early_bird if available)
    const product = products.find(
      p => p.tier === tier && 
      p.billing_period === billingPeriod && 
      p.product_type === 'early_bird' &&
      p.is_active
    ) || products.find(
      p => p.tier === tier && 
      p.billing_period === billingPeriod && 
      p.product_type === 'regular' &&
      p.is_active
    );

    // Create Stripe Checkout Session
    await createCheckoutSession({
      tier: tier as 'tier_1' | 'tier_2',
      billingPeriod: billingPeriod,
      productId: product?.id,
    });
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
              {t('pricing.freeTrial')}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <Label>{t('pricing.currency')}:</Label>
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
                {t('pricing.monthly')}
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : ''}>
                {t('pricing.annual')}
              </Label>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                {t('pricing.save20')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {tiers.map((tier) => {
            const savings = getSavings(tier);
            // Check if this is the user's current tier
            const userTier = subscriptionData?.tier || subscription?.tier;
            const isUserTier = userTier === tier.tier;
            
            // Check if subscription is active (not cancelled and not expired)
            const isActive = subscriptionStatus === 'active' && 
              (!subscriptionData?.expires_at || new Date(subscriptionData.expires_at) > new Date()) &&
              (!subscriptionData?.grace_period_end || new Date(subscriptionData.grace_period_end) > new Date());
            
            // Check if subscription is cancelled (status is cancelled OR has grace_period_end)
            const isCancelled = (subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled') ||
              (subscriptionData?.grace_period_end && new Date(subscriptionData.grace_period_end) > new Date());
            
            // Check if subscription has expired
            const isExpired = subscriptionData?.expires_at && new Date(subscriptionData.expires_at) <= new Date();
            
            const isCurrentPlan = user && isUserTier && isActive && !isCancelled && !isExpired;
            const isCancelledPlan = user && isUserTier && (isCancelled || isExpired);
            const monthlyPrice = getMonthlyPrice(tier);
            return (
              <Card 
                key={tier.tier} 
                className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-primary/50 ring-2 ring-primary/20' : ''}`}
              >
                {tier.popular && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      {t('pricing.popular')}
                    </span>
                  </div>
                )}
                {(tier as any).isEarlyBird && !isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      🎯 Early Bird
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('pricing.currentPlan')}
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
                          {getAnnualPrice(tier)} {t('pricing.billedAnnually')}
                        </div>
                      )}
                      {isAnnual && savings && (
                        <div className="text-sm text-green-600 font-semibold">
                          {t('pricing.save')} {savings.toFixed(2)}{getCurrencySymbol()}/{t('pricing.perYear')}
                        </div>
                      )}
                      {!isAnnual && tier.tier !== 'free' && (
                        <div className="text-xs text-muted-foreground">
                          {t('pricing.or')} {getAnnualPrice(tier)}/{t('pricing.perYear')}
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
                      {t('pricing.alreadySubscribed')}
                    </Button>
                  ) : isCancelledPlan ? (
                    <Button 
                      className="w-full" 
                      variant="default"
                      onClick={() => handleSelectPlan(tier.tier, isAnnual ? 'annual' : 'monthly')}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Procesando...
                        </>
                      ) : (
                        t('pricing.renewNow')
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={tier.popular ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(tier.tier, isAnnual ? 'annual' : 'monthly')}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Procesando...
                        </>
                      ) : (
                        tier.cta
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Early Bird Notice */}
        <div className="max-w-6xl mx-auto mb-8">
          <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <CardContent className="py-6 px-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎯</div>
                <div className="flex-1">
                  <p className="text-sm text-orange-900 dark:text-orange-100 font-medium">
                    {t('pricing.earlyBirdNotice')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Comparativa */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">{t('pricing.comparison.title')}</h2>
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">{t('pricing.comparison.feature')}</TableHead>
                    <TableHead className="text-center">{t('pricing.comparison.free')}</TableHead>
                    <TableHead className="text-center">{t('pricing.comparison.pro')}</TableHead>
                    <TableHead className="text-center">{t('pricing.comparison.enterprise')}</TableHead>
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
              <h3 className="text-2xl font-bold">{t('pricing.roadmap.title')}</h3>
              <p className="text-muted-foreground text-lg">
                {t('pricing.roadmap.description')}
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
