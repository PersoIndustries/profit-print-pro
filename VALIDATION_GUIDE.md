# Guía de Validación

## Scripts de Validación Disponibles

### 1. Validación Rápida de Impresoras
Verifica que la migración de impresoras esté correcta:

```bash
npm run validate:printers
```

O directamente:
```bash
node scripts/quick-validate-printers.js
```

**Qué verifica:**
- ✅ Tabla existe
- ✅ Estructura correcta (todas las columnas)
- ✅ RLS (Row Level Security) activo
- ✅ Políticas RLS configuradas
- ✅ Base de datos accesible

### 2. Validación Completa de Impresoras
Validación detallada con más checks:

```bash
node scripts/validate-printers-migration.js
```

**Qué verifica:**
- Todo lo de la validación rápida
- ✅ Índices funcionando
- ✅ Trigger de `updated_at`
- ✅ Rendimiento de consultas

### 3. Validación de Conexión General
Verifica que la conexión con Supabase funcione:

```bash
npm run validate:connection
```

O directamente:
```bash
node scripts/test-connection.js
```

**Qué verifica:**
- ✅ Variables de entorno configuradas
- ✅ Conexión con Supabase
- ✅ Acceso a tablas principales
- ✅ Sistema de autenticación

## Cuándo Usar Cada Validación

### Después de una Migración
```bash
npm run validate:printers
```
Usa esto después de ejecutar cualquier migración relacionada con impresoras.

### Al Configurar el Proyecto
```bash
npm run validate:connection
```
Usa esto cuando configures las variables de entorno por primera vez.

### Antes de un Deploy
Ejecuta ambas validaciones:
```bash
npm run validate:connection && npm run validate:printers
```

## Interpretación de Resultados

### ✅ Todas las Validaciones Pasaron
```
🎉 ¡Todo está correcto! La migración fue exitosa.
```
**Acción:** Puedes continuar usando la funcionalidad normalmente.

### ⚠️ Algunas Validaciones Fallaron
```
⚠️ Algunas validaciones no pasaron. Revisa los detalles arriba.
```
**Acción:** 
1. Revisa los mensajes de error específicos
2. Verifica que la migración se ejecutó correctamente
3. Revisa las políticas RLS en Supabase Dashboard

### ❌ Validaciones Críticas Fallaron
Si la tabla no existe o RLS no está activo:
1. Ejecuta la migración nuevamente
2. Verifica que tienes permisos en Supabase
3. Revisa los logs en Supabase Dashboard

## Validación Manual desde Supabase Dashboard

También puedes validar manualmente:

1. **Verificar tabla:**
   - Ve a Table Editor → Busca "printers"
   - Verifica que todas las columnas estén presentes

2. **Verificar RLS:**
   - Ve a Authentication → Policies
   - Busca políticas para la tabla "printers"
   - Deberías ver 4 políticas (SELECT, INSERT, UPDATE, DELETE)

3. **Verificar índices:**
   - Ve a Database → Indexes
   - Busca índices en la tabla "printers"
   - Deberías ver: `idx_printers_user_id` y `idx_printers_brand`

4. **Verificar trigger:**
   - Ve a Database → Functions
   - Busca `update_updated_at_column`
   - Verifica que esté asociado a la tabla "printers"

## Troubleshooting

### Error: "Table does not exist"
**Solución:** Ejecuta la migración desde Supabase Dashboard → SQL Editor

### Error: "RLS not enabled"
**Solución:** Ejecuta: `ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;`

### Error: "Policies not found"
**Solución:** Revisa el archivo de migración y ejecuta las políticas manualmente

### Error: "Connection failed"
**Solución:** 
1. Verifica `.env.local` tiene las variables correctas
2. Verifica que las variables en Netlify estén configuradas
3. Ejecuta `npm run validate:connection`

## Automatización

Puedes agregar estas validaciones a tu CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Validate Printers Migration
  run: npm run validate:printers
```

O en un pre-commit hook para validar antes de hacer commit.

