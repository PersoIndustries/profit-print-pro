import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Package, 
  ShoppingCart, 
  FileText,
  DollarSign,
  Activity,
  BarChart3,
  Calendar,
  Settings,
  RefreshCw,
  Download,
  Table as TableIcon
} from "lucide-react";

interface MetricsData {
  // Usuarios
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsers: number; // Usuarios que han usado la app en los últimos 30 días
  activeUsersByTier: {
    free: number;
    tier_1: number;
    tier_2: number;
  };
  newUsersByTier: {
    free: number;
    tier_1: number;
    tier_2: number;
  };
  
  // Suscripciones
  activeSubscriptionsByTier: {
    free: number;
    tier_1: number;
    tier_2: number;
  };
  totalCancellations: number; // Pro a Free
  totalDowngrades: number; // Business a Pro
  cancellationsToday: number;
  downgradesToday: number;
  
  // Actividad
  totalMaterials: number;
  materialsToday: number;
  totalProjects: number;
  projectsToday: number;
  totalOrders: number;
  ordersToday: number;
  totalPrints: number;
  printsToday: number;
  
  // Tiempo de uso (estimado basado en última actividad)
  averageSessionTime: number; // minutos
  totalActiveTime: number; // horas totales
  newUsersAverageTime: number; // minutos promedio para nuevos usuarios
  
  // Revenue (si aplica)
  totalRevenue: number;
  revenueThisMonth: number;
  
  // Grace Period & Trials
  usersInGracePeriod: number;
  usersInTrial: number;
  usersInTrialByTier: {
    free: number;
    tier_1: number;
    tier_2: number;
  };
  
  // Conversion Ratios
  trialToPaidConversion: number; // %
  freeToPaidConversion: number; // %
  newUserRetentionRate: number; // % usuarios nuevos que siguen activos después de 30 días
  churnRate: number; // % usuarios que cancelaron
}

const AdminMetricsDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [showTable, setShowTable] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    
    if (!user) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        navigate("/auth");
      }
      return;
    }
    
    if (!isAdmin) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        navigate("/dashboard");
      }
      return;
    }
    
    if (isAdmin && !adminLoading && !authLoading) {
      fetchMetrics();
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate, dateRange]);

  const calculateTodayMetrics = async () => {
    try {
      // Calculate and store today's metrics
      const { error } = await supabase.rpc('calculate_daily_metrics', {
        p_date: new Date().toISOString().split('T')[0]
      });
      if (error) {
        console.error('Error calculating today metrics:', error);
      }
    } catch (error) {
      console.error('Error calculating today metrics:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now);
      monthStart.setDate(monthStart.getDate() - 30);
      monthStart.setHours(0, 0, 0, 0);
      
      // Fetch all users
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, created_at');
      
      // Fetch subscriptions
      const { data: allSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id, tier, status, created_at, previous_tier, downgrade_date, expires_at, grace_period_end');
      
      // Fetch materials
      const { data: allMaterials } = await supabase
        .from('materials')
        .select('id, user_id, created_at');
      
      // Fetch projects
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, user_id, created_at');
      
      // Fetch orders
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, user_id, created_at, total_amount');
      
      // Fetch prints
      const { data: allPrints } = await supabase
        .from('prints')
        .select('id, user_id, created_at');
      
      // Calculate metrics
      const totalUsers = allProfiles?.length || 0;
      
      // New users
      const newUsersToday = allProfiles?.filter(p => 
        new Date(p.created_at) >= todayStart
      ).length || 0;
      
      const newUsersThisWeek = allProfiles?.filter(p => 
        new Date(p.created_at) >= weekStart
      ).length || 0;
      
      const newUsersThisMonth = allProfiles?.filter(p => 
        new Date(p.created_at) >= monthStart
      ).length || 0;
      
      // Active users (users with activity in last 30 days)
      const activeUserIds = new Set<string>();
      [...(allMaterials || []), ...(allProjects || []), ...(allOrders || [])].forEach(item => {
        if (item.created_at && new Date(item.created_at) >= monthStart) {
          activeUserIds.add(item.user_id);
        }
      });
      const activeUsers = activeUserIds.size;
      
      // Users by tier
      const activeSubscriptionsByTier = {
        free: allSubscriptions?.filter(s => s.tier === 'free' && s.status === 'active').length || 0,
        tier_1: allSubscriptions?.filter(s => s.tier === 'tier_1' && s.status === 'active').length || 0,
        tier_2: allSubscriptions?.filter(s => s.tier === 'tier_2' && s.status === 'active').length || 0,
      };
      
      // New users by tier (this month)
      const newUsersThisMonthList = allProfiles?.filter(p => 
        new Date(p.created_at) >= monthStart
      ) || [];
      
      const newUsersByTier = {
        free: 0,
        tier_1: 0,
        tier_2: 0,
      };
      
      newUsersThisMonthList.forEach(profile => {
        const sub = allSubscriptions?.find(s => s.user_id === profile.id);
        const tier = sub?.tier || 'free';
        newUsersByTier[tier as keyof typeof newUsersByTier]++;
      });
      
      // Active users by tier
      const activeUsersByTier = {
        free: 0,
        tier_1: 0,
        tier_2: 0,
      };
      
      activeUserIds.forEach(userId => {
        const sub = allSubscriptions?.find(s => s.user_id === userId);
        const tier = sub?.tier || 'free';
        activeUsersByTier[tier as keyof typeof activeUsersByTier]++;
      });
      
      // Cancellations and downgrades
      const cancellations = allSubscriptions?.filter(s => 
        s.previous_tier === 'tier_1' && s.tier === 'free' && s.downgrade_date
      ) || [];
      
      const downgrades = allSubscriptions?.filter(s => 
        s.previous_tier === 'tier_2' && s.tier === 'tier_1' && s.downgrade_date
      ) || [];
      
      const totalCancellations = cancellations.length;
      const totalDowngrades = downgrades.length;
      
      const cancellationsToday = cancellations.filter(c => 
        c.downgrade_date && new Date(c.downgrade_date) >= todayStart
      ).length;
      
      const downgradesToday = downgrades.filter(d => 
        d.downgrade_date && new Date(d.downgrade_date) >= todayStart
      ).length;
      
      // Materials
      const totalMaterials = allMaterials?.length || 0;
      const materialsToday = allMaterials?.filter(m => 
        new Date(m.created_at) >= todayStart
      ).length || 0;
      
      // Projects
      const totalProjects = allProjects?.length || 0;
      const projectsToday = allProjects?.filter(p => 
        new Date(p.created_at) >= todayStart
      ).length || 0;
      
      // Orders
      const totalOrders = allOrders?.length || 0;
      const ordersToday = allOrders?.filter(o => 
        new Date(o.created_at) >= todayStart
      ).length || 0;
      
      // Prints
      const totalPrints = allPrints?.length || 0;
      const printsToday = allPrints?.filter(p => 
        new Date(p.created_at) >= todayStart
      ).length || 0;
      
      // Revenue (from orders - this is revenue from users' orders, not subscription revenue)
      // Note: This represents revenue from user orders (e.g., print orders), not subscription payments
      const totalRevenue = allOrders?.reduce((sum, o) => 
        sum + (parseFloat(o.total_amount?.toString() || '0') || 0), 0
      ) || 0;
      
      const revenueThisMonth = allOrders?.filter(o => 
        new Date(o.created_at) >= monthStart
      ).reduce((sum, o) => 
        sum + (parseFloat(o.total_amount?.toString() || '0') || 0), 0
      ) || 0;
      
      // Grace Period Users
      const usersInGracePeriod = allSubscriptions?.filter(s => 
        s.grace_period_end && new Date(s.grace_period_end) > new Date()
      ).length || 0;
      
      // Trial Users
      const usersInTrial = allSubscriptions?.filter(s => 
        s.status === 'trial' && s.expires_at && new Date(s.expires_at) > new Date()
      ).length || 0;
      
      const usersInTrialByTier = {
        free: allSubscriptions?.filter(s => 
          s.status === 'trial' && s.tier === 'free' && s.expires_at && new Date(s.expires_at) > new Date()
        ).length || 0,
        tier_1: allSubscriptions?.filter(s => 
          s.status === 'trial' && s.tier === 'tier_1' && s.expires_at && new Date(s.expires_at) > new Date()
        ).length || 0,
        tier_2: allSubscriptions?.filter(s => 
          s.status === 'trial' && s.tier === 'tier_2' && s.expires_at && new Date(s.expires_at) > new Date()
        ).length || 0,
      };
      
      // Conversion Ratios
      // Trial to Paid: usuarios que tuvieron trial y ahora tienen status 'active'
      const usersWhoHadTrial = allSubscriptions?.filter(s => 
        s.status === 'active' && s.previous_tier // Asumiendo que previous_tier indica que tuvo trial
      ).length || 0;
      
      const totalTrialsEver = allSubscriptions?.filter(s => 
        s.status === 'trial' || (s.status === 'active' && s.previous_tier)
      ).length || 0;
      
      const trialToPaidConversion = totalTrialsEver > 0 
        ? Math.round((usersWhoHadTrial / totalTrialsEver) * 100) 
        : 0;
      
      // Free to Paid: usuarios que empezaron en free y ahora están en tier_1 o tier_2
      const freeToPaidUsers = allSubscriptions?.filter(s => 
        (s.tier === 'tier_1' || s.tier === 'tier_2') && s.status === 'active'
      ).length || 0;
      
      const totalFreeUsers = allSubscriptions?.filter(s => 
        s.tier === 'free'
      ).length || 0;
      
      const freeToPaidConversion = totalFreeUsers > 0 
        ? Math.round((freeToPaidUsers / totalFreeUsers) * 100) 
        : 0;
      
      // New User Retention: usuarios nuevos del mes pasado que siguen activos
      const lastMonthStart = new Date(now);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      
      const newUsersLastMonth = allProfiles?.filter(p => {
        const created = new Date(p.created_at);
        return created >= lastMonthStart && created < monthStart;
      }) || [];
      
      const newUsersLastMonthIds = new Set(newUsersLastMonth.map(u => u.id));
      const stillActiveFromLastMonth = Array.from(activeUserIds).filter(id => 
        newUsersLastMonthIds.has(id)
      ).length;
      
      const newUserRetentionRate = newUsersLastMonth.length > 0
        ? Math.round((stillActiveFromLastMonth / newUsersLastMonth.length) * 100)
        : 0;
      
      // Churn Rate: % de usuarios que cancelaron
      const cancelledUsers = allSubscriptions?.filter(s => 
        s.status === 'cancelled'
      ).length || 0;
      
      const churnRate = totalUsers > 0
        ? Math.round((cancelledUsers / totalUsers) * 100)
        : 0;
      
      // Get actual session time from user_activity_summary if available
      // Otherwise fall back to estimation
      let averageSessionTime = 0;
      let totalActiveTime = 0;
      let newUsersAverageTime = 0;

      try {
        const { data: activitySummary } = await supabase
          .from('user_activity_summary')
          .select('user_id, total_minutes, activity_date')
          .gte('activity_date', monthStart.toISOString().split('T')[0]);

        if (activitySummary && activitySummary.length > 0) {
          // Calculate from actual data
          const totalMinutes = activitySummary.reduce((sum, a) => sum + (a.total_minutes || 0), 0);
          const uniqueUsers = new Set(activitySummary.map(a => a.user_id)).size;
          
          averageSessionTime = uniqueUsers > 0 ? Math.round(totalMinutes / uniqueUsers) : 0;
          totalActiveTime = Math.round(totalMinutes / 60);

          // New users average time
          const newUsersActivityData = activitySummary.filter(a => 
            newUsersThisMonthList.some(u => u.id === a.user_id)
          );
          const newUsersTotalMinutes = newUsersActivityData.reduce((sum, a) => sum + (a.total_minutes || 0), 0);
          newUsersAverageTime = newUsersThisMonthList.length > 0
            ? Math.round(newUsersTotalMinutes / newUsersThisMonthList.length)
            : 0;
        } else {
          // Fallback to estimation if no activity data
          const userActivityCount = new Map<string, number>();
          [...(allMaterials || []), ...(allProjects || []), ...(allOrders || [])].forEach(item => {
            const count = userActivityCount.get(item.user_id) || 0;
            userActivityCount.set(item.user_id, count + 1);
          });
          
          const averageActivityPerUser = activeUsers > 0 
            ? Array.from(userActivityCount.values()).reduce((a, b) => a + b, 0) / activeUsers 
            : 0;
          
          // Estimate: each activity item = ~5 minutes of usage
          averageSessionTime = Math.round(averageActivityPerUser * 5);
          totalActiveTime = Math.round(
            Array.from(userActivityCount.values()).reduce((a, b) => a + b, 0) * 5 / 60
          );
          
          // New users average time
          const newUsersActivity = new Map<string, number>();
          newUsersThisMonthList.forEach(profile => {
            const activity = [...(allMaterials || []), ...(allProjects || []), ...(allOrders || [])]
              .filter(item => item.user_id === profile.id).length;
            newUsersActivity.set(profile.id, activity);
          });
          
          newUsersAverageTime = newUsersThisMonthList.length > 0
            ? Math.round(
                Array.from(newUsersActivity.values()).reduce((a, b) => a + b, 0) / newUsersThisMonthList.length * 5
              )
            : 0;
        }
      } catch (error) {
        console.error('Error fetching activity summary, using estimation:', error);
        // Use estimation as fallback
        const userActivityCount = new Map<string, number>();
        [...(allMaterials || []), ...(allProjects || []), ...(allOrders || [])].forEach(item => {
          const count = userActivityCount.get(item.user_id) || 0;
          userActivityCount.set(item.user_id, count + 1);
        });
        
        const averageActivityPerUser = activeUsers > 0 
          ? Array.from(userActivityCount.values()).reduce((a, b) => a + b, 0) / activeUsers 
          : 0;
        
        averageSessionTime = Math.round(averageActivityPerUser * 5);
        totalActiveTime = Math.round(
          Array.from(userActivityCount.values()).reduce((a, b) => a + b, 0) * 5 / 60
        );
        newUsersAverageTime = 0;
      }
      
      setMetrics({
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        activeUsers,
        activeUsersByTier,
        newUsersByTier,
        activeSubscriptionsByTier,
        totalCancellations,
        totalDowngrades,
        cancellationsToday,
        downgradesToday,
        totalMaterials,
        materialsToday,
        totalProjects,
        projectsToday,
        totalOrders,
        ordersToday,
        totalPrints,
        printsToday,
        averageSessionTime,
        totalActiveTime,
        newUsersAverageTime,
        totalRevenue,
        revenueThisMonth,
        usersInGracePeriod,
        usersInTrial,
        usersInTrialByTier,
        trialToPaidConversion,
        freeToPaidConversion,
        newUserRetentionRate,
        churnRate,
      });

      // Fetch daily metrics for table and charts
      await fetchDailyMetrics();
      
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Error loading metrics");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyMetrics = async () => {
    // First, try to get from daily_metrics table
    try {
      const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Fetch from daily_metrics table
      const { data: storedMetrics, error: storedError } = await supabase
        .from('daily_metrics')
        .select('*')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });
      
      if (!storedError && storedMetrics && storedMetrics.length > 0) {
        // Convert stored metrics to the format expected by the component
        const formattedMetrics = storedMetrics.map(m => ({
          date: m.metric_date,
          newUsers: m.new_users,
          newSubscriptions: {
            free: m.new_subscriptions_free,
            tier_1: m.new_subscriptions_tier_1,
            tier_2: m.new_subscriptions_tier_2
          },
          cancellations: m.cancellations,
          downgrades: m.downgrades,
          materials: m.materials_created,
          projects: m.projects_created,
          orders: m.orders_created,
          revenue: parseFloat(m.revenue?.toString() || '0')
        }));
        
        setDailyMetrics(formattedMetrics);
        return;
      }
    } catch (error) {
      console.error('Error fetching stored daily metrics:', error);
    }
    
    // Fallback to calculating on the fly if no stored data
    try {
    try {
      const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Fetch daily aggregated data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id, tier, status, created_at, previous_tier, downgrade_date')
        .gte('created_at', startDate.toISOString());

      const { data: materials } = await supabase
        .from('materials')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      const { data: projects } = await supabase
        .from('projects')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, total_amount')
        .gte('created_at', startDate.toISOString());

      // Group by date
      const dailyData = new Map<string, any>();

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData.set(dateStr, {
          date: dateStr,
          newUsers: 0,
          newSubscriptions: { free: 0, tier_1: 0, tier_2: 0 },
          cancellations: 0,
          downgrades: 0,
          materials: 0,
          projects: 0,
          orders: 0,
          revenue: 0,
        });
      }

      // Aggregate data
      profiles?.forEach(p => {
        const dateStr = new Date(p.created_at).toISOString().split('T')[0];
        const day = dailyData.get(dateStr);
        if (day) day.newUsers++;
      });

      subscriptions?.forEach(s => {
        const dateStr = new Date(s.created_at).toISOString().split('T')[0];
        const day = dailyData.get(dateStr);
        if (day) {
          day.newSubscriptions[s.tier as 'free' | 'tier_1' | 'tier_2']++;
          if (s.previous_tier === 'tier_1' && s.tier === 'free' && s.downgrade_date) {
            day.cancellations++;
          }
          if (s.previous_tier === 'tier_2' && s.tier === 'tier_1' && s.downgrade_date) {
            day.downgrades++;
          }
        }
      });

      materials?.forEach(m => {
        const dateStr = new Date(m.created_at).toISOString().split('T')[0];
        const day = dailyData.get(dateStr);
        if (day) day.materials++;
      });

      projects?.forEach(p => {
        const dateStr = new Date(p.created_at).toISOString().split('T')[0];
        const day = dailyData.get(dateStr);
        if (day) day.projects++;
      });

      orders?.forEach(o => {
        const dateStr = new Date(o.created_at).toISOString().split('T')[0];
        const day = dailyData.get(dateStr);
        if (day) {
          day.orders++;
          day.revenue += parseFloat(o.total_amount?.toString() || '0') || 0;
        }
      });

      setDailyMetrics(Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
    }
  };

  const exportMetrics = () => {
    if (!metrics || !dailyMetrics.length) {
      toast.error('No metrics to export');
      return;
    }

    // Create CSV content
    const csvRows = [];
    
    // Summary metrics
    csvRows.push('Metric,Value');
    csvRows.push(`Total Users,${metrics.totalUsers}`);
    csvRows.push(`New Users Today,${metrics.newUsersToday}`);
    csvRows.push(`New Users This Week,${metrics.newUsersThisWeek}`);
    csvRows.push(`New Users This Month,${metrics.newUsersThisMonth}`);
    csvRows.push(`Active Users,${metrics.activeUsers}`);
    csvRows.push(`Total Revenue,${metrics.totalRevenue}`);
    csvRows.push(`Revenue This Month,${metrics.revenueThisMonth}`);
    csvRows.push('');
    
    // Daily metrics
    csvRows.push('Date,New Users,New Subscriptions Free,New Subscriptions Pro,New Subscriptions Business,Cancellations,Downgrades,Materials,Projects,Orders,Revenue');
    dailyMetrics.forEach(day => {
      csvRows.push([
        day.date,
        day.newUsers,
        day.newSubscriptions.free,
        day.newSubscriptions.tier_1,
        day.newSubscriptions.tier_2,
        day.cancellations,
        day.downgrades,
        day.materials,
        day.projects,
        day.orders,
        day.revenue.toFixed(2)
      ].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metrics-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Metrics exported successfully');
  };

  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Métricas y Estadísticas</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Subscription Limits
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/grace-period')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Grace Period
          </Button>
          <Button
            variant="default"
            onClick={() => navigate('/admin/metrics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </Button>
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowTable(!showTable)}>
            <TableIcon className="h-4 w-4 mr-2" />
            {showTable ? 'Hide' : 'Show'} Table
          </Button>
          <Button variant="outline" onClick={exportMetrics} disabled={!metrics || !dailyMetrics.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Daily Metrics Table */}
      {showTable && dailyMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Metrics Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>New Users</TableHead>
                    <TableHead>New Subs (Free)</TableHead>
                    <TableHead>New Subs (Pro)</TableHead>
                    <TableHead>New Subs (Business)</TableHead>
                    <TableHead>Cancellations</TableHead>
                    <TableHead>Downgrades</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyMetrics.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                      <TableCell>{day.newUsers}</TableCell>
                      <TableCell>{day.newSubscriptions.free}</TableCell>
                      <TableCell>{day.newSubscriptions.tier_1}</TableCell>
                      <TableCell>{day.newSubscriptions.tier_2}</TableCell>
                      <TableCell>{day.cancellations}</TableCell>
                      <TableCell>{day.downgrades}</TableCell>
                      <TableCell>{day.materials}</TableCell>
                      <TableCell>{day.projects}</TableCell>
                      <TableCell>{day.orders}</TableCell>
                      <TableCell>€{day.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Charts using CSS bars */}
      {dailyMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>New Users Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dailyMetrics.slice(-14).map((day) => {
                  const max = Math.max(...dailyMetrics.map(d => d.newUsers), 1);
                  const height = (day.newUsers / max) * 100;
                  return (
                    <div key={day.date} className="flex items-end gap-2">
                      <div className="text-xs w-16 text-right">{new Date(day.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
                      <div className="flex-1 bg-muted rounded h-8 relative">
                        <div 
                          className="bg-primary rounded h-full transition-all"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold">{day.newUsers}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New Subscriptions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dailyMetrics.slice(-14).map((day) => {
                  const total = day.newSubscriptions.free + day.newSubscriptions.tier_1 + day.newSubscriptions.tier_2;
                  const max = Math.max(...dailyMetrics.map(d => d.newSubscriptions.free + d.newSubscriptions.tier_1 + d.newSubscriptions.tier_2), 1);
                  const height = (total / max) * 100;
                  return (
                    <div key={day.date} className="flex items-end gap-2">
                      <div className="text-xs w-16 text-right">{new Date(day.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
                      <div className="flex-1 bg-muted rounded h-8 relative">
                        <div 
                          className="bg-primary rounded h-full transition-all"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold">{total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.newUsersToday} nuevos hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.newUsersThisWeek} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelaciones</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCancellations}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.cancellationsToday} hoy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users by Tier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suscripciones Activas por Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Free</span>
              <Badge variant="outline">{metrics.activeSubscriptionsByTier.free}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Professional</span>
              <Badge variant="default">{metrics.activeSubscriptionsByTier.tier_1}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Business</span>
              <Badge className="bg-purple-500">{metrics.activeSubscriptionsByTier.tier_2}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuarios Activos por Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Free</span>
              <Badge variant="outline">{metrics.activeUsersByTier.free}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Professional</span>
              <Badge variant="default">{metrics.activeUsersByTier.tier_1}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Business</span>
              <Badge className="bg-purple-500">{metrics.activeUsersByTier.tier_2}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuevos Usuarios por Plan (Este Mes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Free</span>
              <Badge variant="outline">{metrics.newUsersByTier.free}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Professional</span>
              <Badge variant="default">{metrics.newUsersByTier.tier_1}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Business</span>
              <Badge className="bg-purple-500">{metrics.newUsersByTier.tier_2}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.materialsToday} creados hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.projectsToday} creados hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.ordersToday} hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impresiones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPrints}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.printsToday} hoy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Time & Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tiempo de Uso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Tiempo Total Activo</span>
              <Badge variant="outline">{metrics.totalActiveTime} horas</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Promedio por Usuario Activo</span>
              <Badge variant="outline">{metrics.averageSessionTime} min</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Promedio Nuevos Usuarios</span>
              <Badge variant="outline">{metrics.newUsersAverageTime} min</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue (Orders)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Revenue</span>
              <Badge variant="outline">€{metrics.totalRevenue.toFixed(2)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Este Mes</span>
              <Badge variant="default">€{metrics.revenueThisMonth.toFixed(2)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Revenue from user orders (e.g., print orders), not subscription payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grace Period & Trials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Grace Period & Trials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Usuarios en Grace Period</span>
              <Badge variant="outline">{metrics.usersInGracePeriod}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Usuarios en Trial</span>
              <Badge variant="default">{metrics.usersInTrial}</Badge>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Trials por Plan:</p>
              <div className="flex justify-between items-center">
                <span className="text-sm">Free</span>
                <Badge variant="outline">{metrics.usersInTrialByTier.free}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Professional</span>
                <Badge variant="default">{metrics.usersInTrialByTier.tier_1}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Business</span>
                <Badge className="bg-purple-500">{metrics.usersInTrialByTier.tier_2}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ratios de Conversión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Trial → Pagado</span>
              <Badge variant={metrics.trialToPaidConversion >= 20 ? "default" : "outline"}>
                {metrics.trialToPaidConversion}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Free → Pagado</span>
              <Badge variant={metrics.freeToPaidConversion >= 10 ? "default" : "outline"}>
                {metrics.freeToPaidConversion}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Retención Nuevos Usuarios</span>
              <Badge variant={metrics.newUserRetentionRate >= 50 ? "default" : "outline"}>
                {metrics.newUserRetentionRate}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Churn Rate</span>
              <Badge variant={metrics.churnRate <= 5 ? "default" : "destructive"}>
                {metrics.churnRate}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancellations & Downgrades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cancelaciones y Downgrades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Total Cancelaciones (Pro → Free)</span>
                <Badge variant="destructive">{metrics.totalCancellations}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Cancelaciones Hoy</span>
                <Badge variant="outline">{metrics.cancellationsToday}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Total Downgrades (Business → Pro)</span>
                <Badge variant="default">{metrics.totalDowngrades}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Downgrades Hoy</span>
                <Badge variant="outline">{metrics.downgradesToday}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMetricsDashboard;

