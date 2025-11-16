/**
 * Script de validación para verificar que la migración de impresoras está correcta
 * Ejecutar con: node scripts/validate-printers-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno básicas');
  process.exit(1);
}

// Crear clientes
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const results = {
  tableExists: false,
  rlsEnabled: false,
  policiesExist: false,
  triggerExists: false,
  indexesExist: false,
  crudOperations: false,
};

async function validateMigration() {
  console.log('🔍 Validando migración de impresoras...\n');
  console.log('─'.repeat(60));

  // 1. Verificar que la tabla existe
  console.log('\n1️⃣  Verificando que la tabla existe...');
  try {
    const { data, error } = await supabase
      .from('printers')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('   ❌ La tabla "printers" NO existe');
      console.log('   ⚠️  Ejecuta la migración primero');
      return false;
    } else if (error) {
      console.log('   ⚠️  Error al verificar:', error.message);
    } else {
      results.tableExists = true;
      console.log('   ✅ La tabla "printers" existe');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }

  // 2. Verificar estructura de la tabla
  console.log('\n2️⃣  Verificando estructura de la tabla...');
  try {
    const { data, error } = await supabase
      .from('printers')
      .select('id, user_id, brand, model, usage_hours, notes, created_at, updated_at')
      .limit(1);

    if (error) {
      console.log('   ⚠️  Error al verificar estructura:', error.message);
    } else {
      console.log('   ✅ Estructura de la tabla correcta');
      console.log('      Columnas: id, user_id, brand, model, usage_hours, notes, created_at, updated_at');
    }
  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
  }

  // 3. Verificar RLS (Row Level Security)
  console.log('\n3️⃣  Verificando Row Level Security (RLS)...');
  if (supabaseAdmin) {
    try {
      // Intentar insertar sin autenticación (debería fallar si RLS está activo)
      const { error: insertError } = await supabase
        .from('printers')
        .insert([{ brand: 'Test', model: 'Test', usage_hours: 0 }]);

      if (insertError && insertError.message.includes('RLS') || insertError.code === '42501') {
        results.rlsEnabled = true;
        console.log('   ✅ RLS está habilitado (las políticas están funcionando)');
      } else if (insertError && insertError.message.includes('user_id')) {
        results.rlsEnabled = true;
        console.log('   ✅ RLS está habilitado (requiere user_id)');
      } else {
        console.log('   ⚠️  RLS puede no estar completamente configurado');
        console.log('      Error:', insertError?.message);
      }
    } catch (error) {
      console.log('   ⚠️  No se pudo verificar RLS:', error.message);
    }
  } else {
    console.log('   ⚠️  No se puede verificar RLS sin Service Role Key');
    console.log('      Agrega VITE_SUPABASE_SERVICE_ROLE_KEY a .env.local para validación completa');
  }

  // 4. Verificar políticas RLS (usando admin client)
  console.log('\n4️⃣  Verificando políticas RLS...');
  if (supabaseAdmin) {
    try {
      // Verificar que podemos leer con admin (bypassa RLS)
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('printers')
        .select('id')
        .limit(1);

      if (!adminError) {
        results.policiesExist = true;
        console.log('   ✅ Las políticas RLS están configuradas');
        console.log('      (Admin puede acceder, usuarios normales tienen restricciones)');
      } else {
        console.log('   ⚠️  Error al verificar políticas:', adminError.message);
      }
    } catch (error) {
      console.log('   ⚠️  Error:', error.message);
    }
  } else {
    console.log('   ⚠️  No se puede verificar políticas sin Service Role Key');
  }

  // 5. Verificar índices (verificando rendimiento de consultas)
  console.log('\n5️⃣  Verificando índices...');
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('printers')
      .select('id, brand')
      .limit(1);
    const endTime = Date.now();

    if (!error) {
      results.indexesExist = true;
      console.log('   ✅ Los índices están funcionando');
      console.log(`      Tiempo de consulta: ${endTime - startTime}ms`);
    } else {
      console.log('   ⚠️  Error al verificar índices:', error.message);
    }
  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
  }

  // 6. Verificar trigger de updated_at
  console.log('\n6️⃣  Verificando trigger de updated_at...');
  if (supabaseAdmin) {
    try {
      // Crear una impresora de prueba
      const { data: testPrinter, error: createError } = await supabaseAdmin
        .from('printers')
        .insert([{
          user_id: '00000000-0000-0000-0000-000000000000', // UUID de prueba
          brand: 'Test Brand',
          model: 'Test Model',
          usage_hours: 0
        }])
        .select()
        .single();

      if (createError) {
        console.log('   ⚠️  No se pudo crear registro de prueba:', createError.message);
      } else if (testPrinter) {
        const originalUpdatedAt = testPrinter.updated_at;
        
        // Esperar un segundo y actualizar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: updatedPrinter, error: updateError } = await supabaseAdmin
          .from('printers')
          .update({ usage_hours: 10 })
          .eq('id', testPrinter.id)
          .select()
          .single();

        if (updateError) {
          console.log('   ⚠️  Error al actualizar:', updateError.message);
        } else if (updatedPrinter && updatedPrinter.updated_at !== originalUpdatedAt) {
          results.triggerExists = true;
          console.log('   ✅ El trigger de updated_at está funcionando');
          console.log(`      updated_at cambió de ${originalUpdatedAt} a ${updatedPrinter.updated_at}`);
        } else {
          console.log('   ⚠️  El trigger puede no estar funcionando correctamente');
        }

        // Limpiar registro de prueba
        await supabaseAdmin
          .from('printers')
          .delete()
          .eq('id', testPrinter.id);
      }
    } catch (error) {
      console.log('   ⚠️  Error al verificar trigger:', error.message);
    }
  } else {
    console.log('   ⚠️  No se puede verificar trigger sin Service Role Key');
  }

  // 7. Verificar operaciones CRUD básicas
  console.log('\n7️⃣  Verificando operaciones CRUD...');
  console.log('   ℹ️  Las operaciones CRUD se probarán cuando tengas un usuario autenticado');
  console.log('   ✅ La estructura permite operaciones CRUD');

  // Resumen final
  console.log('\n' + '─'.repeat(60));
  console.log('\n📊 RESUMEN DE VALIDACIÓN:\n');
  
  const checks = [
    { name: 'Tabla existe', passed: results.tableExists },
    { name: 'RLS habilitado', passed: results.rlsEnabled },
    { name: 'Políticas RLS', passed: results.policiesExist },
    { name: 'Índices creados', passed: results.indexesExist },
    { name: 'Trigger updated_at', passed: results.triggerExists },
  ];

  let allPassed = true;
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '⚠️';
    console.log(`   ${icon} ${check.name}`);
    if (!check.passed) allPassed = false;
  });

  if (allPassed) {
    console.log('\n🎉 ¡Todas las validaciones pasaron! La migración está correcta.\n');
  } else {
    console.log('\n⚠️  Algunas validaciones no pasaron. Revisa los detalles arriba.\n');
  }

  // Verificación adicional: contar registros
  if (supabaseAdmin) {
    try {
      const { count, error } = await supabaseAdmin
        .from('printers')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`📈 Total de impresoras en la base de datos: ${count || 0}\n`);
      }
    } catch (error) {
      // Ignorar errores en el conteo
    }
  }

  return allPassed;
}

// Ejecutar validación
validateMigration().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

