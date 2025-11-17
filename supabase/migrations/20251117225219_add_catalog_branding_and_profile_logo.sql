-- Add branding fields to catalogs table
-- show_powered_by: Feature for Business plan to hide "Powered by LAYER SUITE" (default: true)
-- brand_logo_url: URL to user's brand logo (uses profile brand_logo_url if not set)

ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- Add brand logo to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- Create storage bucket for brand logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-logos', 
  'brand-logos', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for brand logos
DROP POLICY IF EXISTS "Users can upload their own brand logos" ON storage.objects;
CREATE POLICY "Users can upload their own brand logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own brand logos" ON storage.objects;
CREATE POLICY "Users can view their own brand logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own brand logos" ON storage.objects;
CREATE POLICY "Users can update their own brand logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own brand logos" ON storage.objects;
CREATE POLICY "Users can delete their own brand logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Public brand logos are viewable by everyone" ON storage.objects;
CREATE POLICY "Public brand logos are viewable by everyone"
ON storage.objects
FOR SELECT
USING (bucket_id = 'brand-logos');

