# Configuración de Límites de Suscripción

## 📋 Descripción

Los límites de suscripción ahora están almacenados en la base de datos en lugar de estar hardcodeados en el código. Esto permite cambiar los límites sin necesidad de modificar el código y desplegar una nueva versión.

## 🗄️ Estructura de la Base de Datos

### Tabla: `subscription_limits`

```sql
CREATE TABLE public.subscription_limits (
  id UUID PRIMARY KEY,
  tier subscription_tier NOT NULL UNIQUE,
  materials INTEGER NOT NULL,
  projects INTEGER NOT NULL,
  monthly_orders INTEGER NOT NULL,
  metrics_history INTEGER NOT NULL, -- en días
  shopping_lists INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## 🔧 Cómo Modificar los Límites

### Opción 1: Desde SQL (Recomendado para admins)

```sql
-- Actualizar límites para tier_1
UPDATE public.subscription_limits
SET 
  materials = 100,
  projects = 200,
  monthly_orders = 100,
  shopping_lists = 10
WHERE tier = 'tier_1';

-- Actualizar límites para free
UPDATE public.subscription_limits
SET 
  materials = 20,
  projects = 30,
  monthly_orders = 20,
  shopping_lists = 3
WHERE tier = 'free';
```

### Opción 2: Desde el Panel de Supabase

1. Ve a la tabla `subscription_limits` en el panel de Supabase
2. Edita los valores directamente
3. Los cambios se aplicarán inmediatamente

### Opción 3: Crear un Panel de Administración (Futuro)

Se puede crear una interfaz de administración en la aplicación para que los admins modifiquen los límites desde la UI.

## 🔄 Valores por Defecto (Fallback)

Si la base de datos no está disponible o la tabla no existe, el sistema usa estos valores por defecto:

```typescript
free: {
  materials: 10,
  projects: 15,
  monthlyOrders: 15,
  metricsHistory: 0,
  shoppingLists: 5
}

tier_1: {
  materials: 50,
  projects: 100,
  monthlyOrders: 50,
  metricsHistory: 60,
  shoppingLists: 5
}

tier_2: {
  materials: 999999,
  projects: 999999,
  monthlyOrders: 999999,
  metricsHistory: 730,
  shoppingLists: 5
}
```

## 📝 Migración

La migración `20251121000001_create_subscription_limits_table.sql` crea:
1. La tabla `subscription_limits`
2. Los valores iniciales (matching los valores hardcodeados anteriores)
3. Las políticas RLS (solo admins pueden modificar)
4. Una función `get_subscription_limits()` para obtener límites
5. Actualiza `check_subscription_limit()` para usar la base de datos

## 🔐 Permisos

- **Lectura**: Todos los usuarios autenticados pueden leer los límites
- **Escritura**: Solo usuarios con rol `admin` pueden modificar los límites

## ⚠️ Notas Importantes

1. **Regenerar Tipos TypeScript**: Después de ejecutar la migración, regenera los tipos:
   ```bash
   npx supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```
   O si estás usando Supabase Cloud:
   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
   ```

2. **Valores Actuales**: Los valores iniciales en la base de datos coinciden con los valores hardcodeados anteriores para mantener consistencia.

3. **Fallback**: El código tiene un sistema de fallback que usa valores por defecto si la base de datos no está disponible, asegurando que la aplicación siga funcionando.

4. **Función SQL**: La función `check_subscription_limit()` en la base de datos también fue actualizada para usar la tabla `subscription_limits`, manteniendo la consistencia entre el código TypeScript y las funciones SQL.

## 🚀 Próximos Pasos

1. Ejecutar la migración en producción
2. Regenerar los tipos TypeScript
3. (Opcional) Crear una interfaz de administración para gestionar límites
4. (Opcional) Agregar historial de cambios de límites para auditoría

