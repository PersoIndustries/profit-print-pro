import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  invoiceId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('EXTERNAL_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan variables de entorno de Supabase');
    }

    if (!stripeSecretKey) {
      throw new Error('Stripe no está configurado');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanToken = authHeader.replace(/^Bearer\s+/i, '');

    // Decode JWT payload to get user ID
    let userId: string | null = null;
    try {
      const parts = cleanToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          new TextDecoder().decode(
            Uint8Array.from(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
                .split('')
                .map((c) => c.charCodeAt(0))
            )
          )
        );
        userId = payload.sub || payload.user_id || null;
      }
    } catch (decodeError) {
      console.error('Error decoding JWT:', decodeError);
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Token JWT inválido', details: 'No se pudo obtener el usuario' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    if (!body.invoiceId) {
      return new Response(
        JSON.stringify({ error: 'invoiceId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, user_id, stripe_invoice_id, stripe_invoice_pdf_url, stripe_receipt_url')
      .eq('id', body.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership (unless admin)
    let isAdmin = false;
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleData?.role === 'admin') {
      isAdmin = true;
    }

    if (!isAdmin && invoice.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'No tienes acceso a esta factura' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we already have a stored PDF URL, return it immediately
    if (!invoice.stripe_invoice_id && invoice.stripe_invoice_pdf_url) {
      return new Response(
        JSON.stringify({ url: invoice.stripe_invoice_pdf_url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invoice.stripe_invoice_id) {
      return new Response(
        JSON.stringify({ error: 'Esta factura no tiene un enlace de Stripe disponible' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripe_invoice_id);
    const pdfUrl = stripeInvoice.invoice_pdf || stripeInvoice.hosted_invoice_url || invoice.stripe_invoice_pdf_url;

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'Stripe no devolvió un enlace para esta factura' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Persist the latest URLs
    await supabaseAdmin
      .from('invoices')
      .update({
        stripe_invoice_pdf_url: stripeInvoice.invoice_pdf || stripeInvoice.hosted_invoice_url || invoice.stripe_invoice_pdf_url,
        stripe_receipt_url: stripeInvoice.hosted_invoice_url || invoice.stripe_receipt_url,
      })
      .eq('id', invoice.id);

    return new Response(
      JSON.stringify({ url: pdfUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching Stripe invoice PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al obtener la factura' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

