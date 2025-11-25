/**
 * Supabase Edge Function: Admin Cancel Subscription
 * 
 * Allows admins to cancel a user's subscription.
 * This function:
 * - Verifies admin permissions
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
  userId: string;
  notes?: string;
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

    // Clean auth header (remove 'Bearer ' prefix if present)
    const cleanAuthToken = authHeader.replace(/^Bearer\s+/i, '');

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Decode JWT to get user_id (JWT format: header.payload.signature)
    let userId: string | null = null;
    try {
      const parts = cleanAuthToken.split('.');
      if (parts.length === 3) {
        // Decode the payload (second part)
        const payload = JSON.parse(
          new TextDecoder().decode(
            Uint8Array.from(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
                .split('')
                .map(c => c.charCodeAt(0))
            )
          )
        );
        userId = payload.sub || payload.user_id || null;
        console.log('Decoded JWT payload:', { 
          userId, 
          email: payload.email,
          exp: payload.exp,
          isExpired: payload.exp ? Date.now() / 1000 > payload.exp : false
        });
      }
    } catch (decodeError) {
      console.error('Error decoding JWT:', decodeError);
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'No se pudo decodificar el token de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists and get user data using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado o no encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { userId, notes, cancelInStripe = false, immediate = true } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Falta campo requerido: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, status, stripe_subscription_id, expires_at')
      .eq('user_id', userId)
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
        JSON.stringify({ error: 'Usuario no tiene suscripción activa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousTier = (subscription.tier || 'free') as 'free' | 'tier_1' | 'tier_2';

    // Cancel in Stripe if requested and subscription exists
    let stripeCancelled = false;
    if (cancelInStripe && stripeSecretKey && subscription.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        if (immediate) {
          // Cancel immediately
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        } else {
          // Cancel at period end
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        }

        stripeCancelled = true;
      } catch (stripeError: any) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with database cancellation even if Stripe fails
      }
    }

    // Set grace period if downgrading from paid to free
    const now = new Date();
    let gracePeriodEnd = null;
    let downgradeDate = null;

    if (previousTier !== 'free') {
      // Set 30-day grace period
      gracePeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      downgradeDate = now.toISOString();
    }

    // Update subscription
    const updateData: any = {
      status: 'cancelled',
      tier: 'free',
      previous_tier: previousTier,
      downgrade_date: downgradeDate,
      grace_period_end: gracePeriodEnd,
      is_read_only: previousTier !== 'free' ? true : false,
    };

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId);

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
        user_id: userId,
        admin_id: user.id,
        previous_tier: previousTier,
        new_tier: 'free',
        change_type: 'cancel',
        reason: 'Admin cancelled subscription',
        notes: notes || null,
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

