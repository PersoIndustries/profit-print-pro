import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrderItem {
  id: string;
  order_id: string;
  project_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  orders: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    status: string;
    total_amount: number;
    notes: string;
    order_date: string;
  };
  projects: {
    name: string;
    image_url?: string | null;
  };
}

type Status = 'pending' | 'preparation' | 'ready_to_produce' | 'on_production' | 'packaging' | 'sent';

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-gray-500' },
  preparation: { label: 'Preparación', color: 'bg-purple-500' },
  ready_to_produce: { label: 'Listo para Producir', color: 'bg-blue-500' },
  on_production: { label: 'En Producción', color: 'bg-yellow-500' },
  packaging: { label: 'Embalaje', color: 'bg-orange-500' },
  sent: { label: 'Enviado', color: 'bg-green-500' }
};

interface KanbanCardProps {
  item: OrderItem;
}

function KanbanCard({ item }: KanbanCardProps) {
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
      className="mb-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={(e) => {
        // Only open modal if not dragging
        if (!isDragging && onViewOrder) {
          e.stopPropagation();
          onViewOrder({
            id: item.orders.id,
            order_number: item.orders.order_number,
            customer_name: item.orders.customer_name,
            customer_email: item.orders.customer_email,
            status: item.orders.status,
            total_amount: item.orders.total_amount,
            notes: item.orders.notes,
            order_date: item.orders.order_date,
            order_items: [{
              id: item.id,
              quantity: item.quantity,
              projects: {
                name: item.projects.name,
                image_url: item.projects.image_url
              }
            }]
          });
        }
      }}
    >
      <CardHeader className="pb-2">
        <div 
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-start gap-2">
            {item.projects.image_url ? (
              <img
                src={item.projects.image_url}
                alt={item.projects.name}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs font-medium line-clamp-2">
                {item.projects.name}
              </CardTitle>
              {item.quantity > 1 && (
                <Badge variant="secondary" className="text-[10px] mt-1">
                  x{item.quantity}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2 space-y-1">
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order:</span>
            <span className="font-medium truncate ml-1">{item.orders.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium truncate ml-1">{item.orders.customer_name}</span>
          </div>
          <div className="flex justify-between pt-0.5 border-t">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold">€{item.total_price.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DroppableColumnProps {
  id: string;
  status: Status;
  children: ReactNode;
}

function DroppableColumn({ id, status, children }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className="flex flex-col min-h-[500px]">
      {children}
    </div>
  );
}

interface KanbanBoardProps {
  onRefresh?: () => void;
  onViewOrder?: (order: any) => void;
}

export function KanbanBoard({ onRefresh, onViewOrder }: KanbanBoardProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
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
          orders!inner(id, order_number, customer_name, customer_email, status, total_amount, notes, order_date, user_id),
          projects(name, image_url)
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
    if (!activeItem) return;

    // Check if we're dropping over a droppable container (status column)
    // The over.id should be the status (e.g., 'pending', 'preparation', etc.)
    let newStatus: Status | null = null;
    
    // Check if over.id is a valid status
    if (STATUS_CONFIG[over.id as Status]) {
      newStatus = over.id as Status;
    } else {
      // If not, check if we're dropping over an item in another column
      // Find which column contains the item we're dropping over
      const overItem = items.find(item => item.id === over.id);
      if (overItem) {
        newStatus = overItem.status as Status;
      } else {
        return; // Not dropping over a valid target
      }
    }
    
    if (!newStatus || activeItem.status === newStatus) return;

    try {
      // Update order_items status
      const { error: itemError } = await supabase
        .from("order_items")
        .update({ status: newStatus })
        .eq("id", activeItem.id);

      if (itemError) throw itemError;

      // Update the order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", activeItem.order_id);

      if (orderError) throw orderError;

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
        <CardContent className="pt-6">
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
              <div className="flex items-end gap-2">
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const statusItems = getItemsByStatus(status as Status);
          
          return (
            <DroppableColumn key={status} id={status} status={status as Status}>
              <SortableContext
                items={statusItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
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
                >
                  {statusItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No items
                    </p>
                  ) : (
                    statusItems.map((item) => (
                      <KanbanCard key={item.id} item={item} />
                    ))
                  )}
                </div>
              </SortableContext>
            </DroppableColumn>
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
    </DndContext>
  );
}
