-- Crear tabla de lista de la compra
CREATE TABLE public.shopping_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shopping_list
CREATE POLICY "Users can view own shopping list"
ON public.shopping_list
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping list"
ON public.shopping_list
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping list"
ON public.shopping_list
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping list"
ON public.shopping_list
FOR DELETE
USING (auth.uid() = user_id);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_shopping_list_updated_at
BEFORE UPDATE ON public.shopping_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

