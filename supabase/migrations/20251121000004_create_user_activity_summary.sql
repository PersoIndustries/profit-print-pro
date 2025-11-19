-- Create user_activity_summary table for efficient session/usage tracking
-- This table aggregates daily activity instead of tracking every session
-- Much more cost-effective than individual session records

CREATE TABLE IF NOT EXISTS public.user_activity_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  
  -- Session metrics
  session_count INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0, -- Total minutes active
  first_activity TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  
  -- Activity counts
  materials_created INTEGER NOT NULL DEFAULT 0,
  projects_created INTEGER NOT NULL DEFAULT 0,
  orders_created INTEGER NOT NULL DEFAULT 0,
  prints_created INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, activity_date)
);

-- Enable RLS
ALTER TABLE public.user_activity_summary ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity summary
CREATE POLICY "Users can view own activity summary"
ON public.user_activity_summary
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert/update their own activity (via app)
CREATE POLICY "Users can manage own activity summary"
ON public.user_activity_summary
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity summaries
CREATE POLICY "Admins can view all activity summaries"
ON public.user_activity_summary
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_summary_user_date ON public.user_activity_summary(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_summary_date ON public.user_activity_summary(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_summary_user_id ON public.user_activity_summary(user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_activity_summary_updated_at
BEFORE UPDATE ON public.user_activity_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to upsert daily activity
-- This will be called by the app to record daily activity
CREATE OR REPLACE FUNCTION public.upsert_daily_activity(
  p_user_id UUID,
  p_activity_date DATE,
  p_session_minutes INTEGER DEFAULT 0,
  p_materials_created INTEGER DEFAULT 0,
  p_projects_created INTEGER DEFAULT 0,
  p_orders_created INTEGER DEFAULT 0,
  p_prints_created INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_summary (
    user_id,
    activity_date,
    session_count,
    total_minutes,
    first_activity,
    last_activity,
    materials_created,
    projects_created,
    orders_created,
    prints_created
  )
  VALUES (
    p_user_id,
    p_activity_date,
    1, -- Increment session count
    p_session_minutes,
    NOW(),
    NOW(),
    p_materials_created,
    p_projects_created,
    p_orders_created,
    p_prints_created
  )
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    session_count = user_activity_summary.session_count + 1,
    total_minutes = user_activity_summary.total_minutes + p_session_minutes,
    last_activity = NOW(),
    materials_created = user_activity_summary.materials_created + p_materials_created,
    projects_created = user_activity_summary.projects_created + p_projects_created,
    orders_created = user_activity_summary.orders_created + p_orders_created,
    prints_created = user_activity_summary.prints_created + p_prints_created,
    updated_at = NOW();
END;
$$;

-- Function to clean old activity summaries (older than 90 days)
-- This should be run periodically via cron or scheduled job
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_summaries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_activity_summary
  WHERE activity_date < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create a view for easy querying of recent activity (last 30 days)
CREATE OR REPLACE VIEW public.recent_user_activity AS
SELECT 
  uas.user_id,
  p.email,
  p.full_name,
  SUM(uas.session_count) as total_sessions,
  SUM(uas.total_minutes) as total_minutes,
  AVG(uas.total_minutes) as avg_minutes_per_day,
  SUM(uas.materials_created) as total_materials,
  SUM(uas.projects_created) as total_projects,
  SUM(uas.orders_created) as total_orders,
  SUM(uas.prints_created) as total_prints,
  MIN(uas.activity_date) as first_activity_date,
  MAX(uas.activity_date) as last_activity_date
FROM public.user_activity_summary uas
JOIN public.profiles p ON p.id = uas.user_id
WHERE uas.activity_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY uas.user_id, p.email, p.full_name;

-- Grant access to the view
GRANT SELECT ON public.recent_user_activity TO authenticated;

