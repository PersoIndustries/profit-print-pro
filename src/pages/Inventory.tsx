import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Plus, Trash2, Star, Edit, AlertTriangle,
  Disc, Droplet, Scissors, KeyRound, 
  Magnet as MagnetIcon, Bolt as BoltIcon, 
  Wrench, Paintbrush, FileBox, Package,
  ShoppingCart, Archive, Crown, History, Trash
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

interface Acquisition {
  id: string;
  material_id: string;
  quantity_grams: number;
  unit_price: number;
  total_price: number;
  supplier: string | null;
  purchase_date: string;
  notes: string | null;
  materials: Material;
}

interface Movement {
  id: string;
  material_id: string;
  movement_type: string;
  quantity_grams: number;
  notes: string | null;
  created_at: string;
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

const Inventory = () => {
  const { user, loading } = useAuth();
  const { hasFeature, isEnterprise, loading: featuresLoading } = useTierFeatures();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAcquisitionDialogOpen, setIsAcquisitionDialogOpen] = useState(false);
  const [isWasteDialogOpen, setIsWasteDialogOpen] = useState(false);
  
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

  const [acquisitionForm, setAcquisitionForm] = useState({
    material_id: "",
    quantity_grams: "",
    unit_price: "",
    supplier: "",
    notes: "",
  });

  const [wasteForm, setWasteForm] = useState({
    material_id: "",
    quantity_grams: "",
    notes: "",
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
      fetchAcquisitions();
      fetchMovements();
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      toast.error("Error al cargar inventario");
    }
  };

