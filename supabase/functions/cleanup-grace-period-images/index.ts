import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GracePeriodUser {
  user_id: string;
  previous_tier: string;
  grace_period_end: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting grace period cleanup...');

    // Find users whose grace period has ended
    const { data: expiredUsers, error: usersError } = await supabase
      .from('user_subscriptions')
      .select('user_id, previous_tier, grace_period_end')
      .not('grace_period_end', 'is', null)
      .lte('grace_period_end', new Date().toISOString()) as { data: GracePeriodUser[] | null, error: any };

    if (usersError) {
      throw usersError;
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('No expired grace periods found');
      return new Response(
        JSON.stringify({ message: 'No expired grace periods found', cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${expiredUsers.length} users with expired grace periods`);

    let totalCleaned = 0;

    for (const user of expiredUsers) {
      console.log(`Processing user: ${user.user_id}`);

      try {
        // Delete images from catalog_projects
        const { data: catalogProjects } = await supabase
          .from('catalog_projects')
          .select('image_url, catalog_id')
          .eq('catalog_id', user.user_id);

        if (catalogProjects) {
          for (const project of catalogProjects) {
            if (project.image_url) {
              const imagePath = project.image_url.split('/').pop();
              if (imagePath) {
                await supabase.storage
                  .from('catalog-images')
                  .remove([imagePath]);
                console.log(`Deleted catalog image: ${imagePath}`);
              }
            }
          }

          // Clear image URLs from database
          await supabase
            .from('catalog_projects')
            .update({ image_url: null })
            .eq('catalog_id', user.user_id);
        }

        // Delete images from projects
        const { data: projects } = await supabase
          .from('projects')
          .select('image_url, id')
          .eq('user_id', user.user_id);

        if (projects) {
          for (const project of projects) {
            if (project.image_url) {
              const imagePath = project.image_url.split('/').pop();
              if (imagePath) {
                await supabase.storage
                  .from('project-images')
                  .remove([imagePath]);
                console.log(`Deleted project image: ${imagePath}`);
              }
            }
          }

          // Clear image URLs from database
          await supabase
            .from('projects')
            .update({ image_url: null })
            .eq('user_id', user.user_id);
        }

        // Delete brand logos
        const { data: profiles } = await supabase
          .from('profiles')
          .select('brand_logo_url')
          .eq('id', user.user_id);

        if (profiles && profiles[0]?.brand_logo_url) {
          const logoPath = profiles[0].brand_logo_url.split('/').pop();
          if (logoPath) {
            await supabase.storage
              .from('brand-logos')
              .remove([logoPath]);
            console.log(`Deleted brand logo: ${logoPath}`);
          }

          await supabase
            .from('profiles')
            .update({ brand_logo_url: null })
            .eq('id', user.user_id);
        }

        // Clear grace period fields
        await supabase
          .from('user_subscriptions')
          .update({
            grace_period_end: null,
            previous_tier: null,
            downgrade_date: null,
            is_read_only: false
          })
          .eq('user_id', user.user_id);

        totalCleaned++;
        console.log(`Successfully cleaned up user: ${user.user_id}`);
      } catch (userError) {
        console.error(`Error cleaning up user ${user.user_id}:`, userError);
      }
    }

    console.log(`Cleanup complete. Processed ${totalCleaned} users.`);

    return new Response(
      JSON.stringify({ 
        message: 'Grace period cleanup completed',
        cleaned: totalCleaned,
        found: expiredUsers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in grace period cleanup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
