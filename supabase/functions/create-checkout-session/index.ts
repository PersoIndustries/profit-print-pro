/**
 * Supabase Edge Function: Create Checkout Session
 * 
 * Creates a Stripe Checkout Session for subscription payments.
 * This function runs server-side to keep the Stripe secret key secure.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  tier: 'tier_1' | 'tier_2';
  billingPeriod: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY no está configurada');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body
    const body: RequestBody = await req.json();
    const { userId, tier, billingPeriod, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!userId || !tier || !billingPeriod) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: userId, tier, billingPeriod' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Define prices (in cents)
    // TODO: Move these to environment variables or database
    const prices = {
      tier_1: {
        monthly: 999, // €9.99
        annual: 9990, // €99.90 (€8.33/month)
      },
      tier_2: {
        monthly: 1999, // €19.99
        annual: 19990, // €199.90 (€16.66/month)
      },
    };

    const priceId = prices[tier][billingPeriod];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Precio no encontrado para el tier y período especificados' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: tier === 'tier_1' ? 'Professional Plan' : 'Business Plan',
              description: billingPeriod === 'monthly' 
                ? 'Suscripción mensual' 
                : 'Suscripción anual',
            },
            recurring: {
              interval: billingPeriod === 'monthly' ? 'month' : 'year',
            },
            unit_amount: priceId,
          },
          quantity: 1,
        },
      ],
      customer_email: undefined, // Will be collected in checkout
      metadata: {
        userId,
        tier,
        billingPeriod,
      },
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId,
          tier,
          billingPeriod,
        },
      },
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al crear sesión de checkout' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

