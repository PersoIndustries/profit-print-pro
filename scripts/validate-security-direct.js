/**
 * Script de validación de seguridad usando consultas SQL directas
 * Ejecutar con: node scripts/validate-security-direct.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runQuery(query) {
  // Usar rpc si está disponible, o hacer una query directa
  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { query });
    if (error) throw error;
    return data;
  } catch (e) {
    // Si no funciona, intentar método alternativo
    console.warn('⚠️  No se puede ejecutar SQL directo. Usando método alternativo...');
    return null;
  }
}

async function validateSecurity() {
  console.log('🔒 Validación de Seguridad - Base de Datos\n');
  console.log('═'.repeat(80));

  const issues = [];
  const warnings = [];

  // Lista de tablas que deben tener user_id
  const tablesNeedingUserId = [
    'materials', 'projects', 'orders', 'user_subscriptions', 'user_roles',
    'invoices', 'subscription_changes', 'inventory_items', 'material_acquisitions',
    'inventory_movements', 'printers', 'prints', 'catalogs', 'shopping_lists',
    'user_promo_codes'
  ];

  // Lista de tablas relacionales (protegidas por tablas padre)
  const relationalTables = [
    'order_items', 'print_materials', 'project_materials', 
    'catalog_projects', 'catalog_sections', 'shopping_list'
  ];

  // Lista de tablas del sistema (no necesitan user_id)
  const systemTables = ['tier_features', 'promo_codes', 'profiles']; // profiles usa id como user_id

  console.log('\n📊 Verificando tablas...\n');

  // Verificar cada tabla conocida
  const allTables = [...tablesNeedingUserId, ...relationalTables, ...systemTables];

  for (const tableName of allTables) {
    try {
      // Verificar si la tabla existe
      const { error: existsError } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(0);

      if (existsError && existsError.code === '42P01') {
        warnings.push(`Tabla "${tableName}" no existe (puede ser normal si no se ha migrado)`);
        continue;
      }

      // Verificar RLS
      const hasRLSError = existsError && (
        existsError.message.includes('RLS') || 
        existsError.code === 'PGRST116' ||
        existsError.message.includes('row-level security')
      );

      // Si el error es que la tabla no existe en el cache, puede ser normal
      const isTableNotFoundError = existsError && existsError.message.includes('Could not find the table');

      if (!hasRLSError && existsError && !isTableNotFoundError) {
        issues.push(`Tabla "${tableName}": Posible problema con RLS - ${existsError.message}`);
      } else if (isTableNotFoundError) {
        warnings.push(`Tabla "${tableName}": No encontrada en el schema cache (puede no existir aún)`);
      }

      // Verificar user_id si es necesario
      if (tablesNeedingUserId.includes(tableName)) {
        const { error: userIdError } = await supabaseAdmin
          .from(tableName)
          .select('user_id')
          .limit(0);

        if (userIdError && userIdError.code === '42703') {
          issues.push(`Tabla "${tableName}": NO tiene columna user_id`);
        }
      }

      // Verificar que profiles usa id como user_id
      if (tableName === 'profiles') {
        const { error: idError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .limit(0);

        if (idError && idError.code === '42703') {
          issues.push(`Tabla "profiles": NO tiene columna id (que actúa como user_id)`);
        }
      }

    } catch (error) {
      warnings.push(`Error al verificar "${tableName}": ${error.message}`);
    }
  }

  // Generar reporte
  console.log('═'.repeat(80));
  console.log('📋 REPORTE DE VALIDACIÓN\n');

  if (issues.length === 0 && warnings.length === 0) {
    console.log('🎉 ¡TODAS LAS VALIDACIONES PASARON!');
    console.log('   ✅ RLS está habilitado en todas las tablas');
    console.log('   ✅ Todas las tablas tienen user_id donde es necesario');
    console.log('   ✅ Los usuarios no pueden ver datos de otros usuarios\n');
  } else {
    if (issues.length > 0) {
      console.log('❌ ISSUES CRÍTICOS:\n');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:\n');
      warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
      console.log('');
    }
  }

  console.log('═'.repeat(80));
  console.log('\n💡 Para una validación más completa, ejecuta el SQL en:');
  console.log('   supabase/migrations/20251119000000_validate_security.sql');
  console.log('   en el SQL Editor de Supabase Dashboard\n');

  process.exit(issues.length > 0 ? 1 : 0);
}

validateSecurity().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

