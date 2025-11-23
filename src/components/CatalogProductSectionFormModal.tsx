import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CatalogProductSectionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogProjectId: string;
  sectionId?: string;
  onSuccess: () => void;
}

export function CatalogProductSectionFormModal({ open, onOpenChange, catalogProjectId, sectionId, onSuccess }: CatalogProductSectionFormModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        .from("catalog_product_sections")
        .select("*")
        .eq("id", sectionId)
        .single();

      if (error) throw error;
      setTitle(data.title);
    } catch (error) {
      console.error("Error fetching section:", error);
      toast.error(t('catalog.productSectionForm.messages.errorLoading'));
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
          .from("catalog_product_sections")
          .update({ title })
          .eq("id", sectionId);

        if (error) throw error;
        toast.success(t('catalog.productSectionForm.messages.sectionUpdated'));
      } else {
        // Obtener el máximo position actual para poner la nueva sección al final
        const { data: maxPositionData } = await supabase
          .from("catalog_product_sections")
          .select("position")
          .eq("catalog_project_id", catalogProjectId)
          .order("position", { ascending: false })
          .limit(1)
          .single();

        const maxPosition = maxPositionData?.position ?? -1;

        const { error } = await supabase
          .from("catalog_product_sections")
          .insert({
            catalog_project_id: catalogProjectId,
            title,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success(t('catalog.productSectionForm.messages.sectionCreated'));
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error(t('catalog.productSectionForm.messages.errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sectionId) return;
    
    try {
      setLoading(true);
      await supabase
        .from("catalog_products")
        .update({ catalog_product_section_id: null })
        .eq("catalog_product_section_id", sectionId);

      const { error } = await supabase
        .from("catalog_product_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      toast.success(t('catalog.detail.messages.sectionDeleted'));
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error(t('catalog.detail.messages.errorDeletingSection'));
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sectionId ? t('catalog.productSectionForm.edit') : t('catalog.productSectionForm.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('catalog.productSectionForm.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('catalog.productSectionForm.titlePlaceholder')}
              required
            />
          </div>

          <div className="flex justify-between items-center gap-2 pt-4">
            {sectionId && (
              <Button type="button" variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={loading}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {t('catalog.productSectionForm.cancel')}
              </Button>
              <Button type="submit" disabled={loading || !title}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {sectionId ? t('catalog.productSectionForm.update') : t('catalog.productSectionForm.create')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('catalog.projectDetail.confirmDeleteSection')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('catalog.projectDetail.confirmDeleteSectionDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

