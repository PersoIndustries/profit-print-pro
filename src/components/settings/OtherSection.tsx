import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface SubscriptionInfo {
  expires_at: string | null;
}

interface OtherSectionProps {
  appliedPromoCode: AppliedPromoCode | null;
  appliedCreatorCode: AppliedCreatorCode | null;
  subscriptionInfo: SubscriptionInfo | null;
  onCodeApplied: () => void;
}

export function OtherSection({ 
  appliedPromoCode, 
  appliedCreatorCode, 
  subscriptionInfo,
  onCodeApplied 
}: OtherSectionProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);

  const getTierBadgeColor = (tier: string) => {
    switch(tier) {
      case 'tier_2': return 'bg-purple-500';
      case 'tier_1': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error("Por favor ingresa un código");
      return;
    }

    setApplyingCode(true);
    const codeToApply = code.trim().toUpperCase();
    
    try {
      const { data, error } = await supabase.functions.invoke('redeem-code', {
        body: { code: codeToApply },
      });

      if (error) {
        console.error('Error invoking redeem-code:', error);
        let errorMessage = 'Error al aplicar código';
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
        const result = data as { success: boolean; message: string };
        
        if (result.success) {
          toast.success(result.message);
          setCode("");
          onCodeApplied();
          return;
        } else {
          toast.error(result.message || 'Código inválido');
          return;
        }
      }

      toast.error('Código inválido');
    } catch (error: any) {
      console.error("Error applying code:", error);
      toast.error(error.message || 'Error al aplicar código');
    } finally {
      setApplyingCode(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Otros</CardTitle>
        <CardDescription className="text-sm">
          Códigos y configuración adicional
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Applied Promo Code */}
        {appliedPromoCode && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-xs">PROMO</Badge>
                <span>Código Activo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{appliedPromoCode.code}</p>
                  {appliedPromoCode.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {appliedPromoCode.description}
                    </p>
                  )}
                </div>
                <Badge className={getTierBadgeColor(appliedPromoCode.tier_granted)}>
                  {appliedPromoCode.tier_granted === 'tier_1' ? 'PRO' : appliedPromoCode.tier_granted === 'tier_2' ? 'BUSINESS' : 'FREE'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Aplicado el {new Date(appliedPromoCode.applied_at).toLocaleDateString()}</span>
                </div>
                {appliedPromoCode.is_permanent ? (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                    Permanente
                  </Badge>
                ) : subscriptionInfo?.expires_at ? (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Expira el {new Date(subscriptionInfo.expires_at).toLocaleDateString()}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applied Creator Code */}
        {appliedCreatorCode && (
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
        )}

        {/* Redeem Code Form */}
        {!appliedPromoCode && !appliedCreatorCode && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-xs">CÓDIGO</Badge>
                <span>Redeem Code</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Ingresa tu código. El sistema detectará automáticamente el tipo y aplicará los beneficios.
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
                  {applyingCode ? 'Aplicando...' : 'Aplicar'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                Acepta códigos promocionales y códigos de creador
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
