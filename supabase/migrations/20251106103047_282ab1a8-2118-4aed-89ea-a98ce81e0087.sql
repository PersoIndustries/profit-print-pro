-- Fix generate_invoice_number function with proper security definer
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_month TEXT;
  counter INTEGER;
  invoice_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COUNT(*) + 1 INTO counter
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';
  
  invoice_num := 'INV-' || year_month || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$;