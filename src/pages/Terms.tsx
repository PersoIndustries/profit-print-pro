import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Header variant="landing" />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Términos y Condiciones</CardTitle>
            <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
              <p className="text-muted-foreground">
                Al acceder y utilizar Print3D Manager, usted acepta estar sujeto a estos términos y condiciones de uso. 
                Si no está de acuerdo con alguno de estos términos, no debe utilizar este servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
              <p className="text-muted-foreground">
                Print3D Manager es una plataforma de gestión empresarial diseñada para ayudar a los emprendedores 
                de impresión 3D a administrar sus materiales, proyectos, calculadora de precios y pedidos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Registro y Cuenta de Usuario</h2>
              <p className="text-muted-foreground mb-2">
                Para utilizar ciertas funciones del servicio, debe registrarse y crear una cuenta. Usted se compromete a:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Proporcionar información precisa, actual y completa durante el proceso de registro</li>
                <li>Mantener y actualizar su información para que siga siendo precisa y completa</li>
                <li>Mantener la seguridad de su contraseña y aceptar toda la responsabilidad por las actividades bajo su cuenta</li>
                <li>Notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Uso Aceptable</h2>
              <p className="text-muted-foreground mb-2">
                Usted acepta NO utilizar el servicio para:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Violar cualquier ley o regulación aplicable</li>
                <li>Infringir los derechos de propiedad intelectual de terceros</li>
                <li>Transmitir contenido ofensivo, difamatorio o ilegal</li>
                <li>Intentar acceder de manera no autorizada a otros sistemas o redes</li>
                <li>Interferir con el funcionamiento normal del servicio</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Planes y Pagos</h2>
              <p className="text-muted-foreground">
                Print3D Manager ofrece diferentes planes de suscripción. Los precios y características de cada plan 
                están detallados en nuestra página de precios. Los pagos se procesan de manera segura a través de 
                nuestros proveedores de pago autorizados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Propiedad Intelectual</h2>
              <p className="text-muted-foreground">
                Todo el contenido, características y funcionalidad del servicio (incluyendo pero no limitado a 
                información, software, texto, gráficos, logos) son propiedad exclusiva de Print3D Manager y están 
                protegidos por leyes de derechos de autor, marcas registradas y otras leyes de propiedad intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Privacidad y Protección de Datos</h2>
              <p className="text-muted-foreground">
                Su privacidad es importante para nosotros. Recopilamos, utilizamos y protegemos su información personal 
                de acuerdo con nuestra Política de Privacidad. Al utilizar nuestro servicio, usted acepta la recopilación 
                y uso de información según lo descrito en dicha política.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitación de Responsabilidad</h2>
              <p className="text-muted-foreground">
                Print3D Manager se proporciona "tal cual" sin garantías de ningún tipo. No garantizamos que el servicio 
                será ininterrumpido, seguro o libre de errores. En ningún caso seremos responsables por daños indirectos, 
                incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de usar el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Cancelación y Terminación</h2>
              <p className="text-muted-foreground">
                Puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta. Nos reservamos 
                el derecho de suspender o terminar su acceso al servicio si viola estos términos o por cualquier otra 
                razón que consideremos apropiada.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Modificaciones de los Términos</h2>
              <p className="text-muted-foreground">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Le notificaremos sobre 
                cambios importantes por correo electrónico o mediante un aviso en nuestro servicio. El uso continuado 
                del servicio después de dichos cambios constituye su aceptación de los nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contacto</h2>
              <p className="text-muted-foreground">
                Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos a través de nuestro 
                formulario de contacto en el sitio web.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
