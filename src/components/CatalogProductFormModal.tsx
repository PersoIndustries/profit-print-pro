import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CatalogProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogProjectId: string;
  productId?: string;
  onSuccess: () => void;
}

export function CatalogProductFormModal({ open, onOpenChange, catalogProjectId, productId, onSuccess }: CatalogProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [referenceCode, setReferenceCode] = useState("");
  const [name, setName] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [price, setPrice] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  useEffect(() => {
    if (open) {
      setHasUnsavedChanges(false);
      if (productId) {
        fetchProductData();
      } else {
        resetForm();
      }
    }
  }, [open, productId]);

  const fetchProductData = async () => {
    try {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;

      setReferenceCode(data.reference_code);
      setName(data.name);
      setDimensions(data.dimensions || "");
      setPrice(data.price.toString());
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Error al cargar el producto");
    }
  };

  const resetForm = () => {
    setReferenceCode("");
    setName("");
    setDimensions("");
    setPrice("");
    setHasUnsavedChanges(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        catalog_project_id: catalogProjectId,
        reference_code: referenceCode,
        name,
        dimensions: dimensions || null,
        price: parseFloat(price),
      };

      if (productId) {
        const { error } = await supabase
          .from("catalog_products")
          .update(productData)
          .eq("id", productId);

        if (error) throw error;
        toast.success("Producto actualizado");
      } else {
        // Obtener el máximo position actual para poner el nuevo producto al final
        const { data: maxPositionData } = await supabase
          .from("catalog_products")
          .select("position")
          .eq("catalog_project_id", catalogProjectId)
          .is("catalog_product_section_id", null)
          .order("position", { ascending: false })
          .limit(1)
          .single();

        const maxPosition = maxPositionData?.position ?? -1;

        const { error } = await supabase
          .from("catalog_products")
          .insert({
            ...productData,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success("Producto creado");
      }

      setHasUnsavedChanges(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error al guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{productId ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-code">Código de Referencia *</Label>
              <Input
                id="reference-code"
                value={referenceCode}
                onChange={(e) => {
                  setReferenceCode(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Ej: REF-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Nombre del producto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensiones</Label>
              <Input
                id="dimensions"
                value={dimensions}
                onChange={(e) => {
                  setDimensions(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Ej: 10x15x20 cm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !referenceCode || !name || !price}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {productId ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Estás seguro de que quieres salir sin guardar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
