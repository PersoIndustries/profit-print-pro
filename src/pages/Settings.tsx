import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings as SettingsIcon, CreditCard, Receipt, User, TrendingUp, AlertCircle, Calendar, BarChart3, Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface Profile {
  full_name: string;
  email: string;
  billing_address: string;
  billing_city: string;
  billing_postal_code: string;
  billing_country: string;
  brand_logo_url: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string;
  tier: string;
  billing_period: string;
}

interface SubscriptionInfo {
  tier: string;
  billing_period: string;
  status: string;
  next_billing_date: string;
  price_paid: number;
  expires_at: string | null;
}

interface AppliedPromoCode {
  code: string;
  applied_at: string;
  tier_granted: string;
  description: string | null;
  is_permanent: boolean;
}

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    billing_address: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: '',
    brand_logo_url: null
  });
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<AppliedPromoCode | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      if (!user) return;
      
      const [profileRes, subRes, invoicesRes, promoCodeRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("invoices").select("*").eq("user_id", user.id).order("issued_date", { ascending: false }),
        supabase
          .from("user_promo_codes")
          .select(`
            promo_code_id,
            applied_at,
            tier_granted,
            promo_codes!inner(code, description)
          `)
          .eq("user_id", user.id)
          .order("applied_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name || '',
          email: profileRes.data.email || '',
          billing_address: profileRes.data.billing_address || '',
          billing_city: profileRes.data.billing_city || '',
          billing_postal_code: profileRes.data.billing_postal_code || '',
          billing_country: profileRes.data.billing_country || '',
          brand_logo_url: profileRes.data.brand_logo_url || null
        });
      }

      if (subRes.data) {
        setSubscriptionInfo({
          ...subRes.data,
          expires_at: subRes.data.expires_at
        });
        
        // Check if subscription is permanent (expires_at is NULL)
        const isPermanent = subRes.data.expires_at === null;
        
        // If we have a promo code, set it
        if (promoCodeRes.data && promoCodeRes.data.promo_codes) {
          const promoCodeData = promoCodeRes.data.promo_codes as any;
          setAppliedPromoCode({
            code: promoCodeData.code,
            applied_at: promoCodeRes.data.applied_at,
            tier_granted: promoCodeRes.data.tier_granted,
            description: promoCodeData.description,
            is_permanent: isPermanent
          });
        } else {
          setAppliedPromoCode(null);
        }
      }

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(t('settings.messages.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          billing_address: profile.billing_address,
          billing_city: profile.billing_city,
          billing_postal_code: profile.billing_postal_code,
          billing_country: profile.billing_country
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success(t('settings.messages.profileUpdated'));
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || t('settings.messages.errorUpdatingProfile'));
    }
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error(t('settings.messages.mustBeAuthenticated'));
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = validTypes.includes(file.type) || 
      ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(fileExtension || '');
    
    if (!isValidType) {
      toast.error(t('settings.messages.onlyImages'));
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2097152) {
      toast.error(t('settings.messages.maxSize'));
      return;
    }

    try {
      setBrandLogoUploading(true);
      
      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'png';
      const fileName = `brand-logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Delete old logo if exists
      if (profile.brand_logo_url) {
        const oldPath = profile.brand_logo_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from("brand-logos")
          .remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        toast.error(`${t('settings.messages.errorUploading')} ${uploadError.message || 'Error desconocido'}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(filePath);

      // Update profile with new logo URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ brand_logo_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, brand_logo_url: publicUrl });
      toast.success(t('settings.messages.logoUpdated'));
    } catch (error: any) {
      console.error("Error uploading brand logo:", error);
      toast.error(error.message || t('settings.messages.errorUploadingLogo'));
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const handleRemoveBrandLogo = async () => {
    if (!user || !profile.brand_logo_url) return;

    try {
      const oldPath = profile.brand_logo_url.split('/').slice(-2).join('/');
      await supabase.storage
        .from("brand-logos")
        .remove([oldPath]);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ brand_logo_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, brand_logo_url: null });
      toast.success(t('settings.messages.logoRemoved'));
    } catch (error: any) {
      console.error("Error removing brand logo:", error);
      toast.error(error.message || t('settings.messages.errorRemovingLogo'));
    }
  };

  const handleCancelSubscription = async () => {
    // Si tiene un código promocional aplicado con suscripción permanente, prevenir cancelación
    if (appliedPromoCode && appliedPromoCode.is_permanent) {
      toast.error(t('settings.messages.cannotCancelPermanent'));
      return;
    }

    // Si tiene código promocional pero no es permanente, advertir
    if (appliedPromoCode && !appliedPromoCode.is_permanent) {
      const confirmMessage = t('settings.messages.promoCodeWarning', { code: appliedPromoCode.code });
      if (!confirm(confirmMessage)) {
        return;
      }
    } else {
      if (!confirm(t('settings.messages.cancelSubscriptionConfirm'))) {
        return;
      }
    }

    try {
      // Si tiene código promocional, cambiar a free tier
      // Si no tiene código promocional, solo cambiar status
      const updateData: any = appliedPromoCode 
        ? { status: 'cancelled', tier: 'free' as const }
        : { status: 'cancelled' };

      const { error } = await supabase
        .from("user_subscriptions")
        .update(updateData)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Log the change
      if (subscriptionInfo) {
        const changeData: any = {
          user_id: user?.id,
          previous_tier: subscriptionInfo.tier,
          new_tier: appliedPromoCode ? ('free' as const) : subscriptionInfo.tier,
          change_type: 'cancel',
          reason: appliedPromoCode 
            ? `Suscripción cancelada. Código promocional ${appliedPromoCode.code} revocado.`
            : 'Suscripción cancelada por el usuario'
        };
        
        await supabase
          .from("subscription_changes")
          .insert(changeData);
      }

      toast.success(t('settings.messages.subscriptionCancelled'));
      await fetchData();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message || t('settings.messages.errorCancelling'));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.messages.passwordsDontMatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('settings.messages.passwordMinLength'));
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success(t('settings.messages.passwordUpdated'));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || t('settings.messages.errorChangingPassword'));
    }
  };

  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promoCode.trim()) {
      toast.error(t('settings.promoCode.emptyCode'));
      return;
    }

    setApplyingCode(true);
    try {
      const { data, error } = await supabase.rpc('apply_promo_code', {
        _code: promoCode.trim().toUpperCase(),
        _user_id: user?.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; tier?: string };
      
      if (result.success) {
        toast.success(result.message);
        setPromoCode("");
        // Refresh subscription data
        await fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error("Error applying promo code:", error);
      toast.error(error.message || t('settings.promoCode.error'));
    } finally {
      setApplyingCode(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  }

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

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">{t('settings.title')}</h2>
      </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              {t('settings.tabs.profile')}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              {t('settings.tabs.security')}
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              {t('settings.tabs.subscription')}
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 mr-2" />
              {t('settings.tabs.invoices')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t('settings.profile.title')}</CardTitle>
                <CardDescription className="text-sm">{t('settings.profile.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-2xl">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="full_name" className="text-sm">{t('settings.profile.fullName')}</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm">{t('settings.profile.email')}</Label>
                      <Input id="email" value={profile.email} disabled className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-base font-semibold mb-3">{t('settings.profile.billingAddress')}</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_address" className="text-sm">{t('settings.profile.address')}</Label>
                        <Input
                          id="billing_address"
                          value={profile.billing_address}
                          onChange={(e) => setProfile({ ...profile, billing_address: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_city" className="text-sm">{t('settings.profile.city')}</Label>
                        <Input
                          id="billing_city"
                          value={profile.billing_city}
                          onChange={(e) => setProfile({ ...profile, billing_city: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_postal_code" className="text-sm">{t('settings.profile.postalCode')}</Label>
                        <Input
                          id="billing_postal_code"
                          value={profile.billing_postal_code}
                          onChange={(e) => setProfile({ ...profile, billing_postal_code: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_country" className="text-sm">{t('settings.profile.country')}</Label>
                        <Input
                          id="billing_country"
                          value={profile.billing_country}
                          onChange={(e) => setProfile({ ...profile, billing_country: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-base font-semibold mb-3">{t('settings.profile.brandLogo')}</h3>
                    <div className="space-y-3">
                      {profile.brand_logo_url && (
                        <div className="flex items-center gap-4">
                          <img 
                            src={profile.brand_logo_url} 
                            alt={t('settings.profile.altLogo')} 
                            className="w-24 h-24 object-contain border rounded p-2 bg-background"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveBrandLogo}
                            disabled={brandLogoUploading}
                          >
                            {t('settings.profile.removeLogo')}
                          </Button>
                        </div>
                      )}
                      <div>
                        <Label htmlFor="brand_logo" className="text-sm">{t('settings.profile.uploadBrandLogo')}</Label>
                        <Input
                          id="brand_logo"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                          onChange={handleBrandLogoUpload}
                          disabled={brandLogoUploading}
                          className="h-9 text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.profile.formats')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" size="sm" className="mt-4">{t('common.save')}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t('settings.security.title')}</CardTitle>
                <CardDescription className="text-sm">{t('settings.security.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="new_password" className="text-sm">{t('settings.security.newPassword')}</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('settings.security.newPasswordPlaceholder')}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm_password" className="text-sm">{t('settings.security.confirmPassword')}</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.security.confirmPasswordPlaceholder')}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" size="sm" className="mt-2">{t('settings.security.changePassword')}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t('settings.subscription.title')}</CardTitle>
                <CardDescription className="text-sm">{t('settings.subscription.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {subscriptionInfo && subscription && (
                  <div className="space-y-6">
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
                        <p className={`text-lg font-semibold mt-1 ${
                          subscriptionInfo.status === 'active' ? 'text-primary' : 'text-destructive'
                        }`}>
                          {subscriptionInfo.status.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Grace Period Alert */}
                    {subscription?.gracePeriod.isInGracePeriod && (
                      <Card className="border-destructive/50 bg-destructive/5 mt-4">
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
                              <Button 
                                size="sm" 
                                onClick={() => navigate('/grace-period-settings')}
                                variant="outline"
                              >
                                Manage Grace Period
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Free User CTA */}
                    {subscriptionInfo.tier === 'free' && (
                      <>
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
                              <Button 
                                size="sm" 
                                onClick={() => navigate("/pricing")}
                                className="w-full md:w-auto"
                              >
                                {t('settings.subscription.viewPlans')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{t('settings.subscription.currentPlanTitle')}</CardTitle>
                            <CardDescription className="text-sm">
                              {t('settings.subscription.currentPlanDesc')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('settings.subscription.materials')}</span>
                              <span className="font-medium">{t('settings.subscription.upTo')} 10</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('settings.subscription.projects')}</span>
                              <span className="font-medium">{t('settings.subscription.upTo')} 15</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('settings.subscription.monthlyOrders')}</span>
                              <span className="font-medium">{t('settings.subscription.upTo')} 15</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('settings.subscription.metricsHistory')}</span>
                              <span className="font-medium text-muted-foreground">{t('settings.subscription.notAvailable')}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Usage Statistics */}
                    <div className="border-t pt-4 max-w-2xl">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {t('settings.subscription.currentUsage')}
                      </h3>
                      <div className="space-y-3">
                        {/* Materials Usage */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <Label className="text-sm">{t('settings.subscription.materials')}</Label>
                            <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.materials, subscription.limits.materials))}`}>
                              {subscription.usage.materials} / {subscription.limits.materials}
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(subscription.usage.materials, subscription.limits.materials)} 
                            className="h-1.5"
                          />
                        </div>

                        {/* Projects Usage */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <Label className="text-sm">{t('settings.subscription.projects')}</Label>
                            <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.projects, subscription.limits.projects))}`}>
                              {subscription.usage.projects} / {subscription.limits.projects}
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(subscription.usage.projects, subscription.limits.projects)} 
                            className="h-1.5"
                          />
                        </div>

                        {/* Orders Usage */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <Label className="text-sm">{t('settings.subscription.monthlyOrders')}</Label>
                            <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.monthlyOrders, subscription.limits.monthlyOrders))}`}>
                              {subscription.usage.monthlyOrders} / {subscription.limits.monthlyOrders}
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(subscription.usage.monthlyOrders, subscription.limits.monthlyOrders)} 
                            className="h-1.5"
                          />
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

                    {/* Applied Promo Code Section */}
                    {appliedPromoCode && (
                      <div className="border-t pt-4 max-w-2xl">
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-primary/10">{t('settings.subscription.appliedCode')}</Badge>
                              <span>{t('settings.subscription.activePromoCode')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-lg font-bold">{appliedPromoCode.code}</p>
                                {appliedPromoCode.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{appliedPromoCode.description}</p>
                                )}
                              </div>
                              <Badge className={getTierBadgeColor(appliedPromoCode.tier_granted)}>
                                {appliedPromoCode.tier_granted === 'tier_1' ? 'PRO' : appliedPromoCode.tier_granted === 'tier_2' ? 'BUSINESS' : 'FREE'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{t('settings.subscription.applied')} {new Date(appliedPromoCode.applied_at).toLocaleDateString()}</span>
                              </div>
                              {appliedPromoCode.is_permanent ? (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  {t('settings.subscription.permanentSubscription')}
                                </Badge>
                              ) : subscriptionInfo?.expires_at ? (
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>{t('settings.subscription.expires')} {new Date(subscriptionInfo.expires_at).toLocaleDateString()}</span>
                                </div>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Promo Code Section */}
                    <div className="border-t pt-4 max-w-2xl">
                      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">PROMO</Badge>
                            {t('settings.promoCode.title')}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {t('settings.promoCode.description')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleApplyPromoCode} className="flex gap-2">
                            <Input
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              placeholder={t('settings.promoCode.placeholder')}
                              className="uppercase"
                              disabled={applyingCode}
                            />
                            <Button type="submit" disabled={applyingCode || !promoCode.trim()}>
                              {applyingCode ? t('common.loading') : t('settings.promoCode.apply')}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-3">
                      <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                        {subscriptionInfo.tier === 'free' ? t('settings.subscription.upgradePlan') : t('settings.subscription.changePlan')}
                      </Button>
                      {subscriptionInfo.status === 'active' && subscriptionInfo.tier !== 'free' && (
                        <Button variant="destructive" size="sm" onClick={handleCancelSubscription}>
                          {t('settings.subscription.cancelSubscription')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t('settings.invoices.title')}</CardTitle>
                <CardDescription className="text-sm">{t('settings.invoices.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t('settings.invoices.noInvoices')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('settings.invoices.invoiceNumber')}</TableHead>
                        <TableHead>{t('settings.invoices.date')}</TableHead>
                        <TableHead>{t('settings.invoices.plan')}</TableHead>
                        <TableHead>{t('settings.invoices.period')}</TableHead>
                        <TableHead>{t('settings.invoices.amount')}</TableHead>
                        <TableHead>{t('settings.invoices.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{new Date(invoice.issued_date).toLocaleDateString()}</TableCell>
                          <TableCell>{getTierName(invoice.tier)}</TableCell>
                          <TableCell className="capitalize">{invoice.billing_period}</TableCell>
                          <TableCell>{invoice.amount.toFixed(2)}€</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              invoice.status === 'paid' ? 'bg-primary/10 text-primary' :
                              invoice.status === 'refunded' ? 'bg-destructive/10 text-destructive' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {invoice.status.toUpperCase()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </>
  );
};

export default Settings;
