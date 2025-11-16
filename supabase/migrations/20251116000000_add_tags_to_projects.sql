-- Add tags column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance when filtering by tags
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING GIN (tags);

-- Add comment to explain the column
COMMENT ON COLUMN public.projects.tags IS 'Array of tags as JSON strings for categorizing projects';

