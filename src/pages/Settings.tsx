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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Settings as SettingsIcon, CreditCard, Receipt, User, TrendingUp, AlertCircle, Calendar, BarChart3, Shield, Clock, DollarSign, FileText, HelpCircle, Mail, MessageCircle } from "lucide-react";
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
  is_paid_subscription?: boolean;
}

interface AppliedPromoCode {
  code: string;
  applied_at: string;
  tier_granted: string;
  description: string | null;
  is_permanent: boolean;
}

interface AppliedCreatorCode {
  code: string;
  applied_at: string;
  tier_granted: string;
  trial_days_granted: number;
  discount_percentage: number;
  creator_name: string | null;
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
  const [code, setCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<AppliedPromoCode | null>(null);
  const [appliedCreatorCode, setAppliedCreatorCode] = useState<AppliedCreatorCode | null>(null);
  
  // Refund request states
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundInvoiceId, setRefundInvoiceId] = useState<string>("");
  const [refundType, setRefundType] = useState<string>("monthly_payment");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundDescription, setRefundDescription] = useState<string>("");
  const [refundValidating, setRefundValidating] = useState(false);
  const [refundValidation, setRefundValidation] = useState<any>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [expandedRefundRequest, setExpandedRefundRequest] = useState<string | null>(null);
  const [refundRequestMessages, setRefundRequestMessages] = useState<Map<string, any[]>>(new Map());
  const [refundRequestNewMessage, setRefundRequestNewMessage] = useState<Map<string, string>>(new Map());
  const [sendingRefundMessage, setSendingRefundMessage] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchData();
    }

    // Cleanup subscriptions on unmount
    return () => {
      Object.keys(window).forEach(key => {
        if (key.startsWith('support_channel_')) {
          const channel = (window as any)[key];
          if (channel) {
            supabase.removeChannel(channel);
            delete (window as any)[key];
          }
        }
      });
    };
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      if (!user) return;
      
      const [profileRes, subRes, invoicesRes, promoCodeRes, creatorCodeRes, refundRequestsRes] = await Promise.all([
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
          .maybeSingle(),
        supabase
          .from("creator_code_uses")
          .select(`
            creator_code_id,
            applied_at,
            tier_granted,
            trial_days_granted,
            discount_percentage,
            creator_codes!inner(
              code,
              creator_user_id,
              profiles!creator_codes_creator_user_id_fkey(full_name, email)
            )
          `)
          .eq("user_id", user.id)
          .order("applied_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("refund_requests")
          .select(`
            *,
            invoices!refund_requests_invoice_id_fkey(invoice_number, amount)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
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

        // Check for applied creator code
        if (creatorCodeRes.data && creatorCodeRes.data.creator_codes) {
          const creatorCodeData = creatorCodeRes.data.creator_codes as any;
          const creatorProfile = creatorCodeData.profiles || {};
          setAppliedCreatorCode({
            code: creatorCodeData.code,
            applied_at: creatorCodeRes.data.applied_at,
            tier_granted: creatorCodeRes.data.tier_granted,
            trial_days_granted: creatorCodeRes.data.trial_days_granted || 0,
            discount_percentage: creatorCodeRes.data.discount_percentage || 0,
            creator_name: creatorProfile.full_name || creatorProfile.email || null,
          });
        } else {
          setAppliedCreatorCode(null);
        }
      }

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data);
        // Set recent invoices for refund requests
        const paidInvoices = invoicesRes.data
          .filter((inv: any) => inv.status === 'paid' && inv.amount > 0)
          .slice(0, 5);
        setRecentInvoices(paidInvoices);
      }

      if (refundRequestsRes.data) {
        setRefundRequests(refundRequestsRes.data);
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

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Por favor ingresa un código');
      return;
    }

    setApplyingCode(true);
    const codeToApply = code.trim().toUpperCase();
    
    try {
      // Primero verificar si existe como código promocional
      const { data: promoCodeCheck, error: promoCheckError } = await supabase
        .from('promo_codes')
        .select('id, code, is_active')
        .eq('code', codeToApply)
        .maybeSingle();

      // Si existe como código promocional, intentar aplicarlo
      if (promoCodeCheck && !promoCheckError) {
        const { data: promoData, error: promoError } = await supabase.rpc('apply_promo_code', {
          _code: codeToApply,
          _user_id: user?.id
        });

        if (!promoError && promoData) {
          const result = promoData as { success: boolean; message: string; tier?: string };
          
          if (result.success) {
            toast.success(result.message);
            setCode("");
            await fetchData();
            return;
          } else {
            toast.error(result.message || 'Error al aplicar código promocional');
            return;
          }
        } else if (promoError) {
          toast.error(promoError.message || 'Error al aplicar código promocional');
          return;
        }
      }

      // Si no es código promocional, verificar si existe como código de creador
      const { data: creatorCodeCheck, error: creatorCheckError } = await supabase
        .from('creator_codes')
        .select('id, code, is_active')
        .eq('code', codeToApply)
        .maybeSingle();

      if (creatorCodeCheck && !creatorCheckError) {
        const { data: creatorData, error: creatorError } = await supabase.rpc('apply_creator_code', {
          _code: codeToApply,
          _user_id: user?.id
        });

        if (creatorError) {
          toast.error(creatorError.message || 'Error al aplicar código de creador');
          return;
        }

        const result = creatorData as { success: boolean; message: string; tier?: string; trial_days?: number; discount_percentage?: number };
        
        if (result.success) {
          let message = result.message;
          if (result.trial_days) {
            message += ` Trial de ${result.trial_days} días activado.`;
          }
          if (result.discount_percentage) {
            message += ` Descuento del ${result.discount_percentage}% aplicado.`;
          }
          toast.success(message);
          setCode("");
          await fetchData();
          return;
        } else {
          toast.error(result.message || 'Error al aplicar código de creador');
          return;
        }
      }

      // Si no existe en ninguna tabla, mostrar error
      toast.error('Código no válido. Verifica que el código sea correcto.');
    } catch (error: any) {
      console.error("Error applying code:", error);
      toast.error(error.message || 'Error al aplicar el código. Intenta nuevamente.');
    } finally {
      setApplyingCode(false);
    }
  };

  const handleValidateRefund = async () => {
    if (!user || !refundInvoiceId || !refundType) return;

    setRefundValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_refund_request', {
        p_user_id: user.id,
        p_invoice_id: refundInvoiceId,
        p_refund_type: refundType
      });

      if (error) throw error;

      setRefundValidation(data);
      const validation = data as any;
      if (validation?.eligible) {
        toast.success('La solicitud cumple con todos los requisitos');
      } else {
        toast.error('La solicitud no cumple con los requisitos');
      }
    } catch (error: any) {
      console.error('Error validating refund:', error);
      toast.error(error.message || 'Error al validar la solicitud');
    } finally {
      setRefundValidating(false);
    }
  };

  const handleSubmitRefundRequest = async () => {
    if (!user || !refundInvoiceId || !refundType || !refundReason.trim() || !refundValidation?.eligible) return;

    setRefundSubmitting(true);
    try {
      // Get invoice amount
      const invoice = recentInvoices.find((inv) => inv.id === refundInvoiceId);
      if (!invoice) {
        toast.error('Factura no encontrada');
        return;
      }

      const { data, error } = await supabase.rpc('create_refund_request', {
        p_user_id: user.id,
        p_invoice_id: refundInvoiceId,
        p_amount: invoice.amount,
        p_reason: refundReason,
        p_description: refundDescription,
        p_refund_type: refundType
      });

      if (error) throw error;

      toast.success('Solicitud de refund enviada correctamente');
      setRefundDialogOpen(false);
      setRefundInvoiceId("");
      setRefundType("monthly_payment");
      setRefundReason("");
      setRefundDescription("");
      setRefundValidation(null);
      // Refresh refund requests list
      if (user) {
        const { data } = await supabase
          .from("refund_requests")
          .select(`
            *,
            invoices!refund_requests_invoice_id_fkey(invoice_number, amount)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setRefundRequests(data);
      }
    } catch (error: any) {
      console.error('Error submitting refund request:', error);
      toast.error(error.message || 'Error al enviar la solicitud');
    } finally {
      setRefundSubmitting(false);
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
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
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
            <TabsTrigger value="support">
              <HelpCircle className="h-4 w-4 mr-2" />
              Soporte
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
                        {(() => {
                          const isCancelledButActive = subscriptionInfo.status === 'cancelled' && 
                            subscriptionInfo.expires_at && 
                            new Date(subscriptionInfo.expires_at) > new Date();
                          
                          return (
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
                          );
                        })()}
                      </div>
                    </div>

                    {/* Cancelled but Active Alert */}
                    {subscriptionInfo.status === 'cancelled' && 
                     subscriptionInfo.expires_at && 
                     new Date(subscriptionInfo.expires_at) > new Date() && (
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
                                <strong>{new Date(subscriptionInfo.expires_at).toLocaleDateString()}</strong>.
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

                    {/* Trial Days Remaining Alert */}
                    {subscription?.isTrialActive && subscription?.daysRemaining !== undefined && subscription.daysRemaining <= 7 && (
                      <Card className={`mt-4 ${
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
                              <Button 
                                size="sm" 
                                onClick={() => navigate('/pricing')}
                                variant="default"
                              >
                                Ver Planes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

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

                    {/* Applied Creator Code Section */}
                    {appliedCreatorCode && (
                      <div className="border-t pt-4 max-w-2xl">
                        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-background">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">CREATOR</Badge>
                              <span>Código de Creador Activo</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-lg font-bold">{appliedCreatorCode.code}</p>
                                {appliedCreatorCode.creator_name && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Creador: {appliedCreatorCode.creator_name}
                                  </p>
                                )}
                              </div>
                              <Badge className={getTierBadgeColor(appliedCreatorCode.tier_granted)}>
                                {appliedCreatorCode.tier_granted === 'tier_1' ? 'PRO' : appliedCreatorCode.tier_granted === 'tier_2' ? 'BUSINESS' : 'FREE'}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {appliedCreatorCode.trial_days_granted > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <span>Trial de {appliedCreatorCode.trial_days_granted} días</span>
                                </div>
                              )}
                              {appliedCreatorCode.discount_percentage > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                    {appliedCreatorCode.discount_percentage}% descuento
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Aplicado el {new Date(appliedCreatorCode.applied_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Unified Code Section */}
                    {!appliedPromoCode && !appliedCreatorCode && (
                      <div className="border-t pt-4 max-w-2xl">
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">CÓDIGO</Badge>
                              Código Promocional o de Creador
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Ingresa un código promocional o de creador. El sistema detectará automáticamente el tipo de código y aplicará los beneficios correspondientes.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={handleApplyCode} className="flex gap-2">
                              <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="Ingresa tu código aquí"
                                className="uppercase font-mono"
                                disabled={applyingCode}
                              />
                              <Button type="submit" disabled={applyingCode || !code.trim()}>
                                {applyingCode ? t('common.loading') : 'Aplicar Código'}
                              </Button>
                            </form>
                            <p className="text-xs text-muted-foreground mt-2">
                              Acepta códigos promocionales (acceso permanente) o códigos de creador (trial + descuentos)
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

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
                        <TableHead>Acciones</TableHead>
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
                          <TableCell>
                            {invoice.status === 'paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRefundInvoiceId(invoice.id);
                                  setRefundDialogOpen(true);
                                }}
                                className="text-xs"
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Solicitar Refund
                              </Button>
                            )}
                            {invoice.status === 'refunded' && (
                              <span className="text-xs text-muted-foreground">Reembolsado</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Soporte
                </CardTitle>
                <CardDescription>
                  ¿Necesitas ayuda? Estamos aquí para asistirte.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-6 border rounded-lg bg-muted/50">
                    <div className="flex items-start gap-4">
                      <Mail className="h-6 w-6 text-primary mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Soporte por Email</h3>
                        <p className="text-muted-foreground mb-4">
                          Envíanos un email con tu consulta y te responderemos lo antes posible.
                        </p>
                        <a
                          href="mailto:support@layersuite.com"
                          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                        >
                          <Mail className="h-4 w-4" />
                          support@layersuite.com
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border rounded-lg bg-muted/50">
                    <div className="flex items-start gap-4">
                      <MessageCircle className="h-6 w-6 text-primary mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Comunidad Discord</h3>
                        <p className="text-muted-foreground mb-4">
                          Únete a nuestra comunidad en Discord para obtener ayuda, compartir ideas y conectar con otros usuarios.
                        </p>
                        <a
                          href="https://discord.gg/GHAq7BrZta"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Unirse a Discord
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <strong>Nota:</strong> Para obtener la mejor asistencia, incluye detalles sobre tu problema o consulta. 
                          Si es un problema técnico, menciona tu navegador y sistema operativo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund Requests History */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Historial de Soporte
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Consulta el estado de tus solicitudes de soporte
                      </p>
                    </div>
                  </div>

                  {/* Development Disclaimer */}
                  <Alert className="mb-4 border-orange-500/30 bg-orange-500/5">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <AlertTitle className="text-sm font-semibold">Sistema en Desarrollo</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      Estamos trabajando en nuevas funcionalidades de soporte. Si experimentas algún problema, por favor contáctanos directamente.
                    </AlertDescription>
                  </Alert>

                  {refundRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No tienes solicitudes de soporte</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {refundRequests.map((request: any) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case 'pending':
                              return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-400">Pendiente</Badge>;
                            case 'approved':
                              return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400">Aprobado</Badge>;
                            case 'processed':
                              return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400">Procesado</Badge>;
                            case 'rejected':
                              return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400">Rechazado</Badge>;
                            default:
                              return <Badge variant="outline">{status}</Badge>;
                          }
                        };

                        const getRefundTypeLabel = (type: string) => {
                          switch (type) {
                            case 'monthly_payment':
                              return 'Pago Mensual';
                            case 'annual_payment_error':
                              return 'Error de Pago (Anual)';
                            case 'application_issue':
                              return 'Problema de la Aplicación';
                            case 'other':
                              return 'Otro';
                            default:
                              return type;
                          }
                        };

                        const isExpanded = expandedRefundRequest === request.id;
                        const messages = refundRequestMessages.get(request.id) || [];

                        return (
                          <Card key={request.id} className="border-l-4 border-l-primary/50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {getStatusBadge(request.status)}
                                    <span className="text-sm font-medium">
                                      {request.invoices && (Array.isArray(request.invoices) ? request.invoices[0] : request.invoices) 
                                        ? `Factura: ${(Array.isArray(request.invoices) ? request.invoices[0] : request.invoices).invoice_number}` 
                                        : `€${Math.abs(request.amount).toFixed(2)}`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(request.created_at).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <p className="text-sm">
                                      <span className="font-medium">Tipo:</span> {getRefundTypeLabel(request.refund_type)}
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Motivo:</span> {request.reason}
                                    </p>
                                    {request.description && (
                                      <p className="text-sm text-muted-foreground">
                                        {request.description}
                                      </p>
                                    )}
                                    {request.admin_notes && (
                                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                                        <span className="font-medium">Nota del administrador:</span>
                                        <p className="text-muted-foreground mt-1">{request.admin_notes}</p>
                                      </div>
                                    )}
                                    {request.processed_at && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Procesado el: {new Date(request.processed_at).toLocaleDateString('es-ES', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                  </div>

                                  {/* Messages Section - Only show for pending requests */}
                                  {request.status === 'pending' && (
                                    <div className="mt-4 border-t pt-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          if (!isExpanded) {
                                            setExpandedRefundRequest(request.id);
                                            try {
                                              // Get ticket ID for this refund request
                                              const { data: ticketData, error: ticketError } = await supabase
                                                .from('support_tickets' as any)
                                                .select('id')
                                                .eq('related_entity_type', 'refund_request')
                                                .eq('related_entity_id', request.id)
                                                .maybeSingle();

                                              if (ticketError || !ticketData) {
                                                console.warn('No ticket found for refund request');
                                                setRefundRequestMessages(prev => {
                                                  const newMap = new Map(prev);
                                                  newMap.set(request.id, []);
                                                  return newMap;
                                                });
                                                return;
                                              }

                                              const ticketId = (ticketData as any).id;

                                              // Fetch messages
                                              const { data: messagesData, error: messagesError } = await supabase
                                                .from('support_messages' as any)
                                                .select(`
                                                  *,
                                                  profiles!support_messages_sender_id_fkey(id, email, full_name)
                                                `)
                                                .eq('ticket_id', ticketId)
                                                .order('created_at', { ascending: true });

                                              if (messagesError) {
                                                console.error('Error fetching messages:', messagesError);
                                                setRefundRequestMessages(prev => {
                                                  const newMap = new Map(prev);
                                                  newMap.set(request.id, []);
                                                  return newMap;
                                                });
                                                return;
                                              }

                                              setRefundRequestMessages(prev => {
                                                const newMap = new Map(prev);
                                                newMap.set(request.id, messagesData || []);
                                                return newMap;
                                              });

                                              // Subscribe to new messages for this ticket
                                              const channel = supabase
                                                .channel(`support_messages_${ticketId}`)
                                                .on(
                                                  'postgres_changes',
                                                  {
                                                    event: 'INSERT',
                                                    schema: 'public',
                                                    table: 'support_messages',
                                                    filter: `ticket_id=eq.${ticketId}`,
                                                  },
                                                  async (payload) => {
                                                    // Fetch updated messages
                                                    const { data: updatedMessages } = await supabase
                                                      .from('support_messages' as any)
                                                      .select(`
                                                        *,
                                                        profiles!support_messages_sender_id_fkey(id, email, full_name)
                                                      `)
                                                      .eq('ticket_id', ticketId)
                                                      .order('created_at', { ascending: true });

                                                    if (updatedMessages) {
                                                      setRefundRequestMessages(prev => {
                                                        const newMap = new Map(prev);
                                                        newMap.set(request.id, updatedMessages);
                                                        return newMap;
                                                      });
                                                    }
                                                  }
                                                )
                                                .subscribe();

                                              // Store channel reference for cleanup
                                              (window as any)[`support_channel_${request.id}`] = channel;
                                            } catch (error: any) {
                                              console.error('Error loading messages:', error);
                                              setRefundRequestMessages(prev => {
                                                const newMap = new Map(prev);
                                                newMap.set(request.id, []);
                                                return newMap;
                                              });
                                            }
                                          } else {
                                            setExpandedRefundRequest(null);
                                            // Unsubscribe from channel
                                            const channel = (window as any)[`support_channel_${request.id}`];
                                            if (channel) {
                                              await supabase.removeChannel(channel);
                                              delete (window as any)[`support_channel_${request.id}`];
                                            }
                                          }
                                        }}
                                        className="w-full"
                                      >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        {isExpanded ? 'Ocultar' : 'Ver'} Conversación ({messages.length})
                                      </Button>

                                      {isExpanded && (
                                        <div className="mt-3 space-y-3">
                                          <div className="border rounded-lg p-3 bg-muted/30 max-h-64 overflow-y-auto space-y-2">
                                            {messages.length === 0 ? (
                                              <p className="text-sm text-muted-foreground text-center py-4">No hay mensajes aún</p>
                                            ) : (
                                              messages.map((msg: any) => (
                                                <div
                                                  key={msg.id}
                                                  className={`p-2 rounded-lg ${
                                                    msg.sender_type === 'admin'
                                                      ? 'bg-primary/10 ml-8'
                                                      : 'bg-background border mr-8'
                                                  }`}
                                                >
                                                  <div className="flex items-start justify-between mb-1">
                                                    <span className="text-xs font-medium">
                                                      {msg.sender_type === 'admin' ? 'Admin' : 'Tú'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                      {new Date(msg.created_at).toLocaleString('es-ES')}
                                                    </span>
                                                  </div>
                                                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                          <div className="flex gap-2">
                                            <Textarea
                                              value={refundRequestNewMessage.get(request.id) || ''}
                                              onChange={(e) => {
                                                const newMap = new Map(refundRequestNewMessage);
                                                newMap.set(request.id, e.target.value);
                                                setRefundRequestNewMessage(newMap);
                                              }}
                                              placeholder="Escribe tu respuesta..."
                                              rows={2}
                                            />
                                            <Button
                                              onClick={async () => {
                                                const message = refundRequestNewMessage.get(request.id);
                                                if (!message?.trim() || !user) return;

                                                setSendingRefundMessage(true);
                                                try {
                                                  // Get ticket ID
                                                  const { data: ticketData, error: ticketError } = await supabase
                                                    .from('support_tickets' as any)
                                                    .select('id')
                                                    .eq('related_entity_type', 'refund_request')
                                                    .eq('related_entity_id', request.id)
                                                    .maybeSingle();

                                                  if (ticketError || !ticketData) {
                                                    toast.error('No se encontró el ticket de soporte');
                                                    return;
                                                  }

                                                  const ticketId = (ticketData as any).id;

                                                  // Send message
                                                  const { error: sendError } = await supabase
                                                    .from('support_messages' as any)
                                                    .insert({
                                                      ticket_id: ticketId,
                                                      sender_id: user.id,
                                                      sender_type: 'user',
                                                      message: message.trim(),
                                                    });

                                                  if (sendError) throw sendError;

                                                  // Refresh messages
                                                  const { data: newMessages, error: messagesError } = await supabase
                                                    .from('support_messages' as any)
                                                    .select(`
                                                      *,
                                                      profiles!support_messages_sender_id_fkey(id, email, full_name)
                                                    `)
                                                    .eq('ticket_id', ticketId)
                                                    .order('created_at', { ascending: true });

                                                  if (!messagesError && newMessages) {
                                                    setRefundRequestMessages(prev => {
                                                      const newMap = new Map(prev);
                                                      newMap.set(request.id, newMessages);
                                                      return newMap;
                                                    });
                                                  }

                                                  const newMap = new Map(refundRequestNewMessage);
                                                  newMap.set(request.id, '');
                                                  setRefundRequestNewMessage(newMap);
                                                  toast.success('Mensaje enviado');
                                                } catch (error: any) {
                                                  console.error('Error sending message:', error);
                                                  toast.error('Error al enviar mensaje');
                                                } finally {
                                                  setSendingRefundMessage(false);
                                                }
                                              }}
                                              disabled={!refundRequestNewMessage.get(request.id)?.trim() || sendingRefundMessage}
                                              size="sm"
                                              className="self-end"
                                            >
                                              {sendingRefundMessage ? 'Enviando...' : 'Enviar'}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-primary">
                                    €{Math.abs(request.amount).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{request.currency || 'EUR'}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Refund Request Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Solicitar Refund
            </DialogTitle>
            <DialogDescription>
              Completa el formulario para solicitar un refund. Tu solicitud será revisada por un administrador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Refund Policy */}
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Política de Refunds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground mb-2">
                  <strong>Jardiper S.C.</strong> - Carretera A131, km 1.8 S/N, Fraga, 22520, España
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Máximo 1 semana (7 días) desde el pago para solicitar refund</li>
                  <li>Máximo 15 días para errores de pago (anual en vez de mensual)</li>
                  <li>No haber utilizado los límites máximos del plan</li>
                  <li>Solo se puede hacer refund del mes actual (para pagos mensuales)</li>
                  <li>Debe haber un problema grave demostrable por la aplicación</li>
                  <li>El refund solo aplica al período de facturación actual. Para más información, contacte a support@layersuite.com</li>
                </ul>
              </CardContent>
            </Card>

            {/* Invoice Selection */}
            <div>
              <Label htmlFor="refund-invoice">Factura a Reembolsar *</Label>
              <Select value={refundInvoiceId} onValueChange={setRefundInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una factura" />
                </SelectTrigger>
                <SelectContent>
                  {(recentInvoices.length > 0 ? recentInvoices : invoices.filter((inv: any) => inv.status === 'paid' && inv.amount > 0)).map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - €{invoice.amount.toFixed(2)} - {new Date(invoice.paid_date || invoice.issued_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Refund Type */}
            <div>
              <Label htmlFor="refund-type">Tipo de Refund *</Label>
              <Select value={refundType} onValueChange={setRefundType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_payment">Pago Mensual</SelectItem>
                  <SelectItem value="annual_payment_error">Error de Pago (Anual en vez de Mensual)</SelectItem>
                  <SelectItem value="application_issue">Problema Grave de la Aplicación</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="refund-reason">Motivo *</Label>
              <Input
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Breve descripción del motivo"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="refund-description">Descripción Detallada</Label>
              <Textarea
                id="refund-description"
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                placeholder="Describe el problema o situación en detalle..."
                rows={4}
              />
            </div>

            {/* Validation Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleValidateRefund}
              disabled={!refundInvoiceId || !refundType || refundValidating}
              className="w-full"
            >
              {refundValidating ? 'Validando...' : 'Validar Solicitud'}
            </Button>

            {/* Validation Results */}
            {refundValidation && (
              <Card className={refundValidation.eligible ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
                <CardContent className="pt-6">
                  {refundValidation.eligible ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-green-600">✓ La solicitud cumple con todos los requisitos</p>
                      {refundValidation.validation && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Días desde el pago: {refundValidation.validation.days_since_payment}</p>
                          <p>Uso: {refundValidation.validation.usage.materials} materiales, {refundValidation.validation.usage.projects} proyectos, {refundValidation.validation.usage.orders} pedidos</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-red-600">✗ La solicitud no cumple con los requisitos:</p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {refundValidation.errors?.map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRefundDialogOpen(false);
                  setRefundInvoiceId("");
                  setRefundType("monthly_payment");
                  setRefundReason("");
                  setRefundDescription("");
                  setRefundValidation(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitRefundRequest}
                disabled={!refundValidation?.eligible || !refundReason.trim() || refundSubmitting}
                className="flex-1"
              >
                {refundSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Settings;
