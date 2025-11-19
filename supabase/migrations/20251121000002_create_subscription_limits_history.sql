-- Create subscription_limits_history table to track all changes to subscription limits
CREATE TABLE IF NOT EXISTS public.subscription_limits_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  
  -- Old values (NULL for created)
  old_materials INTEGER,
  old_projects INTEGER,
  old_monthly_orders INTEGER,
  old_metrics_history INTEGER,
  old_shopping_lists INTEGER,
  
  -- New values (NULL for deleted)
  new_materials INTEGER,
  new_projects INTEGER,
  new_monthly_orders INTEGER,
  new_metrics_history INTEGER,
  new_shopping_lists INTEGER,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_limits_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view subscription limits history
CREATE POLICY "Admins can view subscription limits history"
ON public.subscription_limits_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert subscription limits history (via trigger)
CREATE POLICY "Admins can insert subscription limits history"
ON public.subscription_limits_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to log subscription limits changes
CREATE OR REPLACE FUNCTION public.log_subscription_limits_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_limits_history (
      tier,
      changed_by,
      change_type,
      new_materials,
      new_projects,
      new_monthly_orders,
      new_metrics_history,
      new_shopping_lists
    ) VALUES (
      NEW.tier,
      auth.uid(),
      'created',
      NEW.materials,
      NEW.projects,
      NEW.monthly_orders,
      NEW.metrics_history,
      NEW.shopping_lists
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.subscription_limits_history (
      tier,
      changed_by,
      change_type,
      old_materials,
      old_projects,
      old_monthly_orders,
      old_metrics_history,
      old_shopping_lists,
      new_materials,
      new_projects,
      new_monthly_orders,
      new_metrics_history,
      new_shopping_lists
    ) VALUES (
      NEW.tier,
      auth.uid(),
      'updated',
      OLD.materials,
      OLD.projects,
      OLD.monthly_orders,
      OLD.metrics_history,
      OLD.shopping_lists,
      NEW.materials,
      NEW.projects,
      NEW.monthly_orders,
      NEW.metrics_history,
      NEW.shopping_lists
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.subscription_limits_history (
      tier,
      changed_by,
      change_type,
      old_materials,
      old_projects,
      old_monthly_orders,
      old_metrics_history,
      old_shopping_lists
    ) VALUES (
      OLD.tier,
      auth.uid(),
      'deleted',
      OLD.materials,
      OLD.projects,
      OLD.monthly_orders,
      OLD.metrics_history,
      OLD.shopping_lists
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger to automatically log changes
DROP TRIGGER IF EXISTS subscription_limits_change_log ON public.subscription_limits;
CREATE TRIGGER subscription_limits_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.subscription_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_limits_change();

