-- Create refund requests table
-- Users can request refunds which admins will review and approve/reject
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- Request details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  reason TEXT NOT NULL, -- User's reason for refund
  description TEXT, -- Detailed description of the issue
  refund_type TEXT NOT NULL CHECK (refund_type IN ('monthly_payment', 'annual_payment_error', 'application_issue', 'other')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who processed it
  admin_notes TEXT, -- Admin's notes/reason for approval/rejection
  
  -- Validation flags (set by system)
  is_within_time_limit BOOLEAN DEFAULT false,
  has_not_exceeded_limits BOOLEAN DEFAULT false,
  has_demonstrable_issue BOOLEAN DEFAULT false,
  is_current_month BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own refund requests
CREATE POLICY "Users can view own refund requests"
  ON public.refund_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own refund requests"
  ON public.refund_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and manage all refund requests
CREATE POLICY "Admins can manage refund requests"
  ON public.refund_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_requests_invoice_id ON public.refund_requests(invoice_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate refund request eligibility
CREATE OR REPLACE FUNCTION public.validate_refund_request(
  p_user_id UUID,
  p_invoice_id UUID,
  p_refund_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_subscription RECORD;
  v_days_since_payment INTEGER;
  v_materials_count INTEGER;
  v_projects_count INTEGER;
  v_orders_count INTEGER;
  v_materials_limit INTEGER;
  v_projects_limit INTEGER;
  v_orders_limit INTEGER;
  v_validation_result JSON;
  v_is_within_time_limit BOOLEAN := false;
  v_has_not_exceeded_limits BOOLEAN := false;
  v_has_demonstrable_issue BOOLEAN := false;
  v_is_current_month BOOLEAN := false;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id AND user_id = p_user_id;

  IF v_invoice IS NULL THEN
    RETURN json_build_object(
      'eligible', false,
      'errors', ARRAY['Invoice not found']
    );
  END IF;

  -- Get subscription details
  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  -- Calculate days since payment
  v_days_since_payment := EXTRACT(DAY FROM (NOW() - v_invoice.paid_date));

  -- Get current usage
  SELECT COUNT(*) INTO v_materials_count
  FROM public.materials
  WHERE user_id = p_user_id AND created_at >= v_invoice.paid_date;

  SELECT COUNT(*) INTO v_projects_count
  FROM public.projects
  WHERE user_id = p_user_id AND created_at >= v_invoice.paid_date;

  SELECT COUNT(*) INTO v_orders_count
  FROM public.orders
  WHERE user_id = p_user_id AND created_at >= v_invoice.paid_date;

  -- Get limits from subscription_limits
  SELECT materials, projects, monthly_orders INTO v_materials_limit, v_projects_limit, v_orders_limit
  FROM public.subscription_limits
  WHERE tier = COALESCE(v_subscription.tier, 'free');

  -- Validation 1: Time limit
  IF p_refund_type = 'annual_payment_error' THEN
    -- 15 days for annual payment errors
    v_is_within_time_limit := v_days_since_payment <= 15;
    IF NOT v_is_within_time_limit THEN
      v_errors := array_append(v_errors, 'El plazo máximo para solicitar refund por error de pago anual es de 15 días');
    END IF;
  ELSE
    -- 7 days (1 week) for other refunds
    v_is_within_time_limit := v_days_since_payment <= 7;
    IF NOT v_is_within_time_limit THEN
      v_errors := array_append(v_errors, 'El plazo máximo para solicitar refund es de 7 días desde el pago');
    END IF;
  END IF;

  -- Validation 2: Not exceeded limits
  v_has_not_exceeded_limits := 
    (v_materials_count < v_materials_limit OR v_materials_limit = 999999) AND
    (v_projects_count < v_projects_limit OR v_projects_limit = 999999) AND
    (v_orders_count < v_orders_limit OR v_orders_limit = 999999);
  
  IF NOT v_has_not_exceeded_limits THEN
    v_errors := array_append(v_errors, 'No se puede solicitar refund si se han utilizado los límites máximos del plan');
  END IF;

  -- Validation 3: Current month only (for monthly payments)
  IF p_refund_type = 'monthly_payment' THEN
    v_is_current_month := EXTRACT(MONTH FROM v_invoice.paid_date) = EXTRACT(MONTH FROM NOW()) 
                         AND EXTRACT(YEAR FROM v_invoice.paid_date) = EXTRACT(YEAR FROM NOW());
    IF NOT v_is_current_month THEN
      v_errors := array_append(v_errors, 'Solo se puede solicitar refund del mes actual');
    END IF;
  ELSE
    v_is_current_month := true; -- Not applicable for other types
  END IF;

  -- Validation 4: Demonstrable issue (for application_issue type)
  -- This is checked by admin, but we set the flag
  IF p_refund_type = 'application_issue' THEN
    v_has_demonstrable_issue := true; -- Will be verified by admin
  ELSE
    v_has_demonstrable_issue := true; -- Not applicable for other types
  END IF;

  -- Build result
  v_validation_result := json_build_object(
    'eligible', array_length(v_errors, 1) IS NULL,
    'errors', v_errors,
    'validation', json_build_object(
      'is_within_time_limit', v_is_within_time_limit,
      'has_not_exceeded_limits', v_has_not_exceeded_limits,
      'has_demonstrable_issue', v_has_demonstrable_issue,
      'is_current_month', v_is_current_month,
      'days_since_payment', v_days_since_payment,
      'usage', json_build_object(
        'materials', v_materials_count,
        'projects', v_projects_count,
        'orders', v_orders_count
      ),
      'limits', json_build_object(
        'materials', v_materials_limit,
        'projects', v_projects_limit,
        'orders', v_orders_limit
      )
    )
  );

  RETURN v_validation_result;
END;
$$;

-- Function to create refund request
CREATE OR REPLACE FUNCTION public.create_refund_request(
  p_user_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_description TEXT,
  p_refund_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation JSON;
  v_invoice RECORD;
  v_subscription_id UUID;
  v_request_id UUID;
  v_validation_data JSON;
BEGIN
  -- Validate the request
  v_validation := public.validate_refund_request(p_user_id, p_invoice_id, p_refund_type);
  
  IF NOT (v_validation->>'eligible')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'message', 'La solicitud de refund no cumple con los requisitos',
      'errors', v_validation->'errors'
    );
  END IF;

  -- Get invoice and subscription
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id AND user_id = p_user_id;

  SELECT id INTO v_subscription_id
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  v_validation_data := v_validation->'validation';

  -- Create refund request
  INSERT INTO public.refund_requests (
    user_id,
    subscription_id,
    invoice_id,
    amount,
    reason,
    description,
    refund_type,
    is_within_time_limit,
    has_not_exceeded_limits,
    has_demonstrable_issue,
    is_current_month
  )
  VALUES (
    p_user_id,
    v_subscription_id,
    p_invoice_id,
    p_amount,
    p_reason,
    p_description,
    p_refund_type,
    (v_validation_data->>'is_within_time_limit')::BOOLEAN,
    (v_validation_data->>'has_not_exceeded_limits')::BOOLEAN,
    (v_validation_data->>'has_demonstrable_issue')::BOOLEAN,
    (v_validation_data->>'is_current_month')::BOOLEAN
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Solicitud de refund creada exitosamente. Será revisada por un administrador.',
    'request_id', v_request_id
  );
END;
$$;

