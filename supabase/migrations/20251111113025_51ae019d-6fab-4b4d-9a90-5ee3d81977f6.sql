-- Create tier_features table to configure which features are available per tier
CREATE TABLE IF NOT EXISTS public.tier_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  free_tier BOOLEAN NOT NULL DEFAULT false,
  tier_1 BOOLEAN NOT NULL DEFAULT false,
  tier_2 BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tier_features ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tier features
CREATE POLICY "Anyone can view tier features"
ON public.tier_features
FOR SELECT
USING (true);

-- Only admins can manage tier features
CREATE POLICY "Admins can insert tier features"
ON public.tier_features
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tier features"
ON public.tier_features
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tier features"
ON public.tier_features
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial feature configuration
INSERT INTO public.tier_features (feature_key, feature_name, description, free_tier, tier_1, tier_2) VALUES
  ('inventory_management', 'Gestión de Inventario', 'Control de stock y cantidades de materiales', false, false, true),
  ('acquisition_history', 'Historial de Adquisiciones', 'Registro de compras y reposiciones', false, false, true),
  ('movement_history', 'Historial de Movimientos', 'Registro completo de entradas y salidas', false, false, true),
  ('waste_tracking', 'Registro de Desperdicios', 'Control de material descartado', false, false, true),
  ('advanced_reports', 'Reportes Avanzados', 'Análisis detallado y exportación de datos', false, false, true),
  ('unlimited_materials', 'Materiales Ilimitados', 'Sin límite de tipos de materiales', false, false, true),
  ('unlimited_projects', 'Proyectos Ilimitados', 'Sin límite de proyectos', false, false, true),
  ('unlimited_orders', 'Pedidos Ilimitados', 'Sin límite de pedidos mensuales', false, false, true)
ON CONFLICT (feature_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_tier_features_updated_at
BEFORE UPDATE ON public.tier_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();