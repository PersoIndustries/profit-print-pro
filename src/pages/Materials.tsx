import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Star, Edit, Disc, Droplet, Scissors, KeyRound, Magnet as MagnetIcon, Bolt as BoltIcon, Wrench, Paintbrush, FileBox, Package, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
  color: string | null;
  type: string | null;
  is_favorite: boolean;
}

interface InventoryItem {
  id: string;
  material_id: string;
  quantity_grams: number;
  min_stock_alert: number;
  location: string | null;
  notes: string | null;
  materials: Material;
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, number>>({});
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
    if (user) {
      fetchMaterials();
      fetchInventory();
      fetchPendingMaterials();
    }
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

  const fetchInventory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, materials(*)")
        .eq("user_id", user.id);

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      toast.error("Error al cargar inventario");
    }
  };

  const fetchPendingMaterials = async () => {
    if (!user) return;

    try {
      // Get pending prints with their materials
      const { data, error } = await supabase
        .from("print_materials")
        .select(`
          material_id,
          weight_grams,
          prints!inner(user_id, status)
        `)
        .eq('prints.user_id', user.id)
        .eq('prints.status', 'pending_print');

      if (error) throw error;

      // Sum up materials by material_id
      const pending: Record<string, number> = {};
      data?.forEach((item: any) => {
        if (!pending[item.material_id]) {
          pending[item.material_id] = 0;
        }
        pending[item.material_id] += item.weight_grams;
      });
      
      setPendingMaterials(pending);
    } catch (error: any) {
      console.error("Error al cargar materiales pendientes:", error);
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

  const handleDeleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);

      if (error) throw error;

      toast.success("Material eliminado");
      fetchMaterials();
      fetchInventory();
    } catch (error: any) {
      toast.error("Error al eliminar material");
    }
  };

  const handleToggleFavorite = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ is_favorite: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentState ? "Eliminado de favoritos" : "Añadido a favoritos");
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al actualizar favorito");
    }
  };

  const handleEditMaterial = (material: Material) => {
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

  const getInventoryItem = (materialId: string) => {
    return inventory.find(inv => inv.material_id === materialId);
  };

  const getPendingGrams = (materialId: string) => {
    return pendingMaterials[materialId] || 0;
  };

  const filteredMaterials = materials.filter((material) => {
    if (filterType === "all") return true;
    return material.type === filterType;
  });

  if (loading || materialsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Materiales e Inventario</h1>
        <p className="text-muted-foreground">
          {materials.length} materiales registrados
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="price">Precio por KG (€) *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Será usado de valor por defecto a la hora de crear proyectos</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
          <div className="flex items-center justify-between">
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventario de Materiales</CardTitle>
              <CardDescription>
                Stock disponible y materiales pendientes de imprimir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Stock Disponible</TableHead>
                    <TableHead>Pendiente</TableHead>
                    <TableHead>Stock Alerta</TableHead>
                    <TableHead>Precio/kg</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay materiales
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material) => {
                      const Icon = getMaterialIcon(material.type);
                      const inventoryItem = getInventoryItem(material.id);
                      const pendingGrams = getPendingGrams(material.id);
                      const currentStock = inventoryItem?.quantity_grams || 0;
                      const minStock = inventoryItem?.min_stock_alert || 500;
                      const isLowStock = currentStock < minStock;

                      return (
                        <TableRow key={material.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{material.name}</span>
                                  {material.is_favorite && (
                                    <Star className="w-3 h-3 fill-primary text-primary" />
                                  )}
                                </div>
                                {material.color && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <div
                                      className="w-3 h-3 rounded-full border"
                                      style={{ backgroundColor: material.color }}
                                    />
                                    {material.color}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isLowStock && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Stock bajo. Mínimo: {minStock}g
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className={isLowStock ? "text-orange-500 font-medium" : ""}>
                                {(currentStock / 1000).toFixed(2)} kg
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pendingGrams > 0 ? (
                              <Badge variant="outline" className="bg-yellow-500/10">
                                {(pendingGrams / 1000).toFixed(2)} kg
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(minStock / 1000).toFixed(2)} kg
                          </TableCell>
                          <TableCell>€{material.price_per_kg.toFixed(2)}/kg</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleFavorite(material.id, material.is_favorite)}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    material.is_favorite ? "fill-primary text-primary" : ""
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditMaterial(material)}
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Material Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
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
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Actualizar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materials;
