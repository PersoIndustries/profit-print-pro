-- Add unit_type to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'g';

-- Add printer_id to prints table
ALTER TABLE public.prints 
ADD COLUMN IF NOT EXISTS printer_id uuid REFERENCES public.printers(id) ON DELETE SET NULL;

-- Create printer_maintenance_parts table
CREATE TABLE IF NOT EXISTS public.printer_maintenance_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  maintenance_hours numeric NOT NULL DEFAULT 0,
  current_hours numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on printer_maintenance_parts
ALTER TABLE public.printer_maintenance_parts ENABLE ROW LEVEL SECURITY;

-- RLS policies for printer_maintenance_parts
CREATE POLICY "Users can view parts of own printers"
  ON public.printer_maintenance_parts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_parts.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parts to own printers"
  ON public.printer_maintenance_parts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_parts.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parts of own printers"
  ON public.printer_maintenance_parts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_parts.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parts of own printers"
  ON public.printer_maintenance_parts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_parts.printer_id
      AND printers.user_id = auth.uid()
    )
  );

-- Add trigger to update printer usage hours when print is completed or failed
CREATE OR REPLACE FUNCTION public.update_printer_usage_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when status changes to 'completed' or 'failed'
  IF (NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed')) THEN
    -- Update printer usage_hours if printer_id is set
    IF NEW.printer_id IS NOT NULL THEN
      UPDATE public.printers
      SET usage_hours = usage_hours + NEW.print_time_hours
      WHERE id = NEW.printer_id;
      
      -- Also update current_hours for all maintenance parts of this printer
      UPDATE public.printer_maintenance_parts
      SET current_hours = current_hours + NEW.print_time_hours
      WHERE printer_id = NEW.printer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for printer usage hours
DROP TRIGGER IF EXISTS trigger_update_printer_usage_hours ON public.prints;
CREATE TRIGGER trigger_update_printer_usage_hours
  BEFORE UPDATE ON public.prints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_printer_usage_hours();

-- Add updated_at trigger for printer_maintenance_parts
CREATE TRIGGER update_printer_maintenance_parts_updated_at
  BEFORE UPDATE ON public.printer_maintenance_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();