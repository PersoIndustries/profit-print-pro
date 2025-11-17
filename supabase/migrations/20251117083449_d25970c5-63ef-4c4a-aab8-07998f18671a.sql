-- Create promo codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  tier subscription_tier NOT NULL,
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create user promo codes tracking table
CREATE TABLE public.user_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tier_granted subscription_tier NOT NULL,
  UNIQUE(user_id, promo_code_id)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies for promo_codes
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for user_promo_codes
CREATE POLICY "Users can view own promo code usage"
  ON public.user_promo_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all promo code usage"
  ON public.user_promo_codes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to apply promo code
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  _code TEXT,
  _user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_code RECORD;
  v_already_used BOOLEAN;
  v_subscription_id UUID;
BEGIN
  -- Get promo code details
  SELECT * INTO v_promo_code
  FROM public.promo_codes
  WHERE code = _code AND is_active = true;

  -- Validate promo code exists
  IF v_promo_code IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Código no válido o inactivo');
  END IF;

  -- Check if expired
  IF v_promo_code.expires_at IS NOT NULL AND v_promo_code.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'message', 'Código expirado');
  END IF;

  -- Check if max uses reached
  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'Código ya ha alcanzado el límite de usos');
  END IF;

  -- Check if user already used this code
  SELECT EXISTS(
    SELECT 1 FROM public.user_promo_codes
    WHERE user_id = _user_id AND promo_code_id = v_promo_code.id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN json_build_object('success', false, 'message', 'Ya has usado este código');
  END IF;

  -- Get user's subscription
  SELECT id INTO v_subscription_id
  FROM public.user_subscriptions
  WHERE user_id = _user_id;

  -- Update user subscription
  UPDATE public.user_subscriptions
  SET 
    tier = v_promo_code.tier,
    status = 'active',
    expires_at = NULL, -- Permanent subscription
    updated_at = NOW()
  WHERE user_id = _user_id;

  -- Track promo code usage
  INSERT INTO public.user_promo_codes (user_id, promo_code_id, tier_granted)
  VALUES (_user_id, v_promo_code.id, v_promo_code.tier);

  -- Increment current uses
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo_code.id;

  -- Log the change
  INSERT INTO public.subscription_changes (
    user_id,
    change_type,
    previous_tier,
    new_tier,
    reason,
    notes
  )
  SELECT 
    _user_id,
    'promo_code_applied',
    us.tier,
    v_promo_code.tier,
    'Código promocional aplicado: ' || _code,
    v_promo_code.description
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Código aplicado exitosamente',
    'tier', v_promo_code.tier
  );
END;
$$;