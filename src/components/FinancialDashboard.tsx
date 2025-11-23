import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MonthlyRevenue {
  month: string;
  free: number;
  tier_1: number;
  tier_2: number;
  total: number;
  promoLost: number; // Dinero perdido por códigos promocionales
}

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: MonthlyRevenue[];
  promoCodeLoss: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  refundedAmount: number;
}

export function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    fetchFinancialData();
  }, [selectedYear, selectedMonth]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Obtener todas las facturas pagadas
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("status", "paid")
        .order("paid_date", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Obtener facturas reembolsadas
      const { data: refundedInvoices, error: refundedError } = await supabase
        .from("invoices")
        .select("*")
        .eq("status", "refunded");

      if (refundedError) throw refundedError;

      // Obtener usuarios con códigos promocionales aplicados
      const { data: userPromoCodes, error: promoError } = await supabase
        .from("user_promo_codes")
        .select(`
          *,
          promo_code:promo_codes(*),
          user:profiles!user_promo_codes_user_id_fkey(id, email)
        `);

      if (promoError) throw promoError;

      // Calcular pérdidas por códigos promocionales
      // Para cada usuario con código promocional, calcular cuánto hubiéramos ganado
      let promoCodeLoss = 0;
      const tierPrices: { [key: string]: number } = {
        tier_1: 9.99, // Precio mensual PRO
        tier_2: 19.99, // Precio mensual BUSINESS
      };

      if (userPromoCodes) {
        for (const userPromo of userPromoCodes) {
          const promoCode = userPromo.promo_code;
          if (promoCode && promoCode.tier) {
            const tier = promoCode.tier as string;
            const price = tierPrices[tier] || 0;
            
              // Si el código da acceso gratuito, perdemos el precio completo
              // Si da descuento, perdemos el porcentaje del descuento
              if (price > 0) {
                // Asumimos que si tienen código promocional, no pagaron
                // Calculamos cuántos meses han usado el servicio
                const appliedDate = new Date(userPromo.applied_at);
                const monthsUsed = Math.max(1, Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                promoCodeLoss += price * monthsUsed;
              }
          }
        }
      }

      // Agrupar facturas por mes y tier
      const monthlyData: { [key: string]: MonthlyRevenue } = {};
      
      invoices?.forEach((invoice) => {
        if (!invoice.paid_date) return;
        
        const date = new Date(invoice.paid_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            free: 0,
            tier_1: 0,
            tier_2: 0,
            total: 0,
            promoLost: 0,
          };
        }

        const amount = Math.abs(Number(invoice.amount)); // Usar valor absoluto
        monthlyData[monthKey].total += amount;
        
        if (invoice.tier === "free") {
          monthlyData[monthKey].free += amount;
        } else if (invoice.tier === "tier_1") {
          monthlyData[monthKey].tier_1 += amount;
        } else if (invoice.tier === "tier_2") {
          monthlyData[monthKey].tier_2 += amount;
        }
      });

      // Calcular pérdidas por promocionales por mes
      if (userPromoCodes) {
        userPromoCodes.forEach((userPromo) => {
          const promoCode = userPromo.promo_code;
          if (promoCode && promoCode.tier) {
            const appliedDate = new Date(userPromo.applied_at);
            const monthKey = `${appliedDate.getFullYear()}-${String(appliedDate.getMonth() + 1).padStart(2, "0")}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthKey,
                free: 0,
                tier_1: 0,
                tier_2: 0,
                total: 0,
                promoLost: 0,
              };
            }

            const tier = promoCode.tier as string;
            const price = tierPrices[tier] || 0;
            if (price > 0) {
              monthlyData[monthKey].promoLost += price;
            }
          }
        });
      }

      let monthlyRevenue = Object.values(monthlyData)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12); // Últimos 12 meses

      // Si no hay datos, asegurar que al menos haya un mes (el actual) con valores en 0
      if (monthlyRevenue.length === 0) {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevenue = [{
          month: currentMonthKey,
          free: 0,
          tier_1: 0,
          tier_2: 0,
          total: 0,
          promoLost: 0,
        }];
      }

      const totalRevenue = invoices?.reduce((sum, inv) => sum + Math.abs(Number(inv.amount)), 0) || 0;
      const refundedAmount = refundedInvoices?.reduce((sum, inv) => sum + Math.abs(Number(inv.amount)), 0) || 0;

      setStats({
        totalRevenue,
        monthlyRevenue,
        promoCodeLoss,
        totalInvoices: invoices?.length || 0,
        paidInvoices: invoices?.length || 0,
        pendingInvoices: 0,
        refundedAmount,
      });
    } catch (error: any) {
      console.error("Error fetching financial data:", error);
      // En caso de error, establecer valores por defecto para que siempre se muestre el dashboard
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setStats({
        totalRevenue: 0,
        monthlyRevenue: [{
          month: currentMonthKey,
          free: 0,
          tier_1: 0,
          tier_2: 0,
          total: 0,
          promoLost: 0,
        }],
        promoCodeLoss: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        refundedAmount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  // Asegurar que stats siempre tenga valores por defecto
  const finalStats: FinancialStats = stats || (() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      totalRevenue: 0,
      monthlyRevenue: [{
        month: currentMonthKey,
        free: 0,
        tier_1: 0,
        tier_2: 0,
        total: 0,
        promoLost: 0,
      }],
      promoCodeLoss: 0,
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      refundedAmount: 0,
    };
  })();

  const currentMonthRevenue = finalStats.monthlyRevenue[finalStats.monthlyRevenue.length - 1] || {
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    free: 0,
    tier_1: 0,
    tier_2: 0,
    total: 0,
    promoLost: 0,
  };
  const previousMonthRevenue = finalStats.monthlyRevenue[finalStats.monthlyRevenue.length - 2];
  const monthOverMonthGrowth = previousMonthRevenue && previousMonthRevenue.total > 0
    ? ((currentMonthRevenue.total - previousMonthRevenue.total) / previousMonthRevenue.total) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Económico</h2>
          <p className="text-muted-foreground">Análisis de ingresos y pérdidas por códigos promocionales</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{finalStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Todos los tiempos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{currentMonthRevenue?.total.toFixed(2) || "0.00"}
            </div>
            <div className="flex items-center text-xs">
              {monthOverMonthGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={monthOverMonthGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(monthOverMonthGrowth).toFixed(1)}% vs mes anterior
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pérdidas por Promocionales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              €{finalStats.promoCodeLoss.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos potenciales perdidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pagadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalStats.paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {finalStats.refundedAmount > 0 && (
                <span className="text-red-500">
                  €{finalStats.refundedAmount.toFixed(2)} reembolsados
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendencia de Ingresos Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Ingresos Totales",
                  color: "hsl(var(--primary))",
                },
                promoLost: {
                  label: "Pérdidas por Promo",
                  color: "hsl(var(--destructive))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={finalStats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => {
                      const date = new Date(value + "-01");
                      return date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
                    }}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Ingresos Totales"
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="promoLost"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Pérdidas por Promo"
                    dot={{ fill: "hsl(var(--destructive))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ingresos por Plan (Últimos 6 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                tier_1: {
                  label: "PRO",
                  color: "hsl(var(--chart-1))",
                },
                tier_2: {
                  label: "BUSINESS",
                  color: "hsl(var(--chart-2))",
                },
                free: {
                  label: "FREE",
                  color: "hsl(var(--muted))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalStats.monthlyRevenue.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => {
                      const date = new Date(value + "-01");
                      return date.toLocaleDateString("es-ES", { month: "short" });
                    }}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="free" stackId="a" fill="hsl(var(--muted))" name="FREE" />
                  <Bar dataKey="tier_1" stackId="a" fill="hsl(var(--chart-1))" name="PRO" />
                  <Bar dataKey="tier_2" stackId="a" fill="hsl(var(--chart-2))" name="BUSINESS" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Mensuales por Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Free</TableHead>
                <TableHead>PRO (tier_1)</TableHead>
                <TableHead>BUSINESS (tier_2)</TableHead>
                <TableHead>Total Ingresos</TableHead>
                <TableHead>Pérdidas Promocionales</TableHead>
                <TableHead>Total Potencial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalStats.monthlyRevenue.slice().reverse().map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">
                    {new Date(month.month + "-01").toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                    })}
                  </TableCell>
                  <TableCell>€{month.free.toFixed(2)}</TableCell>
                  <TableCell>€{month.tier_1.toFixed(2)}</TableCell>
                  <TableCell>€{month.tier_2.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">€{month.total.toFixed(2)}</TableCell>
                  <TableCell className="text-orange-600">€{month.promoLost.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-green-600">
                    €{(month.total + month.promoLost).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

