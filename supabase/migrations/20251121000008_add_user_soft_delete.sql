-- Add soft delete functionality to profiles
-- Users will be marked for deletion and permanently deleted after 15 days

-- Add deletion fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for soft-deleted users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion ON public.profiles(scheduled_deletion_at) WHERE scheduled_deletion_at IS NOT NULL;

-- Function to schedule user deletion (15 days grace period)
CREATE OR REPLACE FUNCTION public.schedule_user_deletion(
  p_user_id UUID,
  p_deleted_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheduled_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate deletion date (15 days from now)
  v_scheduled_date := NOW() + INTERVAL '15 days';
  
  -- Update profile
  UPDATE public.profiles
  SET 
    deleted_at = NOW(),
    scheduled_deletion_at = v_scheduled_date,
    deleted_by = p_deleted_by,
    deletion_reason = p_reason
  WHERE id = p_user_id;
  
  -- Cancel/expire subscription
  UPDATE public.user_subscriptions
  SET status = 'cancelled', expires_at = NOW()
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Log the deletion
  INSERT INTO public.subscription_changes (
    user_id,
    admin_id,
    change_type,
    reason,
    notes
  )
  VALUES (
    p_user_id,
    p_deleted_by,
    'user_deletion_scheduled',
    'User scheduled for deletion',
    COALESCE(p_reason, 'No reason provided')
  );
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'scheduled_deletion_at', v_scheduled_date,
    'message', 'User scheduled for deletion. Will be permanently deleted in 15 days.'
  );
END;
$$;

-- Function to restore a deleted user
CREATE OR REPLACE FUNCTION public.restore_deleted_user(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restore profile
  UPDATE public.profiles
  SET 
    deleted_at = NULL,
    scheduled_deletion_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL
  WHERE id = p_user_id;
  
  -- Log the restoration
  INSERT INTO public.subscription_changes (
    user_id,
    change_type,
    reason,
    notes
  )
  VALUES (
    p_user_id,
    'user_restored',
    'User account restored',
    'User account was restored from scheduled deletion'
  );
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User account restored successfully'
  );
END;
$$;

-- Function to permanently delete users whose grace period has expired
-- This should be run daily via a cron job
CREATE OR REPLACE FUNCTION public.permanently_delete_expired_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_user_record RECORD;
BEGIN
  -- Find users whose deletion date has passed
  FOR v_user_record IN
    SELECT id, email
    FROM public.profiles
    WHERE scheduled_deletion_at IS NOT NULL
      AND scheduled_deletion_at <= NOW()
      AND deleted_at IS NOT NULL
  LOOP
    -- Delete user data (cascade will handle related records)
    -- Note: This will trigger CASCADE deletes on all related tables
    DELETE FROM public.profiles WHERE id = v_user_record.id;
    
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Permanently deleted %s user(s)', v_deleted_count)
  );
END;
$$;

-- Update RLS policies to exclude deleted users from normal queries
-- Users can only see their own profile if not deleted
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Admins can view all non-deleted users
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NULL);

-- Admins can view deleted users separately
CREATE POLICY "Admins can view deleted users"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

