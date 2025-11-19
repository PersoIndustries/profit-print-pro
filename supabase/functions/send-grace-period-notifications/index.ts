import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GracePeriodUser {
  user_id: string;
  email: string;
  full_name: string | null;
  previous_tier: string;
  grace_period_end: string;
  days_remaining: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting grace period notification check...');

    // Find users in grace period
    const { data: usersInGracePeriod, error: usersError } = await supabase
      .from('user_subscriptions')
      .select('user_id, previous_tier, grace_period_end')
      .not('grace_period_end', 'is', null)
      .gt('grace_period_end', new Date().toISOString());

    if (usersError) {
      throw usersError;
    }

    if (!usersInGracePeriod || usersInGracePeriod.length === 0) {
      console.log('No users in grace period found');
      return new Response(
        JSON.stringify({ message: 'No users in grace period', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${usersInGracePeriod.length} users in grace period`);

    // Fetch user profiles
    const userIds = usersInGracePeriod.map(u => u.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      throw profilesError;
    }

    // Calculate days remaining and filter for notification milestones
    const usersToNotify: GracePeriodUser[] = [];
    const now = new Date();

    for (const user of usersInGracePeriod) {
      const profile = profiles?.find(p => p.id === user.user_id);
      if (!profile) continue;

      const gracePeriodEnd = new Date(user.grace_period_end);
      const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send notifications at 30 days, 7 days, and 1 day before deletion
      if (daysRemaining === 30 || daysRemaining === 7 || daysRemaining === 1) {
        usersToNotify.push({
          user_id: user.user_id,
          email: profile.email,
          full_name: profile.full_name,
          previous_tier: user.previous_tier,
          grace_period_end: user.grace_period_end,
          days_remaining: daysRemaining
        });
      }
    }

    console.log(`${usersToNotify.length} users need notifications`);

    let notificationsSent = 0;

    for (const user of usersToNotify) {
      try {
        const tierName = user.previous_tier === 'tier_2' ? 'Enterprise' : 'Pro';
        const urgency = user.days_remaining === 1 ? 'URGENT' : user.days_remaining === 7 ? 'Important' : 'Notice';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${user.days_remaining === 1 ? '#dc2626' : user.days_remaining === 7 ? '#ea580c' : '#3b82f6'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .alert-box { background: ${user.days_remaining === 1 ? '#fee2e2' : user.days_remaining === 7 ? '#ffedd5' : '#dbeafe'}; border-left: 4px solid ${user.days_remaining === 1 ? '#dc2626' : user.days_remaining === 7 ? '#ea580c' : '#3b82f6'}; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
              ul { list-style: none; padding: 0; }
              ul li { padding: 8px 0; }
              ul li:before { content: "✓ "; color: #10b981; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">${urgency}: Grace Period Ending Soon</h1>
              </div>
              <div class="content">
                <p>Hello ${user.full_name || 'there'},</p>
                
                <div class="alert-box">
                  <strong>Your images will be deleted in ${user.days_remaining} day${user.days_remaining === 1 ? '' : 's'}</strong>
                </div>
                
                <p>Your ${tierName} subscription was downgraded, and the 3-month grace period is ending soon. On <strong>${new Date(user.grace_period_end).toLocaleDateString()}</strong>, all your project images, catalog images, and brand logos will be permanently deleted.</p>
                
                <h3>What will happen:</h3>
                <ul>
                  <li>All images will be permanently deleted from storage</li>
                  <li>Project and catalog data (text, prices, specs) will be preserved</li>
                  <li>You can reactivate to prevent deletion and restore full access</li>
                </ul>
                
                <h3>Your options:</h3>
                <p><strong>1. Reactivate your ${tierName} subscription</strong></p>
                <p>Upgrade back to ${tierName} or higher to:</p>
                <ul>
                  <li>Cancel the grace period immediately</li>
                  <li>Preserve all your images</li>
                  <li>Restore full account access</li>
                </ul>
                <a href="${supabaseUrl.replace('supabase.co', 'app.printgest.com')}/pricing" class="btn">Reactivate Subscription</a>
                
                <p style="margin-top: 20px;"><strong>2. Export your data</strong></p>
                <p>Download a complete backup of all your data before deletion:</p>
                <a href="${supabaseUrl.replace('supabase.co', 'app.printgest.com')}/grace-period-settings" class="btn" style="background: #6b7280;">Export Data</a>
                
                ${user.days_remaining === 1 ? '<p style="color: #dc2626; font-weight: bold; margin-top: 30px;">⚠️ This is your final reminder. Images will be deleted tomorrow!</p>' : ''}
                
                <p style="margin-top: 30px;">If you have any questions, please contact our support team.</p>
                
                <p>Best regards,<br>The Printgest Team</p>
              </div>
              <div class="footer">
                <p>You're receiving this email because you have a grace period active on your Printgest account.</p>
                <p>© ${new Date().getFullYear()} Printgest. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email using Resend API
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Printgest <notifications@printgest.com>',
            to: [user.email],
            subject: `${urgency}: Your images will be deleted in ${user.days_remaining} day${user.days_remaining === 1 ? '' : 's'}`,
            html: emailHtml
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Resend API error: ${response.status} - ${errorData}`);
        }

        notificationsSent++;
        console.log(`Sent notification to ${user.email} (${user.days_remaining} days remaining)`);
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
      }
    }

    console.log(`Notification check complete. Sent ${notificationsSent} emails.`);

    return new Response(
      JSON.stringify({
        message: 'Grace period notifications sent',
        usersInGracePeriod: usersInGracePeriod.length,
        usersNotified: usersToNotify.length,
        notificationsSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in grace period notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
