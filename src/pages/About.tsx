import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Printer, Target, Users, Zap, Shield, TrendingUp, Calculator, Package, Linkedin } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      <Header variant="landing" />

      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6">Acerca de Print3D Manager</h1>
          <p className="text-xl text-muted-foreground mb-8">
            La solución completa para gestionar y optimizar tu negocio de impresión 3D
          </p>
        </div>

        {/* Mission Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                Nuestra Misión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Print3D Manager nació de la necesidad de simplificar la gestión de negocios de impresión 3D. 
                Nuestro objetivo es proporcionar a emprendedores y profesionales las herramientas necesarias 
                para calcular costes con precisión, gestionar inventarios eficientemente y hacer crecer sus 
                negocios de forma sostenible.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">¿Qué Ofrecemos?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Calculator className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Calculadora de Precios</CardTitle>
                <CardDescription>
                  Calcula automáticamente el coste de tus impresiones considerando materiales, 
                  electricidad y tiempo de impresión
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Package className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Gestión de Inventario</CardTitle>
                <CardDescription>
                  Mantén un control completo de tus materiales, stock y movimientos de inventario 
                  en tiempo real
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Printer className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Gestión de Proyectos</CardTitle>
                <CardDescription>
                  Organiza todos tus proyectos de impresión, materiales utilizados y configuraciones 
                  de impresión
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Dashboard Analítico</CardTitle>
                <CardDescription>
                  Visualiza estadísticas detalladas de tus pedidos, impresiones y rendimiento 
                  del negocio
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Gestión de Pedidos</CardTitle>
                <CardDescription>
                  Administra pedidos de clientes con seguimiento completo del estado y 
                  organización visual
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Catálogos Digitales</CardTitle>
                <CardDescription>
                  Crea y comparte catálogos profesionales de tus productos con clientes 
                  (funcionalidad Premium)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Values Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Nuestros Valores</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-3" />
                <CardTitle>Seguridad y Privacidad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tus datos están protegidos con las mejores prácticas de seguridad. 
                  Respetamos tu privacidad y nunca compartimos tu información.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mb-3" />
                <CardTitle>Simplicidad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Diseñamos Print3D Manager para ser intuitivo y fácil de usar. 
                  No necesitas conocimientos técnicos avanzados para aprovechar todas sus funciones.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-primary mb-3" />
                <CardTitle>Mejora Continua</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Escuchamos a nuestros usuarios y mejoramos constantemente la plataforma 
                  con nuevas funcionalidades y optimizaciones.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-primary mb-3" />
                <CardTitle>Comunidad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Formamos parte de una comunidad de emprendedores que comparten la pasión 
                  por la impresión 3D y el crecimiento de sus negocios.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Creator Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Quién Soy</h2>
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-16 h-16 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-4">Carlos Peralta Sorolla</h3>
                  <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                    Con más de 5 años de experiencia en la industria del gaming, he trabajado 
                    en gestión de proyectos, dirección creativa y liderazgo de equipos técnicos 
                    multidisciplinarios, colaborando en el desarrollo de videojuegos Web3 y Web2.
                  </p>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    La historia de Print3D Manager comenzó de forma personal: al adquirir mi impresora 
                    3D Bambu Lab P2S y empezar a gestionar mi propio negocio, me di cuenta de que 
                    necesitaba una herramienta para gestionar mi stock, materiales y pedidos de forma 
                    eficiente. Así que creé una aplicación para uso personal.
                  </p>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Al ver que realmente solventaba un problema real en la industria y que podía ayudar 
                    a otros emprendedores y profesionales del sector, decidí compartirla con todo el 
                    mundo. Print3D Manager es el resultado de combinar mi experiencia técnica con las 
                    necesidades reales que descubrí en mi propio día a día.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://www.linkedin.com/in/carlos-peralta-sorolla/', '_blank')}
                      className="gap-2"
                    >
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-2xl mx-auto">
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="text-2xl mb-2">¿Listo para comenzar?</CardTitle>
              <CardDescription className="text-base">
                Únete a nuestra comunidad y comienza a optimizar tu negocio de impresión 3D hoy mismo
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Crear Cuenta Gratuita
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                Ver Planes
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer variant="landing" />
    </div>
  );
};

export default About;

