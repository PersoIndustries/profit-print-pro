-- Create prints table for tracking print history
CREATE TABLE public.prints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  print_type TEXT NOT NULL CHECK (print_type IN ('order', 'tools', 'personal', 'operational')),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  print_time_hours NUMERIC NOT NULL DEFAULT 0,
  material_used_grams NUMERIC NOT NULL DEFAULT 0,
  print_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('printing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prints ENABLE ROW LEVEL SECURITY;

-- RLS policies for prints
CREATE POLICY "Users can view own prints"
  ON public.prints
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own prints"
  ON public.prints
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prints"
  ON public.prints
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prints"
  ON public.prints
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_prints_updated_at
  BEFORE UPDATE ON public.prints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX idx_prints_user_id ON public.prints(user_id);
CREATE INDEX idx_prints_order_id ON public.prints(order_id);
CREATE INDEX idx_prints_print_type ON public.prints(print_type);
CREATE INDEX idx_prints_print_date ON public.prints(print_date DESC);