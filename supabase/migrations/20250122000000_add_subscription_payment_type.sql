-- Add fields to distinguish between paid (Stripe) and free (admin) subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS is_paid_subscription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for Stripe subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id 
ON public.user_subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id 
ON public.user_subscriptions(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Update existing subscriptions: if they have billing_period and last_payment_date, they're likely paid
UPDATE public.user_subscriptions
SET is_paid_subscription = true
WHERE billing_period IS NOT NULL 
  AND last_payment_date IS NOT NULL
  AND tier != 'free';

-- Add comment to explain the field
COMMENT ON COLUMN public.user_subscriptions.is_paid_subscription IS 
'Indicates if this subscription is paid through Stripe (true) or granted for free by admin (false)';

COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 
'Stripe subscription ID for paid subscriptions. NULL for free/admin-granted subscriptions';

COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 
'Stripe customer ID for paid subscriptions. NULL for free/admin-granted subscriptions';

