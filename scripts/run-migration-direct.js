/**
 * Script para ejecutar la migración directamente usando la API REST de Supabase
 * Ejecutar con: node scripts/run-migration-direct.js
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

// Leer migración
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251115000000_create_printers_table.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

async function executeMigration() {
  console.log('🔧 Ejecutando migración de impresoras usando API REST...\n');

  try {
    // Dividir SQL en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Ejecutando ${statements.length} statements...\n`);

    // Ejecutar cada statement usando la API REST de PostgREST
    // Nota: PostgREST no ejecuta DDL directamente, necesitamos usar la API de Management
    const managementUrl = SUPABASE_URL.replace('/rest/v1', '');
    
    // Intentar usar la API de Management de Supabase
    const response = await fetch(`${managementUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migración ejecutada exitosamente');
      console.log(result);
      return;
    }

    // Si no funciona, mostrar instrucciones manuales
    console.log('⚠️  No se puede ejecutar SQL DDL desde la API REST de Supabase.');
    console.log('   Necesitas ejecutar la migración manualmente.\n');
    
    console.log('📋 INSTRUCCIONES PARA EJECUTAR LA MIGRACIÓN:\n');
    console.log('1. Ve a: https://supabase.com/dashboard');
    console.log('2. Selecciona tu proyecto');
    console.log('3. Ve a "SQL Editor" en el menú lateral');
    console.log('4. Haz clic en "New query"');
    console.log('5. Copia y pega el siguiente SQL:\n');
    console.log('─'.repeat(70));
    console.log(migrationSQL);
    console.log('─'.repeat(70));
    console.log('\n6. Haz clic en "Run" o presiona Ctrl+Enter');
    console.log('7. Verifica que no haya errores\n');

    // Verificar si la tabla ya existe
    console.log('🔍 Verificando estado actual...\n');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/printers?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (checkResponse.ok) {
      console.log('✅ La tabla "printers" ya existe en la base de datos');
      console.log('   La migración puede que ya haya sido ejecutada.\n');
    } else if (checkResponse.status === 404) {
      console.log('ℹ️  La tabla "printers" no existe aún');
      console.log('   Ejecuta la migración siguiendo las instrucciones arriba.\n');
    } else {
      const errorText = await checkResponse.text();
      if (errorText.includes('relation "public.printers" does not exist')) {
        console.log('ℹ️  La tabla "printers" no existe aún');
        console.log('   Ejecuta la migración siguiendo las instrucciones arriba.\n');
      } else {
        console.log('⚠️  Error al verificar:', errorText);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 Ejecuta la migración manualmente desde Supabase Dashboard\n');
  }
}

executeMigration();

