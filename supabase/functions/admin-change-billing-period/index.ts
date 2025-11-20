/**
 * Supabase Edge Function: Admin Change Billing Period
 * 
 * Allows admins to change a user's subscription billing period (monthly ↔ annual).
 * 
 * For PAID subscriptions (Stripe):
 * - Updates the subscription in Stripe
 * - Stripe handles proration automatically
 * - Updates billing period in database
 * 
 * For FREE subscriptions (admin-granted):
 * - Only updates billing period in database
 * - No Stripe interaction needed
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
  newBillingPeriod: 'monthly' | 'annual';
  notes?: string;
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user token
    const supabaseUser = createClient(supabaseUrl, authHeader.replace('Bearer ', ''), {
      global: { headers: { Authorization: authHeader } },
    });

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const { userId, newBillingPeriod, notes } = body;

    if (!userId || !newBillingPeriod) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: userId, newBillingPeriod' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate billing period
    if (!['monthly', 'annual'].includes(newBillingPeriod)) {
      return new Response(
        JSON.stringify({ error: 'Billing period inválido. Debe ser "monthly" o "annual"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, billing_period, is_paid_subscription, stripe_subscription_id, stripe_customer_id, expires_at, next_billing_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener suscripción actual' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!currentSub) {
      return new Response(
        JSON.stringify({ error: 'Usuario no tiene suscripción activa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousBillingPeriod = currentSub.billing_period as 'monthly' | 'annual' | null;
    const isPaidSubscription = currentSub.is_paid_subscription || false;
    const stripeSubscriptionId = currentSub.stripe_subscription_id;

    // Check if it's the same billing period
    if (previousBillingPeriod === newBillingPeriod) {
      return new Response(
        JSON.stringify({ error: `La suscripción ya está configurada como ${newBillingPeriod}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If it's a paid subscription, update in Stripe
    let stripeUpdated = false;
    let prorationAmount = 0;
    
    if (isPaidSubscription && stripeSubscriptionId && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        // Get current subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        // Get the new price ID based on tier and billing period
        const prices = {
          tier_1: {
            monthly: 999, // €9.99 in cents
            annual: 9990, // €99.90 in cents
          },
          tier_2: {
            monthly: 1999, // €19.99 in cents
            annual: 19990, // €199.90 in cents
          },
        };

        const tier = currentSub.tier as 'tier_1' | 'tier_2';
        const newPriceAmount = prices[tier]?.[newBillingPeriod];

        if (!newPriceAmount) {
          return new Response(
            JSON.stringify({ error: `No se encontró precio para tier ${tier} y período ${newBillingPeriod}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new price data for Stripe
        const priceData = {
          currency: 'eur',
          product_data: {
            name: tier === 'tier_1' ? 'Professional Plan' : 'Business Plan',
            description: newBillingPeriod === 'monthly' ? 'Suscripción mensual' : 'Suscripción anual',
          },
          recurring: {
            interval: newBillingPeriod === 'monthly' ? 'month' : 'year',
          },
          unit_amount: newPriceAmount,
        };

        // Create new price in Stripe
        const newPrice = await stripe.prices.create(priceData);

        // Update subscription in Stripe with proration
        // Stripe will automatically calculate proration and charge/credit the difference
        const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price: newPrice.id,
          }],
          proration_behavior: 'always_invoice', // Always create invoice for proration
          metadata: {
            userId,
            tier,
            billingPeriod: newBillingPeriod,
            changedBy: 'admin',
            adminId: user.id,
          },
        });

        stripeUpdated = true;
        
        // Calculate proration amount (approximate)
        const currentPrice = stripeSubscription.items.data[0].price.unit_amount || 0;
        const daysRemaining = Math.ceil((stripeSubscription.current_period_end - Date.now() / 1000) / 86400);
        const totalDays = stripeSubscription.current_period_end - stripeSubscription.current_period_start;
        const prorationRatio = daysRemaining / totalDays;
        
        // Approximate proration (Stripe calculates this more precisely)
        prorationAmount = Math.round((newPriceAmount - currentPrice) * prorationRatio) / 100;

        // Update next billing date
        const nextBillingDate = new Date(updatedSubscription.current_period_end * 1000).toISOString();
        const expiresAt = new Date(updatedSubscription.current_period_end * 1000).toISOString();

        // Update subscription in database
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            billing_period: newBillingPeriod,
            next_billing_date: nextBillingDate,
            expires_at: expiresAt,
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating subscription in database:', updateError);
          // Don't fail - Stripe is already updated
        }

        // Log the change
        await supabaseAdmin
          .from('subscription_changes')
          .insert({
            user_id: userId,
            admin_id: user.id,
            previous_tier: tier,
            new_tier: tier,
            change_type: 'upgrade', // Using upgrade as change type
            reason: `Billing period changed from ${previousBillingPeriod} to ${newBillingPeriod}`,
            notes: notes || `Stripe subscription updated. Proration: ~${prorationAmount.toFixed(2)}€`,
          });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Período de facturación actualizado de ${previousBillingPeriod} a ${newBillingPeriod}`,
            previousBillingPeriod,
            newBillingPeriod,
            stripeUpdated: true,
            prorationAmount: prorationAmount.toFixed(2),
            note: 'Stripe calculará el prorrateo exacto y lo aplicará en la próxima factura',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (stripeError: any) {
        console.error('Error updating Stripe subscription:', stripeError);
        return new Response(
          JSON.stringify({ 
            error: `Error al actualizar suscripción en Stripe: ${stripeError.message}`,
            details: 'La suscripción en Stripe no pudo ser actualizada. Verifica que la suscripción existe y está activa.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Free subscription - just update in database
      const now = new Date();
      const expiresAt = newBillingPeriod === 'monthly'
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          billing_period: newBillingPeriod,
          expires_at: expiresAt.toISOString(),
          next_billing_date: expiresAt.toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar suscripción' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the change
      await supabaseAdmin
        .from('subscription_changes')
        .insert({
          user_id: userId,
          admin_id: user.id,
          previous_tier: currentSub.tier as 'free' | 'tier_1' | 'tier_2',
          new_tier: currentSub.tier as 'free' | 'tier_1' | 'tier_2',
          change_type: 'upgrade',
          reason: `Billing period changed from ${previousBillingPeriod} to ${newBillingPeriod} (free subscription)`,
          notes: notes || null,
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Período de facturación actualizado de ${previousBillingPeriod} a ${newBillingPeriod}`,
          previousBillingPeriod,
          newBillingPeriod,
          stripeUpdated: false,
          note: 'Esta es una suscripción gratuita (admin-granted), no se requiere actualización en Stripe',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error changing billing period:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al cambiar período de facturación' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

