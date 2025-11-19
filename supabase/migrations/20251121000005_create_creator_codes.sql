-- Create creator codes table
-- These are affiliate/influencer codes that creators can share with their followers
CREATE TABLE IF NOT EXISTS public.creator_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Benefits for users who use the code
  trial_days INTEGER NOT NULL DEFAULT 0, -- Days of trial to grant
  tier_granted subscription_tier NOT NULL DEFAULT 'tier_1', -- Tier to grant (e.g., tier_2 for Business)
  discount_percentage NUMERIC(5,2) DEFAULT 0, -- Percentage discount (0-100)
  
  -- Creator commission
  creator_commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- % commission for creator
  
  -- Code settings
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) -- Admin who created it
);

-- Create creator code uses tracking table
CREATE TABLE IF NOT EXISTS public.creator_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_code_id UUID NOT NULL REFERENCES public.creator_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What was granted
  trial_days_granted INTEGER NOT NULL DEFAULT 0,
  tier_granted subscription_tier NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Commission tracking
  creator_commission_percentage NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) DEFAULT 0, -- Calculated commission (if applicable)
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  commission_paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one use per user per code
  UNIQUE(user_id, creator_code_id)
);

-- Enable RLS
ALTER TABLE public.creator_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_code_uses ENABLE ROW LEVEL SECURITY;

-- Policies for creator_codes
-- Creators can view their own codes
CREATE POLICY "Creators can view own codes"
  ON public.creator_codes
  FOR SELECT
  USING (auth.uid() = creator_user_id);

-- Admins can manage all creator codes
CREATE POLICY "Admins can manage creator codes"
  ON public.creator_codes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active codes (to validate them)
CREATE POLICY "Anyone can view active creator codes"
  ON public.creator_codes
  FOR SELECT
  USING (is_active = true);

-- Policies for creator_code_uses
-- Users can view their own code usage
CREATE POLICY "Users can view own creator code usage"
  ON public.creator_code_uses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Creators can view uses of their codes
CREATE POLICY "Creators can view uses of their codes"
  ON public.creator_code_uses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_codes
      WHERE creator_codes.id = creator_code_uses.creator_code_id
      AND creator_codes.creator_user_id = auth.uid()
    )
  );

