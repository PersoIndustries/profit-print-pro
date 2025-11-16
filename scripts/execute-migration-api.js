/**
 * Script para ejecutar la migración usando la API de Supabase directamente
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
  console.log('🔧 Ejecutando migración de impresoras...\n');

  try {
    // Obtener el project ID de la URL
    const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectId) {
      throw new Error('No se pudo extraer el project ID de la URL');
    }

    console.log(`📊 Project ID: ${projectId}\n`);

    // Usar la Management API de Supabase
    // Nota: Esto requiere autenticación con un token de acceso, no la service role key
    // Intentar usar el endpoint de PostgREST con la service role key
    
    // Dividir el SQL en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Ejecutando ${statements.length} statements...\n`);

    // Intentar ejecutar cada statement usando el endpoint de rpc
    // Aunque PostgREST normalmente no ejecuta DDL, intentemos
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`⏳ Ejecutando statement ${i + 1}/${statements.length}...`);
      
      try {
        // Intentar usar el endpoint de rpc con exec_sql si existe
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (response.ok) {
          console.log(`✅ Statement ${i + 1} ejecutado`);
        } else {
          const errorText = await response.text();
          console.log(`⚠️  Statement ${i + 1} falló: ${errorText.substring(0, 100)}`);
          
          // Si no existe la función RPC, intentar método alternativo
          if (response.status === 404 || errorText.includes('function') || errorText.includes('does not exist')) {
            console.log('\n⚠️  No se puede ejecutar SQL DDL desde la API REST.');
            console.log('   Usando método alternativo: crear tabla mediante operaciones del cliente...\n');
            
            // Intentar crear la estructura usando el cliente
            await createTableViaClient();
            return;
          }
        }
      } catch (error) {
        console.log(`⚠️  Error en statement ${i + 1}: ${error.message}`);
      }
    }

    // Verificar que la tabla se creó
    console.log('\n🔍 Verificando que la tabla se creó...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/printers?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (checkResponse.ok) {
      console.log('✅ ¡Migración completada! La tabla "printers" existe.');
    } else {
      console.log('⚠️  La tabla aún no existe. Ejecuta la migración manualmente desde el dashboard.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 Ejecuta la migración manualmente desde Supabase Dashboard\n');
  }
}

async function createTableViaClient() {
  // Este método no funcionará porque el cliente JS no puede ejecutar DDL
  // Pero podemos mostrar el SQL para copiar
  console.log('📋 Para ejecutar la migración, copia este SQL en Supabase Dashboard → SQL Editor:\n');
  console.log('─'.repeat(70));
  console.log(migrationSQL);
  console.log('─'.repeat(70));
}

executeMigration();

