import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Crown, Loader2, FolderOpen } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Catalog {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  _count?: { projects: number };
}

export default function Catalogs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isEnterprise, loading: tierLoading } = useTierFeatures();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCatalogs();
    }
  }, [user]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingCatalog) {
        setFormName(editingCatalog.name);
        setFormDescription(editingCatalog.description || "");
      } else {
        setFormName("");
        setFormDescription("");
      }
      setHasUnsavedChanges(false);
    }
  }, [isFormOpen, editingCatalog]);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);

      const { data: catalogsData, error } = await supabase
        .from("catalogs")
        .select(`
          *,
          catalog_projects (count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const catalogsWithCount = (catalogsData || []).map((catalog: any) => ({
        ...catalog,
        _count: {
          projects: catalog.catalog_projects?.[0]?.count || 0
        }
      }));

      setCatalogs(catalogsWithCount);
    } catch (error) {
      console.error("Error fetching catalogs:", error);
      toast.error(t('catalog.messages.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (catalogId: string) => {
    if (!confirm(t('catalog.messages.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from("catalogs")
        .delete()
        .eq("id", catalogId);

      if (error) throw error;
      toast.success(t('catalog.messages.catalogDeleted'));
      fetchCatalogs();
    } catch (error) {
      console.error("Error deleting catalog:", error);
      toast.error(t('catalog.messages.errorDeleting'));
    }
  };

  const handleEdit = (catalog: Catalog) => {
    setEditingCatalog(catalog);
    setIsFormOpen(true);
  };

  const handleNewCatalog = () => {
    setEditingCatalog(null);
    setIsFormOpen(true);
  };

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      setIsFormOpen(false);
      setEditingCatalog(null);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    setIsFormOpen(false);
    setEditingCatalog(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCatalog) {
        const { error } = await supabase
          .from("catalogs")
          .update({
            name: formName,
            description: formDescription || null,
          })
          .eq("id", editingCatalog.id);

        if (error) throw error;
        toast.success(t('catalog.messages.catalogUpdated'));
      } else {
        const { error } = await supabase
          .from("catalogs")
          .insert({
            name: formName,
            description: formDescription || null,
            user_id: user!.id,
          });

        if (error) throw error;
        toast.success(t('catalog.messages.catalogCreated'));
      }

      setHasUnsavedChanges(false);
      setIsFormOpen(false);
      setEditingCatalog(null);
      fetchCatalogs();
    } catch (error) {
      console.error("Error saving catalog:", error);
      toast.error(t('catalog.messages.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  if (tierLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isPro && !isEnterprise) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              {t('catalog.proFeature')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('catalog.proDescription')}
            </p>
            <Button onClick={() => navigate("/pricing")}>
              {t('catalog.viewPlans')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('catalog.title')}</h1>
          <p className="text-muted-foreground">{t('catalog.subtitle')}</p>
        </div>
        <Button onClick={handleNewCatalog}>
          <Plus className="w-4 h-4 mr-2" />
          {t('catalog.newCatalog')}
        </Button>
      </div>

      {catalogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">{t('catalog.empty.title')}</p>
            <p className="text-sm mb-4">{t('catalog.empty.description')}</p>
            <Button onClick={handleNewCatalog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('catalog.empty.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogs.map((catalog) => (
            <Card 
              key={catalog.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/catalogs/${catalog.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{catalog.name}</span>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(catalog)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(catalog.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {catalog.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {catalog.description}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {catalog._count?.projects || 0} {t('catalog.card.projects')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/catalogs/${catalog.id}`);
                    }}
                  >
                    {t('catalog.card.viewProjects')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCatalog ? t('catalog.form.edit') : t('catalog.form.new')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('catalog.form.name')}</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.form.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('catalog.form.description')}</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => {
                  setFormDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.form.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={saving}>
                {t('catalog.form.cancel')}
              </Button>
              <Button type="submit" disabled={saving || !formName}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCatalog ? t('catalog.form.update') : t('catalog.form.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('catalog.form.unsaved.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('catalog.form.unsaved.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('catalog.form.unsaved.continueEditing')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              {t('catalog.form.unsaved.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
