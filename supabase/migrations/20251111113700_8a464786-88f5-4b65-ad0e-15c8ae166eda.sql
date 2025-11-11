-- Give admin access to user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('3e24ef9d-8960-472a-89c5-1f44f64ce8e2', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update user subscription to tier_2 (Enterprise)
UPDATE public.user_subscriptions 
SET tier = 'tier_2'::subscription_tier, 
    status = 'active'
WHERE user_id = '3e24ef9d-8960-472a-89c5-1f44f64ce8e2';