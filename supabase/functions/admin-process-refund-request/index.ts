/**
 * Supabase Edge Function: Admin Process Refund Request
 * 
 * Allows admins to approve or reject refund requests.
 * This function:
 * - Verifies admin permissions
 * - Updates refund request status
 * - Creates refund invoice if approved
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
  refundRequestId: string;
  action: 'approve' | 'reject';
  adminNotes?: string;
  userMessage?: string; // Message to send to user as notification
  processInStripe?: boolean; // If true, will also process refund in Stripe
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
      return new Response(
        JSON.stringify({ error: 'Faltan variables de entorno requeridas', details: 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        JSON.stringify({ error: 'Usuario no autenticado', details: userError?.message }),
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
        JSON.stringify({ error: 'No tienes permisos de administrador', details: roleError?.message }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (parseError: any) {
      return new Response(
        JSON.stringify({ error: 'Error al parsear el cuerpo de la solicitud', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { refundRequestId, action, adminNotes, userMessage, processInStripe = false } = body;

    if (!refundRequestId || !action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos o action inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get refund request
    const { data: refundRequest, error: requestError } = await supabaseAdmin
      .from('refund_requests')
      .select('*')
      .eq('id', refundRequestId)
      .single();

    if (requestError || !refundRequest) {
      return new Response(
        JSON.stringify({ error: 'Solicitud de refund no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (refundRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'La solicitud de refund ya fue procesada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update refund request
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_id: user.id,
      admin_notes: adminNotes || null,
      processed_at: new Date().toISOString(),
    };

    let refundInvoice = null;
    let stripeRefundId = null;

    if (action === 'approve') {
      // Get user subscription for tier
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('tier, stripe_customer_id')
        .eq('user_id', refundRequest.user_id)
        .maybeSingle();

      const tier = subscription?.tier || 'free';

      // Get original invoice if available
      let originalInvoice = null;
      if (refundRequest.invoice_id) {
        const { data: invoice, error: invoiceError } = await supabaseAdmin
          .from('invoices')
          .select('*')
          .eq('id', refundRequest.invoice_id)
          .single();

        if (!invoiceError && invoice) {
          originalInvoice = invoice;
          
          // Update original invoice status
          await supabaseAdmin
            .from('invoices')
            .update({ status: 'refunded' })
            .eq('id', invoice.id);
        }
      }

      // Create refund invoice with unique invoice number
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const invoiceNumber = `REF-${timestamp}-${randomSuffix}`;
      
      // Get billing_period from original invoice if available
      const billingPeriod = originalInvoice?.billing_period || null;
      
      const { data: newInvoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
          user_id: refundRequest.user_id,
          subscription_id: refundRequest.subscription_id || null,
          invoice_number: invoiceNumber,
          amount: -Math.abs(refundRequest.amount),
          currency: refundRequest.currency || 'EUR',
          status: 'refunded',
          tier: tier,
          billing_period: billingPeriod,
          issued_date: new Date().toISOString(),
          paid_date: new Date().toISOString(),
          notes: `Refund approved for request: ${refundRequest.reason}. ${originalInvoice ? `Original invoice: ${originalInvoice.invoice_number}` : ''}`,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating refund invoice:', invoiceError);
        console.error('Invoice error details:', JSON.stringify(invoiceError, null, 2));
        console.error('Invoice data attempted:', {
          user_id: refundRequest.user_id,
          subscription_id: refundRequest.subscription_id || null,
          invoice_number: invoiceNumber,
          amount: -Math.abs(refundRequest.amount),
          currency: refundRequest.currency || 'EUR',
          status: 'refunded',
          tier: tier,
          billing_period: billingPeriod,
        });
        return new Response(
          JSON.stringify({ 
            error: 'Error al crear factura de refund',
            details: invoiceError.message || invoiceError.toString(),
            code: (invoiceError as any).code
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      refundInvoice = newInvoice;
      updateData.status = 'processed';

      // Process refund in Stripe if requested
      if (processInStripe && stripeSecretKey) {
        try {
          if (!subscription?.stripe_customer_id) {
            console.warn('No Stripe customer ID found for user, skipping Stripe refund');
          } else {
            const stripe = new Stripe(stripeSecretKey, {
              apiVersion: '2023-10-16',
              httpClient: Stripe.createFetchHttpClient(),
            });

            const customerId = subscription.stripe_customer_id;
            
            // Try to get payment intent from invoice if available
            let chargeToRefund = null;
            
            if (originalInvoice && originalInvoice.stripe_payment_intent_id) {
              try {
                const paymentIntent = await stripe.paymentIntents.retrieve(originalInvoice.stripe_payment_intent_id);
                if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
                  chargeToRefund = paymentIntent.charges.data[0];
                }
              } catch (e) {
                console.warn('Could not retrieve payment intent, trying charges list');
              }
            }
            
            // If not found, get recent charges
            if (!chargeToRefund) {
              const charges = await stripe.charges.list({
                customer: customerId,
                limit: 20,
              });

              // Find matching charge (more flexible matching)
              chargeToRefund = charges.data.find(
                (charge: Stripe.Charge) => charge.paid && 
                Math.abs((charge.amount / 100) - Math.abs(refundRequest.amount)) < 0.50 && // Allow 50 cent difference
                charge.currency === (refundRequest.currency || 'eur').toLowerCase()
              );
            }

            if (chargeToRefund) {
              const refund = await stripe.refunds.create({
                charge: chargeToRefund.id,
                amount: Math.round(Math.abs(refundRequest.amount) * 100),
                metadata: {
                  userId: refundRequest.user_id,
                  adminId: user.id,
                  refundRequestId: refundRequestId,
                  reason: refundRequest.reason,
                },
              });

              stripeRefundId = refund.id;

              // Update refund invoice with Stripe refund ID
              await supabaseAdmin
                .from('invoices')
                .update({ 
                  notes: `${newInvoice.notes} Stripe Refund ID: ${refund.id}` 
                })
                .eq('id', newInvoice.id);
            } else {
              console.warn('No matching charge found in Stripe for refund amount:', refundRequest.amount);
            }
          }
        } catch (stripeError: any) {
          console.error('Error processing Stripe refund:', stripeError);
          // Don't fail the entire request if Stripe refund fails - the invoice refund is already created
          // Log the error but continue
        }
      }
    }

    // Update refund request
    const { error: updateError } = await supabaseAdmin
      .from('refund_requests')
      .update(updateData)
      .eq('id', refundRequestId);

    if (updateError) {
      console.error('Error updating refund request:', updateError);
      console.error('Update data:', JSON.stringify(updateData, null, 2));
      console.error('Refund request ID:', refundRequestId);
      return new Response(
        JSON.stringify({ 
          error: 'Error al actualizar solicitud de refund',
          details: updateError.message || updateError.toString(),
          code: updateError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for the user
    if (userMessage && userMessage.trim()) {
      const notificationTitle = action === 'approve' 
        ? 'Solicitud de Refund Aprobada' 
        : 'Solicitud de Refund Rechazada';
      
      const notificationType = action === 'approve' ? 'success' : 'warning';
      
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: refundRequest.user_id,
          title: notificationTitle,
          message: userMessage,
          type: notificationType,
          category: 'subscription',
          action_url: '/settings?tab=invoices', // Link to invoices tab
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Refund request ${action === 'approve' ? 'approved and processed' : 'rejected'} successfully`,
        refundRequest: {
          id: refundRequestId,
          status: updateData.status,
        },
        refundInvoice: refundInvoice ? {
          id: refundInvoice.id,
          invoice_number: refundInvoice.invoice_number,
          amount: refundInvoice.amount,
        } : null,
        stripeRefundId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing refund request:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al procesar solicitud de refund',
        details: error.toString(),
        stack: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

