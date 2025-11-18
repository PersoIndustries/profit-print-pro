import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTierFeatures } from "@/hooks/useTierFeatures";
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
import { Loader2, Plus, ShoppingCart, History, Trash, Edit, Star, Info, Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package, PackagePlus, Printer, ListPlus, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X } from "lucide-react";
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


interface Printer {
  id: string;
  brand: string;
  model: string;
  usage_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to get material types with translations
const getMaterialTypes = (t: (key: string) => string) => [
  { value: 'filament', label: t('inventory.materialTypes.filament'), icon: Disc },
  { value: 'resin', label: t('inventory.materialTypes.resin'), icon: Droplet },
  { value: 'glue', label: t('inventory.materialTypes.glue'), icon: Droplet },
  { value: 'keyring', label: t('inventory.materialTypes.keyring'), icon: KeyRound },
  { value: 'screw', label: t('inventory.materialTypes.screw'), icon: Wrench },
  { value: 'paint', label: t('inventory.materialTypes.paint'), icon: Paintbrush },
  { value: 'sandpaper', label: t('inventory.materialTypes.sandpaper'), icon: FileBox },
  { value: 'other', label: t('inventory.materialTypes.other'), icon: Package },
];

// Helper function to get predefined colors with translations
const getPredefinedColors = (t: (key: string) => string) => [
  { name: t('inventory.colors.red'), value: "#ef4444" },
  { name: t('inventory.colors.orange'), value: "#f97316" },
  { name: t('inventory.colors.yellow'), value: "#eab308" },
  { name: t('inventory.colors.green'), value: "#22c55e" },
  { name: t('inventory.colors.blue'), value: "#3b82f6" },
  { name: t('inventory.colors.purple'), value: "#a855f7" },
  { name: t('inventory.colors.pink'), value: "#ec4899" },
  { name: t('inventory.colors.white'), value: "#f3f4f6" },
  { name: t('inventory.colors.black'), value: "#1f2937" },
  { name: t('inventory.colors.gray'), value: "#6b7280" },
];

const getMaterialIcon = (type: string | null, materialTypes: ReturnType<typeof getMaterialTypes>) => {
  const materialType = materialTypes.find(t => t.value === type);
  return materialType?.icon || Package;
};

const Inventory = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { isPro, isEnterprise, hasFeature } = useTierFeatures();
  const [tooltipOpen, setTooltipOpen] = useState<{ [key: string]: boolean }>({});
  
  // Get translated constants
  const MATERIAL_TYPES = getMaterialTypes(t);
  const PREDEFINED_COLORS = getPredefinedColors(t);
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, number>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Ordenamiento para Materials
  const [materialSortField, setMaterialSortField] = useState<string>("name");
  const [materialSortDirection, setMaterialSortDirection] = useState<"asc" | "desc">("asc");
  
  // Ordenamiento para Assignments
  const [assignmentSortField, setAssignmentSortField] = useState<string>("print_date");
  const [assignmentSortDirection, setAssignmentSortDirection] = useState<"asc" | "desc">("desc");
  
