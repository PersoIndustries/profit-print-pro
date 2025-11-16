import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Checking for expired trials...');

    // Buscar suscripciones con status 'trial' y expires_at < NOW()
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, tier, expires_at')
      .eq('status', 'trial')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('❌ Error fetching expired trials:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${expiredTrials?.length || 0} expired trials`);

    if (expiredTrials && expiredTrials.length > 0) {
      // Actualizar cada trial expirado
      for (const trial of expiredTrials) {
        console.log(`⏰ Expiring trial for user ${trial.user_id}`);

        // Actualizar a tier free y status expired
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'expired',
            tier: 'free'
          })
          .eq('id', trial.id);

        if (updateError) {
          console.error(`❌ Error updating trial ${trial.id}:`, updateError);
          continue;
        }

        // Registrar el cambio en subscription_changes
        const { error: changeError } = await supabase
          .from('subscription_changes')
          .insert({
            user_id: trial.user_id,
            change_type: 'trial_expired',
            previous_tier: trial.tier,
            new_tier: 'free',
            reason: 'Trial period ended automatically'
          });

        if (changeError) {
          console.error(`❌ Error logging subscription change:`, changeError);
        }

        console.log(`✅ Trial expired for user ${trial.user_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiredTrials?.length || 0} expired trials`,
        count: expiredTrials?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in check-expired-trials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
