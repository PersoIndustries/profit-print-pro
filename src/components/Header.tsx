import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Settings, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  variant?: 'landing' | 'app';
}

export const Header = ({ variant = 'landing' }: HeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  if (variant === 'landing') {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 
            className="text-2xl font-bold text-primary cursor-pointer" 
            onClick={() => navigate('/')}
          >
            Print3D Manager
          </h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              {t('nav.pricing')}
            </Button>
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
        <h1 
          className="text-2xl font-bold text-primary cursor-pointer" 
          onClick={() => navigate('/dashboard')}
        >
          Print3D Manager
        </h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            {t('nav.dashboard')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/materials')}>
            {t('nav.materials')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            {t('nav.projects')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/calculator')}>
            {t('nav.calculator')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/orders')}>
            {t('nav.orders')}
          </Button>
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
