import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package } from "lucide-react";
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

interface DroppableDayProps {
  id: string;
  date: Date;
  children: React.ReactNode;
  className?: string;
}

function DroppableDay({ id, date, children, className }: DroppableDayProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

interface CalendarViewProps {
  onRefresh?: () => void;
  onViewOrder?: (order: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-500',
  preparation: 'bg-purple-500',
  ready_to_produce: 'bg-blue-500',
  on_production: 'bg-yellow-500',
  packaging: 'bg-orange-500',
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
      className="bg-card border border-border rounded p-1.5 mb-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow text-xs"
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
      <div className="flex items-start gap-1.5">
        {item.projects.image_url ? (
          <img
            src={item.projects.image_url}
            alt={item.projects.name}
            className="w-6 h-6 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-[10px]">{item.orders.order_number}</p>
          <p className="text-muted-foreground text-[9px] truncate">{item.projects.name}</p>
        </div>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${STATUS_COLORS[item.status]}`} />
      </div>
    </div>
  );
}

export function CalendarView({ onRefresh, onViewOrder }: CalendarViewProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ orderId: string; newDate: string; oldDate: string } | null>(null);

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
          orders!inner(id, order_number, customer_name, customer_email, status, total_amount, notes, order_date, user_id),
          projects(name, image_url)
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = items.find(item => item.id === active.id);
    if (!activeItem) return;

    // Check if over.id is a date string (YYYY-MM-DD format)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(over.id as string)) {
      // If not a date, check if it's another item (same date, no change needed)
      const overItem = items.find(item => item.id === over.id);
      if (overItem) {
        // Dropped on another item, use that item's order date
        const newDate = overItem.orders.order_date.split('T')[0];
        if (newDate !== activeItem.orders.order_date.split('T')[0]) {
          setPendingUpdate({
            orderId: activeItem.order_id,
            newDate: newDate,
            oldDate: activeItem.orders.order_date.split('T')[0]
          });
          setConfirmDialogOpen(true);
        }
      }
      return;
    }

    const newDate = over.id as string;
    const oldDate = activeItem.orders.order_date.split('T')[0];

    // Check if date actually changed
    if (newDate === oldDate) return;

    // Show confirmation dialog
    setPendingUpdate({
      orderId: activeItem.order_id,
      newDate: newDate,
      oldDate: oldDate
    });
    setConfirmDialogOpen(true);
  };

  const handleConfirmDateUpdate = async () => {
    if (!pendingUpdate) return;

    try {
      // Convert date string to ISO format with time (preserve original time or use midnight)
      const newDateTime = new Date(pendingUpdate.newDate);
      newDateTime.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      const isoDate = newDateTime.toISOString();

      // Update order date
      const { error } = await supabase
        .from("orders")
        .update({ order_date: isoDate })
        .eq("id", pendingUpdate.orderId);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Update local state
      setItems(items => items.map(item => 
        item.order_id === pendingUpdate.orderId 
          ? { ...item, orders: { ...item.orders, order_date: isoDate } }
          : item
      ));

      toast.success("Fecha actualizada correctamente");
      setConfirmDialogOpen(false);
      setPendingUpdate(null);
      onRefresh?.();
    } catch (error: any) {
      console.error("Error updating date:", error);
      toast.error("Error al actualizar fecha: " + (error.message || "Error desconocido"));
      setConfirmDialogOpen(false);
      setPendingUpdate(null);
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
                  <DroppableDay
                    key={dateStr}
                    id={dateStr}
                    date={day}
                  >
                    <SortableContext
                      items={dayItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
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
                  </DroppableDay>
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
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>Pendiente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Preparación</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Listo para Producir</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>En Producción</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Embalaje</span>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar fecha del pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUpdate && (
                <>
                  ¿Deseas cambiar la fecha del pedido de{" "}
                  <strong>
                    {new Date(pendingUpdate.oldDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </strong>{" "}
                  a{" "}
                  <strong>
                    {new Date(pendingUpdate.newDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingUpdate(null);
              setConfirmDialogOpen(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDateUpdate}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
