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
  cancelSubscription?: boolean; // If true, cancel subscription after refund
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

    // Log all headers for debugging (but not sensitive values)
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'authorization') {
        allHeaders[key] = value ? `${value.substring(0, 20)}...` : 'missing';
      } else {
        allHeaders[key] = value;
      }
    });
    console.log('Request headers:', JSON.stringify(allHeaders, null, 2));

    // Get auth token from request - try multiple header formats
    let authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      authHeader = req.headers.get('authorization');
    }
    if (!authHeader) {
      // Try to get from apikey header as fallback
      const apikeyHeader = req.headers.get('apikey');
      console.warn('No Authorization header found. Available headers:', Object.keys(allHeaders));
      return new Response(
        JSON.stringify({ 
          error: 'No se proporcionó token de autenticación',
          details: 'El header Authorization no está presente en la solicitud',
          receivedHeaders: Object.keys(allHeaders)
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean auth header (remove 'Bearer ' prefix if present)
    const cleanAuthToken = authHeader.replace(/^Bearer\s+/i, '');
    console.log('Auth token length:', cleanAuthToken.length);

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
        JSON.stringify({ 
          error: 'Token JWT inválido', 
          details: 'No se pudo decodificar el token para obtener el user_id'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error('Error getting user from admin client:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no encontrado', 
          details: userError?.message || 'No se pudo obtener el usuario con el ID del token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', { id: user.id, email: user.email });

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
    
    const { refundRequestId, action, adminNotes, userMessage, processInStripe = false, cancelSubscription = false } = body;

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

      // Check if refund invoice already exists for this refund request ID
      const { data: existingRefundInvoice } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('user_id', refundRequest.user_id)
        .eq('status', 'refunded')
        .like('invoice_number', 'REF-%')
        .ilike('notes', `%Refund Request: ${refundRequestId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRefundInvoice) {
        console.log(`Refund invoice already exists for refund request ${refundRequestId}, skipping creation`);
        refundInvoice = existingRefundInvoice;
      } else {
        // Create refund invoice with unique invoice number using timestamp and random suffix
        const now = new Date();
        const yearMonth = now.toISOString().slice(0, 7).replace('-', ''); // YYYYMM format
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `REF-${yearMonth}-${randomSuffix}`;
        
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
            notes: `Refund Request: ${refundRequestId}. Reason: ${refundRequest.reason}. ${originalInvoice ? `Original invoice: ${originalInvoice.invoice_number}` : ''}`,
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
      }
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
                  notes: `${refundInvoice.notes} Stripe Refund ID: ${refund.id}` 
                })
                .eq('id', refundInvoice.id);
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

    // Cancel subscription if requested
    let subscriptionCancelled = false;
    if (action === 'approve' && cancelSubscription) {
      try {
        // Get full subscription details
        const { data: fullSubscription, error: subError } = await supabaseAdmin
          .from('user_subscriptions')
          .select('tier, status, stripe_subscription_id, expires_at')
          .eq('user_id', refundRequest.user_id)
          .maybeSingle();

        if (!subError && fullSubscription && fullSubscription.status !== 'cancelled') {
          const previousTier = (fullSubscription.tier || 'free') as 'free' | 'tier_1' | 'tier_2';

          // Cancel in Stripe if subscription exists
          if (stripeSecretKey && fullSubscription.stripe_subscription_id) {
            try {
              const stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-10-16',
                httpClient: Stripe.createFetchHttpClient(),
              });
              await stripe.subscriptions.cancel(fullSubscription.stripe_subscription_id);
              console.log('Stripe subscription cancelled:', fullSubscription.stripe_subscription_id);
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

          // Update subscription in database
          const { error: cancelError } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: 'cancelled',
              tier: 'free',
              previous_tier: previousTier,
              downgrade_date: downgradeDate,
              grace_period_end: gracePeriodEnd,
              is_read_only: previousTier !== 'free' ? true : false,
            })
            .eq('user_id', refundRequest.user_id);

          if (cancelError) {
            console.error('Error cancelling subscription:', cancelError);
          } else {
            subscriptionCancelled = true;
            console.log('Subscription cancelled for user:', refundRequest.user_id);

            // Log the change
            await supabaseAdmin
              .from('subscription_changes')
              .insert({
                user_id: refundRequest.user_id,
                admin_id: user.id,
                previous_tier: previousTier,
                new_tier: 'free',
                change_type: 'cancel',
                reason: 'Subscription cancelled after refund approval',
                notes: `Cancelled automatically after refund request ${refundRequestId} was approved`,
              });
          }
        }
      } catch (cancelError: any) {
        console.error('Error in subscription cancellation process:', cancelError);
        // Don't fail the refund request if cancellation fails
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
        subscriptionCancelled,
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

