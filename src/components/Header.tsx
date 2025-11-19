import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { useAdmin } from '@/hooks/useAdmin';
import { LogOut, Settings, LayoutDashboard, ChevronDown, Package, FolderKanban, Calculator, FileText, Printer, BookOpen, ShoppingCart, History, TrendingUp, Shield } from 'lucide-react';
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
  const { isPro, isEnterprise } = useTierFeatures();
  const { isAdmin } = useAdmin();

  const isActive = (path: string) => location.pathname === path;
  const isActiveInGroup = (paths: string[]) => paths.some(path => location.pathname.startsWith(path));

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
              Layer Suite
            </h1>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('nav.home')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/about')}>
              {t('nav.about')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              {t('nav.pricing')}
            </Button>
          </div>
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
              Layer Suite
            </h1>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('nav.home')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/about')}>
              {t('nav.about')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              {t('nav.pricing')}
            </Button>
          </div>
          <div className="flex items-center gap-4">
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
              Layer Suite
            </h1>
            {getTierBadge()}
          </div>
          <Button 
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            {t('nav.dashboard')}
          </Button>
          
          {/* Menú Materiales */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={isActiveInGroup(['/inventory', '/shopping-list', '/acquisitions', '/movements']) ? 'default' : 'ghost'}
              >
                <Package className="w-4 h-4 mr-2" />
                {t('nav.materials')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate('/inventory')}>
                <Package className="w-4 h-4 mr-2" />
                {t('nav.inventory')}
              </DropdownMenuItem>
              {(isPro || isEnterprise) && (
                <DropdownMenuItem onClick={() => navigate('/acquisitions')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t('nav.acquisitions')}
                </DropdownMenuItem>
              )}
              {isEnterprise && (
                <DropdownMenuItem onClick={() => navigate('/movements')}>
                  <History className="w-4 h-4 mr-2" />
                  {t('nav.movements')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/shopping-list')}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t('nav.shoppingList')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menú Proyectos */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={isActiveInGroup(['/projects', '/calculator', '/catalogs']) ? 'default' : 'ghost'}
              >
                <FolderKanban className="w-4 h-4 mr-2" />
                {t('nav.projects')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate('/projects')}>
                <FolderKanban className="w-4 h-4 mr-2" />
                {t('nav.projects')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/calculator')}>
                <Calculator className="w-4 h-4 mr-2" />
                {t('nav.calculator')}
              </DropdownMenuItem>
              {(isPro || isEnterprise) && (
                <DropdownMenuItem onClick={() => navigate('/catalogs')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('nav.catalogs')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menú Operaciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={isActiveInGroup(['/orders', '/prints']) ? 'default' : 'ghost'}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('nav.operations')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate('/orders')}>
                <FileText className="w-4 h-4 mr-2" />
                {t('nav.orders')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/prints')}>
                <Printer className="w-4 h-4 mr-2" />
                {t('nav.prints')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button 
              variant={isActive('/admin') ? 'default' : 'ghost'} 
              onClick={() => navigate('/admin')}
              title="Admin Panel"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin
            </Button>
          )}
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
