import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CatalogSectionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  sectionId?: string;
  onSuccess: () => void;
}

export function CatalogSectionFormModal({ open, onOpenChange, catalogId, sectionId, onSuccess }: CatalogSectionFormModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [displayType, setDisplayType] = useState<'list' | 'grid' | 'full_page'>('list');
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
        .from("catalog_sections")
        .select("*")
        .eq("id", sectionId)
        .single();

      if (error) throw error;
      setTitle(data.title);
      setDisplayType((data.display_type || 'list') as 'full_page' | 'grid' | 'list');
    } catch (error) {
      console.error("Error fetching section:", error);
      toast.error(t('catalog.sectionForm.messages.errorLoading'));
    }
  };

  const resetForm = () => {
    setTitle("");
    setDisplayType('list');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (sectionId) {
        const { error } = await supabase
          .from("catalog_sections")
          .update({ title, display_type: displayType })
          .eq("id", sectionId);

        if (error) throw error;
        toast.success(t('catalog.sectionForm.messages.sectionUpdated'));
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
            display_type: displayType,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success(t('catalog.sectionForm.messages.sectionCreated'));
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error(t('catalog.sectionForm.messages.errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sectionId) return;
    
    try {
      setLoading(true);
      await supabase
        .from("catalog_projects")
        .update({ catalog_section_id: null })
        .eq("catalog_section_id", sectionId);

      const { error } = await supabase
        .from("catalog_sections")
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
          <DialogTitle>{sectionId ? t('catalog.sectionForm.edit') : t('catalog.sectionForm.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('catalog.sectionForm.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('catalog.sectionForm.titlePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-type">{t('catalog.sectionForm.displayType')}</Label>
            <Select value={displayType} onValueChange={(value: 'list' | 'grid' | 'full_page') => setDisplayType(value)}>
              <SelectTrigger id="display-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">{t('catalog.sectionForm.displayTypeList')}</SelectItem>
                <SelectItem value="grid">{t('catalog.sectionForm.displayTypeGrid')}</SelectItem>
                <SelectItem value="full_page" disabled>{t('catalog.sectionForm.displayTypeFullPage')} ({t('common.comingSoon')})</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('catalog.sectionForm.displayTypeDesc')}
            </p>
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
                {t('catalog.sectionForm.cancel')}
              </Button>
              <Button type="submit" disabled={loading || !title}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {sectionId ? t('catalog.sectionForm.update') : t('catalog.sectionForm.create')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('catalog.detail.messages.confirmDeleteSection')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('catalog.detail.messages.confirmDeleteSectionDesc')}
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

