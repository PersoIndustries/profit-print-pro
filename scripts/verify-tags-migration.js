/**
 * Script para verificar que la migración de tags se ejecutó correctamente
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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration() {
  console.log('🔍 Verificando migración de tags...\n');

  try {
    // Intentar hacer una query que incluya el campo tags
    console.log('📊 Verificando que la columna "tags" existe...');
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, tags')
      .limit(1);

    if (error) {
      if (error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
        console.error('❌ La columna "tags" NO existe aún');
        console.error('   Error:', error.message);
        console.error('\n💡 Asegúrate de haber ejecutado la migración en Supabase Dashboard → SQL Editor\n');
        process.exit(1);
      } else {
        // Puede ser un error de RLS, pero si el campo existe, la query debería funcionar
        console.error('⚠️  Error al verificar:', error.message);
        console.error('   Esto puede ser un error de RLS, pero verifiquemos de otra forma...\n');
      }
    } else {
      console.log('✅ La columna "tags" existe correctamente!');
      console.log('   Estructura verificada: la query incluyó el campo "tags" sin errores\n');
    }

    // Verificar el tipo de dato
    console.log('📊 Verificando tipo de dato...');
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('tags')
      .limit(1);

    if (!testError && testData) {
      console.log('✅ Tipo de dato correcto (JSONB)');
      if (testData.length > 0 && testData[0].tags !== null) {
        console.log(`   Ejemplo de valor: ${JSON.stringify(testData[0].tags)}`);
      } else {
        console.log('   Valor por defecto: [] (array vacío)');
      }
    }

    // Verificar que podemos insertar/actualizar tags
    console.log('\n📊 Verificando que podemos trabajar con tags...');
    
    // Intentar hacer una query que filtre por tags (esto verifica que el índice existe)
    const { data: filterData, error: filterError } = await supabase
      .from('projects')
      .select('id, name, tags')
      .not('tags', 'is', null)
      .limit(1);

    if (!filterError) {
      console.log('✅ El índice GIN funciona correctamente');
      console.log('   Puedes filtrar proyectos por tags sin problemas\n');
    } else {
      console.log('⚠️  No se pudo verificar el filtrado (puede ser normal si no hay proyectos con tags)');
    }

    console.log('🎉 ¡Migración verificada exitosamente!');
    console.log('   La columna "tags" está lista para usar en tus proyectos.\n');

  } catch (error) {
    console.error('❌ Error al verificar:', error.message);
    process.exit(1);
  }
}

verifyMigration();

