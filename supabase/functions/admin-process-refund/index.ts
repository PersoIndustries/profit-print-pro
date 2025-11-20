/**
 * Supabase Edge Function: Admin Process Refund
 * 
 * Allows admins to process manual refunds.
 * This function:
 * - Verifies admin permissions
 * - Creates refund invoice
 * - Optionally processes refund in Stripe
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
  amount: number;
  currency?: string;
  notes?: string;
  processInStripe?: boolean; // If true, will also process refund in Stripe
  invoiceId?: string; // Optional: specific invoice to refund
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
    const { userId, amount, currency = 'EUR', notes, processInStripe = false, invoiceId } = body;

    if (!userId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos o amount inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user subscription to get tier
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
    }

    const tier = subscription?.tier || 'free';

    // Find invoice to refund (if invoiceId provided, use it; otherwise find most recent paid invoice)
    let invoiceToRefund = null;
    if (invoiceId) {
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .eq('status', 'paid')
        .single();

      if (!invoiceError && invoice) {
        invoiceToRefund = invoice;
      }
    } else {
      const { data: invoices, error: invoicesError } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .order('paid_date', { ascending: false })
        .limit(1);

      if (!invoicesError && invoices && invoices.length > 0) {
        invoiceToRefund = invoices[0];
      }
    }

    // Update original invoice status if found
    if (invoiceToRefund) {
      await supabaseAdmin
        .from('invoices')
        .update({ status: 'refunded' })
        .eq('id', invoiceToRefund.id);
    }

    // Create refund invoice
    const { data: refundInvoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: `REF-${Date.now()}`,
        amount: -Math.abs(amount), // Negative amount
        currency: currency.toUpperCase(),
        status: 'refunded',
        tier: tier,
        issued_date: new Date().toISOString(),
        paid_date: new Date().toISOString(),
        notes: notes || `Manual refund processed by admin. ${invoiceToRefund ? `Original invoice: ${invoiceToRefund.invoice_number}` : ''}`,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating refund invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Error al crear factura de refund' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process refund in Stripe if requested and Stripe is configured
    let stripeRefundId = null;
    if (processInStripe && stripeSecretKey && subscription?.stripe_customer_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        // Find the payment intent or charge to refund
        // Note: This is simplified - in production you might want to store charge IDs in invoices
        const customerId = subscription.stripe_customer_id;
        
        // Get recent charges for this customer
        const charges = await stripe.charges.list({
          customer: customerId,
          limit: 10,
        });

        // Find the most recent successful charge matching the amount
        const chargeToRefund = charges.data.find(
          (charge) => charge.paid && 
          Math.abs((charge.amount / 100) - amount) < 0.01 &&
          charge.currency === currency.toLowerCase()
        );

        if (chargeToRefund) {
          const refund = await stripe.refunds.create({
            charge: chargeToRefund.id,
            amount: Math.round(amount * 100), // Convert to cents
            metadata: {
              userId: userId,
              adminId: user.id,
              reason: 'admin_manual_refund',
            },
          });

          stripeRefundId = refund.id;

          // Update refund invoice with Stripe refund ID
          await supabaseAdmin
            .from('invoices')
            .update({ 
              notes: `${refundInvoice.notes} Stripe Refund ID: ${refund.id}` 
            })
            .eq('id', refundInvoice.id);
        } else {
          console.warn('No matching charge found in Stripe for refund');
        }
      } catch (stripeError: any) {
        console.error('Error processing Stripe refund:', stripeError);
        // Don't fail the request if Stripe refund fails - the invoice refund is already created
      }
    }

    // Log the refund
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: userId,
        admin_id: user.id,
        previous_tier: tier as 'free' | 'tier_1' | 'tier_2',
        new_tier: tier as 'free' | 'tier_1' | 'tier_2',
        change_type: 'refund',
        reason: `Manual refund of ${amount} ${currency}`,
        notes: notes || null,
      });

    if (logError) {
      console.error('Error logging refund:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Refund procesado exitosamente',
        refundInvoice: {
          id: refundInvoice.id,
          invoice_number: refundInvoice.invoice_number,
          amount: refundInvoice.amount,
        },
        stripeRefundId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al procesar refund' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

