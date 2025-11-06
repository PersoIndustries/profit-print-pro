import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Printer, TrendingUp, DollarSign, LogOut, Calculator as CalculatorIcon } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
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
      <nav className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Print3D Manager</h1>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate("/materials")}>
              Materiales
            </Button>
            <Button variant="ghost" onClick={() => navigate("/projects")}>
              Proyectos
            </Button>
            <Button variant="ghost" onClick={() => navigate("/calculator")}>
              Calculadora
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Resumen de tu negocio de impresión 3D
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proyectos</CardTitle>
              <Printer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                Trabajos completados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Materiales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMaterials}</div>
              <p className="text-xs text-muted-foreground">
                En inventario
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                De todos los proyectos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.avgProjectCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Por proyecto
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/calculator")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="w-5 h-5" />
                Calculadora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Calcula el precio de tus impresiones 3D
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/materials")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Gestionar Materiales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Añade y administra tus materiales
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/projects")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Ver Proyectos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Revisa todos tus proyectos guardados
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
