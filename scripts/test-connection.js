/**
 * Script simple para probar la conexión con Supabase
 * Ejecutar con: node scripts/test-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno desde .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Probando conexión con Supabase...\n');

// Verificar variables
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL no está definida');
  console.error('   Verifica tu archivo .env.local');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY no está definida');
  console.error('   Verifica tu archivo .env.local');
  process.exit(1);
}

console.log('✅ Variables de entorno encontradas');
console.log(`   URL: ${SUPABASE_URL.substring(0, 30)}...`);
console.log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);

// Crear cliente
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Probar conexión
async function testConnection() {
  try {
    console.log('📊 Probando conexión básica...');
    
    // Test 1: Verificar que podemos acceder a la tabla profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      // Si hay error de RLS, al menos sabemos que la conexión funciona
      if (profilesError.code === 'PGRST116' || profilesError.message.includes('RLS')) {
        console.log('✅ Conexión exitosa (RLS activo - esto es normal)');
      } else {
        throw profilesError;
      }
    } else {
      console.log('✅ Conexión exitosa - Acceso a base de datos OK');
    }

    // Test 2: Intentar obtener información del proyecto
    console.log('\n📊 Verificando acceso a tablas...');
    
    const tables = ['profiles', 'projects', 'orders', 'materials'];
    const results = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('RLS')) {
            results[table] = '✅ Accesible (RLS activo)';
          } else {
            results[table] = `⚠️  Error: ${error.message}`;
          }
        } else {
          results[table] = `✅ OK (${count} registros)`;
        }
      } catch (err) {
        results[table] = `❌ Error: ${err.message}`;
      }
    }
    
    console.log('\n📋 Resultados por tabla:');
    Object.entries(results).forEach(([table, status]) => {
      console.log(`   ${table}: ${status}`);
    });

    // Test 3: Verificar autenticación
    console.log('\n📊 Verificando sistema de autenticación...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log(`   ⚠️  Auth: ${authError.message}`);
    } else {
      console.log('   ✅ Sistema de autenticación: OK');
      if (authData.session) {
        console.log(`   ℹ️  Sesión activa encontrada`);
      } else {
        console.log(`   ℹ️  No hay sesión activa (normal si no estás logueado)`);
      }
    }

    console.log('\n🎉 ¡Prueba de conexión completada!');
    console.log('   La conexión con Supabase está funcionando correctamente.\n');
    
  } catch (error) {
    console.error('\n❌ Error al probar la conexión:');
    console.error(`   ${error.message}`);
    if (error.details) {
      console.error(`   Detalles: ${error.details}`);
    }
    process.exit(1);
  }
}

testConnection();

