# Verificación de Conexión con Supabase

## Estado Actual

El proyecto está configurado para usar variables de entorno para conectarse a Supabase. Esto permite:

✅ **Seguridad**: Las credenciales no están hardcodeadas en el código
✅ **Flexibilidad**: Fácil cambio entre ambientes (desarrollo, producción)
✅ **Mantenibilidad**: Un solo lugar para actualizar las credenciales

## Cómo Verificar la Conexión

### 1. Verificación en Desarrollo Local

1. Asegúrate de tener un archivo `.env.local` en la raíz del proyecto con:
   ```env
   VITE_SUPABASE_URL=https://qjacgxvzjfjxytfggqro.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abre la consola del navegador (F12) y verifica:
   - **Si ves errores sobre variables faltantes**: Las variables no están configuradas correctamente
   - **Si la app carga normalmente**: La conexión está funcionando

### 2. Verificación en Producción (Netlify)

1. **Configura las variables en Netlify**:
   - Ve a tu proyecto en [Netlify Dashboard](https://app.netlify.com)
   - Navega a **Site settings** → **Environment variables**
   - Agrega:
     - `VITE_SUPABASE_URL` = `https://qjacgxvzjfjxytfggqro.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI`

2. **Haz un nuevo deploy**:
   - Si tienes auto-deploy activado, solo haz push a tu repositorio
   - O manualmente: **Deploys** → **Trigger deploy** → **Deploy site**

3. **Verifica el deploy**:
   - Abre tu sitio en producción
   - Abre la consola del navegador (F12)
   - Intenta iniciar sesión o realizar cualquier acción que use Supabase
   - Si funciona, la conexión está correcta

## Errores Comunes y Soluciones

### Error: "Missing env.VITE_SUPABASE_URL"

**Causa**: La variable de entorno no está definida o no está disponible en el cliente.

**Solución**:
- En desarrollo: Crea/verifica el archivo `.env.local` en la raíz del proyecto
- En producción: Verifica que las variables estén configuradas en Netlify
- **Importante**: Las variables deben comenzar con `VITE_` para que Vite las exponga al cliente

### Error: "Missing env.VITE_SUPABASE_ANON_KEY"

**Causa**: Similar al anterior, pero para la clave de autenticación.

**Solución**: Misma que la anterior.

### La app carga pero no se conecta a Supabase

**Posibles causas**:
1. Las variables están definidas pero con valores incorrectos
2. Problemas de red/CORS
3. El proyecto de Supabase está pausado o inactivo

**Solución**:
1. Verifica los valores en el dashboard de Supabase
2. Verifica que el proyecto de Supabase esté activo
3. Revisa la consola del navegador para errores específicos de Supabase

## Próximos Pasos

Una vez que verifiques que la conexión funciona:

1. ✅ Variables de entorno configuradas
2. ⏭️ Limpiar console.logs (opcional, no crítico)
3. ⏭️ Mejorar tipos TypeScript (opcional)
4. ⏭️ Agregar tests (futuro)

## Notas Importantes

- Las variables `VITE_*` son **públicas** y se incluyen en el bundle del cliente
- La "anon key" de Supabase está diseñada para ser pública, pero aún así es buena práctica mantenerla en variables de entorno
- Nunca commitees archivos `.env.local` o `.env` con valores reales al repositorio


