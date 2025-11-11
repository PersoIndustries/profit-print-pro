import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UpgradeCTA } from "@/components/dashboard/UpgradeCTA";
import { OrdersStats } from "@/components/dashboard/OrdersStats";

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
            : 'Análisis del rendimiento de tu negocio'}
        </p>
      </div>

      {isFreeUser ? (
        <UpgradeCTA />
      ) : (
        user && subscription && (
          <OrdersStats 
            userId={user.id} 
            tier={subscription.tier}
            metricsHistory={subscription.limits.metricsHistory}
          />
        )
      )}
    </>
  );
};

export default Dashboard;
