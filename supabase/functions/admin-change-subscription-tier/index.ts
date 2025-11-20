/**
 * Supabase Edge Function: Admin Change Subscription Tier
 * 
 * Allows admins to change a user's subscription tier.
 * This function:
 * - Verifies admin permissions
 * - Updates subscription tier
 * - Logs the change for audit
 * - Handles grace period if downgrading
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  newTier: 'free' | 'tier_1' | 'tier_2';
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('EXTERNAL_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

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

    // Create admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
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
    const { userId, newTier, notes } = body;

    if (!userId || !newTier) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: userId, newTier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tier
    if (!['free', 'tier_1', 'tier_2'].includes(newTier)) {
      return new Response(
        JSON.stringify({ error: 'Tier inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, status, expires_at, grace_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener suscripción actual' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousTier = (currentSub?.tier || 'free') as 'free' | 'tier_1' | 'tier_2';

    // Determine change type
    const tierOrder = { free: 0, tier_1: 1, tier_2: 2 };
    const changeType = tierOrder[newTier] > tierOrder[previousTier] ? 'upgrade' : 
                      tierOrder[newTier] < tierOrder[previousTier] ? 'downgrade' : 'same';

    // If downgrading from paid to free, handle grace period
    let gracePeriodEnd = null;
    let downgradeDate = null;
    let isReadOnly = false;

    if (changeType === 'downgrade' && previousTier !== 'free' && newTier === 'free') {
      // Set grace period (30 days)
      const now = new Date();
      gracePeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      downgradeDate = now.toISOString();
      isReadOnly = true;
    } else if (changeType === 'upgrade' || newTier !== 'free') {
      // Clear grace period if upgrading
      gracePeriodEnd = null;
      downgradeDate = null;
      isReadOnly = false;
    }

    // Update subscription
    const updateData: any = {
      tier: newTier,
      status: newTier === 'free' ? 'cancelled' : 'active',
      previous_tier: previousTier,
      downgrade_date: downgradeDate,
      grace_period_end: gracePeriodEnd,
      is_read_only: isReadOnly,
    };

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al actualizar suscripción' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the change
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: userId,
        admin_id: user.id,
        previous_tier: previousTier,
        new_tier: newTier,
        change_type: changeType,
        reason: 'Admin changed subscription tier',
        notes: notes || null,
      });

    if (logError) {
      console.error('Error logging change:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tier de suscripción actualizado exitosamente',
        previousTier,
        newTier,
        changeType,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error changing subscription tier:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al cambiar tier de suscripción' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

