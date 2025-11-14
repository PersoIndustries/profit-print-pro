-- Drop old triggers with CASCADE
DROP TRIGGER IF EXISTS trigger_reduce_inventory ON public.prints;
DROP TRIGGER IF EXISTS reduce_inventory_on_print ON public.prints CASCADE;
DROP FUNCTION IF EXISTS public.reduce_inventory_on_print() CASCADE;

DROP TRIGGER IF EXISTS log_print_movement_trigger ON public.prints;
DROP FUNCTION IF EXISTS public.log_print_movement() CASCADE;

-- Create print_materials table for multi-material prints
CREATE TABLE IF NOT EXISTS public.print_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  print_id UUID NOT NULL REFERENCES public.prints(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  weight_grams NUMERIC NOT NULL,
  material_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on print_materials
ALTER TABLE public.print_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for print_materials
CREATE POLICY "Users can view materials of own prints" 
ON public.print_materials 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.prints 
  WHERE prints.id = print_materials.print_id 
  AND prints.user_id = auth.uid()
));

CREATE POLICY "Users can insert materials to own prints" 
ON public.print_materials 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.prints 
  WHERE prints.id = print_materials.print_id 
  AND prints.user_id = auth.uid()
));

CREATE POLICY "Users can update materials of own prints" 
ON public.print_materials 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.prints 
  WHERE prints.id = print_materials.print_id 
  AND prints.user_id = auth.uid()
));

CREATE POLICY "Users can delete materials of own prints" 
ON public.print_materials 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.prints 
  WHERE prints.id = print_materials.print_id 
  AND prints.user_id = auth.uid()
));

-- Create new function to handle print status changes
CREATE OR REPLACE FUNCTION public.handle_print_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_material RECORD;
BEGIN
  -- Only process when status changes to 'completed' or 'failed'
  -- and the old status was 'pending_print'
  IF (NEW.status IN ('completed', 'failed') AND OLD.status = 'pending_print') THEN
    
    -- Process each material in the print
    FOR v_material IN 
      SELECT material_id, weight_grams 
      FROM public.print_materials 
      WHERE print_id = NEW.id
    LOOP
      -- Reduce inventory
      UPDATE public.inventory_items
      SET quantity_grams = quantity_grams - v_material.weight_grams
      WHERE user_id = NEW.user_id 
      AND material_id = v_material.material_id;
      
      -- Log the movement
      INSERT INTO public.inventory_movements (
        user_id,
        material_id,
        movement_type,
        quantity_grams,
        reference_id,
        notes
      ) VALUES (
        NEW.user_id,
        v_material.material_id,
        'print',
        -v_material.weight_grams,
        NEW.id,
        'Impresión: ' || NEW.name || ' (Estado: ' || NEW.status || ')'
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for print status changes
CREATE TRIGGER handle_print_status_change_trigger
AFTER UPDATE ON public.prints
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_print_status_change();