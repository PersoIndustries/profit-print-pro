import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Clock, Package2, Activity } from "lucide-react";

interface PrintsStatsProps {
  userId: string;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

const PRINT_TYPE_LABELS = {
  order: 'Pedidos',
  tools: 'Herramientas',
  personal: 'Personal',
  operational: 'Operativa'
};

export function PrintsStats({ userId }: PrintsStatsProps) {
  const [loading, setLoading] = useState(true);
  const [totalPrintTime, setTotalPrintTime] = useState(0);
  const [totalMaterial, setTotalMaterial] = useState(0);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [topMaterials, setTopMaterials] = useState<any[]>([]);

  useEffect(() => {
    fetchPrintsStats();
  }, [userId]);

  const fetchPrintsStats = async () => {
    try {
      const { data: prints, error } = await supabase
        .from("prints")
        .select("id, print_time_hours, material_used_grams, print_type, print_date")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (error) throw error;

      // Fetch material usage with print_id join
      const { data: printMaterials, error: materialsError } = await supabase
        .from("print_materials")
        .select(`
          weight_grams,
          print_id,
          materials (name)
        `);

      if (!materialsError && printMaterials && prints) {
        const printIds = prints.map(p => p.id);
        const relevantMaterials = printMaterials.filter((pm: any) => printIds.includes(pm.print_id));
        
        const materialMap: Record<string, number> = {};
        relevantMaterials.forEach((pm: any) => {
          const name = pm.materials?.name || "Desconocido";
          materialMap[name] = (materialMap[name] || 0) + Number(pm.weight_grams);
        });

        const topMats = Object.entries(materialMap)
          .map(([name, grams]) => ({ name, grams }))
          .sort((a, b) => b.grams - a.grams)
          .slice(0, 5);

        setTopMaterials(topMats);
      }

      // Total time and material
      const totalTime = prints?.reduce((sum, p) => sum + Number(p.print_time_hours), 0) || 0;
      const totalMat = prints?.reduce((sum, p) => sum + Number(p.material_used_grams), 0) || 0;
      
      setTotalPrintTime(totalTime);
      setTotalMaterial(totalMat);

      // Monthly data (last 6 months)
      const monthlyMap: Record<string, { time: number; material: number }> = {};
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toISOString().slice(0, 7);
        monthlyMap[key] = { time: 0, material: 0 };
      }

      prints?.forEach(print => {
        const key = print.print_date.slice(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].time += Number(print.print_time_hours);
          monthlyMap[key].material += Number(print.material_used_grams) / 1000; // Convert to kg
        }
      });

      const monthlyArray = Object.entries(monthlyMap).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        'Tiempo (h)': Math.round(data.time * 10) / 10,
        'Material (kg)': Math.round(data.material * 100) / 100
      }));

      setMonthlyData(monthlyArray);

      // Type distribution
      const typeMap: Record<string, number> = {};
      prints?.forEach(print => {
        typeMap[print.print_type] = (typeMap[print.print_type] || 0) + 1;
      });

      const typeArray = Object.entries(typeMap).map(([type, count]) => ({
        name: PRINT_TYPE_LABELS[type as keyof typeof PRINT_TYPE_LABELS] || type,
        value: count
      }));

      setTypeData(typeArray);

    } catch (error) {
      console.error("Error fetching prints stats:", error);
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tiempo Total de Impresión
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrintTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Todas las impresiones completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Material Total Usado
            </CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalMaterial / 1000).toFixed(2)}kg</div>
            <p className="text-xs text-muted-foreground">
              {totalMaterial.toFixed(0)}g en total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tipo Más Común
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeData.length > 0 ? typeData.reduce((a, b) => a.value > b.value ? a : b).name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {typeData.length > 0 ? `${typeData.reduce((a, b) => a.value > b.value ? a : b).value} impresiones` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Impresiones por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="Tiempo (h)" fill="#8b5cf6" />
                <Bar yAxisId="right" dataKey="Material (kg)" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Materials */}
      {topMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Materiales Más Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMaterials.map((mat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <span className="font-medium">{mat.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{(mat.grams / 1000).toFixed(2)} kg</div>
                    <div className="text-xs text-muted-foreground">{mat.grams.toFixed(0)}g</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
