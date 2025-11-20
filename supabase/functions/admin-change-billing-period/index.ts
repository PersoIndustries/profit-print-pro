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

        // Calculate time used and remaining
        const now = Math.floor(Date.now() / 1000);
        const periodStart = stripeSubscription.current_period_start;
        const periodEnd = stripeSubscription.current_period_end;
        const totalPeriodSeconds = periodEnd - periodStart;
        const usedSeconds = now - periodStart;
        const remainingSeconds = periodEnd - now;
        const usedRatio = usedSeconds / totalPeriodSeconds;
        const remainingRatio = remainingSeconds / totalPeriodSeconds;

        const currentPrice = stripeSubscription.items.data[0].price.unit_amount || 0;
        const currentPriceEur = currentPrice / 100;
        const newPriceEur = newPriceAmount / 100;

        let refundAmount = 0;
        let nextBillingDate: Date;
        let expiresAt: Date;
        let newSubscription: Stripe.Subscription | null = null; // Para logging

        if (previousBillingPeriod === 'annual' && newBillingPeriod === 'monthly') {
          // Cambiar de ANUAL a MENSUAL
          // Estrategia: Cancelar anual, hacer refund del tiempo no usado (menos 1 mes), crear mensual
          
          // Calcular cuántos meses ha usado (redondeado hacia arriba)
          const monthsUsed = Math.ceil((usedSeconds / (30 * 24 * 60 * 60))); // Aproximado
          const totalMonths = 12;
          const monthsRemaining = totalMonths - monthsUsed;
          
          // Refund del tiempo no usado, pero mantener al menos 1 mes pagado
          // Si le quedan más de 1 mes, refund de (meses restantes - 1)
          const monthsToRefund = Math.max(0, monthsRemaining - 1);
          const monthlyPrice = currentPriceEur / 12; // Precio mensual del plan anual
          refundAmount = monthsToRefund * monthlyPrice;

          // Cancelar la suscripción anual actual
          await stripe.subscriptions.cancel(stripeSubscriptionId);

          // Procesar refund si hay monto a reembolsar
          if (refundAmount > 0) {
            try {
              // Buscar el último invoice pagado de esta suscripción
              const invoices = await stripe.invoices.list({
                subscription: stripeSubscriptionId,
                status: 'paid',
                limit: 5,
              });

              // Buscar el invoice más reciente que tenga un charge
              let chargeToRefund: string | null = null;
              for (const invoice of invoices.data) {
                if (invoice.charge && typeof invoice.charge === 'string') {
                  chargeToRefund = invoice.charge;
                  break;
                }
              }

              if (chargeToRefund) {
                // Crear refund parcial del charge
                const refund = await stripe.refunds.create({
                  amount: Math.round(refundAmount * 100), // Convertir a cents
                  charge: chargeToRefund,
                  metadata: {
                    userId,
                    reason: 'Billing period change: annual to monthly',
                    monthsRefunded: monthsToRefund.toString(),
                    originalSubscription: stripeSubscriptionId,
                  },
                });
                console.log(`Refund created: ${refund.id}, amount: ${refundAmount.toFixed(2)}€`);
              } else {
                console.warn('No se encontró charge para procesar el refund');
              }
            } catch (refundError: any) {
              console.error('Error creating refund:', refundError);
              // No fallar si el refund falla, continuar con el cambio
              // El admin puede procesar el refund manualmente si es necesario
            }
          }

          // IMPORTANTE: Crear nueva suscripción ANTES de cancelar la antigua
          // Esto previene que el usuario quede sin suscripción activa
          const customerId = stripeSubscription.customer as string;
          newSubscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: newPrice.id }],
            // billing_cycle_anchor: Próximo billing en 30 días desde ahora
            billing_cycle_anchor: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            // El usuario tiene acceso inmediato (trial de 30 días efectivamente)
            trial_period_days: 0, // No usar trial, solo diferir el billing
            metadata: {
              userId, // ✅ CRÍTICO: Siempre incluir userId para webhooks
              tier,
              billingPeriod: newBillingPeriod,
              changedBy: 'admin', // Flag para webhooks
              adminId: user.id,
              previousSubscription: stripeSubscriptionId,
              note: 'Changed from annual to monthly, refund processed',
            },
          });

          // Actualizar fechas
          nextBillingDate = new Date((Date.now() + 30 * 24 * 60 * 60 * 1000));
          expiresAt = new Date((Date.now() + 30 * 24 * 60 * 60 * 1000));

          // ✅ ACTUALIZAR BD INMEDIATAMENTE con nueva suscripción
          // Esto previene que webhooks de cancelación sobrescriban la nueva suscripción
          await supabaseAdmin
            .from('user_subscriptions')
            .update({
              stripe_subscription_id: newSubscription.id,
              billing_period: newBillingPeriod,
              next_billing_date: nextBillingDate.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .eq('user_id', userId);

          // AHORA cancelar la suscripción antigua
          // Usar cancel_at_period_end para evitar interrupciones
          await stripe.subscriptions.update(stripeSubscriptionId, {
            cancel_at_period_end: true, // Cancelar al final del período (más seguro)
          });

          stripeUpdated = true;

        } else if (previousBillingPeriod === 'monthly' && newBillingPeriod === 'annual') {
          // Cambiar de MENSUAL a ANUAL
          // Estrategia: Actualizar plan con proration, usuario paga diferencia
          
          const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
            items: [{
              id: stripeSubscription.items.data[0].id,
              price: newPrice.id,
            }],
            proration_behavior: 'always_invoice', // Usuario paga la diferencia prorrateada
            billing_cycle_anchor: 'now', // Comenzar período anual desde ahora
            metadata: {
              userId,
              tier,
              billingPeriod: newBillingPeriod,
              changedBy: 'admin',
              adminId: user.id,
            },
          });

          // Calcular proration (usuario paga diferencia)
          const monthlyPrice = currentPriceEur;
          const daysUsed = Math.ceil(usedSeconds / 86400);
          const totalDays = Math.ceil(totalPeriodSeconds / 86400);
          const usedValue = (daysUsed / totalDays) * monthlyPrice;
          const remainingValue = (remainingSeconds / totalPeriodSeconds) * monthlyPrice;
          
          // El usuario paga: precio anual - valor usado del mes actual
          prorationAmount = newPriceEur - usedValue;

          nextBillingDate = new Date(updatedSubscription.current_period_end * 1000);
          expiresAt = new Date(updatedSubscription.current_period_end * 1000);
          stripeUpdated = true;

        } else {
          // Mismo período (no debería pasar, pero por si acaso)
          return new Response(
            JSON.stringify({ error: 'El período de facturación es el mismo' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update subscription in database
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            billing_period: newBillingPeriod,
            next_billing_date: nextBillingDate.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating subscription in database:', updateError);
          // Don't fail - Stripe is already updated
        }

        // Log the change with detailed information
        const logData: any = {
          previousBillingPeriod,
          newBillingPeriod,
          stripeUpdated: true,
          adminNotes: notes || null,
        };

        if (previousBillingPeriod === 'annual' && newBillingPeriod === 'monthly') {
          logData.refundAmount = refundAmount.toFixed(2);
          logData.oldSubscriptionId = stripeSubscriptionId;
          logData.newSubscriptionId = newSubscription?.id;
        } else if (previousBillingPeriod === 'monthly' && newBillingPeriod === 'annual') {
          logData.prorationAmount = prorationAmount.toFixed(2);
        }

        await supabaseAdmin
          .from('subscription_changes')
          .insert({
            user_id: userId,
            admin_id: user.id,
            previous_tier: tier,
            new_tier: tier,
            change_type: 'billing_period_change',
            reason: `Billing period changed from ${previousBillingPeriod} to ${newBillingPeriod}`,
            notes: JSON.stringify(logData),
          });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Período de facturación actualizado de ${previousBillingPeriod} a ${newBillingPeriod}`,
            previousBillingPeriod,
            newBillingPeriod,
            stripeUpdated: true,
            refundAmount: previousBillingPeriod === 'annual' && newBillingPeriod === 'monthly' ? refundAmount.toFixed(2) : undefined,
            prorationAmount: previousBillingPeriod === 'monthly' && newBillingPeriod === 'annual' ? prorationAmount.toFixed(2) : undefined,
            note: previousBillingPeriod === 'annual' && newBillingPeriod === 'monthly' 
              ? `Refund procesado: ${refundAmount.toFixed(2)}€. Nueva suscripción mensual activa. Próximo pago en 30 días.`
              : `Usuario pagará ${prorationAmount.toFixed(2)}€ por la diferencia prorrateada. Nuevo período anual activo.`,
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

