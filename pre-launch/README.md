# 📋 Pre-Lanzamiento - Validaciones y Checklist

Esta carpeta contiene todos los recursos necesarios para validar la aplicación antes del lanzamiento.

## 📁 Estructura

```
pre-launch/
├── README.md                    # Este archivo
├── scripts/                     # Scripts de validación automatizados
├── docs/                        # Documentación detallada
├── checklists/                  # Checklists manuales
└── sql/                         # Scripts SQL de validación
```

## 🚀 Inicio Rápido

### 1. Validación de Seguridad
```bash
node pre-launch/scripts/validate-security.js
```

### 2. Validación Completa Pre-Lanzamiento
```bash
node pre-launch/scripts/pre-launch-validation.js
```

### 3. Revisar Checklist Manual
Abre `pre-launch/checklists/PRE_LAUNCH_CHECKLIST.md` y marca cada item.

## 📚 Documentación

- **[PRE_LAUNCH_CHECKLIST.md](./checklists/PRE_LAUNCH_CHECKLIST.md)**: Checklist completo manual
- **[SECURITY_VALIDATION.md](./docs/SECURITY_VALIDATION.md)**: Guía de validación de seguridad
- **[VALIDATION_GUIDE.md](./docs/VALIDATION_GUIDE.md)**: Guía general de validaciones

## 🔧 Scripts Disponibles

### Seguridad
- `validate-security.js` - Validación completa de seguridad (RLS, políticas, user_id)
- `validate-security-direct.js` - Validación rápida de seguridad
- `validate-security-simple.js` - Validación simplificada

### Funcionalidad
- `pre-launch-validation.js` - Validación completa pre-lanzamiento
- `validate-order-statuses.js` - Validación de estados de pedidos
- `validate-printers-migration.js` - Validación de migración de impresoras

### Conexión
- `test-connection.js` - Probar conexión con Supabase
- `test-admin-connection.ts` - Probar conexión admin

## 📝 Proceso Recomendado

1. **Ejecutar validaciones automáticas**
   ```bash
   node pre-launch/scripts/pre-launch-validation.js
   ```

2. **Revisar checklist manual**
   - Abre `pre-launch/checklists/PRE_LAUNCH_CHECKLIST.md`
   - Marca cada item mientras lo verificas

3. **Validar seguridad específica**
   ```bash
   node pre-launch/scripts/validate-security.js
   ```

4. **Ejecutar SQL de validación** (opcional)
   - Ve a Supabase Dashboard → SQL Editor
   - Ejecuta `pre-launch/sql/validate_security.sql`

5. **Tests manuales**
   - Crear usuarios de prueba (Free, Pro, Business)
   - Probar flujos principales
   - Verificar edge cases

## ⚠️ Antes de Lanzar

- [ ] Todas las validaciones automáticas pasan
- [ ] Checklist manual completado
- [ ] Tests manuales realizados
- [ ] Backup de base de datos creado
- [ ] Variables de entorno configuradas en producción
- [ ] Documentación actualizada

## 🆘 Problemas Comunes

### Error: "Faltan variables de entorno"
- Verifica que `.env.local` existe
- Verifica que tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Error: "Tabla no existe"
- Puede ser normal si la tabla no se ha migrado aún
- Verifica las migraciones en `supabase/migrations/`

### Error: "RLS no habilitado"
- Ejecuta la migración correspondiente
- Verifica en Supabase Dashboard → Authentication → Policies

## 📞 Soporte

Si encuentras problemas durante la validación:
1. Revisa los logs del script
2. Consulta la documentación en `pre-launch/docs/`
3. Verifica las migraciones en `supabase/migrations/`

