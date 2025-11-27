import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Plus, Printer, Edit2, Package, Wrench, User, Building, Download, Clock, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PrintMaterial {
  id: string;
  material_id: string;
  weight_grams: number;
  material_cost: number;
  materials: {
    name: string;
    price_per_kg: number;
  };
}

interface Printer {
  id: string;
  brand: string;
  model: string;
  usage_hours: number;
}

interface Print {
  id: string;
  name: string;
  print_type: 'order' | 'tools' | 'personal' | 'operational' | 'for_sale';
  order_id: string | null;
  project_id: string | null;
  printer_id: string | null;
  print_time_hours: number;
  material_used_grams: number;
  print_date: string;
  notes: string | null;
  status: 'pending_print' | 'printing' | 'completed' | 'failed';
  print_materials?: PrintMaterial[];
  orders?: {
    order_number: string;
    customer_name: string;
  };
  projects?: {
    name: string;
  };
  printers?: Printer;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
}

interface Project {
  id: string;
  name: string;
  print_time_hours: number;
}

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
}

interface FormMaterial {
  tempId: string;
  material_id: string;
  weight_grams: string;
}

const getPrintTypeConfig = (t: any) => ({
  order: { label: t('prints.types.order'), icon: Package, color: 'bg-blue-500' },
  tools: { label: t('prints.types.tools'), icon: Wrench, color: 'bg-purple-500' },
  personal: { label: t('prints.types.personal'), icon: User, color: 'bg-green-500' },
  operational: { label: t('prints.types.operational'), icon: Building, color: 'bg-orange-500' },
  for_sale: { label: t('prints.types.for_sale'), icon: Package, color: 'bg-teal-500' }
});

const getStatusConfig = (t: any) => ({
  pending_print: { label: t('prints.status.pending'), color: 'bg-gray-500' },
  printing: { label: t('prints.status.printing'), color: 'bg-yellow-500' },
  completed: { label: t('prints.status.completed'), color: 'bg-green-500' },
  failed: { label: t('prints.status.failed'), color: 'bg-red-500' }
});

