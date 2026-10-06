CREATE TABLE public.material_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'filament',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_types TO authenticated;
GRANT ALL ON public.material_types TO service_role;

ALTER TABLE public.material_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own material types" ON public.material_types FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own material types" ON public.material_types FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own material types" ON public.material_types FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own material types" ON public.material_types FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_material_types_updated_at BEFORE UPDATE ON public.material_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.materials ADD COLUMN material_type_id uuid REFERENCES public.material_types(id) ON DELETE SET NULL;
CREATE INDEX idx_materials_material_type_id ON public.materials(material_type_id);