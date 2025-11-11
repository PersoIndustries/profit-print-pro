import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus, Package, Edit, Kanban, Calendar, TrendingUp } from "lucide-react";
import { OrderFormModal } from "@/components/OrderFormModal";
import { KanbanBoard } from "@/components/KanbanBoard";
import { CalendarView } from "@/components/CalendarView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  notes: string;
  order_date: string;
  order_items?: {
    id: string;
    quantity: number;
    projects: {
      name: string;
    };
  }[];
}

const Orders = () => {
  const { user } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            id,
            quantity,
            projects(name)
          )
        `)
        .eq("user_id", user.id)
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error loading orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    setSelectedOrderId(null);
    setIsModalOpen(true);
  };

  const handleEditOrder = (id: string) => {
    setSelectedOrderId(id);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchOrders();
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      toast.success("Order deleted successfully");
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Error deleting order");
    }
  };

  if (loading || subLoading) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  }

  const monthlyCount = orders.filter(order => {
    const orderDate = new Date(order.order_date);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && 
           orderDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">{t('orders.title')}</h2>
          <p className="text-muted-foreground">
            {t('orders.thisMonth')}: {monthlyCount} / {subscription?.limits.monthlyOrders}
          </p>
        </div>
        <Button 
          onClick={handleCreateOrder} 
          disabled={!subscription?.canAdd.orders}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('orders.add')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <Package className="mr-2 h-4 w-4" />
            Lista de Pedidos
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <Kanban className="mr-2 h-4 w-4" />
            Kanban Board
            {subscription?.tier === 'free' && (
              <Badge className="ml-2 bg-primary text-[10px] py-0 px-1.5">PRO</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendario
            {subscription?.tier === 'free' && (
              <Badge className="ml-2 bg-primary text-[10px] py-0 px-1.5">PRO</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No hay pedidos todavía</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primer pedido haciendo click en el botón "Nuevo Pedido" arriba
                </p>
                <Button variant="outline" onClick={handleCreateOrder}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Pedido
                </Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{order.order_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditOrder(order.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(order.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {order.customer_name && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('orders.customer')}</p>
                          <p className="font-medium">{order.customer_name}</p>
                          {order.customer_email && <p className="text-sm">{order.customer_email}</p>}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">{t('orders.amount')}</p>
                        <p className="font-medium text-lg">{order.total_amount.toFixed(2)}€</p>
                      </div>
                    </div>
                    
                    {order.order_items && order.order_items.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Proyectos:</p>
                        <div className="space-y-1">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{item.projects.name}</span>
                              {item.quantity > 1 && (
                                <span className="text-muted-foreground">x{item.quantity}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('orders.notes')}</p>
                        <p className="text-sm">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="kanban">
          {subscription?.tier === 'free' ? (
            <Card className="border-primary">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <Kanban className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Vista Kanban - Funcionalidad Premium</h3>
                    <p className="text-muted-foreground mb-4">
                      Organiza tus pedidos visualmente arrastrando y soltando entre estados: Diseño, Por Producir, Imprimiendo, Limpieza y Enviado.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-sm mx-auto">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>Drag & drop para cambiar estados fácilmente</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>Vista clara del flujo de trabajo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>Gestión visual de todos los pedidos</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/pricing')} size="lg">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Actualizar a Professional
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('list')} size="lg">
                      Ver Lista
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <KanbanBoard onRefresh={fetchOrders} />
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {subscription?.tier === 'free' ? (
            <Card className="border-primary">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <Calendar className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Vista Calendario - Funcionalidad Premium</h3>
                    <p className="text-muted-foreground mb-4">
                      Visualiza todos tus pedidos en un calendario mensual y arrastra para cambiar fechas de entrega fácilmente.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-sm mx-auto">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>Vista mensual de todos los pedidos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>Drag & drop para cambiar fechas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>Planificación visual de entregas</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/pricing')} size="lg">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Actualizar a Professional
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('list')} size="lg">
                      Ver Lista
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CalendarView onRefresh={fetchOrders} />
          )}
        </TabsContent>
      </Tabs>

      <OrderFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        orderId={selectedOrderId}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

export default Orders;
