import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, DollarSign, Gift, Sparkles } from "lucide-react";

interface AppliedCode {
  code: string;
  applied_at: string;
  tier_granted: string;
  description?: string | null;
  is_permanent?: boolean;
  // Creator code specific
  trial_days_granted?: number;
  discount_percentage?: number;
  creator_name?: string | null;
  type: 'promo' | 'creator';
}

interface PromotionalCodesSectionProps {
  userId: string | undefined;
  appliedCodes: AppliedCode[];
  onCodesUpdated: () => void;
}

export function PromotionalCodesSection({ userId, appliedCodes, onCodesUpdated }: PromotionalCodesSectionProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const getTierBadgeColor = (tier: string) => {
    switch(tier) {
      case 'tier_2': return 'bg-purple-500';
      case 'tier_1': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getTierName = (tier: string) => {
    return tier === 'tier_1' ? 'PRO' : tier === 'tier_2' ? 'BUSINESS' : 'FREE';
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Por favor ingresa un código');
      return;
    }

    setApplying(true);
    try {
      // Use unified redeem-code Edge Function
      const { data, error } = await supabase.functions.invoke('redeem-code', {
        body: {
          code: code.trim().toUpperCase(),
        },
      });

      if (error) {
        console.error('Error invoking redeem-code:', error);
        let errorMessage = 'Error al canjear el código';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.context && error.context.body) {
          try {
            const errorBody = JSON.parse(error.context.body);
            errorMessage = errorBody.error || errorBody.message || errorMessage;
          } catch (e) {
            // If parsing fails, use default message
          }
        }
        toast.error(errorMessage);
        return;
      }

      if (data) {
        const result = data as { success: boolean; message: string; codeType?: 'promo' | 'creator'; tier?: string; trial_days?: number; discount_percentage?: number };
        
        if (result.success) {
          toast.success(result.message);
          setCode("");
          onCodesUpdated();
          return;
        } else {
          toast.error(result.message || 'Código no válido. Verifica que el código sea correcto.');
          return;
        }
      }

      toast.error('Código no válido. Verifica que el código sea correcto.');
    } catch (error: any) {
      console.error("Error redeeming code:", error);
      toast.error(error.message || 'Error al canjear el código');
    } finally {
      setApplying(false);
    }
  };

  const hasAnyCodes = appliedCodes.length > 0;

  return (
    <div className="space-y-4">
      {/* Applied Codes */}
      {appliedCodes.map((appliedCode, index) => (
        <Card 
          key={index}
          className={appliedCode.type === 'creator' 
            ? "border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-background" 
            : "border-primary/30 bg-gradient-to-br from-primary/5 to-background"}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className={appliedCode.type === 'creator' 
                ? "text-xs bg-purple-500/10 text-purple-600 border-purple-500/20" 
                : "text-xs bg-primary/10"}>
                {appliedCode.type === 'creator' ? 'CREATOR' : 'PROMO'}
              </Badge>
              <span>{appliedCode.type === 'creator' ? 'Código de Creador Activo' : t('settings.subscription.activePromoCode')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-lg font-bold">{appliedCode.code}</p>
                {appliedCode.description && (
                  <p className="text-sm text-muted-foreground mt-1">{appliedCode.description}</p>
                )}
                {appliedCode.creator_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Creador: {appliedCode.creator_name}
                  </p>
                )}
              </div>
              <Badge className={getTierBadgeColor(appliedCode.tier_granted)}>
                {getTierName(appliedCode.tier_granted)}
              </Badge>
            </div>

            {/* Benefits */}
            {appliedCode.type === 'creator' && (
              <div className="space-y-2 border-t pt-3">
                {appliedCode.trial_days_granted && appliedCode.trial_days_granted > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Trial de {appliedCode.trial_days_granted} días</span>
                  </div>
                )}
                {appliedCode.discount_percentage && appliedCode.discount_percentage > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                      {appliedCode.discount_percentage}% descuento
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{appliedCode.type === 'creator' ? 'Aplicado el' : t('settings.subscription.applied')} {new Date(appliedCode.applied_at).toLocaleDateString()}</span>
              </div>
              {appliedCode.is_permanent && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t('settings.subscription.permanentSubscription')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Apply New Code */}
      {!hasAnyCodes && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Canjear Código
            </CardTitle>
            <CardDescription className="text-sm">
              Ingresa un código para desbloquear beneficios especiales como trial gratuito, descuentos o acceso a planes premium
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApplyCode} className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PROMO2024 o CREATOR123"
                className="uppercase font-mono"
                disabled={applying}
              />
              <Button type="submit" disabled={applying || !code.trim()}>
                {applying ? t('common.loading') : 'Aplicar'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              El sistema detectará automáticamente el tipo de código y aplicará los beneficios correspondientes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
