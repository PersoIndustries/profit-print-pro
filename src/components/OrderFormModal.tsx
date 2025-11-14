import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

interface Project {
  id: string;
  name: string;
  total_price: number;
}

interface OrderItem {
  id: string;
  project_id: string;
  project_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
}

interface OrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string | null;
  onSuccess: () => void;
}

export function OrderFormModal({ open, onOpenChange, orderId, onSuccess }: OrderFormModalProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [nextItemId, setNextItemId] = useState(1);

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (orderId) {
        loadOrder(orderId);
      } else {
        resetForm();
        generateOrderNumber();
      }
    }
  }, [open, orderId]);

  const resetForm = () => {
    setOrderNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderItems([]);
    setNextItemId(1);
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setOrderNumber(`ORD-${year}${month}-${random}`);
  };

  const loadOrder = async (id: string) => {
    if (!user) return;

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*, projects(name)")
        .eq("order_id", id);

      if (itemsError) throw itemsError;

      setOrderNumber(order.order_number);
      setCustomerName(order.customer_name || "");
      setCustomerEmail(order.customer_email || "");
      setCustomerPhone(order.customer_phone || "");
      setNotes(order.notes || "");
      setOrderDate(order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

      const loadedItems: OrderItem[] = items.map((item: any, index: number) => ({
        id: `item-${index + 1}`,
        project_id: item.project_id,
        project_name: item.projects?.name || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        status: item.status
      }));

      setOrderItems(loadedItems);
      setNextItemId(items.length + 1);

    } catch (error: any) {
      toast.error("Error al cargar pedido");
      console.error(error);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, total_price")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Error al cargar proyectos");
    }
  };

  const addOrderItem = () => {
    const newItem: OrderItem = {
      id: `item-${nextItemId}`,
      project_id: '',
      project_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      status: 'design'
    };
    setOrderItems([...orderItems, newItem]);
    setNextItemId(nextItemId + 1);
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(items => items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === 'project_id' && value) {
        const project = projects.find(p => p.id === value);
        if (project) {
          updated.project_name = project.name;
          updated.unit_price = project.total_price || 0;
        }
      }
      
      updated.total_price = updated.quantity * updated.unit_price;
      
      return updated;
    }));
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSaveOrder = async () => {
    if (!user || !orderNumber || !customerName) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Añade al menos un proyecto al pedido");
      return;
    }

    try {
      const totalAmount = calculateTotal();

      if (orderId) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({
            order_number: orderNumber,
            customer_name: customerName,
            customer_email: customerEmail || null,
            customer_phone: customerPhone || null,
            total_amount: totalAmount,
            notes: notes || null,
            order_date: orderDate,
          })
          .eq("id", orderId);

        if (orderError) throw orderError;

        await supabase.from("order_items").delete().eq("order_id", orderId);

        const itemsData = orderItems.map(item => ({
          order_id: orderId,
          project_id: item.project_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          status: item.status
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsData);

        if (itemsError) throw itemsError;

        toast.success("Pedido actualizado");
      } else {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            customer_name: customerName,
            customer_email: customerEmail || null,
            total_amount: totalAmount,
            notes: notes || null,
            order_date: orderDate,
            status: 'pending'
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const itemsData = orderItems.map(item => ({
          order_id: order.id,
          project_id: item.project_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          status: item.status
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsData);

        if (itemsError) throw itemsError;

        toast.success("Pedido guardado");
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error al guardar pedido: " + error.message);
    }
  };

  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{orderId ? 'Editar Pedido' : 'Nuevo Pedido'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Número de Pedido *</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-202501-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre del Cliente *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Cliente X"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customerEmail">Email del Cliente</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="cliente@example.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orderDate">Fecha del Pedido *</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Proyectos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                <Plus className="w-3 h-3 mr-1" />
                Añadir Proyecto
              </Button>
            </div>

            {orderItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No hay proyectos añadidos.</p>
                  <p className="text-sm">Usa el botón de arriba para añadir proyectos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="w-[120px]">Precio Unit.</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select 
                            value={item.project_id} 
                            onValueChange={(value) => updateOrderItem(item.id, 'project_id', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecciona proyecto" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.length === 0 ? (
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                  No hay proyectos
                                </div>
                              ) : (
                                projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateOrderItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{item.total_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeOrderItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="border-t bg-muted/30 p-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span className="text-primary">€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales del pedido..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveOrder} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {orderId ? 'Actualizar Pedido' : 'Guardar Pedido'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
