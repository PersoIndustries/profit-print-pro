import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Upload } from "lucide-react";

interface CatalogItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  editingItem?: {
    id: string;
    project_id: string;
    reference_code: string;
    name: string;
    sizes: Array<{ size: string; dimensions: string }>;
    pvp_price: number;
    image_url: string | null;
  } | null;
}

export function CatalogItemForm({
  isOpen,
  onClose,
  projects,
  editingItem,
}: CatalogItemFormProps) {
  const [projectId, setProjectId] = useState(editingItem?.project_id || "");
  const [referenceCode, setReferenceCode] = useState(editingItem?.reference_code || "");
  const [name, setName] = useState(editingItem?.name || "");
  const [sizes, setSizes] = useState<Array<{ size: string; dimensions: string }>>(
    editingItem?.sizes || []
  );
  const [pvpPrice, setPvpPrice] = useState(editingItem?.pvp_price?.toString() || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(editingItem?.image_url || "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setProjectId(editingItem.project_id);
      setReferenceCode(editingItem.reference_code);
      setName(editingItem.name);
      setSizes(editingItem.sizes || []);
      setPvpPrice(editingItem.pvp_price?.toString() || "");
      setImageUrl(editingItem.image_url || "");
    }
  }, [editingItem]);

  const handleAddSize = () => {
    setSizes([...sizes, { size: "", dimensions: "" }]);
  };

  const handleRemoveSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const handleSizeChange = (index: number, field: "size" | "dimensions", value: string) => {
    const newSizes = [...sizes];
    newSizes[index][field] = value;
    setSizes(newSizes);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return imageUrl;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("catalog-images")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("catalog-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al subir la imagen");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !referenceCode || !name || !pvpPrice) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      let finalImageUrl = imageUrl;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      const catalogData = {
        user_id: user.id,
        project_id: projectId,
        reference_code: referenceCode,
        name,
        sizes: sizes.filter(s => s.size && s.dimensions),
        pvp_price: parseFloat(pvpPrice),
        image_url: finalImageUrl,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("catalog_items")
          .update(catalogData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Producto actualizado");
      } else {
        const { error } = await supabase
          .from("catalog_items")
          .insert(catalogData);

        if (error) throw error;
        toast.success("Producto añadido al catálogo");
      }

      onClose();
    } catch (error) {
      console.error("Error saving catalog item:", error);
      toast.error("Error al guardar el producto");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Producto" : "Añadir Producto al Catálogo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project">Proyecto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referenceCode">Código de Referencia</Label>
            <Input
              id="referenceCode"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="REF-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Nombre del Producto</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre descriptivo"
              required
            />
          </div>

          <div>
            <Label>Tamaños y Dimensiones</Label>
            <div className="space-y-2 mt-2">
              {sizes.map((size, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Tamaño (ej: S, M, L)"
                    value={size.size}
                    onChange={(e) => handleSizeChange(index, "size", e.target.value)}
                  />
                  <Input
                    placeholder="Dimensiones (ej: 10x10x5 cm)"
                    value={size.dimensions}
                    onChange={(e) => handleSizeChange(index, "dimensions", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveSize(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSize}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Tamaño
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="pvpPrice">Precio PVP (€)</Label>
            <Input
              id="pvpPrice"
              type="number"
              step="0.01"
              value={pvpPrice}
              onChange={(e) => setPvpPrice(e.target.value)}
              placeholder="19.99"
              required
            />
          </div>

          <div>
            <Label htmlFor="image">Imagen del Producto</Label>
            <div className="mt-2">
              {imageUrl && !imageFile && (
                <div className="mb-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos: JPG, PNG, WEBP. Máx: 5MB
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Subiendo..." : editingItem ? "Actualizar" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
