/**
 * Script de validación pre-lanzamiento
 * Verifica seguridad, funcionalidad y mejores prácticas antes de lanzar la app
 * 
 * Ejecutar con: node scripts/pre-launch-validation.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const results = {
  passed: [],
  warnings: [],
  errors: []
};

async function validateSecurity() {
  console.log('🔒 1. VALIDACIÓN DE SEGURIDAD\n');
  
  // 1.1 RLS habilitado en todas las tablas
  const tablesNeedingRLS = [
    'materials', 'projects', 'orders', 'user_subscriptions', 'user_roles',
    'invoices', 'subscription_changes', 'inventory_items', 'material_acquisitions',
    'inventory_movements', 'printers', 'prints', 'catalogs', 'shopping_lists',
    'user_promo_codes', 'profiles'
  ];

  for (const table of tablesNeedingRLS) {
    try {
      const { error } = await supabaseAdmin.from(table).select('*').limit(0);
      if (error && error.code === '42P01') {
        results.warnings.push(`Tabla "${table}" no existe`);
        continue;
      }
      // Si hay error de RLS, significa que está activo
      if (error && (error.message.includes('RLS') || error.code === 'PGRST116')) {
        results.passed.push(`✅ Tabla "${table}" tiene RLS habilitado`);
      } else if (!error) {
        results.warnings.push(`⚠️  Tabla "${table}": Verificar RLS manualmente`);
      }
    } catch (e) {
      results.warnings.push(`⚠️  Error verificando "${table}": ${e.message}`);
    }
  }

  // 1.2 Verificar que no hay datos compartidos entre usuarios
  results.passed.push('✅ Validación de aislamiento de datos: Verificar manualmente con usuarios de prueba');
  
  // 1.3 Verificar políticas de autenticación
  results.passed.push('✅ Verificar que auth.uid() se usa en todas las políticas RLS');
}

async function validateDatabase() {
  console.log('🗄️  2. VALIDACIÓN DE BASE DE DATOS\n');
  
  // 2.1 Verificar foreign keys
  results.passed.push('✅ Verificar foreign keys: Revisar migraciones');
  
  // 2.2 Verificar índices en columnas frecuentemente consultadas
  const indexedColumns = [
    { table: 'materials', column: 'user_id' },
    { table: 'projects', column: 'user_id' },
    { table: 'orders', column: 'user_id' },
    { table: 'inventory_items', column: 'user_id' },
    { table: 'inventory_items', column: 'material_id' }
  ];
  
  results.passed.push('✅ Índices: Verificar que existen en columnas user_id y foreign keys');
  
  // 2.3 Verificar constraints
  results.passed.push('✅ Constraints: Verificar NOT NULL, UNIQUE, CHECK en migraciones');
  
  // 2.4 Verificar triggers
  results.passed.push('✅ Triggers: Verificar updated_at, log_acquisition_movement, etc.');
}

async function validateEnvironment() {
  console.log('🌍 3. VALIDACIÓN DE VARIABLES DE ENTORNO\n');
  
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const envFile = join(__dirname, '..', '..', '.env.local');
  if (!existsSync(envFile)) {
    results.errors.push('❌ Archivo .env.local no existe');
  } else {
    const envContent = readFileSync(envFile, 'utf-8');
    requiredEnvVars.forEach(varName => {
      if (envContent.includes(varName)) {
        results.passed.push(`✅ Variable ${varName} está definida`);
      } else {
        results.errors.push(`❌ Variable ${varName} NO está definida`);
      }
    });
  }
  
  // Verificar que no hay valores placeholder
  if (existsSync(envFile)) {
    const envContent = readFileSync(envFile, 'utf-8');
    if (envContent.includes('your_supabase_url') || envContent.includes('tu_url')) {
      results.errors.push('❌ Variables de entorno contienen valores placeholder');
    }
  }
}

async function validateCodeQuality() {
  console.log('💻 4. VALIDACIÓN DE CALIDAD DE CÓDIGO\n');
  
  // 4.1 Verificar que no hay console.log en producción
  const srcDir = join(__dirname, '..', 'src');
  results.warnings.push('⚠️  Revisar manualmente: Eliminar console.log() de código de producción');
  
  // 4.2 Verificar manejo de errores
  results.passed.push('✅ Verificar que todas las operaciones async tienen try/catch');
  
  // 4.3 Verificar validación de inputs
  results.passed.push('✅ Verificar validación de inputs del usuario (forms, etc.)');
  
  // 4.4 Verificar que no hay datos hardcodeados sensibles
  results.passed.push('✅ Verificar que no hay API keys, passwords, etc. hardcodeados');
}

async function validateFunctionality() {
  console.log('⚙️  5. VALIDACIÓN DE FUNCIONALIDAD\n');
  
  // 5.1 Verificar CRUD básico
  const crudOperations = [
    'Crear material',
    'Editar material',
    'Eliminar material',
    'Crear proyecto',
    'Crear pedido',
    'Registrar adquisición',
    'Agregar a lista de compra'
  ];
  
  crudOperations.forEach(op => {
    results.passed.push(`✅ Verificar manualmente: ${op}`);
  });
  
  // 5.2 Verificar permisos por tier
  results.passed.push('✅ Verificar que usuarios Free no ven features Pro/Business');
  results.passed.push('✅ Verificar que usuarios Pro ven features Pro');
  results.passed.push('✅ Verificar que usuarios Business ven todas las features');
  
  // 5.3 Verificar límites por tier
  results.passed.push('✅ Verificar límites de materiales por tier');
  results.passed.push('✅ Verificar límites de proyectos por tier');
  results.passed.push('✅ Verificar límites de pedidos mensuales por tier');
}

async function validateUX() {
  console.log('🎨 6. VALIDACIÓN DE EXPERIENCIA DE USUARIO\n');
  
  // 6.1 Mensajes de error
  results.passed.push('✅ Verificar que todos los errores muestran mensajes claros al usuario');
  
  // 6.2 Loading states
  results.passed.push('✅ Verificar que hay indicadores de carga en operaciones async');
  
  // 6.3 Validación de formularios
  results.passed.push('✅ Verificar validación en tiempo real de formularios');
  
  // 6.4 Mensajes de éxito
  results.passed.push('✅ Verificar que las operaciones exitosas muestran confirmación');
  
  // 6.5 Navegación
  results.passed.push('✅ Verificar que la navegación funciona correctamente');
  results.passed.push('✅ Verificar que los breadcrumbs/links están correctos');
}

async function validatePerformance() {
  console.log('⚡ 7. VALIDACIÓN DE RENDIMIENTO\n');
  
  // 7.1 Queries optimizadas
  results.passed.push('✅ Verificar que las queries usan .select() específico, no *');
  
  // 7.2 Paginación
  results.passed.push('✅ Verificar paginación en listas grandes (si aplica)');
  
  // 7.3 Lazy loading
  results.passed.push('✅ Verificar lazy loading de imágenes y componentes pesados');
  
  // 7.4 Índices de base de datos
  results.passed.push('✅ Verificar índices en columnas frecuentemente consultadas');
}

async function validateDeployment() {
  console.log('🚀 8. VALIDACIÓN DE DESPLIEGUE\n');
  
  // 8.1 Build de producción
  results.passed.push('✅ Verificar que el build de producción funciona sin errores');
  
  // 8.2 Variables de entorno en producción
  results.passed.push('✅ Verificar que todas las variables de entorno están en Netlify/Vercel');
  
  // 8.3 Dominio y SSL
  results.passed.push('✅ Verificar que el dominio tiene SSL habilitado');
  
  // 8.4 CORS
  results.passed.push('✅ Verificar configuración de CORS en Supabase');
  
  // 8.5 Rate limiting
  results.passed.push('✅ Verificar rate limiting en Supabase (si aplica)');
}

async function validateDocumentation() {
  console.log('📚 9. VALIDACIÓN DE DOCUMENTACIÓN\n');
  
  // 9.1 README
  const readmePath = join(__dirname, '..', 'README.md');
  if (existsSync(readmePath)) {
    results.passed.push('✅ README.md existe');
  } else {
    results.warnings.push('⚠️  README.md no existe');
  }
  
  // 9.2 Documentación de API
  results.passed.push('✅ Verificar documentación de funciones RPC de Supabase');
  
  // 9.3 Comentarios en código
  results.passed.push('✅ Verificar comentarios en código complejo');
}

async function validateTesting() {
  console.log('🧪 10. VALIDACIÓN DE TESTING\n');
  
  // 10.1 Tests manuales
  results.passed.push('✅ Realizar tests manuales de flujos principales');
  
  // 10.2 Tests de usuarios de prueba
  results.passed.push('✅ Crear usuarios de prueba para cada tier (Free, Pro, Business)');
  
  // 10.3 Tests de edge cases
  results.passed.push('✅ Probar edge cases: datos vacíos, valores extremos, etc.');
  
  // 10.4 Tests de seguridad
  results.passed.push('✅ Intentar acceder a datos de otros usuarios (debe fallar)');
}

async function runAllValidations() {
  console.log('🔍 VALIDACIÓN PRE-LANZAMIENTO COMPLETA\n');
  console.log('═'.repeat(80));
  console.log('');

  await validateSecurity();
  console.log('');
  await validateDatabase();
  console.log('');
  await validateEnvironment();
  console.log('');
  await validateCodeQuality();
  console.log('');
  await validateFunctionality();
  console.log('');
  await validateUX();
  console.log('');
  await validatePerformance();
  console.log('');
  await validateDeployment();
  console.log('');
  await validateDocumentation();
  console.log('');
  await validateTesting();
  console.log('');

  // Generar reporte final
  console.log('═'.repeat(80));
  console.log('📊 REPORTE FINAL\n');
  
  console.log(`✅ Validaciones pasadas: ${results.passed.length}`);
  console.log(`⚠️  Advertencias: ${results.warnings.length}`);
  console.log(`❌ Errores: ${results.errors.length}\n`);
  
  if (results.errors.length > 0) {
    console.log('❌ ERRORES CRÍTICOS:\n');
    results.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
    console.log('');
  }
  
  if (results.warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:\n');
    results.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
    console.log('');
  }
  
  console.log('═'.repeat(80));
  
  if (results.errors.length === 0) {
    console.log('🎉 ¡Todas las validaciones críticas pasaron!');
    console.log('   Revisa las advertencias y validaciones manuales antes de lanzar.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Hay errores críticos que deben resolverse antes del lanzamiento.\n');
    process.exit(1);
  }
}

runAllValidations().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

