-- Crear tabla de catálogos
CREATE TABLE IF NOT EXISTS public.catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en catalogs
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para catalogs
CREATE POLICY "Users can view own catalogs" ON public.catalogs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own catalogs" ON public.catalogs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catalogs" ON public.catalogs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own catalogs" ON public.catalogs
  FOR DELETE USING (auth.uid() = user_id);

-- Crear tabla de proyectos de catálogo
CREATE TABLE IF NOT EXISTS public.catalog_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en catalog_projects
ALTER TABLE public.catalog_projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para catalog_projects
CREATE POLICY "Users can view projects from own catalogs" ON public.catalog_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_projects.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in own catalogs" ON public.catalog_projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_projects.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects in own catalogs" ON public.catalog_projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_projects.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects from own catalogs" ON public.catalog_projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_projects.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

-- Crear tabla de productos de catálogo
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_project_id UUID NOT NULL REFERENCES public.catalog_projects(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL,
  name TEXT NOT NULL,
  dimensions TEXT,
  price NUMERIC NOT NULL,
  colors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en catalog_products
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para catalog_products
CREATE POLICY "Users can view products from own catalog projects" ON public.catalog_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_products.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create products in own catalog projects" ON public.catalog_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_products.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products in own catalog projects" ON public.catalog_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_products.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products from own catalog projects" ON public.catalog_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_products.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_catalogs_updated_at
  BEFORE UPDATE ON public.catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();

CREATE TRIGGER update_catalog_projects_updated_at
  BEFORE UPDATE ON public.catalog_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();

CREATE TRIGGER update_catalog_products_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();