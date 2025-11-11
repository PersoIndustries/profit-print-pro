-- Create inventory_movements table to track all material movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('acquisition', 'print', 'waste', 'adjustment')),
  quantity_grams NUMERIC NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_material FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own movements"
ON public.inventory_movements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own movements"
ON public.inventory_movements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_inventory_movements_user_material ON public.inventory_movements(user_id, material_id);
CREATE INDEX idx_inventory_movements_created_at ON public.inventory_movements(created_at DESC);

-- Create trigger to log acquisition movements
CREATE OR REPLACE FUNCTION public.log_acquisition_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_movements (
    user_id,
    material_id,
    movement_type,
    quantity_grams,
    reference_id,
    notes
  ) VALUES (
    NEW.user_id,
    NEW.material_id,
    'acquisition',
    NEW.quantity_grams,
    NEW.id,
    NEW.notes
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_acquisition
AFTER INSERT ON public.material_acquisitions
FOR EACH ROW
EXECUTE FUNCTION public.log_acquisition_movement();

-- Create trigger to log print movements
CREATE OR REPLACE FUNCTION public.log_print_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_material_id UUID;
BEGIN
  -- Get material_id from project
  SELECT material_id INTO v_material_id
  FROM public.projects
  WHERE id = NEW.project_id;
  
  IF v_material_id IS NOT NULL THEN
    INSERT INTO public.inventory_movements (
      user_id,
      material_id,
      movement_type,
      quantity_grams,
      reference_id,
      notes
    ) VALUES (
      NEW.user_id,
      v_material_id,
      'print',
      -NEW.material_used_grams,
      NEW.id,
      'Impresión: ' || NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_print
AFTER INSERT ON public.prints
FOR EACH ROW
EXECUTE FUNCTION public.log_print_movement();