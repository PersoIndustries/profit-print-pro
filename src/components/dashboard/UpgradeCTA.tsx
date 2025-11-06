import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Calendar, BarChart3 } from "lucide-react";

export const UpgradeCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="text-center pb-4">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle className="text-2xl">Desbloquea Estadísticas Avanzadas</CardTitle>
          <CardDescription className="text-base">
            Actualiza a un plan profesional para acceder a métricas detalladas de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-card">
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Historial Completo</h3>
              <p className="text-sm text-muted-foreground">
                Accede a métricas de hasta 2 años
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-card">
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Análisis Detallado</h3>
              <p className="text-sm text-muted-foreground">
                Filtra por día, semana, mes o trimestre
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-card">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Proyecciones</h3>
              <p className="text-sm text-muted-foreground">
                Predicciones de ingresos y tendencias
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/pricing")}
              className="w-full md:w-auto"
            >
              Ver Planes Profesionales
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Actual: Free</CardTitle>
          <CardDescription>
            Tu plan incluye funcionalidades básicas para empezar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Materiales</span>
            <span className="font-medium">Hasta 10</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Proyectos</span>
            <span className="font-medium">Hasta 15</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pedidos mensuales</span>
            <span className="font-medium">Hasta 15</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Historial de métricas</span>
            <span className="font-medium text-muted-foreground">No disponible</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
