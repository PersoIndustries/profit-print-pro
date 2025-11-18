-- Agregar campo de precio estimado a la lista de la compra
ALTER TABLE public.shopping_list
ADD COLUMN estimated_price NUMERIC;

