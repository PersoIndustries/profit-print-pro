# Configuración de Variables de Entorno en Netlify

## Variables Requeridas

Para que la aplicación funcione correctamente, necesitas configurar las siguientes variables de entorno en Netlify:

1. **VITE_SUPABASE_URL**: URL de tu proyecto Supabase
2. **VITE_SUPABASE_ANON_KEY**: Clave pública (anon key) de tu proyecto Supabase

## Cómo Configurar las Variables en Netlify

### Opción 1: Desde el Dashboard de Netlify (Recomendado)

1. Ve a tu proyecto en [Netlify Dashboard](https://app.netlify.com)
2. Navega a **Site settings** → **Environment variables**
3. Haz clic en **Add a variable**
4. Agrega cada variable:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: `https://qjacgxvzjfjxytfggqro.supabase.co`
5. Haz clic en **Add a variable** nuevamente para la segunda:
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI`
6. Guarda los cambios

### Opción 2: Desde netlify.toml (No recomendado para valores sensibles)

Puedes agregar las variables directamente en `netlify.toml`, pero **NO es recomendable** para valores sensibles ya que se commitearían al repositorio.

```toml
[build.environment]
  VITE_SUPABASE_URL = "https://qjacgxvzjfjxytfggqro.supabase.co"
  VITE_SUPABASE_ANON_KEY = "tu_clave_aqui"
```

## Valores Actuales

**⚠️ IMPORTANTE**: Estos son los valores que estaban hardcodeados en el código. Úsalos para configurar las variables en Netlify:

- **VITE_SUPABASE_URL**: `https://qjacgxvzjfjxytfggqro.supabase.co`
- **VITE_SUPABASE_ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI`

## Configuración para Desarrollo Local

Para desarrollo local, crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://qjacgxvzjfjxytfggqro.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI
```

**Nota**: El archivo `.env.local` está en `.gitignore` y no se subirá al repositorio.

## Verificación

Después de configurar las variables:

1. Haz un nuevo deploy en Netlify
2. Verifica que la aplicación carga correctamente
3. Si ves errores sobre variables de entorno faltantes, verifica que:
   - Los nombres de las variables sean exactos (case-sensitive)
   - Las variables estén configuradas para el entorno correcto (Production, Deploy previews, Branch deploys)

## Ambientes

Netlify permite configurar variables para diferentes ambientes:
- **Production**: Para el sitio principal
- **Deploy previews**: Para previews de PRs
- **Branch deploys**: Para deploys de branches específicos

Asegúrate de configurar las variables para todos los ambientes que uses.

