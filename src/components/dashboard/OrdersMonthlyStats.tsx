import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, CheckCircle, TrendingUp } from "lucide-react";

interface OrdersMonthlyStatsProps {
  userId: string;
}

export function OrdersMonthlyStats({ userId }: OrdersMonthlyStatsProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    fetchOrdersStats();
  }, [userId]);

  const fetchOrdersStats = async () => {
    try {
      // Get all orders with their items
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          order_date,
          order_items(
            id,
            status,
            total_price,
            project_id,
            projects(material_cost, labor_cost, electricity_cost)
          )
        `)
        .eq("user_id", userId);

      if (ordersError) throw ordersError;

      // Calculate current month stats
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let monthCompleted = 0;
      let monthCost = 0;
      let monthIncome = 0;

      orders?.forEach(order => {
        const orderDate = new Date(order.order_date);
        const isCurrentMonth = orderDate >= currentMonthStart;

        if (isCurrentMonth) {
          // Count completed orders (all items must be sent)
          const allItemsSent = order.order_items?.every(item => item.status === 'sent');
          if (allItemsSent && order.order_items?.length > 0) {
            monthCompleted++;
          }

          // Calculate costs (from projects)
          order.order_items?.forEach(item => {
            if (item.projects) {
              const projectCost = 
                (Number(item.projects.material_cost) || 0) +
                (Number(item.projects.labor_cost) || 0) +
                (Number(item.projects.electricity_cost) || 0);
              monthCost += projectCost;
            }
          });

          // Income is the total amount
          monthIncome += Number(order.total_amount) || 0;
        }
      });

      setCompletedOrders(monthCompleted);
      setTotalCost(monthCost);
      setTotalIncome(monthIncome);

      // Monthly data (last 6 months)
      const monthlyMap: Record<string, { income: number; cost: number; profit: number; completed: number }> = {};
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toISOString().slice(0, 7);
        monthlyMap[key] = { income: 0, cost: 0, profit: 0, completed: 0 };
      }

      orders?.forEach(order => {
        const key = order.order_date.slice(0, 7);
        if (monthlyMap[key]) {
          const allItemsSent = order.order_items?.every(item => item.status === 'sent');
          if (allItemsSent && order.order_items?.length > 0) {
            monthlyMap[key].completed++;
          }

          let orderCost = 0;
          order.order_items?.forEach(item => {
            if (item.projects) {
              const projectCost = 
                (Number(item.projects.material_cost) || 0) +
                (Number(item.projects.labor_cost) || 0) +
                (Number(item.projects.electricity_cost) || 0);
              orderCost += projectCost;
            }
          });

          monthlyMap[key].income += Number(order.total_amount) || 0;
          monthlyMap[key].cost += orderCost;
          monthlyMap[key].profit = monthlyMap[key].income - monthlyMap[key].cost;
        }
      });

      const locale = i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
      const monthlyArray = Object.entries(monthlyMap).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
        [t('dashboard.stats.financial.revenue')]: Math.round(data.income * 100) / 100,
        [t('dashboard.stats.financial.costs')]: Math.round(data.cost * 100) / 100,
        [t('dashboard.stats.financial.profit')]: Math.round(data.profit * 100) / 100,
        [t('dashboard.stats.financial.completed')]: data.completed
      }));

      setMonthlyData(monthlyArray);

    } catch (error) {
      console.error("Error fetching orders stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="py-12">
              <div className="animate-pulse h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const profit = totalIncome - totalCost;
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.financial.completedOrdersMonth')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.financial.sentThisMonth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.financial.monthlyRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.financial.totalBilledThisMonth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.financial.monthlyCosts')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.financial.materialLaborElectricity')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.financial.netProfit')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.financial.margin')}: {profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.stats.financial.revenueVsCosts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey={t('dashboard.stats.financial.revenue')} fill="#10b981" />
                <Bar dataKey={t('dashboard.stats.financial.costs')} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.stats.financial.monthlyProfit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey={t('dashboard.stats.financial.profit')} stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey={t('dashboard.stats.financial.completed')} stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
