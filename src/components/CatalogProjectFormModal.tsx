import { useEffect, useState } from "react";
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
  onSuccess: () => void;
}

interface ExistingProject {
  id: string;
  name: string;
  image_url: string | null;
}

export function CatalogProjectFormModal({ open, onOpenChange, catalogId, projectId, onSuccess }: CatalogProjectFormModalProps) {
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
      toast.error("Error al cargar el proyecto");
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
      toast.error("Debes estar autenticado para subir imágenes");
      return;
    }

    // Validate file type - más flexible para diferentes navegadores
    const validTypes = ['image/jpeg', 'image/jpg'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = validTypes.includes(file.type) || fileExtension === 'jpg' || fileExtension === 'jpeg';
    
    if (!isValidType) {
      toast.error("Solo se permiten imágenes JPG/JPEG");
      return;
    }

    // Validate dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      
      if (img.width !== 500 || img.height !== 500) {
        toast.error("La imagen debe ser de 500x500 píxeles");
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
            toast.error("Ya existe un archivo con ese nombre. Intenta con otro nombre.");
          } else if (uploadError.message?.includes('policy')) {
            toast.error("Error de permisos. Verifica que estés autenticado correctamente.");
          } else {
            toast.error(`Error al subir la imagen: ${uploadError.message || 'Error desconocido'}`);
          }
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("catalog-images")
          .getPublicUrl(filePath);

        setImageUrl(publicUrl);
        setHasUnsavedChanges(true);
        toast.success("Imagen subida correctamente");
      } catch (error: any) {
        console.error("Error uploading image:", error);
        toast.error(`Error al subir la imagen: ${error?.message || 'Error desconocido'}`);
      } finally {
        setUploading(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Error al cargar la imagen. Verifica que sea un archivo de imagen válido.");
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
        toast.success("Proyecto actualizado");
      } else {
        // Obtener el máximo position actual para poner el nuevo proyecto al final
        const { data: maxPositionData } = await supabase
          .from("catalog_projects")
          .select("position")
          .eq("catalog_id", catalogId)
          .is("catalog_section_id", null)
          .order("position", { ascending: false })
          .limit(1)
          .single();

        const maxPosition = maxPositionData?.position ?? -1;

        const { error } = await supabase
          .from("catalog_projects")
          .insert({
            ...projectData,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success("Proyecto creado");
      }

      setHasUnsavedChanges(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Error al guardar el proyecto");
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
            <DialogTitle>{projectId ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
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
                Usar proyecto existente
              </Label>
            </div>

            {useExistingProject && (
              <div className="space-y-2">
                <Label htmlFor="existing-project">Seleccionar Proyecto</Label>
                <Select value={selectedProjectId} onValueChange={handleExistingProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
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
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Nombre del proyecto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Descripción del proyecto (opcional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Imagen (500x500 JPG)</Label>
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
                La imagen debe ser JPG y exactamente 500x500 píxeles
              </p>
            </div>

            <div className="space-y-2">
              <Label>Colores disponibles</Label>
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
                      Añadir
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !name}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {projectId ? "Actualizar" : "Crear"}
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