  // Ordenamiento para Printers
  const [printerSortField, setPrinterSortField] = useState<string>("brand");
  const [printerSortDirection, setPrinterSortDirection] = useState<"asc" | "desc">("asc");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPrint, setSelectedPrint] = useState<typeof stockPrints[0] | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [stockPrints, setStockPrints] = useState<any[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [isAddToShoppingListDialogOpen, setIsAddToShoppingListDialogOpen] = useState(false);
  const [selectedMaterialForShoppingList, setSelectedMaterialForShoppingList] = useState<Material | null>(null);
  const [shoppingLists, setShoppingLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedShoppingListId, setSelectedShoppingListId] = useState<string>("");
  const [newShoppingListName, setNewShoppingListName] = useState("");
  const [shoppingListItemName, setShoppingListItemName] = useState("");
  const [shoppingListItemQuantity, setShoppingListItemQuantity] = useState("");
  const [shoppingListItemEstimatedPrice, setShoppingListItemEstimatedPrice] = useState("");
  

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
      toast.error(t('inventory.messages.errorLoadingMaterials'));
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
      toast.error(t('inventory.messages.errorLoadingInventory'));
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
        .in("status", ["pending", "preparation", "ready_to_produce", "on_production", "packaging"])
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

      toast.success(t('inventory.messages.materialAdded'));
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
      toast.error(t('inventory.messages.errorAddingMaterial'));
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

      toast.success(t('inventory.messages.materialUpdated'));
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
      toast.error(t('inventory.messages.errorUpdatingMaterial'));
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm(t('inventory.dialogs.confirmDeleteMaterial'))) return;

    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
      toast.success(t('inventory.messages.materialDeleted'));
      fetchData();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorDeletingMaterial'));
    }
  };

  const fetchShoppingLists = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShoppingLists(data || []);
      if (data && data.length > 0 && !selectedShoppingListId) {
        setSelectedShoppingListId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      toast.error("Error al cargar las listas de compra");
    }
  };

  const handleAddToShoppingList = (material: Material) => {
    setSelectedMaterialForShoppingList(material);
    setIsAddToShoppingListDialogOpen(true);
    fetchShoppingLists();
    
    // Inicializar valores editables con sugerencias
    setShoppingListItemName(material.name);
    
    // Calcular cantidad sugerida
    const inventoryItem = inventory.find(inv => inv.material_id === material.id);
    const suggestedQuantity = inventoryItem && inventoryItem.min_stock_alert 
      ? `${(inventoryItem.min_stock_alert / 1000).toFixed(2)} kg`
      : "1 kg";
    setShoppingListItemQuantity(suggestedQuantity);
    
    // Calcular precio estimado
    const quantityKg = parseFloat(suggestedQuantity.replace(' kg', ''));
    const estimatedPrice = material.price_per_kg * quantityKg;
    setShoppingListItemEstimatedPrice(estimatedPrice.toFixed(2));
    
    // Resetear selección de lista y nombre de nueva lista
    setSelectedShoppingListId("");
    setNewShoppingListName("");
  };

  const handleSaveToShoppingList = async () => {
    if (!selectedMaterialForShoppingList) {
      toast.error("Error: material no seleccionado");
      return;
    }

    // Validar que haya un nombre para el item
        if (!shoppingListItemName.trim()) {
          toast.error(t('shoppingList.addToShoppingList.errors.materialNameRequired'));
          return;
        }

    try {
      let listId = selectedShoppingListId;

      // Si no hay lista seleccionada, crear una nueva
      if (!listId) {
            if (!newShoppingListName.trim()) {
              toast.error(t('shoppingList.addToShoppingList.errors.mustCreateOrSelect'));
              return;
            }

        // Crear nueva lista
        if (!user) {
          toast.error("Error: usuario no autenticado");
          return;
        }

        const { data: newList, error: createListError } = await supabase
          .from("shopping_lists")
          .insert({
            user_id: user.id,
            name: newShoppingListName.trim(),
          })
          .select()
          .single();

        if (createListError) throw createListError;
        listId = newList.id;
        
        // Actualizar la lista de listas disponibles
        await fetchShoppingLists();
      }

      // Validar y parsear precio estimado
      const estimatedPrice = shoppingListItemEstimatedPrice 
        ? parseFloat(shoppingListItemEstimatedPrice.replace(',', '.')) 
        : null;

      // Insertar item en la lista
      const { error } = await supabase
        .from("shopping_list")
        .insert({
          name: shoppingListItemName.trim(),
          quantity: shoppingListItemQuantity.trim() || null,
          estimated_price: estimatedPrice && !isNaN(estimatedPrice) ? estimatedPrice : null,
          shopping_list_id: listId,
          is_completed: false,
        });

      if (error) throw error;
          toast.success(t('shoppingList.addToShoppingList.success'));
      setIsAddToShoppingListDialogOpen(false);
      setSelectedMaterialForShoppingList(null);
      setSelectedShoppingListId("");
      setNewShoppingListName("");
      setShoppingListItemName("");
      setShoppingListItemQuantity("");
      setShoppingListItemEstimatedPrice("");
    } catch (error: any) {
      console.error("Error adding to shopping list:", error);
      toast.error(error.message || "Error al agregar a la lista de compra");
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

      toast.success(t('inventory.messages.printerAdded'));
      setIsPrinterDialogOpen(false);
      setPrinterForm({
        brand: "",
        model: "",
        usage_hours: "",
        notes: ""
      });
      fetchPrinters();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorAddingPrinter'));
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

      toast.success(t('inventory.messages.printerUpdated'));
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
      toast.error(t('inventory.messages.errorUpdatingPrinter'));
    }
  };

  const handleDeletePrinter = async (id: string) => {
    if (!confirm(t('inventory.dialogs.confirmDeletePrinter'))) return;

    try {
      const { error } = await supabase.from("printers").delete().eq("id", id);
      if (error) throw error;
      toast.success(t('inventory.messages.printerDeleted'));
      fetchPrinters();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorDeletingPrinter'));
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
      toast.error(t('inventory.messages.errorUpdatingFavorite'));
    }
  };

  const handleAssignToPrint = (print: any) => {
    setSelectedPrint(print);
    setSelectedOrderId("");
    setIsAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedPrint || !selectedOrderId) {
      toast.error(t('inventory.messages.selectOrder'));
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

      toast.success(t('inventory.messages.assignedToOrder'));
      fetchData();
      setIsAssignDialogOpen(false);
      setSelectedPrint(null);
      setSelectedOrderId("");
    } catch (error: any) {
      console.error("Error al asignar objeto al pedido:", error);
      toast.error(t('inventory.messages.errorAssigningToOrder'));
    }
  };

  // Función helper para ordenar
  const handleSort = (field: string, currentField: string, currentDirection: "asc" | "desc", setField: (f: string) => void, setDirection: (d: "asc" | "desc") => void) => {
    if (field === currentField) {
      setDirection(currentDirection === "asc" ? "desc" : "asc");
    } else {
      setField(field);
      setDirection("asc");
    }
  };

  // Función para ordenar materiales
  const sortMaterials = (materials: Material[]) => {
    const sorted = [...materials];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (materialSortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "type":
          aValue = a.type || "";
          bValue = b.type || "";
          break;
        case "price_per_kg":
          aValue = a.price_per_kg;
          bValue = b.price_per_kg;
          break;
        case "stock":
          const invA = inventory.find(inv => inv.material_id === a.id);
          const invB = inventory.find(inv => inv.material_id === b.id);
          const pendingA = pendingMaterials[a.id] || 0;
          const pendingB = pendingMaterials[b.id] || 0;
          aValue = invA ? invA.quantity_grams - pendingA : 0;
          bValue = invB ? invB.quantity_grams - pendingB : 0;
          break;
        case "favorite":
          aValue = a.is_favorite ? 1 : 0;
          bValue = b.is_favorite ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return materialSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return materialSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Función para ordenar assignments
  const sortAssignments = (assignments: any[]) => {
    const sorted = [...assignments];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (assignmentSortField) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "print_date":
          aValue = new Date(a.print_date).getTime();
          bValue = new Date(b.print_date).getTime();
          break;
        case "project":
          aValue = a.projects?.name?.toLowerCase() || "";
          bValue = b.projects?.name?.toLowerCase() || "";
          break;
        case "material_used":
          aValue = a.material_used_grams || 0;
          bValue = b.material_used_grams || 0;
          break;
        case "print_time":
          aValue = a.print_time_hours || 0;
          bValue = b.print_time_hours || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return assignmentSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return assignmentSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Función para ordenar printers
  const sortPrinters = (printers: Printer[]) => {
    const sorted = [...printers];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (printerSortField) {
        case "brand":
          aValue = a.brand?.toLowerCase() || "";
          bValue = b.brand?.toLowerCase() || "";
          break;
        case "model":
          aValue = a.model?.toLowerCase() || "";
          bValue = b.model?.toLowerCase() || "";
          break;
        case "usage_hours":
          aValue = a.usage_hours || 0;
          bValue = b.usage_hours || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return printerSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return printerSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Componente para header ordenable
  const SortableHeader = ({ 
    field, 
    currentField, 
    currentDirection, 
    onSort, 
    children 
  }: { 
    field: string; 
    currentField: string; 
    currentDirection: "asc" | "desc"; 
    onSort: (field: string) => void; 
    children: React.ReactNode;
  }) => {
    const isActive = field === currentField;
    return (
      <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => onSort(field)}>
        <div className="flex items-center gap-2">
          {children}
          {isActive ? (
            currentDirection === "asc" ? (
              <ArrowUp className="w-4 h-4 text-primary" />
            ) : (
              <ArrowDown className="w-4 h-4 text-primary" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 text-muted-foreground opacity-50" />
          )}
        </div>
      </TableHead>
    );
  };

  // Filtrar materiales
  const filteredMaterialsRaw = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || material.type === filterType;
    
    // Si showLowStock está activo, filtrar solo materiales con stock bajo (solo Pro y Business)
    if (showLowStock && (isPro || isEnterprise)) {
      const inventoryItem = inventory.find(inv => inv.material_id === material.id);
      if (!inventoryItem) return false; // No mostrar materiales sin stock
      const pending = pendingMaterials[material.id] || 0;
      const realStock = inventoryItem.quantity_grams - pending;
      return matchesSearch && matchesType && realStock < (inventoryItem.min_stock_alert || 0);
    }
    
    return matchesSearch && matchesType;
  });
  
  // Ordenar materiales filtrados
  const filteredMaterials = sortMaterials(filteredMaterialsRaw);
  
  // Ordenar assignments y printers
  const sortedAssignments = sortAssignments(stockPrints);
  const sortedPrinters = sortPrinters(printers);

  // Filtrar inventario para alertas de stock (solo Pro y Business)
  const filteredInventory = inventory.filter(item => {
    if (!showLowStock || (!isPro && !isEnterprise)) return true;
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
      {/* Tab de Stock */}
          <Tabs defaultValue="materials" className="space-y-4">
            <TabsList>
              <TabsTrigger value="materials">{t('inventory.tabs.materials')}</TabsTrigger>
              <TabsTrigger value="objects">{t('inventory.tabs.assignments')} ({stockPrints.length})</TabsTrigger>
              <TabsTrigger value="printers">{t('inventory.tabs.printers')} ({printers.length})</TabsTrigger>
            </TabsList>

            {/* Subtab de Materiales */}
            <TabsContent value="materials">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <CardTitle>{t('inventory.title')}</CardTitle>
                  <div className="flex items-center gap-3">
                    {(isPro || isEnterprise) && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border">
                        <input
                          type="checkbox"
                          id="low-stock-toggle-main"
                          checked={showLowStock}
                          onChange={(e) => setShowLowStock(e.target.checked)}
                          className="w-4 h-4 rounded border-input cursor-pointer"
                        />
                        <Label htmlFor="low-stock-toggle-main" className="cursor-pointer text-sm font-medium">
                          {t('inventory.lowStockWarning')}
                        </Label>
                      </div>
                    )}
                    <Button 
                      onClick={() => {
                        setEditingMaterial(null);
                        setMaterialForm({
                          name: "",
                          price_per_kg: "",
                          color: "",
                          type: "",
                          display_mode: "color",
                        });
                        setIsMaterialDialogOpen(true);
                      }}
                      className="shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('inventory.addMaterial')}
                    </Button>
                  </div>
                </div>
                {(isPro || isEnterprise) && showLowStock && filteredMaterials.some(m => {
                  const invItem = inventory.find(inv => inv.material_id === m.id);
                  const pending = pendingMaterials[m.id] || 0;
                  const realStock = (invItem?.quantity_grams || 0) - pending;
                  return invItem && realStock < (invItem.min_stock_alert || 0);
                }) && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium">
                      {t('inventory.lowStockWarning')}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Filtros Mejorados */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Filtros</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search" className="text-xs text-muted-foreground">Buscar material</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder={t('inventory.searchMaterial')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-type" className="text-xs text-muted-foreground">Tipo de material</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger id="filter-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('inventory.allTypes')}</SelectItem>
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
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t('inventory.clearFilters')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('inventory.noMaterialsFound')}
                </div>
              ) : (
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader
                          field="favorite"
                          currentField={materialSortField}
                          currentDirection={materialSortDirection}
                          onSort={(field) => handleSort(field, materialSortField, materialSortDirection, setMaterialSortField, setMaterialSortDirection)}
                        >
                          {t('inventory.favorite')}
                        </SortableHeader>
                        <SortableHeader
                          field="name"
                          currentField={materialSortField}
                          currentDirection={materialSortDirection}
                          onSort={(field) => handleSort(field, materialSortField, materialSortDirection, setMaterialSortField, setMaterialSortDirection)}
                        >
                          {t('inventory.material')}
                        </SortableHeader>
                        <SortableHeader
                          field="type"
                          currentField={materialSortField}
                          currentDirection={materialSortDirection}
                          onSort={(field) => handleSort(field, materialSortField, materialSortDirection, setMaterialSortField, setMaterialSortDirection)}
                        >
                          {t('inventory.type')}
                        </SortableHeader>
                        <SortableHeader
                          field="price_per_kg"
                          currentField={materialSortField}
                          currentDirection={materialSortDirection}
                          onSort={(field) => handleSort(field, materialSortField, materialSortDirection, setMaterialSortField, setMaterialSortDirection)}
                        >
                          <div className="flex items-center gap-2">
                            {t('inventory.pricePerKg')}
                            <Tooltip open={tooltipOpen['precio-kg']} onOpenChange={(open) => setTooltipOpen(prev => ({ ...prev, 'precio-kg': open }))}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center p-0 border-0 bg-transparent cursor-help"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTooltipOpen(prev => ({ ...prev, 'precio-kg': !prev['precio-kg'] }));
                                  }}
                                >
                                  <Info className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Este precio se usa para calcular los costos de materiales en proyectos, calculadora e impresiones</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </SortableHeader>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            Avg Price/kg
                            <Tooltip open={tooltipOpen['avg-precio-kg']} onOpenChange={(open) => setTooltipOpen(prev => ({ ...prev, 'avg-precio-kg': open }))}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center p-0 border-0 bg-transparent cursor-help"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTooltipOpen(prev => ({ ...prev, 'avg-precio-kg': !prev['avg-precio-kg'] }));
                                  }}
                                >
                                  <Info className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Precio promedio por kg basado en las adquisiciones históricas de este material</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        {(isPro || isEnterprise) && (
                          <>
                            <SortableHeader
                              field="stock"
                              currentField={materialSortField}
                              currentDirection={materialSortDirection}
                              onSort={(field) => handleSort(field, materialSortField, materialSortDirection, setMaterialSortField, setMaterialSortDirection)}
                            >
                              <div className="flex items-center gap-2">
                                {t('inventory.stockAvailable')}
                                <Tooltip open={tooltipOpen['stock-disponible']} onOpenChange={(open) => setTooltipOpen(prev => ({ ...prev, 'stock-disponible': open }))}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center p-0 border-0 bg-transparent cursor-help"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTooltipOpen(prev => ({ ...prev, 'stock-disponible': !prev['stock-disponible'] }));
                                      }}
                                    >
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('inventory.stockAvailableTooltip')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </SortableHeader>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                {t('inventory.pending')}
                                <Tooltip open={tooltipOpen['pendiente']} onOpenChange={(open) => setTooltipOpen(prev => ({ ...prev, 'pendiente': open }))}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center p-0 border-0 bg-transparent cursor-help"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTooltipOpen(prev => ({ ...prev, 'pendiente': !prev['pendiente'] }));
                                      }}
                                    >
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('inventory.pendingTooltip')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                {t('inventory.realStock')}
                                <Tooltip open={tooltipOpen['stock-real']} onOpenChange={(open) => setTooltipOpen(prev => ({ ...prev, 'stock-real': open }))}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center p-0 border-0 bg-transparent cursor-help"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTooltipOpen(prev => ({ ...prev, 'stock-real': !prev['stock-real'] }));
                                      }}
                                    >
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('inventory.realStockTooltip')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableHead>
                          </>
                        )}
                        <TableHead>{t('inventory.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterials.map((material) => {
                        const Icon = getMaterialIcon(material.type, MATERIAL_TYPES);
                        // Buscar el item de inventario correspondiente
                        const inventoryItem = inventory.find(inv => inv.material_id === material.id);
                        const pending = pendingMaterials[material.id] || 0;
                        const stockAvailable = inventoryItem ? inventoryItem.quantity_grams : 0;
                        const realStock = stockAvailable - pending;
                        const isLowStock = inventoryItem && realStock < (inventoryItem.min_stock_alert || 0);
                        
                        // Nota: El precio promedio se calcula en la página de Adquisiciones
                        const avgPricePerKg: number | null = null;

                        return (
                          <TableRow key={material.id} className={(isPro || isEnterprise) && isLowStock ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
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
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {material.price_per_kg.toFixed(2)}€
                              </div>
                            </TableCell>
                            <TableCell>
                              {avgPricePerKg !== null ? (
                                <span className={avgPricePerKg < material.price_per_kg ? 'text-green-600 dark:text-green-400' : avgPricePerKg > material.price_per_kg ? 'text-orange-600 dark:text-orange-400' : ''}>
                                  {avgPricePerKg.toFixed(2)}€
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {(isPro || isEnterprise) && (
                              <>
                                <TableCell>
                                  {inventoryItem ? (
                                    <span className={isLowStock ? 'text-red-500 font-semibold' : ''}>
                                      {stockAvailable}g ({(stockAvailable / 1000).toFixed(2)}kg)
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Sin stock</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {pending > 0 ? (
                                    <Badge variant="default">
                                      {pending}g ({(pending / 1000).toFixed(2)}kg)
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {inventoryItem ? (
                                    <span className={isLowStock ? 'text-red-500 font-bold' : ''}>
                                      {realStock}g ({(realStock / 1000).toFixed(2)}kg)
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <div className="flex gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleAddToShoppingList(material)}
                                      >
                                        <ListPlus className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Agregar a lista de compra</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subtab de Objetos (Impresiones para vender) */}
        <TabsContent value="objects">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Stock de Objetos</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Impresiones completadas para vender que aún no han sido asignadas a pedidos
                  </p>
                </div>
                {stockPrints.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="shadow-sm"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {stockPrints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay objetos en stock
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filtros para Assignments */}
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Ordenar por</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={assignmentSortField === "name" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSort("name", assignmentSortField, assignmentSortDirection, setAssignmentSortField, setAssignmentSortDirection)}
                      >
                        Nombre
                        {assignmentSortField === "name" && (assignmentSortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                      </Button>
                      <Button
                        variant={assignmentSortField === "print_date" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSort("print_date", assignmentSortField, assignmentSortDirection, setAssignmentSortField, setAssignmentSortDirection)}
                      >
                        Fecha
                        {assignmentSortField === "print_date" && (assignmentSortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                      </Button>
                      <Button
                        variant={assignmentSortField === "project" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSort("project", assignmentSortField, assignmentSortDirection, setAssignmentSortField, setAssignmentSortDirection)}
                      >
                        Proyecto
                        {assignmentSortField === "project" && (assignmentSortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedAssignments.map((print: any) => (
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
                  className="shadow-sm"
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
                <div className="space-y-4">
                  {/* Filtros para Printers */}
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Ordenar por</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={printerSortField === "brand" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSort("brand", printerSortField, printerSortDirection, setPrinterSortField, setPrinterSortDirection)}
                      >
                        Marca
                        {printerSortField === "brand" && (printerSortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                      </Button>
                      <Button
                        variant={printerSortField === "model" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSort("model", printerSortField, printerSortDirection, setPrinterSortField, setPrinterSortDirection)}
                      >
                        Modelo
                        {printerSortField === "model" && (printerSortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                      </Button>
                      <Button
                        variant={printerSortField === "usage_hours" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSort("usage_hours", printerSortField, printerSortDirection, setPrinterSortField, setPrinterSortDirection)}
                      >
                        Horas de Uso
                        {printerSortField === "usage_hours" && (printerSortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader
                          field="brand"
                          currentField={printerSortField}
                          currentDirection={printerSortDirection}
                          onSort={(field) => handleSort(field, printerSortField, printerSortDirection, setPrinterSortField, setPrinterSortDirection)}
                        >
                          Marca
                        </SortableHeader>
                        <SortableHeader
                          field="model"
                          currentField={printerSortField}
                          currentDirection={printerSortDirection}
                          onSort={(field) => handleSort(field, printerSortField, printerSortDirection, setPrinterSortField, setPrinterSortDirection)}
                        >
                          Modelo
                        </SortableHeader>
                        <SortableHeader
                          field="usage_hours"
                          currentField={printerSortField}
                          currentDirection={printerSortDirection}
                          onSort={(field) => handleSort(field, printerSortField, printerSortDirection, setPrinterSortField, setPrinterSortDirection)}
                        >
                          Horas de Uso
                        </SortableHeader>
                        <TableHead>Notas</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPrinters.map((printer) => (
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

      {/* Dialog para añadir/editar material */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? t('inventory.dialogs.editMaterial') : t('inventory.dialogs.addMaterial')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingMaterial ? handleSaveEditMaterial : handleAddMaterial} className="space-y-4">
            <div>
              <Label htmlFor="material-name">{t('inventory.formLabels.name')} *</Label>
              <Input
                id="material-name"
                value={materialForm.name}
                onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="material-price">{t('inventory.formLabels.pricePerKg')} *</Label>
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
              <Label htmlFor="material-type">{t('inventory.formLabels.type')}</Label>
              <Select
                value={materialForm.type}
                onValueChange={(value) => setMaterialForm({ ...materialForm, type: value })}
              >
                <SelectTrigger id="material-type">
                  <SelectValue placeholder={t('inventory.dialogs.selectType')} />
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
              <Label htmlFor="display-mode">{t('inventory.formLabels.displayMode')}</Label>
              <Select
                value={materialForm.display_mode}
                onValueChange={(value: 'color' | 'icon') => setMaterialForm({ ...materialForm, display_mode: value })}
              >
                <SelectTrigger id="display-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">{t('inventory.formLabels.displayModeColor')}</SelectItem>
                  <SelectItem value="icon">{t('inventory.formLabels.displayModeIcon')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {materialForm.display_mode === 'color' && (
              <div>
                <Label htmlFor="color">{t('inventory.formLabels.color')}</Label>
                <Select
                  value={materialForm.color}
                  onValueChange={(value) => setMaterialForm({ ...materialForm, color: value })}
                >
                  <SelectTrigger id="color">
                    <SelectValue placeholder={t('inventory.dialogs.selectColor')} />
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
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {editingMaterial ? t('inventory.dialogs.update') : t('inventory.dialogs.create')} {t('inventory.material')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para añadir/editar impresora */}
      <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrinter ? t('inventory.dialogs.editPrinter') : t('inventory.dialogs.addPrinter')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingPrinter ? handleUpdatePrinter : handleAddPrinter} className="space-y-4">
            <div>
              <Label htmlFor="printer_brand">{t('inventory.formLabels.brand')} *</Label>
              <Input
                id="printer_brand"
                value={printerForm.brand}
                onChange={(e) => setPrinterForm({ ...printerForm, brand: e.target.value })}
                required
                placeholder="Ej: Creality, Prusa, etc."
              />
            </div>
            <div>
              <Label htmlFor="printer_model">{t('inventory.formLabels.model')} *</Label>
              <Input
                id="printer_model"
                value={printerForm.model}
                onChange={(e) => setPrinterForm({ ...printerForm, model: e.target.value })}
                required
                placeholder="Ej: Ender 3, i3 MK3S, etc."
              />
            </div>
            <div>
              <Label htmlFor="printer_hours">{t('inventory.formLabels.usageHours')} *</Label>
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
              <Label htmlFor="printer_notes">{t('inventory.formLabels.notes')}</Label>
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
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {editingPrinter ? t('inventory.dialogs.update') : t('inventory.dialogs.create')} {t('inventory.tabs.printers')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para añadir adquisición */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={setIsAcquisitionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.tabs.acquisitions')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAcquisition} className="space-y-4">
            <div>
              <Label htmlFor="acq_material">{t('inventory.material')} *</Label>
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
              <Label htmlFor="acq_quantity">{t('inventory.formLabels.quantity')} *</Label>
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
              <Label htmlFor="acq_price">{t('inventory.formLabels.unitPrice')} *</Label>
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
              <Label htmlFor="acq_supplier">{t('inventory.formLabels.supplier')}</Label>
              <Input
                id="acq_supplier"
                value={acquisitionForm.supplier}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="acq_date">{t('inventory.formLabels.purchaseDate')} *</Label>
              <Input
                id="acq_date"
                type="date"
                value={acquisitionForm.purchase_date}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, purchase_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_notes">{t('inventory.formLabels.notes')}</Label>
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
                                  {order.status === "pending" && "Pendiente"}
                                  {order.status === "preparation" && "Preparación"}
                                  {order.status === "ready_to_produce" && "Listo para Producir"}
                                  {order.status === "on_production" && "En Producción"}
                                  {order.status === "packaging" && "Embalaje"}
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

      {/* Dialog para agregar a lista de compra */}
      <Dialog open={isAddToShoppingListDialogOpen} onOpenChange={setIsAddToShoppingListDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shoppingList.addToShoppingList.title')}</DialogTitle>
            <DialogDescription>
              {t('shoppingList.addToShoppingList.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Selección de lista o creación de nueva */}
            {shoppingLists.length > 0 ? (
              <div className="space-y-2">
                <Label>{t('shoppingList.addToShoppingList.selectList')}</Label>
                <Select
                  value={selectedShoppingListId}
                  onValueChange={(value) => {
                    setSelectedShoppingListId(value);
                    setNewShoppingListName(""); // Limpiar nombre de nueva lista si se selecciona una existente
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('shoppingList.addToShoppingList.selectList')} />
                  </SelectTrigger>
                  <SelectContent>
                    {shoppingLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-center text-sm text-muted-foreground">{t('shoppingList.addToShoppingList.or')}</div>
                <div className="space-y-2">
                  <Label>{t('shoppingList.addToShoppingList.createNewList')}</Label>
                  <Input
                    placeholder={t('shoppingList.addToShoppingList.newListNamePlaceholder')}
                    value={newShoppingListName}
                    onChange={(e) => {
                      setNewShoppingListName(e.target.value);
                      setSelectedShoppingListId(""); // Limpiar selección si se escribe nombre nuevo
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('shoppingList.addToShoppingList.createNewListRequired')}</Label>
                <Input
                  placeholder={t('shoppingList.addToShoppingList.newListNamePlaceholder')}
                  value={newShoppingListName}
                  onChange={(e) => setNewShoppingListName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('shoppingList.addToShoppingList.noListsMessage')}
                </p>
              </div>
            )}

            {/* Campos editables del material */}
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>{t('shoppingList.addToShoppingList.materialName')}</Label>
                <Input
                  value={shoppingListItemName}
                  onChange={(e) => setShoppingListItemName(e.target.value)}
                  placeholder={t('shoppingList.addToShoppingList.materialNamePlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('shoppingList.addToShoppingList.quantity')}</Label>
                <Input
                  value={shoppingListItemQuantity}
                  onChange={(e) => {
                    setShoppingListItemQuantity(e.target.value);
                    // Recalcular precio estimado si hay cantidad y precio por kg
                    if (selectedMaterialForShoppingList && e.target.value) {
                      const quantityMatch = e.target.value.match(/(\d+\.?\d*)/);
                      if (quantityMatch) {
                        const quantityKg = parseFloat(quantityMatch[1]);
                        if (!isNaN(quantityKg)) {
                          const newPrice = selectedMaterialForShoppingList.price_per_kg * quantityKg;
                          setShoppingListItemEstimatedPrice(newPrice.toFixed(2));
                        }
                      }
                    }
                  }}
                  placeholder={t('shoppingList.addToShoppingList.quantityPlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('shoppingList.addToShoppingList.estimatedPrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shoppingListItemEstimatedPrice}
                  onChange={(e) => setShoppingListItemEstimatedPrice(e.target.value)}
                  placeholder="0.00"
                />
                {selectedMaterialForShoppingList && (
                  <p className="text-xs text-muted-foreground">
                    {t('shoppingList.addToShoppingList.pricePerKg')}: {selectedMaterialForShoppingList.price_per_kg.toFixed(2)} €
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddToShoppingListDialogOpen(false);
                setSelectedMaterialForShoppingList(null);
                setSelectedShoppingListId("");
                setNewShoppingListName("");
                setShoppingListItemName("");
                setShoppingListItemQuantity("");
                setShoppingListItemEstimatedPrice("");
              }}
            >
              {t('shoppingList.addToShoppingList.cancel')}
            </Button>
            <Button
              onClick={handleSaveToShoppingList}
              disabled={!shoppingListItemName.trim() || (!selectedShoppingListId && !newShoppingListName.trim())}
            >
              <ListPlus className="w-4 h-4 mr-2" />
              {t('shoppingList.addToShoppingList.addToList')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
