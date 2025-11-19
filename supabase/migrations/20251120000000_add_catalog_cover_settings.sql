-- Add cover page settings to catalogs table
-- cover_background_url: URL to background image for cover page
-- show_logo_on_cover: Whether to show brand logo on cover page (default: true)
-- show_text_on_cover: Whether to show text on cover page (default: true)

ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS cover_background_url TEXT,
ADD COLUMN IF NOT EXISTS show_logo_on_cover BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_text_on_cover BOOLEAN NOT NULL DEFAULT true;

