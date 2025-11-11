import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Star, Edit, Disc, Droplet, Scissors, KeyRound, Magnet as MagnetIcon, Bolt as BoltIcon, Wrench, Paintbrush, FileBox, Package } from "lucide-react";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
  color: string | null;
  type: string | null;
  is_favorite: boolean;
}

const MATERIAL_TYPES = [
  { value: 'filament', label: 'Filament', icon: Disc },
  { value: 'resin', label: 'Resin', icon: Droplet },
  { value: 'glue', label: 'Glue', icon: Droplet },
  { value: 'keyring', label: 'Keyring', icon: KeyRound },
  { value: 'magnet', label: 'Magnet', icon: MagnetIcon },
  { value: 'screw', label: 'Screw', icon: Wrench },
  { value: 'bolt', label: 'Bolt', icon: BoltIcon },
  { value: 'paint', label: 'Paint', icon: Paintbrush },
  { value: 'sandpaper', label: 'Sandpaper', icon: FileBox },
  { value: 'other', label: 'Other', icon: Package },
];

const getMaterialIcon = (type: string | null) => {
  const materialType = MATERIAL_TYPES.find(t => t.value === type);
  return materialType?.icon || Package;
};

const Materials = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    price_per_kg: "",
    color: "",
    type: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    price_per_kg: "",
    color: "",
    type: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  const fetchMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast.error("Error al cargar materiales");
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("materials").insert({
        user_id: user.id,
        name: newMaterial.name,
        price_per_kg: parseFloat(newMaterial.price_per_kg),
        color: newMaterial.color || null,
        type: newMaterial.type || null,
      });

      if (error) throw error;

      toast.success("Material añadido");
      setNewMaterial({ name: "", price_per_kg: "", color: "", type: "" });
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al añadir material");
    }
  };

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ is_favorite: !currentFavorite })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentFavorite ? "Eliminado de favoritos" : "Añadido a favoritos");
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al actualizar favorito");
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);

      if (error) throw error;

      toast.success("Material eliminado");
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al eliminar material");
    }
  };

  const handleEditClick = (material: Material) => {
    setEditingMaterial(material);
    setEditForm({
      name: material.name,
      price_per_kg: material.price_per_kg.toString(),
      color: material.color || "",
      type: material.type || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    try {
      const { error } = await supabase
        .from("materials")
        .update({
          name: editForm.name,
          price_per_kg: parseFloat(editForm.price_per_kg),
          color: editForm.color || null,
          type: editForm.type || null,
        })
        .eq("id", editingMaterial.id);

      if (error) throw error;

      toast.success("Material actualizado");
      setIsEditDialogOpen(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al actualizar material");
    }
  };

  const filteredMaterials = filterType === "all" 
    ? materials 
    : materials.filter(m => m.type === filterType);

  if (loading || materialsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Gestión de Materiales</h2>
        <p className="text-muted-foreground">
          Administra los materiales que utilizas en tus impresiones
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Añadir Material</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio por KG (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newMaterial.price_per_kg}
                  onChange={(e) => setNewMaterial({ ...newMaterial, price_per_kg: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={newMaterial.color}
                  onChange={(e) => setNewMaterial({ ...newMaterial, color: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={newMaterial.type}
                  onValueChange={(value) => setNewMaterial({ ...newMaterial, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {MATERIAL_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Añadir Material
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Filtro por tipo */}
          <div className="flex items-center gap-4">
            <Label>Filtrar por tipo:</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos</SelectItem>
                {MATERIAL_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredMaterials.length} material{filteredMaterials.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {filteredMaterials.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {filterType === "all" 
                  ? "No hay materiales. Añade tu primer material para comenzar."
                  : "No hay materiales de este tipo."}
              </CardContent>
            </Card>
          ) : (
            filteredMaterials.map((material) => {
              const Icon = getMaterialIcon(material.type);
              return (
                <Card key={material.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{material.name}</h3>
                            {material.is_favorite && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <p>Precio: €{material.price_per_kg}/kg</p>
                            {material.color && <p>Color: {material.color}</p>}
                            {material.type && (
                              <p>Tipo: {MATERIAL_TYPES.find(t => t.value === material.type)?.label || material.type}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleFavorite(material.id, material.is_favorite)}
                        >
                          <Star className={material.is_favorite ? "w-4 h-4 text-yellow-500 fill-yellow-500" : "w-4 h-4"} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(material)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteMaterial(material.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dialog de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card z-50">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateMaterial} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Precio por KG (€) *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={editForm.price_per_kg}
                onChange={(e) => setEditForm({ ...editForm, price_per_kg: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                value={editForm.color}
                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Tipo</Label>
              <Select
                value={editForm.type}
                onValueChange={(value) => setEditForm({ ...editForm, type: value })}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {MATERIAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Guardar Cambios
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Materials;
