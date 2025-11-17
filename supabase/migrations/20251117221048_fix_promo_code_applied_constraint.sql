-- Fix subscription_changes constraint to allow 'promo_code_applied' change type
-- This is needed for the promo code functionality to log changes correctly

ALTER TABLE public.subscription_changes
DROP CONSTRAINT IF EXISTS subscription_changes_change_type_check;

ALTER TABLE public.subscription_changes
ADD CONSTRAINT subscription_changes_change_type_check 
CHECK (change_type IN ('upgrade', 'downgrade', 'cancel', 'reactivate', 'refund', 'promo_code_applied'));

