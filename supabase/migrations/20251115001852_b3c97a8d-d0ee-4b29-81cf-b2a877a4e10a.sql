-- Add colors column to catalog_projects
ALTER TABLE public.catalog_projects 
ADD COLUMN colors jsonb DEFAULT '[]'::jsonb;

-- Remove colors column from catalog_products
ALTER TABLE public.catalog_products 
DROP COLUMN colors;

-- Add comment
COMMENT ON COLUMN public.catalog_projects.colors IS 'Array of color options for this catalog project';
