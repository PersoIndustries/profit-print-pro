import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, BarChart3, Printer, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { OrdersStats } from "@/components/dashboard/OrdersStats";
import { PrintsStats } from "@/components/dashboard/PrintsStats";
import { OrdersMonthlyStats } from "@/components/dashboard/OrdersMonthlyStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const isFreeUser = subscription?.tier === 'free';

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h2>
        <p className="text-muted-foreground">
          Análisis completo del rendimiento de tu negocio
        </p>
      </div>

      {user && subscription && (
        <>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="w-4 h-4 mr-2" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="prints">
                <Printer className="w-4 h-4 mr-2" />
                Impresiones
                {isFreeUser && (
                  <Badge className="ml-2 bg-primary text-[10px] py-0 px-1.5">PRO</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="financial">
                <TrendingUp className="w-4 h-4 mr-2" />
                Financiero
                {isFreeUser && (
                  <Badge className="ml-2 bg-primary text-[10px] py-0 px-1.5">PRO</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OrdersStats 
                userId={user.id} 
                tier={subscription.tier}
                metricsHistory={subscription.limits.metricsHistory}
              />
            </TabsContent>

            <TabsContent value="prints">
              {isFreeUser ? (
                <Card className="border-primary">
                  <CardContent className="pt-12 pb-12 text-center">
                    <div className="max-w-md mx-auto space-y-6">
                      <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <Printer className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Estadísticas de Impresiones - Premium</h3>
                        <p className="text-muted-foreground mb-4">
                          Accede a análisis detallados de tus impresiones: tiempo total, material usado, tipos más comunes y tendencias mensuales.
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-sm mx-auto">
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Tiempo total de impresión</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Material usado total y por mes</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Gráficos y tendencias (60 días)</span>
                          </li>
                        </ul>
                      </div>
                      <Button onClick={() => navigate('/pricing')} size="lg">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Ver Planes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <PrintsStats userId={user.id} />
              )}
            </TabsContent>

            <TabsContent value="financial">
              {isFreeUser ? (
                <Card className="border-primary">
                  <CardContent className="pt-12 pb-12 text-center">
                    <div className="max-w-md mx-auto space-y-6">
                      <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <TrendingUp className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Análisis Financiero - Premium</h3>
                        <p className="text-muted-foreground mb-4">
                          Obtén análisis completo de ingresos, costos y márgenes de beneficio con gráficos mensuales y tendencias.
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-sm mx-auto">
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Ingresos y costos mensuales</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Margen de beneficio por período</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Pedidos completados y tendencias</span>
                          </li>
                        </ul>
                      </div>
                      <Button onClick={() => navigate('/pricing')} size="lg">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Ver Planes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <OrdersMonthlyStats userId={user.id} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  );
};

export default Dashboard;
