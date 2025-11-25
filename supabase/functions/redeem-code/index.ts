/**
 * Supabase Edge Function: Redeem Code
 * 
 * Unified function to redeem any type of code (promo codes, creator codes, etc.)
 * This function:
 * - Verifies user authentication
 * - Automatically detects code type
 * - Validates code (exists, active, not expired, not maxed out)
 * - Checks if user already used the code
 * - Applies the code to user's subscription
 * - Tracks usage and logs the change
 * 
 * Future-proof: Easy to add new code types
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  code: string;
}

interface RedeemResult {
  success: boolean;
  message: string;
  codeType?: 'promo' | 'creator';
  tier?: string;
  trial_days?: number;
  discount_percentage?: number;
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
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return new Response(
        JSON.stringify({ error: 'Faltan variables de entorno requeridas', details: 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Decode JWT to get user_id
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

    // Verify user exists
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado o no encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { code } = body;

    if (!code || !code.trim()) {
      return new Response(
        JSON.stringify({ error: 'Falta campo requerido: code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const codeToApply = code.trim().toUpperCase();

    // Try to redeem as promo code first
    let result: RedeemResult | null = await tryRedeemPromoCode(supabaseAdmin, userId, codeToApply, stripeSecretKey);
    
    // If promo code failed, try creator code
    if (!result || !result.success) {
      const creatorResult = await tryRedeemCreatorCode(supabaseAdmin, userId, codeToApply, stripeSecretKey);
      if (creatorResult && creatorResult.success) {
        result = creatorResult;
      }
    }

    // If both failed, return error
    if (!result || !result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result?.message || 'Código no válido. Verifica que el código sea correcto.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error redeeming code:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al canjear código' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Try to redeem a promo code
 */
async function tryRedeemPromoCode(
  supabaseAdmin: any,
  userId: string,
  code: string,
  stripeSecretKey?: string
): Promise<RedeemResult | null> {
  try {
    // Get promo code details
    const { data: promoCode, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('id, code, tier, description, expires_at, max_uses, current_uses, is_active')
      .eq('code', code)
      .maybeSingle();

    if (promoError) {
      console.error('Error fetching promo code:', promoError);
      return null; // Try creator code
    }

    // Validate promo code exists
    if (!promoCode || !promoCode.is_active) {
      return null; // Try creator code
    }

    // Check if expired
    if (promoCode.expires_at) {
      const expiresAt = new Date(promoCode.expires_at);
      if (expiresAt < new Date()) {
        return { success: false, message: 'Código expirado' };
      }
    }

    // Check if max uses reached
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      return { success: false, message: 'Código ya ha alcanzado el límite de usos' };
    }

    // Check if user already used this code
    const { data: existingUsage, error: usageError } = await supabaseAdmin
      .from('user_promo_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('promo_code_id', promoCode.id)
      .maybeSingle();

    if (usageError) {
      console.error('Error checking existing usage:', usageError);
      return null; // Try creator code
    }

    if (existingUsage) {
      return { success: false, message: 'Ya has usado este código' };
    }

    // Get user's current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, tier, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return { success: false, message: 'Error al obtener suscripción del usuario' };
    }

    const previousTier = subscription?.tier || 'free';

    // Cancel Stripe subscription if exists (promo codes are free, so we cancel paid subscriptions)
    let stripeCancelled = false;
    if (stripeSecretKey && subscription?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        stripeCancelled = true;
        console.log('Stripe subscription cancelled:', subscription.stripe_subscription_id);
      } catch (stripeError: any) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with promo code application even if Stripe cancellation fails
      }
    }

    // Update user subscription
    const updateData: any = {
      tier: promoCode.tier,
      status: 'active',
      expires_at: null, // Permanent subscription
      updated_at: new Date().toISOString(),
    };

    // Clear Stripe IDs if subscription was cancelled
    if (stripeCancelled) {
      updateData.stripe_subscription_id = null;
      updateData.stripe_customer_id = null;
      updateData.billing_period = null;
      updateData.next_billing_date = null;
      updateData.last_payment_date = null;
      updateData.price_paid = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { success: false, message: 'Error al aplicar código promocional' };
    }

    // Track promo code usage
    const { error: trackError } = await supabaseAdmin
      .from('user_promo_codes')
      .insert({
        user_id: userId,
        promo_code_id: promoCode.id,
        tier_granted: promoCode.tier,
      });

    if (trackError) {
      console.error('Error tracking promo code usage:', trackError);
    }

    // Increment current uses
    const { error: incrementError } = await supabaseAdmin
      .from('promo_codes')
      .update({ current_uses: promoCode.current_uses + 1 })
      .eq('id', promoCode.id);

    if (incrementError) {
      console.error('Error incrementing promo code uses:', incrementError);
    }

    // Log the change
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: userId,
        change_type: 'promo_code_applied',
        previous_tier: previousTier,
        new_tier: promoCode.tier,
        reason: `Código promocional aplicado: ${code}`,
        notes: `${promoCode.description || ''} | Stripe cancelled: ${stripeCancelled}`.trim(),
      });

    if (logError) {
      console.error('Error logging subscription change:', logError);
    }

    return {
      success: true,
      message: 'Código aplicado exitosamente',
      codeType: 'promo',
      tier: promoCode.tier,
    };
  } catch (error) {
    console.error('Error in tryRedeemPromoCode:', error);
    return null; // Try creator code
  }
}

/**
 * Try to redeem a creator code
 */
