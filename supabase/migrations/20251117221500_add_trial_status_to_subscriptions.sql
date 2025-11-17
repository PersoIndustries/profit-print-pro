-- Add 'trial' status to user_subscriptions status constraint
-- This is needed for the trial functionality when users sign up

ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'suspended', 'trial'));

