/**
 * Modal Informativo para Acciones Administrativas
 * 
 * Muestra información sobre qué pasará cuando el admin realiza una acción
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, CheckCircle2, XCircle, CreditCard, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdminActionInfoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: 'changeTier' | 'cancel' | 'refund' | 'addTrial' | 'deleteUser' | 'processRefundRequest';
  actionData?: {
    previousTier?: string;
    newTier?: string;
    amount?: number;
    days?: number;
    isPaidSubscription?: boolean;
    hasStripeSubscription?: boolean;
  };
}

export const AdminActionInfoModal = ({
  open,
  onClose,
  onConfirm,
  actionType,
  actionData,
}: AdminActionInfoModalProps) => {
  const getActionInfo = () => {
    switch (actionType) {
      case 'changeTier':
        return {
          title: 'Cambiar Tier de Suscripción',
          icon: <Info className="h-5 w-5 text-blue-500" />,
          description: getChangeTierDescription(),
          warnings: getChangeTierWarnings(),
          effects: getChangeTierEffects(),
        };
      case 'cancel':
        return {
          title: 'Cancelar Suscripción',
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          description: 'Esta acción cancelará la suscripción del usuario.',
          warnings: getCancelWarnings(),
          effects: getCancelEffects(),
        };
      case 'refund':
        return {
          title: 'Procesar Refund',
          icon: <CreditCard className="h-5 w-5 text-orange-500" />,
          description: `Se procesará un refund de ${actionData?.amount || 0}€.`,
          warnings: getRefundWarnings(),
          effects: getRefundEffects(),
        };
      case 'addTrial':
        return {
          title: 'Agregar Período de Prueba',
          icon: <Gift className="h-5 w-5 text-green-500" />,
          description: `Se agregará un período de prueba de ${actionData?.days || 0} días.`,
          warnings: getTrialWarnings(),
          effects: getTrialEffects(),
        };
      case 'deleteUser':
        return {
          title: 'Eliminar Usuario',
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          description: 'Esta acción eliminará el usuario del sistema.',
          warnings: getDeleteWarnings(),
          effects: getDeleteEffects(),
        };
      case 'processRefundRequest':
        return {
          title: 'Procesar Solicitud de Refund',
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          description: 'Se procesará la solicitud de refund del usuario.',
          warnings: getProcessRefundRequestWarnings(),
          effects: getProcessRefundRequestEffects(),
        };
      default:
        return {
          title: 'Acción Administrativa',
          icon: <Info className="h-5 w-5" />,
          description: 'Esta acción realizará cambios en la cuenta del usuario.',
          warnings: [],
          effects: [],
        };
    }
  };

  const getChangeTierDescription = () => {
    const { previousTier, newTier, isPaidSubscription } = actionData || {};
    const tierNames = { free: 'Free', tier_1: 'Pro', tier_2: 'Enterprise' };
    
    if (previousTier && newTier) {
      return `Cambiar suscripción de ${tierNames[previousTier as keyof typeof tierNames]} a ${tierNames[newTier as keyof typeof tierNames]}.`;
    }
    return 'Cambiar el tier de suscripción del usuario.';
  };

  const getChangeTierWarnings = () => {
    const { previousTier, newTier, isPaidSubscription, hasStripeSubscription } = actionData || {};
    const warnings: string[] = [];

    if (isPaidSubscription || hasStripeSubscription) {
      warnings.push('⚠️ Este usuario tiene una suscripción PAGADA en Stripe.');
      warnings.push('⚠️ Al cambiar el tier desde aquí, la suscripción se marcará como GRATUITA (admin-granted).');
      warnings.push('⚠️ El usuario NO será cobrado por este cambio.');
      warnings.push('⚠️ La suscripción de Stripe NO se cancelará automáticamente.');
    } else {
      warnings.push('ℹ️ Esta es una suscripción GRATUITA (admin-granted).');
      warnings.push('ℹ️ El usuario NO será cobrado.');
    }

    if (previousTier && newTier && previousTier !== 'free' && newTier === 'free') {
      warnings.push('⚠️ Al cambiar a Free, se activará un período de gracia de 30 días.');
    }

    return warnings;
  };

  const getChangeTierEffects = () => {
    const { previousTier, newTier } = actionData || {};
    const effects: string[] = [];

    effects.push('✓ El tier de suscripción se actualizará inmediatamente.');
    effects.push('✓ El cambio se registrará en el historial de auditoría.');
    
    if (previousTier && newTier && previousTier !== 'free' && newTier === 'free') {
      effects.push('✓ Se activará un período de gracia de 30 días.');
      effects.push('✓ El usuario tendrá acceso de solo lectura durante el período de gracia.');
    } else if (previousTier && newTier && previousTier === 'free' && newTier !== 'free') {
      effects.push('✓ Se eliminará cualquier período de gracia activo.');
      effects.push('✓ El usuario tendrá acceso completo al nuevo tier.');
    }

    effects.push('✓ NO se creará ninguna factura.');
    effects.push('✓ NO se procesará ningún pago.');

    return effects;
  };

  const getCancelWarnings = () => {
    const { isPaidSubscription, hasStripeSubscription } = actionData || {};
    const warnings: string[] = [];

    if (hasStripeSubscription) {
      warnings.push('⚠️ Este usuario tiene una suscripción activa en Stripe.');
      warnings.push('⚠️ La suscripción se cancelará también en Stripe.');
      warnings.push('⚠️ El usuario NO recibirá reembolso automático.');
    }

    return warnings;
  };

  const getCancelEffects = () => {
    const effects: string[] = [];
    effects.push('✓ La suscripción se cancelará inmediatamente.');
    effects.push('✓ El tier cambiará a Free.');
    effects.push('✓ Se activará un período de gracia de 30 días.');
    effects.push('✓ Si hay suscripción en Stripe, se cancelará también.');
    effects.push('✓ El cambio se registrará en el historial de auditoría.');
    return effects;
  };

  const getRefundWarnings = () => {
    const warnings: string[] = [];
    warnings.push('⚠️ Se creará una factura de refund (negativa).');
    warnings.push('⚠️ Si el usuario tiene suscripción en Stripe, se intentará procesar el refund allí también.');
    return warnings;
  };

  const getRefundEffects = () => {
    const effects: string[] = [];
    effects.push('✓ Se creará una factura de refund con el monto especificado.');
    effects.push('✓ Se actualizará el estado de la factura original a "refunded".');
    effects.push('✓ Se intentará procesar el refund en Stripe (si aplica).');
    effects.push('✓ El cambio se registrará en el historial de auditoría.');
    return effects;
  };

  const getTrialWarnings = () => {
    const warnings: string[] = [];
    warnings.push('ℹ️ Si el usuario está en Free, se actualizará automáticamente a Pro (tier_1).');
    warnings.push('ℹ️ El período de prueba es GRATUITO - no se cobrará nada.');
    return warnings;
  };

  const getTrialEffects = () => {
    const effects: string[] = [];
    effects.push('✓ Se agregará el período de prueba especificado.');
    effects.push('✓ La fecha de expiración se extenderá automáticamente.');
    effects.push('✓ Si el usuario está en Free, se actualizará a Pro.');
    effects.push('✓ NO se creará ninguna factura.');
    effects.push('✓ NO se procesará ningún pago.');
    return effects;
  };

  const getDeleteWarnings = () => {
    const warnings: string[] = [];
    warnings.push('⚠️ Esta acción es IRREVERSIBLE.');
    warnings.push('⚠️ Se realizará un soft delete (el usuario no se eliminará completamente).');
    warnings.push('⚠️ Si el usuario tiene suscripción en Stripe, se cancelará.');
    return warnings;
  };

  const getDeleteEffects = () => {
    const effects: string[] = [];
    effects.push('✓ El usuario será marcado como eliminado (soft delete).');
    effects.push('✓ La suscripción se cancelará.');
    effects.push('✓ Si hay suscripción en Stripe, se cancelará también.');
    effects.push('✓ El cambio se registrará en el historial de auditoría.');
    return effects;
  };

  const getProcessRefundRequestWarnings = () => {
    const warnings: string[] = [];
    warnings.push('⚠️ Si apruebas, se creará una factura de refund.');
    warnings.push('⚠️ Se intentará procesar el refund en Stripe (si aplica).');
    return warnings;
  };

  const getProcessRefundRequestEffects = () => {
    const effects: string[] = [];
    effects.push('✓ El estado de la solicitud se actualizará.');
    effects.push('✓ Si se aprueba, se creará una factura de refund.');
    effects.push('✓ Se intentará procesar el refund en Stripe (si aplica).');
    effects.push('✓ El cambio se registrará en el historial de auditoría.');
    return effects;
  };

  const info = getActionInfo();
  const isPaidSubscription = actionData?.isPaidSubscription || actionData?.hasStripeSubscription;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {info.icon}
            {info.title}
          </DialogTitle>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Suscripción */}
          {actionType === 'changeTier' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              {isPaidSubscription ? (
                <>
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Suscripción PAGADA (Stripe)</span>
                  <Badge variant="outline" className="ml-auto">Cobrado</Badge>
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Suscripción GRATUITA (Admin)</span>
                  <Badge variant="outline" className="ml-auto">Gratis</Badge>
                </>
              )}
            </div>
          )}

          {/* Advertencias */}
          {info.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Advertencias Importantes
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {info.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Efectos */}
          {info.effects.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                ¿Qué pasará?
              </h4>
              <ul className="space-y-1 text-sm">
                {info.effects.map((effect, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5">{effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Información adicional sobre facturas */}
          {actionType === 'changeTier' && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Nota sobre facturas:</strong> Los cambios de tier desde el admin panel son siempre GRATUITOS.
                No se crearán facturas ni se procesarán pagos. Si el usuario necesita una suscripción pagada,
                debe suscribirse a través de la página de Pricing.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

