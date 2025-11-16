/**
 * Script para ejecutar la migración de impresoras
 * Ejecutar con: node scripts/run-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Cargar variables de entorno desde .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Ejecutando migración de impresoras...\n');

// Verificar variables
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL no está definida');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY no está definida');
  console.error('   Necesitas la Service Role Key para ejecutar migraciones');
  console.error('   Obténla desde: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Crear cliente admin
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Leer el archivo de migración
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251115000000_create_printers_table.sql');
let migrationSQL;

try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
} catch (error) {
  console.error('❌ Error al leer el archivo de migración:', error.message);
  process.exit(1);
}

// Ejecutar la migración usando RPC o directamente
async function runMigration() {
  try {
    console.log('📝 Contenido de la migración:');
    console.log('─'.repeat(50));
    console.log(migrationSQL.substring(0, 200) + '...\n');
    console.log('─'.repeat(50) + '\n');

    // Dividir el SQL en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Ejecutando ${statements.length} statements...\n`);

    // Ejecutar cada statement usando el cliente de Supabase
    // Nota: Supabase JS client no tiene un método directo para ejecutar SQL arbitrario
    // Necesitamos usar el REST API directamente o ejecutar desde el dashboard
    
    console.log('⚠️  Nota: El cliente JS de Supabase no puede ejecutar SQL arbitrario directamente.');
    console.log('   Tienes dos opciones:\n');
    console.log('   1. Ejecutar manualmente desde Supabase Dashboard:');
    console.log('      - Ve a SQL Editor');
    console.log('      - Copia y pega el contenido del archivo:');
    console.log(`      ${migrationPath}\n`);
    console.log('   2. Usar Supabase CLI:');
    console.log('      supabase db push\n');
    
    // Verificar si la tabla ya existe
    console.log('🔍 Verificando si la tabla ya existe...');
    const { data: existingTable, error: checkError } = await supabaseAdmin
      .from('printers')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ La tabla "printers" ya existe en la base de datos');
      console.log('   La migración puede que ya haya sido ejecutada.\n');
    } else if (checkError.code === '42P01') {
      console.log('ℹ️  La tabla "printers" no existe aún');
      console.log('   Necesitas ejecutar la migración manualmente.\n');
    } else {
      console.log('⚠️  Error al verificar:', checkError.message);
    }

    console.log('📋 Para ejecutar la migración, copia este SQL en Supabase Dashboard → SQL Editor:\n');
    console.log('─'.repeat(50));
    console.log(migrationSQL);
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error al ejecutar migración:');
    console.error(error.message);
    process.exit(1);
  }
}

runMigration();