const Prints = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [prints, setPrints] = useState<Print[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [inventory, setInventory] = useState<Array<{ material_id: string; quantity_grams: number }>>([]);
  const [printsLoading, setPrintsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrint, setEditingPrint] = useState<Print | null>(null);
  const [selectedPrint, setSelectedPrint] = useState<Print | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFailedDialogOpen, setIsFailedDialogOpen] = useState(false);
  const [failedFormData, setFailedFormData] = useState({
    final_hours: "",
    materials: [] as FormMaterial[]
  });
  const [stockWarning, setStockWarning] = useState<{
    show: boolean;
    insufficientMaterials: Array<{ materialName: string; available: number; needed: number }>;
    onConfirm: () => void;
  }>({
    show: false,
    insufficientMaterials: [],
    onConfirm: () => {}
  });
  
  const [formData, setFormData] = useState({
    name: '',
    print_type: 'order' as 'order' | 'tools' | 'personal' | 'operational' | 'for_sale',
    order_id: '',
    project_id: '',
    printer_id: '',
    print_time_hours: '',
    print_date: new Date().toISOString().slice(0, 16),
    notes: '',
    status: 'pending_print' as 'pending_print' | 'printing' | 'completed' | 'failed'
  });

  const [formMaterials, setFormMaterials] = useState<FormMaterial[]>([]);
  const [nextTempId, setNextTempId] = useState(1);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPrints();
      fetchOrders();
      fetchProjects();
      fetchMaterials();
      fetchInventory();
      fetchPrinters();
    }
  }, [user]);

  const fetchPrints = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("prints")
        .select(`
          *,
          orders(order_number, customer_name),
          projects(name),
          printers(id, brand, model, usage_hours),
          print_materials(
            id,
            material_id,
            weight_grams,
            material_cost,
            materials(name, price_per_kg)
          )
        `)
        .eq("user_id", user.id)
        .order("print_date", { ascending: false });

      if (error) throw error;
      setPrints((data || []) as Print[]);
    } catch (error: any) {
      toast.error(t('prints.messages.errorLoading'));
    } finally {
      setPrintsLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, print_time_hours")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false});

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, price_per_kg")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      console.error("Error fetching materials:", error);
    }
  };

  const fetchInventory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("material_id, quantity_grams")
        .eq("user_id", user.id);

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
    }
  };

  const fetchPrinters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("printers")
        .select("id, brand, model, usage_hours")
        .eq("user_id", user.id)
        .order("brand");

      if (error) throw error;
      setPrinters(data || []);
    } catch (error: any) {
      console.error("Error fetching printers:", error);
    }
  };

  const handleImportFromProject = async () => {
    if (!formData.project_id) {
      toast.error(t('prints.messages.selectProjectFirst'));
      return;
    }

    try {
      const { data: projectMaterials, error } = await supabase
        .from("project_materials")
        .select("material_id, weight_grams, material_cost, materials(name, price_per_kg)")
        .eq("project_id", formData.project_id);

      if (error) throw error;

      if (projectMaterials && projectMaterials.length > 0) {
        const importedMaterials: FormMaterial[] = projectMaterials.map((pm: any) => ({
          tempId: `temp-${nextTempId + projectMaterials.indexOf(pm)}`,
          material_id: pm.material_id,
          weight_grams: pm.weight_grams.toString()
        }));

        setFormMaterials(importedMaterials);
        setNextTempId(nextTempId + projectMaterials.length);

        // Import print time
        const project = projects.find(p => p.id === formData.project_id);
        if (project) {
          setFormData(prev => ({ ...prev, print_time_hours: project.print_time_hours.toString() }));
        }

        toast.success(t('prints.messages.materialsImported'));
      } else {
        toast.info(t('prints.messages.projectNoMaterials'));
      }
    } catch (error: any) {
      toast.error(t('prints.messages.errorImportingMaterials'));
    }
  };

  const addMaterialRow = () => {
    setFormMaterials([...formMaterials, {
      tempId: `temp-${nextTempId}`,
      material_id: '',
      weight_grams: ''
    }]);
    setNextTempId(nextTempId + 1);
  };

  const updateMaterialRow = (tempId: string, field: keyof FormMaterial, value: string) => {
    setFormMaterials(formMaterials.map(m => 
      m.tempId === tempId ? { ...m, [field]: value } : m
    ));
  };

  const removeMaterialRow = (tempId: string) => {
    setFormMaterials(formMaterials.filter(m => m.tempId !== tempId));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      print_type: 'order',
      order_id: '',
      project_id: '',
      printer_id: '',
      print_time_hours: '',
      print_date: new Date().toISOString().slice(0, 16),
      notes: '',
      status: 'pending_print'
    });
    setFormMaterials([]);
    setNextTempId(1);
    setEditingPrint(null);
  };

  const handleOpenModal = () => {
    setEditingPrint(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditPrint = async (print: Print) => {
    setEditingPrint(print);
    setFormData({
      name: print.name,
      print_type: print.print_type,
      order_id: print.order_id || '',
      project_id: print.project_id || '',
      printer_id: print.printer_id || '',
      print_time_hours: print.print_time_hours.toString(),
      print_date: print.print_date,
      notes: print.notes || '',
      status: print.status
    });

    // Load print materials
    if (print.print_materials && print.print_materials.length > 0) {
      const loadedMaterials: FormMaterial[] = print.print_materials.map((pm, idx) => ({
        tempId: `temp-${idx + 1}`,
        material_id: pm.material_id,
        weight_grams: pm.weight_grams.toString()
      }));
      setFormMaterials(loadedMaterials);
      setNextTempId(loadedMaterials.length + 1);
    } else {
      setFormMaterials([]);
      setNextTempId(1);
    }

    setIsModalOpen(true);
  };

  const checkStockAvailability = (): Array<{ materialName: string; available: number; needed: number }> => {
    const insufficient: Array<{ materialName: string; available: number; needed: number }> = [];

    formMaterials.forEach(formMaterial => {
      const material = materials.find(m => m.id === formMaterial.material_id);
      const needed = parseFloat(formMaterial.weight_grams) || 0;
      
      if (needed > 0 && material) {
        const inventoryItem = inventory.find(inv => inv.material_id === formMaterial.material_id);
        const available = inventoryItem ? inventoryItem.quantity_grams : 0;

        if (available < needed) {
          insufficient.push({
            materialName: material.name,
            available,
            needed
          });
        }
      }
    });

    return insufficient;
  };

  const handleSavePrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formMaterials.length === 0) {
      toast.error(t('prints.messages.addAtLeastOneMaterial'));
      return;
    }

    const totalWeight = formMaterials.reduce((sum, m) => sum + (parseFloat(m.weight_grams) || 0), 0);

    // Check stock availability only for new prints (not when editing)
    if (!editingPrint) {
      const insufficientMaterials = checkStockAvailability();
      
      if (insufficientMaterials.length > 0) {
        setStockWarning({
          show: true,
          insufficientMaterials,
          onConfirm: () => {
            setStockWarning({ show: false, insufficientMaterials: [], onConfirm: () => {} });
            proceedWithSave();
          }
        });
        return;
      }
    }

    proceedWithSave();
  };

  const proceedWithSave = async () => {
    if (!user) return;

    const totalWeight = formMaterials.reduce((sum, m) => sum + (parseFloat(m.weight_grams) || 0), 0);

    try {
      const printData = {
        user_id: user.id,
        name: formData.name,
        print_type: formData.print_type,
        order_id: formData.order_id || null,
        project_id: formData.project_id || null,
        printer_id: formData.printer_id || null,
        print_time_hours: parseFloat(formData.print_time_hours) || 0,
        material_used_grams: totalWeight,
        print_date: formData.print_date,
        notes: formData.notes || null,
        status: formData.status
      };

      if (editingPrint) {
        const { error: printError } = await supabase
          .from("prints")
          .update(printData)
          .eq("id", editingPrint.id);

        if (printError) throw printError;

        // Delete old materials
        await supabase
          .from("print_materials")
          .delete()
          .eq("print_id", editingPrint.id);

        // Insert new materials
        const materialsData = formMaterials.map(m => {
          const material = materials.find(mat => mat.id === m.material_id);
          const weight = parseFloat(m.weight_grams) || 0;
          const cost = material ? (material.price_per_kg / 1000) * weight : 0;
          
          return {
            print_id: editingPrint.id,
            material_id: m.material_id,
            weight_grams: weight,
            material_cost: cost
          };
        });

        const { error: materialsError } = await supabase
          .from("print_materials")
          .insert(materialsData);

        if (materialsError) throw materialsError;

        toast.success(t('prints.messages.printUpdated'));
      } else {
        const { data: print, error: printError } = await supabase
          .from("prints")
          .insert(printData)
          .select()
          .single();

        if (printError) throw printError;

        // Insert materials
        const materialsData = formMaterials.map(m => {
          const material = materials.find(mat => mat.id === m.material_id);
          const weight = parseFloat(m.weight_grams) || 0;
          const cost = material ? (material.price_per_kg / 1000) * weight : 0;
          
          return {
            print_id: print.id,
            material_id: m.material_id,
            weight_grams: weight,
            material_cost: cost
          };
        });

        const { error: materialsError } = await supabase
          .from("print_materials")
          .insert(materialsData);

        if (materialsError) throw materialsError;

        toast.success(t('prints.messages.printRegistered'));
      }

      setIsModalOpen(false);
      await fetchPrints();
      fetchInventory(); // Refresh inventory after saving
    } catch (error: any) {
      toast.error(t('prints.messages.errorSaving'));
    }
  };

  const handleDeletePrint = async (id: string) => {
    try {
      const { error } = await supabase.from("prints").delete().eq("id", id);
      if (error) throw error;
      toast.success(t('prints.messages.printDeleted'));
      fetchPrints();
      if (selectedPrint?.id === id) {
        setSelectedPrint(null);
      }
    } catch (error: any) {
      toast.error(t('prints.messages.errorDeleting'));
    }
  };

  const handleViewPrint = (print: Print) => {
    setSelectedPrint(print);
  };

  // Filtrar impresiones por estado
  const filteredPrints = statusFilter === "all"
    ? prints
    : prints.filter(print => print.status === statusFilter);

  const PRINT_TYPE_CONFIG = getPrintTypeConfig(t);
  const STATUS_CONFIG = getStatusConfig(t);

  if (loading || printsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">{t('prints.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('prints.subtitle')}
          </p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="w-4 h-4 mr-2" />
          {t('prints.newPrint')}
        </Button>
      </div>

      {/* Filtro de estados */}
      {prints.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">{t('prints.filterByStatus')}:</span>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                {t('prints.all')}
              </Button>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <Button
                  key={key}
                  variant={statusFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(key)}
                  className={statusFilter === key ? config.color : ""}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredPrints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Printer className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {prints.length === 0 
                ? t('prints.empty.noPrints')
                : t('prints.empty.noPrintsWithStatus')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredPrints.map((print) => {
            const typeConfig = PRINT_TYPE_CONFIG[print.print_type];
            const statusConfig = STATUS_CONFIG[print.status];
            const TypeIcon = typeConfig.icon;

            return (
              <Card 
                key={print.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewPrint(print)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <TypeIcon className="w-4 h-4 flex-shrink-0" />
                        <h3 className="font-semibold text-base truncate">{print.name}</h3>
                        <Badge className={`${typeConfig.color} text-xs`}>
                          {typeConfig.label}
                        </Badge>
                        <Badge className={`${statusConfig.color} text-xs`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {print.print_time_hours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {print.material_used_grams}g
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(print.print_date).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        {print.projects && (
                          <span className="truncate max-w-[150px]">
                            📁 {print.projects.name}
                          </span>
                        )}
                        {print.orders && (
                          <span className="truncate max-w-[150px]">
                            📦 {print.orders.order_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditPrint(print)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeletePrint(print.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          setEditingPrint(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPrint ? t('prints.editPrint') : t('prints.newPrint')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePrint} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('prints.form.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="print_type">{t('prints.form.printType')} *</Label>
                <Select
                  value={formData.print_type}
                  onValueChange={(value: any) => setFormData({ ...formData, print_type: value })}
                >
                  <SelectTrigger id="print_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRINT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_id">{t('prints.form.order')} ({t('prints.form.optional')})</Label>
                <Select
                  value={formData.order_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, order_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="order_id">
                    <SelectValue placeholder={t('prints.form.selectOrder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('prints.form.noOrder')}</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">{t('prints.form.project')} ({t('prints.form.optional')})</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.project_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger id="project_id">
                      <SelectValue placeholder={t('prints.form.selectProject')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('prints.form.noProject')}</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.project_id && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleImportFromProject}
                      title={t('prints.form.importMaterials')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="printer_id">{t('prints.form.printer')} ({t('prints.form.optional')})</Label>
                <Select
                  value={formData.printer_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, printer_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="printer_id">
                    <SelectValue placeholder={t('prints.form.selectPrinter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('prints.form.noPrinter')}</SelectItem>
                    {printers.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        {printer.brand} {printer.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="print_time_hours">{t('prints.form.printTime')} *</Label>
                <Input
                  id="print_time_hours"
                  type="number"
                  step="0.1"
                  value={formData.print_time_hours}
                  onChange={(e) => setFormData({ ...formData, print_time_hours: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="print_date">{t('prints.form.dateTime')} *</Label>
                <Input
                  id="print_date"
                  type="datetime-local"
                  value={formData.print_date}
                  onChange={(e) => setFormData({ ...formData, print_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="status">{t('prints.form.status')} *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{t('prints.form.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">{t('prints.form.materials')} *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                  <Plus className="w-3 h-3 mr-1" />
                  {t('prints.form.addMaterial')}
                </Button>
              </div>

              {formMaterials.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>{t('prints.form.noMaterialsAdded')}</p>
                    <p className="text-sm">{t('prints.form.useButtonOrImport')}</p>
                  </CardContent>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('prints.form.material')}</TableHead>
                      <TableHead>{t('prints.form.weight')}</TableHead>
                      <TableHead className="w-[100px]">{t('prints.form.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formMaterials.map((material) => (
                      <TableRow key={material.tempId}>
                        <TableCell>
                          <Select
                            value={material.material_id}
                            onValueChange={(value) => updateMaterialRow(material.tempId, 'material_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('prints.form.selectMaterial')} />
                            </SelectTrigger>
                            <SelectContent>
                              {materials.map((mat) => (
                                <SelectItem key={mat.id} value={mat.id}>
                                  {mat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.weight_grams}
                            onChange={(e) => updateMaterialRow(material.tempId, 'weight_grams', e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeMaterialRow(material.tempId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {formMaterials.length > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {t('prints.form.total')}: {formMaterials.reduce((sum, m) => sum + (parseFloat(m.weight_grams) || 0), 0).toFixed(1)}g
                    {" "}
                    ({(formMaterials.reduce((sum, m) => sum + (parseFloat(m.weight_grams) || 0), 0) / 1000).toFixed(3)}kg)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {editingPrint ? t('prints.form.update') : t('prints.form.create')} {t('prints.print')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Stock Warning */}
      <AlertDialog open={stockWarning.show} onOpenChange={(open) => {
        if (!open) {
          setStockWarning({ show: false, insufficientMaterials: [], onConfirm: () => {} });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ {t('prints.stockWarning.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prints.stockWarning.description')}:
              <ul className="list-disc list-inside mt-3 space-y-1">
                {stockWarning.insufficientMaterials.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    <strong>{item.materialName}</strong>: {t('prints.stockWarning.available')} {item.available.toFixed(0)}g, 
                    {t('prints.stockWarning.needed')} {item.needed.toFixed(0)}g 
                    <span className="text-destructive">
                      ({t('prints.stockWarning.missing')} {(item.needed - item.available).toFixed(0)}g)
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm">
                {t('prints.stockWarning.continueQuestion')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={stockWarning.onConfirm}>
              {t('prints.stockWarning.continueAnyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de detalle de la impresión */}
      <Dialog open={!!selectedPrint} onOpenChange={(open) => !open && setSelectedPrint(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPrint && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {(() => {
                      const TypeIcon = PRINT_TYPE_CONFIG[selectedPrint.print_type].icon;
                      return <TypeIcon className="w-6 h-6" />;
                    })()}
                    {selectedPrint.name}
                  </DialogTitle>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPrint(null);
                      handleEditPrint(selectedPrint);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Información principal */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('prints.detail.generalInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge className={PRINT_TYPE_CONFIG[selectedPrint.print_type].color}>
                          {PRINT_TYPE_CONFIG[selectedPrint.print_type].label}
                        </Badge>
                        <Badge className={STATUS_CONFIG[selectedPrint.status].color}>
                          {STATUS_CONFIG[selectedPrint.status].label}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('prints.detail.printTime')}</p>
                            <p className="font-semibold">{selectedPrint.print_time_hours}h</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('prints.detail.date')}</p>
                            <p className="font-semibold">
                              {new Date(selectedPrint.print_date).toLocaleString(undefined, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        {selectedPrint.orders && (
                          <div>
                            <p className="text-sm text-muted-foreground">{t('prints.detail.order')}</p>
                            <p className="font-semibold">
                              {selectedPrint.orders.order_number} - {selectedPrint.orders.customer_name}
                            </p>
                          </div>
                        )}
                        {selectedPrint.projects && (
                          <div>
                            <p className="text-sm text-muted-foreground">{t('prints.detail.project')}</p>
                            <p className="font-semibold">{selectedPrint.projects.name}</p>
                          </div>
                        )}
                      </div>

                      {selectedPrint.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {t('prints.detail.notes')}
                          </p>
                          <p className="text-sm">{selectedPrint.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('prints.detail.materialsUsed')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedPrint.print_materials && selectedPrint.print_materials.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPrint.print_materials.map((pm) => (
                            <div key={pm.id} className="flex items-center justify-between p-2 rounded border">
                              <span className="font-medium">{pm.materials.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{pm.weight_grams}g</span>
                                {pm.material_cost > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({(pm.material_cost).toFixed(2)}€)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">{t('prints.detail.total')}:</span>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {selectedPrint.material_used_grams}g ({(selectedPrint.material_used_grams / 1000).toFixed(2)}kg)
                                </p>
                                {selectedPrint.print_materials.reduce((sum, pm) => sum + pm.material_cost, 0) > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {t('prints.detail.cost')}: {selectedPrint.print_materials.reduce((sum, pm) => sum + pm.material_cost, 0).toFixed(2)}€
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('prints.detail.noMaterials')}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prints;
