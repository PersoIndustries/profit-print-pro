-- Create printers table for tracking 3D printers
CREATE TABLE IF NOT EXISTS public.printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  usage_hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- RLS policies for printers
CREATE POLICY "Users can view own printers"
  ON public.printers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own printers"
  ON public.printers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own printers"
  ON public.printers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own printers"
  ON public.printers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_printers_updated_at
  BEFORE UPDATE ON public.printers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX idx_printers_user_id ON public.printers(user_id);
CREATE INDEX idx_printers_brand ON public.printers(brand);

