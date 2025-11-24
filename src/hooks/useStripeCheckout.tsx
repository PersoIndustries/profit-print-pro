import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CreateCheckoutParams {
  tier: 'tier_1' | 'tier_2';
  billingPeriod: 'monthly' | 'annual';
  productId?: string;
}

export const useStripeCheckout = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const createCheckoutSession = async ({ tier, billingPeriod }: CreateCheckoutParams) => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte');
      return;
    }

    setLoading(true);
    try {
      // Get current origin for success/cancel URLs
      const origin = window.location.origin;
      const successUrl = `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/pricing?canceled=true`;

      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId: user.id,
          tier,
          billingPeriod,
          productId,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('No se recibió URL de checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Error al crear sesión de pago. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  return {
    createCheckoutSession,
    loading,
  };
};

