/**
 * Intento de ejecutar migración usando Management API de Supabase
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251115000000_create_printers_table.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

async function executeViaManagementAPI() {
  console.log('🔧 Intentando ejecutar migración usando Management API...\n');

  try {
    // Obtener project ID
    const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectId) {
      throw new Error('No se pudo extraer el project ID');
    }

    console.log(`📊 Project ID: ${projectId}\n`);

    // La Management API normalmente requiere un access token, no la service role key
    // Pero intentemos usar el endpoint de database SQL execution
    // Nota: Esto normalmente no funciona con service role key, pero intentemos
    
    const managementBaseUrl = `https://api.supabase.com/v1/projects/${projectId}`;
    
    console.log('⚠️  La Management API de Supabase requiere un access token especial.');
    console.log('   La Service Role Key no es suficiente para ejecutar SQL DDL.\n');
    console.log('📋 OPCIONES DISPONIBLES:\n');
    console.log('1. Ejecutar manualmente desde Supabase Dashboard (RECOMENDADO)');
    console.log('   - Ve a: https://supabase.com/dashboard/project/' + projectId + '/sql/new');
    console.log('   - Copia y pega el SQL de la migración\n');
    
    console.log('2. Instalar Supabase CLI y ejecutar:');
    console.log('   npm install -g supabase');
    console.log('   supabase link --project-ref ' + projectId);
    console.log('   supabase db push\n');
    
    console.log('3. Usar psql directamente (si tienes las credenciales de conexión)\n');
    
    console.log('📝 SQL para copiar:\n');
    console.log('─'.repeat(70));
    console.log(migrationSQL);
    console.log('─'.repeat(70));
    console.log('\n');

    // Verificar estado actual
    console.log('🔍 Verificando estado actual de la tabla...\n');
    try {
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/printers?select=id&limit=1`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (checkResponse.ok) {
        console.log('✅ La tabla "printers" ya existe en la base de datos');
        console.log('   La migración puede que ya haya sido ejecutada.\n');
      } else {
        const errorText = await checkResponse.text();
        if (errorText.includes('does not exist') || checkResponse.status === 404) {
          console.log('ℹ️  La tabla "printers" no existe aún');
          console.log('   Ejecuta la migración usando una de las opciones arriba.\n');
        } else {
          console.log('⚠️  Error al verificar:', errorText.substring(0, 200));
        }
      }
    } catch (error) {
      console.log('ℹ️  No se pudo verificar el estado (esto es normal si la tabla no existe)');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

executeViaManagementAPI();

