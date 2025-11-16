/**
 * Script de prueba para verificar la conexión admin con Supabase
 * 
 * Uso:
 *   npx tsx scripts/test-admin-connection.ts
 * 
 * O con ts-node:
 *   npx ts-node scripts/test-admin-connection.ts
 */

import { supabaseAdmin, isAdminClientAvailable } from '../src/integrations/supabase/admin-client';

async function testAdminConnection() {
  console.log('🔍 Verificando conexión admin con Supabase...\n');

  if (!isAdminClientAvailable()) {
    console.error('❌ Cliente admin no disponible.');
    console.error('   Verifica que VITE_SUPABASE_SERVICE_ROLE_KEY esté definida en .env.local');
    process.exit(1);
  }

  try {
    // Test 1: Verificar conexión básica
    console.log('📊 Test 1: Verificando conexión básica...');
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      throw tablesError;
    }
    console.log('✅ Conexión básica: OK\n');

    // Test 2: Contar usuarios
    console.log('📊 Test 2: Contando usuarios...');
    const { count: userCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    console.log(`✅ Total de usuarios: ${userCount}\n`);

    // Test 3: Ver estructura de tablas principales
    console.log('📊 Test 3: Verificando tablas principales...');
    const tables = ['profiles', 'user_subscriptions', 'user_roles', 'projects', 'orders', 'materials'];
    
    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ⚠️  ${table}: Error - ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: ${count} registros`);
      }
    }

    console.log('\n🎉 ¡Conexión admin verificada exitosamente!');
    console.log('   Puedes usar el cliente admin para operaciones de base de datos.\n');

  } catch (error: any) {
    console.error('\n❌ Error al verificar conexión:');
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testAdminConnection();
}

export { testAdminConnection };


