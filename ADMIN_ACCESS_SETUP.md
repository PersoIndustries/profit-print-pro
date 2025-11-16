# Configuración de Acceso Admin para Base de Datos

## ⚠️ IMPORTANTE: Seguridad

La **Service Role Key** de Supabase tiene permisos **COMPLETOS** de administración:
- ✅ Bypassa Row Level Security (RLS)
- ✅ Puede leer/escribir/eliminar cualquier dato
- ✅ Puede modificar el esquema de la base de datos
- ❌ **NUNCA** debe estar en el frontend
- ❌ **NUNCA** debe committearse al repositorio
- ❌ **NUNCA** debe exponerse públicamente

## Cómo Obtener la Service Role Key

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Busca la sección **Project API keys**
5. Encuentra **service_role** (secret) - esta es la clave que necesitas
6. **⚠️ Copia esta clave con cuidado** - es muy sensible

## Configuración para Desarrollo Local

### Opción 1: Archivo .env.local (Recomendado)

Crea o actualiza el archivo `.env.local` en la raíz del proyecto:

```env
# Claves públicas (para el frontend)
VITE_SUPABASE_URL=https://qjacgxvzjfjxytfggqro.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Service Role Key (SOLO para scripts/admin - NUNCA en frontend)
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Nota**: El archivo `.env.local` está en `.gitignore` y no se subirá al repositorio.

### Opción 2: Variables de Entorno del Sistema

También puedes configurarlas como variables de entorno del sistema (Windows):

```powershell
$env:VITE_SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_aqui"
```

## Uso del Cliente Admin

### En Scripts de Desarrollo

```typescript
import { supabaseAdmin, isAdminClientAvailable } from '@/integrations/supabase/admin-client';

if (!isAdminClientAvailable()) {
  console.error('Cliente admin no disponible. Verifica VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Ejemplo: Obtener todos los usuarios (bypassa RLS)
const { data: users, error } = await supabaseAdmin
  .from('profiles')
  .select('*');

// Ejemplo: Actualizar cualquier registro
const { error } = await supabaseAdmin
  .from('user_subscriptions')
  .update({ tier: 'tier_2' })
  .eq('user_id', 'some-user-id');
```

### Operaciones Comunes

#### Ver todos los usuarios
```typescript
const { data } = await supabaseAdmin
  .from('profiles')
  .select('*');
```

#### Ver estructura de tablas
```typescript
// Ver todas las tablas
const { data } = await supabaseAdmin
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');
```

#### Crear/actualizar registros sin restricciones RLS
```typescript
// Insertar en cualquier tabla
const { data, error } = await supabaseAdmin
  .from('user_roles')
  .insert({ user_id: 'xxx', role: 'admin' });
```

#### Ejecutar queries SQL directas (si está habilitado)
```typescript
const { data, error } = await supabaseAdmin.rpc('nombre_funcion', { param: 'value' });
```

## Herramientas Recomendadas

### 1. Supabase Dashboard (Web)
- **URL**: https://supabase.com/dashboard
- **Uso**: Interfaz visual para ver/editar datos
- **Ventaja**: No requiere configuración adicional

### 2. Supabase CLI
```bash
# Instalar
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref tu-project-ref

# Ver datos
supabase db dump
```

### 3. Table Editor en Dashboard
- Ve a **Table Editor** en el dashboard
- Puedes ver/editar datos directamente
- Útil para operaciones rápidas

### 4. SQL Editor en Dashboard
- Ve a **SQL Editor** en el dashboard
- Ejecuta queries SQL directamente
- Útil para operaciones complejas

## Operaciones Comunes que Puedo Hacer

Con acceso admin, puedo ayudarte a:

✅ **Ver estructura de la base de datos**
- Listar todas las tablas
- Ver esquemas y relaciones
- Revisar políticas RLS

✅ **Consultar datos**
- Ver todos los usuarios
- Revisar suscripciones
- Analizar datos de órdenes/proyectos

✅ **Crear/Actualizar datos**
- Crear usuarios admin
- Actualizar suscripciones
- Modificar configuraciones

✅ **Gestionar esquema**
- Crear nuevas tablas (mediante migraciones)
- Modificar columnas
- Actualizar políticas RLS

## Seguridad en Producción

### ⚠️ NUNCA en Netlify

**NO** configures `VITE_SUPABASE_SERVICE_ROLE_KEY` en Netlify como variable de entorno pública.

Si necesitas operaciones admin en producción:
1. Crea un endpoint serverless (Netlify Functions)
2. Usa la Service Role Key solo en el servidor
3. Protege el endpoint con autenticación

### Ejemplo de Función Netlify (futuro)

```typescript
// netlify/functions/admin-operation.ts
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  // Verificar autenticación
  // ...
  
  // Usar Service Role Key solo en el servidor
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // NO VITE_ prefix
  );
  
  // Operación admin
  // ...
};
```

## Checklist de Seguridad

- [ ] Service Role Key solo en `.env.local` (desarrollo)
- [ ] `.env.local` está en `.gitignore`
- [ ] Nunca commitees la Service Role Key
- [ ] No uses el cliente admin en componentes React del frontend
- [ ] Solo úsalo en scripts o herramientas de desarrollo
- [ ] Para producción, usa funciones serverless protegidas

## Próximos Pasos

1. **Obtén la Service Role Key** desde el dashboard de Supabase
2. **Agrégala a `.env.local`** (no la commitees)
3. **Verifica que funciona** ejecutando un script de prueba
4. **Dime qué necesitas** y puedo ayudarte a crear scripts o queries específicas

## ¿Qué Necesitas Hacer?

Dime qué operación necesitas y puedo ayudarte a:
- Crear scripts para operaciones específicas
- Escribir queries SQL
- Configurar migraciones
- Revisar la estructura de la base de datos


