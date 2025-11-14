import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ShoppingCart, History, Trash, Edit, Star, Info, Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
  color: string | null;
  type: string | null;
  is_favorite: boolean;
  display_mode: 'color' | 'icon';
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
  { value: 'filament', label: 'Filamento', icon: Disc },
  { value: 'resin', label: 'Resina', icon: Droplet },
  { value: 'glue', label: 'Pegamento', icon: Droplet },
  { value: 'keyring', label: 'Llavero', icon: KeyRound },
  { value: 'screw', label: 'Tornillo', icon: Wrench },
  { value: 'paint', label: 'Pintura', icon: Paintbrush },
  { value: 'sandpaper', label: 'Lija', icon: FileBox },
  { value: 'other', label: 'Otro', icon: Package },
];

const PREDEFINED_COLORS = [
  { name: "Rojo", value: "#ef4444" },
  { name: "Naranja", value: "#f97316" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Verde", value: "#22c55e" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Morado", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Blanco", value: "#f3f4f6" },
  { name: "Negro", value: "#1f2937" },
  { name: "Gris", value: "#6b7280" },
];

const getMaterialIcon = (type: string | null) => {
  const materialType = MATERIAL_TYPES.find(t => t.value === type);
  return materialType?.icon || Package;
};

const Inventory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, number>>({});
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAcquisitionDialogOpen, setIsAcquisitionDialogOpen] = useState(false);
  const [isWasteDialogOpen, setIsWasteDialogOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  
  const [acquisitionForm, setAcquisitionForm] = useState({
    material_id: "",
    quantity_grams: "",
    unit_price: "",
    supplier: "",
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const [wasteForm, setWasteForm] = useState({
    material_id: "",
    quantity_grams: "",
    notes: ""
  });

  const [materialForm, setMaterialForm] = useState({
    name: "",
    price_per_kg: "",
    color: "",
    type: "",
    display_mode: "color" as 'color' | 'icon',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      await Promise.all([
        fetchMaterials(),
        fetchInventory(),
        fetchPendingMaterials(),
        fetchAcquisitions(),
        fetchMovements()
      ]);
    } finally {
      setLoadingData(false);
    }
  };

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
      setMaterials((data || []).map(m => ({
        ...m,
        display_mode: (m.display_mode || 'color') as 'color' | 'icon'
      })));
    } catch (error: any) {
      toast.error("Error al cargar materiales");
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
      setInventory((data || []).map(item => ({
        ...item,
        materials: {
          ...item.materials,
          display_mode: (item.materials.display_mode || 'color') as 'color' | 'icon'
        }
      })));
    } catch (error: any) {
      toast.error("Error al cargar inventario");
    }
  };

  const fetchPendingMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("print_materials")
        .select("material_id, weight_grams, prints!inner(status)")
        .eq("prints.user_id", user.id)
        .in("prints.status", ["pending_print", "printing"]);

      if (error) throw error;

      const pending: Record<string, number> = {};
      (data || []).forEach((item: any) => {
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

  const fetchAcquisitions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("material_acquisitions")
        .select("*, materials(*)")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setAcquisitions((data || []).map(acq => ({
        ...acq,
        materials: {
          ...acq.materials,
          display_mode: (acq.materials.display_mode || 'color') as 'color' | 'icon'
        }
      })));
    } catch (error: any) {
      toast.error("Error al cargar adquisiciones");
    }
  };

  const fetchMovements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, materials!fk_material(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements((data || []).map(mov => ({
        ...mov,
        materials: {
          ...mov.materials,
          display_mode: (mov.materials.display_mode || 'color') as 'color' | 'icon'
        }
      })));
    } catch (error: any) {
      toast.error("Error al cargar movimientos");
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const materialData: any = {
        user_id: user.id,
        name: materialForm.name,
        price_per_kg: parseFloat(materialForm.price_per_kg),
        display_mode: materialForm.display_mode,
        type: materialForm.type || null,
      };

      if (materialForm.display_mode === 'color') {
        materialData.color = materialForm.color;
      }

      const { error: materialError } = await supabase
        .from("materials")
        .insert([materialData]);

      if (materialError) throw materialError;

      toast.success("Material añadido correctamente");
      setIsMaterialDialogOpen(false);
      setMaterialForm({
        name: "",
        price_per_kg: "",
        color: "",
        type: "",
        display_mode: "color",
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error al añadir material");
    }
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      price_per_kg: material.price_per_kg.toString(),
      color: material.color || "",
      type: material.type || "",
      display_mode: material.display_mode,
    });
    setIsMaterialDialogOpen(true);
  };

  const handleSaveEditMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingMaterial) return;

    try {
      const updateData: any = {
        name: materialForm.name,
        price_per_kg: parseFloat(materialForm.price_per_kg),
        display_mode: materialForm.display_mode,
        type: materialForm.type || null,
      };

      if (materialForm.display_mode === 'color') {
        updateData.color = materialForm.color;
      } else {
        updateData.color = null;
      }

      const { error } = await supabase
        .from("materials")
        .update(updateData)
        .eq("id", editingMaterial.id);

      if (error) throw error;

      toast.success("Material actualizado");
      setIsMaterialDialogOpen(false);
      setEditingMaterial(null);
      setMaterialForm({
        name: "",
        price_per_kg: "",
        color: "",
        type: "",
        display_mode: "color",
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error al actualizar material");
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("¿Eliminar este material?")) return;

    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
      toast.success("Material eliminado");
      fetchData();
    } catch (error: any) {
      toast.error("Error al eliminar material");
    }
  };

  const handleToggleFavorite = async (material: Material) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ is_favorite: !material.is_favorite })
        .eq("id", material.id);

      if (error) throw error;
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al actualizar favorito");
    }
  };

  const handleSaveAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantityGrams = parseFloat(acquisitionForm.quantity_grams);
      const unitPrice = parseFloat(acquisitionForm.unit_price);
      const totalPrice = (quantityGrams / 1000) * unitPrice;

      const { error: acquisitionError } = await supabase
        .from("material_acquisitions")
        .insert([
          {
            user_id: user.id,
            material_id: acquisitionForm.material_id,
            quantity_grams: quantityGrams,
            unit_price: unitPrice,
            total_price: totalPrice,
            supplier: acquisitionForm.supplier || null,
            purchase_date: acquisitionForm.purchase_date,
            notes: acquisitionForm.notes || null
          }
        ]);

      if (acquisitionError) throw acquisitionError;

      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("material_id", acquisitionForm.material_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (inventoryData) {
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            quantity_grams: inventoryData.quantity_grams + quantityGrams
          })
          .eq("id", inventoryData.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("inventory_items")
          .insert([
            {
              user_id: user.id,
              material_id: acquisitionForm.material_id,
              quantity_grams: quantityGrams
            }
          ]);

        if (insertError) throw insertError;
      }

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert([
          {
            user_id: user.id,
            material_id: acquisitionForm.material_id,
            movement_type: "acquisition",
            quantity_grams: quantityGrams,
            notes: acquisitionForm.notes || null
          }
        ]);

      if (movementError) throw movementError;

      toast.success("Adquisición registrada correctamente");
      setIsAcquisitionDialogOpen(false);
      setAcquisitionForm({
        material_id: "",
        quantity_grams: "",
        unit_price: "",
        supplier: "",
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error al registrar adquisición");
    }
  };

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantityGrams = parseFloat(wasteForm.quantity_grams);

      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("material_id", wasteForm.material_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!inventoryData || inventoryData.quantity_grams < quantityGrams) {
        toast.error("No hay suficiente stock disponible");
        return;
      }

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity_grams: inventoryData.quantity_grams - quantityGrams
        })
        .eq("id", inventoryData.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert([
          {
            user_id: user.id,
            material_id: wasteForm.material_id,
            movement_type: "waste",
            quantity_grams: quantityGrams,
            notes: wasteForm.notes || null
          }
        ]);

      if (movementError) throw movementError;

      toast.success("Desperdicio registrado correctamente");
      setIsWasteDialogOpen(false);
      setWasteForm({
        material_id: "",
        quantity_grams: "",
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error al registrar desperdicio");
    }
  };

  const handleDeleteAcquisition = async (id: string) => {
    if (!confirm("¿Eliminar esta adquisición?")) return;

    try {
      const { error } = await supabase
        .from("material_acquisitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Adquisición eliminada");
      fetchData();
    } catch (error: any) {
      toast.error("Error al eliminar adquisición");
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      acquisition: "Adquisición",
      consumption: "Consumo",
      waste: "Desperdicio",
      adjustment: "Ajuste"
    };
    return types[type] || type;
  };

  // Filtrar materiales
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || material.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filtrar inventario para alertas de stock
  const filteredInventory = inventory.filter(item => {
    if (!showLowStock) return true;
    const pending = pendingMaterials[item.material_id] || 0;
    const realStock = item.quantity_grams - pending;
    return realStock < item.min_stock_alert;
  });

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="materials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="materials">Materiales</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="acquisitions">Adquisiciones</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Tab de Materiales */}
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center mb-4">
                <CardTitle>Gestión de Materiales</CardTitle>
                <Button onClick={() => {
                  setEditingMaterial(null);
                  setMaterialForm({
                    name: "",
                    price_per_kg: "",
                    color: "",
                    type: "",
                    display_mode: "color",
                  });
                  setIsMaterialDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Material
                </Button>
              </div>
              
              {/* Filtros */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nombre</Label>
                  <Input
                    id="search"
                    placeholder="Buscar material..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-type">Filtrar por tipo</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {MATERIAL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("all");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron materiales con los filtros aplicados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Favorito</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Precio/kg</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => {
                    const Icon = getMaterialIcon(material.type);
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(material)}
                          >
                            <Star
                              className={`w-4 h-4 ${material.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {material.display_mode === 'color' ? (
                              <div
                                className="w-5 h-5 rounded-full border"
                                style={{ backgroundColor: material.color || '#gray' }}
                              />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                            <span>{material.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {material.type ? MATERIAL_TYPES.find(t => t.value === material.type)?.label || material.type : '-'}
                        </TableCell>
                        <TableCell>{material.price_per_kg.toFixed(2)}€</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {material.display_mode === 'color' ? 'Color' : 'Icono'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
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
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Stock */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <CardTitle>Control de Stock</CardTitle>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="low-stock-toggle"
                      checked={showLowStock}
                      onChange={(e) => setShowLowStock(e.target.checked)}
                      className="w-4 h-4 rounded border-input"
                    />
                    <Label htmlFor="low-stock-toggle" className="cursor-pointer">
                      Solo mostrar alertas de stock bajo
                    </Label>
                  </div>
                </div>
                {showLowStock && filteredInventory.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium">
                      Se encontraron {filteredInventory.length} material(es) con stock bajo
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                {filteredInventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {showLowStock 
                      ? "No hay materiales con stock bajo" 
                      : "No hay materiales en inventario"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            Stock Disponible
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cantidad total de material disponible en inventario</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            Pendiente Impresión
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cantidad de material reservado para impresiones pendientes o en curso</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            Stock Real
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Stock disponible menos el pendiente de impresión</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead>Ubicación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map((item) => {
                      const pending = pendingMaterials[item.material_id] || 0;
                      const realStock = item.quantity_grams - pending;
                      const Icon = getMaterialIcon(item.materials.type);

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.materials.display_mode === 'color' ? (
                                <div
                                  className="w-5 h-5 rounded-full border"
                                  style={{ backgroundColor: item.materials.color || '#gray' }}
                                />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                              <span>{item.materials.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.quantity_grams}g ({(item.quantity_grams / 1000).toFixed(2)}kg)
                          </TableCell>
                          <TableCell>
                            <Badge variant={pending > 0 ? "default" : "outline"}>
                              {pending}g ({(pending / 1000).toFixed(2)}kg)
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={realStock < item.min_stock_alert ? "text-red-500 font-bold" : ""}>
                              {realStock}g ({(realStock / 1000).toFixed(2)}kg)
                            </span>
                          </TableCell>
                          <TableCell>{item.location || "-"}</TableCell>
                        </TableRow>
                      );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Adquisiciones */}
        <TabsContent value="acquisitions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Adquisiciones Recientes</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => setIsWasteDialogOpen(true)} variant="outline">
                    <Trash className="w-4 h-4 mr-2" />
                    Registrar Desperdicio
                  </Button>
                  <Button onClick={() => setIsAcquisitionDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Adquisición
                  </Button>
                </div>
              </div>
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
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acquisitions.map((acquisition) => (
                    <TableRow key={acquisition.id}>
                      <TableCell>
                        {format(new Date(acquisition.purchase_date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>{acquisition.materials.name}</TableCell>
                      <TableCell>
                        {acquisition.quantity_grams}g ({(acquisition.quantity_grams / 1000).toFixed(2)}kg)
                      </TableCell>
                      <TableCell>{acquisition.unit_price.toFixed(2)}€</TableCell>
                      <TableCell>{acquisition.total_price.toFixed(2)}€</TableCell>
                      <TableCell>{acquisition.supplier || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteAcquisition(acquisition.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Historial */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
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
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>{movement.materials.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getMovementTypeLabel(movement.movement_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {movement.quantity_grams}g ({(movement.quantity_grams / 1000).toFixed(2)}kg)
                      </TableCell>
                      <TableCell>{movement.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para añadir/editar material */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Editar Material" : "Añadir Material"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingMaterial ? handleSaveEditMaterial : handleAddMaterial} className="space-y-4">
            <div>
              <Label htmlFor="material-name">Nombre *</Label>
              <Input
                id="material-name"
                value={materialForm.name}
                onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="material-price">Precio por KG (€) *</Label>
              <Input
                id="material-price"
                type="number"
                step="0.01"
                value={materialForm.price_per_kg}
                onChange={(e) => setMaterialForm({ ...materialForm, price_per_kg: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="material-type">Tipo</Label>
              <Select
                value={materialForm.type}
                onValueChange={(value) => setMaterialForm({ ...materialForm, type: value })}
              >
                <SelectTrigger id="material-type">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
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
            <div>
              <Label htmlFor="display-mode">Mostrar como</Label>
              <Select
                value={materialForm.display_mode}
                onValueChange={(value: 'color' | 'icon') => setMaterialForm({ ...materialForm, display_mode: value })}
              >
                <SelectTrigger id="display-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="icon">Icono</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {materialForm.display_mode === 'color' && (
              <div>
                <Label htmlFor="color">Color</Label>
                <Select
                  value={materialForm.color}
                  onValueChange={(value) => setMaterialForm({ ...materialForm, color: value })}
                >
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Selecciona color" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingMaterial ? "Actualizar" : "Crear"} Material
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para añadir adquisición */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={setIsAcquisitionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Adquisición</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAcquisition} className="space-y-4">
            <div>
              <Label htmlFor="acq_material">Material *</Label>
              <Select
                value={acquisitionForm.material_id}
                onValueChange={(value) => setAcquisitionForm({ ...acquisitionForm, material_id: value })}
              >
                <SelectTrigger id="acq_material">
                  <SelectValue placeholder="Seleccionar material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((mat) => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="acq_quantity">Cantidad (g) *</Label>
              <Input
                id="acq_quantity"
                type="number"
                step="1"
                value={acquisitionForm.quantity_grams}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, quantity_grams: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_price">Precio/kg (€) *</Label>
              <Input
                id="acq_price"
                type="number"
                step="0.01"
                value={acquisitionForm.unit_price}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, unit_price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_supplier">Proveedor</Label>
              <Input
                id="acq_supplier"
                value={acquisitionForm.supplier}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="acq_date">Fecha de Compra *</Label>
              <Input
                id="acq_date"
                type="date"
                value={acquisitionForm.purchase_date}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, purchase_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_notes">Notas</Label>
              <Textarea
                id="acq_notes"
                value={acquisitionForm.notes}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAcquisitionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Adquisición</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para registrar desperdicio */}
      <Dialog open={isWasteDialogOpen} onOpenChange={setIsWasteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Desperdicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveWaste} className="space-y-4">
            <div>
              <Label htmlFor="waste_material">Material *</Label>
              <Select
                value={wasteForm.material_id}
                onValueChange={(value) => setWasteForm({ ...wasteForm, material_id: value })}
              >
                <SelectTrigger id="waste_material">
                  <SelectValue placeholder="Seleccionar material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((mat) => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="waste_quantity">Cantidad (g) *</Label>
              <Input
                id="waste_quantity"
                type="number"
                step="1"
                value={wasteForm.quantity_grams}
                onChange={(e) => setWasteForm({ ...wasteForm, quantity_grams: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="waste_notes">Notas</Label>
              <Textarea
                id="waste_notes"
                value={wasteForm.notes}
                onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsWasteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Desperdicio</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
