/**
 * Supabase Edge Function: Handle Stripe Webhook
 * 
 * Processes Stripe webhook events and updates the database accordingly.
 * This handles:
 * - checkout.session.completed (new subscription)
 * - invoice.payment_succeeded (recurring payment)
 * - invoice.payment_failed (failed payment)
 * - customer.subscription.updated (subscription changes)
 * - customer.subscription.deleted (subscription cancelled)
 * - charge.refunded (refund processed)
 * - refund.created (refund created)
 * - refund.updated (refund updated)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('EXTERNAL_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan variables de entorno requeridas');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the signature from the request headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No se encontró la firma de Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(supabase, charge);
        break;
      }

      case 'refund.created': {
        const refund = event.data.object as Stripe.Refund;
        await handleRefundCreated(supabase, refund);
        break;
      }

      case 'refund.updated': {
        const refund = event.data.object as Stripe.Refund;
        await handleRefundUpdated(supabase, refund);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al procesar webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handler functions
async function handleCheckoutCompleted(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as 'tier_1' | 'tier_2';
  const billingPeriod = session.metadata?.billingPeriod as 'monthly' | 'annual';

  if (!userId || !tier || !billingPeriod) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get subscription from Stripe
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('No subscription ID in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;

  // Calculate expiration date
  const now = new Date();
  const expiresAt = billingPeriod === 'monthly' 
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  // Update or create user subscription
  // IMPORTANT: Subscriptions from Stripe are PAID subscriptions
  const { error: subError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      tier,
      status: 'active',
      billing_period: billingPeriod,
      expires_at: expiresAt.toISOString(),
      last_payment_date: new Date().toISOString(),
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
      // Mark as paid subscription (from Stripe)
      is_paid_subscription: true,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
    }, {
      onConflict: 'user_id',
    });

  if (subError) {
    console.error('Error updating subscription:', subError);
    return;
  }

  // Create invoice record
  // Note: session.invoice might not be available immediately, so we use session.amount_total
  const invoiceId = session.invoice as string;
  let invoiceAmount = 0;
  let invoiceCurrency = 'EUR';
  let invoiceNumber = `INV-${Date.now()}`;
  let invoiceCreated = Date.now();

  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      invoiceAmount = (invoice.amount_paid || 0) / 100;
      invoiceCurrency = invoice.currency.toUpperCase();
      invoiceNumber = invoice.number || invoiceNumber;
      invoiceCreated = invoice.created * 1000;
    } catch (invoiceError) {
      console.warn('Could not retrieve invoice, using session data:', invoiceError);
      // Fallback to session data
      invoiceAmount = (session.amount_total || 0) / 100;
      invoiceCurrency = (session.currency || 'eur').toUpperCase();
    }
  } else {
    // Use session data if invoice not available
    invoiceAmount = (session.amount_total || 0) / 100;
    invoiceCurrency = (session.currency || 'eur').toUpperCase();
  }

  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: invoiceNumber,
      amount: invoiceAmount,
      currency: invoiceCurrency,
      status: 'paid',
      billing_period: billingPeriod,
      tier,
      issued_date: new Date(invoiceCreated).toISOString(),
      paid_date: new Date().toISOString(),
      notes: `Stripe Checkout Session: ${session.id}${invoiceId ? `. Invoice: ${invoiceId}` : ''}`,
    });

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError);
  }

  console.log(`Checkout completed for user ${userId}, tier ${tier}`);
}

async function handleInvoicePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Get subscription metadata to find user
  // Note: In a real implementation, you might want to store Stripe customer ID in user profile
  const metadata = invoice.metadata;
  const userId = metadata?.userId;

  if (!userId) {
    console.error('No userId in invoice metadata');
    return;
  }

  // Create invoice record
  const { error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: invoice.number || `INV-${Date.now()}`,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'paid',
      billing_period: invoice.billing_reason === 'subscription_cycle' ? 'monthly' : 'one_time',
      tier: metadata?.tier || null,
      issued_date: new Date(invoice.created * 1000).toISOString(),
      paid_date: new Date().toISOString(),
      notes: `Stripe Invoice: ${invoice.id}`,
    });

  if (error) {
    console.error('Error creating invoice:', error);
  }

  // Update subscription last_payment_date
  await supabase
    .from('user_subscriptions')
    .update({
      last_payment_date: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handleInvoicePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const metadata = invoice.metadata;
  const userId = metadata?.userId;

  if (!userId) return;

  // Update invoice status to failed
  await supabase
    .from('invoices')
    .update({ status: 'failed' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;
  const userId = metadata?.userId;

  if (!userId) return;

  // Update subscription status and dates
  await supabase
    .from('user_subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : 'cancelled',
      expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', userId);
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;
  let userId = metadata?.userId;

  // Si no está en metadata, buscar en la base de datos por stripe_subscription_id
  if (!userId) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    userId = sub?.user_id;
  }

  if (!userId) {
    console.warn(`No userId found for deleted subscription ${subscription.id}`);
    return;
  }

  // VERIFICAR: Si hay una nueva suscripción activa, NO cancelar
  // Esto previene que webhooks de cancelación sobrescriban nuevas suscripciones
  // (por ejemplo, cuando se cambia de anual a mensual)
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('stripe_subscription_id, status, tier')
    .eq('user_id', userId)
    .single();

  // Si la suscripción actual tiene un ID diferente, significa que ya se creó una nueva
  if (currentSub?.stripe_subscription_id && 
      currentSub.stripe_subscription_id !== subscription.id &&
      currentSub.status === 'active') {
    console.log(`⚠️ Subscription ${subscription.id} was cancelled, but user ${userId} already has new active subscription ${currentSub.stripe_subscription_id}. Skipping cancellation.`);
    return; // No hacer nada, la nueva suscripción ya está activa
  }

  // Solo cancelar si realmente no hay suscripción activa
  console.log(`Cancelling subscription for user ${userId} (subscription ${subscription.id} was deleted in Stripe)`);
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      tier: 'free',
    })
    .eq('user_id', userId);
}

async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
  // Find invoice by charge ID or payment intent
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) {
    console.error('No payment intent ID in charge');
    return;
  }

  // Try to find invoice by metadata or by searching invoices
  // Note: This is a simplified approach. In production, you might want to store
  // the Stripe charge ID or payment intent ID in your invoices table
  const metadata = charge.metadata;
  const userId = metadata?.userId;

  if (!userId) {
    console.error('No userId in charge metadata');
    return;
  }

  // Update the most recent invoice for this user to refunded status
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('id, amount')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .order('paid_date', { ascending: false })
    .limit(1);

  if (fetchError || !invoices || invoices.length === 0) {
    console.error('Error fetching invoice for refund:', fetchError);
    return;
  }

  const invoice = invoices[0];
  const refundAmount = (charge.amount_refunded || 0) / 100; // Convert from cents

  // Update original invoice status
  await supabase
    .from('invoices')
    .update({
      status: 'refunded',
      notes: `Stripe Refund: ${charge.id}. Original charge: ${charge.id}`,
    })
    .eq('id', invoice.id);

  // Create a refund invoice (negative amount) for accounting purposes
  const { error: refundInvoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: `REF-${Date.now()}`,
      amount: -refundAmount, // Negative amount for refund
      currency: charge.currency.toUpperCase(),
      status: 'refunded',
      billing_period: invoice.billing_period || null,
      tier: invoice.tier || null,
      issued_date: new Date().toISOString(),
      paid_date: new Date().toISOString(),
      notes: `Stripe Refund Invoice. Original Invoice: ${invoice.invoice_number || invoice.id}. Charge ID: ${charge.id}`,
    });

  if (refundInvoiceError) {
    console.error('Error creating refund invoice:', refundInvoiceError);
  }

  // Create refund request record if it doesn't exist
  const { data: existingRefund } = await supabase
    .from('refund_requests')
    .select('id')
    .eq('invoice_id', invoice.id)
    .maybeSingle();

  if (!existingRefund) {
    await supabase
      .from('refund_requests')
      .insert({
        user_id: userId,
        invoice_id: invoice.id,
        amount: refundAmount,
        currency: charge.currency.toUpperCase(),
        reason: 'Stripe refund processed',
        description: `Automatic refund from Stripe. Charge ID: ${charge.id}`,
        refund_type: 'other',
        status: 'processed',
        processed_at: new Date().toISOString(),
      });
  }

  console.log(`Charge refunded for user ${userId}, amount: ${refundAmount}`);
}

async function handleRefundCreated(supabase: any, refund: Stripe.Refund) {
  const chargeId = refund.charge as string;
  
  if (!chargeId) {
    console.error('No charge ID in refund');
    return;
  }

  // Get charge to find user
  // Note: In production, you might want to store charge IDs in your invoices table
  const metadata = refund.metadata;
  const userId = metadata?.userId;

  if (!userId) {
    console.log('No userId in refund metadata, skipping automatic update');
    return;
  }

  const refundAmount = (refund.amount || 0) / 100; // Convert from cents

  // Find the most recent paid invoice for this user
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .order('paid_date', { ascending: false })
    .limit(1);

  if (fetchError || !invoices || invoices.length === 0) {
    console.error('Error fetching invoice for refund:', fetchError);
    return;
  }

  const invoice = invoices[0];

  // Update original invoice status if refund succeeded
  if (refund.status === 'succeeded') {
    await supabase
      .from('invoices')
      .update({
        status: 'refunded',
        notes: `Stripe Refund: ${refund.id}. Original invoice updated.`,
      })
      .eq('id', invoice.id);

    // Create a refund invoice (negative amount) for accounting purposes
    const { error: refundInvoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: `REF-${Date.now()}`,
        amount: -refundAmount, // Negative amount for refund
        currency: refund.currency.toUpperCase(),
        status: 'refunded',
        billing_period: invoice.billing_period || null,
        tier: invoice.tier || null,
        issued_date: new Date().toISOString(),
        paid_date: new Date().toISOString(),
        notes: `Stripe Refund Invoice. Original Invoice: ${invoice.invoice_number || invoice.id}. Refund ID: ${refund.id}`,
      });

    if (refundInvoiceError) {
      console.error('Error creating refund invoice:', refundInvoiceError);
    }
  }

  // Create or update refund request
  await supabase
    .from('refund_requests')
    .upsert({
      invoice_id: invoice.id,
      user_id: userId,
      amount: refundAmount,
      currency: refund.currency.toUpperCase(),
      reason: 'Stripe refund created',
      description: `Refund created in Stripe. Refund ID: ${refund.id}`,
      refund_type: 'other',
      status: refund.status === 'succeeded' ? 'processed' : 'pending',
      processed_at: refund.status === 'succeeded' ? new Date().toISOString() : null,
    }, {
      onConflict: 'invoice_id',
    });

  console.log(`Refund created for user ${userId}, amount: ${refundAmount}`);
}

async function handleRefundUpdated(supabase: any, refund: Stripe.Refund) {
  const metadata = refund.metadata;
  const userId = metadata?.userId;

  if (!userId) {
    console.log('No userId in refund metadata, skipping update');
    return;
  }

  const refundAmount = (refund.amount || 0) / 100;

  // Find refund request by invoice
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('user_id', userId)
    .order('paid_date', { ascending: false })
    .limit(1);

  if (!invoices || invoices.length === 0) return;

  const invoice = invoices[0];

  // Update refund request status
  await supabase
    .from('refund_requests')
    .update({
      status: refund.status === 'succeeded' ? 'processed' : 'pending',
      processed_at: refund.status === 'succeeded' ? new Date().toISOString() : null,
      admin_notes: `Stripe refund status: ${refund.status}. Refund ID: ${refund.id}`,
    })
    .eq('invoice_id', invoice.id);

  // If refund succeeded, update original invoice status and create refund invoice
  if (refund.status === 'succeeded') {
    // Update original invoice
    await supabase
      .from('invoices')
      .update({ status: 'refunded' })
      .eq('id', invoice.id);

    // Check if refund invoice already exists
    const { data: existingRefundInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
      .eq('amount', -refundAmount)
      .eq('status', 'refunded')
      .like('invoice_number', 'REF-%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create refund invoice only if it doesn't exist
    if (!existingRefundInvoice) {
      const { error: refundInvoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          invoice_number: `REF-${Date.now()}`,
          amount: -refundAmount, // Negative amount for refund
          currency: refund.currency.toUpperCase(),
          status: 'refunded',
          billing_period: invoice.billing_period || null,
          tier: invoice.tier || null,
          issued_date: new Date().toISOString(),
          paid_date: new Date().toISOString(),
          notes: `Stripe Refund Invoice. Original Invoice: ${invoice.invoice_number || invoice.id}. Refund ID: ${refund.id}`,
        });

      if (refundInvoiceError) {
        console.error('Error creating refund invoice:', refundInvoiceError);
      }
    }
  }

  console.log(`Refund updated for user ${userId}, status: ${refund.status}`);
}

