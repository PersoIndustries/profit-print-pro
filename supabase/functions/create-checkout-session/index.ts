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
  productId?: string;
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
    const { userId, tier, billingPeriod, productId, successUrl, cancelUrl } = body;

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

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let stripePriceId: string | null = null;

    // If productId is provided, fetch product from database to get Stripe price ID
    if (productId) {
      const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=stripe_price_id`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const products = await response.json();
        if (products && products.length > 0 && products[0].stripe_price_id) {
          stripePriceId = products[0].stripe_price_id;
        }
      }
    }

    // If no price ID from database, use hardcoded Stripe Price IDs as fallback
    if (!stripePriceId) {
      const stripePriceIds: Record<string, Record<string, string>> = {
        tier_1: {
          monthly: 'price_1SX5bsFseepDQpf7OF82dSCf', // Profesional Monthly
          annual: 'price_1SX5TjFseepDQpf7lETM8Q8r', // Profesional Annual
        },
        tier_2: {
          monthly: 'price_1SX5deFseepDQpf7hkxWwbxF', // Business Monthly
          annual: 'price_1SX5fAFseepDQpf75L9cMtQt', // Business Annual
        },
      };
      stripePriceId = stripePriceIds[tier]?.[billingPeriod] || null;
    }

    // If we have a Stripe Price ID, use it directly (preferred method)
    if (stripePriceId) {
      const lineItem = { price: stripePriceId, quantity: 1 };
      
      // Create Stripe Checkout Session with Price ID
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [lineItem],
        customer_email: undefined,
        metadata: {
          userId,
          tier,
          billingPeriod,
          productId: productId || '',
        },
        success_url: successUrl || `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
        subscription_data: {
          metadata: {
            userId,
            tier,
            billingPeriod,
            productId: productId || '',
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
    }

    // Fallback: Create price_data dynamically (only if no Stripe Price ID available)
    const defaultPrices = {
      tier_1: {
        monthly: 399, // €3.99 Early Bird
        annual: 3830, // €38.30 Early Bird
      },
      tier_2: {
        monthly: 1299, // €12.99 Early Bird
        annual: 12470, // €124.70 Early Bird
      },
    };
    
    const priceAmount = defaultPrices[tier][billingPeriod];
    const productName = tier === 'tier_1' ? 'Professional Plan [Early Bird]' : 'Business Plan [Early Bird]';
    const productDescription = billingPeriod === 'monthly' 
      ? 'Suscripción mensual con descuento Early Bird' 
      : 'Suscripción anual con descuento Early Bird';

    const lineItem = {
      price_data: {
        currency: 'eur',
        product_data: {
          name: productName,
          description: productDescription,
        },
        recurring: {
          interval: billingPeriod === 'monthly' ? 'month' : 'year',
        },
        unit_amount: priceAmount,
      },
      quantity: 1,
    };

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [lineItem],
      customer_email: undefined, // Will be collected in checkout
      metadata: {
        userId,
        tier,
        billingPeriod,
        productId: productId || '',
        productType: product?.product_type || 'early_bird',
      },
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId,
          tier,
          billingPeriod,
          productId: productId || '',
          productType: product?.product_type || 'early_bird',
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

