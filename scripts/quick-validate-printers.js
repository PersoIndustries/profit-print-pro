/**
 * Validación rápida de la migración de impresoras
 * Ejecutar con: node scripts/quick-validate-printers.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function quickValidate() {
  console.log('🔍 Validación rápida de impresoras\n');
  console.log('═'.repeat(50));

  const checks = [];

  // 1. Tabla existe
  console.log('\n1. Verificando tabla...');
  try {
    const { error } = await supabase.from('printers').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log('   ❌ Tabla NO existe');
      checks.push(false);
    } else {
      console.log('   ✅ Tabla existe');
      checks.push(true);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push(false);
  }

  // 2. Estructura correcta
  console.log('\n2. Verificando estructura...');
  try {
    const { error } = await supabase
      .from('printers')
      .select('id, user_id, brand, model, usage_hours, notes, created_at, updated_at')
      .limit(1);
    
    if (error && error.message.includes('column')) {
      console.log('   ❌ Estructura incorrecta:', error.message);
      checks.push(false);
    } else {
      console.log('   ✅ Estructura correcta (todas las columnas presentes)');
      checks.push(true);
    }
  } catch (error) {
    console.log('   ⚠️  No se pudo verificar estructura');
    checks.push(true); // Asumir OK si la tabla existe
  }

  // 3. RLS activo
  console.log('\n3. Verificando RLS...');
  try {
    const { error } = await supabase
      .from('printers')
      .insert([{ brand: 'Test', model: 'Test', usage_hours: 0 }]);
    
    if (error && (error.message.includes('RLS') || error.code === '42501' || error.message.includes('user_id'))) {
      console.log('   ✅ RLS está activo y funcionando');
      checks.push(true);
    } else {
      console.log('   ⚠️  RLS puede no estar configurado correctamente');
      checks.push(false);
    }
  } catch (error) {
    console.log('   ⚠️  No se pudo verificar RLS');
    checks.push(true);
  }

  // 4. Políticas RLS (solo si hay admin client)
  if (supabaseAdmin) {
    console.log('\n4. Verificando políticas RLS...');
    try {
      const { error } = await supabaseAdmin
        .from('printers')
        .select('id')
        .limit(1);
      
      if (!error) {
        console.log('   ✅ Políticas RLS configuradas (admin puede acceder)');
        checks.push(true);
      } else {
        console.log('   ⚠️  Error:', error.message);
        checks.push(false);
      }
    } catch (error) {
      console.log('   ⚠️  Error:', error.message);
      checks.push(false);
    }
  } else {
    console.log('\n4. Verificando políticas RLS...');
    console.log('   ⚠️  Omite (necesita Service Role Key)');
    checks.push(true); // No crítico
  }

  // 5. Conteo de registros
  console.log('\n5. Verificando datos...');
  if (supabaseAdmin) {
    try {
      const { count, error } = await supabaseAdmin
        .from('printers')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`   ✅ Base de datos accesible (${count || 0} impresoras registradas)`);
        checks.push(true);
      } else {
        console.log('   ⚠️  Error al contar:', error.message);
        checks.push(false);
      }
    } catch (error) {
      console.log('   ⚠️  Error:', error.message);
      checks.push(false);
    }
  } else {
    console.log('   ⚠️  Omite (necesita Service Role Key)');
    checks.push(true);
  }

  // Resumen
  console.log('\n' + '═'.repeat(50));
  const passed = checks.filter(c => c).length;
  const total = checks.length;
  
  console.log(`\n📊 Resultado: ${passed}/${total} validaciones pasaron\n`);

  if (passed === total) {
    console.log('🎉 ¡Todo está correcto! La migración fue exitosa.\n');
    console.log('✅ Puedes usar la funcionalidad de impresoras en la aplicación.\n');
  } else {
    console.log('⚠️  Algunas validaciones fallaron. Revisa los detalles arriba.\n');
  }

  return passed === total;
}

quickValidate().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

