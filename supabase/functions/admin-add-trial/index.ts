/**
 * Supabase Edge Function: Admin Add Trial
 * 
 * Allows admins to add a trial period to a user's subscription.
 * This function:
 * - Verifies admin permissions
 * - Adds trial days to subscription
 * - Updates expiration date
 * - Logs the change for audit
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  trialDays: number;
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
    const { userId, trialDays, notes } = body;

    if (!userId || !trialDays || trialDays < 1) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos o trialDays inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, expires_at, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener suscripción' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentTier = currentSub?.tier || 'free';
    const currentExpiresAt = currentSub?.expires_at 
      ? new Date(currentSub.expires_at)
      : new Date();
    
    // Calculate new expiration date
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + trialDays);

    // Determine tier for trial (upgrade to tier_1 if free)
    const trialTier = currentTier === 'free' ? 'tier_1' : currentTier;

    // Update subscription
    const updateData: any = {
      tier: trialTier,
      status: 'trial',
      expires_at: newExpiresAt.toISOString(),
      // Clear grace period if exists
      grace_period_end: null,
      downgrade_date: null,
      is_read_only: false,
    };

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al agregar período de prueba' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the change
    const { error: logError } = await supabaseAdmin
      .from('subscription_changes')
      .insert({
        user_id: userId,
        admin_id: user.id,
        previous_tier: currentTier as 'free' | 'tier_1' | 'tier_2',
        new_tier: trialTier as 'free' | 'tier_1' | 'tier_2',
        change_type: 'upgrade',
        reason: `Trial period added: ${trialDays} days`,
        notes: notes || null,
      });

    if (logError) {
      console.error('Error logging change:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Período de prueba de ${trialDays} días agregado exitosamente`,
        trialDays,
        newExpiresAt: newExpiresAt.toISOString(),
        trialTier,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error adding trial:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al agregar período de prueba' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

