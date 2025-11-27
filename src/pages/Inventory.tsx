import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { useSubscription } from "@/hooks/useSubscription";
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
import { Loader2, Plus, ShoppingCart, History, Trash, Edit, Star, Info, Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package, PackagePlus, Printer, ListPlus, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X, PrinterIcon, Trash2 } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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


interface MaintenancePart {
  id: string;
  part_name: string;
  maintenance_hours: number;
  current_hours: number;
  notes: string | null;
}

interface Printer {
  id: string;
  brand: string;
  model: string;
  usage_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  printer_maintenance_parts?: MaintenancePart[];
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
  const { subscription } = useSubscription();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [materialInUse, setMaterialInUse] = useState<{ inUse: boolean; projectName?: string } | null>(null);
  const [checkingMaterialUsage, setCheckingMaterialUsage] = useState(false);
  const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [materialProjects, setMaterialProjects] = useState<Array<{ project_id: string; project_name: string; weight_grams: number }>>([]);
  const [loadingMaterialProjects, setLoadingMaterialProjects] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
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
  
  // Paginación automática (solo cuando hay >50 items)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [materialForm, setMaterialForm] = useState({
    name: "",
    price_per_kg: "",
    color: "",
    type: "",
    display_mode: "color" as 'color' | 'icon',
    unit_type: "g",
    min_stock_alert: "500",
  });

  const [printerForm, setPrinterForm] = useState({
    brand: "",
    model: "",
    usage_hours: "",
    notes: ""
  });

  const [maintenanceParts, setMaintenanceParts] = useState<Array<{
    tempId: string;
    part_name: string;
    maintenance_hours: string;
    current_hours: string;
    notes: string;
  }>>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(t('inventory.messages.errorLoadingData') || "Error al cargar los datos");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
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
        .select("*, printer_maintenance_parts(*)")
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
        unit_type: materialForm.unit_type,
      };

      if (materialForm.display_mode === 'color') {
        materialData.color = materialForm.color;
      }

      const { data: newMaterial, error: materialError } = await supabase
        .from("materials")
        .insert([materialData])
        .select()
        .single();

      if (materialError) throw materialError;

      // Create inventory item with min_stock_alert
      if (newMaterial) {
        await supabase
          .from("inventory_items")
          .insert([{
            user_id: user.id,
            material_id: newMaterial.id,
            quantity_grams: 0,
            min_stock_alert: parseFloat(materialForm.min_stock_alert) || 500
          }]);
      }

      toast.success(t('inventory.messages.materialAdded'));
      setIsMaterialDialogOpen(false);
      setMaterialForm({
        name: "",
        price_per_kg: "",
        color: "",
        type: "",
        display_mode: "color",
        unit_type: "g",
        min_stock_alert: "500",
      });
      fetchData();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorAddingMaterial'));
    }
  };

  const handleEditMaterial = async (material: Material) => {
    setEditingMaterial(material);
    
    // Get current inventory item to get min_stock_alert
    const { data: inventoryItem } = await supabase
      .from("inventory_items")
      .select("min_stock_alert")
      .eq("material_id", material.id)
      .eq("user_id", user?.id || "")
      .single();
    
    setMaterialForm({
      name: material.name,
      price_per_kg: material.price_per_kg.toString(),
      color: material.color || "",
      type: material.type || "",
      display_mode: material.display_mode,
      unit_type: (material as any).unit_type || "g",
      min_stock_alert: inventoryItem?.min_stock_alert?.toString() || "500",
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
        unit_type: materialForm.unit_type,
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

      // Update inventory min_stock_alert
      await supabase
        .from("inventory_items")
        .update({ min_stock_alert: parseFloat(materialForm.min_stock_alert) || 500 })
        .eq("material_id", editingMaterial.id)
        .eq("user_id", user.id);

      toast.success(t('inventory.messages.materialUpdated'));
      setIsMaterialDialogOpen(false);
      const wasViewing = materialViewerOpen && viewingMaterial && editingMaterial?.id === viewingMaterial.id;
      const materialIdToUpdate = editingMaterial.id;
      setEditingMaterial(null);
      setMaterialForm({
        name: "",
        price_per_kg: "",
        color: "",
        type: "",
        display_mode: "color",
        unit_type: "g",
        min_stock_alert: "500",
      });
      fetchData();
      // Si el modal de visualización está abierto, actualizar el material que se está viendo
      if (wasViewing && materialIdToUpdate) {
        const { data: updatedMaterial } = await supabase
          .from("materials")
          .select("*")
          .eq("id", materialIdToUpdate)
          .single();
        if (updatedMaterial) {
          setViewingMaterial({
            ...updatedMaterial,
            display_mode: (updatedMaterial.display_mode || 'color') as 'color' | 'icon'
          });
          // También actualizar la lista de proyectos
          const { data: projectMaterials } = await supabase
            .from("project_materials")
            .select("project_id, weight_grams, projects(name)")
            .eq("material_id", materialIdToUpdate);
          if (projectMaterials) {
            const projects = projectMaterials.map((pm: any) => ({
              project_id: pm.project_id,
              project_name: pm.projects?.name || 'Proyecto sin nombre',
              weight_grams: pm.weight_grams,
            }));
            setMaterialProjects(projects);
          }
        }
      }
    } catch (error: any) {
      toast.error(t('inventory.messages.errorUpdatingMaterial'));
    }
  };

  const openMaterialViewer = async (material: Material) => {
    setViewingMaterial(material);
    setMaterialViewerOpen(true);
    setLoadingMaterialProjects(true);
    
    // Cargar proyectos que usan este material
    try {
      const { data: projectMaterials, error: projectMaterialsError } = await supabase
        .from("project_materials")
        .select("project_id, weight_grams, projects(name)")
        .eq("material_id", material.id);

      if (projectMaterialsError) throw projectMaterialsError;

      const projects = (projectMaterials || []).map((pm: any) => ({
        project_id: pm.project_id,
        project_name: pm.projects?.name || 'Proyecto sin nombre',
        weight_grams: pm.weight_grams,
      }));

      setMaterialProjects(projects);
    } catch (error) {
      console.error("Error loading material projects:", error);
      setMaterialProjects([]);
    } finally {
      setLoadingMaterialProjects(false);
    }
  };

  const openDeleteDialog = async (material: Material) => {
    setMaterialToDelete(material);
    setMaterialInUse(null);
    setCheckingMaterialUsage(true);
    setShowDeleteDialog(true);

    // Verificar si el material está siendo usado
    try {
      const { data: projectMaterials, error: projectMaterialsError } = await supabase
        .from("project_materials")
        .select("id, project_id, projects(name)")
        .eq("material_id", material.id)
        .limit(1);

      if (!projectMaterialsError && projectMaterials && projectMaterials.length > 0) {
        const projectName = (projectMaterials[0] as any).projects?.name || 'un proyecto';
        setMaterialInUse({ inUse: true, projectName });
      } else {
        setMaterialInUse({ inUse: false });
      }
    } catch (error) {
      console.error("Error checking material usage:", error);
      setMaterialInUse({ inUse: false });
    } finally {
      setCheckingMaterialUsage(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;

    // Si ya sabemos que está en uso, no intentar eliminar
    if (materialInUse?.inUse) {
      return;
    }

    try {
      // Verificación adicional por seguridad
      const { data: projectMaterials, error: projectMaterialsError } = await supabase
        .from("project_materials")
        .select("id, project_id, projects(name)")
        .eq("material_id", materialToDelete.id)
        .limit(1);

      if (projectMaterialsError) throw projectMaterialsError;

      if (projectMaterials && projectMaterials.length > 0) {
        const projectName = (projectMaterials[0] as any).projects?.name || 'un proyecto';
        toast.error(
          `No se puede eliminar el material porque está siendo usado en ${projectName}. Primero debes eliminar el material del proyecto.`
        );
        setShowDeleteDialog(false);
        setMaterialToDelete(null);
        setMaterialInUse(null);
        return;
      }

      // Si no está en uso, proceder con la eliminación
      const { error } = await supabase.from("materials").delete().eq("id", materialToDelete.id);
      if (error) throw error;
      toast.success(t('inventory.messages.materialDeleted'));
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
      setMaterialInUse(null);
      // Cerrar el modal de visualización si está abierto
      if (materialViewerOpen) {
        setMaterialViewerOpen(false);
        setViewingMaterial(null);
      }
      fetchData();
    } catch (error: any) {
      console.error("Error deleting material:", error);
      // Verificar si es un error de restricción de clave foránea
      if (error?.code === '23503' || error?.message?.includes('foreign key constraint')) {
        toast.error(
          'No se puede eliminar el material porque está siendo usado en uno o más proyectos. Primero debes eliminar el material de los proyectos.'
        );
      } else {
        toast.error(t('inventory.messages.errorDeletingMaterial'));
      }
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

        // Verificar límite de listas de compra
        if (subscription && !subscription.canAdd.shoppingLists) {
          toast.error(t('shoppingList.messages.shoppingListLimitReached', { limit: subscription.limits.shoppingLists }));
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
      if (!user) {
        toast.error("Error: usuario no autenticado");
        return;
      }

      const { error } = await supabase
        .from("shopping_list")
        .insert({
          user_id: user.id,
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
      const { data: newPrinter, error } = await supabase
        .from("printers")
        .insert([
          {
            user_id: user.id,
            brand: printerForm.brand,
            model: printerForm.model,
            usage_hours: parseFloat(printerForm.usage_hours) || 0,
            notes: printerForm.notes || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Insert maintenance parts if any
      if (maintenanceParts.length > 0 && newPrinter) {
        const partsToInsert = maintenanceParts.map(part => ({
          printer_id: newPrinter.id,
          part_name: part.part_name,
          maintenance_hours: parseFloat(part.maintenance_hours) || 0,
          current_hours: parseFloat(part.current_hours) || 0,
          notes: part.notes || null
        }));

        const { error: partsError } = await supabase
          .from("printer_maintenance_parts")
          .insert(partsToInsert);

        if (partsError) throw partsError;
      }

      toast.success(t('inventory.messages.printerAdded'));
      setIsPrinterDialogOpen(false);
      setPrinterForm({
        brand: "",
        model: "",
        usage_hours: "",
        notes: ""
      });
      setMaintenanceParts([]);
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

      // Delete existing maintenance parts
      const { error: deleteError } = await supabase
        .from("printer_maintenance_parts")
        .delete()
        .eq("printer_id", editingPrinter.id);

      if (deleteError) throw deleteError;

      // Insert new maintenance parts
      if (maintenanceParts.length > 0) {
        const partsToInsert = maintenanceParts.map(part => ({
          printer_id: editingPrinter.id,
          part_name: part.part_name,
          maintenance_hours: parseFloat(part.maintenance_hours) || 0,
          current_hours: parseFloat(part.current_hours) || 0,
          notes: part.notes || null
        }));

        const { error: partsError } = await supabase
          .from("printer_maintenance_parts")
          .insert(partsToInsert);

        if (partsError) throw partsError;
      }

      toast.success(t('inventory.messages.printerUpdated'));
      setIsPrinterDialogOpen(false);
      setEditingPrinter(null);
      setPrinterForm({
        brand: "",
        model: "",
        usage_hours: "",
        notes: ""
      });
      setMaintenanceParts([]);
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
    
    // Load maintenance parts
    if (printer.printer_maintenance_parts && printer.printer_maintenance_parts.length > 0) {
      setMaintenanceParts(printer.printer_maintenance_parts.map(part => ({
        tempId: part.id,
        part_name: part.part_name,
        maintenance_hours: part.maintenance_hours.toString(),
        current_hours: part.current_hours.toString(),
        notes: part.notes || ""
      })));
    } else {
      setMaintenanceParts([]);
    }
    
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
    
    // Si showLowStock está activo, filtrar solo materiales con stock bajo o sin stock (solo Pro y Business)
    if (showLowStock && (isPro || isEnterprise)) {
      const inventoryItem = inventory.find(inv => inv.material_id === material.id);
      // Incluir materiales sin stock Y materiales con stock bajo
      if (!inventoryItem) return matchesSearch && matchesType; // Mostrar materiales sin stock
      const pending = pendingMaterials[material.id] || 0;
      const realStock = inventoryItem.quantity_grams - pending;
      return matchesSearch && matchesType && realStock < (inventoryItem.min_stock_alert || 0);
    }
    
    return matchesSearch && matchesType;
  });
  
  // Ordenar materiales filtrados
  const filteredMaterials = sortMaterials(filteredMaterialsRaw);
  
  // Paginación automática (solo cuando hay >50 items)
  const needsPagination = filteredMaterials.length > itemsPerPage;
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = needsPagination ? (currentPage - 1) * itemsPerPage : 0;
  const endIndex = needsPagination ? startIndex + itemsPerPage : filteredMaterials.length;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);
  
  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, showLowStock]);
  
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

  if (!user) {
    return null;
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
              <div className="flex items-center gap-4 flex-wrap">
                <CardTitle className="flex-shrink-0">{t('inventory.title')}</CardTitle>
                
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
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
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
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
                
                {(isPro || isEnterprise) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="low-stock-toggle-main"
                      checked={showLowStock}
                      onChange={(e) => setShowLowStock(e.target.checked)}
                      className="w-4 h-4 rounded border-input cursor-pointer"
                    />
                    <Label htmlFor="low-stock-toggle-main" className="cursor-pointer text-sm whitespace-nowrap">
                      Stock bajo
                    </Label>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("all");
                  }}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('inventory.clearFilters')}
                </Button>
                
                <Button 
                  onClick={() => {
                    setEditingMaterial(null);
                    setMaterialForm({
                      name: "",
                      price_per_kg: "",
                      color: "",
                      type: "",
                      display_mode: "color",
                      unit_type: "g",
                      min_stock_alert: "500",
                    });
                    setIsMaterialDialogOpen(true);
                  }}
                  className="flex-shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('inventory.addMaterial')}
                </Button>
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
                                <p>{t('inventory.pricePerKgTooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </SortableHeader>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            {t('inventory.avgPricePerKg')}
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
                                <p>{t('inventory.avgPricePerKgTooltip')}</p>
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
                      {paginatedMaterials.map((material) => {
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
                          <TableRow 
                            key={material.id} 
                            className={`cursor-pointer hover:bg-muted/50 ${(isPro || isEnterprise) && isLowStock ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
                            onClick={() => openMaterialViewer(material)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddToShoppingList(material);
                                        }}
                                      >
                                        <ListPlus className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('shoppingList.addToShoppingList.addToListTooltip')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                {needsPagination && (
                  <div className="mt-4 flex items-center justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <div className="ml-4 text-sm text-muted-foreground">
                      {t('common.pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredMaterials.length), total: filteredMaterials.length })}
                    </div>
                  </div>
                )}
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
                    <CardTitle>Productos</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Impresiones completadas para vender que aún no han sido asignadas a pedidos
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {stockPrints.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="shadow-sm"
                      >
                        <PrinterIcon className="w-4 h-4 mr-2" />
                        Imprimir
                      </Button>
                    )}
                  </div>
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
                </div>
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="unit-type">{t('inventory.formLabels.unitType')} *</Label>
                <Select
                  value={materialForm.unit_type}
                  onValueChange={(value) => setMaterialForm({ ...materialForm, unit_type: value })}
                >
                  <SelectTrigger id="unit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">{t('inventory.units.grams')}</SelectItem>
                    <SelectItem value="kg">{t('inventory.units.kilograms')}</SelectItem>
                    <SelectItem value="l">{t('inventory.units.liters')}</SelectItem>
                    <SelectItem value="units">{t('inventory.units.units')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="min-stock-alert">{t('inventory.formLabels.minStockAlert')} *</Label>
              <Input
                id="min-stock-alert"
                type="number"
                step="0.1"
                value={materialForm.min_stock_alert}
                onChange={(e) => setMaterialForm({ ...materialForm, min_stock_alert: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('inventory.formLabels.minStockAlertHelp')}
              </p>
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border cursor-pointer"
                      style={{ backgroundColor: materialForm.color || '#000000' }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                      {showColorPicker ? 'Cerrar selector' : 'Selector de color'}
                    </Button>
                  </div>
                  {showColorPicker && (
                    <div className="mt-2">
                      <HexColorPicker
                        color={materialForm.color || '#000000'}
                        onChange={(color) => {
                          setMaterialForm({ ...materialForm, color });
                          setSelectedColor(color);
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">O selecciona un color predefinido:</p>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color.value, borderColor: materialForm.color === color.value ? '#000' : 'transparent' }}
                        onClick={() => setMaterialForm({ ...materialForm, color: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
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

            {/* Maintenance Parts Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('inventory.maintenance.title')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMaintenanceParts([
                      ...maintenanceParts,
                      {
                        tempId: `temp-${Date.now()}`,
                        part_name: "",
                        maintenance_hours: "",
                        current_hours: "0",
                        notes: ""
                      }
                    ]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('inventory.maintenance.addPart')}
                </Button>
              </div>

              {maintenanceParts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('inventory.maintenance.noParts')}</p>
              ) : (
                <div className="space-y-3">
                  {maintenanceParts.map((part, index) => (
                    <Card key={part.tempId} className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-3">
                            <div>
                              <Label htmlFor={`part_name_${index}`} className="text-xs">{t('inventory.maintenance.partName')} *</Label>
                              <Input
                                id={`part_name_${index}`}
                                value={part.part_name}
                                onChange={(e) => {
                                  const newParts = [...maintenanceParts];
                                  newParts[index].part_name = e.target.value;
                                  setMaintenanceParts(newParts);
                                }}
                                placeholder={t('inventory.maintenance.partNamePlaceholder')}
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor={`maintenance_hours_${index}`} className="text-xs">{t('inventory.maintenance.maintenanceHours')} *</Label>
                                <Input
                                  id={`maintenance_hours_${index}`}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={part.maintenance_hours}
                                  onChange={(e) => {
                                    const newParts = [...maintenanceParts];
                                    newParts[index].maintenance_hours = e.target.value;
                                    setMaintenanceParts(newParts);
                                  }}
                                  placeholder="100"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor={`current_hours_${index}`} className="text-xs">{t('inventory.maintenance.currentHours')} *</Label>
                                <Input
                                  id={`current_hours_${index}`}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={part.current_hours}
                                  onChange={(e) => {
                                    const newParts = [...maintenanceParts];
                                    newParts[index].current_hours = e.target.value;
                                    setMaintenanceParts(newParts);
                                  }}
                                  placeholder="0"
                                  required
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`part_notes_${index}`} className="text-xs">{t('inventory.formLabels.notes')}</Label>
                              <Textarea
                                id={`part_notes_${index}`}
                                value={part.notes}
                                onChange={(e) => {
                                  const newParts = [...maintenanceParts];
                                  newParts[index].notes = e.target.value;
                                  setMaintenanceParts(newParts);
                                }}
                                placeholder={t('inventory.maintenance.notesPlaceholder')}
                                rows={2}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMaintenanceParts(maintenanceParts.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
                setMaintenanceParts([]);
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

      {/* Modal de visualización de material */}
      <Dialog open={materialViewerOpen} onOpenChange={setMaterialViewerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewingMaterial && (
                <>
                  {viewingMaterial.display_mode === 'color' ? (
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: viewingMaterial.color || '#gray' }}
                    />
                  ) : (
                    (() => {
                      const Icon = getMaterialIcon(viewingMaterial.type, MATERIAL_TYPES);
                      return <Icon className="w-6 h-6" />;
                    })()
                  )}
                  <span>{viewingMaterial.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {viewingMaterial && (
            <div className="space-y-6">
              {/* Información del material */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">
                    {viewingMaterial.type ? MATERIAL_TYPES.find(t => t.value === viewingMaterial.type)?.label || viewingMaterial.type : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Precio por kg</Label>
                  <p className="font-medium">{viewingMaterial.price_per_kg.toFixed(2)} €</p>
                </div>
                {viewingMaterial.display_mode === 'color' && viewingMaterial.color && (
                  <div>
                    <Label className="text-muted-foreground">Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: viewingMaterial.color }}
                      />
                      <span className="font-medium">{viewingMaterial.color}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Listado de proyectos que usan el material */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Proyectos que usan este material
                </Label>
                {loadingMaterialProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : materialProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <p>Este material no está siendo usado en ningún proyecto</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {materialProjects.map((project, index) => (
                      <div
                        key={project.project_id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{project.project_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.weight_grams}g ({(project.weight_grams / 1000).toFixed(2)}kg)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (viewingMaterial) {
                      handleEditMaterial(viewingMaterial);
                      setMaterialViewerOpen(false);
                    }
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (viewingMaterial) {
                      openDeleteDialog(viewingMaterial);
                      setMaterialViewerOpen(false);
                    }
                  }}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmación de eliminación de material */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar este material?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {checkingMaterialUsage ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>Verificando si el material está en uso...</p>
                </div>
              ) : (
                <>
                  {materialInUse?.inUse ? (
                    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                      <p className="font-medium text-sm text-destructive mb-2">⚠️ No se puede eliminar este material</p>
                      <p className="text-sm text-muted-foreground">
                        El material "{materialToDelete?.name}" está siendo usado en el proyecto <strong>"{materialInUse.projectName}"</strong>.
                        Primero debes eliminar el material del proyecto antes de poder eliminarlo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p>Esta acción no se puede deshacer. El material "{materialToDelete?.name}" será eliminado permanentemente.</p>
                      <div className="bg-muted p-3 rounded-md mt-3">
                        <p className="font-medium text-sm mb-2">ℹ️ Importante sobre reconexión de stock:</p>
                        <p className="text-sm text-muted-foreground">
                          Si eliminas este material y luego quieres volver a conectarlo con el stock existente en el inventario, 
                          deberás crear un nuevo material con <strong>exactamente el mismo nombre</strong>: "{materialToDelete?.name}"
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMaterialToDelete(null);
              setMaterialInUse(null);
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMaterial} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={checkingMaterialUsage || materialInUse?.inUse === true}
            >
              Eliminar Material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
