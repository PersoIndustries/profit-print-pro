-- Crear tabla de inventario de materiales
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity_grams NUMERIC NOT NULL DEFAULT 0,
  min_stock_alert NUMERIC DEFAULT 500,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, material_id)
);

-- Crear tabla de adquisiciones de materiales
CREATE TABLE public.material_acquisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity_grams NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  supplier TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_acquisitions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para inventory_items
CREATE POLICY "Users can view own inventory"
ON public.inventory_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
ON public.inventory_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
ON public.inventory_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
ON public.inventory_items
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para material_acquisitions
CREATE POLICY "Users can view own acquisitions"
ON public.material_acquisitions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acquisitions"
ON public.material_acquisitions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own acquisitions"
ON public.material_acquisitions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own acquisitions"
ON public.material_acquisitions
FOR DELETE
USING (auth.uid() = user_id);

-- Crear trigger para actualizar updated_at en inventory_items
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para reducir inventario al crear una impresión
CREATE OR REPLACE FUNCTION public.reduce_inventory_on_print()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reducir la cantidad en el inventario
  UPDATE public.inventory_items
  SET quantity_grams = quantity_grams - NEW.material_used_grams
  WHERE user_id = NEW.user_id 
  AND material_id = (SELECT material_id FROM public.projects WHERE id = NEW.project_id);
  
  RETURN NEW;
END;
$$;

-- Crear trigger para reducir inventario
CREATE TRIGGER trigger_reduce_inventory
AFTER INSERT ON public.prints
FOR EACH ROW
EXECUTE FUNCTION public.reduce_inventory_on_print();