import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Plus, Package, Edit, Kanban, Calendar, TrendingUp, User, Mail, Euro, FileText, Search } from "lucide-react";
import placeholderImage from "@/assets/placeholder.jpg";
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
      image_url?: string | null;
    };
  }[];
}

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, navigate]);

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

  const handleViewOrder = async (order: Order | any) => {
    // Always fetch complete order data with images to ensure we have all information
    if (order && order.id) {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            order_items(
              id,
              quantity,
              projects(name, image_url)
            )
          `)
          .eq("id", order.id)
          .single();

        if (error) throw error;
        setSelectedOrder(data as Order);
      } catch (error) {
        console.error("Error fetching order details:", error);
        // Fallback to the order data we have
        setSelectedOrder(order as Order);
      }
    } else {
      setSelectedOrder(order as Order);
    }
  };

  const handleModalSuccess = async () => {
    // Fetch updated orders
    if (!user) return;
    
    try {
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
      const updatedOrders = data || [];
      setOrders(updatedOrders);
      
      // Update selected order if it was edited
      if (selectedOrderId && selectedOrder) {
        const updatedOrder = updatedOrders.find((o: Order) => o.id === selectedOrderId);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error loading orders");
    }
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOrderToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderToDelete);
      if (error) throw error;
      toast.success(t('orders.messages.orderDeleted'));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      if (selectedOrder?.id === orderToDelete) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t('orders.messages.errorDeleting'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: t('orders.statusFilter.pending'), variant: "outline" },
      preparation: { label: t('orders.statusFilter.preparation'), variant: "secondary" },
      ready_to_produce: { label: t('orders.statusFilter.ready_to_produce'), variant: "default" },
      on_production: { label: t('orders.statusFilter.on_production'), variant: "default" },
      packaging: { label: t('orders.statusFilter.packaging'), variant: "default" },
      sent: { label: t('orders.statusFilter.sent'), variant: "outline" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesOrderNumber = order.order_number.toLowerCase().includes(query);
      const matchesCustomer = order.customer_name?.toLowerCase().includes(query) || false;
      const matchesEmail = order.customer_email?.toLowerCase().includes(query) || false;
      const matchesProjects = order.order_items?.some(item => 
        item.projects.name.toLowerCase().includes(query)
      ) || false;
      
      return matchesOrderNumber || matchesCustomer || matchesEmail || matchesProjects;
    }
    
    return true;
  });

  if (loading || subLoading || authLoading) {
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
            {t('orders.tabs.list')}
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <Kanban className="mr-2 h-4 w-4" />
            {t('orders.tabs.kanban')}
            {subscription?.tier === 'free' && (
              <Badge className="ml-2 bg-primary text-[10px] py-0 px-1.5">PRO</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            {t('orders.tabs.calendar')}
            {subscription?.tier === 'free' && (
              <Badge className="ml-2 bg-primary text-[10px] py-0 px-1.5">PRO</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('orders.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('orders.statusFilter.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.statusFilter.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('orders.statusFilter.pending')}</SelectItem>
                <SelectItem value="preparation">{t('orders.statusFilter.preparation')}</SelectItem>
                <SelectItem value="ready_to_produce">{t('orders.statusFilter.ready_to_produce')}</SelectItem>
                <SelectItem value="on_production">{t('orders.statusFilter.on_production')}</SelectItem>
                <SelectItem value="packaging">{t('orders.statusFilter.packaging')}</SelectItem>
                <SelectItem value="sent">{t('orders.statusFilter.sent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {statusFilter === "all" ? t('orders.empty.noOrders') : t('orders.empty.noOrdersWithStatus')}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {statusFilter === "all" 
                    ? t('orders.empty.createFirst')
                    : t('orders.empty.tryOtherFilter')}
                </p>
                {statusFilter === "all" && (
                  <Button variant="outline" onClick={handleCreateOrder}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('orders.empty.createFirstButton')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewOrder(order)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Imágenes de proyectos */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="flex -space-x-2 flex-shrink-0">
                        {order.order_items.slice(0, 3).map((item, idx) => (
                          <div
                            key={item.id}
                            className="w-10 h-10 rounded border-2 border-background overflow-hidden bg-muted flex-shrink-0"
                            style={{ zIndex: 3 - idx }}
                          >
                            {item.projects.image_url ? (
                              <img
                                src={item.projects.image_url}
                                alt={item.projects.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                        {order.order_items.length > 3 && (
                          <div className="w-10 h-10 rounded border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                            +{order.order_items.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Información principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <CardTitle className="text-sm font-semibold truncate">{order.order_number}</CardTitle>
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(null);
                              handleEditOrder(order.id);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.customer_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{order.customer_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs">
                          <Euro className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold">{order.total_amount.toFixed(2)}€</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
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
                    <h3 className="text-2xl font-bold mb-2">{t('orders.premium.kanban.title')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('orders.premium.kanban.description')}
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-sm mx-auto">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('orders.premium.kanban.features.dragDrop')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('orders.premium.kanban.features.workflow')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('orders.premium.kanban.features.visualManagement')}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/pricing')} size="lg">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {t('orders.premium.kanban.upgrade')}
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('list')} size="lg">
                      {t('orders.premium.kanban.viewList')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <KanbanBoard onRefresh={fetchOrders} onViewOrder={handleViewOrder} />
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
                    <h3 className="text-2xl font-bold mb-2">{t('orders.premium.calendar.title')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('orders.premium.calendar.description')}
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-sm mx-auto">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('orders.premium.calendar.features.monthlyView')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('orders.premium.calendar.features.dragDropDates')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('orders.premium.calendar.features.visualPlanning')}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/pricing')} size="lg">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {t('orders.premium.calendar.upgrade')}
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('list')} size="lg">
                      {t('orders.premium.calendar.viewList')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CalendarView onRefresh={fetchOrders} onViewOrder={handleViewOrder} />
          )}
        </TabsContent>
      </Tabs>

      <OrderFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        orderId={selectedOrderId}
        onSuccess={handleModalSuccess}
      />

      {/* Dialog de detalle del pedido */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl">{selectedOrder.order_number}</DialogTitle>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(null);
                      handleEditOrder(selectedOrder.id);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t('orders.view.edit')}
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Información principal */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('orders.view.orderInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('orders.view.date')}</p>
                            <p className="font-semibold">
                              {new Date(selectedOrder.order_date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">{t('orders.view.status')}</p>
                            <div className="mt-1">
                              {getStatusBadge(selectedOrder.status)}
                            </div>
                          </div>
                        </div>
                        {selectedOrder.customer_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">{t('orders.view.customer')}</p>
                              <p className="font-semibold">{selectedOrder.customer_name}</p>
                              {selectedOrder.customer_email && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Mail className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">{selectedOrder.customer_email}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('orders.view.total')}</p>
                            <p className="font-semibold text-lg">{selectedOrder.total_amount.toFixed(2)}€</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('orders.view.projects')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                        <div className="space-y-2">
                          {selectedOrder.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center gap-2">
                                {item.projects.image_url ? (
                                  <img
                                    src={item.projects.image_url}
                                    alt={item.projects.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <Package className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium">{item.projects.name}</span>
                              </div>
                              {item.quantity > 1 && (
                                <Badge variant="secondary">x{item.quantity}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('orders.view.noProjects')}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedOrder.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {t('orders.view.notes')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Acciones */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteClick(selectedOrder.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('orders.view.deleteOrder')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orders.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders.delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('orders.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('orders.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Orders;
