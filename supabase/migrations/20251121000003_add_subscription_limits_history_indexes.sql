-- Add indexes to subscription_limits_history table for better query performance
-- This migration adds indexes that were not included in the initial table creation

CREATE INDEX IF NOT EXISTS idx_subscription_limits_history_tier ON public.subscription_limits_history(tier);
CREATE INDEX IF NOT EXISTS idx_subscription_limits_history_created_at ON public.subscription_limits_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_limits_history_changed_by ON public.subscription_limits_history(changed_by);

