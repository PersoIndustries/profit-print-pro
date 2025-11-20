// Sistema de temas para catálogos
export type CatalogTheme = 'default';

export interface ThemeConfig {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    section: string;
    project: string;
    product: string;
  };
}

export const catalogThemes: Record<CatalogTheme, ThemeConfig> = {
  default: {
    name: 'default',
    displayName: 'Tema por Defecto',
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      background: 'hsl(var(--background))',
      text: 'hsl(var(--foreground))',
      border: 'hsl(var(--border))',
    },
    fonts: {
      heading: 'inherit',
      body: 'inherit',
    },
    spacing: {
      section: '1.5rem',
      project: '0.5rem',
      product: '0.25rem',
    },
  },
};

export function getTheme(themeName: string = 'default'): ThemeConfig {
  return catalogThemes[themeName as CatalogTheme] || catalogThemes.default;
}

export function applyTheme(theme: ThemeConfig): void {
  // Esta función puede ser extendida en el futuro para aplicar estilos dinámicos
  // Por ahora, el tema default usa las variables CSS del sistema
  document.documentElement.style.setProperty('--catalog-primary', theme.colors.primary);
  document.documentElement.style.setProperty('--catalog-secondary', theme.colors.secondary);
  document.documentElement.style.setProperty('--catalog-background', theme.colors.background);
  document.documentElement.style.setProperty('--catalog-text', theme.colors.text);
  document.documentElement.style.setProperty('--catalog-border', theme.colors.border);
}






