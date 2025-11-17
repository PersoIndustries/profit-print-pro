# Configuración de Cron Job para check-expired-trials

## Descripción

La edge function `check-expired-trials` se ha creado y se desplegará automáticamente. Esta función verifica y actualiza automáticamente las suscripciones de prueba que han expirado.

## Configuración del Cron Job

Para automatizar la verificación diaria, configura un cron job en Supabase ejecutando este SQL:

### Paso 1: Habilitar la extensión pg_cron

Primero, asegúrate de que la extensión `pg_cron` esté habilitada:

```sql
-- Habilitar la extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Paso 2: Habilitar la extensión http (si es necesario)

Para hacer llamadas HTTP desde PostgreSQL, necesitas la extensión `http`:

```sql
-- Habilitar la extensión http
CREATE EXTENSION IF NOT EXISTS http;
```

### Paso 3: Configurar el Cron Job

Ejecuta este SQL en el **SQL Editor** de Supabase Dashboard:

```sql
SELECT cron.schedule(
  'check-expired-trials',  -- Nombre del cron job
  '0 2 * * *',            -- Ejecuta a las 2 AM diariamente (formato cron)
  $$
  SELECT net.http_post(
    url := 'https://qjacgxvzjfjxytfggqro.supabase.co/functions/v1/check-expired-trials',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

**⚠️ IMPORTANTE:** Reemplaza `TU_SERVICE_ROLE_KEY` con tu Service Role Key real. Puedes obtenerla desde:
- Supabase Dashboard → Settings → API → `service_role` key

### Formato del Cron Expression

El formato `'0 2 * * *'` significa:
- `0` - minuto 0
- `2` - hora 2 (2 AM)
- `*` - cualquier día del mes
- `*` - cualquier mes
- `*` - cualquier día de la semana

**Ejemplos de otros horarios:**
- `'0 */6 * * *'` - Cada 6 horas
- `'0 0 * * *'` - Medianoche diariamente
- `'0 2 * * 1'` - Cada lunes a las 2 AM

## Verificar que el Cron Job está Configurado

Para ver los cron jobs configurados:

```sql
SELECT * FROM cron.job;
```

Para ver el historial de ejecuciones:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-expired-trials')
ORDER BY start_time DESC 
LIMIT 10;
```

## Eliminar el Cron Job (si es necesario)

Si necesitas eliminar el cron job:

```sql
SELECT cron.unschedule('check-expired-trials');
```

## Notas Importantes

1. **Seguridad**: La Service Role Key tiene acceso completo a tu base de datos. Mantén el SQL seguro y no lo compartas públicamente.

2. **URL de la función**: Asegúrate de que la URL de la edge function sea correcta. Debería ser:
   `https://TU_PROJECT_ID.supabase.co/functions/v1/check-expired-trials`

3. **Verificación manual**: Puedes probar la función manualmente haciendo una petición HTTP:
   ```bash
   curl -X POST https://qjacgxvzjfjxytfggqro.supabase.co/functions/v1/check-expired-trials \
     -H "Authorization: Bearer TU_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

4. **Logs**: Puedes ver los logs de la edge function en:
   - Supabase Dashboard → Edge Functions → check-expired-trials → Logs

## Troubleshooting

### El cron job no se ejecuta
- Verifica que `pg_cron` esté habilitado
- Verifica que la extensión `http` esté habilitada
- Revisa los logs de cron: `SELECT * FROM cron.job_run_details WHERE status = 'failed'`

### La función no se ejecuta correctamente
- Verifica que la URL de la edge function sea correcta
- Verifica que el Service Role Key sea válido
- Revisa los logs de la edge function en el dashboard

### Error de permisos
- Asegúrate de tener permisos para crear cron jobs
- Algunos planes de Supabase pueden tener limitaciones en pg_cron

