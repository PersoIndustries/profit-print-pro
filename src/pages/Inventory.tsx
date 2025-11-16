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
import { Loader2, Plus, ShoppingCart, History, Trash, Edit, Star, Info, Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package, PackagePlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

interface Printer {
  id: string;
  brand: string;
  model: string;
  usage_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPrint, setSelectedPrint] = useState<typeof stockPrints[0] | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [stockPrints, setStockPrints] = useState<any[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  
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

  const [printerForm, setPrinterForm] = useState({
    brand: "",
    model: "",
    usage_hours: "",
    notes: ""
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
        fetchMovements(),
        fetchStockPrints(),
        fetchOrders(),
        fetchPrinters()
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

  const fetchStockPrints = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("prints")
        .select("*, projects(name)")
        .eq("user_id", user.id)
        .eq("print_type", "for_sale")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStockPrints(data || []);
    } catch (error: any) {
      console.error("Error al cargar impresiones de stock:", error);
    }
  };

  const fetchPrinters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("printers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrinters(data || []);
    } catch (error: any) {
      console.error("Error al cargar impresoras:", error);
      toast.error("Error al cargar impresoras");
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, status, order_date")
        .eq("user_id", user.id)
        .in("status", ["design", "to_produce", "printing", "clean_and_packaging"])
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error al cargar pedidos:", error);
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

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("printers")
        .insert([
          {
            user_id: user.id,
            brand: printerForm.brand,
            model: printerForm.model,
            usage_hours: parseFloat(printerForm.usage_hours) || 0,
            notes: printerForm.notes || null
          }
        ]);

      if (error) throw error;

      toast.success("Impresora agregada");
      setIsPrinterDialogOpen(false);
      setPrinterForm({
        brand: "",
        model: "",
        usage_hours: "",
        notes: ""
      });
      fetchPrinters();
    } catch (error: any) {
      toast.error("Error al agregar impresora");
    }
  };

  const handleUpdatePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingPrinter) return;

    try {
      const { error } = await supabase
        .from("printers")
        .update({
          brand: printerForm.brand,
          model: printerForm.model,
          usage_hours: parseFloat(printerForm.usage_hours) || 0,
          notes: printerForm.notes || null
        })
        .eq("id", editingPrinter.id);

      if (error) throw error;

      toast.success("Impresora actualizada");
      setIsPrinterDialogOpen(false);
      setEditingPrinter(null);
      setPrinterForm({
        brand: "",
        model: "",
        usage_hours: "",
        notes: ""
      });
      fetchPrinters();
    } catch (error: any) {
      toast.error("Error al actualizar impresora");
    }
  };

  const handleDeletePrinter = async (id: string) => {
    if (!confirm("¿Eliminar esta impresora?")) return;

    try {
      const { error } = await supabase.from("printers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Impresora eliminada");
      fetchPrinters();
    } catch (error: any) {
      toast.error("Error al eliminar impresora");
    }
  };

  const handleEditPrinter = (printer: Printer) => {
    setEditingPrinter(printer);
    setPrinterForm({
      brand: printer.brand,
      model: printer.model,
      usage_hours: printer.usage_hours.toString(),
      notes: printer.notes || ""
    });
    setIsPrinterDialogOpen(true);
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

  const handleAssignToPrint = (print: any) => {
    setSelectedPrint(print);
    setSelectedOrderId("");
    setIsAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedPrint || !selectedOrderId) {
      toast.error("Por favor selecciona un pedido");
      return;
    }

    try {
      const { error } = await supabase
        .from("prints")
        .update({
          order_id: selectedOrderId,
          print_type: "order",
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedPrint.id);

      if (error) throw error;

      toast.success("Objeto asignado al pedido correctamente");
      fetchData();
      setIsAssignDialogOpen(false);
      setSelectedPrint(null);
      setSelectedOrderId("");
    } catch (error: any) {
      console.error("Error al asignar objeto al pedido:", error);
      toast.error("Error al asignar objeto al pedido");
    }
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
                <div>
                  <Input
                    id="search"
                    placeholder="Buscar material..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
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
          <Tabs defaultValue="materials" className="space-y-4">
            <TabsList>
              <TabsTrigger value="materials">Materiales</TabsTrigger>
              <TabsTrigger value="objects">Objetos ({stockPrints.length})</TabsTrigger>
              <TabsTrigger value="printers">Impresoras ({printers.length})</TabsTrigger>
            </TabsList>

            {/* Subtab de Materiales */}
            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <CardTitle>Stock de Materiales</CardTitle>
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

        {/* Subtab de Objetos (Impresiones para vender) */}
        <TabsContent value="objects">
          <Card>
            <CardHeader>
              <CardTitle>Stock de Objetos</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Impresiones completadas para vender que aún no han sido asignadas a pedidos
              </p>
            </CardHeader>
            <CardContent>
              {stockPrints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay objetos en stock
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stockPrints.map((print: any) => (
                    <Card key={print.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{print.name}</CardTitle>
                      </CardHeader>
                       <CardContent className="space-y-3">
                        {print.projects && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Proyecto:</span> {print.projects.name}
                          </p>
                        )}
                        <p className="text-sm">
                          <span className="text-muted-foreground">Tiempo de impresión:</span> {print.print_time_hours}h
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Material usado:</span> {print.material_used_grams}g
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Fecha:</span>{" "}
                          {format(new Date(print.print_date), "dd/MM/yyyy", { locale: es })}
                        </p>
                        {print.notes && (
                          <p className="text-sm text-muted-foreground">{print.notes}</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleAssignToPrint(print)}
                        >
                          <PackagePlus className="h-4 w-4 mr-2" />
                          Asignar a pedido
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subtab de Impresoras */}
        <TabsContent value="printers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Gestión de Impresoras</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Administra tus impresoras 3D y sus horas de uso
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingPrinter(null);
                    setPrinterForm({
                      brand: "",
                      model: "",
                      usage_hours: "",
                      notes: ""
                    });
                    setIsPrinterDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Impresora
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {printers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay impresoras registradas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Horas de Uso</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {printers.map((printer) => (
                      <TableRow key={printer.id}>
                        <TableCell className="font-medium">{printer.brand}</TableCell>
                        <TableCell>{printer.model}</TableCell>
                        <TableCell>{printer.usage_hours.toFixed(1)}h</TableCell>
                        <TableCell>{printer.notes || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPrinter(printer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrinter(printer.id)}
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

      {/* Dialog para añadir/editar impresora */}
      <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrinter ? "Editar Impresora" : "Añadir Impresora"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingPrinter ? handleUpdatePrinter : handleAddPrinter} className="space-y-4">
            <div>
              <Label htmlFor="printer_brand">Marca *</Label>
              <Input
                id="printer_brand"
                value={printerForm.brand}
                onChange={(e) => setPrinterForm({ ...printerForm, brand: e.target.value })}
                required
                placeholder="Ej: Creality, Prusa, etc."
              />
            </div>
            <div>
              <Label htmlFor="printer_model">Modelo *</Label>
              <Input
                id="printer_model"
                value={printerForm.model}
                onChange={(e) => setPrinterForm({ ...printerForm, model: e.target.value })}
                required
                placeholder="Ej: Ender 3, i3 MK3S, etc."
              />
            </div>
            <div>
              <Label htmlFor="printer_hours">Horas de Uso *</Label>
              <Input
                id="printer_hours"
                type="number"
                step="0.1"
                min="0"
                value={printerForm.usage_hours}
                onChange={(e) => setPrinterForm({ ...printerForm, usage_hours: e.target.value })}
                required
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="printer_notes">Notas</Label>
              <Textarea
                id="printer_notes"
                value={printerForm.notes}
                onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })}
                placeholder="Información adicional sobre la impresora..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => {
                setIsPrinterDialogOpen(false);
                setEditingPrinter(null);
                setPrinterForm({
                  brand: "",
                  model: "",
                  usage_hours: "",
                  notes: ""
                });
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPrinter ? "Actualizar" : "Crear"} Impresora
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

      {/* Dialog para asignar objeto a pedido */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Objeto a Pedido</DialogTitle>
            <DialogDescription>
              Selecciona un pedido existente para asignar este objeto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPrint && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="font-medium">{selectedPrint.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>⏱️ {selectedPrint.print_time_hours}h</span>
                      <span>📦 {selectedPrint.material_used_grams}g</span>
                      <span>📅 {format(new Date(selectedPrint.print_date), "dd/MM/yyyy", { locale: es })}</span>
                    </div>
                    {selectedPrint.projects && (
                      <p className="text-sm text-muted-foreground">
                        Proyecto: {selectedPrint.projects.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label>Seleccionar Pedido *</Label>
              <ScrollArea className="h-[300px] rounded-md border p-4 mt-2">
                {orders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay pedidos activos</p>
                    <p className="text-sm mt-1">Crea un pedido desde la sección de Pedidos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orders.map((order: any) => (
                      <Card
                        key={order.id}
                        className={`cursor-pointer transition-colors ${
                          selectedOrderId === order.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer_name || "Sin cliente"}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">
                                  {order.status === "design" && "Diseño"}
                                  {order.status === "to_produce" && "Por Producir"}
                                  {order.status === "printing" && "Imprimiendo"}
                                  {order.status === "clean_and_packaging" && "Limpieza"}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.order_date), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedPrint(null);
                setSelectedOrderId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={!selectedOrderId}
            >
              Asignar a Pedido
            </Button>
          </DialogFooter>
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
