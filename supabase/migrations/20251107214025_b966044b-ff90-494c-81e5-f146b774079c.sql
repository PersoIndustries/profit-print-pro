-- Create project_materials junction table for many-to-many relationship (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_materials') THEN
    CREATE TABLE public.project_materials (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
      weight_grams NUMERIC NOT NULL,
      material_cost NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(project_id, material_id)
    );

    -- Enable RLS
    ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for project_materials
    CREATE POLICY "Users can view materials of own projects"
      ON public.project_materials
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_materials.project_id
          AND projects.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert materials to own projects"
      ON public.project_materials
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_materials.project_id
          AND projects.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can update materials of own projects"
      ON public.project_materials
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_materials.project_id
          AND projects.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can delete materials from own projects"
      ON public.project_materials
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_materials.project_id
          AND projects.user_id = auth.uid()
        )
      );

    -- Add index for better query performance
    CREATE INDEX idx_project_materials_project_id ON public.project_materials(project_id);
    CREATE INDEX idx_project_materials_material_id ON public.project_materials(material_id);
  END IF;
END $$;

-- Make material_id in projects nullable (for backward compatibility)
ALTER TABLE public.projects ALTER COLUMN material_id DROP NOT NULL;