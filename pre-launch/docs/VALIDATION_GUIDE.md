# Guía de Validación Pre-Lanzamiento

Esta guía explica cómo usar todos los scripts y herramientas de validación.

## 📋 Tipos de Validación

### 1. Validación de Seguridad

Verifica que todas las tablas tienen:
- ✅ RLS (Row Level Security) habilitado
- ✅ Políticas RLS correctas
- ✅ Columna `user_id` donde es necesario
- ✅ Aislamiento de datos entre usuarios

**Scripts:**
- `validate-security-direct.js` - Validación rápida y directa
- `validate-security-simple.js` - Validación simplificada
- `validate-security.js` - Validación completa con más detalles

**Uso:**
```bash
node pre-launch/scripts/validate-security-direct.js
```

### 2. Validación Pre-Lanzamiento Completa

Verifica:
- 🔒 Seguridad
- 🗄️ Base de datos
- 🌍 Variables de entorno
- 💻 Calidad de código
- ⚙️ Funcionalidad
- 🎨 UX
- ⚡ Rendimiento
- 🚀 Despliegue
- 📚 Documentación
- 🧪 Testing

**Script:**
- `pre-launch-validation.js`

**Uso:**
```bash
node pre-launch/scripts/pre-launch-validation.js
```

### 3. Validación SQL

Para análisis más detallado, ejecuta el SQL en Supabase Dashboard:

**Archivo:**
- `sql/validate_security.sql`

**Uso:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido del archivo
3. Ejecuta y revisa los resultados

## 🔄 Proceso de Validación

### Paso 1: Validaciones Automáticas

Ejecuta todas las validaciones automáticas:

```bash
# Opción 1: Ejecutar todas las validaciones
node pre-launch/scripts/validate-all.js

# Opción 2: Ejecutar validaciones individuales
node pre-launch/scripts/validate-security-direct.js
node pre-launch/scripts/pre-launch-validation.js
```

### Paso 2: Checklist Manual

Abre `pre-launch/checklists/PRE_LAUNCH_CHECKLIST.md` y marca cada item mientras lo verificas manualmente.

### Paso 3: Tests Manuales

1. **Crear usuarios de prueba:**
   - Usuario Free
   - Usuario Pro
   - Usuario Business

2. **Probar flujos principales:**
   - Registro de usuario
   - Crear/editar/eliminar material
   - Crear proyecto
   - Crear pedido
   - Gestionar inventario
   - Aplicar código promocional

3. **Probar edge cases:**
   - Datos vacíos
   - Valores extremos
   - Intentar acceder a datos de otros usuarios
   - Intentar acceder a features sin permisos

### Paso 4: Validación SQL (Opcional)

Para análisis más detallado:
1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta `pre-launch/sql/validate_security.sql`
3. Revisa los resultados

## 📊 Interpretación de Resultados

### ✅ Validación Pasada
- No hay errores críticos
- Puede haber advertencias menores
- Proceder con el siguiente paso

### ⚠️ Advertencias
- No son críticas pero deben revisarse
- Pueden indicar mejoras posibles
- No bloquean el lanzamiento

### ❌ Errores Críticos
- Deben resolverse antes del lanzamiento
- Indican problemas de seguridad o funcionalidad
- Bloquean el lanzamiento

## 🔧 Solución de Problemas

### Error: "Faltan variables de entorno"

**Solución:**
1. Verifica que `.env.local` existe en la raíz del proyecto
2. Verifica que contiene:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
3. Si no existe, créalo basándote en `.env.example`

### Error: "Tabla no existe"

**Solución:**
1. Verifica que las migraciones se han ejecutado
2. Ve a Supabase Dashboard → Database → Migrations
3. Ejecuta las migraciones pendientes

### Error: "RLS no habilitado"

**Solución:**
1. Ve a Supabase Dashboard → Authentication → Policies
2. Verifica que RLS está habilitado para la tabla
3. Si no, ejecuta:
   ```sql
   ALTER TABLE public.nombre_tabla ENABLE ROW LEVEL SECURITY;
   ```

### Error: "Sin políticas RLS"

**Solución:**
1. Crea las políticas necesarias:
   ```sql
   CREATE POLICY "Users can view own nombre_tabla"
     ON public.nombre_tabla FOR SELECT
     USING (auth.uid() = user_id);
   ```
2. Repite para INSERT, UPDATE, DELETE

## 📝 Checklist Rápido

Antes de ejecutar las validaciones:

- [ ] Variables de entorno configuradas
- [ ] Migraciones aplicadas
- [ ] Base de datos accesible
- [ ] Scripts en la ubicación correcta

Después de ejecutar las validaciones:

- [ ] Revisar todos los resultados
- [ ] Resolver errores críticos
- [ ] Revisar advertencias
- [ ] Completar checklist manual
- [ ] Realizar tests manuales

## 🎯 Objetivo Final

El objetivo es asegurar que:
1. ✅ La aplicación es segura
2. ✅ Los usuarios no pueden ver datos de otros
3. ✅ Todas las features funcionan correctamente
4. ✅ Los límites por tier se respetan
5. ✅ La experiencia de usuario es buena
6. ✅ El rendimiento es aceptable

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del script
2. Consulta la documentación en `pre-launch/docs/`
3. Verifica las migraciones en `supabase/migrations/`

