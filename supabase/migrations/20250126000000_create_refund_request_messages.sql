-- Create refund request messages table for conversations between admin and user
CREATE TABLE IF NOT EXISTS public.refund_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refund_request_messages_refund_request_id ON public.refund_request_messages(refund_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_request_messages_sender_id ON public.refund_request_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_refund_request_messages_created_at ON public.refund_request_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.refund_request_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their own refund requests
CREATE POLICY "Users can view messages for own refund requests"
  ON public.refund_request_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.refund_requests
      WHERE refund_requests.id = refund_request_messages.refund_request_id
      AND refund_requests.user_id = auth.uid()
    )
  );

-- Users can create messages for their own refund requests
CREATE POLICY "Users can create messages for own refund requests"
  ON public.refund_request_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_type = 'user' AND
    EXISTS (
      SELECT 1 FROM public.refund_requests
      WHERE refund_requests.id = refund_request_messages.refund_request_id
      AND refund_requests.user_id = auth.uid()
    )
  );

-- Users can update read status of their own messages
CREATE POLICY "Users can update read status of own messages"
  ON public.refund_request_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.refund_requests
      WHERE refund_requests.id = refund_request_messages.refund_request_id
      AND refund_requests.user_id = auth.uid()
    )
  );

-- Admins can view and create messages for all refund requests
CREATE POLICY "Admins can manage messages for refund requests"
  ON public.refund_request_messages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_refund_messages_as_read(
  p_refund_request_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.refund_request_messages
  SET read = true
  WHERE refund_request_id = p_refund_request_id
    AND sender_id != p_user_id
    AND read = false;
END;
$$;

