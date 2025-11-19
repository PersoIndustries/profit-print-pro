-- Add season field to catalogs table
-- season: Text field for season information (e.g., "2025", "Q2 2025", etc.)

ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS season TEXT;