async function tryRedeemCreatorCode(
  supabaseAdmin: any,
  userId: string,
  code: string,
  stripeSecretKey?: string
): Promise<RedeemResult | null> {
  try {
    // Get creator code details
    const { data: creatorCode, error: creatorError } = await supabaseAdmin
      .from('creator_codes')
      .select('id, code, tier_granted, description, expires_at, max_uses, current_uses, is_active, trial_days, discount_percentage, creator_commission_percentage')
      .eq('code', code)
      .maybeSingle();

    if (creatorError) {
      console.error('Error fetching creator code:', creatorError);
      return null;
    }

    // Validate creator code exists
    if (!creatorCode || !creatorCode.is_active) {
      return null;
    }

    // Check if expired
    if (creatorCode.expires_at) {
      const expiresAt = new Date(creatorCode.expires_at);
      if (expiresAt < new Date()) {
        return { success: false, message: 'Código expirado' };
      }
    }

    // Check if max uses reached
    if (creatorCode.max_uses !== null && creatorCode.current_uses >= creatorCode.max_uses) {
      return { success: false, message: 'Código ya ha alcanzado el límite de usos' };
    }

    // Check if user already used this code
    const { data: existingUsage, error: usageError } = await supabaseAdmin
      .from('creator_code_uses')
      .select('id')
      .eq('user_id', userId)
      .eq('creator_code_id', creatorCode.id)
      .maybeSingle();

    if (usageError) {
      console.error('Error checking existing usage:', usageError);
      return null;
    }

    if (existingUsage) {
      return { success: false, message: 'Ya has usado este código' };
    }

    // Get user's current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, tier, expires_at, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return { success: false, message: 'Error al obtener suscripción del usuario' };
    }

    const previousTier = subscription?.tier || 'free';

    // Cancel Stripe subscription if exists (creator codes may provide free trials, so we cancel paid subscriptions)
    let stripeCancelled = false;
    if (stripeSecretKey && subscription?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        stripeCancelled = true;
        console.log('Stripe subscription cancelled:', subscription.stripe_subscription_id);
      } catch (stripeError: any) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with creator code application even if Stripe cancellation fails
      }
    }

    // Calculate new expiration date (add trial days)
    let newExpiresAt: string | null = null;
    if (creatorCode.trial_days > 0) {
      const now = new Date();
      if (subscription?.expires_at) {
        const currentExpires = new Date(subscription.expires_at);
        if (currentExpires > now) {
          // Extend existing subscription
          newExpiresAt = new Date(currentExpires.getTime() + creatorCode.trial_days * 24 * 60 * 60 * 1000).toISOString();
        } else {
          // Start new trial
          newExpiresAt = new Date(now.getTime() + creatorCode.trial_days * 24 * 60 * 60 * 1000).toISOString();
        }
      } else {
        // Start new trial
        newExpiresAt = new Date(now.getTime() + creatorCode.trial_days * 24 * 60 * 60 * 1000).toISOString();
      }
    } else {
      newExpiresAt = subscription?.expires_at || null;
    }

    // Determine new tier (upgrade if creator code tier is higher)
    let newTier = previousTier;
    if (creatorCode.tier_granted === 'tier_2') {
      newTier = 'tier_2';
    } else if (creatorCode.tier_granted === 'tier_1' && (previousTier === 'free' || !previousTier)) {
      newTier = 'tier_1';
    }

    // Update or create user subscription
    const updateData: any = {
      tier: newTier,
      status: creatorCode.trial_days > 0 ? 'trial' : 'active',
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    };

    // Clear Stripe IDs if subscription was cancelled
    if (stripeCancelled) {
      updateData.stripe_subscription_id = null;
      updateData.stripe_customer_id = null;
      updateData.billing_period = null;
      updateData.next_billing_date = null;
      updateData.last_payment_date = null;
      updateData.price_paid = null;
    }

    if (subscription?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return { success: false, message: 'Error al aplicar código de creador' };
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          ...updateData,
        });

      if (insertError) {
        console.error('Error creating subscription:', insertError);
        return { success: false, message: 'Error al aplicar código de creador' };
      }
    }

    // Track creator code usage
    const { error: trackError } = await supabaseAdmin
      .from('creator_code_uses')
      .insert({
        creator_code_id: creatorCode.id,
        user_id: userId,
        trial_days_granted: creatorCode.trial_days,
        tier_granted: newTier,
        discount_percentage: creatorCode.discount_percentage,
        creator_commission_percentage: creatorCode.creator_commission_percentage,
      });

    if (trackError) {
      console.error('Error tracking creator code usage:', trackError);
    }

    // Increment current uses
    const { error: incrementError } = await supabaseAdmin
      .from('creator_codes')
      .update({ current_uses: creatorCode.current_uses + 1 })
      .eq('id', creatorCode.id);

    if (incrementError) {
      console.error('Error incrementing creator code uses:', incrementError);
    }

    // Log the change
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: userId,
        change_type: 'promo_code_applied',
        previous_tier: previousTier,
        new_tier: newTier,
        reason: `Código de creador aplicado: ${code}`,
        notes: `${creatorCode.description || ''} | Trial: ${creatorCode.trial_days} días | Descuento: ${creatorCode.discount_percentage}% | Stripe cancelled: ${stripeCancelled}`.trim(),
      });

    if (logError) {
      console.error('Error logging subscription change:', logError);
    }

    let message = 'Código de creador aplicado exitosamente';
    if (creatorCode.trial_days > 0) {
      message += `. Trial de ${creatorCode.trial_days} días activado.`;
    }
    if (creatorCode.discount_percentage > 0) {
      message += ` Descuento del ${creatorCode.discount_percentage}% aplicado.`;
    }

    return {
      success: true,
      message,
      codeType: 'creator',
      tier: newTier,
      trial_days: creatorCode.trial_days,
      discount_percentage: creatorCode.discount_percentage,
    };
  } catch (error) {
    console.error('Error in tryRedeemCreatorCode:', error);
    return null;
  }
}

