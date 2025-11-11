import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UpgradeCTA } from "@/components/dashboard/UpgradeCTA";
import { OrdersStats } from "@/components/dashboard/OrdersStats";
import { PrintsStats } from "@/components/dashboard/PrintsStats";
import { OrdersMonthlyStats } from "@/components/dashboard/OrdersMonthlyStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Printer, TrendingUp } from "lucide-react";

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
          {isFreeUser 
            ? 'Actualiza tu plan para acceder a estadísticas detalladas' 
            : 'Análisis completo del rendimiento de tu negocio'}
        </p>
      </div>

      {isFreeUser ? (
        <UpgradeCTA />
      ) : (
        user && subscription && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="w-4 h-4 mr-2" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="prints">
                <Printer className="w-4 h-4 mr-2" />
                Impresiones
              </TabsTrigger>
              <TabsTrigger value="financial">
                <TrendingUp className="w-4 h-4 mr-2" />
                Financiero
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
              <PrintsStats userId={user.id} />
            </TabsContent>

            <TabsContent value="financial">
              <OrdersMonthlyStats userId={user.id} />
            </TabsContent>
          </Tabs>
        )
      )}
    </>
  );
};

export default Dashboard;
