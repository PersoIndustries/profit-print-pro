/**
 * Script para verificar que el despliegue de lista de compra está correcto
 * Ejecutar con: node scripts/verify-shopping-list-deployment.js
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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyDeployment() {
  console.log('🔍 Verificando despliegue de Lista de Compra y restricciones de tier...\n');
  console.log('═'.repeat(60));

  const checks = {
    shoppingLists: { name: 'Tabla shopping_lists', status: false, details: '' },
    shoppingList: { name: 'Tabla shopping_list', status: false, details: '' },
    shoppingListIdColumn: { name: 'Columna shopping_list_id', status: false, details: '' },
    estimatedPriceColumn: { name: 'Columna estimated_price', status: false, details: '' },
    inventoryManagementFeature: { name: 'Feature inventory_management (Pro)', status: false, details: '' },
    tierFeatures: { name: 'Configuración tier_features', status: false, details: '' }
  };

  // 1. Verificar tabla shopping_lists
  console.log('\n1. Verificando tabla shopping_lists...');
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('id, name, user_id, created_at')
      .limit(1);
    
    if (error && error.code === '42P01') {
      checks.shoppingLists.details = 'Tabla no existe';
      console.log('   ❌ Tabla shopping_lists NO existe');
    } else if (error && (error.code === 'PGRST116' || error.message.includes('RLS'))) {
      checks.shoppingLists.status = true;
      checks.shoppingLists.details = 'Tabla existe (RLS activo - normal)';
      console.log('   ✅ Tabla shopping_lists existe (RLS activo)');
    } else if (error) {
      checks.shoppingLists.details = `Error: ${error.message}`;
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      checks.shoppingLists.status = true;
      checks.shoppingLists.details = `Tabla existe (${data?.length || 0} registros de prueba)`;
      console.log('   ✅ Tabla shopping_lists existe');
    }
  } catch (error) {
    checks.shoppingLists.details = `Error: ${error.message}`;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 2. Verificar tabla shopping_list
  console.log('\n2. Verificando tabla shopping_list...');
  try {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('id, name, quantity, notes, estimated_price, shopping_list_id, is_completed')
      .limit(1);
    
    if (error && error.code === '42P01') {
      checks.shoppingList.details = 'Tabla no existe';
      console.log('   ❌ Tabla shopping_list NO existe');
    } else if (error && (error.code === 'PGRST116' || error.message.includes('RLS'))) {
      checks.shoppingList.status = true;
      checks.shoppingList.details = 'Tabla existe (RLS activo - normal)';
      console.log('   ✅ Tabla shopping_list existe (RLS activo)');
    } else if (error && error.message.includes('column') && error.message.includes('shopping_list_id')) {
      checks.shoppingList.status = true;
      checks.shoppingListIdColumn.details = 'Columna existe pero hay error de acceso';
      console.log('   ✅ Tabla shopping_list existe');
      console.log('   ⚠️  Error al acceder a shopping_list_id (puede ser RLS)');
    } else if (error && error.message.includes('column') && error.message.includes('estimated_price')) {
      checks.shoppingList.status = true;
      checks.estimatedPriceColumn.details = 'Columna existe pero hay error de acceso';
      console.log('   ✅ Tabla shopping_list existe');
      console.log('   ⚠️  Error al acceder a estimated_price (puede ser RLS)');
    } else if (error) {
      checks.shoppingList.details = `Error: ${error.message}`;
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      checks.shoppingList.status = true;
      checks.shoppingListIdColumn.status = data && data[0]?.hasOwnProperty('shopping_list_id');
      checks.estimatedPriceColumn.status = data && data[0]?.hasOwnProperty('estimated_price');
      checks.shoppingList.details = `Tabla existe (${data?.length || 0} registros de prueba)`;
      console.log('   ✅ Tabla shopping_list existe');
      
      if (data && data[0]) {
        if (data[0].hasOwnProperty('shopping_list_id')) {
          console.log('   ✅ Columna shopping_list_id existe');
        } else {
          console.log('   ❌ Columna shopping_list_id NO encontrada en datos');
        }
        
        if (data[0].hasOwnProperty('estimated_price')) {
          console.log('   ✅ Columna estimated_price existe');
        } else {
          console.log('   ❌ Columna estimated_price NO encontrada en datos');
        }
      }
    }
  } catch (error) {
    checks.shoppingList.details = `Error: ${error.message}`;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 3. Verificar columna shopping_list_id específicamente
  console.log('\n3. Verificando columna shopping_list_id...');
  try {
    const { error } = await supabase
      .from('shopping_list')
      .select('shopping_list_id')
      .limit(1);
    
    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      checks.shoppingListIdColumn.details = 'Columna no existe';
      console.log('   ❌ Columna shopping_list_id NO existe');
    } else if (error && (error.code === 'PGRST116' || error.message.includes('RLS'))) {
      checks.shoppingListIdColumn.status = true;
      checks.shoppingListIdColumn.details = 'Columna existe (RLS activo)';
      console.log('   ✅ Columna shopping_list_id existe (RLS activo)');
    } else if (error) {
      checks.shoppingListIdColumn.details = `Error: ${error.message}`;
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      checks.shoppingListIdColumn.status = true;
      checks.shoppingListIdColumn.details = 'Columna existe';
      console.log('   ✅ Columna shopping_list_id existe');
    }
  } catch (error) {
    checks.shoppingListIdColumn.details = `Error: ${error.message}`;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 4. Verificar columna estimated_price
  console.log('\n4. Verificando columna estimated_price...');
  try {
    const { error } = await supabase
      .from('shopping_list')
      .select('estimated_price')
      .limit(1);
    
    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      checks.estimatedPriceColumn.details = 'Columna no existe';
      console.log('   ❌ Columna estimated_price NO existe');
    } else if (error && (error.code === 'PGRST116' || error.message.includes('RLS'))) {
      checks.estimatedPriceColumn.status = true;
      checks.estimatedPriceColumn.details = 'Columna existe (RLS activo)';
      console.log('   ✅ Columna estimated_price existe (RLS activo)');
    } else if (error) {
      checks.estimatedPriceColumn.details = `Error: ${error.message}`;
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      checks.estimatedPriceColumn.status = true;
      checks.estimatedPriceColumn.details = 'Columna existe';
      console.log('   ✅ Columna estimated_price existe');
    }
  } catch (error) {
    checks.estimatedPriceColumn.details = `Error: ${error.message}`;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 5. Verificar configuración de tier_features
  console.log('\n5. Verificando configuración de tier_features...');
  try {
    const { data, error } = await supabase
      .from('tier_features')
      .select('feature_key, feature_name, free_tier, tier_1, tier_2')
      .in('feature_key', ['inventory_management', 'acquisition_history', 'movement_history']);
    
    if (error) {
      checks.tierFeatures.details = `Error: ${error.message}`;
      console.log(`   ⚠️  Error: ${error.message}`);
    } else if (data && data.length > 0) {
      checks.tierFeatures.status = true;
      console.log('   ✅ Features encontradas:');
      
      data.forEach(feature => {
        const status = {
          free: feature.free_tier ? '✅' : '❌',
          pro: feature.tier_1 ? '✅' : '❌',
          business: feature.tier_2 ? '✅' : '❌'
        };
        console.log(`      ${feature.feature_name} (${feature.feature_key}):`);
        console.log(`         Free: ${status.free} | Pro: ${status.pro} | Business: ${status.business}`);
        
        if (feature.feature_key === 'inventory_management') {
          checks.inventoryManagementFeature.status = feature.tier_1 === true;
          checks.inventoryManagementFeature.details = `Pro: ${feature.tier_1 ? 'Habilitado' : 'Deshabilitado'}`;
        }
      });
    } else {
      checks.tierFeatures.details = 'No se encontraron features';
      console.log('   ⚠️  No se encontraron las features esperadas');
    }
  } catch (error) {
    checks.tierFeatures.details = `Error: ${error.message}`;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE VERIFICACIÓN\n');
  
  const allChecks = Object.values(checks);
  const passed = allChecks.filter(c => c.status).length;
  const total = allChecks.length;
  
  allChecks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.details || (check.status ? 'OK' : 'FALLO')}`);
  });
  
  console.log(`\n📈 Resultado: ${passed}/${total} verificaciones pasaron`);
  
  if (passed === total) {
    console.log('\n🎉 ¡Todo está desplegado correctamente!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Algunas verificaciones fallaron. Revisa los detalles arriba.');
    process.exit(1);
  }
}

verifyDeployment().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

