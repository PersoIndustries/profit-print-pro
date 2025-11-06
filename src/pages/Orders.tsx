import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Package } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  notes: string;
  order_date: string;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
}

const Orders = () => {
  const { user } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    customer_email: '',
    project_id: '',
    total_amount: '',
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrders();
    fetchProjects();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user?.id)
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

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user?.id);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subscription?.canAdd.orders) {
      toast.error(t('orders.limitReached'));
      return;
    }

    try {
      const { error } = await supabase.from("orders").insert([
        {
          user_id: user?.id,
          order_number: formData.order_number,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          project_id: formData.project_id || null,
          total_amount: parseFloat(formData.total_amount),
          status: formData.status,
          notes: formData.notes
        }
      ]);

      if (error) throw error;

      toast.success("Order created successfully");
      setFormData({
        order_number: '',
        customer_name: '',
        customer_email: '',
        project_id: '',
        total_amount: '',
        status: 'pending',
        notes: ''
      });
      setShowForm(false);
      fetchOrders();
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "Error creating order");
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Print3D Manager</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              {t('nav.dashboard')}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/materials")}>
              {t('nav.materials')}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/projects")}>
              {t('nav.projects')}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">{t('orders.title')}</h2>
            <p className="text-muted-foreground">
              {t('orders.thisMonth')}: {monthlyCount} / {subscription?.limits.monthlyOrders}
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)} 
            disabled={!subscription?.canAdd.orders}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('orders.add')}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('orders.add')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order_number">{t('orders.orderNumber')}</Label>
                    <Input
                      id="order_number"
                      value={formData.order_number}
                      onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">{t('orders.status')}</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('orders.statuses.pending')}</SelectItem>
                        <SelectItem value="inProgress">{t('orders.statuses.inProgress')}</SelectItem>
                        <SelectItem value="completed">{t('orders.statuses.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('orders.statuses.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="customer_name">{t('orders.customerName')}</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_email">{t('orders.customerEmail')}</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project">{t('orders.project')}</Label>
                    <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('orders.selectProject')} />
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
                    <Label htmlFor="total_amount">{t('orders.amount')} (€)</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">{t('orders.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{t('orders.save')}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    {t('orders.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('orders.empty')}</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{order.order_number}</CardTitle>
                      <CardDescription>
                        {new Date(order.order_date).toLocaleDateString()} - {t(`orders.statuses.${order.status}`)}
                      </CardDescription>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(order.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
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
                    {order.notes && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">{t('orders.notes')}</p>
                        <p>{order.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
