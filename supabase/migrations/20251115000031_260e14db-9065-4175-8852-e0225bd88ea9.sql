-- Arreglar función de updated_at con search_path seguro
DROP FUNCTION IF EXISTS public.update_catalog_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_catalog_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recrear triggers
CREATE TRIGGER update_catalogs_updated_at
  BEFORE UPDATE ON public.catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();

CREATE TRIGGER update_catalog_projects_updated_at
  BEFORE UPDATE ON public.catalog_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();

CREATE TRIGGER update_catalog_products_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();