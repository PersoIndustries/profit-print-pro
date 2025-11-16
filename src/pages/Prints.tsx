import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Plus, Printer, Edit2, Package, Wrench, User, Building, Download } from "lucide-react";
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

interface Print {
  id: string;
  name: string;
  print_type: 'order' | 'tools' | 'personal' | 'operational' | 'for_sale';
  order_id: string | null;
  project_id: string | null;
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

const PRINT_TYPE_CONFIG = {
  order: { label: 'Pedido', icon: Package, color: 'bg-blue-500' },
  tools: { label: 'Herramientas', icon: Wrench, color: 'bg-purple-500' },
  personal: { label: 'Personal', icon: User, color: 'bg-green-500' },
  operational: { label: 'Operativa', icon: Building, color: 'bg-orange-500' },
  for_sale: { label: 'Para Vender', icon: Package, color: 'bg-teal-500' }
};

const STATUS_CONFIG = {
  pending_print: { label: 'Pendiente', color: 'bg-gray-500' },
  printing: { label: 'Imprimiendo', color: 'bg-yellow-500' },
  completed: { label: 'Completado', color: 'bg-green-500' },
  failed: { label: 'Fallido', color: 'bg-red-500' }
};

const Prints = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [prints, setPrints] = useState<Print[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventory, setInventory] = useState<Array<{ material_id: string; quantity_grams: number }>>([]);
  const [printsLoading, setPrintsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrint, setEditingPrint] = useState<Print | null>(null);
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
      toast.error("Error al cargar impresiones");
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

  const handleImportFromProject = async () => {
    if (!formData.project_id) {
      toast.error("Selecciona un proyecto primero");
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

        toast.success("Materiales importados del proyecto");
      } else {
        toast.info("El proyecto no tiene materiales asignados");
      }
    } catch (error: any) {
      toast.error("Error al importar materiales");
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
      toast.error("Añade al menos un material");
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

        toast.success("Impresión actualizada");
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

        toast.success("Impresión registrada");
      }

      setIsModalOpen(false);
      fetchPrints();
      fetchInventory(); // Refresh inventory after saving
    } catch (error: any) {
      toast.error("Error al guardar impresión");
    }
  };

  const handleDeletePrint = async (id: string) => {
    try {
      const { error } = await supabase.from("prints").delete().eq("id", id);
      if (error) throw error;
      toast.success("Impresión eliminada");
      fetchPrints();
    } catch (error: any) {
      toast.error("Error al eliminar impresión");
    }
  };

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
          <h1 className="text-4xl font-bold">Impresiones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona y registra tus impresiones 3D
          </p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Impresión
        </Button>
      </div>

      {prints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Printer className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay impresiones registradas. Crea tu primera impresión.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {prints.map((print) => {
            const typeConfig = PRINT_TYPE_CONFIG[print.print_type];
            const statusConfig = STATUS_CONFIG[print.status];
            const TypeIcon = typeConfig.icon;

            return (
              <Card key={print.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-5 h-5" />
                        <CardTitle>{print.name}</CardTitle>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditPrint(print)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeletePrint(print.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      {print.orders && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Pedido:</span>{" "}
                          {print.orders.order_number} - {print.orders.customer_name}
                        </p>
                      )}
                      {print.projects && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Proyecto:</span>{" "}
                          {print.projects.name}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="text-muted-foreground">Tiempo de impresión:</span>{" "}
                        {print.print_time_hours}h
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Fecha:</span>{" "}
                        {new Date(print.print_date).toLocaleString('es-ES')}
                      </p>
                      {print.notes && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Notas:</span> {print.notes}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Materiales utilizados:</p>
                      {print.print_materials && print.print_materials.length > 0 ? (
                        <div className="space-y-1">
                          {print.print_materials.map((pm) => (
                            <div key={pm.id} className="text-sm flex justify-between">
                              <span>{pm.materials.name}</span>
                              <span className="text-muted-foreground">{pm.weight_grams}g</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t text-sm font-medium">
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span>{print.material_used_grams}g ({(print.material_used_grams / 1000).toFixed(2)}kg)</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin materiales registrados</p>
                      )}
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
            <DialogTitle>{editingPrint ? 'Editar Impresión' : 'Nueva Impresión'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePrint} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="print_type">Tipo de Impresión *</Label>
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
                <Label htmlFor="order_id">Pedido (opcional)</Label>
                <Select
                  value={formData.order_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, order_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="order_id">
                    <SelectValue placeholder="Seleccionar pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin pedido</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Proyecto (opcional)</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.project_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger id="project_id">
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto</SelectItem>
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
                      title="Importar materiales del proyecto"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="print_time_hours">Tiempo de Impresión (horas) *</Label>
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
                <Label htmlFor="print_date">Fecha y Hora *</Label>
                <Input
                  id="print_date"
                  type="datetime-local"
                  value={formData.print_date}
                  onChange={(e) => setFormData({ ...formData, print_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="status">Estado *</Label>
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
                <Label htmlFor="notes">Notas</Label>
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
                <Label className="text-lg font-semibold">Materiales *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Material
                </Button>
              </div>

              {formMaterials.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>No hay materiales añadidos.</p>
                    <p className="text-sm">Usa el botón de arriba o importa desde un proyecto</p>
                  </CardContent>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Peso (g)</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
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
                    Total: {formMaterials.reduce((sum, m) => sum + (parseFloat(m.weight_grams) || 0), 0).toFixed(1)}g
                    {" "}
                    ({(formMaterials.reduce((sum, m) => sum + (parseFloat(m.weight_grams) || 0), 0) / 1000).toFixed(3)}kg)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPrint ? 'Actualizar' : 'Crear'} Impresión
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
            <AlertDialogTitle>⚠️ Stock Insuficiente</AlertDialogTitle>
            <AlertDialogDescription>
              No hay suficiente stock disponible para algunos materiales:
              <ul className="list-disc list-inside mt-3 space-y-1">
                {stockWarning.insufficientMaterials.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    <strong>{item.materialName}</strong>: Disponible {item.available.toFixed(0)}g, 
                    Necesitas {item.needed.toFixed(0)}g 
                    <span className="text-destructive">
                      (Faltan {(item.needed - item.available).toFixed(0)}g)
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm">
                El stock puede quedar negativo. ¿Deseas continuar de todas formas?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={stockWarning.onConfirm}>
              Continuar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Prints;
