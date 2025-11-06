import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Printer, TrendingUp, Package, Calculator } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Print3D Manager</h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button variant="ghost" onClick={() => navigate("/pricing")}>
            {t('nav.pricing')}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            {t('nav.login')}
          </Button>
          <Button onClick={() => navigate("/auth")}>
            {t('nav.signup')}
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl font-bold mb-6">
            {t('landing.hero.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            {t('landing.hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              {t('landing.hero.cta')}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
              {t('landing.hero.ctaSecondary')}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <div className="text-center p-6 rounded-lg bg-card border">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Cálculo Preciso</h3>
            <p className="text-muted-foreground">
              Calcula costes de material, electricidad y tiempo de forma automática
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border">
            <Package className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Gestión de Materiales</h3>
            <p className="text-muted-foreground">
              Mantén un inventario actualizado con precios personalizados
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border">
            <Printer className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Proyectos</h3>
            <p className="text-muted-foreground">
              Guarda y organiza todos tus trabajos de impresión
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
            <p className="text-muted-foreground">
              Visualiza tus estadísticas y rendimiento en tiempo real
            </p>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h3>
          <p className="text-muted-foreground mb-6">
            Únete a cientos de emprendedores que ya optimizan su negocio con Print3D Manager
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Crear Cuenta Gratuita
          </Button>
        </div>
      </main>

      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Print3D Manager. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