  const fetchAcquisitions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("material_acquisitions")
        .select("*, materials(*)")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setAcquisitions(data || []);
    } catch (error: any) {
      toast.error("Error al cargar adquisiciones");
    }
  };

  const fetchMovements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, materials!inventory_movements_material_id_fkey(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      toast.error("Error al cargar movimientos");
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

  const handleAddAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantity = parseFloat(acquisitionForm.quantity_grams);
      const unitPrice = parseFloat(acquisitionForm.unit_price);
      const totalPrice = (quantity / 1000) * unitPrice;

      // Insert acquisition
      const { error: acqError } = await supabase.from("material_acquisitions").insert({
        user_id: user.id,
        material_id: acquisitionForm.material_id,
        quantity_grams: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        supplier: acquisitionForm.supplier || null,
        notes: acquisitionForm.notes || null,
      });

      if (acqError) throw acqError;

      // Update or create inventory item
      const { data: existingInventory } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("material_id", acquisitionForm.material_id)
        .maybeSingle();

      if (existingInventory) {
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            quantity_grams: existingInventory.quantity_grams + quantity,
          })
          .eq("id", existingInventory.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("inventory_items")
          .insert({
            user_id: user.id,
            material_id: acquisitionForm.material_id,
            quantity_grams: quantity,
          });

        if (insertError) throw insertError;
      }

      toast.success("Adquisición registrada");
      setIsAcquisitionDialogOpen(false);
      setAcquisitionForm({
        material_id: "",
        quantity_grams: "",
        unit_price: "",
        supplier: "",
        notes: "",
      });
      fetchInventory();
      fetchAcquisitions();
    } catch (error: any) {
      toast.error("Error al registrar adquisición");
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

  const handleDeleteAcquisition = async (id: string) => {
    try {
      const { error } = await supabase
        .from("material_acquisitions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Adquisición eliminada");
      fetchAcquisitions();
    } catch (error: any) {
      toast.error("Error al eliminar adquisición");
    }
  };

  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantity = parseFloat(wasteForm.quantity_grams);

      // Insert movement record
      const { error: movError } = await supabase.from("inventory_movements").insert({
        user_id: user.id,
        material_id: wasteForm.material_id,
        movement_type: 'waste',
        quantity_grams: -quantity,
        notes: wasteForm.notes || null,
      });

      if (movError) throw movError;

      // Update inventory
      const { data: existingInventory } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("material_id", wasteForm.material_id)
        .maybeSingle();

      if (existingInventory) {
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            quantity_grams: existingInventory.quantity_grams - quantity,
          })
          .eq("id", existingInventory.id);

        if (updateError) throw updateError;
      }

      toast.success("Desperdicio registrado");
      setIsWasteDialogOpen(false);
      setWasteForm({
        material_id: "",
        quantity_grams: "",
        notes: "",
      });
      fetchInventory();
      fetchMovements();
    } catch (error: any) {
      toast.error("Error al registrar desperdicio");
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'acquisition': return 'Adquisición';
      case 'print': return 'Impresión';
      case 'waste': return 'Desperdicio';
      case 'adjustment': return 'Ajuste';
      default: return type;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'acquisition': return 'default';
      case 'print': return 'secondary';
      case 'waste': return 'destructive';
      case 'adjustment': return 'outline';
      default: return 'outline';
    }
  };

  const filteredMaterials = filterType === "all" 
    ? materials 
    : materials.filter(m => m.type === filterType);

  if (loading || materialsLoading || featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Gestión de Inventario</h2>
        <p className="text-muted-foreground">
          Administra tus materiales, inventario y adquisiciones
        </p>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="materials">Tipos de Materiales</TabsTrigger>
          <TabsTrigger value="inventory" disabled={!hasFeature('inventory_management')}>
            <Archive className="w-4 h-4 mr-2" />
            Inventario
            {!hasFeature('inventory_management') && <Crown className="w-3 h-3 ml-2" />}
          </TabsTrigger>
          <TabsTrigger value="acquisitions" disabled={!hasFeature('acquisition_history')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Adquisiciones
            {!hasFeature('acquisition_history') && <Crown className="w-3 h-3 ml-2" />}
          </TabsTrigger>
          <TabsTrigger value="history" disabled={!hasFeature('movement_history')}>
            <History className="w-4 h-4 mr-2" />
            Historial
            {!hasFeature('movement_history') && <Crown className="w-3 h-3 ml-2" />}
          </TabsTrigger>
        </TabsList>

        {/* TAB: Tipos de Materiales */}
        <TabsContent value="materials" className="mt-6">
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
        </TabsContent>

        {/* TAB: Inventario */}
        <TabsContent value="inventory" className="mt-6">
          {!hasFeature('inventory_management') ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-xl font-bold mb-2">Función Enterprise</h3>
                <p className="text-muted-foreground mb-4">
                  El control de inventario está disponible solo para usuarios Enterprise
                </p>
                <Button onClick={() => navigate('/settings')}>
                  Actualizar a Enterprise
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventario de Materiales</CardTitle>
                  <CardDescription>
                    Control de stock y cantidades disponibles
                  </CardDescription>
                </div>
                {hasFeature('waste_tracking') && (
                  <Button onClick={() => setIsWasteDialogOpen(true)} variant="destructive">
                    <Trash className="w-4 h-4 mr-2" />
                    Registrar Desperdicio
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Cantidad (g)</TableHead>
                      <TableHead>Cantidad (kg)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Ubicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay items en inventario. Registra tu primera adquisición.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.materials.name}</TableCell>
                          <TableCell>{item.quantity_grams.toFixed(0)} g</TableCell>
                          <TableCell>{(item.quantity_grams / 1000).toFixed(2)} kg</TableCell>
                          <TableCell>
                            {item.quantity_grams < item.min_stock_alert ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                Stock bajo
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell>{item.location || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Adquisiciones */}
        <TabsContent value="acquisitions" className="mt-6">
          {!hasFeature('acquisition_history') ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-xl font-bold mb-2">Función Enterprise</h3>
                <p className="text-muted-foreground mb-4">
                  El historial de adquisiciones está disponible solo para usuarios Enterprise
                </p>
                <Button onClick={() => navigate('/settings')}>
                  Actualizar a Enterprise
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Adquisiciones de Material</CardTitle>
                    <CardDescription>
                      Historial de compras y reposiciones
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAcquisitionDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Adquisición
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio/kg</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acquisitions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No hay adquisiciones registradas
                          </TableCell>
                        </TableRow>
                      ) : (
                        acquisitions.map((acq) => (
                          <TableRow key={acq.id}>
                            <TableCell>
                              {format(new Date(acq.purchase_date), 'dd/MM/yyyy', { locale: es })}
                            </TableCell>
                            <TableCell className="font-medium">{acq.materials.name}</TableCell>
                            <TableCell>{(acq.quantity_grams / 1000).toFixed(2)} kg</TableCell>
                            <TableCell>€{acq.unit_price.toFixed(2)}/kg</TableCell>
                            <TableCell className="font-bold">€{acq.total_price.toFixed(2)}</TableCell>
                            <TableCell>{acq.supplier || '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteAcquisition(acq.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB: Historial */}
        <TabsContent value="history" className="mt-6">
          {!hasFeature('movement_history') ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-xl font-bold mb-2">Función Enterprise</h3>
                <p className="text-muted-foreground mb-4">
                  El historial de movimientos está disponible solo para usuarios Enterprise
                </p>
                <Button onClick={() => navigate('/settings')}>
                  Actualizar a Enterprise
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Movimientos</CardTitle>
                <CardDescription>
                  Registro completo de entradas y salidas de material
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay movimientos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            {format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">{mov.materials.name}</TableCell>
                          <TableCell>
                            <Badge variant={getMovementTypeBadge(mov.movement_type) as any}>
                              {getMovementTypeLabel(mov.movement_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className={mov.quantity_grams > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {mov.quantity_grams > 0 ? '+' : ''}{(mov.quantity_grams / 1000).toFixed(3)} kg
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mov.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de edición de material */}
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

      {/* Dialog de nueva adquisición */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={setIsAcquisitionDialogOpen}>
        <DialogContent className="bg-card z-50">
          <DialogHeader>
            <DialogTitle>Nueva Adquisición de Material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAcquisition} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acq-material">Material *</Label>
              <Select
                value={acquisitionForm.material_id}
                onValueChange={(value) => setAcquisitionForm({ ...acquisitionForm, material_id: value })}
                required
              >
                <SelectTrigger id="acq-material">
                  <SelectValue placeholder="Selecciona material" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acq-quantity">Cantidad (gramos) *</Label>
              <Input
                id="acq-quantity"
                type="number"
                step="1"
                value={acquisitionForm.quantity_grams}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, quantity_grams: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acq-price">Precio por KG (€) *</Label>
              <Input
                id="acq-price"
                type="number"
                step="0.01"
                value={acquisitionForm.unit_price}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, unit_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acq-supplier">Proveedor</Label>
              <Input
                id="acq-supplier"
                value={acquisitionForm.supplier}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acq-notes">Notas</Label>
              <Textarea
                id="acq-notes"
                value={acquisitionForm.notes}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Registrar Adquisición
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAcquisitionDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de registro de desperdicio */}
      <Dialog open={isWasteDialogOpen} onOpenChange={setIsWasteDialogOpen}>
        <DialogContent className="bg-card z-50">
          <DialogHeader>
            <DialogTitle>Registrar Desperdicio de Material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWaste} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="waste-material">Material *</Label>
              <Select
                value={wasteForm.material_id}
                onValueChange={(value) => setWasteForm({ ...wasteForm, material_id: value })}
                required
              >
                <SelectTrigger id="waste-material">
                  <SelectValue placeholder="Selecciona material" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {inventory.map((item) => (
                    <SelectItem key={item.material_id} value={item.material_id}>
                      {item.materials.name} ({(item.quantity_grams / 1000).toFixed(2)} kg disponibles)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waste-quantity">Cantidad a descartar (gramos) *</Label>
              <Input
                id="waste-quantity"
                type="number"
                step="1"
                value={wasteForm.quantity_grams}
                onChange={(e) => setWasteForm({ ...wasteForm, quantity_grams: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waste-notes">Notas / Motivo</Label>
              <Textarea
                id="waste-notes"
                value={wasteForm.notes}
                onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                placeholder="Ej: Material defectuoso, impresión fallida..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" className="flex-1">
                Registrar Desperdicio
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsWasteDialogOpen(false)}
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

export default Inventory;
