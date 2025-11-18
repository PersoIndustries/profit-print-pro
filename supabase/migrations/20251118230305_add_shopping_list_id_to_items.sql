-- Agregar referencia a shopping_lists en shopping_list (solo si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shopping_list' 
    AND column_name = 'shopping_list_id'
  ) THEN
    ALTER TABLE public.shopping_list
    ADD COLUMN shopping_list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índice para mejorar el rendimiento de las consultas (solo si no existe)
CREATE INDEX IF NOT EXISTS idx_shopping_list_shopping_list_id ON public.shopping_list(shopping_list_id);

-- Migrar datos existentes: crear una lista por defecto para cada usuario que tenga items
INSERT INTO public.shopping_lists (user_id, name)
SELECT DISTINCT user_id, 'Lista Principal' as name
FROM public.shopping_list
WHERE shopping_list_id IS NULL
ON CONFLICT DO NOTHING;

-- Actualizar items existentes para que apunten a su lista por defecto
UPDATE public.shopping_list sl
SET shopping_list_id = sl2.id
FROM (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM public.shopping_lists
  ORDER BY user_id, created_at
) sl2
WHERE sl.user_id = sl2.user_id
AND sl.shopping_list_id IS NULL;

