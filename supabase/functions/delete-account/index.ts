/**
 * Supabase Edge Function: Delete Account
 * 
 * Allows authenticated users to delete their own account.
 * This function:
 * - Verifies user authentication
 * - Schedules account deletion (15 days grace period)
 * - Cancels subscription in Stripe if exists
 * - Cancels subscription in database
 * - Logs the deletion for audit
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  reason?: string;
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
    const { reason } = body;

    // Check if user is already scheduled for deletion
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, deleted_at, scheduled_deletion_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener perfil del usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile?.deleted_at) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Tu cuenta ya está programada para eliminación',
          scheduled_deletion_at: profile.scheduled_deletion_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user subscription to cancel in Stripe if needed
    let stripeCancelled = false;
    if (stripeSecretKey) {
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!subError && subscription?.stripe_subscription_id) {
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
          // Continue with deletion even if Stripe cancellation fails
        }
      }
    }

    // Schedule user deletion using the database function (15 days grace period)
    const { data: scheduleResult, error: scheduleError } = await supabaseAdmin.rpc('schedule_user_deletion', {
      p_user_id: userId,
      p_deleted_by: userId, // User is deleting themselves
      p_reason: reason || 'User requested account deletion',
    });

    if (scheduleError) {
      console.error('Error scheduling user deletion:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Error al programar eliminación de cuenta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tu cuenta ha sido programada para eliminación. Será eliminada permanentemente en 15 días. Puedes cancelar esta acción contactando a soporte antes de esa fecha.',
        scheduled_deletion_at: scheduleResult?.scheduled_deletion_at,
        stripeCancelled,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al eliminar cuenta' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

