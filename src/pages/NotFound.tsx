import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertCircle className="w-16 h-16 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">{t('notFound.title')}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('notFound.description')}
          </p>
        </div>
        <Button onClick={() => navigate("/")} size="lg" className="gap-2">
          <Home className="w-4 h-4" />
          {t('notFound.backHome')}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
