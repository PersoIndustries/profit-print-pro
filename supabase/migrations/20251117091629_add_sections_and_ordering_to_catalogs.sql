-- Crear tabla de secciones de catálogo (para organizar proyectos)
CREATE TABLE IF NOT EXISTS public.catalog_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en catalog_sections
ALTER TABLE public.catalog_sections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para catalog_sections
CREATE POLICY "Users can view sections from own catalogs" ON public.catalog_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_sections.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sections in own catalogs" ON public.catalog_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_sections.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sections in own catalogs" ON public.catalog_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_sections.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sections from own catalogs" ON public.catalog_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.catalogs
      WHERE catalogs.id = catalog_sections.catalog_id
      AND catalogs.user_id = auth.uid()
    )
  );

-- Crear tabla de secciones de productos (para organizar productos dentro de un proyecto)
CREATE TABLE IF NOT EXISTS public.catalog_product_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_project_id UUID NOT NULL REFERENCES public.catalog_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en catalog_product_sections
ALTER TABLE public.catalog_product_sections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para catalog_product_sections
CREATE POLICY "Users can view product sections from own catalog projects" ON public.catalog_product_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_product_sections.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create product sections in own catalog projects" ON public.catalog_product_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_product_sections.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update product sections in own catalog projects" ON public.catalog_product_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_product_sections.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete product sections from own catalog projects" ON public.catalog_product_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.catalog_projects cp
      JOIN public.catalogs c ON c.id = cp.catalog_id
      WHERE cp.id = catalog_product_sections.catalog_project_id
      AND c.user_id = auth.uid()
    )
  );

-- Agregar campos de orden y sección a catalog_projects
ALTER TABLE public.catalog_projects
  ADD COLUMN IF NOT EXISTS catalog_section_id UUID REFERENCES public.catalog_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Agregar campos de orden y sección a catalog_products
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS catalog_product_section_id UUID REFERENCES public.catalog_product_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_catalog_sections_catalog_id ON public.catalog_sections(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sections_position ON public.catalog_sections(catalog_id, position);
CREATE INDEX IF NOT EXISTS idx_catalog_projects_section_id ON public.catalog_projects(catalog_section_id);
CREATE INDEX IF NOT EXISTS idx_catalog_projects_position ON public.catalog_projects(catalog_id, position);
CREATE INDEX IF NOT EXISTS idx_catalog_product_sections_project_id ON public.catalog_product_sections(catalog_project_id);
CREATE INDEX IF NOT EXISTS idx_catalog_product_sections_position ON public.catalog_product_sections(catalog_project_id, position);
CREATE INDEX IF NOT EXISTS idx_catalog_products_section_id ON public.catalog_products(catalog_product_section_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_position ON public.catalog_products(catalog_project_id, position);

-- Trigger para actualizar updated_at en catalog_sections
CREATE TRIGGER update_catalog_sections_updated_at
  BEFORE UPDATE ON public.catalog_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();

-- Trigger para actualizar updated_at en catalog_product_sections
CREATE TRIGGER update_catalog_product_sections_updated_at
  BEFORE UPDATE ON public.catalog_product_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_updated_at();

-- Comentarios
COMMENT ON TABLE public.catalog_sections IS 'Secciones para organizar proyectos dentro de un catálogo';
COMMENT ON TABLE public.catalog_product_sections IS 'Secciones para organizar productos dentro de un proyecto de catálogo';
COMMENT ON COLUMN public.catalog_projects.catalog_section_id IS 'ID de la sección a la que pertenece este proyecto (NULL si no está en ninguna sección)';
COMMENT ON COLUMN public.catalog_projects.position IS 'Posición de orden dentro de la sección o catálogo';
COMMENT ON COLUMN public.catalog_products.catalog_product_section_id IS 'ID de la sección a la que pertenece este producto (NULL si no está en ninguna sección)';
COMMENT ON COLUMN public.catalog_products.position IS 'Posición de orden dentro de la sección o proyecto';

