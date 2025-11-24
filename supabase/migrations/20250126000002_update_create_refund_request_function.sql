-- Update create_refund_request function to automatically create a support ticket
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
  v_ticket_id UUID;
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

  -- Create support ticket automatically for this refund request
  -- Check if support_tickets table exists (for backward compatibility)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'support_tickets'
  ) THEN
    INSERT INTO public.support_tickets (
      user_id,
      ticket_type,
      related_entity_type,
      related_entity_id,
      title,
      description,
      status,
      priority,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      'refund_request',
      'refund_request',
      v_request_id,
      'Solicitud de Refund - €' || p_amount::TEXT,
      COALESCE(p_reason, '') || COALESCE(E'\n\n' || p_description, ''),
      'open',
      'medium',
      now(),
      now()
    )
    RETURNING id INTO v_ticket_id;

    -- Create initial message from user in the support ticket
    INSERT INTO public.support_messages (
      ticket_id,
      sender_id,
      sender_type,
      message,
      read,
      created_at
    )
    VALUES (
      v_ticket_id,
      p_user_id,
      'user',
      COALESCE(p_reason, '') || COALESCE(E'\n\n' || p_description, ''),
      false,
      now()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Solicitud de refund creada exitosamente. Será revisada por un administrador.',
    'request_id', v_request_id,
    'ticket_id', v_ticket_id
  );
END;
$$;

