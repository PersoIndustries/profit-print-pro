import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CatalogSectionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  sectionId?: string;
  onSuccess: () => void;
}

export function CatalogSectionFormModal({ open, onOpenChange, catalogId, sectionId, onSuccess }: CatalogSectionFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) {
      if (sectionId) {
        fetchSectionData();
      } else {
        resetForm();
      }
    }
  }, [open, sectionId]);

  const fetchSectionData = async () => {
    try {
      const { data, error } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("id", sectionId)
        .single();

      if (error) throw error;
      setTitle(data.title);
    } catch (error) {
      console.error("Error fetching section:", error);
      toast.error("Error al cargar la sección");
    }
  };

  const resetForm = () => {
    setTitle("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (sectionId) {
        const { error } = await supabase
          .from("catalog_sections")
          .update({ title })
          .eq("id", sectionId);

        if (error) throw error;
        toast.success("Sección actualizada");
      } else {
        // Obtener el máximo position actual para poner la nueva sección al final
        const { data: maxPositionData } = await supabase
          .from("catalog_sections")
          .select("position")
          .eq("catalog_id", catalogId)
          .order("position", { ascending: false })
          .limit(1)
          .single();

        const maxPosition = maxPositionData?.position ?? -1;

        const { error } = await supabase
          .from("catalog_sections")
          .insert({
            catalog_id: catalogId,
            title,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success("Sección creada");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Error al guardar la sección");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sectionId ? "Editar Sección" : "Nueva Sección"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título de la Sección *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Productos Premium"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {sectionId ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

