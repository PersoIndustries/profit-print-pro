# Validación de Seguridad - Base de Datos

Este documento describe cómo validar que todas las tablas de la base de datos tienen la seguridad correcta implementada.

## Objetivos de la Validación

La validación verifica que:

1. ✅ **RLS (Row Level Security) habilitado**: Todas las tablas tienen RLS activo
2. ✅ **Políticas RLS correctas**: Cada tabla tiene políticas para SELECT, INSERT, UPDATE, DELETE
3. ✅ **Vinculación a user_id**: Todas las tablas están vinculadas a un usuario específico
4. ✅ **Aislamiento de datos**: Los usuarios no pueden ver datos de otros usuarios

## Métodos de Validación

### Método 1: Script Node.js (Recomendado)

Ejecuta el script de validación:

```bash
node scripts/validate-security-direct.js
```

Este script:
- Verifica que todas las tablas conocidas existen
- Comprueba que tienen RLS habilitado
- Verifica que tienen la columna `user_id` cuando es necesario
- Genera un reporte con issues y advertencias

### Método 2: SQL Directo (Más Completo)

Ejecuta el SQL en el Supabase Dashboard → SQL Editor:

```sql
-- Ver contenido del archivo:
-- supabase/migrations/20251119000000_validate_security.sql
```

Este script SQL proporciona:
- Lista de todas las tablas con estado de RLS
- Número de políticas por tabla
- Tablas sin políticas RLS
- Verificación de columnas `user_id`
- Resumen estadístico completo

## Tablas del Sistema

Algunas tablas no necesitan `user_id` porque son tablas del sistema:

- `tier_features`: Configuración de features por tier
- `promo_codes`: Códigos promocionales del sistema
- `profiles`: Usa `id` como `user_id` (referencia directa a auth.users)

## Tablas Relacionales

Algunas tablas están protegidas indirectamente a través de tablas padre:

- `order_items`: Protegida por `orders.user_id`
- `print_materials`: Protegida por `prints.user_id`
- `project_materials`: Protegida por `projects.user_id`
- `catalog_projects`: Protegida por `catalogs.user_id`
- `catalog_sections`: Protegida por `catalogs.user_id`
- `shopping_list`: Protegida por `shopping_lists.user_id`

Estas tablas tienen políticas RLS que verifican el `user_id` de la tabla padre.

## Políticas RLS Requeridas

Cada tabla debe tener al menos estas políticas:

1. **SELECT**: `USING (auth.uid() = user_id)` - Ver solo propios datos
2. **INSERT**: `WITH CHECK (auth.uid() = user_id)` - Insertar solo con su user_id
3. **UPDATE**: `USING (auth.uid() = user_id)` - Actualizar solo propios datos
4. **DELETE**: `USING (auth.uid() = user_id)` - Eliminar solo propios datos

## Ejemplo de Política Correcta

```sql
-- Ejemplo para tabla materials
CREATE POLICY "Users can view own materials"
  ON public.materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own materials"
  ON public.materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own materials"
  ON public.materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own materials"
  ON public.materials FOR DELETE
  USING (auth.uid() = user_id);
```

## Verificación Manual

Si prefieres verificar manualmente:

1. Ve a Supabase Dashboard → Authentication → Policies
2. Revisa cada tabla y verifica:
   - RLS está habilitado (toggle verde)
   - Existen políticas para todas las operaciones
   - Las políticas usan `auth.uid() = user_id`

## Solución de Problemas

### Error: "Tabla no tiene RLS habilitado"

Ejecuta:
```sql
ALTER TABLE public.nombre_tabla ENABLE ROW LEVEL SECURITY;
```

### Error: "Tabla no tiene políticas RLS"

Crea las políticas necesarias:
```sql
CREATE POLICY "Users can view own nombre_tabla"
  ON public.nombre_tabla FOR SELECT
  USING (auth.uid() = user_id);
-- Repite para INSERT, UPDATE, DELETE
```

### Error: "Tabla no tiene columna user_id"

Agrega la columna:
```sql
ALTER TABLE public.nombre_tabla
ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
```

## Checklist de Seguridad

Antes de desplegar, verifica:

- [ ] Todas las tablas tienen RLS habilitado
- [ ] Todas las tablas tienen políticas RLS para SELECT, INSERT, UPDATE, DELETE
- [ ] Todas las tablas tienen `user_id` (excepto tablas del sistema)
- [ ] Las políticas usan `auth.uid() = user_id`
- [ ] Las tablas relacionales están protegidas por tablas padre
- [ ] El script de validación pasa sin errores

## Contacto

Si encuentras problemas de seguridad, repórtalos inmediatamente.

