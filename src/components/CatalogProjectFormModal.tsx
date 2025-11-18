import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HexColorPicker } from "react-colorful";

interface CatalogProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  projectId?: string;
  sectionId?: string;
  onSuccess: () => void;
}

interface ExistingProject {
  id: string;
  name: string;
  image_url: string | null;
}

export function CatalogProjectFormModal({ open, onOpenChange, catalogId, projectId, sectionId, onSuccess }: CatalogProjectFormModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [existingProjects, setExistingProjects] = useState<ExistingProject[]>([]);
  const [useExistingProject, setUseExistingProject] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [canEditNameAndImage, setCanEditNameAndImage] = useState(true);

  useEffect(() => {
    if (open) {
      setHasUnsavedChanges(false);
      if (projectId) {
        fetchProjectData();
      } else {
        resetForm();
        fetchExistingProjects();
      }
    }
  }, [open, projectId]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from("catalog_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      setName(data.name);
      setDescription(data.description || "");
      setImageUrl(data.image_url);
      setSelectedProjectId(data.project_id || "");
      setUseExistingProject(!!data.project_id);
      const colorsArray = Array.isArray(data.colors) ? data.colors.filter((c): c is string => typeof c === 'string') : [];
      setColors(colorsArray);
      setCanEditNameAndImage(true);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error(t('catalog.projectForm.messages.errorLoading'));
    }
  };

  const fetchExistingProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, image_url")
        .order("name");

      if (error) throw error;
      setExistingProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl(null);
    setSelectedProjectId("");
    setUseExistingProject(false);
    setColors([]);
    setCanEditNameAndImage(true);
    setHasUnsavedChanges(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error(t('catalog.projectForm.messages.mustBeAuthenticated'));
      return;
    }

    // Validate file type - más flexible para diferentes navegadores
    const validTypes = ['image/jpeg', 'image/jpg'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = validTypes.includes(file.type) || fileExtension === 'jpg' || fileExtension === 'jpeg';
    
    if (!isValidType) {
      toast.error(t('catalog.projectForm.messages.onlyJpgJpeg'));
      return;
    }

    // Validate dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      
      if (img.width !== 500 || img.height !== 500) {
        toast.error(t('catalog.projectForm.messages.imageDimensions'));
        return;
      }

      try {
        setUploading(true);
        
        // El path debe incluir el user_id como primer elemento para cumplir con las políticas RLS
        const fileExt = file.name.split(".").pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("catalog-images")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          // Mensajes de error más específicos
          if (uploadError.message?.includes('already exists')) {
            toast.error(t('catalog.projectForm.messages.fileExists'));
          } else if (uploadError.message?.includes('policy')) {
            toast.error(t('catalog.projectForm.messages.permissionError'));
          } else {
            toast.error(t('catalog.projectForm.messages.uploadError'));
          }
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("catalog-images")
          .getPublicUrl(filePath);

        setImageUrl(publicUrl);
        setHasUnsavedChanges(true);
        toast.success(t('catalog.projectForm.messages.imageUploaded'));
      } catch (error: any) {
        console.error("Error uploading image:", error);
        toast.error(t('catalog.projectForm.messages.uploadError'));
      } finally {
        setUploading(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error(t('catalog.projectForm.messages.imageLoadError'));
    };

    img.src = objectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const projectData = {
        catalog_id: catalogId,
        name,
        description: description || null,
        image_url: imageUrl,
        project_id: useExistingProject && selectedProjectId ? selectedProjectId : null,
        colors: colors.length > 0 ? colors : null,
      };

      if (projectId) {
        const { error } = await supabase
          .from("catalog_projects")
          .update(projectData)
          .eq("id", projectId);

        if (error) throw error;
        toast.success(t('catalog.projectForm.messages.projectUpdated'));
      } else {
        // Obtener el máximo position actual para poner el nuevo proyecto al final
        // Si hay sectionId, buscar dentro de esa sección, sino buscar proyectos sin sección
        let query = supabase
          .from("catalog_projects")
          .select("position")
          .eq("catalog_id", catalogId);
        
        if (sectionId) {
          query = query.eq("catalog_section_id", sectionId);
        } else {
          query = query.is("catalog_section_id", null);
        }
        
        const { data: maxPositionData } = await query
          .order("position", { ascending: false })
          .limit(1)
          .single();

        const maxPosition = maxPositionData?.position ?? -1;

        const { error } = await supabase
          .from("catalog_projects")
          .insert({
            ...projectData,
            catalog_section_id: sectionId || null,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success(t('catalog.projectForm.messages.projectCreated'));
      }

      setHasUnsavedChanges(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(t('catalog.projectForm.messages.errorSaving'));
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

  const handleExistingProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = existingProjects.find(p => p.id === projectId);
    if (project) {
      setName(project.name);
      setImageUrl(project.image_url);
    }
    setCanEditNameAndImage(true);
    setHasUnsavedChanges(true);
  };

  const handleAddColor = () => {
    if (!colors.includes(currentColor)) {
      setColors([...colors, currentColor]);
      setHasUnsavedChanges(true);
    }
    setShowColorPicker(false);
  };

  const handleRemoveColor = (colorToRemove: string) => {
    setColors(colors.filter(c => c !== colorToRemove));
    setHasUnsavedChanges(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{projectId ? t('catalog.projectForm.edit') : t('catalog.projectForm.new')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                <input
                  type="checkbox"
                  checked={useExistingProject}
                  onChange={(e) => {
                    setUseExistingProject(e.target.checked);
                    if (e.target.checked) {
                      fetchExistingProjects();
                    } else {
                      setSelectedProjectId("");
                    }
                    setHasUnsavedChanges(true);
                  }}
                  className="mr-2"
                />
                {t('catalog.projectForm.useExisting')}
              </Label>
            </div>

            {useExistingProject && (
              <div className="space-y-2">
                <Label htmlFor="existing-project">{t('catalog.projectForm.selectProjectLabel')}</Label>
                <Select value={selectedProjectId} onValueChange={handleExistingProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('catalog.projectForm.selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {existingProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t('catalog.projectForm.name')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.projectForm.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('catalog.projectForm.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={t('catalog.projectForm.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">{t('catalog.projectForm.image')}</Label>
              {imageUrl && (
                <div className="relative w-32 h-32 mb-2">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-md" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageUrl(null);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/jpg"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('catalog.projectForm.imageHelpText')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('catalog.projectForm.colors')}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {colors.map((color, index) => (
                  <div
                    key={index}
                    className="relative group"
                  >
                    <div
                      className="w-10 h-10 rounded-md border-2 border-border cursor-pointer"
                      style={{ backgroundColor: color }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(color)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-10 h-10"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {showColorPicker && (
                <div className="p-4 border rounded-md space-y-2">
                  <HexColorPicker color={currentColor} onChange={setCurrentColor} />
                  <div className="flex gap-2 items-center pt-2">
                    <Input
                      type="text"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddColor}>
                      {t('catalog.projectForm.addButton')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={loading}>
                {t('catalog.projectForm.cancel')}
              </Button>
              <Button type="submit" disabled={loading || !name}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {projectId ? t('catalog.projectForm.update') : t('catalog.projectForm.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('catalog.projectForm.unsaved.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('catalog.projectForm.unsaved.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('catalog.projectForm.unsaved.continueEditing')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              {t('catalog.projectForm.unsaved.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
