/**
 * Supabase Edge Function: Cancel Subscription
 * 
 * Allows users to cancel their own subscription.
 * This function:
 * - Verifies user authentication
 * - Cancels subscription in database
 * - Optionally cancels subscription in Stripe
 * - Handles grace period
 * - Logs the change for audit
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  cancelInStripe?: boolean; // If true, will also cancel in Stripe
  immediate?: boolean; // If true, cancels immediately; if false, at period end
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('EXTERNAL_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan variables de entorno requeridas');
    }

    // Get auth token from request
    let authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      authHeader = req.headers.get('authorization');
    }
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify authentication
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY no está configurada');
    }
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { cancelInStripe = true, immediate = false } = body;

    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, status, stripe_subscription_id, expires_at, next_billing_date, billing_period')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener suscripción' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'No tienes suscripción activa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscription is already cancelled
    if (subscription.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'La suscripción ya está cancelada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousTier = (subscription.tier || 'free') as 'free' | 'tier_1' | 'tier_2';

    // Cancel in Stripe if requested and subscription exists
    let stripeCancelled = false;
    let expirationDate: string | null = null;
    
    if (cancelInStripe && stripeSecretKey && subscription.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        if (immediate) {
          // Cancel immediately - get current period end from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          expirationDate = new Date(stripeSub.current_period_end * 1000).toISOString();
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        } else {
          // Cancel at period end - get period end from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          expirationDate = new Date(stripeSub.current_period_end * 1000).toISOString();
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        }

        stripeCancelled = true;
      } catch (stripeError: any) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with database cancellation even if Stripe fails
        // Calculate expiration date from next_billing_date or billing_period
        if (subscription.next_billing_date) {
          expirationDate = subscription.next_billing_date;
        } else if (subscription.billing_period) {
          const now = new Date();
          const daysToAdd = subscription.billing_period === 'monthly' ? 30 : 365;
          expirationDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
        }
      }
    } else {
      // No Stripe subscription - calculate expiration from next_billing_date or billing_period
      if (subscription.next_billing_date) {
        expirationDate = subscription.next_billing_date;
      } else if (subscription.billing_period) {
        const now = new Date();
        const daysToAdd = subscription.billing_period === 'monthly' ? 30 : 365;
        expirationDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      } else {
        // Fallback: use current expires_at or 30 days from now
        expirationDate = subscription.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Set grace period if downgrading from paid to free
    const now = new Date();
    let gracePeriodEnd = null;
    let downgradeDate = null;

    if (previousTier !== 'free') {
      // Set 30-day grace period after expiration
      if (expirationDate) {
        const expDate = new Date(expirationDate);
        gracePeriodEnd = new Date(expDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        gracePeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      downgradeDate = now.toISOString();
    }

    // Update subscription
    // IMPORTANT: When immediate=false, keep the tier until expiration
    const updateData: any = {
      status: 'cancelled',
      // Only change tier to free if immediate cancellation
      tier: immediate ? 'free' : previousTier,
      previous_tier: previousTier,
      downgrade_date: downgradeDate,
      grace_period_end: gracePeriodEnd,
      is_read_only: previousTier !== 'free' ? true : false,
    };

    // Update expiration date if we calculated one
    if (expirationDate) {
      updateData.expires_at = expirationDate;
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al cancelar suscripción' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the change
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: user.id,
        previous_tier: previousTier,
        new_tier: immediate ? 'free' : previousTier, // Only change tier if immediate
        change_type: 'cancel',
        reason: 'Usuario canceló suscripción',
        notes: immediate 
          ? 'Cancelación inmediata' 
          : `Cancelación al final del período (${expirationDate ? new Date(expirationDate).toLocaleDateString() : 'N/A'})`,
      });

    if (logError) {
      console.error('Error logging change:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Suscripción cancelada exitosamente',
        previousTier,
        gracePeriodEnd,
        stripeCancelled,
        expirationDate, // Return expiration date for UI display
        immediate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al cancelar suscripción' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

