import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface FooterProps {
  variant?: 'landing' | 'app';
}

export const Footer = ({ variant = 'app' }: FooterProps) => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  if (variant === 'landing') {
    return (
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="mb-3">
                <img src="/logo.svg" alt="LayerSuite" className="h-6" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                La solución completa para gestionar tu negocio de impresión 3D.
              </p>
              <LanguageSwitcher />
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => navigate('/about')} className="text-muted-foreground hover:text-primary transition-colors">
                    Acerca de
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/pricing')} className="text-muted-foreground hover:text-primary transition-colors">
                    Precios
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/auth')} className="text-muted-foreground hover:text-primary transition-colors">
                    Iniciar Sesión
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => navigate('/terms')} className="text-muted-foreground hover:text-primary transition-colors">
                    Términos de Uso
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/terms')} className="text-muted-foreground hover:text-primary transition-colors">
                    Política de Privacidad
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
            <p>© {currentYear} Jardiper S.C. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    );
  }

  // App footer
  return (
    <footer className="border-t bg-card/30 backdrop-blur mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} Jardiper S.C. Todos los derechos reservados.
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/terms')} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Términos de Uso
            </button>
            <button 
              onClick={() => navigate('/terms')} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Política de Privacidad
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
};
