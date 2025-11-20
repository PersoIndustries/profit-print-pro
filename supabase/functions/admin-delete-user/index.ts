/**
 * Supabase Edge Function: Admin Delete User
 * 
 * Allows admins to delete (soft delete) a user.
 * This function:
 * - Verifies admin permissions
 * - Soft deletes user profile
 * - Cancels subscription in Stripe if exists
 * - Cleans up related data
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
  userId: string;
  reason: string;
  cancelStripeSubscription?: boolean; // If true, will cancel subscription in Stripe
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
    const { userId, reason, cancelStripeSubscription = true } = body;

    if (!userId || !reason) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: userId, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminarte a ti mismo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user subscription to cancel in Stripe if needed
    let stripeCancelled = false;
    if (cancelStripeSubscription && stripeSecretKey) {
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
        } catch (stripeError: any) {
          console.error('Error cancelling Stripe subscription:', stripeError);
          // Continue with deletion even if Stripe cancellation fails
        }
      }
    }

    // Soft delete: update deleted_at instead of actually deleting
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        deleted_at: new Date().toISOString(),
        // Optionally anonymize sensitive data for GDPR
        // email: `deleted_${userId}@deleted.local`,
        // full_name: 'Deleted User',
      } as any)
      .eq('id', userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Error al eliminar usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel subscription in database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        tier: 'free',
      })
      .eq('user_id', userId);

    // Log the deletion
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: userId,
        admin_id: user.id,
        previous_tier: null,
        new_tier: 'free',
        change_type: 'cancel',
        reason: `User deleted by admin: ${reason}`,
        notes: `Admin: ${user.id}. Stripe cancelled: ${stripeCancelled}`,
      });

    if (logError) {
      console.error('Error logging deletion:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuario eliminado exitosamente',
        userId,
        stripeCancelled,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al eliminar usuario' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

