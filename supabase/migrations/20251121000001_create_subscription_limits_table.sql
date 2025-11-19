-- Create subscription_limits table to make limits configurable from database
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  materials INTEGER NOT NULL DEFAULT 0,
  projects INTEGER NOT NULL DEFAULT 0,
  monthly_orders INTEGER NOT NULL DEFAULT 0,
  metrics_history INTEGER NOT NULL DEFAULT 0, -- in days
  shopping_lists INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read subscription limits
CREATE POLICY "Anyone can view subscription limits"
ON public.subscription_limits
FOR SELECT
USING (true);

-- Only admins can manage subscription limits
CREATE POLICY "Admins can insert subscription limits"
ON public.subscription_limits
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subscription limits"
ON public.subscription_limits
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscription limits"
ON public.subscription_limits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at
CREATE TRIGGER update_subscription_limits_updated_at
BEFORE UPDATE ON public.subscription_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default limits (matching current hardcoded values)
INSERT INTO public.subscription_limits (tier, materials, projects, monthly_orders, metrics_history, shopping_lists) VALUES
  ('free', 10, 15, 15, 0, 5),
  ('tier_1', 50, 100, 50, 60, 5),
  ('tier_2', 999999, 999999, 999999, 730, 5)
ON CONFLICT (tier) DO NOTHING;

-- Create function to get subscription limits for a tier
CREATE OR REPLACE FUNCTION public.get_subscription_limits(_tier subscription_tier)
RETURNS TABLE (
  materials INTEGER,
  projects INTEGER,
  monthly_orders INTEGER,
  metrics_history INTEGER,
  shopping_lists INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sl.materials,
    sl.projects,
    sl.monthly_orders,
    sl.metrics_history,
    sl.shopping_lists
  FROM public.subscription_limits sl
  WHERE sl.tier = _tier;
$$;

-- Update check_subscription_limit function to use database limits
CREATE OR REPLACE FUNCTION public.check_subscription_limit(
  _user_id UUID,
  _resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier subscription_tier;
  current_count INTEGER;
  limit_count INTEGER;
  tier_limits RECORD;
BEGIN
  user_tier := public.get_user_tier(_user_id);
  
  -- Get limits from database
  SELECT * INTO tier_limits
  FROM public.get_subscription_limits(user_tier);
  
  -- If no limits found in database, use hardcoded fallback
  IF tier_limits IS NULL THEN
    limit_count := CASE user_tier
      WHEN 'free' THEN
        CASE _resource_type
          WHEN 'materials' THEN 10
          WHEN 'projects' THEN 15
          WHEN 'orders' THEN 15
          WHEN 'shopping_lists' THEN 5
          ELSE 0
        END
      WHEN 'tier_1' THEN
        CASE _resource_type
          WHEN 'materials' THEN 50
          WHEN 'projects' THEN 100
          WHEN 'orders' THEN 50
          WHEN 'shopping_lists' THEN 5
          ELSE 0
        END
      WHEN 'tier_2' THEN
        CASE _resource_type
          WHEN 'materials' THEN 999999
          WHEN 'projects' THEN 999999
          WHEN 'orders' THEN 999999
          WHEN 'shopping_lists' THEN 5
          ELSE 0
        END
      ELSE 0
    END;
  ELSE
    -- Use limits from database
    limit_count := CASE _resource_type
      WHEN 'materials' THEN tier_limits.materials
      WHEN 'projects' THEN tier_limits.projects
      WHEN 'orders' THEN tier_limits.monthly_orders
      WHEN 'shopping_lists' THEN tier_limits.shopping_lists
      ELSE 0
    END;
  END IF;
  
  -- Count current resources
  CASE _resource_type
    WHEN 'materials' THEN
      SELECT COUNT(*) INTO current_count FROM public.materials WHERE user_id = _user_id;
    WHEN 'projects' THEN
      SELECT COUNT(*) INTO current_count FROM public.projects WHERE user_id = _user_id;
    WHEN 'orders' THEN
      SELECT COUNT(*) INTO current_count 
      FROM public.orders 
      WHERE user_id = _user_id 
      AND order_date >= DATE_TRUNC('month', NOW());
    WHEN 'shopping_lists' THEN
      SELECT COUNT(*) INTO current_count 
      FROM public.shopping_lists 
      WHERE user_id = _user_id;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN current_count < limit_count;
END;
$$;

