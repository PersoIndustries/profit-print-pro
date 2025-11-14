-- Create storage bucket for catalog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images', 
  'catalog-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for catalog images
CREATE POLICY "Users can upload their own catalog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'catalog-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own catalog images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'catalog-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own catalog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'catalog-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own catalog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'catalog-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public catalog images are viewable by everyone"
ON storage.objects
FOR SELECT
USING (bucket_id = 'catalog-images');

-- Create catalog_items table
CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  reference_code TEXT NOT NULL,
  name TEXT NOT NULL,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  pvp_price NUMERIC NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for catalog_items
CREATE POLICY "Users can view own catalog items"
ON public.catalog_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catalog items"
ON public.catalog_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catalog items"
ON public.catalog_items
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own catalog items"
ON public.catalog_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_catalog_items_updated_at
BEFORE UPDATE ON public.catalog_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();