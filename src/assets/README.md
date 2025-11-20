# Assets

Esta carpeta contiene recursos estáticos del proyecto que se importan directamente en los componentes.

## Estructura

```
assets/
  └── images/     # Imágenes estáticas (PNG, JPG, SVG, etc.)
```

## Uso

### Importar imágenes en componentes

```tsx
import miImagen from '@/assets/images/mi-imagen.png';
import logo from '@/assets/images/logo.svg';

// En el componente
<img src={miImagen} alt="Descripción" />
```

### Ventajas de usar assets/

- ✅ Las imágenes se optimizan automáticamente por Vite
- ✅ Se genera un hash único en el nombre para cache busting
- ✅ TypeScript reconoce las importaciones
- ✅ Mejor organización del código

## Nota

- **Imágenes públicas** (logos, favicon) → `public/`
- **Imágenes importadas en componentes** → `src/assets/images/`
- **Imágenes subidas por usuarios** → Supabase Storage (no archivos locales)

