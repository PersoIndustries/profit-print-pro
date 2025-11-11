import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing mb-3 hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
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
      </CardHeader>
      <CardContent className="pb-3">
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
    return items.filter(item => item.status === status);
  };

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                      <KanbanCard key={item.id} item={item} />
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
    </DndContext>
  );
}
