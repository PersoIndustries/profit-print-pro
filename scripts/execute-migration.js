/**
 * Script para ejecutar la migración usando el cliente admin
 * Ejecutar con: node scripts/execute-migration.js
 */

import { createClient } from '@supabase/supabase-js';
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
  console.error('   Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

// Crear cliente admin
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Leer migración
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251115000000_create_printers_table.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

async function executeMigration() {
  console.log('🔧 Ejecutando migración de impresoras...\n');

  try {
    // Dividir SQL en statements (separados por ;)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Ejecutando ${statements.length} statements...\n`);

    // Ejecutar cada statement usando RPC o directamente
    // Supabase no permite ejecutar SQL arbitrario desde el cliente JS
    // Necesitamos usar la API REST directamente
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: migrationSQL }),
    });

    if (!response.ok) {
      // Si no hay función RPC, intentar método alternativo
      console.log('⚠️  No se puede ejecutar SQL directamente desde el cliente JS.');
      console.log('   Ejecutando migración usando método alternativo...\n');
      
      // Verificar si la tabla existe
      const { error: checkError } = await supabaseAdmin
        .from('printers')
        .select('id')
        .limit(1);

      if (!checkError) {
        console.log('✅ La tabla "printers" ya existe');
        return;
      }

      // Intentar crear la tabla usando el cliente
      console.log('📝 Creando tabla usando el cliente admin...\n');
      
      // Como no podemos ejecutar SQL directamente, vamos a crear la estructura
      // usando operaciones del cliente
      console.log('ℹ️  El cliente JS de Supabase no puede ejecutar DDL (CREATE TABLE, etc.)');
      console.log('   Necesitas ejecutar la migración manualmente.\n');
      
      console.log('📋 Opción 1: Desde Supabase Dashboard');
      console.log('   1. Ve a https://supabase.com/dashboard');
      console.log('   2. Selecciona tu proyecto');
      console.log('   3. Ve a SQL Editor');
      console.log('   4. Copia y pega el siguiente SQL:\n');
      console.log('─'.repeat(60));
      console.log(migrationSQL);
      console.log('─'.repeat(60));
      console.log('\n📋 Opción 2: Usar Supabase CLI');
      console.log('   Si tienes Supabase CLI instalado:');
      console.log('   supabase db push\n');
      
      return;
    }

    const result = await response.json();
    console.log('✅ Migración ejecutada exitosamente');
    console.log(result);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 Ejecuta la migración manualmente desde Supabase Dashboard:\n');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
  }
}

executeMigration();

