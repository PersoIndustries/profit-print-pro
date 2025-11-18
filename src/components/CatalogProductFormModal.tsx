import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.error(t('catalog.productForm.messages.errorLoading'));
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
        toast.success(t('catalog.productForm.messages.productUpdated'));
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
        toast.success(t('catalog.productForm.messages.productCreated'));
      }

      setHasUnsavedChanges(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(t('catalog.productForm.messages.errorSaving'));
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
            <DialogTitle>{productId ? t('catalog.productForm.edit') : t('catalog.productForm.new')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-code">{t('catalog.productForm.referenceCode')}</Label>
              <Input
                id="reference-code"
                value={referenceCode}
                onChange={(e) => {
                  setReferenceCode(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.productForm.referenceCodePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('catalog.productForm.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.productForm.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">{t('catalog.productForm.dimensions')}</Label>
              <Input
                id="dimensions"
                value={dimensions}
                onChange={(e) => {
                  setDimensions(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.productForm.dimensionsPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">{t('catalog.productForm.price')}</Label>
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
                placeholder={t('catalog.productForm.pricePlaceholder')}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={loading}>
                {t('catalog.productForm.cancel')}
              </Button>
              <Button type="submit" disabled={loading || !referenceCode || !name || !price}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {productId ? t('catalog.productForm.update') : t('catalog.productForm.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('catalog.productForm.unsaved.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('catalog.productForm.unsaved.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('catalog.productForm.unsaved.continueEditing')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              {t('catalog.productForm.unsaved.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
