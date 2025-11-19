-- Add display_type to catalog_sections (list, grid, full_page, etc.)
-- Default: 'list'
ALTER TABLE public.catalog_sections
ADD COLUMN IF NOT EXISTS display_type TEXT NOT NULL DEFAULT 'list';

-- Add theme to catalogs (default theme system)
-- Default: 'default'
ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'default';

-- Add constraint to ensure display_type is valid
ALTER TABLE public.catalog_sections
ADD CONSTRAINT check_display_type 
CHECK (display_type IN ('list', 'grid', 'full_page'));

