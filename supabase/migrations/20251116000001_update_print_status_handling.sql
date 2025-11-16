-- Update function to handle print status changes to 'completed' or 'failed' from any previous state
-- and ensure inventory can go negative

CREATE OR REPLACE FUNCTION public.handle_print_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_material RECORD;
  v_project_material_id UUID;
  v_material_used NUMERIC;
  v_has_print_materials BOOLEAN;
BEGIN
  -- Only process when status changes to 'completed' or 'failed'
  -- and the old status was NOT already 'completed' or 'failed' (to avoid double processing)
  IF (NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed')) THEN
    
    -- Check if print has print_materials
    SELECT EXISTS(SELECT 1 FROM public.print_materials WHERE print_id = NEW.id) INTO v_has_print_materials;
    
    IF v_has_print_materials THEN
      -- Process each material in the print
      FOR v_material IN 
        SELECT material_id, weight_grams 
        FROM public.print_materials 
        WHERE print_id = NEW.id
      LOOP
        -- Insert or update inventory (can go negative)
        -- If inventory item doesn't exist, create it with negative quantity
        -- Otherwise, reduce inventory
        INSERT INTO public.inventory_items (
          user_id,
          material_id,
          quantity_grams,
          min_stock_alert
        ) VALUES (
          NEW.user_id,
          v_material.material_id,
          -v_material.weight_grams,
          500
        )
        ON CONFLICT (user_id, material_id) 
        DO UPDATE SET quantity_grams = inventory_items.quantity_grams - v_material.weight_grams;
        
        -- Log the movement in history
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
    ELSE
      -- If print_materials is empty, try to use the old material_used_grams field (for backward compatibility)
      -- Get material_id from project_materials (first material)
      SELECT pm.material_id INTO v_project_material_id
      FROM public.project_materials pm
      WHERE pm.project_id = NEW.project_id
      LIMIT 1;
      
      -- If no project_materials, try to get from old project.material_id
      IF v_project_material_id IS NULL AND NEW.project_id IS NOT NULL THEN
        SELECT material_id INTO v_project_material_id
        FROM public.projects
        WHERE id = NEW.project_id;
      END IF;
      
      -- Set material_used from the print
      v_material_used := NEW.material_used_grams;
      
      -- If we have a material, process it
      IF v_project_material_id IS NOT NULL AND v_material_used > 0 THEN
        -- Insert or update inventory (can go negative)
        -- If inventory item doesn't exist, create it with negative quantity
        -- Otherwise, reduce inventory
        INSERT INTO public.inventory_items (
          user_id,
          material_id,
          quantity_grams,
          min_stock_alert
        ) VALUES (
          NEW.user_id,
          v_project_material_id,
          -v_material_used,
          500
        )
        ON CONFLICT (user_id, material_id) 
        DO UPDATE SET quantity_grams = inventory_items.quantity_grams - v_material_used;
        
        -- Log the movement in history
        INSERT INTO public.inventory_movements (
          user_id,
          material_id,
          movement_type,
          quantity_grams,
          reference_id,
          notes
        ) VALUES (
          NEW.user_id,
          v_project_material_id,
          'print',
          -v_material_used,
          NEW.id,
          'Impresión: ' || NEW.name || ' (Estado: ' || NEW.status || ')'
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS handle_print_status_change_trigger ON public.prints;
CREATE TRIGGER handle_print_status_change_trigger
AFTER UPDATE ON public.prints
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_print_status_change();

-- Add comment to explain that negative stock is allowed
COMMENT ON COLUMN public.inventory_items.quantity_grams IS 'Cantidad de material en gramos. Puede ser negativo si se ha usado más material del disponible.';

