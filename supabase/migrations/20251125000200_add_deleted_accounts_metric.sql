-- Add deleted_accounts metric to daily_metrics table
ALTER TABLE public.daily_metrics
ADD COLUMN IF NOT EXISTS deleted_accounts INTEGER DEFAULT 0;

-- Update calculate_daily_metrics function to include deleted accounts
CREATE OR REPLACE FUNCTION public.calculate_daily_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_start TIMESTAMP WITH TIME ZONE;
  v_date_end TIMESTAMP WITH TIME ZONE;
  v_metrics JSON;
BEGIN
  -- Set date range for the day
  v_date_start := p_date::timestamp;
  v_date_end := (p_date + INTERVAL '1 day')::timestamp;
  
  -- Calculate metrics
  WITH daily_data AS (
    SELECT
      -- New users
      COUNT(DISTINCT CASE WHEN p.created_at >= v_date_start AND p.created_at < v_date_end THEN p.id END) as new_users,
      
      -- Deleted accounts (accounts marked for deletion on this day)
      COUNT(DISTINCT CASE WHEN p.deleted_at >= v_date_start AND p.deleted_at < v_date_end THEN p.id END) as deleted_accounts,
      
      -- New subscriptions by tier
      COUNT(DISTINCT CASE WHEN s.created_at >= v_date_start AND s.created_at < v_date_end AND s.tier = 'free' THEN s.user_id END) as new_subs_free,
      COUNT(DISTINCT CASE WHEN s.created_at >= v_date_start AND s.created_at < v_date_end AND s.tier = 'tier_1' THEN s.user_id END) as new_subs_tier_1,
      COUNT(DISTINCT CASE WHEN s.created_at >= v_date_start AND s.created_at < v_date_end AND s.tier = 'tier_2' THEN s.user_id END) as new_subs_tier_2,
      
      -- New users by tier (based on their subscription tier on that day)
      COUNT(DISTINCT CASE WHEN p.created_at >= v_date_start AND p.created_at < v_date_end THEN 
        CASE WHEN EXISTS(SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id AND us.tier = 'free' AND us.created_at <= p.created_at) THEN p.id END
      END) as new_users_free,
      COUNT(DISTINCT CASE WHEN p.created_at >= v_date_start AND p.created_at < v_date_end THEN 
        CASE WHEN EXISTS(SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id AND us.tier = 'tier_1' AND us.created_at <= p.created_at) THEN p.id END
      END) as new_users_tier_1,
      COUNT(DISTINCT CASE WHEN p.created_at >= v_date_start AND p.created_at < v_date_end THEN 
        CASE WHEN EXISTS(SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id AND us.tier = 'tier_2' AND us.created_at <= p.created_at) THEN p.id END
      END) as new_users_tier_2,
      
      -- Cancellations (Pro to Free)
      COUNT(DISTINCT CASE WHEN s.downgrade_date >= v_date_start AND s.downgrade_date < v_date_end 
        AND s.previous_tier = 'tier_1' AND s.tier = 'free' THEN s.user_id END) as cancellations,
      
      -- Downgrades (Business to Pro)
      COUNT(DISTINCT CASE WHEN s.downgrade_date >= v_date_start AND s.downgrade_date < v_date_end 
        AND s.previous_tier = 'tier_2' AND s.tier = 'tier_1' THEN s.user_id END) as downgrades,
      
      -- Activity
      COUNT(DISTINCT CASE WHEN m.created_at >= v_date_start AND m.created_at < v_date_end THEN m.id END) as materials_created,
      COUNT(DISTINCT CASE WHEN pr.created_at >= v_date_start AND pr.created_at < v_date_end THEN pr.id END) as projects_created,
      COUNT(DISTINCT CASE WHEN o.created_at >= v_date_start AND o.created_at < v_date_end THEN o.id END) as orders_created,
      COUNT(DISTINCT CASE WHEN pt.created_at >= v_date_start AND pt.created_at < v_date_end THEN pt.id END) as prints_created,
      
      -- Revenue
      COALESCE(SUM(CASE WHEN o.created_at >= v_date_start AND o.created_at < v_date_end THEN o.total_amount ELSE 0 END), 0) as revenue
    FROM profiles p
    LEFT JOIN user_subscriptions s ON s.user_id = p.id
    LEFT JOIN materials m ON m.user_id = p.id
    LEFT JOIN projects pr ON pr.user_id = p.id
    LEFT JOIN orders o ON o.user_id = p.id
    LEFT JOIN prints pt ON pt.user_id = p.id
  )
  SELECT row_to_json(daily_data) INTO v_metrics FROM daily_data;
  
  -- Upsert into daily_metrics
  INSERT INTO public.daily_metrics (
    metric_date,
    new_users,
    deleted_accounts,
    new_users_free,
    new_users_tier_1,
    new_users_tier_2,
    new_subscriptions_free,
    new_subscriptions_tier_1,
    new_subscriptions_tier_2,
    cancellations,
    downgrades,
    materials_created,
    projects_created,
    orders_created,
    prints_created,
    revenue,
    calculated_at
  )
  VALUES (
    p_date,
    (v_metrics->>'new_users')::INTEGER,
    (v_metrics->>'deleted_accounts')::INTEGER,
    (v_metrics->>'new_users_free')::INTEGER,
    (v_metrics->>'new_users_tier_1')::INTEGER,
    (v_metrics->>'new_users_tier_2')::INTEGER,
    (v_metrics->>'new_subs_free')::INTEGER,
    (v_metrics->>'new_subs_tier_1')::INTEGER,
    (v_metrics->>'new_subs_tier_2')::INTEGER,
    (v_metrics->>'cancellations')::INTEGER,
    (v_metrics->>'downgrades')::INTEGER,
    (v_metrics->>'materials_created')::INTEGER,
    (v_metrics->>'projects_created')::INTEGER,
    (v_metrics->>'orders_created')::INTEGER,
    (v_metrics->>'prints_created')::INTEGER,
    (v_metrics->>'revenue')::NUMERIC,
    now()
  )
  ON CONFLICT (metric_date) 
  DO UPDATE SET
    new_users = EXCLUDED.new_users,
    deleted_accounts = EXCLUDED.deleted_accounts,
    new_users_free = EXCLUDED.new_users_free,
    new_users_tier_1 = EXCLUDED.new_users_tier_1,
    new_users_tier_2 = EXCLUDED.new_users_tier_2,
    new_subscriptions_free = EXCLUDED.new_subscriptions_free,
    new_subscriptions_tier_1 = EXCLUDED.new_subscriptions_tier_1,
    new_subscriptions_tier_2 = EXCLUDED.new_subscriptions_tier_2,
    cancellations = EXCLUDED.cancellations,
    downgrades = EXCLUDED.downgrades,
    materials_created = EXCLUDED.materials_created,
    projects_created = EXCLUDED.projects_created,
    orders_created = EXCLUDED.orders_created,
    prints_created = EXCLUDED.prints_created,
    revenue = EXCLUDED.revenue,
    calculated_at = now(),
    updated_at = now();
  
  RETURN json_build_object('success', true, 'date', p_date, 'metrics', v_metrics);
END;
$$;

