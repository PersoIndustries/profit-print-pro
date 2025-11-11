import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface OrderItem {
  id: string;
  order_id: string;
  project_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  orders: {
    order_number: string;
    customer_name: string;
  };
  projects: {
    name: string;
  };
}

type Status = 'design' | 'to_produce' | 'printing' | 'clean_and_packaging' | 'sent';

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  design: { label: 'Design', color: 'bg-purple-500' },
  to_produce: { label: 'To Produce', color: 'bg-blue-500' },
  printing: { label: 'Printing', color: 'bg-yellow-500' },
  clean_and_packaging: { label: 'Clean & Packaging', color: 'bg-orange-500' },
  sent: { label: 'Sent', color: 'bg-green-500' }
};

interface KanbanCardProps {
  item: OrderItem;
  onAddPrint: (item: OrderItem) => void;
}

function KanbanCard({ item, onAddPrint }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className="mb-3 hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
        <div 
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-sm font-medium line-clamp-2">
              {item.projects.name}
            </CardTitle>
            {item.quantity > 1 && (
              <Badge variant="secondary" className="text-xs">
                x{item.quantity}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order:</span>
            <span className="font-medium">{item.orders.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium truncate ml-2">{item.orders.customer_name}</span>
          </div>
          <div className="flex justify-between pt-1 border-t">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold">€{item.total_price.toFixed(2)}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onAddPrint(item);
          }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Agregar Impresión
        </Button>
      </CardContent>
    </Card>
  );
}

interface KanbanBoardProps {
  onRefresh?: () => void;
}

export function KanbanBoard({ onRefresh }: KanbanBoardProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [printForm, setPrintForm] = useState({
    name: '',
    print_time_hours: '',
    material_used_grams: '',
    notes: ''
  });
  const [filters, setFilters] = useState({
    customer: '',
    project: '',
    dateFrom: '',
    dateTo: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          orders!inner(order_number, customer_name, user_id),
          projects(name)
        `)
        .eq('orders.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error("Error al cargar items");
      console.error(error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = items.find(item => item.id === active.id);
    const newStatus = over.id as Status;

    if (!activeItem || activeItem.status === newStatus) return;

    try {
      const { error } = await supabase
        .from("order_items")
        .update({ status: newStatus })
        .eq("id", activeItem.id);

      if (error) throw error;

      setItems(items => items.map(item => 
        item.id === activeItem.id 
          ? { ...item, status: newStatus }
          : item
      ));

      toast.success(`Moved to ${STATUS_CONFIG[newStatus].label}`);
      onRefresh?.();
    } catch (error: any) {
      toast.error("Error al actualizar estado");
      console.error(error);
    }
  };

  const getItemsByStatus = (status: Status) => {
    return items.filter(item => {
      if (item.status !== status) return false;
      
      // Filter by customer
      if (filters.customer && !item.orders.customer_name.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }
      
      // Filter by project
      if (filters.project && !item.projects.name.toLowerCase().includes(filters.project.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  const clearFilters = () => {
    setFilters({ customer: '', project: '', dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters = filters.customer || filters.project || filters.dateFrom || filters.dateTo;

  const handleAddPrint = (item: OrderItem) => {
    setSelectedItem(item);
    setPrintForm({
      name: item.projects.name,
      print_time_hours: '',
      material_used_grams: '',
      notes: `Pedido: ${item.orders.order_number} - Cliente: ${item.orders.customer_name}`
    });
    setIsPrintModalOpen(true);
  };

  const handleSavePrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedItem) return;

    try {
      const { error } = await supabase
        .from("prints")
        .insert({
          user_id: user.id,
          name: printForm.name,
          print_type: 'order',
          order_id: selectedItem.order_id,
          project_id: selectedItem.project_id,
          print_time_hours: parseFloat(printForm.print_time_hours) || 0,
          material_used_grams: parseFloat(printForm.material_used_grams) || 0,
          print_date: new Date().toISOString(),
          notes: printForm.notes || null,
          status: 'completed'
        });

      if (error) throw error;

      toast.success("Impresión registrada");
      setIsPrintModalOpen(false);
      setPrintForm({ name: '', print_time_hours: '', material_used_grams: '', notes: '' });
      setSelectedItem(null);
    } catch (error: any) {
      toast.error("Error al guardar impresión");
      console.error(error);
    }
  };

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filtros Avanzados
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filter-customer">Cliente</Label>
              <Input
                id="filter-customer"
                placeholder="Buscar por cliente..."
                value={filters.customer}
                onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filter-project">Proyecto</Label>
              <Input
                id="filter-project"
                placeholder="Buscar por proyecto..."
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filter-date-from">Desde</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filter-date-to">Hasta</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const statusItems = getItemsByStatus(status as Status);
          
          return (
            <SortableContext
              key={status}
              items={statusItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="flex flex-col min-h-[500px]"
              >
                <div className="mb-4 sticky top-0 z-10 bg-background pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${config.color}`} />
                      {config.label}
                    </h3>
                    <Badge variant="secondary">{statusItems.length}</Badge>
                  </div>
                </div>
                
                <div 
                  className="flex-1 bg-muted/30 rounded-lg p-3 border-2 border-dashed border-muted-foreground/20"
                  data-status={status}
                >
                  {statusItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No items
                    </p>
                  ) : (
                    statusItems.map((item) => (
                      <KanbanCard key={item.id} item={item} onAddPrint={handleAddPrint} />
                    ))
                  )}
                </div>
              </div>
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <Card className="cursor-grabbing shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {activeItem.projects.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order:</span>
                  <span className="font-medium">{activeItem.orders.order_number}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      {/* Modal para agregar impresión */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Impresión</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePrint} className="space-y-4">
            <div>
              <Label htmlFor="print_name">Nombre *</Label>
              <Input
                id="print_name"
                value={printForm.name}
                onChange={(e) => setPrintForm({ ...printForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="print_time">Tiempo (horas) *</Label>
                <Input
                  id="print_time"
                  type="number"
                  step="0.1"
                  value={printForm.print_time_hours}
                  onChange={(e) => setPrintForm({ ...printForm, print_time_hours: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="material">Material (gramos) *</Label>
                <Input
                  id="material"
                  type="number"
                  step="1"
                  value={printForm.material_used_grams}
                  onChange={(e) => setPrintForm({ ...printForm, material_used_grams: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="print_notes">Notas</Label>
              <Textarea
                id="print_notes"
                value={printForm.notes}
                onChange={(e) => setPrintForm({ ...printForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Impresión
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
