import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Printer, TrendingUp, DollarSign, Calculator as CalculatorIcon } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalMaterials: 0,
    totalRevenue: 0,
    avgProjectCost: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const [projectsRes, materialsRes] = await Promise.all([
          supabase.from("projects").select("total_price").eq("user_id", user.id),
          supabase.from("materials").select("id").eq("user_id", user.id),
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (materialsRes.error) throw materialsRes.error;

        const projects = projectsRes.data || [];
        const totalRevenue = projects.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);
        const avgCost = projects.length > 0 ? totalRevenue / projects.length : 0;

        setStats({
          totalProjects: projects.length,
          totalMaterials: materialsRes.data?.length || 0,
          totalRevenue,
          avgProjectCost: avgCost,
        });
      } catch (error: any) {
        toast.error("Error al cargar estadísticas");
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Header variant="app" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h2>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalProjects')}</CardTitle>
              <Printer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.completedJobs')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.materialsCount')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMaterials}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.inInventory')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.fromAllProjects')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.avgPrice')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.avgProjectCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.perProject')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/calculator")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="w-5 h-5" />
                {t('dashboard.calculator')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('dashboard.calculatorDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/materials")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t('dashboard.manageMaterials')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('dashboard.manageMaterialsDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/projects")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                {t('dashboard.viewProjects')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('dashboard.viewProjectsDesc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