-- Admins can view all code uses
CREATE POLICY "Admins can view all creator code uses"
  ON public.creator_code_uses
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_creator_codes_creator_user_id ON public.creator_codes(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_creator_codes_code ON public.creator_codes(code);
CREATE INDEX IF NOT EXISTS idx_creator_code_uses_creator_code_id ON public.creator_code_uses(creator_code_id);
CREATE INDEX IF NOT EXISTS idx_creator_code_uses_user_id ON public.creator_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_code_uses_commission_paid ON public.creator_code_uses(commission_paid);

-- Create trigger to update updated_at
CREATE TRIGGER update_creator_codes_updated_at
BEFORE UPDATE ON public.creator_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to apply creator code
CREATE OR REPLACE FUNCTION public.apply_creator_code(
  _code TEXT,
  _user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_code RECORD;
  v_already_used BOOLEAN;
  v_subscription RECORD;
  v_new_expires_at TIMESTAMP WITH TIME ZONE;
  v_new_tier subscription_tier;
BEGIN
  -- Get creator code details
  SELECT * INTO v_creator_code
  FROM public.creator_codes
  WHERE code = _code AND is_active = true;

  -- Validate creator code exists
  IF v_creator_code IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Código de creador no válido o inactivo');
  END IF;

  -- Check if expired
  IF v_creator_code.expires_at IS NOT NULL AND v_creator_code.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'message', 'Código de creador expirado');
  END IF;

  -- Check if max uses reached
  IF v_creator_code.max_uses IS NOT NULL AND v_creator_code.current_uses >= v_creator_code.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'Código de creador ha alcanzado el límite de usos');
  END IF;

  -- Check if user already used this code
  SELECT EXISTS(
    SELECT 1 FROM public.creator_code_uses
    WHERE user_id = _user_id AND creator_code_id = v_creator_code.id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN json_build_object('success', false, 'message', 'Ya has usado este código de creador');
  END IF;

  -- Get user's current subscription
  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = _user_id;

  -- Calculate new expiration date (add trial days)
  IF v_creator_code.trial_days > 0 THEN
    IF v_subscription.expires_at IS NOT NULL AND v_subscription.expires_at > NOW() THEN
      -- Extend existing subscription
      v_new_expires_at := v_subscription.expires_at + (v_creator_code.trial_days || ' days')::INTERVAL;
    ELSE
      -- Start new trial
      v_new_expires_at := NOW() + (v_creator_code.trial_days || ' days')::INTERVAL;
    END IF;
  ELSE
    v_new_expires_at := v_subscription.expires_at;
  END IF;

  -- Determine new tier (upgrade if creator code tier is higher)
  IF v_creator_code.tier_granted = 'tier_2' THEN
    v_new_tier := 'tier_2';
  ELSIF v_creator_code.tier_granted = 'tier_1' AND (v_subscription.tier = 'free' OR v_subscription.tier IS NULL) THEN
    v_new_tier := 'tier_1';
  ELSE
    v_new_tier := COALESCE(v_subscription.tier, 'free');
  END IF;

  -- Update or create user subscription
  IF v_subscription.id IS NOT NULL THEN
    UPDATE public.user_subscriptions
    SET 
      tier = v_new_tier,
      status = CASE 
        WHEN v_creator_code.trial_days > 0 THEN 'trial'
        ELSE 'active'
      END,
      expires_at = v_new_expires_at,
      updated_at = NOW()
    WHERE user_id = _user_id;
  ELSE
    INSERT INTO public.user_subscriptions (
      user_id,
      tier,
      status,
      expires_at
    ) VALUES (
      _user_id,
      v_new_tier,
      CASE 
        WHEN v_creator_code.trial_days > 0 THEN 'trial'
        ELSE 'active'
      END,
      v_new_expires_at
    );
  END IF;

  -- Track creator code usage
  INSERT INTO public.creator_code_uses (
    creator_code_id,
    user_id,
    trial_days_granted,
    tier_granted,
    discount_percentage,
    creator_commission_percentage
  )
  VALUES (
    v_creator_code.id,
    _user_id,
    v_creator_code.trial_days,
    v_new_tier,
    v_creator_code.discount_percentage,
    v_creator_code.creator_commission_percentage
  );

  -- Increment current uses
  UPDATE public.creator_codes
  SET current_uses = current_uses + 1
  WHERE id = v_creator_code.id;

  -- Log the change
  INSERT INTO public.subscription_changes (
    user_id,
    change_type,
    previous_tier,
    new_tier,
    reason,
    notes
  )
  VALUES (
    _user_id,
    'promo_code_applied',
    COALESCE(v_subscription.tier, 'free'),
    v_new_tier,
    'Código de creador aplicado: ' || _code,
    v_creator_code.description || ' | Trial: ' || v_creator_code.trial_days || ' días | Descuento: ' || v_creator_code.discount_percentage || '%'
  );

  RETURN json_build_object(
    'success', true, 
    'message', 'Código de creador aplicado exitosamente',
    'tier', v_new_tier,
    'trial_days', v_creator_code.trial_days,
    'discount_percentage', v_creator_code.discount_percentage
  );
END;
$$;

-- Create view for creator earnings
CREATE OR REPLACE VIEW public.creator_earnings AS
SELECT 
  cc.creator_user_id,
  p.email as creator_email,
  p.full_name as creator_name,
  cc.code,
  COUNT(ccu.id) as total_uses,
  SUM(ccu.commission_amount) as total_commission,
  SUM(CASE WHEN ccu.commission_paid THEN ccu.commission_amount ELSE 0 END) as paid_commission,
  SUM(CASE WHEN NOT ccu.commission_paid THEN ccu.commission_amount ELSE 0 END) as pending_commission
FROM public.creator_codes cc
LEFT JOIN public.creator_code_uses ccu ON ccu.creator_code_id = cc.id
LEFT JOIN public.profiles p ON p.id = cc.creator_user_id
GROUP BY cc.creator_user_id, p.email, p.full_name, cc.code, cc.id;

-- Grant access to the view
GRANT SELECT ON public.creator_earnings TO authenticated;

