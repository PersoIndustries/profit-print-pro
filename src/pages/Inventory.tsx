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
import { Loader2, Plus, ShoppingCart, History, Trash, Edit, Star, Info, Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package, PackagePlus, Printer, ListPlus, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X, PrinterIcon, Trash2, MinusCircle, TrendingUp, MoreVertical, ChevronDown, Settings, Clock } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

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
  last_maintenance?: Array<{ maintenance_date: string }>;
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
  const [isRectifyDialogOpen, setIsRectifyDialogOpen] = useState(false);
  const [rectifyQuantity, setRectifyQuantity] = useState("");
  const [rectifyNotes, setRectifyNotes] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isAcquisitionDialogOpen, setIsAcquisitionDialogOpen] = useState(false);
  const [acquisitionMaterial, setAcquisitionMaterial] = useState<Material | null>(null);
  const [acquisitionForm, setAcquisitionForm] = useState({
    material_id: "",
    quantity_kg: "",
    unit_price: "",
    supplier: "",
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [isSubmittingAcquisition, setIsSubmittingAcquisition] = useState(false);
  const [expandedPrinters, setExpandedPrinters] = useState<Set<string>>(new Set());
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isMaintenanceHistoryDialogOpen, setIsMaintenanceHistoryDialogOpen] = useState(false);
  const [selectedPrinterForMaintenance, setSelectedPrinterForMaintenance] = useState<Printer | null>(null);
  const [selectedPartsForMaintenance, setSelectedPartsForMaintenance] = useState<Set<string>>(new Set());
  const [maintenanceMaterials, setMaintenanceMaterials] = useState<Array<{ material_id: string; quantity_grams: string; notes: string }>>([]);
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [stockPrints, setStockPrints] = useState<any[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [isPrinterPartsDialogOpen, setIsPrinterPartsDialogOpen] = useState(false);
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
      navigate("/login");
    } else if (user) {
      fetchData();
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (acquisitionMaterial && isAcquisitionDialogOpen) {
      setAcquisitionForm({
        material_id: acquisitionMaterial.id,
        quantity_kg: "",
        unit_price: acquisitionMaterial.price_per_kg.toString(),
        supplier: "",
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
    }
  }, [acquisitionMaterial, isAcquisitionDialogOpen]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoadingData(true);

      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (materialsError) throw materialsError;
      setMaterials((materialsData || []).map(m => ({
        ...m,
        display_mode: (m.display_mode || 'color') as 'color' | 'icon'
      })));

      // Fetch inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory_items")
        .select(`
          *,
          materials (
            id,
            name,
            price_per_kg,
            color,
            type,
            is_favorite,
            display_mode
          )
        `)
        .eq("user_id", user.id);

      if (inventoryError) throw inventoryError;
      setInventory((inventoryData || []).map(item => ({
        ...item,
        materials: {
          ...item.materials,
          display_mode: (item.materials.display_mode || 'color') as 'color' | 'icon'
        }
      })));

      // Fetch pending materials from print_materials
      const { data: pendingPrintsData, error: pendingPrintsError } = await supabase
        .from("print_materials")
        .select("material_id, weight_grams, prints!inner(status, user_id)")
        .eq("prints.user_id", user.id)
        .in("prints.status", ["pending_print", "printing"]);

      if (pendingPrintsError) console.error("Error loading pending prints:", pendingPrintsError);

      const pending: Record<string, number> = {};
      (pendingPrintsData || []).forEach((item: any) => {
        if (!pending[item.material_id]) {
          pending[item.material_id] = 0;
        }
        pending[item.material_id] += item.weight_grams;
      });
      setPendingMaterials(pending);

      // Fetch stock prints
      const { data: stockPrintsData, error: stockPrintsError } = await supabase
        .from("prints")
        .select("*, projects(id, name)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .is("order_id", null)
        .order("print_date", { ascending: false });

      if (stockPrintsError) throw stockPrintsError;
      setStockPrints(stockPrintsData || []);

      // Fetch printers with maintenance parts and last maintenance date
      const { data: printersData, error: printersError } = await supabase
        .from("printers")
        .select(`
          *,
          printer_maintenance_parts (*)
        `)
        .eq("user_id", user.id)
        .order("brand", { ascending: true });

      // Fetch last maintenance for each part
      if (printersData) {
        for (const printer of printersData) {
          if (printer.printer_maintenance_parts && printer.printer_maintenance_parts.length > 0) {
            for (const part of printer.printer_maintenance_parts) {
              const { data: lastMaintenance } = await (supabase
                .from("printer_maintenance_history" as any)
                .select("maintenance_date") as any)
                .eq("part_id", part.id)
                .order("maintenance_date", { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (lastMaintenance) {
                (part as any).last_maintenance_date = lastMaintenance.maintenance_date;
              }
            }
          }
        }
      }

      if (printersError) throw printersError;
      setPrinters(printersData || []);

      // Fetch orders for assignment
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, customer_name")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(t('inventory.messages.errorLoadingData'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const pricePerKg = parseFloat(materialForm.price_per_kg);
      if (isNaN(pricePerKg)) {
        toast.error(t('inventory.messages.invalidPrice'));
        return;
      }

      const materialData = {
        user_id: user.id,
        name: materialForm.name,
        price_per_kg: pricePerKg,
        color: materialForm.display_mode === 'color' ? (materialForm.color || null) : null,
        type: materialForm.display_mode === 'icon' ? (materialForm.type || null) : null,
        display_mode: materialForm.display_mode,
        unit_type: materialForm.unit_type,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("materials")
          .update(materialData)
          .eq("id", editingMaterial.id);

        if (error) throw error;
        toast.success(t('inventory.messages.materialUpdated'));
      } else {
        const { data: newMaterial, error } = await supabase
          .from("materials")
          .insert([materialData])
          .select()
          .single();

        if (error) throw error;

        // Create inventory item with min_stock_alert
        const minStockAlert = parseFloat(materialForm.min_stock_alert);
        const { error: inventoryError } = await supabase
          .from("inventory_items")
          .insert([
            {
              user_id: user.id,
              material_id: newMaterial.id,
              quantity_grams: 0,
              min_stock_alert: isNaN(minStockAlert) ? 500 : minStockAlert,
            },
          ]);

        if (inventoryError) throw inventoryError;
        toast.success(t('inventory.messages.materialCreated'));
      }

      setIsMaterialDialogOpen(false);
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
    } catch (error: any) {
      console.error("Error saving material:", error);
      toast.error(t('inventory.messages.errorSavingMaterial'));
    }
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      price_per_kg: material.price_per_kg.toString(),
      color: material.color || "",
      type: material.type || "",
      display_mode: material.display_mode || "color",
      unit_type: "g",
      min_stock_alert: "500",
    });
    setIsMaterialDialogOpen(true);
  };

  const checkMaterialUsage = async (materialId: string) => {
    if (!user) return { inUse: false };

    try {
      setCheckingMaterialUsage(true);

      // Check if material is used in any project
      const { data: projectMaterials, error } = await supabase
        .from("project_materials")
        .select(`
          project_id,
          projects (
            name
          )
        `)
        .eq("material_id", materialId)
        .limit(1);

      if (error) throw error;

      if (projectMaterials && projectMaterials.length > 0) {
        return {
          inUse: true,
          projectName: (projectMaterials[0] as any).projects?.name,
        };
      }

      return { inUse: false };
    } catch (error) {
      console.error("Error checking material usage:", error);
      return { inUse: false };
    } finally {
      setCheckingMaterialUsage(false);
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    setMaterialToDelete(material);
    const usage = await checkMaterialUsage(material.id);
    setMaterialInUse(usage);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete || !user) return;

    try {
      // Delete inventory item first
      const { error: inventoryError } = await supabase
        .from("inventory_items")
        .delete()
        .eq("material_id", materialToDelete.id)
        .eq("user_id", user.id);

      if (inventoryError) throw inventoryError;

      // Delete material
      const { error: materialError } = await supabase
        .from("materials")
        .delete()
        .eq("id", materialToDelete.id);

      if (materialError) throw materialError;

      toast.success(t('inventory.messages.materialDeleted'));
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
      setMaterialInUse(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting material:", error);
      toast.error(t('inventory.messages.errorDeletingMaterial'));
    }
  };

  const handleToggleFavorite = async (material: Material) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ is_favorite: !material.is_favorite })
        .eq("id", material.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error(t('inventory.messages.errorUpdatingMaterial'));
    }
  };

  const handleViewMaterial = async (material: Material) => {
    setViewingMaterial(material);
    setMaterialViewerOpen(true);
    setLoadingMaterialProjects(true);

    try {
      const { data, error } = await supabase
        .from("project_materials")
        .select(`
          weight_grams,
          projects (
            id,
            name
          )
        `)
        .eq("material_id", material.id);

      if (error) throw error;

      const projects = (data || []).map((pm: any) => ({
        project_id: pm.projects.id,
        project_name: pm.projects.name,
        weight_grams: pm.weight_grams,
      }));

      setMaterialProjects(projects);
    } catch (error) {
      console.error("Error loading material projects:", error);
      toast.error("Error al cargar los proyectos del material");
    } finally {
      setLoadingMaterialProjects(false);
    }
  };

  const handleRectifyQuantity = async () => {
    if (!viewingMaterial || !user) return;

    try {
      const quantityToReduce = parseFloat(rectifyQuantity);
      if (isNaN(quantityToReduce) || quantityToReduce <= 0) {
        toast.error('Por favor ingresa una cantidad válida');
        return;
      }

      // Get current inventory
      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("material_id", viewingMaterial.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!inventoryData) {
        toast.error('No hay inventario para este material');
        return;
      }

      if (inventoryData.quantity_grams < quantityToReduce) {
        toast.error('La cantidad a reducir es mayor que el stock disponible');
        return;
      }

      // Update inventory
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity_grams: inventoryData.quantity_grams - quantityToReduce
        })
        .eq("id", inventoryData.id);

      if (updateError) throw updateError;

      // Register movement
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert([
          {
            user_id: user.id,
            material_id: viewingMaterial.id,
            movement_type: "adjustment",
            quantity_grams: quantityToReduce,
            notes: `${t('inventory.rectify.title')}. ${rectifyNotes || t('inventory.rectify.notesPlaceholder')}`
          }
        ]);

      if (movementError) throw movementError;

      toast.success(t('inventory.messages.rectifySuccess'));
      setIsRectifyDialogOpen(false);
      setRectifyQuantity("");
      setRectifyNotes("");
      fetchData();
    } catch (error: any) {
      console.error('Error rectifying quantity:', error);
      toast.error(t('inventory.messages.rectifyError'));
    }
  };

  const handleSaveAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmittingAcquisition || !acquisitionMaterial) return;

    try {
      setIsSubmittingAcquisition(true);
      const quantityKg = parseFloat(acquisitionForm.quantity_kg);
      if (isNaN(quantityKg) || quantityKg <= 0) {
        toast.error(t('inventory.messages.invalidQuantity') || 'Cantidad inválida');
        return;
      }

      const quantityGrams = quantityKg * 1000;
      const unitPrice = parseFloat(acquisitionForm.unit_price);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        toast.error(t('inventory.messages.invalidPrice') || 'Precio inválido');
        return;
      }

      const totalPrice = quantityKg * unitPrice;

      const { error: acquisitionError } = await supabase
        .from("material_acquisitions")
        .insert([
          {
            user_id: user.id,
            material_id: acquisitionMaterial.id,
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
        .eq("material_id", acquisitionMaterial.id)
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
              material_id: acquisitionMaterial.id,
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
            material_id: acquisitionMaterial.id,
            movement_type: "acquisition",
            quantity_grams: quantityGrams,
            notes: acquisitionForm.notes || null
          }
        ]);

      if (movementError) throw movementError;

      toast.success(t('inventory.messages.acquisitionRegistered'));
      setIsAcquisitionDialogOpen(false);
      setAcquisitionMaterial(null);
      setAcquisitionForm({
        material_id: "",
        quantity_kg: "",
        unit_price: "",
        supplier: "",
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving acquisition:', error);
      toast.error(t('inventory.messages.errorRegisteringAcquisition'));
    } finally {
      setIsSubmittingAcquisition(false);
    }
  };

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const usageHours = parseFloat(printerForm.usage_hours);
      if (isNaN(usageHours)) {
        toast.error("Por favor ingresa horas de uso válidas");
        return;
      }

      const printerData = {
        user_id: user.id,
        brand: printerForm.brand,
        model: printerForm.model,
        usage_hours: usageHours,
        notes: printerForm.notes || null,
      };

      if (editingPrinter) {
        const { error } = await supabase
          .from("printers")
          .update(printerData)
          .eq("id", editingPrinter.id);

        if (error) throw error;
        toast.success(t('inventory.messages.printerUpdated') || "Impresora actualizada");
      } else {
        const { data: newPrinter, error } = await supabase
          .from("printers")
          .insert([printerData])
          .select()
          .single();

        if (error) throw error;
        toast.success(t('inventory.messages.printerAdded') || "Impresora creada");
      }

      setIsPrinterDialogOpen(false);
      setEditingPrinter(null);
      setPrinterForm({
        brand: "",
        model: "",
        usage_hours: "",
        notes: "",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error saving printer:", error);
      toast.error("Error al guardar la impresora");
    }
  };

  const handleEditPrinter = (printer: Printer) => {
    setEditingPrinter(printer);
    setPrinterForm({
      brand: printer.brand,
      model: printer.model,
      usage_hours: printer.usage_hours.toString(),
      notes: printer.notes || "",
    });
    setIsPrinterDialogOpen(true);
  };

  const handleEditPrinterParts = (printer: Printer) => {
    setEditingPrinter(printer);
    const parts = (printer.printer_maintenance_parts || []).map((part) => ({
      tempId: part.id,
      part_name: part.part_name,
      maintenance_hours: part.maintenance_hours.toString(),
      current_hours: part.current_hours.toString(),
      notes: part.notes || "",
    }));
    setMaintenanceParts(parts);
    setIsPrinterPartsDialogOpen(true);
  };

  const handleSavePrinterParts = async () => {
    if (!editingPrinter || !user) return;

    try {
      for (const part of maintenanceParts) {
        const partData = {
          printer_id: editingPrinter.id,
          part_name: part.part_name,
          maintenance_hours: parseFloat(part.maintenance_hours),
          current_hours: parseFloat(part.current_hours),
          notes: part.notes || null,
        };

        if (part.tempId.startsWith("new-")) {
          await supabase.from("printer_maintenance_parts").insert([partData]);
        } else {
          await supabase
            .from("printer_maintenance_parts")
            .update(partData)
            .eq("id", part.tempId);
        }
      }

      toast.success(t('inventory.printers.messages.partsUpdated') || 'Piezas actualizadas');
      setIsPrinterPartsDialogOpen(false);
      setMaintenanceParts([]);
      fetchData();
    } catch (error: any) {
      console.error("Error saving parts:", error);
      toast.error(t('inventory.printers.messages.errorSavingParts') || 'Error al guardar las piezas');
    }
  };

  const handleOpenMaintenanceDialog = (printer: Printer) => {
    setSelectedPrinterForMaintenance(printer);
    setSelectedPartsForMaintenance(new Set());
    setMaintenanceMaterials([]);
    setMaintenanceNotes("");
    setIsMaintenanceDialogOpen(true);
  };

  const handleOpenMaintenanceHistory = async (printer: Printer) => {
    setSelectedPrinterForMaintenance(printer);
    try {
      const { data, error } = await (supabase
        .from("printer_maintenance_history" as any)
        .select(`
          *,
          printer_maintenance_parts(part_name),
          printer_maintenance_materials(
            quantity_grams,
            materials(name, display_mode, color, type)
          )
        `) as any)
        .eq("printer_id", printer.id)
        .order("maintenance_date", { ascending: false });

      if (error) throw error;
      setMaintenanceHistory(data || []);
      setIsMaintenanceHistoryDialogOpen(true);
    } catch (error: any) {
      console.error("Error fetching maintenance history:", error);
      toast.error(t('inventory.printers.messages.errorLoadingHistory') || 'Error al cargar el historial');
    }
  };

  const handleSaveMaintenance = async () => {
    if (!user || !selectedPrinterForMaintenance) return;

    try {
      if (selectedPartsForMaintenance.size === 0 && maintenanceMaterials.length === 0) {
        toast.error(t('inventory.printers.messages.selectAtLeastOnePart') || 'Selecciona al menos una pieza o agrega materiales');
        return;
      }

      // Create maintenance history entry for each selected part (or one general entry)
      const maintenanceDate = new Date().toISOString();
      const maintenanceEntries = [];

      if (selectedPartsForMaintenance.size > 0) {
        for (const partId of selectedPartsForMaintenance) {
          const { data: maintenanceEntry, error: maintenanceError } = await (supabase
            .from("printer_maintenance_history" as any)
            .insert([
              {
                printer_id: selectedPrinterForMaintenance.id,
                part_id: partId,
                maintenance_date: maintenanceDate,
                notes: maintenanceNotes || null
              }
            ]) as any)
            .select()
            .single();

          if (maintenanceError) throw maintenanceError;
          maintenanceEntries.push(maintenanceEntry);

          // Reset current_hours for selected parts
          await supabase
            .from("printer_maintenance_parts")
            .update({ current_hours: 0 })
            .eq("id", partId);
        }
      } else {
        // Create general maintenance entry if no parts selected but materials used
        const { data, error } = await (supabase
          .from("printer_maintenance_history" as any)
          .insert([{
            printer_id: selectedPrinterForMaintenance.id,
            maintenance_date: maintenanceDate,
            notes: maintenanceNotes || null
          }]) as any)
          .select()
          .single();
        if (error) throw error;
        maintenanceEntries.push(data);
      }

      // Use first entry for materials
      const mainMaintenanceEntry = maintenanceEntries[0];

      // Add materials to movements
      for (const material of maintenanceMaterials) {
        if (material.material_id && material.quantity_grams) {
          const quantityGrams = parseFloat(material.quantity_grams);
          if (!isNaN(quantityGrams) && quantityGrams > 0) {
            // Add to maintenance materials
            await (supabase
              .from("printer_maintenance_materials" as any) as any)
              .insert([
                {
                  maintenance_id: mainMaintenanceEntry.id,
                  material_id: material.material_id,
                  quantity_grams: quantityGrams,
                  notes: material.notes || null
                }
              ]);

            // Add to inventory movements
            await supabase
              .from("inventory_movements")
              .insert([
                {
                  user_id: user.id,
                  material_id: material.material_id,
                  movement_type: "consumption",
                  quantity_grams: quantityGrams,
                  notes: `Mantenimiento de impresora ${selectedPrinterForMaintenance.brand} ${selectedPrinterForMaintenance.model}. ${material.notes || ''}`
                }
              ]);

            // Update inventory
            const { data: inventoryData } = await supabase
              .from("inventory_items")
              .select("*")
              .eq("material_id", material.material_id)
              .eq("user_id", user.id)
              .maybeSingle();

            if (inventoryData) {
              await supabase
                .from("inventory_items")
                .update({
                  quantity_grams: Math.max(0, inventoryData.quantity_grams - quantityGrams)
                })
                .eq("id", inventoryData.id);
            }
          }
        }
      }

      toast.success(t('inventory.printers.messages.maintenanceSaved') || 'Mantenimiento registrado correctamente');
      setIsMaintenanceDialogOpen(false);
      setSelectedPrinterForMaintenance(null);
      setSelectedPartsForMaintenance(new Set());
      setMaintenanceMaterials([]);
      setMaintenanceNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Error saving maintenance:", error);
      toast.error(t('inventory.printers.messages.errorSavingMaintenance') || 'Error al guardar el mantenimiento');
    }
  };

  const handleDeletePrinter = async (printerId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta impresora?")) return;

    try {
      const { error } = await supabase
        .from("printers")
        .delete()
        .eq("id", printerId);

      if (error) throw error;
      toast.success("Impresora eliminada");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting printer:", error);
      toast.error("Error al eliminar la impresora");
    }
  };

  const addMaintenancePart = () => {
    setMaintenanceParts([
      ...maintenanceParts,
      {
        tempId: `new-${Date.now()}`,
        part_name: "",
        maintenance_hours: "",
        current_hours: "",
        notes: "",
      },
    ]);
  };

  const removeMaintenancePart = (tempId: string) => {
    setMaintenanceParts(maintenanceParts.filter((p) => p.tempId !== tempId));
  };

  const updateMaintenancePart = (tempId: string, field: string, value: string) => {
    setMaintenanceParts(
      maintenanceParts.map((p) =>
        p.tempId === tempId ? { ...p, [field]: value } : p
      )
    );
  };

  const handleAssignToOrder = async () => {
    if (!selectedPrint || !selectedOrderId || !user) return;

    try {
      const { error } = await supabase
        .from("prints")
        .update({ order_id: selectedOrderId })
        .eq("id", selectedPrint.id);

      if (error) throw error;

      toast.success("Impresión asignada a pedido");
      setIsAssignDialogOpen(false);
      setSelectedPrint(null);
      setSelectedOrderId("");
      fetchData();
    } catch (error: any) {
      console.error("Error assigning to order:", error);
      toast.error("Error al asignar a pedido");
    }
  };

  const handleDeleteStockPrint = async (printId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta impresión?")) return;

    try {
      const { error } = await supabase
        .from("prints")
        .delete()
        .eq("id", printId);

      if (error) throw error;
      toast.success("Impresión eliminada");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting stock print:", error);
      toast.error("Error al eliminar la impresión");
    }
  };

  const openAddToShoppingListDialog = async (material: Material) => {
    setSelectedMaterialForShoppingList(material);
    setShoppingListItemName(material.name);
    setShoppingListItemQuantity("");
    setShoppingListItemEstimatedPrice("");
    setSelectedShoppingListId("");
    setNewShoppingListName("");

    // Fetch shopping lists
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShoppingLists(data || []);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
    }

    setIsAddToShoppingListDialogOpen(true);
  };

  const handleAddToShoppingList = async () => {
    if (!user || !selectedMaterialForShoppingList) return;

    try {
      let listId = selectedShoppingListId;

      // Create new list if needed
      if (selectedShoppingListId === "new" && newShoppingListName) {
        const { data: newList, error: listError } = await supabase
          .from("shopping_lists")
          .insert([
            {
              user_id: user.id,
              name: newShoppingListName,
            },
          ])
          .select()
          .single();

        if (listError) throw listError;
        listId = newList.id;
      }

      if (!listId) {
        toast.error("Por favor selecciona o crea una lista");
        return;
      }

      // Add item to list
      const { error } = await supabase
        .from("shopping_list")
        .insert([
          {
            shopping_list_id: listId,
            name: shoppingListItemName,
            quantity: shoppingListItemQuantity || null,
            estimated_price: shoppingListItemEstimatedPrice
              ? parseFloat(shoppingListItemEstimatedPrice)
              : null,
            is_completed: false,
            user_id: user.id
          },
        ]);

      if (error) throw error;

      toast.success("Material agregado a la lista de compras");
      setIsAddToShoppingListDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding to shopping list:", error);
      toast.error("Error al agregar a la lista de compras");
    }
  };

  // Filtrado y ordenamiento
  const getFilteredAndSortedMaterials = () => {
    let filtered = materials.filter((material) => {
      const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || material.type === filterType;
      
      // Filtro de stock bajo (solo Pro/Enterprise)
      if (showLowStock && (isPro || isEnterprise)) {
        const inventoryItem = inventory.find(inv => inv.material_id === material.id);
        if (!inventoryItem) return matchesSearch && matchesType; // Mostrar materiales sin stock
        const pending = pendingMaterials[material.id] || 0;
        const realStock = inventoryItem.quantity_grams - pending;
        const isLowStock = realStock < (inventoryItem.min_stock_alert || 0);
        return matchesSearch && matchesType && isLowStock;
      }
      
      return matchesSearch && matchesType;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any = a[materialSortField as keyof Material];
      let bValue: any = b[materialSortField as keyof Material];

      if (materialSortField === "name") {
        aValue = aValue?.toLowerCase() || "";
        bValue = bValue?.toLowerCase() || "";
      }

      if (materialSortField === "stock" && (isPro || isEnterprise)) {
        const invA = inventory.find(inv => inv.material_id === a.id);
        const invB = inventory.find(inv => inv.material_id === b.id);
        const pendingA = pendingMaterials[a.id] || 0;
        const pendingB = pendingMaterials[b.id] || 0;
        aValue = invA ? invA.quantity_grams - pendingA : 0;
        bValue = invB ? invB.quantity_grams - pendingB : 0;
      }

      if (aValue < bValue) return materialSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return materialSortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const getFilteredAndSortedInventory = () => {
    let filtered = inventory.filter((item) => {
      const matchesSearch = item.materials.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || item.materials.type === filterType;
      const matchesLowStock = !showLowStock || item.quantity_grams < item.min_stock_alert;
      return matchesSearch && matchesType && matchesLowStock;
    });

    return filtered;
  };

  const getFilteredAndSortedStockPrints = () => {
    let filtered = stockPrints.filter((print) => {
      const matchesSearch = print.materials?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      return matchesSearch;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any = a[assignmentSortField];
      let bValue: any = b[assignmentSortField];

      if (assignmentSortField === "print_date") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return assignmentSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return assignmentSortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const getFilteredAndSortedPrinters = () => {
    let filtered = printers.filter((printer) => {
      const matchesSearch =
        printer.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printer.model.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any = a[printerSortField as keyof Printer];
      let bValue: any = b[printerSortField as keyof Printer];

      if (printerSortField === "brand" || printerSortField === "model") {
        aValue = aValue?.toLowerCase() || "";
        bValue = bValue?.toLowerCase() || "";
      }

      if (aValue < bValue) return printerSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return printerSortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const toggleMaterialSort = (field: string) => {
    if (materialSortField === field) {
      setMaterialSortDirection(materialSortDirection === "asc" ? "desc" : "asc");
    } else {
      setMaterialSortField(field);
      setMaterialSortDirection("asc");
    }
  };

  const toggleAssignmentSort = (field: string) => {
    if (assignmentSortField === field) {
      setAssignmentSortDirection(assignmentSortDirection === "asc" ? "desc" : "asc");
    } else {
      setAssignmentSortField(field);
      setAssignmentSortDirection("asc");
    }
  };

  const togglePrinterSort = (field: string) => {
    if (printerSortField === field) {
      setPrinterSortDirection(printerSortDirection === "asc" ? "desc" : "asc");
    } else {
      setPrinterSortField(field);
      setPrinterSortDirection("asc");
    }
  };

  const getSortIcon = (field: string, currentField: string, direction: "asc" | "desc") => {
    if (field !== currentField) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return direction === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Paginación
  const getPaginatedItems = <T,>(items: T[]) => {
    if (items.length <= itemsPerPage) return items;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const filteredMaterials = getFilteredAndSortedMaterials();
  const filteredInventory = getFilteredAndSortedInventory();
  const filteredStockPrints = getFilteredAndSortedStockPrints();
  const filteredPrinters = getFilteredAndSortedPrinters();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="materials">{t('inventory.tabs.materials')}</TabsTrigger>
          <TabsTrigger value="assignments">{t('inventory.tabs.assignments')}</TabsTrigger>
          <TabsTrigger value="printers">{t('inventory.tabs.printers')}</TabsTrigger>
        </TabsList>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('inventory.tabs.materials')}</CardTitle>
                <div className="flex gap-2">
                  {!hasFeature('acquisition_history') ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button 
                              onClick={() => {
                                toast.error(t('inventory.messages.featureNotAvailable') || 'Esta función no está disponible en tu plan');
                              }} 
                              variant="outline"
                              disabled
                            >
                              <TrendingUp className="w-4 h-4 mr-2" />
                              {t('inventory.tabs.acquisitions')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('inventory.messages.upgradeForAcquisitions') || 'Actualiza tu plan para acceder a esta función'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button 
                      onClick={() => navigate('/acquisitions')} 
                      variant="outline"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {t('inventory.tabs.acquisitions')}
                    </Button>
                  )}
                  <Button onClick={() => setIsMaterialDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('inventory.buttons.newMaterial')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder={t('inventory.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t('inventory.filterByType')} />
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
                  <Button
                    variant={showLowStock ? "default" : "outline"}
                    onClick={() => setShowLowStock(!showLowStock)}
                  >
                    {t('inventory.lowStock')}
                  </Button>
                )}
                {searchTerm || filterType !== "all" || showLowStock ? (
                  <Button variant="ghost" onClick={() => { setSearchTerm(""); setFilterType("all"); setShowLowStock(false); }}>
                    <X className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleMaterialSort("name")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        {t('inventory.tables.name')}
                        {getSortIcon("name", materialSortField, materialSortDirection)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleMaterialSort("type")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        {t('inventory.tables.type')}
                        {getSortIcon("type", materialSortField, materialSortDirection)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleMaterialSort("price_per_kg")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        {t('inventory.tables.pricePerKg')}
                        {getSortIcon("price_per_kg", materialSortField, materialSortDirection)}
                      </Button>
                    </TableHead>
                    {(isPro || isEnterprise) && (
                      <>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => toggleMaterialSort("stock")}
                            className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                          >
                            {t('inventory.stockAvailableUnits')}
                            {getSortIcon("stock", materialSortField, materialSortDirection)}
                          </Button>
                        </TableHead>
                        <TableHead>{t('inventory.pending')}</TableHead>
                        <TableHead>{t('inventory.realStock')}</TableHead>
                      </>
                    )}
                    <TableHead>{t('inventory.actions.label')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(isPro || isEnterprise) ? 8 : 5} className="text-center py-8 text-muted-foreground">
                        {t('inventory.noMaterials')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    getPaginatedItems(filteredMaterials).map((material) => {
                      const IconComponent = getMaterialIcon(material.type, MATERIAL_TYPES);
                      const inventoryItem = inventory.find(inv => inv.material_id === material.id);
                      const pending = pendingMaterials[material.id] || 0;
                      const stockAvailable = inventoryItem ? inventoryItem.quantity_grams : 0;
                      const realStock = stockAvailable - pending;
                      const isLowStock = inventoryItem && realStock < (inventoryItem.min_stock_alert || 0);
                      
                      return (
                        <TableRow 
                          key={material.id}
                          className={(isPro || isEnterprise) && isLowStock ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFavorite(material)}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  material.is_favorite ? "fill-yellow-400 text-yellow-400" : ""
                                }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {material.display_mode === 'color' ? (
                                <div
                                  className="w-4 h-4 rounded-full border flex-shrink-0"
                                  style={{ backgroundColor: material.color || '#gray' }}
                                />
                              ) : (
                                <IconComponent className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span>{material.name}</span>
                              {(isPro || isEnterprise) && isLowStock && (
                                <Badge variant="destructive" className="ml-2">
                                  {t('inventory.lowStock')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {material.type
                              ? MATERIAL_TYPES.find((t) => t.value === material.type)?.label || material.type
                              : "-"}
                          </TableCell>
                          <TableCell>{material.price_per_kg.toFixed(2)}€</TableCell>
                          {(isPro || isEnterprise) && (
                            <>
                              <TableCell>
                                {stockAvailable > 0 ? (
                                  <span>{(stockAvailable / 1000).toFixed(2)} kg</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {pending > 0 ? (
                                  <span className="text-orange-600">{(pending / 1000).toFixed(2)} kg</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {realStock > 0 ? (
                                  <span>{(realStock / 1000).toFixed(2)} kg</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewMaterial(material)}>
                                  <Info className="w-4 h-4 mr-2" />
                                  {t('inventory.actions.view')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAddToShoppingListDialog(material)}>
                                  <ListPlus className="w-4 h-4 mr-2" />
                                  {t('inventory.actions.addToShoppingList')}
                                </DropdownMenuItem>
                                {hasFeature('acquisition_history') && (
                                  <DropdownMenuItem onClick={() => {
                                    setAcquisitionMaterial(material);
                                    setIsAcquisitionDialogOpen(true);
                                  }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('inventory.actions.acquire')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEditMaterial(material)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  {t('inventory.actions.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteMaterial(material)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash className="w-4 h-4 mr-2" />
                                  {t('inventory.actions.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Paginación */}
              {filteredMaterials.length > itemsPerPage && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: getTotalPages(filteredMaterials.length) }, (_, i) => i + 1).map((page) => (
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
                          onClick={() => setCurrentPage(Math.min(getTotalPages(filteredMaterials.length), currentPage + 1))}
                          className={currentPage === getTotalPages(filteredMaterials.length) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('inventory.tabs.assignments')}</CardTitle>
                <Button onClick={() => navigate('/stock-prints')}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('inventory.buttons.newStockPrint')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder={t('inventory.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {searchTerm ? (
                  <Button variant="ghost" onClick={() => setSearchTerm("")}>
                    <X className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => toggleAssignmentSort("print_date")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        {t('inventory.tables.date')}
                        {getSortIcon("print_date", assignmentSortField, assignmentSortDirection)}
                      </Button>
                    </TableHead>
                    <TableHead>{t('inventory.material')}</TableHead>
                    <TableHead>{t('inventory.tables.quantity')}</TableHead>
                    <TableHead>{t('inventory.tables.notes')}</TableHead>
                    <TableHead>{t('inventory.tables.order')}</TableHead>
                    <TableHead>{t('inventory.actions.label')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockPrints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('inventory.noStockPrints')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    getPaginatedItems(filteredStockPrints).map((print) => {
                      const IconComponent = getMaterialIcon(print.materials?.type, MATERIAL_TYPES);
                      return (
                        <TableRow key={print.id}>
                          <TableCell>
                            {format(new Date(print.print_date), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {print.materials?.display_mode === 'color' ? (
                                <div
                                  className="w-4 h-4 rounded-full border flex-shrink-0"
                                  style={{ backgroundColor: print.materials?.color || '#gray' }}
                                />
                              ) : (
                                <IconComponent className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span>{print.materials?.name || "Material eliminado"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{print.quantity}</TableCell>
                          <TableCell>
                            {print.notes ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>{print.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {print.order_id ? (
                              <Badge>{t('inventory.assigned')}</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPrint(print);
                                  setIsAssignDialogOpen(true);
                                }}
                              >
                                {t('inventory.buttons.assign')}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteStockPrint(print.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Paginación */}
              {filteredStockPrints.length > itemsPerPage && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: getTotalPages(filteredStockPrints.length) }, (_, i) => i + 1).map((page) => (
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
                          onClick={() => setCurrentPage(Math.min(getTotalPages(filteredStockPrints.length), currentPage + 1))}
                          className={currentPage === getTotalPages(filteredStockPrints.length) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Printers Tab */}
        <TabsContent value="printers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('inventory.tabs.printers')}</CardTitle>
                <Button onClick={() => setIsPrinterDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('inventory.buttons.newPrinter')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder={t('inventory.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {searchTerm ? (
                  <Button variant="ghost" onClick={() => setSearchTerm("")}>
                    <X className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                {filteredPrinters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('inventory.noPrinters')}
                  </div>
                ) : (
                  getPaginatedItems(filteredPrinters).map((printer) => {
                    const maintenanceParts = printer.printer_maintenance_parts || [];
                    const needsMaintenance = maintenanceParts.some(
                      (part) => part.current_hours >= part.maintenance_hours
                    );
                    const isExpanded = expandedPrinters.has(printer.id);

                    return (
                      <Collapsible
                        key={printer.id}
                        open={isExpanded}
                        onOpenChange={(open) => {
                          const newExpanded = new Set(expandedPrinters);
                          if (open) {
                            newExpanded.add(printer.id);
                          } else {
                            newExpanded.delete(printer.id);
                          }
                          setExpandedPrinters(newExpanded);
                        }}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <CardTitle className="text-lg">
                                        {printer.brand} {printer.model}
                                      </CardTitle>
                                      {needsMaintenance ? (
                                        <Badge variant="destructive">{t('inventory.maintenanceRequired')}</Badge>
                                      ) : (
                                        <Badge variant="outline">{t('inventory.ok')}</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span>{t('inventory.tables.usageHours')}: {printer.usage_hours}h</span>
                                      <span>{t('inventory.maintenance.parts')}: {maintenanceParts.length}</span>
                                    </div>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditPrinter(printer); }}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      {t('inventory.actions.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditPrinterParts(printer); }}>
                                      <Settings className="w-4 h-4 mr-2" />
                                      {t('inventory.printers.actions.editParts')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenMaintenanceDialog(printer); }}>
                                      <Wrench className="w-4 h-4 mr-2" />
                                      {t('inventory.printers.actions.performMaintenance')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenMaintenanceHistory(printer); }}>
                                      <Clock className="w-4 h-4 mr-2" />
                                      {t('inventory.printers.actions.viewHistory')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={(e) => { e.stopPropagation(); handleDeletePrinter(printer.id); }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash className="w-4 h-4 mr-2" />
                                      {t('inventory.actions.delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="space-y-4">
                                {printer.notes && (
                                  <div>
                                    <Label className="text-sm font-semibold">{t('inventory.formLabels.notes')}</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{printer.notes}</p>
                                  </div>
                                )}
                                {(printer.printer_maintenance_parts || []).length > 0 && (
                                  <div>
                                    <Label className="text-sm font-semibold mb-2 block">{t('inventory.maintenance.parts')}</Label>
                                    <div className="space-y-2">
                                      {printer.printer_maintenance_parts?.map((part) => {
                                        const progress = part.maintenance_hours > 0 
                                          ? (part.current_hours / part.maintenance_hours) * 100 
                                          : 0;
                                        const isOverdue = part.current_hours >= part.maintenance_hours;
                                        const hoursRemaining = part.maintenance_hours - part.current_hours;
                                        const isWarning = hoursRemaining <= (part.maintenance_hours * 0.2) && hoursRemaining > 0; // 20% restante
                                        const lastMaintenanceDate = (part as any).last_maintenance_date;
                                        
                                        return (
                                          <div key={part.id} className={`border rounded-lg p-3 ${isOverdue ? 'border-destructive bg-destructive/5' : isWarning ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}`}>
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-medium">{part.part_name}</span>
                                              <div className="flex items-center gap-2">
                                                {isOverdue && (
                                                  <Badge variant="destructive" className="text-xs">
                                                    {t('inventory.printers.alerts.maintenanceRequired')}
                                                  </Badge>
                                                )}
                                                {isWarning && !isOverdue && (
                                                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                                    {t('inventory.printers.alerts.maintenanceSoon', { hours: Math.round(hoursRemaining) })}
                                                  </Badge>
                                                )}
                                                <Badge variant={isOverdue ? "destructive" : "outline"}>
                                                  {part.current_hours}h / {part.maintenance_hours}h
                                                </Badge>
                                              </div>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{t('inventory.maintenance.currentHours')}</span>
                                                <span>{t('inventory.maintenance.maintenanceHours')}</span>
                                              </div>
                                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                  className={`h-full transition-all ${isOverdue ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'}`}
                                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                              </div>
                                            </div>
                                            {lastMaintenanceDate && (
                                              <p className="text-xs text-muted-foreground mt-2">
                                                {t('inventory.printers.lastMaintenance')}: {format(new Date(lastMaintenanceDate), "dd/MM/yyyy HH:mm", { locale: es })}
                                              </p>
                                            )}
                                            {part.notes && (
                                              <p className="text-xs text-muted-foreground mt-1">{part.notes}</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })
                )}
              </div>

              {/* Paginación */}
              {filteredPrinters.length > itemsPerPage && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: getTotalPages(filteredPrinters.length) }, (_, i) => i + 1).map((page) => (
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
                          onClick={() => setCurrentPage(Math.min(getTotalPages(filteredPrinters.length), currentPage + 1))}
                          className={currentPage === getTotalPages(filteredPrinters.length) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Material Dialog */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? t('inventory.dialogs.editMaterial') : t('inventory.dialogs.newMaterial')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMaterial} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('inventory.formLabels.name')}</Label>
              <Input
                id="name"
                value={materialForm.name}
                onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="price_per_kg">{t('inventory.formLabels.pricePerKg')}</Label>
              <Input
                id="price_per_kg"
                type="number"
                step="0.01"
                value={materialForm.price_per_kg}
                onChange={(e) => setMaterialForm({ ...materialForm, price_per_kg: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>{t('inventory.formLabels.displayMode')}</Label>
              <Select
                value={materialForm.display_mode}
                onValueChange={(value: 'color' | 'icon') =>
                  setMaterialForm({ ...materialForm, display_mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">{t('inventory.displayModes.color')}</SelectItem>
                  <SelectItem value="icon">{t('inventory.displayModes.icon')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {materialForm.display_mode === 'color' ? (
              <div>
                <Label>{t('inventory.formLabels.color')}</Label>
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-full h-10 rounded border-2 ${
                          materialForm.color === color.value ? "border-primary" : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setMaterialForm({ ...materialForm, color: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full"
                  >
                    {t('inventory.buttons.customColor')}
                  </Button>
                  {showColorPicker && (
                    <div className="flex flex-col items-center gap-2">
                      <HexColorPicker
                        color={selectedColor}
                        onChange={(color) => {
                          setSelectedColor(color);
                          setMaterialForm({ ...materialForm, color });
                        }}
                      />
                      <Input
                        value={selectedColor}
                        onChange={(e) => {
                          setSelectedColor(e.target.value);
                          setMaterialForm({ ...materialForm, color: e.target.value });
                        }}
                        placeholder="#000000"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="type">{t('inventory.formLabels.type')}</Label>
                <Select
                  value={materialForm.type}
                  onValueChange={(value) => setMaterialForm({ ...materialForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editingMaterial && (
              <div>
                <Label htmlFor="min_stock_alert">{t('inventory.formLabels.minStockAlert')}</Label>
                <Input
                  id="min_stock_alert"
                  type="number"
                  value={materialForm.min_stock_alert}
                  onChange={(e) => setMaterialForm({ ...materialForm, min_stock_alert: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {editingMaterial ? t('common.save') : t('inventory.dialogs.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Material Viewer Dialog */}
      <Dialog open={materialViewerOpen} onOpenChange={setMaterialViewerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingMaterial?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('inventory.formLabels.pricePerKg')}</Label>
                <p className="text-lg font-semibold">{viewingMaterial?.price_per_kg.toFixed(2)}€</p>
              </div>
              <div>
                <Label>{t('inventory.formLabels.type')}</Label>
                <p className="text-lg">
                  {viewingMaterial?.type
                    ? MATERIAL_TYPES.find((t) => t.value === viewingMaterial.type)?.label || viewingMaterial.type
                    : "-"}
                </p>
              </div>
            </div>

            <div>
              <Label>{t('inventory.projectsUsing')}</Label>
              {loadingMaterialProjects ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : materialProjects.length === 0 ? (
                <p className="text-muted-foreground">{t('inventory.noProjectsUsing')}</p>
              ) : (
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {materialProjects.map((project) => (
                      <div key={project.project_id} className="flex justify-between items-center">
                        <span>{project.project_name}</span>
                        <span className="text-muted-foreground">
                          {(project.weight_grams / 1000).toFixed(2)} kg
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRectifyDialogOpen(true);
                }}
              >
                <MinusCircle className="w-4 h-4 mr-2" />
                {t('inventory.rectify.title')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rectify Quantity Dialog */}
      <Dialog open={isRectifyDialogOpen} onOpenChange={setIsRectifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.rectify.title')}</DialogTitle>
            <DialogDescription>
              {t('inventory.rectify.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rectify_quantity">{t('inventory.formLabels.quantityToReduce')}</Label>
              <Input
                id="rectify_quantity"
                type="number"
                step="0.01"
                value={rectifyQuantity}
                onChange={(e) => setRectifyQuantity(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="rectify_notes">{t('inventory.formLabels.rectifyNotes')}</Label>
              <Textarea
                id="rectify_notes"
                value={rectifyNotes}
                onChange={(e) => setRectifyNotes(e.target.value)}
                placeholder={t('inventory.formLabels.rectifyNotesPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRectifyDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRectifyQuantity}>
              {t('inventory.rectify.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printer Dialog */}
      <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrinter ? t('inventory.dialogs.editPrinter') : t('inventory.dialogs.newPrinter')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePrinter} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">{t('inventory.formLabels.brand')}</Label>
                <Input
                  id="brand"
                  value={printerForm.brand}
                  onChange={(e) => setPrinterForm({ ...printerForm, brand: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">{t('inventory.formLabels.model')}</Label>
                <Input
                  id="model"
                  value={printerForm.model}
                  onChange={(e) => setPrinterForm({ ...printerForm, model: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="usage_hours">{t('inventory.formLabels.usageHours')}</Label>
              <Input
                id="usage_hours"
                type="number"
                step="0.1"
                value={printerForm.usage_hours}
                onChange={(e) => setPrinterForm({ ...printerForm, usage_hours: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">{t('inventory.formLabels.notes')}</Label>
              <Textarea
                id="notes"
                value={printerForm.notes}
                onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPrinterDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {editingPrinter ? t('common.save') : t('inventory.dialogs.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printer Parts Dialog */}
      <Dialog open={isPrinterPartsDialogOpen} onOpenChange={setIsPrinterPartsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrinter && `${t('inventory.printers.editParts')} - ${editingPrinter.brand} ${editingPrinter.model}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">{t('inventory.maintenanceParts')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMaintenancePart}>
                <Plus className="w-4 h-4 mr-2" />
                {t('inventory.buttons.addPart')}
              </Button>
            </div>

            <div className="space-y-2">
              {maintenanceParts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('inventory.maintenance.noParts')}
                </p>
              ) : (
                maintenanceParts.map((part) => (
                  <Card key={part.tempId} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <Label>{t('inventory.formLabels.partName')}</Label>
                            <Input
                              value={part.part_name}
                              onChange={(e) =>
                                updateMaintenancePart(part.tempId, "part_name", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t('inventory.formLabels.maintenanceHours')}</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={part.maintenance_hours}
                              onChange={(e) =>
                                updateMaintenancePart(part.tempId, "maintenance_hours", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t('inventory.formLabels.currentHours')}</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={part.current_hours}
                              onChange={(e) =>
                                updateMaintenancePart(part.tempId, "current_hours", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t('inventory.formLabels.notes')}</Label>
                            <Input
                              value={part.notes}
                              onChange={(e) =>
                                updateMaintenancePart(part.tempId, "notes", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaintenancePart(part.tempId)}
                          className="ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPrinterPartsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSavePrinterParts}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Order Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.dialogs.assignToOrder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="order">{t('inventory.formLabels.selectOrder')}</Label>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory.selectOrder')} />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number} - {order.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAssignToOrder} disabled={!selectedOrderId}>
                {t('inventory.buttons.assign')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Shopping List Dialog */}
      <Dialog open={isAddToShoppingListDialogOpen} onOpenChange={setIsAddToShoppingListDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.dialogs.addToShoppingList')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shopping_list">{t('inventory.formLabels.shoppingList')}</Label>
              <Select value={selectedShoppingListId} onValueChange={setSelectedShoppingListId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory.selectShoppingList')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t('inventory.newShoppingList')}</SelectItem>
                  {shoppingLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedShoppingListId === "new" && (
              <div>
                <Label htmlFor="new_list_name">{t('inventory.formLabels.listName')}</Label>
                <Input
                  id="new_list_name"
                  value={newShoppingListName}
                  onChange={(e) => setNewShoppingListName(e.target.value)}
                  placeholder={t('inventory.enterListName')}
                />
              </div>
            )}

            <div>
              <Label htmlFor="item_name">{t('inventory.formLabels.itemName')}</Label>
              <Input
                id="item_name"
                value={shoppingListItemName}
                onChange={(e) => setShoppingListItemName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="item_quantity">{t('inventory.formLabels.quantity')}</Label>
              <Input
                id="item_quantity"
                value={shoppingListItemQuantity}
                onChange={(e) => setShoppingListItemQuantity(e.target.value)}
                placeholder={t('inventory.optional')}
              />
            </div>

            <div>
              <Label htmlFor="item_price">{t('inventory.formLabels.estimatedPrice')}</Label>
              <Input
                id="item_price"
                type="number"
                step="0.01"
                value={shoppingListItemEstimatedPrice}
                onChange={(e) => setShoppingListItemEstimatedPrice(e.target.value)}
                placeholder={t('inventory.optional')}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddToShoppingListDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddToShoppingList}>
                {t('inventory.buttons.add')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Material Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.dialogs.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {checkingMaterialUsage ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('inventory.checkingUsage')}
                </div>
              ) : materialInUse?.inUse ? (
                <>
                  {t('inventory.materialInUse', { projectName: materialInUse.projectName })}
                  <br />
                  <br />
                  {t('inventory.deleteWarning')}
                </>
              ) : (
                t('inventory.confirmDeleteMessage')
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMaterial}
              disabled={checkingMaterialUsage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Acquisition Dialog */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={(open) => {
        setIsAcquisitionDialogOpen(open);
        if (!open) {
          setAcquisitionMaterial(null);
          setAcquisitionForm({
            material_id: "",
            quantity_kg: "",
            unit_price: "",
            supplier: "",
            purchase_date: new Date().toISOString().split('T')[0],
            notes: ""
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.dialogs.newAcquisition')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAcquisition} className="space-y-4">
            <div>
              <Label htmlFor="acq_material">{t('inventory.material')} *</Label>
              <Input
                id="acq_material"
                value={acquisitionMaterial?.name || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="acq_quantity">{t('inventory.formLabels.quantityWithUnits')} *</Label>
              <Input
                id="acq_quantity"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionForm.quantity_kg}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, quantity_kg: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_unit_price">{t('inventory.tables.pricePerUnit')} *</Label>
              <Input
                id="acq_unit_price"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionForm.unit_price}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, unit_price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_supplier">{t('inventory.tables.supplier')}</Label>
              <Input
                id="acq_supplier"
                value={acquisitionForm.supplier}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
                placeholder={t('inventory.formLabels.supplierPlaceholder') || "Nombre del proveedor"}
              />
            </div>
            <div>
              <Label htmlFor="acq_date">{t('inventory.tables.date')} *</Label>
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmittingAcquisition}>
                {isSubmittingAcquisition ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.saving') || 'Guardando...'}
                  </>
                ) : (
                  t('inventory.dialogs.create')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory.printers.dialogs.performMaintenance')}</DialogTitle>
            <DialogDescription>
              {selectedPrinterForMaintenance && `${selectedPrinterForMaintenance.brand} ${selectedPrinterForMaintenance.model}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t('inventory.printers.selectParts')}</Label>
              <div className="space-y-2 border rounded-lg p-4">
                {(selectedPrinterForMaintenance?.printer_maintenance_parts || []).map((part) => (
                  <div key={part.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`part-${part.id}`}
                      checked={selectedPartsForMaintenance.has(part.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedPartsForMaintenance);
                        if (checked) {
                          newSet.add(part.id);
                        } else {
                          newSet.delete(part.id);
                        }
                        setSelectedPartsForMaintenance(newSet);
                      }}
                    />
                    <Label htmlFor={`part-${part.id}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between">
                        <span>{part.part_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {part.current_hours}h / {part.maintenance_hours}h
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
                {(!selectedPrinterForMaintenance?.printer_maintenance_parts || selectedPrinterForMaintenance.printer_maintenance_parts.length === 0) && (
                  <p className="text-sm text-muted-foreground">{t('inventory.printers.noParts')}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>{t('inventory.printers.materialsUsed')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMaintenanceMaterials([...maintenanceMaterials, { material_id: "", quantity_grams: "", notes: "" }]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('inventory.printers.addMaterial')}
                </Button>
              </div>
              <div className="space-y-2">
                {maintenanceMaterials.map((material, index) => (
                  <Card key={index} className="p-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Select
                          value={material.material_id}
                          onValueChange={(value) => {
                            const newMaterials = [...maintenanceMaterials];
                            newMaterials[index].material_id = value;
                            setMaintenanceMaterials(newMaterials);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('inventory.material')} />
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
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t('inventory.formLabels.quantity')}
                          value={material.quantity_grams}
                          onChange={(e) => {
                            const newMaterials = [...maintenanceMaterials];
                            newMaterials[index].quantity_grams = e.target.value;
                            setMaintenanceMaterials(newMaterials);
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder={t('inventory.formLabels.notes')}
                          value={material.notes}
                          onChange={(e) => {
                            const newMaterials = [...maintenanceMaterials];
                            newMaterials[index].notes = e.target.value;
                            setMaintenanceMaterials(newMaterials);
                          }}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setMaintenanceMaterials(maintenanceMaterials.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="maintenance_notes">{t('inventory.formLabels.notes')}</Label>
              <Textarea
                id="maintenance_notes"
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                rows={3}
                placeholder={t('inventory.printers.maintenanceNotesPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveMaintenance}>
              {t('inventory.printers.saveMaintenance')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance History Dialog */}
      <Dialog open={isMaintenanceHistoryDialogOpen} onOpenChange={setIsMaintenanceHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory.printers.maintenanceHistory')}</DialogTitle>
            <DialogDescription>
              {selectedPrinterForMaintenance && `${selectedPrinterForMaintenance.brand} ${selectedPrinterForMaintenance.model}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {maintenanceHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('inventory.printers.noMaintenanceHistory')}
              </p>
            ) : (
              <div className="space-y-4">
                {maintenanceHistory.map((maintenance) => (
                  <Card key={maintenance.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">
                          {maintenance.printer_maintenance_parts?.part_name || t('inventory.printers.generalMaintenance')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(maintenance.maintenance_date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </div>
                    </div>
                    {maintenance.notes && (
                      <p className="text-sm mb-2">{maintenance.notes}</p>
                    )}
                    {maintenance.printer_maintenance_materials && maintenance.printer_maintenance_materials.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <Label className="text-sm font-semibold mb-1 block">{t('inventory.printers.materialsUsed')}</Label>
                        <div className="space-y-1">
                          {maintenance.printer_maintenance_materials.map((mat: any, idx: number) => (
                            <div key={idx} className="text-sm flex justify-between">
                              <span>{mat.materials?.name || t('inventory.unknownMaterial')}</span>
                              <span className="text-muted-foreground">
                                {(mat.quantity_grams / 1000).toFixed(2)} kg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaintenanceHistoryDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
