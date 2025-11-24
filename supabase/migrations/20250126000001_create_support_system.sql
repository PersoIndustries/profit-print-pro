-- Create support tickets table (generic support system)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('refund_request', 'general_support', 'technical_issue', 'billing_question', 'feature_request')),
  related_entity_type TEXT, -- e.g., 'refund_request', 'invoice', 'subscription', etc.
  related_entity_id UUID, -- ID of the related entity (refund_request_id, invoice_id, etc.)
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'waiting_admin', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create support messages table (generic messaging system)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_type ON public.support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_related_entity ON public.support_tickets(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin ON public.support_tickets(assigned_admin_id);

-- Create indexes for support_messages
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON public.support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_read ON public.support_messages(read, ticket_id);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own support tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own support tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view and manage all support tickets
CREATE POLICY "Admins can manage all support tickets"
  ON public.support_tickets
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages for own tickets"
  ON public.support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for own tickets"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_type = 'user' AND
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update read status of own messages"
  ON public.support_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Admins can view and create messages for all tickets
CREATE POLICY "Admins can manage messages for all tickets"
  ON public.support_messages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_support_messages_as_read(
  p_ticket_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_messages
  SET read = true, read_at = now()
  WHERE ticket_id = p_ticket_id
    AND sender_id != p_user_id
    AND read = false;
END;
$$;

-- Function to update ticket status when new message is added
CREATE OR REPLACE FUNCTION public.update_ticket_status_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update ticket updated_at
  UPDATE public.support_tickets
  SET updated_at = now()
  WHERE id = NEW.ticket_id;

  -- Update ticket status based on sender
  IF NEW.sender_type = 'user' THEN
    UPDATE public.support_tickets
    SET status = 'waiting_admin'
    WHERE id = NEW.ticket_id AND status IN ('open', 'in_progress', 'resolved');
  ELSIF NEW.sender_type = 'admin' THEN
    UPDATE public.support_tickets
    SET status = 'waiting_user'
    WHERE id = NEW.ticket_id AND status IN ('open', 'in_progress');
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to update ticket status on new message
CREATE TRIGGER update_ticket_status_on_message_trigger
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_status_on_message();

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_support_messages_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.support_messages sm
  INNER JOIN public.support_tickets st ON sm.ticket_id = st.id
  WHERE st.user_id = p_user_id
    AND sm.sender_id != p_user_id
    AND sm.read = false;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Migrate existing refund requests to support tickets
-- This creates a support ticket for each existing refund request
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
SELECT 
  user_id,
  'refund_request'::TEXT,
  'refund_request'::TEXT,
  id,
  'Solicitud de Refund - €' || amount::TEXT,
  reason || COALESCE(E'\n\n' || description, ''),
  CASE 
    WHEN status = 'pending' THEN 'open'::TEXT
    WHEN status = 'approved' THEN 'in_progress'::TEXT
    WHEN status = 'processed' THEN 'resolved'::TEXT
    WHEN status = 'rejected' THEN 'closed'::TEXT
    ELSE 'open'::TEXT
  END,
  'medium'::TEXT,
  created_at,
  updated_at
FROM public.refund_requests
ON CONFLICT DO NOTHING;

-- Note: Migration of refund_request_messages will be handled separately
-- if that table exists, it can be migrated using a similar pattern

