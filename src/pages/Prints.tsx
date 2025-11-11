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
import { Loader2, Trash2, Plus, Printer, Edit2, Package, Wrench, User, Building } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Print {
  id: string;
  name: string;
  print_type: 'order' | 'tools' | 'personal' | 'operational';
  order_id: string | null;
  project_id: string | null;
  print_time_hours: number;
  material_used_grams: number;
  print_date: string;
  notes: string | null;
  status: 'printing' | 'completed' | 'failed';
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
}

const PRINT_TYPE_CONFIG = {
  order: { label: 'Pedido', icon: Package, color: 'bg-blue-500' },
  tools: { label: 'Herramientas', icon: Wrench, color: 'bg-purple-500' },
  personal: { label: 'Personal', icon: User, color: 'bg-green-500' },
  operational: { label: 'Operativa', icon: Building, color: 'bg-orange-500' }
};

const STATUS_CONFIG = {
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
  const [printsLoading, setPrintsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrint, setEditingPrint] = useState<Print | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    print_type: 'order' as 'order' | 'tools' | 'personal' | 'operational',
    order_id: '',
    project_id: '',
    print_time_hours: '',
    material_used_grams: '',
    print_date: new Date().toISOString().slice(0, 16),
    notes: '',
    status: 'completed' as 'printing' | 'completed' | 'failed'
  });

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
          projects(name)
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
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Error al cargar pedidos");
    }
  };

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Error al cargar proyectos");
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      print_type: 'order',
      order_id: '',
      project_id: '',
      print_time_hours: '',
      material_used_grams: '',
      print_date: new Date().toISOString().slice(0, 16),
      notes: '',
      status: 'completed'
    });
    setEditingPrint(null);
  };

  const handleOpenModal = (print?: Print) => {
    if (print) {
      setEditingPrint(print);
      setFormData({
        name: print.name,
        print_type: print.print_type,
        order_id: print.order_id || '',
        project_id: print.project_id || '',
        print_time_hours: print.print_time_hours.toString(),
        material_used_grams: print.material_used_grams.toString(),
        print_date: new Date(print.print_date).toISOString().slice(0, 16),
        notes: print.notes || '',
        status: print.status
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const printData = {
        user_id: user.id,
        name: formData.name,
        print_type: formData.print_type,
        order_id: formData.print_type === 'order' && formData.order_id ? formData.order_id : null,
        project_id: formData.project_id || null,
        print_time_hours: parseFloat(formData.print_time_hours) || 0,
        material_used_grams: parseFloat(formData.material_used_grams) || 0,
        print_date: formData.print_date,
        notes: formData.notes || null,
        status: formData.status
      };

      if (editingPrint) {
        const { error } = await supabase
          .from("prints")
          .update(printData)
          .eq("id", editingPrint.id);

        if (error) throw error;
        toast.success("Impresión actualizada");
      } else {
        const { error } = await supabase
          .from("prints")
          .insert([printData]);

        if (error) throw error;
        toast.success("Impresión registrada");
      }

      fetchPrints();
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error("Error al guardar impresión");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
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

  const totalPrintTime = prints.reduce((sum, p) => sum + Number(p.print_time_hours), 0);
  const totalMaterial = prints.reduce((sum, p) => sum + Number(p.material_used_grams), 0);

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Impresiones</h2>
          <p className="text-muted-foreground">
            Histórico de impresiones: {prints.length} registros
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Impresión
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Impresiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prints.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiempo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrintTime.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Material Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalMaterial / 1000).toFixed(2)}kg</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {prints.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Printer className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay impresiones registradas</p>
            </CardContent>
          </Card>
        ) : (
          prints.map((print) => {
            const typeConfig = PRINT_TYPE_CONFIG[print.print_type];
            const Icon = typeConfig.icon;
            const statusConfig = STATUS_CONFIG[print.status];

            return (
              <Card key={print.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" />
                        <CardTitle className="text-lg">{print.name}</CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenModal(print)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(print.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fecha</p>
                      <p className="font-medium">
                        {new Date(print.print_date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {print.print_type === 'order' && print.orders && (
                      <div>
                        <p className="text-muted-foreground">Pedido</p>
                        <p className="font-medium">{print.orders.order_number}</p>
                        <p className="text-xs text-muted-foreground">{print.orders.customer_name}</p>
                      </div>
                    )}

                    {print.projects && (
                      <div>
                        <p className="text-muted-foreground">Proyecto</p>
                        <p className="font-medium">{print.projects.name}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-muted-foreground">Tiempo</p>
                      <p className="font-medium">{print.print_time_hours}h</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Material</p>
                      <p className="font-medium">{print.material_used_grams}g</p>
                    </div>
                  </div>

                  {print.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Notas:</p>
                      <p className="text-sm">{print.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrint ? 'Editar Impresión' : 'Nueva Impresión'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Pieza para proyecto X"
                  required
                />
              </div>

              <div>
                <Label htmlFor="print_type">Tipo *</Label>
                <Select
                  value={formData.print_type}
                  onValueChange={(value: any) => setFormData({ ...formData, print_type: value, order_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Pedido</SelectItem>
                    <SelectItem value="tools">Herramientas</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="operational">Operativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Estado *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="printing">Imprimiendo</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.print_type === 'order' && (
                <div className="md:col-span-2">
                  <Label htmlFor="order_id">Pedido</Label>
                  <Select
                    value={formData.order_id}
                    onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un pedido" />
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
              )}

              <div className="md:col-span-2">
                <Label htmlFor="project_id">Proyecto</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="print_time_hours">Tiempo (horas) *</Label>
                <Input
                  id="print_time_hours"
                  type="number"
                  step="0.1"
                  value={formData.print_time_hours}
                  onChange={(e) => setFormData({ ...formData, print_time_hours: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="material_used_grams">Material usado (gramos) *</Label>
                <Input
                  id="material_used_grams"
                  type="number"
                  step="1"
                  value={formData.material_used_grams}
                  onChange={(e) => setFormData({ ...formData, material_used_grams: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="print_date">Fecha y Hora *</Label>
                <Input
                  id="print_date"
                  type="datetime-local"
                  value={formData.print_date}
                  onChange={(e) => setFormData({ ...formData, print_date: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalles adicionales..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPrint ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Prints;
