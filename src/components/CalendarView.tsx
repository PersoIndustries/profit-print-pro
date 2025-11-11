import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

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
    order_date: string;
  };
  projects: {
    name: string;
  };
}

interface CalendarViewProps {
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  design: 'bg-purple-500',
  to_produce: 'bg-blue-500',
  printing: 'bg-yellow-500',
  clean_and_packaging: 'bg-orange-500',
  sent: 'bg-green-500'
};

interface OrderCardProps {
  item: OrderItem;
}

function OrderCard({ item }: OrderCardProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card border border-border rounded p-2 mb-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow text-xs"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.projects.name}</p>
          <p className="text-muted-foreground text-[10px] truncate">{item.orders.customer_name}</p>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${STATUS_COLORS[item.status]}`} />
      </div>
    </div>
  );
}

export function CalendarView({ onRefresh }: CalendarViewProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, [user, currentMonth]);

  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          orders!inner(order_number, customer_name, user_id, order_date),
          projects(name)
        `)
        .eq('orders.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error("Error al cargar pedidos");
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
    const newDate = over.id as string; // Format: YYYY-MM-DD

    if (!activeItem) return;

    try {
      // Update order date
      const { error } = await supabase
        .from("orders")
        .update({ order_date: newDate })
        .eq("id", activeItem.order_id);

      if (error) throw error;

      // Update local state
      setItems(items => items.map(item => 
        item.order_id === activeItem.order_id 
          ? { ...item, orders: { ...item.orders, order_date: newDate } }
          : item
      ));

      toast.success("Fecha actualizada");
      onRefresh?.();
    } catch (error: any) {
      toast.error("Error al actualizar fecha");
      console.error(error);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of the month to calculate offset
  const firstDayOfWeek = monthStart.getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday is first day

  // Add empty days at the start
  const calendarDays = [
    ...Array(offset).fill(null),
    ...daysInMonth
  ];

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      const orderDate = new Date(item.orders.order_date);
      return isSameDay(orderDate, date);
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Calendar Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <h3 className="text-xl font-semibold">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hoy
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-[120px]" />;
                }

                const dateStr = format(day, 'yyyy-MM-dd');
                const dayItems = getItemsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <SortableContext
                    key={dateStr}
                    items={dayItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      data-date={dateStr}
                      className={`min-h-[120px] border rounded-lg p-2 ${
                        isToday ? 'border-primary bg-primary/5' : 'border-border'
                      } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        {dayItems.length > 0 && (
                          <Badge variant="secondary" className="h-5 text-[10px] px-1">
                            {dayItems.length}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 overflow-y-auto max-h-[80px]">
                        {dayItems.map((item) => (
                          <OrderCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  </SortableContext>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="font-medium">Estados:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Diseño</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Por Producir</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Imprimiendo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Limpieza y Empaque</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Enviado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="bg-card border border-border rounded p-2 shadow-lg text-xs">
            <p className="font-medium">{activeItem.projects.name}</p>
            <p className="text-muted-foreground text-[10px]">{activeItem.orders.customer_name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
