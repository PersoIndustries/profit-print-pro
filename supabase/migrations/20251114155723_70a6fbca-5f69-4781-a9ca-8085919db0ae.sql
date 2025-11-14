-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for project images bucket
CREATE POLICY "Users can view project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

CREATE POLICY "Users can upload own project images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own project images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own project images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_url column to projects table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN image_url TEXT;
  END IF;
END $$;