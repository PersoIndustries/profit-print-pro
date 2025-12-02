-- Create printer_maintenance_history table
CREATE TABLE IF NOT EXISTS public.printer_maintenance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.printer_maintenance_parts(id) ON DELETE SET NULL,
  maintenance_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create printer_maintenance_materials table for materials used in maintenance
CREATE TABLE IF NOT EXISTS public.printer_maintenance_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id uuid NOT NULL REFERENCES public.printer_maintenance_history(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity_grams numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printer_maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_maintenance_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for printer_maintenance_history
CREATE POLICY "Users can view maintenance history of own printers"
  ON public.printer_maintenance_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_history.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert maintenance history for own printers"
  ON public.printer_maintenance_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_history.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update maintenance history of own printers"
  ON public.printer_maintenance_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_history.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete maintenance history of own printers"
  ON public.printer_maintenance_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.printers
      WHERE printers.id = printer_maintenance_history.printer_id
      AND printers.user_id = auth.uid()
    )
  );

-- RLS policies for printer_maintenance_materials
CREATE POLICY "Users can view maintenance materials of own printers"
  ON public.printer_maintenance_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.printer_maintenance_history
      JOIN public.printers ON printers.id = printer_maintenance_history.printer_id
      WHERE printer_maintenance_history.id = printer_maintenance_materials.maintenance_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert maintenance materials for own printers"
  ON public.printer_maintenance_materials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.printer_maintenance_history
      JOIN public.printers ON printers.id = printer_maintenance_history.printer_id
      WHERE printer_maintenance_history.id = printer_maintenance_materials.maintenance_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update maintenance materials of own printers"
  ON public.printer_maintenance_materials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.printer_maintenance_history
      JOIN public.printers ON printers.id = printer_maintenance_history.printer_id
      WHERE printer_maintenance_history.id = printer_maintenance_materials.maintenance_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete maintenance materials of own printers"
  ON public.printer_maintenance_materials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.printer_maintenance_history
      JOIN public.printers ON printers.id = printer_maintenance_history.printer_id
      WHERE printer_maintenance_history.id = printer_maintenance_materials.maintenance_id
      AND printers.user_id = auth.uid()
    )
  );

-- Add indexes for better query performance
CREATE INDEX idx_printer_maintenance_history_printer_id ON public.printer_maintenance_history(printer_id);
CREATE INDEX idx_printer_maintenance_history_part_id ON public.printer_maintenance_history(part_id);
CREATE INDEX idx_printer_maintenance_history_date ON public.printer_maintenance_history(maintenance_date DESC);
CREATE INDEX idx_printer_maintenance_materials_maintenance_id ON public.printer_maintenance_materials(maintenance_id);
CREATE INDEX idx_printer_maintenance_materials_material_id ON public.printer_maintenance_materials(material_id);

