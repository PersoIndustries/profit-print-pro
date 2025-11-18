-- Crear tabla de listas de compra
CREATE TABLE public.shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shopping_lists
CREATE POLICY "Users can view own shopping lists"
ON public.shopping_lists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping lists"
ON public.shopping_lists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping lists"
ON public.shopping_lists
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping lists"
ON public.shopping_lists
FOR DELETE
USING (auth.uid() = user_id);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_shopping_lists_updated_at
BEFORE UPDATE ON public.shopping_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

