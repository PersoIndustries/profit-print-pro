/**
 * Permission Validator
 * 
 * Validates what features and pages each tier can access
 */

import { SubscriptionTier } from '@/hooks/useSubscription';

export interface PermissionCheck {
  feature: string;
  free: boolean;
  tier_1: boolean;
  tier_2: boolean;
  description: string;
}

export const PERMISSION_MATRIX: PermissionCheck[] = [
  // Navigation & Pages
  {
    feature: 'dashboard',
    free: true,
    tier_1: true,
    tier_2: true,
    description: 'Acceso al dashboard principal'
  },
  {
    feature: 'projects',
    free: true,
    tier_1: true,
    tier_2: true,
    description: 'Gestión de proyectos'
  },
  {
    feature: 'prints',
    free: true,
    tier_1: true,
    tier_2: true,
    description: 'Registro de impresiones'
  },
  {
    feature: 'orders',
    free: true,
    tier_1: true,
    tier_2: true,
    description: 'Gestión de pedidos'
  },
  {
    feature: 'inventory',
    free: true,
    tier_1: true,
    tier_2: true,
    description: 'Gestión de inventario'
  },
  {
    feature: 'catalogs',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Catálogos personalizados'
  },
  {
    feature: 'analytics',
    free: true,
    tier_1: true,
    tier_2: true,
    description: 'Análisis básico'
  },
  {
    feature: 'advanced_analytics',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Análisis avanzado con métricas detalladas'
  },
  {
    feature: 'financial_analytics',
    free: false,
    tier_1: false,
    tier_2: true,
    description: 'Análisis financiero detallado (solo Business)'
  },
  
  // Features
  {
    feature: 'kanban_view',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Vista Kanban de pedidos'
  },
  {
    feature: 'calendar_view',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Vista de calendario de pedidos'
  },
  {
    feature: 'export_data',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Exportar datos'
  },
  {
    feature: 'advanced_filters',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Filtros avanzados'
  },
  {
    feature: 'inventory_history',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Historial de inventario'
  },
  {
    feature: 'auto_stock_calculation',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Cálculo automático de stock'
  },
  {
    feature: 'catalog_sections',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Secciones en catálogos'
  },
  {
    feature: 'catalog_themes',
    free: false,
    tier_1: true,
    tier_2: true,
    description: 'Temas personalizados en catálogos'
  },
  {
    feature: 'catalog_branding',
    free: false,
    tier_1: false,
    tier_2: true,
    description: 'Branding personalizado en catálogos (solo Business)'
  },
  {
    feature: 'metrics_history_60_days',
    free: false,
    tier_1: true,
    tier_2: false,
    description: 'Historial de métricas 60 días (Professional)'
  },
  {
    feature: 'metrics_history_2_years',
    free: false,
    tier_1: false,
    tier_2: true,
    description: 'Historial de métricas 2 años (Business)'
  },
  
  // Limits
  {
    feature: 'unlimited_materials',
    free: false,
    tier_1: false,
    tier_2: true,
    description: 'Materiales ilimitados'
  },
  {
    feature: 'unlimited_projects',
    free: false,
    tier_1: false,
    tier_2: true,
    description: 'Proyectos ilimitados'
  },
  {
    feature: 'unlimited_orders',
    free: false,
    tier_1: false,
    tier_2: true,
    description: 'Pedidos ilimitados'
  },
];

/**
 * Check if a tier has access to a feature
 */
export const hasPermission = (tier: SubscriptionTier | null | undefined, feature: string): boolean => {
  if (!tier) return false;
  
  const permission = PERMISSION_MATRIX.find(p => p.feature === feature);
  if (!permission) return false;
  
  switch (tier) {
    case 'free':
      return permission.free;
    case 'tier_1':
      return permission.tier_1;
    case 'tier_2':
      return permission.tier_2;
    default:
      return false;
  }
};

/**
 * Get all features available for a tier
 */
export const getFeaturesForTier = (tier: SubscriptionTier): PermissionCheck[] => {
  return PERMISSION_MATRIX.filter(p => {
    switch (tier) {
      case 'free':
        return p.free;
      case 'tier_1':
        return p.tier_1;
      case 'tier_2':
        return p.tier_2;
      default:
        return false;
    }
  });
};

/**
 * Validate access to a page/route
 */
export const canAccessPage = (tier: SubscriptionTier | null | undefined, page: string): boolean => {
  const pageFeatureMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/projects': 'projects',
    '/prints': 'prints',
    '/orders': 'orders',
    '/inventory': 'inventory',
    '/catalogs': 'catalogs',
    '/analytics': 'analytics',
    '/settings': 'dashboard', // Settings always accessible
  };
  
  const feature = pageFeatureMap[page] || page.replace('/', '');
  return hasPermission(tier, feature);
};

/**
 * Generate a validation report for all tiers
 */
export const generateValidationReport = () => {
  const tiers: SubscriptionTier[] = ['free', 'tier_1', 'tier_2'];
  const report: Record<string, { free: boolean; tier_1: boolean; tier_2: boolean }> = {};
  
  PERMISSION_MATRIX.forEach(permission => {
    report[permission.feature] = {
      free: permission.free,
      tier_1: permission.tier_1,
      tier_2: permission.tier_2,
    };
  });
  
  return report;
};

