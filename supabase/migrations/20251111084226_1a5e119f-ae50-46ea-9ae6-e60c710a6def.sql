-- Add is_favorite column to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;