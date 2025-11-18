-- Add grace period fields to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS downgrade_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS previous_tier subscription_tier,
ADD COLUMN IF NOT EXISTS grace_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_read_only boolean DEFAULT false;

-- Add index for grace period queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period_end 
ON public.user_subscriptions(grace_period_end) 
WHERE grace_period_end IS NOT NULL;

-- Create function to set grace period when downgrading
CREATE OR REPLACE FUNCTION public.handle_subscription_downgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If tier is being downgraded (including to free)
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    -- Check if it's a downgrade (tier_2 > tier_1 > free)
    IF (OLD.tier = 'tier_2' AND NEW.tier IN ('tier_1', 'free')) OR
       (OLD.tier = 'tier_1' AND NEW.tier = 'free') THEN
      
      NEW.downgrade_date := NOW();
      NEW.previous_tier := OLD.tier;
      NEW.grace_period_end := NOW() + INTERVAL '90 days'; -- 3 months
      NEW.is_read_only := true;
      
    -- If upgrading back, clear grace period
    ELSIF (NEW.tier = 'tier_2') OR 
          (NEW.tier = 'tier_1' AND OLD.tier = 'free') THEN
      
      NEW.downgrade_date := NULL;
      NEW.previous_tier := NULL;
      NEW.grace_period_end := NULL;
      NEW.is_read_only := false;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for subscription downgrades
DROP TRIGGER IF EXISTS on_subscription_tier_change ON public.user_subscriptions;
CREATE TRIGGER on_subscription_tier_change
  BEFORE UPDATE OF tier ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_downgrade();