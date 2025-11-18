# Checklist Pre-Lanzamiento

Este documento contiene un checklist completo de validaciones antes de lanzar la aplicación a usuarios.

## 🔒 1. Seguridad

### Base de Datos
- [ ] **RLS habilitado** en todas las tablas
- [ ] **Políticas RLS** correctas para SELECT, INSERT, UPDATE, DELETE
- [ ] **user_id** presente en todas las tablas que lo necesitan
- [ ] **Aislamiento de datos**: Usuarios no pueden ver datos de otros
- [ ] **Foreign keys** correctamente configuradas
- [ ] **Constraints** (NOT NULL, UNIQUE, CHECK) aplicados

### Autenticación
- [ ] **Políticas de contraseña** configuradas (mínimo 6 caracteres)
- [ ] **Email verification** habilitado
- [ ] **Password reset** funciona correctamente
- [ ] **Sesiones** se invalidan correctamente al cerrar sesión

### Autorización
- [ ] **Tier-based access** funciona correctamente
- [ ] Usuarios Free no pueden acceder a features Pro/Business
- [ ] Usuarios Pro tienen acceso a features Pro
- [ ] Usuarios Business tienen acceso completo

## 🗄️ 2. Base de Datos

### Estructura
- [ ] Todas las **migraciones** aplicadas
- [ ] **Índices** en columnas frecuentemente consultadas (user_id, foreign keys)
- [ ] **Triggers** funcionando correctamente (updated_at, logs)
- [ ] **Funciones RPC** tienen SECURITY DEFINER cuando es necesario

### Datos
- [ ] **Backup** configurado
- [ ] **Datos de prueba** eliminados (si aplica)
- [ ] **Datos sensibles** no están en la base de datos

## 🌍 3. Variables de Entorno

### Desarrollo
- [ ] `.env.local` existe y tiene todas las variables
- [ ] No hay valores placeholder (`your_supabase_url`, etc.)
- [ ] Variables están en `.gitignore`

### Producción
- [ ] Todas las variables están en Netlify/Vercel
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` NO está expuesta al cliente

## 💻 4. Calidad de Código

### Código
- [ ] **console.log()** eliminados de código de producción
- [ ] **Manejo de errores** en todas las operaciones async
- [ ] **Validación de inputs** en todos los formularios
- [ ] **No hay datos sensibles** hardcodeados
- [ ] **TypeScript** sin errores de tipo

### Estructura
- [ ] Código organizado y comentado donde es necesario
- [ ] Componentes reutilizables
- [ ] Hooks personalizados bien estructurados

## ⚙️ 5. Funcionalidad

### CRUD Básico
- [ ] ✅ Crear material
- [ ] ✅ Editar material
- [ ] ✅ Eliminar material
- [ ] ✅ Crear proyecto
- [ ] ✅ Editar proyecto
- [ ] ✅ Eliminar proyecto
- [ ] ✅ Crear pedido
- [ ] ✅ Actualizar estado de pedido
- [ ] ✅ Registrar adquisición
- [ ] ✅ Registrar desperdicio
- [ ] ✅ Agregar a lista de compra
- [ ] ✅ Crear lista de compra

### Features por Tier
- [ ] **Free**: Puede ver materiales pero no stock
- [ ] **Pro**: Puede ver stock y gestionar inventario
- [ ] **Business**: Acceso completo a historial y todas las features

### Límites por Tier
- [ ] Límite de materiales respetado
- [ ] Límite de proyectos respetado
- [ ] Límite de pedidos mensuales respetado
- [ ] Mensajes claros cuando se alcanzan límites

## 🎨 6. Experiencia de Usuario

### Mensajes
- [ ] **Errores** muestran mensajes claros y útiles
- [ ] **Éxito** muestra confirmaciones
- [ ] **Loading states** visibles en operaciones async
- [ ] **Validación en tiempo real** en formularios

### Navegación
- [ ] Menú funciona correctamente
- [ ] Breadcrumbs/links correctos
- [ ] Botones de navegación funcionan
- [ ] No hay links rotos

### Responsive
- [ ] Funciona en móvil
- [ ] Funciona en tablet
- [ ] Funciona en desktop
- [ ] Tablas son scrollables en móvil

## ⚡ 7. Rendimiento

### Queries
- [ ] Queries usan `.select()` específico, no `*`
- [ ] Paginación en listas grandes
- [ ] Lazy loading de imágenes
- [ ] Índices en columnas consultadas frecuentemente

### Frontend
- [ ] Bundle size optimizado
- [ ] Imágenes optimizadas
- [ ] Lazy loading de componentes pesados
- [ ] Code splitting implementado

## 🚀 8. Despliegue

### Build
- [ ] Build de producción funciona sin errores
- [ ] No hay warnings críticos en el build
- [ ] Variables de entorno configuradas en producción

### Infraestructura
- [ ] **SSL/HTTPS** habilitado
- [ ] **CORS** configurado correctamente en Supabase
- [ ] **Rate limiting** configurado (si aplica)
- [ ] **CDN** configurado (si aplica)

### Monitoreo
- [ ] **Error tracking** configurado (Sentry, etc.)
- [ ] **Analytics** configurado (si aplica)
- [ ] **Logs** accesibles

## 📚 9. Documentación

### Código
- [ ] README.md actualizado
- [ ] Comentarios en código complejo
- [ ] Documentación de funciones RPC

### Usuario
- [ ] Guía de uso (si aplica)
- [ ] FAQ (si aplica)
- [ ] Términos y condiciones
- [ ] Política de privacidad

## 🧪 10. Testing

### Tests Manuales
- [ ] **Flujo completo** de usuario nuevo (registro → uso básico)
- [ ] **Flujo de upgrade** de tier
- [ ] **Flujo de cancelación** de suscripción
- [ ] **Edge cases**: datos vacíos, valores extremos, etc.

### Tests de Seguridad
- [ ] Intentar acceder a datos de otros usuarios (debe fallar)
- [ ] Intentar acceder a features sin permisos (debe fallar)
- [ ] Verificar que RLS bloquea accesos no autorizados

### Tests de Usuarios
- [ ] Crear usuario **Free** y verificar límites
- [ ] Crear usuario **Pro** y verificar acceso
- [ ] Crear usuario **Business** y verificar acceso completo

## 🔍 11. Validación Final

### Scripts Automáticos
```bash
# Validación de seguridad
node scripts/validate-security-direct.js

# Validación pre-lanzamiento completa
node scripts/pre-launch-validation.js
```

### Checklist Manual
- [ ] Revisar todos los items de este documento
- [ ] Probar la aplicación como usuario nuevo
- [ ] Probar la aplicación como usuario existente
- [ ] Verificar en diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Verificar en diferentes dispositivos

## 📝 Notas Adicionales

### Antes de Lanzar
1. **Backup completo** de la base de datos
2. **Documentar** cualquier configuración especial
3. **Comunicar** al equipo sobre el lanzamiento
4. **Preparar** plan de rollback si algo sale mal

### Después de Lanzar
1. **Monitorear** errores y logs
2. **Revisar** feedback de usuarios
3. **Aplicar** hotfixes si es necesario
4. **Documentar** problemas encontrados

## 🆘 Contacto de Emergencia

En caso de problemas críticos:
- Revisar logs en Supabase Dashboard
- Revisar logs en Netlify/Vercel
- Verificar estado de servicios externos
- Tener plan de rollback listo

