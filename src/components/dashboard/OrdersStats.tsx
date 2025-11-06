import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, TrendingUp, DollarSign, Package } from "lucide-react";
import { SubscriptionTier } from "@/hooks/useSubscription";

interface OrdersStatsProps {
  userId: string;
  tier: SubscriptionTier;
  metricsHistory: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'quarter';

interface OrderStats {
  total: number;
  completed: number;
  revenue: number;
  avgOrderValue: number;
}

export const OrdersStats = ({ userId, tier, metricsHistory }: OrdersStatsProps) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    completed: 0,
    revenue: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(true);

  // Determine available filters based on tier
  const availableFilters: TimeFilter[] = tier === 'tier_1' 
    ? ['today', 'week', 'month'] 
    : ['today', 'week', 'month', 'quarter'];

  useEffect(() => {
    fetchStats();
  }, [userId, timeFilter]);

  const getDateFilter = () => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
    }

    return startDate.toISOString();
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startDate = getDateFilter();
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .gte('order_date', startDate);

      if (error) throw error;

      const completedOrders = orders?.filter(o => o.status === 'completed') || [];
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      setStats({
        total: orders?.length || 0,
        completed: completedOrders.length,
        revenue: totalRevenue,
        avgOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0
      });
    } catch (error) {
      console.error('Error fetching order stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case 'today': return 'Hoy';
      case 'week': return 'Semana';
      case 'month': return 'Mes';
      case 'quarter': return '3 Meses';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estadísticas de Pedidos</h2>
          <p className="text-muted-foreground">
            Rendimiento de tu negocio en el período seleccionado
          </p>
        </div>
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <TabsList>
            {availableFilters.map(filter => (
              <TabsTrigger key={filter} value={filter}>
                {getFilterLabel(filter)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Todos los estados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}% del total` : 'Sin pedidos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `€${stats.revenue.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              De pedidos completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `€${stats.avgOrderValue.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Por pedido completado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan {tier === 'tier_1' ? 'Profesional' : 'Enterprise'}</CardTitle>
          <CardDescription>
            Historial disponible: {metricsHistory} días
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
