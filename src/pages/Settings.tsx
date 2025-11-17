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
    billing_country: ''
  });
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
          billing_country: profileRes.data.billing_country || ''
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
      toast.error("Error loading settings");
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
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Error updating profile");
    }
  };

  const handleCancelSubscription = async () => {
    // Si tiene un código promocional aplicado con suscripción permanente, prevenir cancelación
    if (appliedPromoCode && appliedPromoCode.is_permanent) {
      toast.error(
        "No puedes cancelar una suscripción obtenida mediante código promocional permanente. " +
        "Si necesitas ayuda, contacta con soporte."
      );
      return;
    }

    // Si tiene código promocional pero no es permanente, advertir
    if (appliedPromoCode && !appliedPromoCode.is_permanent) {
      const confirmMessage = 
        `Tienes un código promocional aplicado (${appliedPromoCode.code}). ` +
        "Si cancelas, perderás el acceso premium. ¿Estás seguro?";
      if (!confirm(confirmMessage)) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to cancel your subscription? You will lose access to premium features.")) {
        return;
      }
    }

    try {
      // Si tiene código promocional, cambiar a free tier
      // Si no tiene código promocional, solo cambiar status
      const updateData = appliedPromoCode 
        ? { status: 'cancelled', tier: 'free' }
        : { status: 'cancelled' };

      const { error } = await supabase
        .from("user_subscriptions")
        .update(updateData)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Log the change
      if (subscriptionInfo) {
        await supabase
          .from("subscription_changes")
          .insert({
            user_id: user?.id,
            previous_tier: subscriptionInfo.tier,
            new_tier: appliedPromoCode ? 'free' : subscriptionInfo.tier,
            change_type: 'cancel',
            reason: appliedPromoCode 
              ? `Suscripción cancelada. Código promocional ${appliedPromoCode.code} revocado.`
              : 'Suscripción cancelada por el usuario'
          });
      }

      toast.success("Subscription cancelled");
      await fetchData();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message || "Error cancelling subscription");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success("Contraseña actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Error al cambiar la contraseña");
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
    switch(tier) {
      case 'tier_1': return 'Professional';
      case 'tier_2': return 'Business';
      default: return 'Free';
    }
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
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription className="text-sm">Update your personal and billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-2xl">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="full_name" className="text-sm">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm">Email (Read-only)</Label>
                      <Input id="email" value={profile.email} disabled className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-base font-semibold mb-3">Billing Address</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_address" className="text-sm">Address</Label>
                        <Input
                          id="billing_address"
                          value={profile.billing_address}
                          onChange={(e) => setProfile({ ...profile, billing_address: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_city" className="text-sm">City</Label>
                        <Input
                          id="billing_city"
                          value={profile.billing_city}
                          onChange={(e) => setProfile({ ...profile, billing_city: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_postal_code" className="text-sm">Postal Code</Label>
                        <Input
                          id="billing_postal_code"
                          value={profile.billing_postal_code}
                          onChange={(e) => setProfile({ ...profile, billing_postal_code: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_country" className="text-sm">Country</Label>
                        <Input
                          id="billing_country"
                          value={profile.billing_country}
                          onChange={(e) => setProfile({ ...profile, billing_country: e.target.value })}
                          className="h-9 text-sm"
                        />
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
                <CardTitle className="text-lg">Seguridad</CardTitle>
                <CardDescription className="text-sm">Administra la seguridad de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="new_password" className="text-sm">Nueva Contraseña</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Introduce tu nueva contraseña"
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm_password" className="text-sm">Confirmar Contraseña</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirma tu nueva contraseña"
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" size="sm" className="mt-2">Cambiar Contraseña</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Subscription Management</CardTitle>
                <CardDescription className="text-sm">Manage your subscription plan and usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {subscriptionInfo && subscription && (
                  <div className="space-y-6">
                    {/* Plan Information */}
                    <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
                      <div>
                        <Label className="text-sm text-muted-foreground">Current Plan</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xl font-bold">{getTierName(subscriptionInfo.tier)}</p>
                          <Badge className={getTierBadgeColor(subscriptionInfo.tier)}>
                            {subscriptionInfo.tier === 'free' ? 'FREE' : subscriptionInfo.tier === 'tier_1' ? 'PRO' : 'BUSINESS'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <p className={`text-lg font-semibold mt-1 ${
                          subscriptionInfo.status === 'active' ? 'text-primary' : 'text-destructive'
                        }`}>
                          {subscriptionInfo.status.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Free User CTA */}
                    {subscriptionInfo.tier === 'free' && (
                      <>
                        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
                          <CardHeader className="text-center pb-3">
                            <TrendingUp className="h-10 w-10 mx-auto mb-3 text-primary" />
                            <CardTitle className="text-xl">Desbloquea Estadísticas Avanzadas</CardTitle>
                            <CardDescription className="text-sm">
                              Actualiza a un plan profesional para acceder a métricas detalladas de tu negocio
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-3">
                              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-card">
                                <Calendar className="h-6 w-6 text-primary mb-2" />
                                <h3 className="font-semibold text-sm mb-1">Historial Completo</h3>
                                <p className="text-xs text-muted-foreground">
                                  Accede a métricas de hasta 2 años
                                </p>
                              </div>
                              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-card">
                                <BarChart3 className="h-6 w-6 text-primary mb-2" />
                                <h3 className="font-semibold text-sm mb-1">Análisis Detallado</h3>
                                <p className="text-xs text-muted-foreground">
                                  Filtra por día, semana, mes o trimestre
                                </p>
                              </div>
                              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-card">
                                <TrendingUp className="h-6 w-6 text-primary mb-2" />
                                <h3 className="font-semibold text-sm mb-1">Proyecciones</h3>
                                <p className="text-xs text-muted-foreground">
                                  Predicciones de ingresos y tendencias
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-center">
                              <Button 
                                size="sm" 
                                onClick={() => navigate("/pricing")}
                                className="w-full md:w-auto"
                              >
                                Ver Planes Profesionales
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Plan Actual: Free</CardTitle>
                            <CardDescription className="text-sm">
                              Tu plan incluye funcionalidades básicas para empezar
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Materiales</span>
                              <span className="font-medium">Hasta 10</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Proyectos</span>
                              <span className="font-medium">Hasta 15</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Pedidos mensuales</span>
                              <span className="font-medium">Hasta 15</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Historial de métricas</span>
                              <span className="font-medium text-muted-foreground">No disponible</span>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Usage Statistics */}
                    <div className="border-t pt-4 max-w-2xl">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Uso Actual
                      </h3>
                      <div className="space-y-3">
                        {/* Materials Usage */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <Label className="text-sm">Materiales</Label>
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
                            <Label className="text-sm">Proyectos</Label>
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
                            <Label className="text-sm">Pedidos Mensuales</Label>
                            <span className={`text-xs font-medium ${getUsageColor(getUsagePercentage(subscription.usage.monthlyOrders, subscription.limits.monthlyOrders))}`}>
                              {subscription.usage.monthlyOrders} / {subscription.limits.monthlyOrders}
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(subscription.usage.monthlyOrders, subscription.limits.monthlyOrders)} 
                            className="h-1.5"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Se reinicia el primer día de cada mes
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Billing Info */}
                    {subscriptionInfo.tier !== 'free' && (
                      <div className="border-t pt-4 max-w-2xl">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Billing Period</Label>
                            <p className="text-base font-medium capitalize mt-1">{subscriptionInfo.billing_period}</p>
                          </div>
                          {subscriptionInfo.next_billing_date && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Next Billing Date</Label>
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
                              <Badge variant="outline" className="text-xs bg-primary/10">CÓDIGO APLICADO</Badge>
                              <span>Código Promocional Activo</span>
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
                                <span>Aplicado: {new Date(appliedPromoCode.applied_at).toLocaleDateString()}</span>
                              </div>
                              {appliedPromoCode.is_permanent ? (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  ✓ Suscripción Permanente
                                </Badge>
                              ) : subscriptionInfo?.expires_at ? (
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Expira: {new Date(subscriptionInfo.expires_at).toLocaleDateString()}</span>
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
                        {subscriptionInfo.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                      </Button>
                      {subscriptionInfo.status === 'active' && subscriptionInfo.tier !== 'free' && (
                        <Button variant="destructive" size="sm" onClick={handleCancelSubscription}>
                          Cancel Subscription
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
                <CardTitle className="text-lg">Invoice History</CardTitle>
                <CardDescription className="text-sm">View and download your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No invoices yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
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
