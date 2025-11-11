import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  variant?: 'landing' | 'app' | 'auth';
}

export const Header = ({ variant = 'landing' }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();

  const isActive = (path: string) => location.pathname === path;

  const getTierBadge = () => {
    if (!subscription) return null;
    
    const tierConfig = {
      tier_2: { label: 'BUSINESS', color: 'bg-purple-500' },
      tier_1: { label: 'PRO', color: 'bg-blue-500' },
      free: { label: 'FREE', color: 'bg-muted' }
    };

    const config = tierConfig[subscription.tier];
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  // Auth variant for login/signup pages
  if (variant === 'auth') {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 
              className="text-2xl font-bold text-primary cursor-pointer" 
              onClick={() => navigate('/')}
            >
              Print3D Manager
            </h1>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('nav.home')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              {t('nav.pricing')}
            </Button>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>
    );
  }

  if (variant === 'landing') {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 
              className="text-2xl font-bold text-primary cursor-pointer" 
              onClick={() => navigate('/')}
            >
              Print3D Manager
            </h1>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('nav.home')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              {t('nav.pricing')}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {!user && (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  {t('nav.login')}
                </Button>
                <Button onClick={() => navigate('/auth')}>
                  {t('nav.signup')}
                </Button>
              </>
            )}
            {user && (
              <Button onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                {t('nav.dashboard')}
              </Button>
            )}
          </div>
        </div>
      </nav>
    );
  }

  // App variant for authenticated pages
  return (
    <nav className="border-b bg-card/50 backdrop-blur">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 
              className="text-2xl font-bold text-primary cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              Print3D Manager
            </h1>
            {getTierBadge()}
          </div>
          <Button 
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            onClick={() => navigate('/dashboard')}
          >
            {t('nav.dashboard')}
          </Button>
          <Button 
            variant={isActive('/materials') ? 'default' : 'ghost'}
            onClick={() => navigate('/materials')}
          >
            {t('nav.materials')}
          </Button>
          <Button 
            variant={isActive('/projects') ? 'default' : 'ghost'}
            onClick={() => navigate('/projects')}
          >
            {t('nav.projects')}
          </Button>
          <Button 
            variant={isActive('/calculator') ? 'default' : 'ghost'}
            onClick={() => navigate('/calculator')}
          >
            {t('nav.calculator')}
          </Button>
          <Button 
            variant={isActive('/orders') ? 'default' : 'ghost'}
            onClick={() => navigate('/orders')}
          >
            {t('nav.orders')}
          </Button>
          <Button 
            variant={isActive('/prints') ? 'default' : 'ghost'}
            onClick={() => navigate('/prints')}
          >
            Impresiones
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('nav.logout')}
          </Button>
        </div>
      </div>
    </nav>
  );
};
